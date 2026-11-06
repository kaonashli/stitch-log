// Fiber picker for yarn and string in the materials editor.
// Shows the fibers you picked (tap one to remove it) and a "Choose fibers"
// button that opens the full list, grouped (wool, other animal fibers,
// plant, regenerated, synthetic, other). Pick several for a blend.
//
// value = ['Merino', 'Silk'], onChange(newList)
import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { FIBER_GROUPS } from '../lib/constants.js'

export default function FiberPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const picked = value ?? []

  function toggle(fiber) {
    onChange(picked.includes(fiber) ? picked.filter((f) => f !== fiber) : [...picked, fiber])
  }

  return (
    <div className="fiber-picker">
      <div className="fiber-chips">
        {picked.map((fiber) => (
          <button key={fiber} type="button" className="chip chip-sm chip-active" onClick={() => toggle(fiber)} aria-label={`Remove ${fiber}`}>
            {fiber} <X size={11} />
          </button>
        ))}
        <button type="button" className="btn btn-xs btn-ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? <><ChevronUp size={12} /> Done</> : <><ChevronDown size={12} /> {picked.length ? 'Change' : 'Choose fibers'}</>}
        </button>
      </div>

      {open && (
        <div className="fiber-groups">
          {FIBER_GROUPS.map((group) => (
            <div key={group.label} className="fiber-group">
              <small className="muted">{group.label}</small>
              <div className="fiber-chips">
                {group.fibers.map((fiber) => {
                  const on = picked.includes(fiber)
                  return (
                    <button
                      key={fiber}
                      type="button"
                      className={`chip chip-sm ${on ? 'chip-active' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggle(fiber)}
                    >
                      {fiber}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
