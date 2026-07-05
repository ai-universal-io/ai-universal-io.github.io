import { useState } from 'react'
import { QUIZ_QUESTIONS } from '../data/extras.js'
import { AI_TOOLS } from '../data/aiTools.js'

export default function Quiz() {
  const [step, setStep] = useState(-1) // -1 = intro, 0..n = questions, 'done'
  const [scores, setScores] = useState({})

  const answer = (points) => {
    const next = { ...scores }
    for (const [id, p] of Object.entries(points)) next[id] = (next[id] || 0) + p
    setScores(next)
    setStep(step + 1 < QUIZ_QUESTIONS.length ? step + 1 : 'done')
  }

  const restart = () => { setScores({}); setStep(-1) }

  const winner = () => {
    const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
    return AI_TOOLS.find((t) => t.id === top?.[0]) || AI_TOOLS[0]
  }

  const shareResult = (tool) => {
    const text = `I took the AI Universe quiz and my perfect AI is ${tool.name} 🤖✨ Find yours:`
    const url = window.location.href.split('#')[0] + '#quiz'
    if (navigator.share) {
      navigator.share({ title: 'My perfect AI', text, url }).catch(() => {})
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
    }
  }

  return (
    <section id="quiz" className="quiz">
      <h2 className="section-title">🎯 Find <span className="hero-gradient">your</span> perfect AI</h2>
      <p className="section-sub">Answer 4 quick questions — get a personal recommendation. Share your result!</p>

      <div className="quiz-box">
        {step === -1 && (
          <div className="quiz-intro">
            <p className="quiz-big">🤖</p>
            <p>10 AIs. 30 seconds. One perfect match.</p>
            <button type="button" className="btn-primary quiz-start" onClick={() => setStep(0)}>
              Start the quiz →
            </button>
          </div>
        )}

        {typeof step === 'number' && step >= 0 && (
          <div className="quiz-question" key={step}>
            <div className="quiz-progress">
              {QUIZ_QUESTIONS.map((_, i) => (
                <span key={i} className={`quiz-dot ${i <= step ? 'on' : ''}`} />
              ))}
            </div>
            <h3>{QUIZ_QUESTIONS[step].q}</h3>
            <div className="quiz-options">
              {QUIZ_QUESTIONS[step].options.map((o) => (
                <button key={o.label} type="button" className="quiz-option" onClick={() => answer(o.points)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'done' && (() => {
          const tool = winner()
          return (
            <div className="quiz-result">
              <p className="quiz-result-label">Your perfect AI is…</p>
              <div className="quiz-winner-logo" style={{ background: tool.gradient }}>{tool.monogram}</div>
              <h3 className="quiz-winner-name">{tool.name}</h3>
              <p className="quiz-winner-tag">“{tool.tagline}”</p>
              <div className="quiz-result-actions">
                <a className="btn-visit" style={{ background: tool.gradient, flex: 'none', padding: '0.8rem 1.6rem' }}
                   href={tool.url} target="_blank" rel="noopener noreferrer">
                  Try {tool.name} →
                </a>
                <button type="button" className="btn-ghost quiz-share" onClick={() => shareResult(tool)}>
                  📤 Share result
                </button>
                <button type="button" className="btn-more" onClick={restart}>↺ Retake</button>
              </div>
            </div>
          )
        })()}
      </div>
    </section>
  )
}
