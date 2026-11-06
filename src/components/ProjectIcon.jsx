// A project's icon in a rounded tile tinted with the project's color.
// size = width/height of the tile in pixels; the icon scales with it.
import { colorVar, iconFor } from '../lib/projectLooks.js'

export default function ProjectIcon({ icon, color, size = 32, className = '' }) {
  const Icon = iconFor(icon)
  return (
    <span
      className={`project-icon ${className}`}
      // --pc is read by the .project-icon CSS for the tint and icon color
      style={{ '--pc': colorVar(color), width: size, height: size }}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * 0.55)} strokeWidth={size >= 64 ? 1.6 : 2} />
    </span>
  )
}
