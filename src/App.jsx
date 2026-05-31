import React, { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, PARTY_ID } from './lib/supabase'
import { CREW } from './lib/seed'
import Planner from './components/Planner'
import Missions from './components/Missions'
import MemoryBook from './components/MemoryBook'

export default function App() {
  const [me, setMe] = useState(() => localStorage.getItem('me') || 'Yahya')
  const [slots, setSlots] = useState([])
  const [gear, setGear] = useState([])
  const [gallery, setGallery] = useState([])
  const [missions, setMissions] = useState([])
  const [partyMeta, setPartyMeta] = useState({ memory_mode: false })
  const [currentView, setCurrentView] = useState('planner')
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef()

  useEffect(() => { localStorage.setItem('me', me) }, [me])

  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadAll = useCallback(async () => {
    const [slotsRes, gearRes, galleryRes, missionsRes, metaRes] = await Promise.all([
      supabase.from('slots').select('*').eq('party_id', PARTY_ID).order('day').order('position'),
      supabase.from('gear').select('*').eq('party_id', PARTY_ID).order('created_at'),
      supabase.from('gallery').select('*').eq('party_id', PARTY_ID).order('created_at', { ascending: false }),
      supabase.from('missions').select('*').eq('party_id', PARTY_ID).order('created_at'),
      supabase.from('party_meta').select('*').eq('party_id', PARTY_ID).single(),
    ])
    if (slotsRes.data) setSlots(slotsRes.data)
    if (gearRes.data) setGear(gearRes.data)
    if (galleryRes.data) setGallery(galleryRes.data)
    if (missionsRes.data) setMissions(missionsRes.data)
    if (metaRes.data) setPartyMeta(metaRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()

    const channel = supabase
      .channel(`party-${PARTY_ID}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'slots', filter: `party_id=eq.${PARTY_ID}` },
        (payload) => { setSlots(curr => applyChange(curr, payload, 'day', 'position')) })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'gear', filter: `party_id=eq.${PARTY_ID}` },
        (payload) => { setGear(curr => applyChange(curr, payload, 'created_at')) })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'gallery', filter: `party_id=eq.${PARTY_ID}` },
        (payload) => { setGallery(curr => applyChange(curr, payload, 'created_at')) })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'missions', filter: `party_id=eq.${PARTY_ID}` },
        (payload) => { setMissions(curr => applyChange(curr, payload, 'created_at')) })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'party_meta', filter: `party_id=eq.${PARTY_ID}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') setPartyMeta(payload.new)
        })
      .subscribe((status) => { setConnected(status === 'SUBSCRIBED') })

    return () => { supabase.removeChannel(channel) }
  }, [loadAll])

  const toggleMemoryMode = async () => {
    const newVal = !partyMeta.memory_mode
    setPartyMeta(p => ({ ...p, memory_mode: newVal }))
    setSettingsOpen(false)
    if (!newVal && currentView === 'memory') setCurrentView('planner')
    await supabase.from('party_meta').update({ memory_mode: newVal }).eq('party_id', PARTY_ID)
  }

  const updateSlot = async (id, patch) => {
    setSlots(curr => curr.map(s => s.id === id ? { ...s, ...patch } : s))
    await supabase.from('slots').update(patch).eq('id', id)
  }
  const deleteSlot = async (id) => {
    setSlots(curr => curr.filter(s => s.id !== id))
    await supabase.from('slots').delete().eq('id', id)
  }
  const addSlot = async ({ time, title, subtitle, day }) => {
    const daySlots = slots.filter(s => s.day === day)
    const maxPos = Math.max(-1, ...daySlots.map(s => s.position))
    const row = {
      party_id: PARTY_ID,
      day,
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
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          <div ref={settingsRef} style={{ position: 'relative' }}>
            <button
              className="iconbtn"
              onClick={() => setSettingsOpen(o => !o)}
              aria-label="Instellingen"
              title="Instellingen"
              style={{ fontSize: 16 }}
            >
              ⚙️
            </button>
            {settingsOpen && (
              <div className="settings-menu">
                <button onClick={toggleMemoryMode}>
                  Memory Book {partyMeta.memory_mode ? 'UIT' : 'AAN'}
                </button>
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>jij bent</div>
            <select className="me-select" value={me} onChange={e => setMe(e.target.value)}>
              {CREW.map(name => <option key={name}>{name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="top-tabs">
        <button
          className={`top-tab ${currentView === 'planner' ? 'active' : ''}`}
          onClick={() => setCurrentView('planner')}
        >
          Planner
        </button>
        <button
          className={`top-tab ${currentView === 'missions' ? 'active' : ''}`}
          onClick={() => setCurrentView('missions')}
        >
          Missies
        </button>
        {partyMeta.memory_mode && (
          <button
            className={`top-tab ${currentView === 'memory' ? 'active' : ''}`}
            onClick={() => setCurrentView('memory')}
          >
            Memory Book
          </button>
        )}
      </div>

      {currentView === 'planner' && (
        <Planner
          me={me}
          slots={slots}
          gear={gear}
          gallery={gallery}
          onUpdateSlot={updateSlot}
          onDeleteSlot={deleteSlot}
          onAddSlot={addSlot}
          onUpdateGear={updateGear}
          onDeleteGear={deleteGear}
          onAddGear={addGear}
        />
      )}

      {currentView === 'missions' && (
        <Missions
          me={me}
          missions={missions}
          setMissions={setMissions}
        />
      )}

      {currentView === 'memory' && partyMeta.memory_mode && (
        <MemoryBook
          slots={slots}
          gallery={gallery}
          missions={missions}
        />
      )}
    </div>
  )
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
