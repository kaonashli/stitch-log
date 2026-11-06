// The customizable widget area on the profile page. On your own profile every
// widget has controls in its header:
//   - grip handle: drag to move (mouse, using the browser's built-in drag and drop)
//   - up/down arrows: move (works on phones, which don't support drag and drop)
//   - X: remove. Removed widgets show up in "Add a widget" below so you can add them back.
//   - sliders (kanban only): choose which columns to show and their order
import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Plus, SlidersHorizontal, X } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { toLocalDateString } from '../../lib/dates.js'
import { getPhotoUrls } from '../../lib/images.js'
import { WIDGET_TYPES } from '../../lib/constants.js'
import { statusChangeFields } from '../../lib/projectStatus.js'
import Spinner from '../Spinner.jsx'
import ErrorMessage from '../ErrorMessage.jsx'
import KanbanWidget from './KanbanWidget.jsx'
import CalendarWidget from './CalendarWidget.jsx'
import GalleryWidget from './GalleryWidget.jsx'
import FocusWidget from './FocusWidget.jsx'
import MadeForWidget from './MadeForWidget.jsx'
import FibersWidget from './FibersWidget.jsx'
import BadgesWidget from './BadgesWidget.jsx'
import { requestBadgeCheck } from '../../lib/badges.js'

// Widgets that have a settings panel (opened with the sliders button)
const WIDGETS_WITH_SETTINGS = {
  kanban: 'Choose columns',
  gallery: 'Choose projects',
}

