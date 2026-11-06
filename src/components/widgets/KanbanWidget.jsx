// Kanban board: one column per status. On your own profile you can move a
// card to another column to change that project's status:
//   - Mouse: drag and drop (the browser's built-in drag and drop).
//   - Touch (phones): press and hold a card for a moment, then drag it
//     (handled by the useTouchDrag hook, since browsers don't support
//     built-in drag and drop with touch).
//
// Customizable: the sliders button in the widget header opens a panel where
// you can show/hide each column and change their order. That choice is saved
// in the widget's settings as { columns: [{ status: 'idea', visible: true }, ...] }.
// With no saved settings it shows every status in the normal order.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { STATUSES, statusLabel } from '../../lib/constants.js'
import { useTouchDrag } from '../../lib/useTouchDrag.js'
import ProjectIcon from '../ProjectIcon.jsx'

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
  const [mouseOverColumn, setMouseOverColumn] = useState(null) // column under a mouse drag
  const columns = getColumns(settings)
  const visibleColumns = columns.filter((c) => c.visible)

  // Touch drag: dropping a project on a column changes its status
  const touch = useTouchDrag({
    holdMs: 300,
    onDrop: (project, status) => {
      if (project.status !== status) onStatusChange(project, status)
    },
  })

  // Mouse drag (built-in drag and drop)
  function handleDrop(event, status) {
    event.preventDefault()
    setMouseOverColumn(null)
    const projectId = event.dataTransfer.getData(PROJECT_DRAG_TYPE)
    const project = projects.find((p) => p.id === projectId)
    if (project && project.status !== status) onStatusChange(project, status)
  }

  return (
    <div className="stack-sm">
      {customizing && (
        <ColumnSettings columns={columns} onChange={(next) => onSettingsChange({ ...settings, columns: next })} />
      )}

      {canDrag && <small className="muted touch-only">Press and hold a project to move it to another column.</small>}

      {visibleColumns.length === 0 ? (
        <p className="muted">All columns are hidden.</p>
      ) : (
        // --kanban-cols tells the CSS how many columns to fit side by side
        <div className="kanban" style={{ '--kanban-cols': visibleColumns.length }}>
          {visibleColumns.map(({ status }) => {
            const columnProjects = projects.filter((p) => p.status === status)
            const isOver = mouseOverColumn === status || touch.overTarget === status
            return (
              <div
                key={status}
                data-drop-target={status}
                className={`kanban-column ${isOver ? 'kanban-column-over' : ''}`}
                onDragOver={(e) => {
                  // Only react to project cards (not e.g. a whole widget being moved)
                  if (!canDrag || !e.dataTransfer.types.includes(PROJECT_DRAG_TYPE)) return
                  e.preventDefault()
                  setMouseOverColumn(status)
                }}
                onDragLeave={() => setMouseOverColumn(null)}
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
                    className={`kanban-card ${touch.ghost?.item.id === project.id ? 'kanban-card-lifted' : ''}`}
                    draggable={canDrag}
                    onDragStart={(e) => {
                      e.stopPropagation() // don't also start dragging the whole widget
                      e.dataTransfer.setData(PROJECT_DRAG_TYPE, project.id)
                    }}
                    onTouchStart={(e) => { if (canDrag) touch.handleTouchStart(e, project) }}
                    onContextMenu={(e) => { if (canDrag) e.preventDefault() }} // no long-press menu on Android
                    onClick={(e) => { if (touch.justDragged()) e.preventDefault() }}
                  >
                    {/* Starred main image if there is one, otherwise the project's icon */}
                    {project.coverUrl
                      ? <img className="kanban-card-photo" src={project.coverUrl} alt="" loading="lazy" />
                      : <ProjectIcon icon={project.icon} color={project.color} size={26} />}
                    <span className="kanban-card-text">
                      <strong>{project.title}</strong>
                      <small className="muted">{project.craft_types?.name}</small>
                    </span>
                  </Link>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* The card that follows your finger during a touch drag */}
      {touch.ghost && (
        <div className="drag-ghost" style={{ left: touch.ghost.x, top: touch.ghost.y }} aria-hidden="true">
          {touch.ghost.item.coverUrl
            ? <img className="kanban-card-photo" src={touch.ghost.item.coverUrl} alt="" />
            : <ProjectIcon icon={touch.ghost.item.icon} color={touch.ghost.item.color} size={26} />}
          <strong>{touch.ghost.item.title}</strong>
        </div>
      )}
    </div>
  )
}
