// Color tags for yarn, string, and buttons in the materials editor.
// Shows the colors you picked (tap one to remove it) and a "Choose colors"
// button that opens the full list with little swatches. Pick several for
// variegated yarn.
//
// value = ['Navy', 'Cream'], onChange(newList)
import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { COLOR_TAGS, colorSwatch } from '../lib/constants.js'

// A little round swatch of a color tag
export function Swatch({ name, size = 14 }) {
  return <span className="swatch" style={{ '--swatch': colorSwatch(name), width: size, height: size }} aria-hidden="true" />
}

export default function ColorTagPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const picked = value ?? []

  function toggle(name) {
    onChange(picked.includes(name) ? picked.filter((c) => c !== name) : [...picked, name])
  }

  return (
    <div className="fiber-picker">
      <div className="fiber-chips">
        {picked.map((name) => (
          <button key={name} type="button" className="chip chip-sm chip-active color-chip" onClick={() => toggle(name)} aria-label={`Remove ${name}`}>
            <Swatch name={name} /> {name} <X size={11} />
          </button>
        ))}
        <button type="button" className="btn btn-xs btn-ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? <><ChevronUp size={12} /> Done</> : <><ChevronDown size={12} /> {picked.length ? 'Change' : 'Choose colors'}</>}
        </button>
      </div>

      {open && (
        <div className="fiber-groups">
          <div className="fiber-chips">
            {COLOR_TAGS.map(({ name }) => {
              const on = picked.includes(name)
              return (
                <button
                  key={name}
                  type="button"
                  className={`chip chip-sm color-chip ${on ? 'chip-active' : ''}`}
                  aria-pressed={on}
                  onClick={() => toggle(name)}
                >
                  <Swatch name={name} /> {name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