// Load a user's projects plus everything the widgets need: status history
// (board, timeline), who each one is for, fibers, and a link to each
// project's starred main image, if it has one.
async function loadProjects(userId) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, title, status, start_date, finish_date, icon, color, description,
      craft_types(name),
      project_status_history(status, changed_at),
      project_photos(storage_path, is_cover),
      project_materials(material_type, fibers),
      project_recipients(user_id, name, person:profiles!project_recipients_user_id_fkey(id, username, display_name, avatar_path))
    `)
    .eq('user_id', userId)
    .is('deleted_at', null) // skip projects in Recently deleted
    .order('start_date', { ascending: false })
  if (error) throw error

  // Main images are private photos, so ask for short-lived links to them
  const coverPaths = {}
  for (const p of data) {
    const cover = p.project_photos.find((photo) => photo.is_cover)
    if (cover) coverPaths[p.id] = cover.storage_path
  }
  const urls = await getPhotoUrls(Object.values(coverPaths))

  // Add a sorted "history" list with local dates, used by the calendar
  return data.map((p) => ({
    ...p,
    coverUrl: coverPaths[p.id] ? urls[coverPaths[p.id]] : null, // starred main image, or null
    history: p.project_status_history
      .map((h) => ({ status: h.status, day: toLocalDateString(new Date(h.changed_at)), at: h.changed_at }))
      .sort((a, b) => a.at.localeCompare(b.at)),
  }))
}

// focusProjectId = the profile owner's starred focus project (for that widget)
export default function WidgetBoard({ userId, editable, focusProjectId = null }) {
  const [widgets, setWidgets] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settingsOpenFor, setSettingsOpenFor] = useState(null) // widget id whose settings panel is open
  const [dragIndex, setDragIndex] = useState(null) // which widget is being dragged

  useEffect(() => {
    async function load() {
      try {
        const [widgetResult, projectList] = await Promise.all([
          supabase.from('profile_widgets').select('*').eq('user_id', userId).order('position'),
          loadProjects(userId),
        ])
        if (widgetResult.error) throw widgetResult.error
        setWidgets(widgetResult.data)
        setProjects(projectList)
      } catch (err) {
        setError(err.message)
      }
      setLoading(false)
    }
    load()
  }, [userId])

  // ----- Drag to reorder -----
  function handleDragStart(index) {
    setDragIndex(index)
  }

  function handleDragOver(event, overIndex) {
    if (dragIndex === null) return // something else is being dragged (e.g. a kanban card)
    event.preventDefault() // required to allow dropping here
    if (dragIndex === overIndex) return
    // Move the dragged widget to the spot under the mouse, live
    const next = [...widgets]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(overIndex, 0, moved)
    setWidgets(next)
    setDragIndex(overIndex)
  }

  // Called on drop and on drag end (browsers don't always fire both, so we
  // handle either; saving twice is harmless).
  async function handleDragEnd() {
    if (dragIndex === null) return
    setDragIndex(null)
    await savePositions(widgets)
  }

  // Save the order: each widget's position = its index in the list
  async function savePositions(list) {
    const results = await Promise.all(
      list.map((w, index) => supabase.from('profile_widgets').update({ position: index }).eq('id', w.id))
    )
    const failed = results.find((r) => r.error)
    if (failed) setError(failed.error.message)
  }

  // Up/down arrow buttons: swap a widget with its neighbor
  function moveWidget(index, direction) {
    const target = index + direction
    if (target < 0 || target >= widgets.length) return
    const next = [...widgets]
    ;[next[index], next[target]] = [next[target], next[index]]
    setWidgets(next)
    savePositions(next)
  }

  // ----- Add / remove / settings -----
  async function addWidget(type) {
    const { data, error } = await supabase
      .from('profile_widgets')
      .insert({ widget_type: type, position: widgets.length })
      .select()
      .single()
    if (error) return setError(error.message)
    setWidgets([...widgets, data])
  }

  async function removeWidget(id) {
    const { error } = await supabase.from('profile_widgets').delete().eq('id', id)
    if (error) return setError(error.message)
    setWidgets(widgets.filter((w) => w.id !== id))
  }

  async function updateSettings(id, settings) {
    setWidgets(widgets.map((w) => (w.id === id ? { ...w, settings } : w)))
    const { error } = await supabase.from('profile_widgets').update({ settings }).eq('id', id)
    if (error) setError(error.message)
  }

  // Called by the kanban when a card is dropped in another column
  async function changeProjectStatus(project, status) {
    // Also sets the start date (leaving Idea) or the finish date (Finished)
    const changes = statusChangeFields(project, status)

    const { error } = await supabase.from('projects').update(changes).eq('id', project.id)
    if (error) return setError(error.message)
    setProjects(await loadProjects(userId)) // reload so the calendar sees the new history too
    requestBadgeCheck() // e.g. finishing a project can earn a badge
  }

  if (loading) return <Spinner />

  // Widget types that aren't on the board right now (removed, or never added)
  const removedTypes = Object.keys(WIDGET_TYPES).filter((type) => !widgets.some((w) => w.widget_type === type))

  return (
    <div className="stack widget-board">
      <h2>{editable ? 'Your dashboard' : 'Dashboard'}</h2>

      <ErrorMessage message={error} />

      {widgets.length === 0 && (
        <div className="card empty">
          <p className="muted">{editable ? 'No widgets on your dashboard. Add one below.' : 'Nothing to show yet.'}</p>
        </div>
      )}

      {widgets.map((widget, index) => (
        <div
          key={widget.id}
          className={`card widget ${dragIndex === index ? 'widget-dragging' : ''}`}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => {
            if (dragIndex === null) return
            e.preventDefault()
            handleDragEnd()
          }}
        >
          <div className="widget-header">
            {editable && (
              // Only the grip handle starts a drag, so the rest of the widget
              // (kanban cards, dropdowns) works normally.
              <span
                className="widget-grip"
                draggable
                title="Drag to move"
                onDragStart={(e) => {
                  // Custom data type so the kanban columns ignore widget drags
                  e.dataTransfer.setData('application/x-stitchlog-widget', widget.id)
                  e.dataTransfer.effectAllowed = 'move'
                  // Show the whole widget under the mouse, not just the little handle
                  e.dataTransfer.setDragImage(e.currentTarget.closest('.widget'), 24, 24)
                  handleDragStart(index)
                }}
                onDragEnd={handleDragEnd}
              >
                <GripVertical size={18} />
              </span>
            )}
            <h3>{WIDGET_TYPES[widget.widget_type]?.label ?? widget.widget_type}</h3>
            {editable && (
              <span className="widget-controls">
                {WIDGETS_WITH_SETTINGS[widget.widget_type] && (
                  <button
                    className={`icon-btn ${settingsOpenFor === widget.id ? 'icon-btn-active' : ''}`}
                    onClick={() => setSettingsOpenFor(settingsOpenFor === widget.id ? null : widget.id)}
                    aria-label={WIDGETS_WITH_SETTINGS[widget.widget_type]}
                    title={WIDGETS_WITH_SETTINGS[widget.widget_type]}
                  >
                    <SlidersHorizontal size={16} />
                  </button>
                )}
                <button className="icon-btn" onClick={() => moveWidget(index, -1)} disabled={index === 0} aria-label="Move widget up" title="Move up">
                  <ArrowUp size={16} />
                </button>
                <button className="icon-btn" onClick={() => moveWidget(index, 1)} disabled={index === widgets.length - 1} aria-label="Move widget down" title="Move down">
                  <ArrowDown size={16} />
                </button>
                <button className="icon-btn" onClick={() => removeWidget(widget.id)} aria-label="Remove widget" title="Remove widget">
                  <X size={16} />
                </button>
              </span>
            )}
          </div>

          {widget.widget_type === 'kanban' && (
            <KanbanWidget
              projects={projects}
              canDrag={editable}
              onStatusChange={changeProjectStatus}
              settings={widget.settings}
              customizing={settingsOpenFor === widget.id}
              onSettingsChange={(settings) => updateSettings(widget.id, settings)}
              columnLinks={editable}
            />
          )}
          {widget.widget_type === 'calendar' && (
            <CalendarWidget
              projects={projects}
              settings={widget.settings}
              editable={editable}
              onSettingsChange={(settings) => updateSettings(widget.id, settings)}
            />
          )}
          {widget.widget_type === 'gallery' && (
            <GalleryWidget
              projects={projects}
              settings={widget.settings}
              editable={editable}
              customizing={settingsOpenFor === widget.id}
              onSettingsChange={(settings) => updateSettings(widget.id, settings)}
            />
          )}
          {widget.widget_type === 'focus' && (
            <FocusWidget projects={projects} focusId={focusProjectId} editable={editable} />
          )}
          {widget.widget_type === 'badges' && <BadgesWidget userId={userId} editable={editable} />}
          {widget.widget_type === 'made_for' && <MadeForWidget projects={projects} ownerId={userId} />}
          {widget.widget_type === 'fibers' && <FibersWidget projects={projects} />}
        </div>
      ))}

      {/* Removed widgets wait here so you can add them back */}
      {editable && removedTypes.length > 0 && (
        <div className="card add-widget">
          <strong>Add a widget</strong>
          <div className="add-widget-options">
            {removedTypes.map((type) => (
              <button key={type} className="add-widget-option" onClick={() => addWidget(type)}>
                <Plus size={16} />
                <span>
                  <strong>{WIDGET_TYPES[type].label}</strong>
                  <small className="muted">{WIDGET_TYPES[type].description}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
