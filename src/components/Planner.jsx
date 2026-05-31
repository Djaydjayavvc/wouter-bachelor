import React, { useState } from 'react'
import { CREW, DAYS } from '../lib/seed'
import Slot from './Slot'
import GearItem from './GearItem'
import AddSlotModal from './AddSlotModal'
import Gallery from './Gallery'

function parseTimeMinutes(time) {
  if (!time) return null
  const m = String(time).trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

export default function Planner({
  me, slots, gear, gallery,
  onUpdateSlot, onDeleteSlot, onAddSlot,
  onUpdateGear, onDeleteGear, onAddGear,
}) {
  const [activeDay, setActiveDay] = useState(1)
  const [showAddSlot, setShowAddSlot] = useState(false)
  const [showGallery, setShowGallery] = useState(false)

  const daySlots = slots
    .filter(s => s.day === activeDay)
    .sort((a, b) => {
      const ta = parseTimeMinutes(a.time)
      const tb = parseTimeMinutes(b.time)
      if (ta !== null && tb !== null) return ta - tb
      if (ta !== null) return -1
      if (tb !== null) return 1
      return a.position - b.position
    })

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="gallery-btn" onClick={() => setShowGallery(true)}>
          📷 Gallery
        </button>
      </div>

      <div className="day-tabs">
        {DAYS.map((d, i) => (
          <button
            key={i}
            className={`day-tab ${activeDay === i ? 'active' : ''}`}
            onClick={() => setActiveDay(i)}
          >
            <span className="day-num">{d.label}</span>
            {d.sub}
          </button>
        ))}
      </div>

      {daySlots.length === 0 && (
        <div className="empty">Nog niks ingepland voor deze dag.</div>
      )}

      {daySlots.map(slot => (
        <Slot
          key={slot.id}
          slot={slot}
          me={me}
          onUpdate={(patch) => onUpdateSlot(slot.id, patch)}
          onDelete={() => onDeleteSlot(slot.id)}
        />
      ))}

      <button className="add-slot" onClick={() => setShowAddSlot(true)}>
        + Item toevoegen
      </button>

      <div className="section-header">
        <h2>📦 Mee te nemen</h2>
        <button className="iconbtn" onClick={onAddGear} aria-label="Voeg toe">+</button>
      </div>

      {gear.map(g => (
        <GearItem
          key={g.id}
          item={g}
          me={me}
          crew={CREW}
          onUpdate={(patch) => onUpdateGear(g.id, patch)}
          onDelete={() => onDeleteGear(g.id)}
        />
      ))}

      <div className="foot">
        Alles wordt live gedeeld met de crew · wijzigingen zijn meteen zichtbaar bij iedereen
      </div>

      {showAddSlot && (
        <AddSlotModal
          onClose={() => setShowAddSlot(false)}
          onSave={(data) => { onAddSlot({ ...data, day: activeDay }); setShowAddSlot(false) }}
        />
      )}

      {showGallery && (
        <Gallery
          onClose={() => setShowGallery(false)}
          me={me}
          gallery={gallery}
          slots={slots}
        />
      )}
    </>
  )
}
