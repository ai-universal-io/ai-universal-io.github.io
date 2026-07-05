import { useRef } from 'react'

// Wraps children in a 3D perspective tilt that follows the cursor,
// with a moving glare highlight. Falls back gracefully on touch devices.
export default function TiltCard({ children, className = '', accent = '#6c8cff' }) {
  const ref = useRef(null)

  const onMove = (e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const rx = (0.5 - py) * 14
    const ry = (px - 0.5) * 14
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0) scale(1.02)`
    el.style.setProperty('--glare-x', `${px * 100}%`)
    el.style.setProperty('--glare-y', `${py * 100}%`)
    el.style.setProperty('--glare-o', '1')
  }

  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)'
    el.style.setProperty('--glare-o', '0')
  }

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      style={{ '--accent': accent }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="tilt-glare" aria-hidden="true" />
      {children}
    </div>
  )
}
