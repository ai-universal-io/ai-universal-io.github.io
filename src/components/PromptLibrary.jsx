import { useState } from 'react'
import { PROMPT_LIBRARY } from '../data/extras.js'

export default function PromptLibrary() {
  const [copied, setCopied] = useState(null)
  const [active, setActive] = useState(PROMPT_LIBRARY[0].category)

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1600)
    } catch { /* clipboard unavailable */ }
  }

  const group = PROMPT_LIBRARY.find((g) => g.category === active)

  return (
    <section id="prompts" className="prompts">
      <h2 className="section-title">📚 Pro Prompt Library</h2>
      <p className="section-sub">Battle-tested prompts — click to copy, paste into any AI. Bookmark this page! 🔖</p>

      <div className="filters">
        {PROMPT_LIBRARY.map((g) => (
          <button
            key={g.category}
            type="button"
            className={`filter-btn ${active === g.category ? 'active' : ''}`}
            onClick={() => setActive(g.category)}
          >
            {g.category}
          </button>
        ))}
      </div>

      <div className="prompt-grid">
        {group.prompts.map((p) => {
          const key = `${group.category}-${p.title}`
          return (
            <button type="button" key={key} className="prompt-card" onClick={() => copy(p.text, key)}>
              <div className="prompt-head">
                <h4>{p.title}</h4>
                <span className={`prompt-copy ${copied === key ? 'ok' : ''}`}>
                  {copied === key ? '✓ Copied!' : '📋 Copy'}
                </span>
              </div>
              <p className="prompt-text">{p.text}</p>
              <p className="prompt-best">Best with: {p.bestWith}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
