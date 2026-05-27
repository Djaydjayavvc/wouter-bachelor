import React, { useState } from 'react'

export default function AddSlotModal({ onClose, onSave }) {
  const [time, setTime] = useState('')
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')

  const save = () => {
    if (!title.trim()) return
    onSave({ time: time.trim(), title: title.trim(), subtitle: subtitle.trim() })
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Nieuw item</h3>
        <label>Tijd</label>
        <input value={time} onChange={e => setTime(e.target.value)} placeholder="bv. 13:00 of 'ochtend'" />
        <label>Wat gaan we doen?</label>
        <input value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        <label>Details (optioneel)</label>
        <textarea value={subtitle} onChange={e => setSubtitle(e.target.value)} />
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Annuleer</button>
          <button className="btn primary" onClick={save} disabled={!title.trim()}>Toevoegen</button>
        </div>
      </div>
    </div>
  )
}
