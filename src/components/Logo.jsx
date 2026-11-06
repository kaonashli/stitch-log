// The Stitch Log logo: a piece of knitting hanging from two needles.
//
// Animated as one 15-second loop (styles in index.css, under "Logo"):
//   1. Knitting: the piece grows smoothly down from the needles while the
//      right needle rocks back and forth.
//   2. Pause: the finished piece holds still for about 6 seconds.
//   3. The needles slide out of the stitches (each along its own length).
//   4. Frogging: the yarn is pulled out from the top, so the piece shrinks
//      away bit by bit while the pulled yarn trails up out of view.
//   5. The needles slide back in, and it starts again.
// For people who've asked their device for reduced motion (and when
// animated={false}), it just shows the finished piece, standing still.
// public/favicon.svg and the app icons are the finished piece too.
import { useId } from 'react'

// The knitted piece: flat top, cut diagonally along the right needle, zigzag bottom edge
const SWATCH = 'M12 12H24.5L34 21.5V40L31 43 27 40 23 43 19 40 15 43 12 40Z'

// While knitting, this shape slides down so its zigzag bottom edge becomes the
// growing edge of the piece. At the end of knitting it lines up exactly with
// the bottom of the finished piece.
const GROW_SHAPE = 'M0-60H48V40L34 40 31 43 27 40 23 43 19 40 15 43 12 40 0 40Z'

// One zigzag row of stitches starting at height y (rows are 4 units apart)
function rowPath(y) {
  return `M8 ${y} l4 2.4 4-2.4 4 2.4 4-2.4 4 2.4 4-2.4 4 2.4 4-2.4`
}
const ROW_HEIGHTS = [9, 13, 17, 21, 25, 29, 33, 37, 41, 45]

// The yarn being pulled out while frogging: a crinkly row along the top edge
// of the piece, then a long kinked strand going up and out of view. It moves
// down with the top edge, so it always looks attached to the piece.
function frogYarnPath() {
  let d = 'M33 12.6c-1.4-1.7-2.7 1.7-4 0s-2.7 1.7-4 0-2.7 1.7-4 0-2.7 1.7-4 0-2.4 1.5-3.2.2'
  // kinks going up from (13.8, 12.8) to well above the top of the drawing
  let x = 13.8
  for (let y = 12.8; y > -40; y -= 3) {
    const nextX = x === 13.8 ? 11.6 : 13.8
    d += ` Q${(x + nextX) / 2 + (nextX > x ? 1.6 : -1.6)} ${y - 1.5} ${nextX} ${y - 3}`
    x = nextX
  }
  return d
}
const FROG_YARN = frogYarnPath()

export default function Logo({ size = 32, animated = true }) {
  // Clip paths need ids that are unique on the page
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const swatchClip = `logo-swatch-${id}`
  const growClip = `logo-grow-${id}`
  const frogClip = `logo-frog-${id}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="3 3 42 42"
      aria-hidden="true"
      className={`logo ${animated ? 'logo-animated' : ''}`}
    >
      <defs>
        {/* the rows are cut to the shape of the piece */}
        <clipPath id={swatchClip}><path d={SWATCH} /></clipPath>
        {/* knitting: everything above this moving zigzag edge has been knitted */}
        <clipPath id={growClip}><path className="logo-grow" d={GROW_SHAPE} /></clipPath>
        {/* frogging: everything above this moving top edge has been pulled out */}
        <clipPath id={frogClip}><rect className="logo-frog" x="0" y="12" width="48" height="40" /></clipPath>
      </defs>

      {/* Right needle (behind the knitting): slides out toward its knob */}
      <g className="logo-exit-right">
        <g className="logo-needle-right">
          <path className="logo-needle" d="M18.5 4.5 21.9 6.1 42 26.2 40.4 27.8 20.3 7.7Z" />
          <circle className="logo-knob" cx="41.5" cy="27.5" r="3.4" />
        </g>
      </g>

      {/* The knitted piece: only the part that's knitted and not yet frogged shows */}
      <g clipPath={`url(#${frogClip})`}>
        <g clipPath={`url(#${growClip})`}>
          <path className="logo-swatch" d={SWATCH} />
          <g clipPath={`url(#${swatchClip})`}>
            <g className="logo-rows">
              {ROW_HEIGHTS.map((y) => <path key={y} d={rowPath(y)} />)}
            </g>
          </g>
        </g>
      </g>

      {/* Yarn being pulled out while frogging (moves down with the top edge) */}
      <g className="logo-frog-strand">
        <path className="logo-frog-yarn" d={FROG_YARN} />
      </g>

      {/* Left needle (in front): slides out to the left */}
      <g className="logo-exit-left">
        <path className="logo-needle" d="M9 9.8H36L41.5 11 36 12.2H9Z" />
        <circle className="logo-knob" cx="7" cy="11" r="3.4" />
      </g>

      {/* Live stitches: they stay put when the needles slide out, and are the
          first thing to go when frogging starts */}
      <g className="logo-live-stitches">
        <g className="logo-loops">
          <rect x="12" y="8.2" width="2.4" height="4.9" rx="1.2" />
          <rect x="16" y="8.2" width="2.4" height="4.9" rx="1.2" />
          <rect x="20" y="8.2" width="2.4" height="4.9" rx="1.2" />
        </g>
        <g className="logo-needle-right">
          <g className="logo-new-stitches">
            <path d="M28.6 15.9 30.7 13.8" />
            <path d="M31.2 18.5 33.3 16.4" />
            <path d="M33.8 21.1 35.9 19" />
          </g>
        </g>
      </g>
    </svg>
  )
}
