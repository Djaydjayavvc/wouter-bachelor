import React from 'react'
import { CREW, DAYS } from '../lib/seed'

function parseTimeMinutes(time) {
  if (!time) return null
  const m = String(time).trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

export default function MemoryBook({ slots, gallery, missions }) {
  const completedMissions = missions.filter(m => m.completed)
  const missionPhotoCount = completedMissions.filter(m => m.proof_url && !m.proof_path?.startsWith('note:')).length
  const missionNoteCount = completedMissions.filter(m => m.proof_path?.startsWith('note:')).length

  const totalPhotos = gallery.length
    + slots.reduce((sum, s) => sum + (s.photos?.length || 0), 0)
    + missionPhotoCount
  const totalNotes = slots.reduce((sum, s) => sum + (s.notes?.length || 0), 0) + missionNoteCount
  const totalDone = slots.filter(s => s.done).length
  const totalMissionPoints = completedMissions.reduce((sum, m) => sum + (m.points || 10), 0)

  const scores = CREW.map(name => ({
    name,
    pts: completedMissions.filter(m => m.completed_by === name).reduce((sum, m) => sum + (m.points || 10), 0),
    count: completedMissions.filter(m => m.completed_by === name).length,
  })).sort((a, b) => b.pts - a.pts)

  const dayGroups = DAYS.map((day, i) => ({
    ...day,
    dayIndex: i,
    slots: slots
      .filter(s => s.day === i && (s.done || (s.notes?.length > 0) || (s.photos?.length > 0)))
      .sort((a, b) => {
        const ta = parseTimeMinutes(a.time)
        const tb = parseTimeMinutes(b.time)
        if (ta !== null && tb !== null) return ta - tb
        if (ta !== null) return -1
        if (tb !== null) return 1
        return a.position - b.position
      }),
  }))

  const allPhotos = []
  for (const row of gallery) {
    allPhotos.push({ url: row.url, caption: 'uit gallery', created_at: row.created_at || '' })
  }
  for (const slot of slots) {
    for (const photo of (slot.photos || [])) {
      allPhotos.push({ url: photo.url, caption: `bij ${slot.title}`, created_at: slot.created_at || '' })
    }
  }
  for (const m of completedMissions) {
    if (m.proof_url && !m.proof_path?.startsWith('note:')) {
      allPhotos.push({ url: m.proof_url, caption: `missie: ${m.text}`, created_at: m.completed_at || '' })
    }
  }
  allPhotos.sort((a, b) => {
    if (a.created_at > b.created_at) return -1
    if (a.created_at < b.created_at) return 1
    return 0
  })

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="memory-book">
      {/* A) Hero */}
      <div className="memory-hero">
        <h1 className="memory-title">Wouter's Bachelor · Texel 2026</h1>
        <div className="memory-subtitle">13–14 juni</div>
      </div>

      {/* B) Stats bar */}
      <div className="memory-stats">
        <div className="memory-stat">
          <div className="memory-stat-num">{totalPhotos}</div>
          <div className="memory-stat-label">Foto's</div>
        </div>
        <div className="memory-stat">
          <div className="memory-stat-num">{totalNotes}</div>
          <div className="memory-stat-label">Notities</div>
        </div>
        <div className="memory-stat">
          <div className="memory-stat-num">{totalDone}</div>
          <div className="memory-stat-label">Afgevinkt</div>
        </div>
        <div className="memory-stat">
          <div className="memory-stat-num">{completedMissions.length}</div>
          <div className="memory-stat-label">Missies · {totalMissionPoints} pts</div>
        </div>
      </div>

      {/* C) Mission scoreboard */}
      {completedMissions.length > 0 && (
        <section className="memory-section">
          <h2 className="memory-h2">🏆 Missie Scorebord</h2>
          <div className="memory-leaderboard">
            {scores.map((entry, i) => (
              <div key={entry.name} className="memory-leader-row">
                <span className="memory-medal">{medals[i] || ''}</span>
                <span className="memory-leader-name">{entry.name}</span>
                <span className="memory-leader-pts">{entry.pts} pts</span>
                <span className="memory-leader-count">{entry.count} missie{entry.count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* D) Timeline */}
      <section className="memory-section">
        <h2 className="memory-h2">📅 Tijdlijn</h2>
        {dayGroups.map(({ dayIndex, label, sub, slots: dayItems }) => (
          <div key={dayIndex} className="memory-day-block">
            <div className="memory-day-header">{label} · {sub}</div>
            {dayItems.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: 13, paddingLeft: 12 }}>Geen items met content</div>
            ) : dayItems.map(slot => (
              <div key={slot.id} className="memory-timeline-slot">
                <div className="memory-slot-time">{slot.time || '—'}</div>
                <div className="memory-slot-body">
                  <div className="memory-slot-title">{slot.done ? '✓ ' : ''}{slot.title}</div>
                  {slot.subtitle && <div className="memory-slot-sub">{slot.subtitle}</div>}
                  {(slot.notes?.length > 0) && (
                    <div className="memory-notes">
                      {slot.notes.map((n, ni) => (
                        <div key={n.id || ni} className="memory-note">
                          <span className="memory-note-author">{n.author}</span> {n.text}
                        </div>
                      ))}
                    </div>
                  )}
                  {(slot.photos?.length > 0) && (
                    <div className="memory-photo-strip">
                      {slot.photos.map((p, pi) => (
                        <img
                          key={p.id || pi}
                          src={p.url}
                          alt=""
                          onClick={() => window.open(p.url, '_blank')}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>

      {/* E) Missions terugblik */}
      {completedMissions.length > 0 && (
        <section className="memory-section">
          <h2 className="memory-h2">💥 Missies Terugblik</h2>
          <div className="memory-missions-grid">
            {completedMissions.map(m => (
              <div key={m.id} className="memory-mission-card">
                <div className="memory-mission-text">{m.text}</div>
                <div className="memory-mission-meta">
                  <span>{m.completed_by}</span>
                  <span className={`mission-points-pill ${m.points >= 20 ? 'red' : m.points >= 15 ? 'orange' : 'blue'}`}>
                    {m.points} pts
                  </span>
                </div>
                {m.proof_path?.startsWith('note:') ? (
                  <div className="proof-note">"{m.proof_path.slice(5)}"</div>
                ) : m.proof_url ? (
                  <img
                    src={m.proof_url}
                    alt="bewijs"
                    style={{ width: '100%', borderRadius: 8, marginTop: 8, display: 'block', cursor: 'pointer' }}
                    onClick={() => window.open(m.proof_url, '_blank')}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* F) Photo wall */}
      {allPhotos.length > 0 && (
        <section className="memory-section">
          <h2 className="memory-h2">📸 Foto Wall</h2>
          <div className="memory-photo-wall">
            {allPhotos.map((p, i) => (
              <div key={i} className="memory-photo-item">
                <img src={p.url} alt="" onClick={() => window.open(p.url, '_blank')} />
                <div className="memory-photo-caption">{p.caption}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* G) Footer */}
      <div className="memory-footer">
        Met dank aan Yahya, Jef, Roy en Max. 🐴
        <br />
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          {new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>
    </div>
  )
}
