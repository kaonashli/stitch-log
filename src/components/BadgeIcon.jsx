// The picture for a badge, drawn as an SVG (no images or emojis).
// Every family has its own frame shape and its own picture in the middle:
//   knitter        hexagon, crossed needles with a little knitted swatch
//   crocheter      scalloped circle, hook with a chain of loops
//   started        rounded square, ball of yarn with a strand and a sparkle
//   finished       shield, folded sweater with a check mark
//   calendar-*     round frame, calendar page with 12 / 6 / 1 (months)
//   quick-*        star burst, lightning bolt over needles / hook
//   turtle         octagon, a turtle with a patterned shell
//   friends        circle, people standing together (more people at higher levels)
//   gift           heart, wrapped present with a bow
//   frog           lily pad, a frog with a strand of unravelling yarn
// Badges with levels change metal (copper, bronze, silver, gold, rose gold,
// amethyst) and show their number on a ribbon.
import { useId } from 'react'

// Metal colors for levels 1-6: [frame, inner, dark edge]
const TIERS = [
  ['#c07a4a', '#f3d2b6', '#7c4524'], // copper
  ['#a8743a', '#efd9a8', '#6b4518'], // bronze
  ['#9aa3ad', '#eef1f4', '#5d6670'], // silver
  ['#d4a42a', '#fff0b8', '#8a6510'], // gold
  ['#d0838a', '#fbe0e2', '#8e4a50'], // rose gold
  ['#8a63c9', '#e9ddff', '#4f3487'], // amethyst
]

// Colors for single badges: [frame, inner, dark edge]
const FAMILY_COLORS = {
  started: ['#4f9d8a', '#d9f2ea', '#2b6355'],
  finished: ['#4c9a5a', '#dcf3df', '#2a6034'],
  'calendar-year': ['#3f8fa8', '#d6eef6', '#215a6c'],
  'calendar-half': ['#5b6fc4', '#dfe4fb', '#33428a'],
  'calendar-month': ['#d9694f', '#fde1d9', '#923c28'],
  'quick-knit': ['#e2a024', '#fff1c9', '#94640c'],
  'quick-crochet': ['#e07b2a', '#ffe4cc', '#97480e'],
  turtle: ['#6c8f3c', '#e6f1d4', '#405a1d'],
  frog: ['#4f9a49', '#dff2d6', '#2c5f27'],
}

const INK = '#3b2a26' // line color for the pictures

// ---------- Frame shapes (64 x 64) ----------
function polygonPoints(count, outer, inner = outer, rotation = -90) {
  const points = []
  const total = inner === outer ? count : count * 2
  for (let i = 0; i < total; i++) {
    const r = inner === outer || i % 2 === 0 ? outer : inner
    const angle = ((rotation + (360 / total) * i) * Math.PI) / 180
    points.push(`${(32 + r * Math.cos(angle)).toFixed(2)},${(32 + r * Math.sin(angle)).toFixed(2)}`)
  }
  return points.join(' ')
}

