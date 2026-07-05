import { COMPARISON_ROWS } from '../data/aiTools.js'

export default function CompareSection() {
  return (
    <section id="compare" className="compare">
      <h2 className="section-title">🏆 Which AI wins at what?</h2>
      <p className="section-sub">A quick cheat-sheet for picking the right tool for the job.</p>
      <div className="compare-grid">
        {COMPARISON_ROWS.map((row) => (
          <div key={row.label} className="compare-card">
            <p className="compare-label">{row.label}</p>
            <p className="compare-winner">{row.winner}</p>
            <p className="compare-detail">{row.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
