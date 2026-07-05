import { useEffect, useMemo, useState } from 'react'
import Galaxy from './pages/Galaxy.jsx'
import PromptLab from './pages/PromptLab.jsx'
import DevTools from './pages/DevTools.jsx'
import SeoFaq from './components/SeoFaq.jsx'
import Logo from './components/Logo.jsx'

const ROUTE_META = {
  '#/lab': {
    title: 'Free Prompt Grader & Optimizer — Fix Your AI Prompts | AI Universe',
    desc: 'Grade any AI prompt across 8 dimensions, get an auto-fixed professional version, and see its API cost on GPT-4o, Claude, Gemini & more. Free, private, no signup.',
  },
  '#/dev': {
    title: 'Free AI Dev Tools: Token Counter, Diff Checker, API Code Generator | AI Universe',
    desc: 'Free browser-based developer tools: token & cost counter, real-time diff checker, JSON validator, and API code generator for OpenAI, Anthropic, Gemini, DeepSeek & Mistral.',
  },
  '#/galaxy': {
    title: '3D AI Galaxy — Explore AI Tools in Space | AI Universe',
    desc: 'Fly through an interactive 3D galaxy where every planet is an AI tool. Voice-controlled AI advisor included.',
  },
  default: {
    title: 'AI Universe — Compare AI Tools, Grade Prompts, Free AI Dev Tools (2026)',
    desc: 'Compare ChatGPT, Claude, Gemini & 10 top AI tools. Free prompt grader, API cost calculator, diff checker, token counter — 100% free, private, no signup.',
  },
}
import Starfield from './components/Starfield.jsx'
import Hero from './components/Hero.jsx'
import AICard from './components/AICard.jsx'
import CompareSection from './components/CompareSection.jsx'
import Quiz from './components/Quiz.jsx'
import VersusTool from './components/VersusTool.jsx'
import PromptLibrary from './components/PromptLibrary.jsx'
import Poll from './components/Poll.jsx'
import Newsletter from './components/Newsletter.jsx'
import BackToTop from './components/BackToTop.jsx'
import Reveal from './components/Reveal.jsx'
import CardStudio from './components/CardStudio.jsx'
import ProSection from './components/ProSection.jsx'
import DailyTip from './components/DailyTip.jsx'
import { AI_TOOLS, CATEGORIES } from './data/aiTools.js'

const FAV_KEY = 'ai-universe-favs'

const NAV_LINKS = [
  { href: '#explore', icon: '🤖', label: 'Explore AIs' },
  { href: '#/lab', icon: '🧪', label: 'Prompt Lab', hot: true },
  { href: '#/dev', icon: '🛠️', label: 'Dev Tools' },
  { href: '#quiz', icon: '🎯', label: 'Quiz' },
  { href: '#versus', icon: '⚔️', label: 'Battle' },
  { href: '#cards', icon: '💳', label: 'AI Cards', hot: true },
  { href: '#prompts', icon: '📚', label: 'Prompts' },
  { href: '#pro', icon: '💎', label: 'Pro' },
]

function loadFavs() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') } catch { return [] }
}

