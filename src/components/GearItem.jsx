import React from 'react'

export default function GearItem({ item, me, crew, onUpdate, onDelete }) {
  const cycleWho = () => {
    const options = [...crew, 'iedereen']
    const idx = options.indexOf(item.who)
    onUpdate({ who: options[(idx + 1) % options.length] })
  }

  return (
    <div className={`gear-row ${item.got ? 'got' : ''}`}>
      <button
        className={`check-btn ${item.got ? 'checked' : ''}`}
        onClick={() => onUpdate({ got: !item.got })}
        aria-label="Toggle"
      >✓</button>
      <div className="gear-text">{item.text}</div>
      <button
        className={`who-pill ${item.who === me ? 'me' : ''}`}
        onClick={cycleWho}
        style={{ border: 'none', cursor: 'pointer' }}
      >{item.who}</button>
      <button
        className="iconbtn"
        style={{ width: 26, height: 26, fontSize: 12 }}
        onClick={() => confirm('Verwijderen?') && onDelete()}
        aria-label="Verwijder"
      >×</button>
    </div>
  )
}
