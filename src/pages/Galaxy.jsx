import { useEffect, useRef, useState } from 'react'
import { AI_TOOLS } from '../data/aiTools.js'

/*
 * 3D AI GALAXY — a from-scratch 3D engine on a 2D canvas. No libraries.
 * Rotation matrices + perspective projection + depth sorting + orbital
 * mechanics + camera fly-to animation + hit-testing, all hand-rolled.
 */

const colorsOf = (tool) => {
  const hex = tool.gradient.match(/#[0-9a-fA-F]{6}/g) || ['#5b76ff', '#a34dff']
  return [hex[0], hex[hex.length - 1]]
}

// ---- Voice/text advisor: intent → tool scoring (rule-based NLU) ----
const INTENTS = [
  { words: ['code', 'coding', 'program', 'developer', 'debug', 'app', 'website', 'software'], points: { claude: 3, copilot: 3, deepseek: 2, chatgpt: 1 }, topic: 'coding' },
  { words: ['image', 'photo', 'picture', 'art', 'design', 'logo', 'draw'], points: { midjourney: 3, gemini: 1, grok: 1 }, topic: 'images' },
  { words: ['video'], points: { gemini: 3, midjourney: 1 }, topic: 'video' },
  { words: ['research', 'search', 'source', 'citation', 'fact', 'news', 'current', 'latest', 'today'], points: { perplexity: 3, grok: 2, gemini: 1 }, topic: 'research' },
  { words: ['free', 'cheap', 'budget', 'cost', 'paise', 'sasta'], points: { deepseek: 3, llama: 3, gemini: 1 }, topic: 'a free option' },
  { words: ['write', 'writing', 'email', 'essay', 'content', 'blog', 'letter'], points: { chatgpt: 3, claude: 2, gemini: 1 }, topic: 'writing' },
  { words: ['fast', 'speed', 'quick'], points: { mistral: 3, gemini: 1 }, topic: 'speed' },
  { words: ['open source', 'privacy', 'private', 'self host', 'local'], points: { llama: 3, deepseek: 2, mistral: 2 }, topic: 'open source & privacy' },
  { words: ['google', 'gmail', 'docs', 'android', 'youtube'], points: { gemini: 3 }, topic: 'the Google ecosystem' },
  { words: ['whatsapp', 'instagram', 'messenger'], points: { llama: 3 }, topic: 'social apps' },
  { words: ['study', 'learn', 'exam', 'student', 'homework'], points: { chatgpt: 2, gemini: 2, claude: 1 }, topic: 'studying' },
  { words: ['twitter', ' x ', 'trend', 'meme'], points: { grok: 3 }, topic: 'real-time trends' },
]

function adviseFor(queryRaw) {
  const q = ` ${queryRaw.toLowerCase()} `
  // Direct tool-name match wins
  for (const t of AI_TOOLS) {
    if (q.includes(t.name.toLowerCase()) || q.includes(t.id)) {
      return { tool: t, text: `${t.name}, by ${t.company} — ${t.tagline}. Best for: ${t.bestFor.slice(0, 3).join(', ')}. Flying you there now!` }
    }
  }
  const scores = {}
  const topics = []
  for (const intent of INTENTS) {
    if (intent.words.some((w) => q.includes(w))) {
      topics.push(intent.topic)
      for (const [id, p] of Object.entries(intent.points)) scores[id] = (scores[id] || 0) + p
    }
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
  if (!ranked.length) {
    return { tool: null, text: 'Try asking things like: "best AI for coding", "which AI is free", or "show me Claude".' }
  }
  const tool = AI_TOOLS.find((t) => t.id === ranked[0][0])
  const runnerUp = ranked[1] ? AI_TOOLS.find((t) => t.id === ranked[1][0]) : null
  return {
    tool,
    text: `For ${topics.join(' and ')}, I recommend ${tool.name} — ${tool.tagline}.${runnerUp ? ` Also worth a look: ${runnerUp.name}.` : ''} Taking you to its planet!`,
  }
}

export default function Galaxy() {
  const canvasRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [hoverName, setHoverName] = useState('')
  const [listening, setListening] = useState(false)
  const [log, setLog] = useState([{ who: 'ai', text: 'Namaste! 🪐 Drag to explore, click a planet, or ask me anything — “best AI for coding?”' }])
  const [typed, setTyped] = useState('')
  const engineRef = useRef({})

  // ---------- Advisor ----------
  const runQuery = (q) => {
    if (!q.trim()) return
    setLog((l) => [...l.slice(-6), { who: 'you', text: q }])
    const { tool, text } = adviseFor(q)
    setLog((l) => [...l.slice(-6), { who: 'ai', text }])
    try {
      window.speechSynthesis?.cancel()
      const u = new SpeechSynthesisUtterance(text.replace(/[—“”]/g, ''))
      u.rate = 1.05
      window.speechSynthesis?.speak(u)
    } catch { /* no TTS */ }
    if (tool) setSelected(tool)
  }

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setLog((l) => [...l, { who: 'ai', text: 'Voice not supported in this browser — type your question below instead!' }])
      return
    }
    const rec = new SR()
    rec.lang = 'en-IN'
    rec.interimResults = false
    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.onresult = (e) => runQuery(e.results[0][0].transcript)
    rec.start()
  }

  // ---------- 3D engine ----------
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    let W = 0, H = 0, raf = 0, last = performance.now()

    const st = engineRef.current
    Object.assign(st, {
      yaw: 0.6, pitch: 0.35, zoom: 1, time: 0,
      tYaw: 0.6, tPitch: 0.35, tZoom: 1,
      dragging: false, moved: 0, lastX: 0, lastY: 0,
      paused: false, selectedId: null, hover: null,
    })

    const planets = AI_TOOLS.map((tool, i) => ({
      tool,
      colors: colorsOf(tool),
      orbit: 170 + i * 52,
      speed: 0.22 / Math.sqrt(1 + i * 0.7),
      theta0: i * 2.4,
      incl: (i % 2 ? 1 : -1) * (0.06 + (i % 3) * 0.05),
      size: 13 + Math.max(...Object.values(tool.stats)) / 12,
      proj: null,
    }))

    const stars = Array.from({ length: 350 }, () => {
      const r = 1400 + Math.random() * 1400
      const a = Math.random() * Math.PI * 2
      const b = Math.acos(2 * Math.random() - 1)
      return { x: r * Math.sin(b) * Math.cos(a), y: r * Math.cos(b) * 0.6, z: r * Math.sin(b) * Math.sin(a), s: Math.random() * 1.5 + 0.4 }
    })

    const FOV = 900

    const project = (x, y, z) => {
      // rotate around Y (yaw) then X (pitch), then perspective divide
      const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw)
      const cx = Math.cos(st.pitch), sx = Math.sin(st.pitch)
      const x1 = x * cy - z * sy
      const z1 = x * sy + z * cy
      const y1 = y * cx - z1 * sx
      const z2 = y * sx + z1 * cx
      const depth = z2 + 1500 / st.zoom
      if (depth < 60) return null
      const s = FOV / depth
      return { x: W / 2 + x1 * s, y: H / 2 + y1 * s, s, depth }
    }

    const planetPos = (p, time) => {
      const th = p.theta0 + time * p.speed
      const x = p.orbit * Math.cos(th)
      const z = p.orbit * Math.sin(th)
      const y = Math.sin(th * 2) * p.orbit * p.incl
      return { x, y, z, th }
    }

    const resize = () => {
      W = canvas.clientWidth
      H = canvas.clientHeight
      canvas.width = W * DPR
      canvas.height = H * DPR
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }

    const draw = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!st.paused) st.time += dt

      // smooth camera
      st.yaw += (st.tYaw - st.yaw) * 0.08
      st.pitch += (st.tPitch - st.pitch) * 0.08
      st.zoom += (st.tZoom - st.zoom) * 0.08

      ctx.clearRect(0, 0, W, H)

      // stars
      ctx.fillStyle = '#ffffff'
      for (const s of stars) {
        const pr = project(s.x, s.y, s.z)
        if (!pr) continue
        ctx.globalAlpha = Math.min(0.9, pr.s * 1.6)
        ctx.fillRect(pr.x, pr.y, s.s, s.s)
      }
      ctx.globalAlpha = 1

      // orbit rings
      ctx.lineWidth = 1
      for (const p of planets) {
        ctx.beginPath()
        let started = false
        for (let a = 0; a <= 64; a++) {
          const th = (a / 64) * Math.PI * 2
          const pos = { x: p.orbit * Math.cos(th), y: Math.sin(th * 2) * p.orbit * p.incl, z: p.orbit * Math.sin(th) }
          const pr = project(pos.x, pos.y, pos.z)
          if (!pr) { started = false; continue }
          if (!started) { ctx.moveTo(pr.x, pr.y); started = true } else ctx.lineTo(pr.x, pr.y)
        }
        ctx.strokeStyle = st.selectedId === p.tool.id ? 'rgba(255,255,255,0.28)' : 'rgba(140,160,255,0.1)'
        ctx.stroke()
      }

      // sun (AI core)
      const sun = project(0, 0, 0)
      if (sun) {
        const r = 34 * sun.s * 1.6
        const g = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, r * 3)
        g.addColorStop(0, 'rgba(255,240,200,0.95)')
        g.addColorStop(0.25, 'rgba(255,180,120,0.5)')
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath(); ctx.arc(sun.x, sun.y, r * 3, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#fff2d8'
        ctx.beginPath(); ctx.arc(sun.x, sun.y, r * 0.55, 0, Math.PI * 2); ctx.fill()
      }

      // planets — depth sorted (far first)
      const drawn = []
      for (const p of planets) {
        const pos = planetPos(p, st.time)
        const pr = project(pos.x, pos.y, pos.z)
        p.proj = pr
        if (pr) drawn.push(p)
      }
      drawn.sort((a, b) => b.proj.depth - a.proj.depth)

      for (const p of drawn) {
        const { x, y, s } = p.proj
        const r = p.size * s * st.zoom
        const [c1, c2] = p.colors
        const isSel = st.selectedId === p.tool.id
        const isHov = st.hover === p.tool.id

        // selection / hover ring
        if (isSel || isHov) {
          ctx.beginPath()
          ctx.arc(x, y, r + 7 + (isSel ? Math.sin(now / 260) * 2.5 : 0), 0, Math.PI * 2)
          ctx.strokeStyle = isSel ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)'
          ctx.lineWidth = 2
          ctx.stroke()
        }

        // planet body with day/night shading
        const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r)
        g.addColorStop(0, c1)
        g.addColorStop(0.75, c2)
        g.addColorStop(1, 'rgba(0,0,10,0.9)')
        ctx.fillStyle = g
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()

        // atmosphere glow
        ctx.beginPath(); ctx.arc(x, y, r * 1.25, 0, Math.PI * 2)
        const ag = ctx.createRadialGradient(x, y, r, x, y, r * 1.25)
        ag.addColorStop(0, `${c1}44`)
        ag.addColorStop(1, 'transparent')
        ctx.fillStyle = ag
        ctx.fill()

        // monogram + label
        if (r > 9) {
          ctx.fillStyle = 'rgba(255,255,255,0.92)'
          ctx.font = `800 ${Math.max(10, r * 0.7)}px "Segoe UI", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(p.tool.monogram, x, y + 1)
        }
        if (r > 7 || isSel || isHov) {
          ctx.font = '600 12px "Segoe UI", sans-serif'
          ctx.fillStyle = isSel || isHov ? '#fff' : 'rgba(210,220,255,0.75)'
          ctx.textBaseline = 'alphabetic'
          ctx.fillText(p.tool.name, x, y + r + 18)
        }
      }

      raf = requestAnimationFrame(draw)
    }

    // ---------- interaction ----------
    const hitTest = (mx, my) => {
      let best = null
      for (const p of planets) {
        if (!p.proj) continue
        const r = Math.max(14, p.size * p.proj.s * st.zoom + 8)
        const d = Math.hypot(p.proj.x - mx, p.proj.y - my)
        if (d < r && (!best || p.proj.depth < best.proj.depth)) best = p
      }
      return best
    }

    const onDown = (e) => {
      st.dragging = true
      st.moved = 0
      st.lastX = e.clientX
      st.lastY = e.clientY
      canvas.setPointerCapture?.(e.pointerId)
    }
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      if (st.dragging) {
        const dx = e.clientX - st.lastX
        const dy = e.clientY - st.lastY
        st.moved += Math.abs(dx) + Math.abs(dy)
        st.tYaw += dx * 0.005
        st.tPitch = Math.max(-1.2, Math.min(1.2, st.tPitch + dy * 0.004))
        st.lastX = e.clientX
        st.lastY = e.clientY
      } else {
        const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top)
        st.hover = hit?.tool.id || null
        setHoverName(hit?.tool.name || '')
        canvas.style.cursor = hit ? 'pointer' : 'grab'
      }
    }
    const onUp = (e) => {
      st.dragging = false
      if (st.moved < 8) {
        const rect = canvas.getBoundingClientRect()
        const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top)
        setSelected(hit ? hit.tool : null)
      }
    }
    const onWheel = (e) => {
      e.preventDefault()
      st.tZoom = Math.max(0.45, Math.min(3.2, st.tZoom * (e.deltaY > 0 ? 0.9 : 1.12)))
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', resize)

    resize()
    raf = requestAnimationFrame(draw)

    st.flyTo = (toolId) => {
      const p = planets.find((pl) => pl.tool.id === toolId)
      if (!p) return
      st.paused = true
      st.selectedId = toolId
      const { th } = planetPos(p, st.time)
      // camera yaw that brings this planet to the front of the view
      st.tYaw = -Math.PI / 2 - th
      st.tPitch = 0.18
      st.tZoom = 2.1
    }
    st.release = () => {
      st.paused = false
      st.selectedId = null
      st.tZoom = 1
      st.tPitch = 0.35
    }

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', resize)
      window.speechSynthesis?.cancel()
    }
  }, [])

  // camera reacts to selection
  useEffect(() => {
    const st = engineRef.current
    if (selected) st.flyTo?.(selected.id)
    else st.release?.()
  }, [selected])

  return (
    <div className="galaxy-page">
      <canvas ref={canvasRef} className="galaxy-canvas" />

      <header className="galaxy-top">
        <a href="#/" className="galaxy-back">← AI Universe</a>
        <span className="galaxy-title">🪐 The AI Galaxy</span>
        <span className="galaxy-hint">{hoverName ? `Click to visit ${hoverName}` : 'Drag to rotate · scroll to zoom · click a planet'}</span>
      </header>

      {/* Voice / text advisor */}
      <div className="advisor">
        <div className="advisor-log">
          {log.map((m, i) => (
            <p key={i} className={m.who}>{m.who === 'ai' ? '🤖 ' : '🧑 '}{m.text}</p>
          ))}
        </div>
        <form
          className="advisor-input"
          onSubmit={(e) => { e.preventDefault(); runQuery(typed); setTyped('') }}
        >
          <button type="button" className={`advisor-mic ${listening ? 'live' : ''}`} onClick={startVoice} title="Ask by voice">
            {listening ? '🔴' : '🎙️'}
          </button>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder='Ask: "best AI for coding?"'
            aria-label="Ask the AI advisor"
          />
          <button type="submit" className="advisor-send">➤</button>
        </form>
      </div>

      {/* Planet info panel */}
      {selected && (
        <aside className="planet-panel">
          <button type="button" className="planet-close" onClick={() => setSelected(null)}>✕</button>
          <div className="planet-head">
            <div className="ai-logo" style={{ background: selected.gradient }}>{selected.monogram}</div>
            <div>
              <h3>{selected.name}</h3>
              <p>{selected.company} · {selected.pricing}</p>
            </div>
          </div>
          <p className="planet-tag">“{selected.tagline}”</p>
          <ul className="chips">
            {selected.bestFor.slice(0, 4).map((u) => <li key={u} className="chip">{u}</li>)}
          </ul>
          <div className="planet-stats">
            {Object.entries(selected.stats).map(([k, v]) => (
              <div key={k} className="stat-row">
                <span className="stat-label">{k}</span>
                <div className="stat-track"><div className="stat-fill" style={{ width: `${v}%`, background: selected.gradient }} /></div>
                <span className="stat-value">{v}</span>
              </div>
            ))}
          </div>
          <div className="planet-actions">
            <a className="btn-visit" style={{ background: selected.gradient }} href={selected.url} target="_blank" rel="noopener noreferrer">
              Try {selected.name} →
            </a>
            <a className="btn-more" href="#cards">💳 Get its card</a>
          </div>
        </aside>
      )}
    </div>
  )
}
