import { useId } from 'react'

/*
 * AI Universe brand mark — "The Ascent":
 * a bold letter A (AI / a peak reaching upward) woven through an orbit
 * ring that passes behind one leg and in front of the other, with a
 * star above the apex. Abstract, ownable, legible at 16px, and it
 * survives in a single color. Pure SVG, no assets.
 */
export default function Logo({ size = 28, withWordmark = false, className = '' }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const g = `brand-${uid}`

  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="AI Universe logo"
      className="logo-mark"
    >
      <defs>
        <linearGradient id={g} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ff6bcb" />
          <stop offset="0.5" stopColor="#a34dff" />
          <stop offset="1" stopColor="#6c8cff" />
        </linearGradient>
      </defs>

      {/* orbit — back half, behind the A */}
      <g transform="rotate(-16 32 39)">
        <path d="M10 39 A 22 8 0 0 1 54 39" stroke={`url(#${g})`} strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      </g>

      {/* the A — a single stroke peak */}
      <path
        d="M15 53 L32 16 L49 53"
        stroke={`url(#${g})`}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* orbit — front half, weaving over the legs */}
      <g transform="rotate(-16 32 39)">
        <path d="M10 39 A 22 8 0 0 0 54 39" stroke={`url(#${g})`} strokeWidth="3" strokeLinecap="round" />
        <circle cx="49" cy="43" r="3.2" fill="#ffd75e" />
      </g>

      {/* the star above the summit */}
      <path d="M32 2.5 l1.9 4.3 4.3 1.9 -4.3 1.9 L32 14.9 l-1.9-4.3 -4.3-1.9 4.3-1.9 Z" fill="#ffd75e" />
    </svg>
  )

  if (!withWordmark) return icon

  return (
    <span className={`logo-lockup ${className}`}>
      {icon}
      <span className="logo-word">
        <b>AI</b>
        <i>UNIVERSE</i>
      </span>
    </span>
  )
}
