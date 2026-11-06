// Our own icons for things the lucide icon library doesn't have (garments and
// craft tools). They're drawn in the same style as lucide: a 24x24 grid,
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
