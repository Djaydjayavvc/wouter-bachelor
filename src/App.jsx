import React, { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, PARTY_ID } from './lib/supabase'
import { CREW, DAYS } from './lib/seed'
import Slot from './components/Slot'
import GearItem from './components/GearItem'
import AddSlotModal from './components/AddSlotModal'

export default function App() {
  const [me, setMe] = useState(() => localStorage.getItem('me') || 'Yahya')
  const [activeDay, setActiveDay] = useState(1)
  const [slots, setSlots] = useState([])
  const [gear, setGear] = useState([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [showAddSlot, setShowAddSlot] = useState(false)

  useEffect(() => { localStorage.setItem('me', me) }, [me])

  const loadAll = useCallback(async () => {
    const [slotsRes, gearRes] = await Promise.all([
      supabase.from('slots').select('*').eq('party_id', PARTY_ID).order('day').order('position'),
      supabase.from('gear').select('*').eq('party_id', PARTY_ID).order('created_at'),
    ])
    if (slotsRes.data) setSlots(slotsRes.data)
    if (gearRes.data) setGear(gearRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()

    const channel = supabase
      .channel(`party-${PARTY_ID}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'slots', filter: `party_id=eq.${PARTY_ID}` },
        (payload) => {
          setSlots(curr => applyChange(curr, payload, 'day', 'position'))
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'gear', filter: `party_id=eq.${PARTY_ID}` },
        (payload) => {
          setGear(curr => applyChange(curr, payload, 'created_at'))
        })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [loadAll])

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

  const updateSlot = async (id, patch) => {
    setSlots(curr => curr.map(s => s.id === id ? { ...s, ...patch } : s))
    await supabase.from('slots').update(patch).eq('id', id)
  }
  const deleteSlot = async (id) => {
    setSlots(curr => curr.filter(s => s.id !== id))
    await supabase.from('slots').delete().eq('id', id)
  }
  const addSlot = async ({ time, title, subtitle }) => {
    const maxPos = Math.max(-1, ...daySlots.map(s => s.position))
    const row = {
      party_id: PARTY_ID,
      day: activeDay,
      position: maxPos + 1,
      time: time || '',
      title,
      subtitle: subtitle || '',
      done: false,
      notes: [],
      photos: [],
    }
    const { data } = await supabase.from('slots').insert(row).select().single()
    if (data) setSlots(curr => [...curr, data])
  }

  const updateGear = async (id, patch) => {
    setGear(curr => curr.map(g => g.id === id ? { ...g, ...patch } : g))
    await supabase.from('gear').update(patch).eq('id', id)
  }
  const deleteGear = async (id) => {
    setGear(curr => curr.filter(g => g.id !== id))
    await supabase.from('gear').delete().eq('id', id)
  }
  const addGear = async () => {
    const text = prompt('Wat moet meegenomen worden?')
    if (!text || !text.trim()) return
    const { data } = await supabase.from('gear').insert({
      party_id: PARTY_ID, text: text.trim(), who: me, got: false
    }).select().single()
    if (data) setGear(curr => [...curr, data])
  }

  if (loading) return <div className="loading">Even de planning ophalen…</div>

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>Wouter's bachelor</h1>
          <div className="sub">📍 Texel · 13–14 juni 2026</div>
          <div className="connection">
            <span className={`dot ${connected ? 'live' : ''}`}></span>
            {connected ? 'live sync' : 'offline'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>jij bent</div>
          <select className="me-select" value={me} onChange={e => setMe(e.target.value)}>
            {CREW.map(name => <option key={name}>{name}</option>)}
          </select>
        </div>
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
          onUpdate={(patch) => updateSlot(slot.id, patch)}
          onDelete={() => deleteSlot(slot.id)}
        />
      ))}

      <button className="add-slot" onClick={() => setShowAddSlot(true)}>
        + Item toevoegen
      </button>

      <div className="section-header">
        <h2>📦 Mee te nemen</h2>
        <button className="iconbtn" onClick={addGear} aria-label="Voeg toe">+</button>
      </div>

      {gear.map(g => (
        <GearItem
          key={g.id}
          item={g}
          me={me}
          crew={CREW}
          onUpdate={(patch) => updateGear(g.id, patch)}
          onDelete={() => deleteGear(g.id)}
        />
      ))}

      <div className="foot">
        Alles wordt live gedeeld met de crew · wijzigingen zijn meteen zichtbaar bij iedereen
      </div>

      {showAddSlot && (
        <AddSlotModal
          onClose={() => setShowAddSlot(false)}
          onSave={(data) => { addSlot(data); setShowAddSlot(false) }}
        />
      )}
    </div>
  )
}

function parseTimeMinutes(time) {
  if (!time) return null
  const m = String(time).trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

function applyChange(curr, payload, ...sortKeys) {
  if (payload.eventType === 'INSERT') {
    if (curr.find(x => x.id === payload.new.id)) return curr
    return [...curr, payload.new].sort(makeSort(sortKeys))
  }
  if (payload.eventType === 'UPDATE') {
    return curr.map(x => x.id === payload.new.id ? payload.new : x)
  }
  if (payload.eventType === 'DELETE') {
    return curr.filter(x => x.id !== payload.old.id)
  }
  return curr
}
function makeSort(keys) {
  return (a, b) => {
    for (const k of keys) {
      if (a[k] < b[k]) return -1
      if (a[k] > b[k]) return 1
    }
    return 0
  }
}
