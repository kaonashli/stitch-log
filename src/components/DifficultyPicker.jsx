// Difficulty: five little yarn-ball dots, 1 (beginner) to 5 (expert).
// DifficultyPicker is the clickable version for the form (click the current
// level again to clear it); DifficultyDots just displays a level.
import { DIFFICULTIES, difficultyLabel } from '../lib/constants.js'

export function DifficultyDots({ value }) {
  if (!value) return null
  return (
    <span className="difficulty" title={difficultyLabel(value)}>
      <span className="difficulty-dots" aria-hidden="true">
        {DIFFICULTIES.map((d) => (
          <span key={d.value} className={`difficulty-dot ${d.value <= value ? 'difficulty-dot-on' : ''}`} />
        ))}
      </span>
      <span>{difficultyLabel(value)}</span>
    </span>
  )
}

export default function DifficultyPicker({ value, onChange }) {
  return (
    <div className="difficulty-picker">
      <div className="difficulty-dots" role="radiogroup" aria-label="Difficulty">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.value}
            type="button"
            role="radio"
            aria-checked={value === d.value}
            aria-label={d.label}
            title={d.label}
            className={`difficulty-dot difficulty-dot-button ${value && d.value <= value ? 'difficulty-dot-on' : ''}`}
            onClick={() => onChange(value === d.value ? null : d.value)}
          />
        ))}
      </div>
      <small className="muted">{value ? difficultyLabel(value) : 'Not rated'}</small>
    </div>
  )
}
