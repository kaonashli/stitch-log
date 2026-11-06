// Pick a project's icon and color. Normally it only shows the current choice
// (a preview) with an Edit button; clicking Edit opens the icon grid and color
// swatches. There's always a selection (the defaults), so a project can never
// be saved without one.
import { useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import { PROJECT_COLORS, PROJECT_ICONS, colorVar } from '../lib/projectLooks.js'
import ProjectIcon from './ProjectIcon.jsx'

export default function IconColorPicker({ icon, color, onChange }) {
  const [open, setOpen] = useState(false)
  const colorLabel = PROJECT_COLORS.find((c) => c.name === color)?.label

  return (
    <div className="icon-picker">
      <div className="icon-picker-summary">
        <ProjectIcon icon={icon} color={color} size={52} />
        <span className="icon-picker-names">
          <span className="icon-picker-name-row">
            <strong>{PROJECT_ICONS[icon]?.label}</strong>
            {/* Small Edit/Done button right next to the name */}
            <button
              type="button"
              className={`btn btn-xs ${open ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label={open ? 'Done choosing icon and color' : 'Edit icon and color'}
            >
              {open ? <><Check size={12} /> Done</> : <><Pencil size={12} /> Edit</>}
            </button>
          </span>
          <small className="muted">{colorLabel}</small>
        </span>
      </div>

      {open && (
        <div className="stack-sm">
          {/* role="radiogroup" + aria-checked lets screen readers treat these as one choice */}
          <div className="icon-grid" role="radiogroup" aria-label="Icon">
            {Object.entries(PROJECT_ICONS).map(([name, { label, Icon }]) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={icon === name}
                aria-label={label}
                title={label}
                className={`icon-choice ${icon === name ? 'icon-choice-selected' : ''}`}
                style={{ '--pc': colorVar(color) }}
                onClick={() => onChange({ icon: name, color })}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>

          <div className="color-row" role="radiogroup" aria-label="Color">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                role="radio"
                aria-checked={color === c.name}
                aria-label={c.label}
                title={c.label}
                className={`color-choice ${color === c.name ? 'color-choice-selected' : ''}`}
                style={{ background: colorVar(c.name) }}
                onClick={() => onChange({ icon, color: c.name })}
              >
                {color === c.name && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
