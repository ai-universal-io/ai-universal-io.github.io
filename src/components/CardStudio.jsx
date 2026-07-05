import { useMemo, useRef, useState } from 'react'
import { AI_TOOLS } from '../data/aiTools.js'

const COLLECT_KEY = 'ai-universe-cards'
const NAME_KEY = 'ai-universe-holder'

const RARITY = [
  { min: 97, label: 'LEGENDARY', color: '#ffd75e' },
  { min: 94, label: 'EPIC', color: '#c77dff' },
  { min: 90, label: 'RARE', color: '#7dd8ff' },
  { min: 0, label: 'CLASSIC', color: '#aab4cc' },
]

const rarityOf = (tool) => {
  const top = Math.max(...Object.values(tool.stats))
  return RARITY.find((r) => top >= r.min)
}

const colorsOf = (tool) => {
  const hex = tool.gradient.match(/#[0-9a-fA-F]{6}/g) || ['#5b76ff', '#a34dff']
  return [hex[0], hex[hex.length - 1]]
}

const cardNumber = (tool) => {
  const idx = AI_TOOLS.findIndex((t) => t.id === tool.id) + 1
  return `42AI 2026 ${String(idx).padStart(4, '0')} ${tool.id.slice(0, 4).toUpperCase()}`
}

const loadCollected = () => {
  try { return JSON.parse(localStorage.getItem(COLLECT_KEY) || '[]') } catch { return [] }
}

// ---- Canvas PNG renderer (1280x800, share-ready) ----
function renderCardPNG(tool, holder) {
  const W = 1280, H = 800, R = 56
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const [c1, c2] = colorsOf(tool)
  const rarity = rarityOf(tool)

  ctx.beginPath()
  ctx.roundRect(0, 0, W, H, R)
  ctx.clip()

  // Base gradient
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, c1)
  g.addColorStop(1, c2)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // Dark vignette for text contrast
  const v = ctx.createLinearGradient(0, 0, 0, H)
  v.addColorStop(0, 'rgba(0,0,0,0.18)')
  v.addColorStop(0.5, 'rgba(0,0,0,0.34)')
  v.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, W, H)

  // Giant watermark monogram
  ctx.save()
  ctx.globalAlpha = 0.12
  ctx.font = '900 620px "Segoe UI", Arial, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'right'
  ctx.fillText(tool.monogram, W + 60, H - 70)
  ctx.restore()

  // Holo sheen stripes
  ctx.save()
  ctx.globalAlpha = 0.1
  for (let i = -2; i < 8; i++) {
    const x = i * 260
    const sg = ctx.createLinearGradient(x, 0, x + 130, H)
    sg.addColorStop(0, 'transparent')
    sg.addColorStop(0.5, '#ffffff')
    sg.addColorStop(1, 'transparent')
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.moveTo(x, H); ctx.lineTo(x + 320, 0); ctx.lineTo(x + 400, 0); ctx.lineTo(x + 80, H)
    ctx.fill()
  }
  ctx.restore()

  // Brand top-left
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = '700 40px "Segoe UI", Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('AI UNIVERSE ✦', 72, 104)

  // Rarity badge top-right
  ctx.textAlign = 'right'
  ctx.font = '800 34px "Segoe UI", Arial, sans-serif'
  ctx.fillStyle = rarity.color
  ctx.fillText(`◈ ${rarity.label}`, W - 72, 104)

  // Site URL watermark (every shared card advertises the site)
  ctx.textAlign = 'center'
  ctx.font = '600 26px "Segoe UI", Arial, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillText(window.location.host || 'ai-universe.app', W / 2, 104)

  // Chip
  const chipX = 72, chipY = 210, chipW = 130, chipH = 96
  const cg = ctx.createLinearGradient(chipX, chipY, chipX + chipW, chipY + chipH)
  cg.addColorStop(0, '#f3d47a')
  cg.addColorStop(1, '#c9982f')
  ctx.fillStyle = cg
  ctx.beginPath()
  ctx.roundRect(chipX, chipY, chipW, chipH, 18)
  ctx.fill()
  ctx.strokeStyle = 'rgba(80,60,10,0.55)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(chipX, chipY + chipH / 2); ctx.lineTo(chipX + chipW, chipY + chipH / 2)
  ctx.moveTo(chipX + chipW / 2, chipY); ctx.lineTo(chipX + chipW / 2, chipY + chipH)
  ctx.stroke()

  // Contactless arcs
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  for (let r = 18; r <= 54; r += 18) {
    ctx.beginPath()
    ctx.arc(chipX + chipW + 60, chipY + chipH / 2, r, -Math.PI / 4, Math.PI / 4)
    ctx.stroke()
  }

  // Card number
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 74px Consolas, "Courier New", monospace'
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 12
  ctx.fillText(cardNumber(tool), 72, 470)
  ctx.shadowBlur = 0

  // Stats strip
  const s = tool.stats
  ctx.font = '600 30px Consolas, "Courier New", monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText(`RSN ${s.reasoning}  ·  COD ${s.coding}  ·  CRE ${s.creativity}  ·  SPD ${s.speed}`, 72, 540)

  // Holder name + member since
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = '600 26px "Segoe UI", Arial, sans-serif'
  ctx.fillText('CARD HOLDER', 72, 656)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 52px "Segoe UI", Arial, sans-serif'
  ctx.fillText((holder || 'AI EXPLORER').toUpperCase().slice(0, 22), 72, 716)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = '600 24px "Segoe UI", Arial, sans-serif'
  ctx.fillText('MEMBER SINCE 2026', 72, 756)

  // Tool identity bottom-right
  ctx.textAlign = 'right'
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 58px "Segoe UI", Arial, sans-serif'
  ctx.fillText(tool.name, W - 72, 716)
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.font = '600 28px "Segoe UI", Arial, sans-serif'
  ctx.fillText(`by ${tool.company}`, W - 72, 756)

  return canvas
}

