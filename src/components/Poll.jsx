import { useState } from 'react'
import { AI_TOOLS } from '../data/aiTools.js'
import { POLL_SEED } from '../data/extras.js'

const VOTE_KEY = 'ai-universe-vote'
const COUNT_KEY = 'ai-universe-poll-counts'

function loadCounts() {
  try {
    const extra = JSON.parse(localStorage.getItem(COUNT_KEY) || '{}')
    const merged = { ...POLL_SEED }
    for (const [id, n] of Object.entries(extra)) merged[id] = (merged[id] || 0) + n
    return merged
  } catch {
    return { ...POLL_SEED }
  }
}

export default function Poll() {
  const [voted, setVoted] = useState(() => localStorage.getItem(VOTE_KEY))
  const [counts, setCounts] = useState(loadCounts)

  const vote = (id) => {
    if (voted) return
    try {
      const extra = JSON.parse(localStorage.getItem(COUNT_KEY) || '{}')
      extra[id] = (extra[id] || 0) + 1
      localStorage.setItem(COUNT_KEY, JSON.stringify(extra))
      localStorage.setItem(VOTE_KEY, id)
    } catch { /* private mode */ }
    setVoted(id)
    setCounts(loadCounts())
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const sorted = [...AI_TOOLS].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))

  return (
    <section id="poll" className="poll">
      <h2 className="section-title">🗳️ Community Poll</h2>
      <p className="section-sub">
        {voted ? `${total.toLocaleString()} votes — thanks for yours!` : 'Which AI do YOU use the most? Tap to vote.'}
      </p>

      <div className="poll-list">
        {sorted.map((t, i) => {
          const pct = Math.round(((counts[t.id] || 0) / total) * 100)
          return (
            <button
              key={t.id}
              type="button"
              className={`poll-row ${voted ? 'locked' : ''} ${voted === t.id ? 'mine' : ''}`}
              onClick={() => vote(t.id)}
              disabled={!!voted}
            >
              <span className="poll-rank">{i + 1}</span>
              <span className="poll-logo" style={{ background: t.gradient }}>{t.monogram}</span>
              <span className="poll-name">{t.name}{voted === t.id ? ' · your vote ✓' : ''}</span>
              {voted && (
                <>
                  <span className="poll-bar"><span style={{ width: `${pct}%`, background: t.gradient }} /></span>
                  <span className="poll-pct">{pct}%</span>
                </>
              )}
              {!voted && <span className="poll-cta">Vote</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
