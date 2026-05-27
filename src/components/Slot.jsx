import React, { useRef, useState } from 'react'
import { supabase, PARTY_ID } from '../lib/supabase'

export default function Slot({ slot, me, onUpdate, onDelete }) {
  const fileInput = useRef()
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(slot.title)
  const [editSub, setEditSub] = useState(slot.subtitle || '')
  const [editTime, setEditTime] = useState(slot.time || '')
  const [uploading, setUploading] = useState(false)

  const toggleDone = () => onUpdate({ done: !slot.done })

  const addNote = () => {
    const text = prompt('Notitie:')
    if (!text || !text.trim()) return
    const notes = [...(slot.notes || []), {
      id: crypto.randomUUID(),
      author: me,
      text: text.trim(),
      at: new Date().toISOString(),
    }]
    onUpdate({ notes })
  }

  const deleteNote = (noteId) => {
    onUpdate({ notes: (slot.notes || []).filter(n => n.id !== noteId) })
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${PARTY_ID}/${slot.id}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('party-photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (error) {
        alert('Upload mislukt: ' + error.message)
        return
      }
      const { data } = supabase.storage.from('party-photos').getPublicUrl(path)
      const photos = [...(slot.photos || []), {
        id: crypto.randomUUID(),
        url: data.publicUrl,
        path,
        by: me,
      }]
      onUpdate({ photos })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const deletePhoto = async (photo) => {
    if (!confirm('Foto verwijderen?')) return
    if (photo.path) {
      await supabase.storage.from('party-photos').remove([photo.path])
    }
    onUpdate({ photos: (slot.photos || []).filter(p => p.id !== photo.id) })
  }

  const saveEdit = () => {
    onUpdate({
      title: editTitle.trim() || slot.title,
      subtitle: editSub.trim(),
      time: editTime.trim(),
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="slot">
        <input
          value={editTime}
          onChange={e => setEditTime(e.target.value)}
          placeholder="Tijd"
          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', marginBottom: 8 }}
        />
        <input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          placeholder="Titel"
          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', marginBottom: 8 }}
        />
        <textarea
          value={editSub}
          onChange={e => setEditSub(e.target.value)}
          placeholder="Beschrijving"
          rows={2}
          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => setEditing(false)}>Annuleer</button>
          <button className="btn primary" onClick={saveEdit}>Opslaan</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`slot ${slot.done ? 'done' : ''}`}>
      <div className="slot-row">
        <div className="slot-time">{slot.time}</div>
        <div className="slot-body">
          <p className="slot-title">{slot.title}</p>
          {slot.subtitle && <p className="slot-sub">{slot.subtitle}</p>}

          {(slot.notes || []).length > 0 && (
            <div className="notes">
              {slot.notes.map(n => (
                <div key={n.id} className="note">
                  <div className="note-meta">
                    <span className="note-author">{n.author}</span>
                    <button className="note-del" onClick={() => deleteNote(n.id)} aria-label="Verwijder">×</button>
                  </div>
                  {n.text}
                </div>
              ))}
            </div>
          )}

          {(slot.photos || []).length > 0 && (
            <div className="photos">
              {slot.photos.map(p => (
                <div key={p.id} className="photo-thumb">
                  <img src={p.url} alt="" loading="lazy" />
                  <button className="photo-del" onClick={() => deletePhoto(p)} aria-label="Verwijder">×</button>
                </div>
              ))}
            </div>
          )}

          <div className="slot-actions">
            <button className={`iconbtn ${slot.done ? 'active' : ''}`} onClick={toggleDone} aria-label="Afvinken">✓</button>
            <button className="iconbtn" onClick={addNote} aria-label="Notitie">💬</button>
            <button className="iconbtn" onClick={() => fileInput.current.click()} disabled={uploading} aria-label="Foto">
              {uploading ? '…' : '📷'}
            </button>
            <button className="iconbtn" onClick={() => setEditing(true)} aria-label="Bewerken">✎</button>
            <button className="iconbtn" onClick={() => confirm('Verwijder dit item?') && onDelete()} aria-label="Verwijder">🗑</button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