export default function CardStudio() {
  const [toolId, setToolId] = useState('claude')
  const [holder, setHolder] = useState(() => localStorage.getItem(NAME_KEY) || '')
  const [collected, setCollected] = useState(loadCollected)
  const [flash, setFlash] = useState('')
  const cardRef = useRef(null)

  const tool = AI_TOOLS.find((t) => t.id === toolId)
  const rarity = useMemo(() => rarityOf(tool), [tool])
  const [c1, c2] = useMemo(() => colorsOf(tool), [tool])

  const saveName = (v) => {
    setHolder(v)
    try { localStorage.setItem(NAME_KEY, v) } catch { /* ignore */ }
  }

  const markCollected = (id) => {
    if (collected.includes(id)) return
    const next = [...collected, id]
    setCollected(next)
    try { localStorage.setItem(COLLECT_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  const download = () => {
    const canvas = renderCardPNG(tool, holder)
    canvas.toBlob((blob) => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${tool.id}-ai-card.png`
      a.click()
      URL.revokeObjectURL(a.href)
    })
    markCollected(tool.id)
    setFlash('✓ Card saved! Post it on your status 🔥')
    setTimeout(() => setFlash(''), 2600)
  }

  const shareCard = async () => {
    const canvas = renderCardPNG(tool, holder)
    canvas.toBlob(async (blob) => {
      const file = new File([blob], `${tool.id}-ai-card.png`, { type: 'image/png' })
      const url = window.location.href.split('#')[0] + '#cards'
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `My ${tool.name} card`, text: `My official ${tool.name} AI card 💳✨ Get yours free:` })
          markCollected(tool.id)
          return
        } catch { /* user cancelled */ }
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(`My official ${tool.name} AI card 💳✨ Get yours free: ${url}`)}`, '_blank')
        markCollected(tool.id)
      }
    })
  }

  const onMove = (e) => {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.transform = `perspective(1100px) rotateX(${(0.5 - py) * 16}deg) rotateY(${(px - 0.5) * 20}deg)`
    el.style.setProperty('--hx', `${px * 100}%`)
  }
  const onLeave = () => {
    const el = cardRef.current
    if (el) el.style.transform = 'perspective(1100px) rotateX(0) rotateY(0)'
  }

  return (
    <section id="cards" className="cardstudio">
      <h2 className="section-title">💳 Get your <span className="hero-gradient">AI Card</span></h2>
      <p className="section-sub">
        Your official card for your favourite AI — with your name on it. Download it, flex it on
        WhatsApp status & Instagram. <strong>Collect all {AI_TOOLS.length}!</strong>
      </p>

      <div className="cs-layout">
        {/* Live 3D preview */}
        <div className="cs-preview" onMouseMove={onMove} onMouseLeave={onLeave}>
          <div
            ref={cardRef}
            className="cc-card"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
          >
            <div className="cc-holo" aria-hidden="true" />
            <div className="cc-watermark" aria-hidden="true">{tool.monogram}</div>
            <div className="cc-row">
              <span className="cc-brand">AI UNIVERSE ✦</span>
              <span className="cc-rarity" style={{ color: rarity.color }}>◈ {rarity.label}</span>
            </div>
            <div className="cc-chip-row">
              <span className="cc-chip" />
              <svg className="cc-nfc" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                <path d="M6 8a8 8 0 0 1 0 8M10 6a11 11 0 0 1 0 12M14 4a14 14 0 0 1 0 16" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <p className="cc-number">{cardNumber(tool)}</p>
            <p className="cc-stats">RSN {tool.stats.reasoning} · COD {tool.stats.coding} · CRE {tool.stats.creativity} · SPD {tool.stats.speed}</p>
            <div className="cc-row cc-foot">
              <div>
                <p className="cc-label">CARD HOLDER</p>
                <p className="cc-holder">{(holder || 'AI EXPLORER').toUpperCase().slice(0, 22)}</p>
                <p className="cc-label">MEMBER SINCE 2026</p>
              </div>
              <div className="cc-id">
                <p className="cc-toolname">{tool.name}</p>
                <p className="cc-label">by {tool.company}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="cs-controls">
          <label className="cs-field">
            <span>Your name on the card</span>
            <input
              type="text"
              maxLength={22}
              placeholder="e.g. Rahul Dubey"
              value={holder}
              onChange={(e) => saveName(e.target.value)}
            />
          </label>

          <label className="cs-field">
            <span>Pick your AI</span>
            <div className="cs-tool-grid">
              {AI_TOOLS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`cs-tool ${t.id === toolId ? 'active' : ''} ${collected.includes(t.id) ? 'owned' : ''}`}
                  style={{ background: t.gradient }}
                  title={`${t.name}${collected.includes(t.id) ? ' (collected ✓)' : ''}`}
                  onClick={() => setToolId(t.id)}
                >
                  {t.monogram}
                  {collected.includes(t.id) && <span className="cs-owned">✓</span>}
                </button>
              ))}
            </div>
          </label>

          <div className="cs-actions">
            <button type="button" className="btn-primary cs-btn" onClick={download}>⬇️ Download card (PNG)</button>
            <button type="button" className="btn-ghost cs-btn" onClick={shareCard}>📤 Share to status</button>
          </div>
          {flash && <p className="cs-flash">{flash}</p>}

          <div className="cs-collection">
            <p>
              🃏 Collection: <strong>{collected.length}/{AI_TOOLS.length}</strong>
              {collected.length === AI_TOOLS.length ? ' — 👑 FULL DECK! You are an AI Master!' : ' — collect them all!'}
            </p>
            <div className="cs-progress">
              <span style={{ width: `${(collected.length / AI_TOOLS.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
