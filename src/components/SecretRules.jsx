import React, { useEffect, useState, useCallback } from 'react'
import { supabase, PARTY_ID } from '../lib/supabase'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'zojuist'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m geleden`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}u geleden`
  return `${Math.floor(h / 24)}d geleden`
}

export default function SecretRules({ me }) {
  const [rules, setRules] = useState([])
  const [triggers, setTriggers] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editRule, setEditRule] = useState(null)
  const [ruleText, setRuleText] = useState('')
  const [flashingId, setFlashingId] = useState(null)
  const [pulsingId, setPulsingId] = useState(null)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [timelineOpen, setTimelineOpen] = useState(false)

  const loadRules = useCallback(async () => {
    const { data } = await supabase
      .from('secret_rules')
      .select('*')
      .eq('party_id', PARTY_ID)
      .order('trigger_count', { ascending: false })
    if (data) setRules(data)
  }, [])

  const loadTriggers = useCallback(async () => {
    const { data } = await supabase
      .from('rule_triggers')
      .select('*, secret_rules(rule_text)')
      .eq('party_id', PARTY_ID)
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) setTriggers(data)
  }, [])

  useEffect(() => {
    loadRules()
    loadTriggers()

    const channel = supabase
      .channel(`secret-rules-${PARTY_ID}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'secret_rules', filter: `party_id=eq.${PARTY_ID}` },
        () => { loadRules() })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'rule_triggers', filter: `party_id=eq.${PARTY_ID}` },
        () => { loadRules(); loadTriggers() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadRules, loadTriggers])

  const totalTriggers = rules.reduce((sum, r) => sum + (r.trigger_count || 0), 0)
  const topRule = rules.find(r => r.trigger_count > 0) || null

  const triggerRule = async (rule) => {
    setMenuOpenId(null)
    await supabase.from('rule_triggers').insert({
      party_id: PARTY_ID,
      rule_id: rule.id,
      triggered_by: me,
    })
    const { data: current } = await supabase
      .from('secret_rules')
      .select('trigger_count')
      .eq('id', rule.id)
      .single()
    await supabase
      .from('secret_rules')
      .update({ trigger_count: (current?.trigger_count || 0) + 1 })
      .eq('id', rule.id)

    setFlashingId(rule.id)
    setPulsingId(rule.id)
    setTimeout(() => setFlashingId(null), 600)
    setTimeout(() => setPulsingId(null), 600)
  }

  const untriggerRule = async (rule) => {
    if ((rule.trigger_count || 0) <= 0) return
    const { data: latest } = await supabase
      .from('rule_triggers')
      .select('id')
      .eq('rule_id', rule.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (latest) {
      await supabase.from('rule_triggers').delete().eq('id', latest.id)
    }
    const { data: current } = await supabase
      .from('secret_rules')
      .select('trigger_count')
      .eq('id', rule.id)
      .single()
    await supabase
      .from('secret_rules')
      .update({ trigger_count: Math.max(0, (current?.trigger_count || 0) - 1) })
      .eq('id', rule.id)
  }

  const saveRule = async () => {
    if (!ruleText.trim()) return
    if (editRule) {
      await supabase.from('secret_rules').update({ rule_text: ruleText.trim() }).eq('id', editRule.id)
    } else {
      await supabase.from('secret_rules').insert({
        party_id: PARTY_ID,
        rule_text: ruleText.trim(),
        trigger_count: 0,
        created_by: me,
      })
    }
    setShowAddModal(false)
    setEditRule(null)
    setRuleText('')
    loadRules()
  }

  const deleteRule = async (rule) => {
    if (!window.confirm(`Regel verwijderen?\n"${rule.rule_text}"`)) return
    await supabase.from('rule_triggers').delete().eq('rule_id', rule.id)
    await supabase.from('secret_rules').delete().eq('id', rule.id)
    setMenuOpenId(null)
    loadRules()
    loadTriggers()
  }

  const openEdit = (rule) => {
    setEditRule(rule)
    setRuleText(rule.rule_text)
    setMenuOpenId(null)
    setShowAddModal(true)
  }

  const openAdd = () => {
    setEditRule(null)
    setRuleText('')
    setShowAddModal(true)
  }

  const recentTrigger = (rule) => {
    const related = triggers.filter(t => t.rule_id === rule.id)
    if (!related.length) return null
    const latest = related[0]
    const diff = Date.now() - new Date(latest.created_at).getTime()
    return diff < 60 * 60 * 1000 ? latest : null
  }

  return (
    <div className="secret-rules-container">
      <div className="rules-warning-header">
        <div className="rules-warning-title">🤫 Geheime Regels</div>
        <div className="rules-warning-sub">
          Wouter weet hier niks van. Druk op + als hij een regel overtreedt — dan moet hij drinken.
        </div>
      </div>

      <div className="rules-total-card">
        <div className="rules-total-num">{totalTriggers}</div>
        <div className="rules-total-label">keer dat Wouter heeft moeten drinken</div>
        {topRule && (
          <div className="rules-total-top">
            meest: "{topRule.rule_text.length > 40 ? topRule.rule_text.slice(0, 40) + '…' : topRule.rule_text}"
          </div>
        )}
      </div>

      <button className="add-slot" style={{ marginBottom: 16 }} onClick={openAdd}>
        + Nieuwe regel
      </button>

      {rules.length === 0 ? (
        <div className="empty">Nog geen regels. Voeg er een toe!</div>
      ) : (
        <div className="rules-list">
          {rules.map(rule => {
            const recent = recentTrigger(rule)
            return (
              <div
                key={rule.id}
                className={`rule-card${flashingId === rule.id ? ' flashing' : ''}`}
              >
                <div className="rule-card-body">
                  <div className="rule-text">{rule.rule_text}</div>
                  {recent && (
                    <div className="rule-recent">geknald: {timeAgo(recent.created_at)}</div>
                  )}
                </div>
                <div className="rule-card-right">
                  <div className="rule-count-row">
                    <button
                      className="rule-count-btn minus"
                      onClick={() => untriggerRule(rule)}
                      disabled={(rule.trigger_count || 0) === 0}
                    >−</button>
                    <div className={`rule-counter${pulsingId === rule.id ? ' pulse' : ''}`}>
                      {rule.trigger_count || 0}x
                    </div>
                    <button
                      className="rule-count-btn plus"
                      onClick={() => triggerRule(rule)}
                    >+</button>
                  </div>
                  <button
                    className="iconbtn rule-menu-btn"
                    onClick={() => setMenuOpenId(menuOpenId === rule.id ? null : rule.id)}
                  >
                    ···
                  </button>
                  {menuOpenId === rule.id && (
                    <div className="rule-menu">
                      <button onClick={() => openEdit(rule)}>Bewerk</button>
                      <button className="danger" onClick={() => deleteRule(rule)}>Verwijder</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="rules-timeline-section">
        <button
          className="rules-timeline-toggle"
          onClick={() => setTimelineOpen(o => !o)}
        >
          Laatste 10 overtredingen <span>{timelineOpen ? '▲' : '▼'}</span>
        </button>
        {timelineOpen && (
          <div className="rules-timeline">
            {triggers.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '12px 0' }}>Nog geen overtredingen</div>
            ) : triggers.map(t => (
              <div key={t.id} className="rules-trigger-row">
                <span className="rules-trigger-rule">{t.secret_rules?.rule_text || '—'}</span>
                <span className="rules-trigger-meta"> — door {t.triggered_by} — {timeAgo(t.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-bg" onClick={() => { setShowAddModal(false); setEditRule(null); setRuleText('') }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editRule ? 'Regel bewerken' : 'Nieuwe regel'}</h3>
            <label>Wat is de regel?</label>
            <textarea
              value={ruleText}
              onChange={e => setRuleText(e.target.value)}
              placeholder="bv. Z'n glas met rechterhand vasthouden = drinken"
              rows={3}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn" onClick={() => { setShowAddModal(false); setEditRule(null); setRuleText('') }}>
                Annuleer
              </button>
              <button className="btn primary" onClick={saveRule}>
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
