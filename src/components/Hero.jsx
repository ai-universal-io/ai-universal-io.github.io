import { useEffect, useState } from 'react'
import Logo from './Logo.jsx'

const WORDS = ['write code', 'create art', 'do research', 'draft emails', 'analyze data', 'build apps']

export default function Hero() {
  const [i, setI] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % WORDS.length), 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="hero">
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />

      <div className="hero-logo"><Logo size={96} /></div>
      <p className="hero-badge">🌌 10 frontier AI tools · one galaxy</p>
      <h1 className="hero-title">
        AI <span className="hero-gradient">Universe</span>
      </h1>
      <p className="hero-sub">
        Discover the world’s best AI assistants, compare their models,
        <br className="hide-mobile" /> and find the perfect one to{' '}
        <span key={i} className="hero-rotate">{WORDS[i]}</span>
      </p>
      <div className="hero-cta">
        <a href="#explore" className="btn-primary">Explore the AIs ↓</a>
        <a href="#/lab" className="btn-ghost">🧪 Grade my prompt</a>
      </div>
    </section>
  )
}
