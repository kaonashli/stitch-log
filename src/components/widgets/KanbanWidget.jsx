// Kanban board: one column per status. On your own profile you can drag a
// card to another column to change that project's status (mouse only).
//
// Customizable: the sliders button in the widget header opens a panel where
// you can show/hide each column and change their order. That choice is saved in the widget's
// settings as { columns: [{ status: 'idea', visible: true }, ...] }.
// With no saved settings it shows every status in the normal order.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { STATUSES, statusLabel } from '../../lib/constants.js'

// Our own drag data type, so a card drag can't be confused with other drags
const PROJECT_DRAG_TYPE = 'application/x-stitchlog-project'

// Turn saved settings into the full column list. Statuses that aren't in the
// saved list (e.g. one added to the app later) are added at the end, visible.
export function getColumns(settings) {
  const saved = Array.isArray(settings?.columns)
    ? settings.columns.filter((c) => STATUSES.some((s) => s.value === c.status))
    : []
  const missing = STATUSES
    .filter((s) => !saved.some((c) => c.status === s.value))
    .map((s) => ({ status: s.value, visible: true }))
  return [...saved, ...missing]
}

function ColumnSettings({ columns, onChange }) {
  function toggle(index) {
    onChange(columns.map((c, i) => (i === index ? { ...c, visible: !c.visible } : c)))
  }

  function move(index, direction) {
    const target = index + direction
    if (target < 0 || target >= columns.length) return
    const next = [...columns]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="kanban-settings">
      <small className="muted">Columns: tick to show, arrows to reorder</small>
      {columns.map((column, index) => (
        <div key={column.status} className="kanban-settings-row">
          <label>
            <input type="checkbox" checked={column.visible} onChange={() => toggle(index)} />
            <span className={`dot status-bg-${column.status}`} />
            {statusLabel(column.status)}
          </label>
          <button type="button" className="icon-btn" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${statusLabel(column.status)} left`}>
            <ArrowLeft size={15} />
          </button>
          <button type="button" className="icon-btn" onClick={() => move(index, 1)} disabled={index === columns.length - 1} aria-label={`Move ${statusLabel(column.status)} right`}>
            <ArrowRight size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}

export default function KanbanWidget({ projects, canDrag, onStatusChange, settings, customizing, onSettingsChange }) {
  const [overColumn, setOverColumn] = useState(null) // highlight the column being dragged over
  const columns = getColumns(settings)
  const visibleColumns = columns.filter((c) => c.visible)

  function handleDrop(event, status) {
    event.preventDefault()
    setOverColumn(null)
    const projectId = event.dataTransfer.getData(PROJECT_DRAG_TYPE)
    const project = projects.find((p) => p.id === projectId)
    if (project && project.status !== status) onStatusChange(project, status)
  }

  return (
    <div className="stack-sm">
      {customizing && (
        <ColumnSettings columns={columns} onChange={(next) => onSettingsChange({ ...settings, columns: next })} />
      )}

      {visibleColumns.length === 0 ? (
        <p className="muted">All columns are hidden.</p>
      ) : (
        // --kanban-cols tells the CSS how many columns to fit side by side
        <div className="kanban" style={{ '--kanban-cols': visibleColumns.length }}>
          {visibleColumns.map(({ status }) => {
            const columnProjects = projects.filter((p) => p.status === status)
            return (
              <div
                key={status}
                className={`kanban-column ${overColumn === status ? 'kanban-column-over' : ''}`}
                onDragOver={(e) => {
                  // Only react to project cards (not e.g. a whole widget being moved)
                  if (!canDrag || !e.dataTransfer.types.includes(PROJECT_DRAG_TYPE)) return
                  e.preventDefault()
                  setOverColumn(status)
                }}
                onDragLeave={() => setOverColumn(null)}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className={`kanban-column-title status-text-${status}`}>
                  <span className={`dot status-bg-${status}`} />
                  {statusLabel(status)}
                  <span className="muted">{columnProjects.length}</span>
                </div>
                {columnProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="kanban-card"
                    draggable={canDrag}
                    onDragStart={(e) => {
                      e.stopPropagation() // don't also start dragging the whole widget
                      e.dataTransfer.setData(PROJECT_DRAG_TYPE, project.id)
                    }}
                  >
                    <strong>{project.title}</strong>
                    <small className="muted">{project.craft_types?.name}</small>
                  </Link>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
