// Our own icons for things the lucide icon library doesn't have (garments,
// craft tools, and fiber sources). They're drawn in the same style as lucide: a 24x24 grid,
// 2px rounded lines, no fill, and they take the same size/strokeWidth props,
// so they can be used anywhere a lucide icon is used.
import { useId } from 'react'

// Builds an icon component from SVG shapes
function makeIcon(shapes) {
  return function CustomIcon({ size = 24, strokeWidth = 2, ...rest }) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...rest}
      >
        {shapes}
      </svg>
    )
  }
}

// Ball of yarn: evenly wound strands in two directions and a loose tail.
// The strands are parts of big circles, "clipped" (cut off) at the edge of
// the ball. Each clip needs an id that's unique on the page, hence useId().
export function YarnBall({ size = 24, strokeWidth = 2, ...rest }) {
  const clipId = 'yarn-' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <defs>
        <clipPath id={clipId}><circle cx="11" cy="11" r="8" /></clipPath>
      </defs>
      <circle cx="11" cy="11" r="8" />
      <g clipPath={`url(#${clipId})`}>
        <circle cx="-1" cy="22" r="10" />
        <circle cx="-1" cy="22" r="13.5" />
        <circle cx="-1" cy="22" r="17" />
        <circle cx="-1" cy="22" r="20.5" />
        <circle cx="23" cy="21" r="10.5" />
      </g>
      <path d="M16.7 16.6c1.3 1.6 2.9 3.4 5.1 3.2" />
    </svg>
  )
}

// Long-sleeve pullover with ribbed cuffs and hem
export const Sweater = makeIcon(
  <>
    <path d="M9 3c.8 1.6 5.2 1.6 6 0l4 1.5c1.4.5 2 1.5 2.3 3L22 17l-3 .5-1-6.5v10H6V11l-1 6.5-3-.5.7-9.5C3 6 3.6 5 5 4.5z" />
    <path d="M6 18.5h12" />
  </>
)

// A-line skirt with a waistband and pleats
export const Skirt = makeIcon(
  <>
    <path d="M8 3h8v3H8z" />
    <path d="M8 6 4 20c5.3 1.4 10.7 1.4 16 0L16 6" />
    <path d="m10.5 6-1 14.8" />
    <path d="m13.5 6 1 14.8" />
  </>
)

// Trousers with a waistband
export const Pants = makeIcon(
  <>
    <path d="M6 3h12l1 18h-5l-2-12-2 12H5z" />
    <path d="M5.8 6.5h12.4" />
  </>
)

// Sleeveless dress with a fitted waist and flared skirt
export const Dress = makeIcon(
  <>
    <path d="M9 2v4c-1 1-1.5 2.5.5 5L4.5 20c5 1.5 10 1.5 15 0l-5-9c2-2.5 1.5-4 .5-5V2" />
    <path d="M9 6c1.5 1.5 4.5 1.5 6 0" />
    <path d="M9.5 11h5" />
  </>
)

// Two crossed knitting needles with knobs on the ends
export const KnittingNeedles = makeIcon(
  <>
    <path d="M3.5 20.5 17.6 6.4" />
    <circle cx="19" cy="5" r="2" />
    <path d="M20.5 20.5 6.4 6.4" />
    <circle cx="5" cy="5" r="2" />
  </>
)

// Crochet hook: shaft, thumb rest, and a curled hook at the tip
export const CrochetHook = makeIcon(
  <>
    <path d="M3.5 20.5 16 8" />
    <path d="m16 8 2.6-2.6a1.8 1.8 0 1 0-2.5-2.5l-.6.6" />
    <path d="m6.2 16.2 4-4 1.7 1.7-4 4z" />
  </>
)

// ---------- Fiber icons (Favorite fibers widget) ----------

// Sheep: a fluffy cloud of a body, head, and two legs
export const Sheep = makeIcon(
  <>
    <path d="M6.5 16a3 3 0 0 1-.7-5.9 3.3 3.3 0 0 1 5.7-2.6 3.3 3.3 0 0 1 5.6 1.3A2.9 2.9 0 0 1 16.5 16Z" />
    <path d="M17 9.5c.6-1.2 2-1.8 3.2-1.1 1 .6 1.3 2 .6 3.3l-.8 1.4c-.4.6-1.1.8-1.7.5" />
    <path d="M8 16v4" />
    <path d="M14 16v4" />
  </>
)

// Alpaca / llama / camel: long neck, perky ears
export const Alpaca = makeIcon(
  <>
    <path d="M6 20v-5" />
    <path d="M14 20v-5" />
    <path d="M4 13.5c0-1.5 1.2-2.5 3-2.5h7V5.5" />
    <path d="M4 13.5c0 1 .8 1.5 2 1.5h8c.6 0 1-.4 1-1V5.5" />
    <path d="M14 5.5c0-1 .8-1.5 1.8-1.5h1.4c.8 0 1.5.6 1.6 1.4l.2 1.1h-3.4" />
    <path d="m15 4-.5-2" />
    <path d="m17.2 4 .3-2" />
  </>
)

// Goat (mohair, cashmere): face with curved horns and a little beard
export const Goat = makeIcon(
  <>
    <path d="M9 8C8 5 5.5 3.5 3.5 4.5" />
    <path d="M15 8c1-3 3.5-4.5 5.5-3.5" />
    <path d="M8 8h8l-1 6.5-3 3.5-3-3.5Z" />
    <path d="M10.5 11.5h.01" />
    <path d="M13.5 11.5h.01" />
    <path d="M12 18v3" />
  </>
)

// Yak (yak, bison, qiviut): wide horns and a shaggy fringe
export const Yak = makeIcon(
  <>
    <path d="M7 9C4 9 2.5 7.5 2.5 5" />
    <path d="M17 9c3 0 4.5-1.5 4.5-4" />
    <path d="M7 8h10v5c0 3.3-2.2 6-5 6s-5-2.7-5-6Z" />
    <path d="M10 12h.01" />
    <path d="M14 12h.01" />
    <path d="m9 18.5-1 2.5" />
    <path d="m15 18.5 1 2.5" />
  </>
)

// Silk: a silk cocoon wrapped in thread, with a loose end
export const Cocoon = makeIcon(
  <>
    <ellipse cx="11" cy="12" rx="5" ry="8" transform="rotate(-30 11 12)" />
    <path d="M7.5 8.5c2 .5 4.5 2 6 4" />
    <path d="M6.5 12.5c2 .3 4.5 1.6 6.3 3.5" />
    <path d="M10 6.2c1.6.7 3.6 2.2 4.8 3.8" />
    <path d="M15.5 17.5c1.5 1 3 1.2 5 .5" />
  </>
)

// Cotton: a fluffy boll in its pointed leaves, on a stem
export const CottonBoll = makeIcon(
  <>
    <circle cx="8.5" cy="10" r="3" />
    <circle cx="15.5" cy="10" r="3" />
    <circle cx="12" cy="6.5" r="3" />
    <path d="m6 13.5 6 3 6-3" />
    <path d="M12 16.5V21" />
  </>
)

// Bamboo: two stalks with joints and a leaf
export const Bamboo = makeIcon(
  <>
    <path d="M9 3v18" />
    <path d="M15 3v18" />
    <path d="M8 8.5h2" />
    <path d="M8 15h2" />
    <path d="M14 6h2" />
    <path d="M14 12.5h2" />
    <path d="M15 9.5c1.5-1.5 3.5-2 5.5-1.5-1 1.6-3 2.4-5.5 1.5" />
  </>
)