export default function App() {
  const [route, setRoute] = useState(window.location.hash)
  const [menuOpen, setMenuOpen] = useState(false)
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [favs, setFavs] = useState(loadFavs)
  const [favsOnly, setFavsOnly] = useState(false)

  const toggleFav = (id) => {
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id]
    setFavs(next)
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  useEffect(() => {
    const onHash = () => { setRoute(window.location.hash); setMenuOpen(false) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // lock page scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  // per-route <title> + meta description for search engines & link previews
  useEffect(() => {
    const key = Object.keys(ROUTE_META).find((k) => k !== 'default' && route.startsWith(k))
    const meta = ROUTE_META[key] || ROUTE_META.default
    document.title = meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.desc)
  }, [route])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return AI_TOOLS.filter((t) => {
      if (favsOnly && !favs.includes(t.id)) return false
      if (category !== 'All' && !t.categories.includes(category)) return false
      if (!q) return true
      const hay = `${t.name} ${t.company} ${t.tagline} ${t.description} ${t.bestFor.join(' ')} ${t.models.map((m) => m.name).join(' ')}`.toLowerCase()
      return hay.includes(q)
    })
  }, [category, query, favsOnly, favs])

  if (route.startsWith('#/galaxy')) return <Galaxy />
  if (route.startsWith('#/lab')) return <PromptLab />
  if (route.startsWith('#/dev')) return <DevTools />

  return (
    <div className="app">
      <Starfield />

      <nav className="navbar">
        <a href="#/" className="nav-logo" aria-label="AI Universe home">
          <Logo size={30} withWordmark />
        </a>
        <div className="nav-links">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className={l.hot ? 'nav-hot' : ''}>
              {l.hot ? `${l.icon} ` : ''}{l.label}
            </a>
          ))}
        </div>
        <button
          type="button"
          className={`nav-burger ${menuOpen ? 'open' : ''}`}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span /><span /><span />
        </button>
      </nav>

      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu-panel" onClick={(e) => e.stopPropagation()}>
            <p className="mm-title"><Logo size={26} withWordmark /></p>
            {NAV_LINKS.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                className={`mm-link ${l.hot ? 'hot' : ''}`}
                style={{ animationDelay: `${0.05 + i * 0.045}s` }}
                onClick={() => setMenuOpen(false)}
              >
                <span className="mm-icon">{l.icon}</span>
                <span className="mm-label">{l.label}</span>
                <span className="mm-arrow">›</span>
              </a>
            ))}
            <p className="mm-foot">Free · Private · No signup</p>
          </div>
        </div>
      )}

      <Hero />
      <DailyTip />

      <main id="explore" className="explore">
        <h2 className="section-title">🤖 Meet the AIs</h2>
        <p className="section-sub">Hover a card for the 3D effect · ★ to save favorites · click “Try” to open the tool.</p>

        <div className="toolbar">
          <input
            type="search"
            className="search-input"
            placeholder="🔍 Search AIs, models, use cases…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search AI tools"
          />
          <button
            type="button"
            className={`filter-btn favs-toggle ${favsOnly ? 'active' : ''}`}
            onClick={() => setFavsOnly(!favsOnly)}
          >
            ★ Favorites{favs.length ? ` (${favs.length})` : ''}
          </button>
        </div>

        <div className="filters" role="tablist" aria-label="Filter by category">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              className={`filter-btn ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="empty-state">
            {favsOnly ? 'No favorites yet — tap ★ on any card to save it here.' : `No AI matches “${query}”. Try another term.`}
          </p>
        ) : (
          <div className="card-grid">
            {visible.map((tool) => (
              <AICard
                key={tool.id}
                tool={tool}
                expanded={expandedId === tool.id}
                onToggle={() => setExpandedId(expandedId === tool.id ? null : tool.id)}
                isFav={favs.includes(tool.id)}
                onFav={() => toggleFav(tool.id)}
              />
            ))}
          </div>
        )}
      </main>

      <Reveal><Quiz /></Reveal>
      <Reveal><CardStudio /></Reveal>
      <Reveal><VersusTool /></Reveal>
      <Reveal><PromptLibrary /></Reveal>
      <Reveal><CompareSection /></Reveal>
      <Reveal><Poll /></Reveal>
      <Reveal><ProSection /></Reveal>
      <div id="newsletter-anchor" />
      <Reveal><Newsletter /></Reveal>
      <SeoFaq />

      <footer className="footer">
        <nav className="footer-links" aria-label="Site sections">
          <a href="#explore">Compare AI tools</a>
          <a href="#/lab">Prompt grader</a>
          <a href="#/dev">Token counter</a>
          <a href="#/dev">Diff checker</a>
          <a href="#/dev">API code generator</a>
          <a href="#cards">AI cards</a>
          <a href="#quiz">AI quiz</a>
          <a href="#faq">FAQ</a>
        </nav>
        <p>Built with ⚛️ React · All trademarks belong to their respective owners.</p>
        <p className="footer-dim">Ratings are editorial impressions, not official benchmarks.</p>
      </footer>

      <BackToTop />
    </div>
  )
}
