import React, { useRef, useState } from 'react'
import { supabase, PARTY_ID } from '../lib/supabase'
import { CREW } from '../lib/seed'

export default function Missions({ me, missions, setMissions }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [proofMission, setProofMission] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [evidenceUploading, setEvidenceUploading] = useState(null)
  const [activeTab, setActiveTab] = useState('claimed')
  const [showDistributeConfirm, setShowDistributeConfirm] = useState(false)
  const [distributeToast, setDistributeToast] = useState('')
  const [randomMissionResult, setRandomMissionResult] = useState(null)

  const scores = CREW.reduce((acc, name) => {
    acc[name] = missions
      .filter(m => m.completed && m.completed_by === name)
      .reduce((sum, m) => sum + (m.points || 10), 0)
    return acc
  }, {})
  const maxScore = Math.max(0, ...Object.values(scores))

  const open = missions.filter(m => !m.completed && !m.claimed_by)
  const claimed = missions.filter(m => !m.completed && m.claimed_by)
  const completed = missions.filter(m => m.completed)

  const claimMission = async (mission) => {
    const patch = { claimed_by: me, claimed_at: new Date().toISOString(), participants: [me] }
    setMissions(curr => curr.map(m => m.id === mission.id ? { ...m, ...patch } : m))
    await supabase.from('missions').update(patch).eq('id', mission.id)
  }

  const joinMission = async (mission) => {
    const current = mission.participants || []
    if (current.includes(me)) return
    const participants = [...current, me]
    setMissions(curr => curr.map(m => m.id === mission.id ? { ...m, participants } : m))
    await supabase.from('missions').update({ participants }).eq('id', mission.id)
  }

  const leaveMission = async (mission) => {
    const participants = (mission.participants || []).filter(p => p !== me)
    if (participants.length === 0) {
      const patch = { claimed_by: '', claimed_at: null, participants: [] }
      setMissions(curr => curr.map(m => m.id === mission.id ? { ...m, ...patch } : m))
      await supabase.from('missions').update(patch).eq('id', mission.id)
    } else {
      const newClaimer = mission.claimed_by === me ? participants[0] : mission.claimed_by
      const patch = { claimed_by: newClaimer, participants }
      setMissions(curr => curr.map(m => m.id === mission.id ? { ...m, ...patch } : m))
      await supabase.from('missions').update(patch).eq('id', mission.id)
    }
  }

  const deleteMission = async (mission) => {
    if (!confirm(`Missie verwijderen: "${mission.text}"?`)) return
    setMissions(curr => curr.filter(m => m.id !== mission.id))
    await supabase.from('missions').delete().eq('id', mission.id)
  }

  const completeMission = async (mission, proof) => {
    const patch = {
      completed: true,
      completed_by: me,
      completed_at: new Date().toISOString(),
      claimed_by: me,
      proof_url: proof.type === 'photo' ? proof.url : (mission.proof_url || ''),
      proof_path: proof.type === 'photo' ? proof.path : `note:${proof.text}`,
    }
    setMissions(curr => curr.map(m => m.id === mission.id ? { ...m, ...patch } : m))
    await supabase.from('missions').update(patch).eq('id', mission.id)
    setProofMission(null)
  }

  const removeEvidence = async (mission) => {
    if (mission.proof_path && !mission.proof_path.startsWith('note:')) {
      await supabase.storage.from('party-photos').remove([mission.proof_path])
    }
    const patch = { proof_url: '', proof_path: '' }
    setMissions(curr => curr.map(m => m.id === mission.id ? { ...m, ...patch } : m))
    await supabase.from('missions').update(patch).eq('id', mission.id)
  }

  const uploadEvidence = async (mission, file) => {
    setEvidenceUploading(mission.id)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${PARTY_ID}/missions/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('party-photos').upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) { alert('Upload mislukt: ' + error.message); return }
      const { data } = supabase.storage.from('party-photos').getPublicUrl(path)
      const patch = { proof_url: data.publicUrl, proof_path: path }
      setMissions(curr => curr.map(m => m.id === mission.id ? { ...m, ...patch } : m))
      await supabase.from('missions').update(patch).eq('id', mission.id)
    } finally {
      setEvidenceUploading(null)
    }
  }

  const distributeOpenMissions = async () => {
    const openMissions = missions.filter(m => !m.completed && !m.claimed_by)
    const shuffled = [...openMissions].sort(() => Math.random() - 0.5)
    const now = new Date().toISOString()
    const updates = shuffled.map((m, i) => ({
      id: m.id,
      claimed_by: CREW[i % CREW.length],
      claimed_at: now,
      participants: [CREW[i % CREW.length]],
    }))
    setMissions(curr => curr.map(m => {
      const u = updates.find(u => u.id === m.id)
      return u ? { ...m, ...u } : m
    }))
    await Promise.all(updates.map(u =>
      supabase.from('missions').update({ claimed_by: u.claimed_by, claimed_at: u.claimed_at, participants: u.participants }).eq('id', u.id)
    ))
    setDistributeToast(`${shuffled.length} missies verdeeld!`)
    setTimeout(() => setDistributeToast(''), 3000)
    setShowDistributeConfirm(false)
  }

  const assignRandomMission = async () => {
    const openMissions = missions.filter(m => !m.completed && !m.claimed_by)
    if (openMissions.length === 0) {
      setRandomMissionResult('none')
      return
    }
    const mission = openMissions[Math.floor(Math.random() * openMissions.length)]
    const patch = { claimed_by: me, claimed_at: new Date().toISOString(), participants: [me] }
    setMissions(curr => curr.map(m => m.id === mission.id ? { ...m, ...patch } : m))
    await supabase.from('missions').update(patch).eq('id', mission.id)
    setRandomMissionResult({ ...mission, ...patch })
  }

  const addMission = async ({ text, points }) => {
    const { data, error } = await supabase.from('missions').insert({
      party_id: PARTY_ID, text, points, completed: false, claimed_by: '', assigned_to: me, participants: [],
    }).select().single()
    if (error) { alert('Opslaan mislukt: ' + error.message); return }
    if (data) setMissions(curr => [...curr, data])
    setShowAddModal(false)
  }

  const tabs = [
    { key: 'claimed',   label: 'Geclaimd', icon: '🔥', items: claimed },
    { key: 'open',      label: 'Open',      icon: '📋', items: open },
    { key: 'completed', label: 'Voltooid',  icon: '✅', items: completed },
  ]
  const activeGroup = tabs.find(t => t.key === activeTab)

  return (
    <div className="missions-container">
      <div className="mission-scoreboard">
        {CREW.map((name, i) => (
          <React.Fragment key={name}>
            {i > 0 && <div className="scoreboard-divider" />}
            <div className={`scoreboard-entry ${scores[name] === maxScore && maxScore > 0 ? 'leader' : ''}`}>
              <div className="scoreboard-name">
                {scores[name] === maxScore && maxScore > 0 ? '👑 ' : ''}{name}
              </div>
              <div className="scoreboard-pts">{scores[name]} pts</div>
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="mission-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`mission-tab mission-tab-${t.key} ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <span className="mission-tab-icon">{t.icon}</span>
            <span className="mission-tab-label">{t.label}</span>
            {t.items.length > 0 && (
              <span className="mission-tab-badge">{t.items.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="autoassign-btns">
        <button className="btn autoassign-btn" onClick={() => setShowDistributeConfirm(true)}>
          🎲 Verdeel open missies
        </button>
        <button className="btn autoassign-btn" onClick={assignRandomMission}>
          🎯 Geef mij een random missie
        </button>
      </div>

      <button className="add-mission-btn" onClick={() => setShowAddModal(true)}>
        + Nieuwe missie
      </button>

      {activeTab === 'claimed' ? (
        claimed.length > 0 ? (
          CREW.filter(name => claimed.some(m => m.claimed_by === name)).map((name, idx) => {
            const personMissions = claimed.filter(m => m.claimed_by === name)
            return (
              <React.Fragment key={name}>
                <div className={`claimed-by-subheader${idx === 0 ? ' first' : ''}`}>
                  {name} ({personMissions.length})
                </div>
                {personMissions.map(m => (
                  <MissionCard
                    key={m.id}
                    mission={m}
                    me={me}
                    variant="claimed"
                    evidenceUploading={evidenceUploading === m.id}
                    onClaim={() => claimMission(m)}
                    onJoin={() => joinMission(m)}
                    onLeave={() => leaveMission(m)}
                    onComplete={() => setProofMission(m)}
                    onDelete={() => deleteMission(m)}
                    onEvidenceUpload={(file) => uploadEvidence(m, file)}
                    onRemoveEvidence={() => removeEvidence(m)}
                  />
                ))}
              </React.Fragment>
            )
          })
        ) : (
          <div className="empty">Nog niemand bezig met een missie.</div>
        )
      ) : activeGroup && activeGroup.items.length > 0 ? (
        activeGroup.items.map(m => (
          <MissionCard
            key={m.id}
            mission={m}
            me={me}
            variant={activeGroup.key}
            evidenceUploading={evidenceUploading === m.id}
            onClaim={() => claimMission(m)}
            onJoin={() => joinMission(m)}
            onLeave={() => leaveMission(m)}
            onComplete={() => setProofMission(m)}
            onDelete={() => deleteMission(m)}
            onEvidenceUpload={(file) => uploadEvidence(m, file)}
            onRemoveEvidence={() => removeEvidence(m)}
          />
        ))
      ) : (
        <div className="empty">
          {activeTab === 'open' && 'Geen open missies. Voeg er een toe!'}
          {activeTab === 'completed' && 'Nog geen missies voltooid.'}
        </div>
      )}

      {showAddModal && (
        <AddMissionModal onClose={() => setShowAddModal(false)} onSave={addMission} />
      )}

      {proofMission && (
        <ProofModal
          mission={proofMission}
          uploading={uploading}
          setUploading={setUploading}
          onClose={() => setProofMission(null)}
          onComplete={(proof) => completeMission(proofMission, proof)}
        />
      )}

      {showDistributeConfirm && (
        <div className="modal-bg" onClick={() => setShowDistributeConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Missies verdelen</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 16px', lineHeight: 1.5 }}>
              Dit verdeelt alle nog-niet-geclaimde missies willekeurig over de 4 crewleden (Yahya, Jef, Roy, Max). Doorgaan?
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowDistributeConfirm(false)}>Annuleer</button>
              <button className="btn primary" onClick={distributeOpenMissions}>Doorgaan</button>
            </div>
          </div>
        </div>
      )}

      {randomMissionResult && (
        <div className="modal-bg" onClick={() => setRandomMissionResult(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {randomMissionResult === 'none' ? (
              <p style={{ textAlign: 'center', fontSize: 18, margin: '12px 0 16px' }}>Geen open missies meer 🤷</p>
            ) : (
              <>
                <h3>Jouw missie:</h3>
                <div className="mission-random-result">
                  <div className="mission-text">{randomMissionResult.text}</div>
                  <div style={{ marginTop: 10 }}>
                    <span className={`mission-points-pill ${randomMissionResult.points >= 20 ? 'red' : randomMissionResult.points >= 15 ? 'orange' : 'blue'}`}>
                      {randomMissionResult.points} pts
                    </span>
                  </div>
                </div>
              </>
            )}
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn primary" onClick={() => setRandomMissionResult(null)}>Sluiten</button>
            </div>
          </div>
        </div>
      )}

      {distributeToast && (
        <div className="distribute-toast">{distributeToast}</div>
      )}
    </div>
  )
}

function MissionCard({ mission, me, variant, evidenceUploading, onClaim, onJoin, onLeave, onComplete, onDelete, onEvidenceUpload, onRemoveEvidence }) {
  const pointsClass = mission.points >= 20 ? 'red' : mission.points >= 15 ? 'orange' : 'blue'
  const participants = mission.participants || []
  const isParticipant = participants.includes(me)
  const evidenceRef = useRef()

  return (
    <div className={`mission-card mission-card-${variant}`}>
      <div className="mission-card-top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mission-text">{mission.text}</div>
          {mission.assigned_to && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              toegevoegd door {mission.assigned_to}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
          <span className={`mission-points-pill ${pointsClass}`}>{mission.points} pts</span>
          {variant === 'claimed' && (
            <>
              <input
                ref={evidenceRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) onEvidenceUpload(f); e.target.value = '' }}
              />
              <button
                className="iconbtn evidence-photo-btn"
                onClick={() => evidenceRef.current.click()}
                disabled={evidenceUploading}
                title="Foto als bewijs toevoegen"
              >
                {evidenceUploading ? '⏳' : '📷'}
              </button>
            </>
          )}
          <button className="iconbtn" onClick={onDelete} style={{ width: 24, height: 24, fontSize: 12 }}>×</button>
        </div>
      </div>

      <div className="mission-status-row">
        {mission.completed ? (
          <>
            <span className="status-dot green" />
            <span className="status-label">✓ Voltooid door {mission.completed_by}</span>
          </>
        ) : mission.claimed_by ? (
          <>
            <span className="status-dot orange" />
            <span className="status-label">Bezig: {mission.claimed_by}</span>
          </>
        ) : (
          <>
            <span className="status-dot gray" />
            <span className="status-label">Open</span>
          </>
        )}
      </div>

      {variant === 'claimed' && participants.length > 0 && (
        <div className="participants-row">
          {participants.map(p => (
            <span key={p} className={`participant-pill ${p === me ? 'participant-pill-me' : ''}`}>{p}</span>
          ))}
        </div>
      )}

      {variant === 'claimed' && mission.proof_url && !mission.proof_path?.startsWith('note:') && (
        <div style={{ position: 'relative', marginTop: 8 }}>
          <img
            src={mission.proof_url}
            alt="bewijs"
            className="mission-evidence-img"
            style={{ marginTop: 0 }}
            onClick={() => window.open(mission.proof_url, '_blank')}
          />
          <button
            className="evidence-remove-btn"
            onClick={onRemoveEvidence}
            title="Foto verwijderen"
          >×</button>
        </div>
      )}

      {!mission.completed && !mission.claimed_by && (
        <button className="btn primary" style={{ marginTop: 8, width: '100%' }} onClick={onClaim}>
          Ik ga deze doen
        </button>
      )}

      {!mission.completed && mission.claimed_by && !isParticipant && (
        <button className="btn mission-join-btn" onClick={onJoin}>
          + Doe mee!
        </button>
      )}

      {!mission.completed && isParticipant && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn primary" style={{ flex: 1 }} onClick={onComplete}>✓ Voltooid</button>
          <button className="btn danger" onClick={onLeave}>Stap uit</button>
        </div>
      )}

      {mission.completed && mission.proof_path?.startsWith('note:') && (
        <div className="proof-note">"{mission.proof_path.slice(5)}"</div>
      )}

      {mission.completed && !mission.proof_path?.startsWith('note:') && mission.proof_url && (
        <img
          src={mission.proof_url}
          alt="bewijs"
          style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginTop: 8, cursor: 'pointer', display: 'block' }}
          onClick={() => window.open(mission.proof_url, '_blank')}
        />
      )}
    </div>
  )
}

function AddMissionModal({ onClose, onSave }) {
  const [text, setText] = useState('')
  const [points, setPoints] = useState(10)

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Nieuwe missie</h3>
        <label>Omschrijving</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Wat moet er gedaan worden?"
          autoFocus
        />
        <label>Punten</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {[10, 15, 20].map(p => (
            <button
              key={p}
              type="button"
              className={`btn ${points === p ? 'primary' : ''}`}
              style={{ flex: 1 }}
              onClick={() => setPoints(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Annuleer</button>
          <button
            className="btn primary"
            disabled={!text.trim()}
            onClick={() => onSave({ text: text.trim(), points })}
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  )
}

function ProofModal({ mission, uploading, setUploading, onClose, onComplete }) {
  const [tab, setTab] = useState('foto')
  const [note, setNote] = useState('')
  const cameraRef = useRef()
  const libraryRef = useRef()

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${PARTY_ID}/missions/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('party-photos').upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) { alert('Upload mislukt: ' + error.message); return }
      const { data } = supabase.storage.from('party-photos').getPublicUrl(path)
      onComplete({ type: 'photo', url: data.publicUrl, path })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Bewijs toevoegen</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 12px', lineHeight: 1.4 }}>{mission.text}</p>

        <div className="proof-tabs">
          <button className={`proof-tab ${tab === 'foto' ? 'active' : ''}`} onClick={() => setTab('foto')}>📷 Foto</button>
          <button className={`proof-tab ${tab === 'notitie' ? 'active' : ''}`} onClick={() => setTab('notitie')}>📝 Notitie</button>
        </div>

        {tab === 'foto' && (
          <div style={{ marginTop: 16 }}>
            {mission.proof_url && !mission.proof_path?.startsWith('note:') && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Bestaand bewijs:</div>
                <img src={mission.proof_url} alt="bewijs" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8 }} />
                <button
                  className="btn primary"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => onComplete({ type: 'photo', url: mission.proof_url, path: mission.proof_path })}
                >
                  Dit bewijs gebruiken
                </button>
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', margin: '8px 0' }}>— of nieuw uploaden —</div>
              </div>
            )}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
            <input ref={libraryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ flex: 1 }} disabled={uploading} onClick={() => libraryRef.current.click()}>🖼 Galerij</button>
              <button className="btn primary" style={{ flex: 1 }} disabled={uploading} onClick={() => cameraRef.current.click()}>📷 Camera</button>
            </div>
            {uploading && <div style={{ textAlign: 'center', marginTop: 12, color: 'var(--text-muted)' }}>Uploaden…</div>}
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>Annuleer</button>
            </div>
          </div>
        )}

        {tab === 'notitie' && (
          <div style={{ marginTop: 16 }}>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Beschrijf hoe je de missie volbracht hebt…"
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>Annuleer</button>
              <button
                className="btn primary"
                disabled={!note.trim()}
                onClick={() => onComplete({ type: 'note', text: note.trim() })}
              >
                Opslaan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