// A circle with little bumps around the edge
function scallopPath(bumps, radius, bumpSize) {
  let d = ''
  for (let i = 0; i <= bumps; i++) {
    const angle = (i / bumps) * Math.PI * 2
    const x = 32 + radius * Math.cos(angle)
    const y = 32 + radius * Math.sin(angle)
    d += i === 0 ? `M${x.toFixed(2)} ${y.toFixed(2)}` : ` A${bumpSize} ${bumpSize} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return d + 'Z'
}

function Frame({ family, scale = 1, ...props }) {
  const s = (n) => 32 + (n - 32) * scale // shrink toward the middle for the inner ring
  switch (family) {
    case 'knitter':
      return <polygon points={polygonPoints(6, 29 * scale, 29 * scale, -90)} {...props} />
    case 'crocheter':
      return <path d={scallopPath(14, 26 * scale, 4 * scale)} {...props} />
    case 'started':
      return <rect x={s(5)} y={s(5)} width={54 * scale} height={54 * scale} rx={14 * scale} {...props} />
    case 'finished':
      return <path d={`M32 ${s(4)} L${s(56)} ${s(12)} V${s(30)} C${s(56)} ${s(46)} ${s(45)} ${s(56)} 32 ${s(61)} C${s(19)} ${s(56)} ${s(8)} ${s(46)} ${s(8)} ${s(30)} V${s(12)} Z`} {...props} />
    case 'quick-knit':
    case 'quick-crochet':
      return <polygon points={polygonPoints(12, 30 * scale, 25 * scale)} {...props} />
    case 'turtle':
      return <polygon points={polygonPoints(8, 29 * scale, 29 * scale, -67.5)} {...props} />
    case 'gift':
      return <path d={`M32 ${s(58)} C${s(14)} ${s(46)} ${s(4)} ${s(34)} ${s(5)} ${s(21)} C${s(6)} ${s(10)} ${s(16)} ${s(4)} ${s(24)} ${s(5)} C${s(28)} ${s(6)} 31 ${s(9)} 32 ${s(12)} C33 ${s(9)} ${s(36)} ${s(6)} ${s(40)} ${s(5)} C${s(48)} ${s(4)} ${s(58)} ${s(10)} ${s(59)} ${s(21)} C${s(60)} ${s(34)} ${s(50)} ${s(46)} 32 ${s(58)} Z`} {...props} />
    case 'frog':
      // a lily pad: a circle with a small wedge cut out at the top
      return <path d={`M32 32 L${s(36)} ${s(4.3)} A${28 * scale} ${28 * scale} 0 1 1 ${s(28)} ${s(4.3)} Z`} {...props} />
    default: // friends, calendars
      return <circle cx="32" cy="32" r={28 * scale} {...props} />
  }
}

// ---------- Pictures ----------
function Picture({ family, level }) {
  const line = { stroke: INK, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }
  switch (family) {
    case 'knitter':
      return (
        <g>
          {/* crossed needles with knobs */}
          <line x1="19" y1="45" x2="43" y2="19" {...line} strokeWidth="2.6" />
          <line x1="45" y1="45" x2="21" y2="19" {...line} strokeWidth="2.6" />
          <circle cx="44" cy="18" r="2.6" fill="#b5643c" stroke={INK} strokeWidth="1.4" />
          <circle cx="20" cy="18" r="2.6" fill="#b5643c" stroke={INK} strokeWidth="1.4" />
          {/* a tiny knitted swatch: rows of V stitches */}
          <rect x="24.5" y="30" width="15" height="12" rx="2" fill="#c2577a" stroke={INK} strokeWidth="1.4" />
          <path d="M26.5 33 l2 2.4 l2 -2.4 l2 2.4 l2 -2.4 l2 2.4 M26.5 37.4 l2 2.4 l2 -2.4 l2 2.4 l2 -2.4 l2 2.4" stroke="#f6c7d6" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
        </g>
      )
    case 'crocheter':
      return (
        <g>
          {/* hook with its little throat at the top */}
          <path d="M22 45 L39.5 21.5" {...line} strokeWidth="2.8" />
          <path d="M39.5 21.5 C41.5 18.5 45 19.5 44 22.5 C43.4 24.2 41.5 24.2 41 23" {...line} strokeWidth="2.2" />
          <rect x="20.5" y="38.5" width="7" height="4" rx="1.5" transform="rotate(-53 24 40.5)" fill="#e2a024" stroke={INK} strokeWidth="1.2" />
          {/* chain of loops */}
          <ellipse cx="22" cy="27" rx="3.6" ry="2.4" stroke="#c2577a" strokeWidth="2" fill="none" />
          <ellipse cx="28" cy="25.5" rx="3.6" ry="2.4" stroke="#c2577a" strokeWidth="2" fill="none" />
          <ellipse cx="34" cy="27.5" rx="3.6" ry="2.4" stroke="#c2577a" strokeWidth="2" fill="none" />
          <path d="M37.5 28 C40 30 40 33 38 35" stroke="#c2577a" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'started':
      return (
        <g>
          {/* ball of yarn */}
          <circle cx="27" cy="36" r="10" fill="#c2577a" stroke={INK} strokeWidth="1.8" />
          <path d="M19 31 C24 33 30 33 35 30 M18 38 C24 41 31 41 36.5 37 M23 27.5 C21 33 22 40 26 45.5 M31 27 C34 32 34 40 31 45.5" stroke="#f6c7d6" strokeWidth="1.3" fill="none" />
          {/* the strand running off to a needle tip */}
          <path d="M36 40 C42 41 44 36 43 31" {...line} strokeWidth="1.6" />
          <line x1="43" y1="31" x2="47" y2="19" {...line} strokeWidth="2.4" />
          {/* sparkle: just started! */}
          <path d="M20 16 v6 M17 19 h6" stroke="#e2a024" strokeWidth="2" strokeLinecap="round" />
        </g>
      )
    case 'finished':
      return (
        <g>
          {/* folded sweater */}
          <path d="M24 20 L19 23 L15 31 L20 33.5 L22 30 V44 H42 V30 L44 33.5 L49 31 L45 23 L40 20 C38 23 26 23 24 20 Z" fill="#5a86c4" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M22 41 H42" stroke="#c9dbf2" strokeWidth="1.3" />
          {/* check mark */}
          <circle cx="42" cy="42" r="7" fill="#4c9a5a" stroke={INK} strokeWidth="1.6" />
          <path d="M38.8 42 l2.2 2.3 l4 -4.4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )
    case 'calendar-year':
    case 'calendar-half':
    case 'calendar-month': {
      const number = family === 'calendar-year' ? '12' : family === 'calendar-half' ? '6' : '1'
      return (
        <g>
          {/* calendar page with rings */}
          <rect x="18" y="20" width="28" height="26" rx="3.5" fill="#fffaf2" stroke={INK} strokeWidth="1.8" />
          <path d="M18 27 H46" stroke={INK} strokeWidth="1.8" />
          <rect x="18.9" y="20.9" width="26.2" height="5.2" rx="2.5" fill="#d9694f" />
          <line x1="25" y1="17.5" x2="25" y2="23" {...line} />
          <line x1="39" y1="17.5" x2="39" y2="23" {...line} />
          <text x="32" y="40.5" textAnchor="middle" fontSize={number.length > 1 ? 12 : 14} fontWeight="800" fill={INK} fontFamily="inherit">{number}</text>
          <text x="32" y="44.6" textAnchor="middle" fontSize="4" fontWeight="700" fill={INK} fontFamily="inherit" letterSpacing="0.4">{number === '1' ? 'MONTH' : 'MONTHS'}</text>
        </g>
      )
    }
    case 'quick-knit':
    case 'quick-crochet':
      return (
        <g>
          {family === 'quick-knit' ? (
            <>
              <line x1="18" y1="44" x2="38" y2="20" {...line} strokeWidth="2.4" />
              <line x1="26" y1="46" x2="46" y2="22" {...line} strokeWidth="2.4" />
              <circle cx="38.5" cy="19.5" r="2.2" fill="#b5643c" stroke={INK} strokeWidth="1.2" />
              <circle cx="46.5" cy="21.5" r="2.2" fill="#b5643c" stroke={INK} strokeWidth="1.2" />
            </>
          ) : (
            <>
              <path d="M20 45 L40 21" {...line} strokeWidth="2.6" />
              <path d="M40 21 C42 18 45.5 19 44.5 22 C44 23.6 42 23.6 41.6 22.4" {...line} strokeWidth="2" />
            </>
          )}
          {/* lightning bolt = fast! */}
          <path d="M33 14 L24 33 H31 L27 50 L41 28 H34 L38 14 Z" fill="#f5b301" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M33.5 17 L27.5 30.5" stroke="#fff3c2" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )
    case 'turtle':
      return (
        <g>
          {/* head, legs, tail */}
          <circle cx="47" cy="34" r="4" fill="#9cc46a" stroke={INK} strokeWidth="1.6" />
          <circle cx="48.3" cy="33" r="0.9" fill={INK} />
          <ellipse cx="22" cy="42" rx="3.4" ry="2.6" fill="#9cc46a" stroke={INK} strokeWidth="1.4" />
          <ellipse cx="38" cy="42.5" rx="3.4" ry="2.6" fill="#9cc46a" stroke={INK} strokeWidth="1.4" />
          <path d="M15 38 L11.5 39.5" {...line} strokeWidth="1.8" />
          {/* shell with a hexagon pattern */}
          <path d="M14 39 C14 27 21 21 30 21 C39 21 45 27 45 39 Z" fill="#8a6a3a" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <polygon points="29.5,26 34,28.5 34,33.5 29.5,36 25,33.5 25,28.5" fill="#c49a52" stroke={INK} strokeWidth="1.1" />
          <path d="M25 33.5 L19.5 36 M34 33.5 L39.5 36 M25 28.5 L20.5 26 M34 28.5 L38.5 26" stroke={INK} strokeWidth="1.1" />
          <path d="M14 39 H45" stroke={INK} strokeWidth="1.8" />
        </g>
      )
    case 'friends': {
      // More people for higher levels (1 friend = 2 people side by side)
      const count = Math.min(2 + (level - 1), 5)
      const colors = ['#c2577a', '#5a86c4', '#4c9a5a', '#e2a024', '#8a63c9']
      const width = 32
      const people = Array.from({ length: count }, (_, i) => {
        const x = count === 1 ? 32 : 32 - width / 2 + (width / (count - 1)) * i
        const back = count > 2 && i % 2 === 1 // every other one stands a bit behind
        return { x, y: back ? -3 : 0, color: colors[i], back }
      })
      return (
        <g>
          {[...people].sort((a, b) => Number(b.back) - Number(a.back)).map((p, i) => (
            <g key={i} transform={`translate(${p.x} ${p.y})`}>
              <path d="M-7 44 C-7 36 -4 33 0 33 C4 33 7 36 7 44 Z" fill={p.color} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="0" cy="27" r="4.6" fill="#f3d2b6" stroke={INK} strokeWidth="1.5" />
            </g>
          ))}
          {/* a strand of yarn holding everyone together */}
          <path d="M14 39 C22 35 26 42 32 38 C38 34 42 41 50 37" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeDasharray="0.1 3.2" />
        </g>
      )
    }
    case 'gift':
      return (
        <g>
          {/* wrapped present */}
          <rect x="21" y="29" width="22" height="15" rx="1.5" fill="#c2577a" stroke={INK} strokeWidth="1.8" />
          <rect x="19.5" y="24.5" width="25" height="5.5" rx="1.5" fill="#d9708f" stroke={INK} strokeWidth="1.8" />
          <rect x="30" y="24.5" width="4" height="19.5" fill="#ffd34d" stroke={INK} strokeWidth="1.2" />
          {/* bow */}
          <path d="M32 24.5 C27 16 21 19 24.5 23 C26 24.5 30 24.5 32 24.5 Z" fill="#ffd34d" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M32 24.5 C37 16 43 19 39.5 23 C38 24.5 34 24.5 32 24.5 Z" fill="#ffd34d" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          {/* little heart tag */}
          <path d="M45 33.5 c-1.5 -2.5 -5 -1 -3.6 1.6 l3.6 3.6 l3.6 -3.6 c1.4 -2.6 -2.1 -4.1 -3.6 -1.6 Z" fill="#fff" stroke={INK} strokeWidth="1.1" />
        </g>
      )
    case 'frog':
      return (
        <g>
          {/* frog face */}
          <ellipse cx="32" cy="36" rx="13" ry="9.5" fill="#7cc36a" stroke={INK} strokeWidth="1.8" />
          <circle cx="25.5" cy="27" r="5" fill="#7cc36a" stroke={INK} strokeWidth="1.8" />
          <circle cx="38.5" cy="27" r="5" fill="#7cc36a" stroke={INK} strokeWidth="1.8" />
          <circle cx="25.5" cy="27" r="2.6" fill="#fff" />
          <circle cx="38.5" cy="27" r="2.6" fill="#fff" />
          <circle cx="26" cy="27.4" r="1.3" fill={INK} />
          <circle cx="38" cy="27.4" r="1.3" fill={INK} />
          <path d="M26 38 C29 41 35 41 38 38" {...line} strokeWidth="1.6" />
          <circle cx="23" cy="36.5" r="1.2" fill="#f08aa6" />
          <circle cx="41" cy="36.5" r="1.2" fill="#f08aa6" />
          {/* crinkly yarn being ripped out */}
          <path d="M44 44 C46 41 48 46 50 43 C52 40 53 45 55 42" stroke="#c2577a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      )
    default:
      return null
  }
}

// badge = an entry from BADGES (lib/badges.js)
// earned = false draws it as a SECRET: just the dashed outline of its frame
// with a question mark, so badges you haven't earned stay a surprise.
export default function BadgeIcon({ badge, earned = true, size = 56 }) {
  const id = useId()

  if (!earned) {
    return (
      <svg className="badge-icon badge-icon-secret" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Secret badge">
        <Frame family={badge.family} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
        <text x="32" y="40" textAnchor="middle" fontSize="22" fontWeight="800" fill="currentColor" fontFamily="inherit">?</text>
      </svg>
    )
  }
  const leveled = Boolean(badge.ribbon)
  const [frame, inner, edge] = leveled
    ? TIERS[Math.min(badge.level - 1, TIERS.length - 1)]
    : FAMILY_COLORS[badge.family] ?? TIERS[3]

  return (
    <svg
      className="badge-icon"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={badge.name}
    >
      <defs>
        {/* soft shine from the top left */}
        <radialGradient id={`${id}-shine`} cx="35%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <Frame family={badge.family} fill={frame} stroke={edge} strokeWidth="2" />
      <Frame family={badge.family} scale={0.82} fill={inner} stroke={edge} strokeWidth="1" strokeOpacity="0.5" />
      <Picture family={badge.family} level={badge.level} />
      <Frame family={badge.family} fill={`url(#${id}-shine)`} />
      {/* level number on a ribbon */}
      {leveled && (
        <g>
          <path d="M14 51 H50 L47 55.5 L50 60 H14 L17 55.5 Z" fill={edge} />
          <text x="32" y="58.3" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fff" fontFamily="inherit">{badge.ribbon}</text>
        </g>
      )}
    </svg>
  )
}
