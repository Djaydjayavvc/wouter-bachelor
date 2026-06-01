import React, { useRef, useState } from 'react'
import { supabase, PARTY_ID } from '../lib/supabase'
import { CREW } from '../lib/seed'

export default function Missions({ me, missions, setMissions }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [proofMission, setProofMission] = useState(null)
  const [uploading, setUploading] = useState(false)

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
    const patch = { claimed_by: me, claimed_at: new Date().toISOString() }
    setMissions(curr => curr.map(m => m.id === mission.id ? { ...m, ...patch } : m))
    await supabase.from('missions').update(patch).eq('id', mission.id)
  }

  const releaseMission = async (mission) => {
    const patch = { claimed_by: '', claimed_at: null }
    setMissions(curr => curr.map(m => m.id === mission.id ? { ...m, ...patch } : m))
    await supabase.from('missions').update(patch).eq('id', mission.id)
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
      proof_url: proof.type === 'photo' ? proof.url : '',
      proof_path: proof.type === 'photo' ? proof.path : `note:${proof.text}`,
    }
    setMissions(curr => curr.map(m => m.id === mission.id ? { ...m, ...patch } : m))
    await supabase.from('missions').update(patch).eq('id', mission.id)
    setProofMission(null)
  }

  const addMission = async ({ text, points }) => {
    const { data, error } = await supabase.from('missions').insert({
      party_id: PARTY_ID, text, points, completed: false, claimed_by: '', assigned_to: '',
    }).select().single()
    if (error) {
      alert('Opslaan mislukt: ' + error.message)
      return
    }
    if (data) setMissions(curr => [...curr, data])
    setShowAddModal(false)
  }

  const groups = [
    { label: 'Open', items: open },
    { label: 'Geclaimd', items: claimed },
    { label: 'Voltooid', items: completed },
  ]

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

      <button className="add-mission-btn" onClick={() => setShowAddModal(true)}>
        + Nieuwe missie
      </button>

      {groups.map(({ label, items }) => items.length > 0 && (
        <div key={label}>
          <div className="mission-group-header">{label}</div>
          {items.map(m => (
            <MissionCard
              key={m.id}
              mission={m}
              me={me}
              onClaim={() => claimMission(m)}
              onRelease={() => releaseMission(m)}
              onComplete={() => setProofMission(m)}
              onDelete={() => deleteMission(m)}
            />
          ))}
        </div>
      ))}

      {missions.length === 0 && (
        <div className="empty">Nog geen missies. Voeg de eerste toe!</div>
      )}

      {showAddModal && (
        <AddMissionModal
          onClose={() => setShowAddModal(false)}
          onSave={addMission}
        />
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
    </div>
  )
}

function MissionCard({ mission, me, onClaim, onRelease, onComplete, onDelete }) {
  const pointsClass = mission.points >= 20 ? 'red' : mission.points >= 15 ? 'orange' : 'blue'

  return (
    <div className="mission-card">
      <div className="mission-card-top">
        <div className="mission-text">{mission.text}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
          <span className={`mission-points-pill ${pointsClass}`}>{mission.points} pts</span>
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
            <span className="status-label">Geclaimd door {mission.claimed_by}</span>
          </>
        ) : (
          <>
            <span className="status-dot gray" />
            <span className="status-label">Open</span>
          </>
        )}
      </div>

      {!mission.completed && !mission.claimed_by && (
        <button className="btn primary" style={{ marginTop: 8, width: '100%' }} onClick={onClaim}>
          Ik ga deze doen
        </button>
      )}

      {!mission.completed && mission.claimed_by === me && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn primary" style={{ flex: 1 }} onClick={onComplete}>Voltooid</button>
          <button className="btn danger" style={{ flex: 1 }} onClick={onRelease}>Toch niet</button>
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
          <button className={`proof-tab ${tab === 'foto' ? 'active' : ''}`} onClick={() => setTab('foto')}>Foto</button>
          <button className={`proof-tab ${tab === 'notitie' ? 'active' : ''}`} onClick={() => setTab('notitie')}>Notitie</button>
        </div>

        {tab === 'foto' && (
          <div style={{ marginTop: 16 }}>
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
