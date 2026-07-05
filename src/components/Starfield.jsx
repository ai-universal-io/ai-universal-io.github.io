import { useEffect, useRef } from 'react'

// Animated canvas starfield with subtle parallax drift
export default function Starfield() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf
    let stars = []
    const DPR = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      canvas.width = window.innerWidth * DPR
      canvas.height = window.innerHeight * DPR
      stars = Array.from({ length: Math.min(220, window.innerWidth / 6) }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.4 * DPR + 0.3,
        speed: Math.random() * 0.15 + 0.03,
        tw: Math.random() * Math.PI * 2,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const s of stars) {
        s.tw += 0.02
        s.y -= s.speed * DPR
        if (s.y < -5) { s.y = canvas.height + 5; s.x = Math.random() * canvas.width }
        const alpha = 0.35 + Math.sin(s.tw) * 0.3
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(180, 200, 255, ${alpha})`
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />
}
