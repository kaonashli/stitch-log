// "Favorite fibers and colors" widget: which fibers and which colors show up
// the most in your projects' materials (each one counts once per project).
// Every row has the same layout so the icons line up:
//   [star for the top one] [icon or swatch] [name] [bar] [count]
import { Star } from 'lucide-react'
import { fiberIcon } from '../../lib/fiberIcons.js'
import { Swatch } from '../ColorTagPicker.jsx'

const MAX_ROWS = 8

// Count how many projects use each value of a list field (fibers or colors)
function countPerProject(projects, field) {
  const counts = new Map()
  for (const project of projects) {
    const inThisProject = new Set()
    for (const m of project.project_materials ?? []) {
      for (const value of m[field] ?? []) inThisProject.add(value)
    }
    for (const value of inThisProject) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, MAX_ROWS)
}


// One list of bars (fibers or colors)
function BarList({ rows, renderIcon, barClass }) {
  const most = rows[0]?.count ?? 1
  return (
    <ul className="bar-list">
      {rows.map((row, index) => (
        <li key={row.name} className="bar-row">
          <span className="bar-label">
            {/* fixed-width slot: a star for the favorite, empty for the rest */}
            <span className="fav-slot">
              {index === 0 && <Star size={12} fill="currentColor" aria-label="Favorite" />}
            </span>
            {renderIcon(row.name)}
            <span className="bar-name">{row.name}</span>
          </span>
          <span className="bar-track"><span className={`bar-fill ${barClass}`} style={{ width: `${(row.count / most) * 100}%` }} /></span>
          <span className="bar-value">
            <strong>{row.count}</strong> <small className="muted">project{row.count === 1 ? '' : 's'}</small>
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function FibersWidget({ projects }) {
  const fibers = countPerProject(projects, 'fibers')
  const colors = countPerProject(projects, 'colors')

  return (
    <div className="stack">
      <div className="stack-sm">
        <h4 className="widget-subheading">Fibers</h4>
        {fibers.length === 0 ? (
          <p className="muted small">No fibers yet. Pick a fiber on a project's yarn or string to see it here.</p>
        ) : (
          <BarList
            rows={fibers}
            barClass="bar-fill-fiber"
            renderIcon={(name) => {
              const Icon = fiberIcon(name)
              return <span className="fiber-icon" aria-hidden="true"><Icon size={15} /></span>
            }}
          />
        )}
      </div>

      <div className="stack-sm">
        <h4 className="widget-subheading">Colors</h4>
        {colors.length === 0 ? (
          <p className="muted small">No colors yet. Pick colors on a project's yarn, string, or buttons to see them here.</p>
        ) : (
          <BarList
            rows={colors}
            barClass="bar-fill-color"
            renderIcon={(name) => <span className="fiber-icon color-icon"><Swatch name={name} size={16} /></span>}
          />
        )}
      </div>
    </div>
  )
}
