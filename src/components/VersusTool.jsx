import { useState } from 'react'
import { AI_TOOLS } from '../data/aiTools.js'

const STATS = ['reasoning', 'coding', 'creativity', 'speed']
const LABELS = { reasoning: '🧠 Reasoning', coding: '💻 Coding', creativity: '🎨 Creativity', speed: '⚡ Speed' }

function Picker({ value, onChange, exclude }) {
  return (
    <select className="vs-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {AI_TOOLS.filter((t) => t.id !== exclude).map((t) => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  )
}

export default function VersusTool() {
  const [leftId, setLeftId] = useState('chatgpt')
  const [rightId, setRightId] = useState('claude')

  const left = AI_TOOLS.find((t) => t.id === leftId)
  const right = AI_TOOLS.find((t) => t.id === rightId)
  const leftWins = STATS.filter((s) => left.stats[s] > right.stats[s]).length
  const rightWins = STATS.filter((s) => right.stats[s] > left.stats[s]).length

  return (
    <section id="versus" className="versus">
      <h2 className="section-title">⚔️ Head-to-Head Battle</h2>
      <p className="section-sub">Pick any two AIs and watch them fight, stat by stat.</p>

      <div className="vs-arena">
        <div className="vs-header">
          <div className="vs-fighter">
            <div className="ai-logo" style={{ background: left.gradient }}>{left.monogram}</div>
            <Picker value={leftId} onChange={setLeftId} exclude={rightId} />
          </div>
          <span className="vs-badge">VS</span>
          <div className="vs-fighter">
            <div className="ai-logo" style={{ background: right.gradient }}>{right.monogram}</div>
            <Picker value={rightId} onChange={setRightId} exclude={leftId} />
          </div>
        </div>

        <div className="vs-stats">
          {STATS.map((s) => {
            const l = left.stats[s]
            const r = right.stats[s]
            return (
              <div key={s} className="vs-row">
                <span className={`vs-num ${l >= r ? 'win' : ''}`}>{l}</span>
                <div className="vs-bars">
                  <div className="vs-bar left"><div style={{ width: `${l}%`, background: left.gradient }} /></div>
                  <span className="vs-stat-label">{LABELS[s]}</span>
                  <div className="vs-bar right"><div style={{ width: `${r}%`, background: right.gradient }} /></div>
                </div>
                <span className={`vs-num ${r >= l ? 'win' : ''}`}>{r}</span>
              </div>
            )
          })}
        </div>

        <p className="vs-verdict">
          {leftWins === rightWins
            ? `🤝 It's a tie — both are elite. Try both free!`
            : `🏆 ${leftWins > rightWins ? left.name : right.name} takes this battle ${Math.max(leftWins, rightWins)}–${Math.min(leftWins, rightWins)}`}
        </p>

        <div className="vs-links">
          <a href={left.url} target="_blank" rel="noopener noreferrer" className="btn-visit" style={{ background: left.gradient }}>Try {left.name} →</a>
          <a href={right.url} target="_blank" rel="noopener noreferrer" className="btn-visit" style={{ background: right.gradient }}>Try {right.name} →</a>
        </div>
      </div>
    </section>
  )
}
