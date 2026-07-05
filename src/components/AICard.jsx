import TiltCard from './TiltCard.jsx'

function StatBar({ label, value, accent }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <div className="stat-track">
        <div className="stat-fill" style={{ width: `${value}%`, background: accent }} />
      </div>
      <span className="stat-value">{value}</span>
    </div>
  )
}

export default function AICard({ tool, expanded, onToggle, isFav, onFav }) {
  const share = () => {
    const text = `${tool.name} — ${tool.tagline}. Compare the best AIs:`
    const url = window.location.href.split('#')[0]
    if (navigator.share) {
      navigator.share({ title: tool.name, text, url }).catch(() => {})
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
    }
  }

  return (
    <TiltCard accent={tool.accent} className={expanded ? 'expanded' : ''}>
      <article className="ai-card">
        <header className="ai-card-head">
          <div className="ai-logo" style={{ background: tool.gradient }}>
            <span>{tool.monogram}</span>
          </div>
          <div>
            <h3>{tool.name}</h3>
            <p className="ai-company">by {tool.company}</p>
          </div>
          <span className="ai-pricing">{tool.pricing}</span>
          <button
            type="button"
            className={`fav-btn ${isFav ? 'on' : ''}`}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            title={isFav ? 'Remove favorite' : 'Save favorite'}
            onClick={onFav}
          >
            {isFav ? '★' : '☆'}
          </button>
        </header>

        <p className="ai-tagline">“{tool.tagline}”</p>
        <p className="ai-desc">{tool.description}</p>

        <div className="ai-section">
          <h4>✨ Best use cases</h4>
          <ul className="chips">
            {tool.bestFor.map((u) => (
              <li key={u} className="chip">{u}</li>
            ))}
          </ul>
        </div>

        <div className="ai-section">
          <h4>🧠 Models</h4>
          <ul className="model-list">
            {tool.models.map((m) => (
              <li key={m.name}>
                <strong style={{ color: tool.accent }}>{m.name}</strong>
                <span>{m.note}</span>
              </li>
            ))}
          </ul>
        </div>

        {expanded && (
          <div className="ai-section stats">
            <h4>📊 Power ratings</h4>
            <StatBar label="Reasoning" value={tool.stats.reasoning} accent={tool.gradient} />
            <StatBar label="Coding" value={tool.stats.coding} accent={tool.gradient} />
            <StatBar label="Creativity" value={tool.stats.creativity} accent={tool.gradient} />
            <StatBar label="Speed" value={tool.stats.speed} accent={tool.gradient} />
          </div>
        )}

        <footer className="ai-card-actions">
          <a
            className="btn-visit"
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: tool.gradient }}
          >
            Try {tool.name} →
          </a>
          <button type="button" className="btn-more" onClick={onToggle}>
            {expanded ? 'Less' : 'Stats'}
          </button>
          <button type="button" className="btn-more" onClick={share} aria-label={`Share ${tool.name}`} title="Share">
            📤
          </button>
        </footer>
      </article>
    </TiltCard>
  )
}
