import React, { useRef, useState } from 'react'
import { supabase, PARTY_ID } from '../lib/supabase'

export default function Gallery({ onClose, me, gallery, slots }) {
  const fileInput = useRef()
  const [uploading, setUploading] = useState(false)
  const [fullscreen, setFullscreen] = useState(null)

  // Build unified photo list from gallery table + slot photos arrays
  const allPhotos = []

  for (const row of gallery) {
    allPhotos.push({
      _key: `g-${row.id}`,
      url: row.url,
      caption: row.caption || '',
      by: row.by,
      source: 'uploaded to gallery',
      created_at: row.created_at || '',
    })
  }

  for (const slot of slots) {
    for (const photo of (slot.photos || [])) {
      allPhotos.push({
        _key: `s-${photo.id}`,
        url: photo.url,
        caption: '',
        by: photo.by,
        source: `from: ${slot.title}`,
        created_at: slot.created_at || '',
      })
    }
  }

  // Sort newest first
  allPhotos.sort((a, b) => {
    if (a.created_at > b.created_at) return -1
    if (a.created_at < b.created_at) return 1
    return 0
  })

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${PARTY_ID}/gallery/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('party-photos')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (uploadError) {
        alert('Upload mislukt: ' + uploadError.message)
        return
      }
      const { data } = supabase.storage.from('party-photos').getPublicUrl(path)
      await supabase.from('gallery').insert({
        party_id: PARTY_ID,
        url: data.publicUrl,
        path,
        by: me,
        caption: '',
      })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="gallery-modal">
      <div className="gallery-header">
        <h2>📷 Gallery</h2>
        <button className="gallery-close" onClick={onClose} aria-label="Sluiten">×</button>
      </div>

      {allPhotos.length === 0 ? (
        <div className="gallery-empty">Nog geen foto's. Voeg de eerste toe!</div>
      ) : (
        <div className="gallery-grid">
          {allPhotos.map(photo => (
            <div
              key={photo._key}
              className="gallery-thumb"
              onClick={() => setFullscreen(photo)}
            >
              <img src={photo.url} alt="" loading="lazy" />
              <div className="source-badge">{photo.source}</div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />
      <button
        className="gallery-fab"
        disabled={uploading}
        onClick={() => fileInput.current.click()}
        aria-label="Foto uploaden"
      >
        {uploading ? '…' : '+'}
      </button>

      {fullscreen && (
        <div className="gallery-fullscreen" onClick={() => setFullscreen(null)}>
          <button
            className="gallery-fullscreen-close"
            onClick={(e) => { e.stopPropagation(); setFullscreen(null) }}
            aria-label="Sluiten"
          >
            ×
          </button>
          <img
            src={fullscreen.url}
            alt={fullscreen.caption}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="gallery-fullscreen-meta" onClick={(e) => e.stopPropagation()}>
            {fullscreen.caption && <div>{fullscreen.caption}</div>}
            <div><span className="who">{fullscreen.by}</span></div>
            <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: 6, fontSize: 12 }}>
              {fullscreen.source}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
