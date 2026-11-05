// Small yarn-ball logo drawn with SVG (colors follow the theme).
export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="var(--primary)" />
      <path
        d="M6 12c6 2 14 2 20 0M5 18c7 3 15 3 22 0M11 4c-3 8-3 16 1 25M20 3c4 9 4 18-1 26"
        stroke="var(--primary-contrast)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  )
}
