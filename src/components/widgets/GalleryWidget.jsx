// "Project gallery" widget: projects in a photo grid, 3 per row (like a
// photo profile). Each square shows the project's main image, or its icon on
// its color if it has no main image. Tap a square to open the project.
//
// On your own profile:
//   - Drag a square onto another to reorder (mouse, or press and hold on a phone).
//   - The sliders button in the widget header opens "Choose projects", where
//     you add and remove projects (up to 9).
// "See more" shows the rest of the projects in the same grid.
//
// Saved in the widget's settings as { projectIds: ['...', ...] } (in order).
// Until you choose, it shows your 9 most recent projects.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react'
import { colorVar } from '../../lib/projectLooks.js'
import { useTouchDrag } from '../../lib/useTouchDrag.js'
import ProjectIcon from '../ProjectIcon.jsx'

export const GALLERY_MAX = 9
const TILE_DRAG_TYPE = 'application/x-stitchlog-gallery'

// The projects on the widget, in order
export function galleryProjects(projects, settings) {
  if (!Array.isArray(settings?.projectIds)) return projects.slice(0, GALLERY_MAX)
  return settings.projectIds
    .map((id) => projects.find((p) => p.id === id))
    .filter(Boolean) // skip projects that were deleted (or that you can't see)
    .slice(0, GALLERY_MAX)
}

// One square of the grid
function Tile({ project, dragProps = {}, lifted, over, children }) {
  // onLinkClick goes on the link; everything else (drag handlers) on the square
  const { onLinkClick, ...squareProps } = dragProps
  return (
    <div className={`gallery-tile ${lifted ? 'gallery-tile-lifted' : ''} ${over ? 'gallery-tile-over' : ''}`} {...squareProps}>
      <Link
        to={`/projects/${project.id}`}
        className="gallery-tile-link"
        style={{ '--pc': colorVar(project.color) }}
        draggable={false}
        onClick={onLinkClick}
      >
        {project.coverUrl
          ? <img src={project.coverUrl} alt="" loading="lazy" draggable={false} />
          : <ProjectIcon icon={project.icon} color={project.color} size={56} className="gallery-tile-icon" />}
        <span className="gallery-tile-title">{project.title}</span>
      </Link>
      {children}
    </div>
  )
}

export default function GalleryWidget({ projects, settings, editable, customizing, onSettingsChange }) {
  const [showMore, setShowMore] = useState(false)
  const [mouseDragId, setMouseDragId] = useState(null)
  const [mouseOverId, setMouseOverId] = useState(null)

  const shown = galleryProjects(projects, settings)
  const others = projects.filter((p) => !shown.some((s) => s.id === p.id))

  function save(list) {
    onSettingsChange({ ...settings, projectIds: list.map((p) => p.id) })
  }

  // Move the dragged project to where the other one is
  function moveOnto(draggedId, targetId) {
    if (!draggedId || draggedId === targetId) return
    const from = shown.findIndex((p) => p.id === draggedId)
    const to = shown.findIndex((p) => p.id === targetId)
    if (from < 0 || to < 0) return
    const next = [...shown]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    save(next)
  }

  const touch = useTouchDrag({ holdMs: 300, onDrop: (project, targetId) => moveOnto(project.id, targetId) })

  // Drag handlers for one square (only on your own profile)
  function dragPropsFor(project) {
    if (!editable) return {}
    return {
      'data-drop-target': project.id,
      draggable: true,
      onDragStart: (e) => {
        e.stopPropagation() // don't drag the whole widget
        e.dataTransfer.setData(TILE_DRAG_TYPE, project.id)
        e.dataTransfer.effectAllowed = 'move'
        setMouseDragId(project.id)
      },
      onDragEnd: () => { setMouseDragId(null); setMouseOverId(null) },
      onDragOver: (e) => {
        if (!e.dataTransfer.types.includes(TILE_DRAG_TYPE)) return
        e.preventDefault()
        setMouseOverId(project.id)
      },
      onDrop: (e) => {
        e.preventDefault()
        moveOnto(e.dataTransfer.getData(TILE_DRAG_TYPE), project.id)
        setMouseDragId(null)
        setMouseOverId(null)
      },
      onTouchStart: (e) => touch.handleTouchStart(e, project),
      onContextMenu: (e) => e.preventDefault(), // no long-press menu on Android
      onLinkClick: (e) => { if (touch.justDragged()) e.preventDefault() },
    }
  }

  return (
    <div className="stack-sm">
      {/* Choose projects (opened with the sliders button) */}
      {customizing && (
        <div className="kanban-settings gallery-settings">
          <small className="muted">
            {shown.length} of {GALLERY_MAX} spots used. Tap minus to take a project off, plus to add one.
          </small>
          {shown.map((p) => (
            <div key={p.id} className="kanban-settings-row">
              <span className="gallery-pick-name">{p.title}</span>
              <button type="button" className="icon-btn" onClick={() => save(shown.filter((s) => s.id !== p.id))} aria-label={`Take ${p.title} off the gallery`}>
                <Minus size={15} />
              </button>
            </div>
          ))}
          {others.length > 0 && <small className="muted">Not on the gallery</small>}
          {others.map((p) => (
            <div key={p.id} className="kanban-settings-row">
              <span className="gallery-pick-name muted">{p.title}</span>
              <button
                type="button"
                className="icon-btn"
                disabled={shown.length >= GALLERY_MAX}
                onClick={() => save([...shown, p])}
                aria-label={`Add ${p.title} to the gallery`}
                title={shown.length >= GALLERY_MAX ? `The gallery holds ${GALLERY_MAX} projects` : 'Add'}
              >
                <Plus size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editable && shown.length > 1 && (
        <small className="muted">
          Drag a square onto another to reorder<span className="touch-only-inline"> (press and hold on a phone)</span>.
        </small>
      )}

      {shown.length === 0 ? (
        <p className="muted">{editable ? 'No projects on the gallery. Use the sliders button to add some.' : 'Nothing here yet.'}</p>
      ) : (
        <div className="gallery-grid">
          {shown.map((p) => (
            <Tile
              key={p.id}
              project={p}
              dragProps={dragPropsFor(p)}
              lifted={mouseDragId === p.id || touch.ghost?.item.id === p.id}
              over={(mouseOverId === p.id || touch.overTarget === p.id) && (mouseDragId ?? touch.ghost?.item.id) !== p.id}
            />
          ))}
        </div>
      )}

      {/* The rest of the projects, same grid */}
      {others.length > 0 && (
        <>
          <button type="button" className="btn btn-sm btn-ghost gallery-more" onClick={() => setShowMore(!showMore)} aria-expanded={showMore}>
            {showMore ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> See more ({others.length})</>}
          </button>
          {showMore && (
            <div className="gallery-grid">
              {others.map((p) => <Tile key={p.id} project={p} />)}
            </div>
          )}
        </>
      )}

      {/* The square that follows your finger during a touch drag */}
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
