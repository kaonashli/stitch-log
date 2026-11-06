// Milestones on the project page: a checklist of your own steps and plans
// for the project (like tasks under a user story).
//
// The owner can:
//   - add one (title + optional target date), or tap a suggestion
//   - tick it off (remembers the day it was done) or untick it
//   - edit its title or date (pencil), delete it (trash)
//   - reorder by dragging the grip handle (mouse or finger)
// Everyone else who can see the project sees the list and the progress.
// Every change saves right away.
import { useEffect, useState } from 'react'
import { CalendarDays, Check, Flag, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  MILESTONE_SUGGESTIONS, addMilestone, deleteMilestone, loadMilestones, saveMilestoneOrder, updateMilestone,
} from '../lib/milestones.js'
import { formatDate, toLocalDateString, todayLocal } from '../lib/dates.js'
import { useTouchDrag } from '../lib/useTouchDrag.js'
import MilestoneProgress from './MilestoneProgress.jsx'

const MILESTONE_DRAG_TYPE = 'application/x-stitchlog-milestone'

// 'Mar 5' for this year's dates, 'Mar 5, 2027' otherwise
function shortDay(dayString) {
  if (!dayString) return ''
  const sameYear = dayString.slice(0, 4) === todayLocal().slice(0, 4)
  return sameYear
    ? new Date(dayString + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : formatDate(dayString)
}

export default function MilestoneList({ projectId, isOwner, onChange }) {
  const [items, setItems] = useState(null) // null = loading
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [showDate, setShowDate] = useState(false)
  const [editing, setEditing] = useState(null) // { id, title, due_date } while editing one
  const [mouseDragId, setMouseDragId] = useState(null)
  const [mouseOverId, setMouseOverId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadMilestones(projectId).then(setItems).catch((err) => { setError(err.message); setItems([]) })
  }, [projectId])

  // Tell the page when the list changes (e.g. to update other progress bars)
  function setList(next) {
    setItems(next)
    onChange?.(next)
  }

  // Run a save; if it fails, put the list back and show the error
  async function save(next, action) {
    const before = items
    setError('')
    setList(next)
    try {
      await action()
    } catch (err) {
      setList(before)
      setError(err.message)
    }
  }

  async function handleAdd(event, text = title) {
    event?.preventDefault()
    const clean = text.trim()
    if (!clean) return
    setError('')
    try {
      const created = await addMilestone(projectId, clean, items.length, dueDate)
      setList([...items, created])
      setTitle('')
      setDueDate('')
      setShowDate(false)
    } catch (err) {
      setError(err.message)
    }
  }

  function toggleDone(m) {
    const done_at = m.done_at ? null : new Date().toISOString()
    save(items.map((x) => (x.id === m.id ? { ...x, done_at } : x)), () => updateMilestone(m.id, { done_at }))
  }

  function saveEdit(event) {
    event.preventDefault()
    const clean = editing.title.trim()
    if (!clean) return
    const changes = { title: clean, due_date: editing.due_date || null }
    const id = editing.id
    setEditing(null)
    save(items.map((x) => (x.id === id ? { ...x, ...changes } : x)), () => updateMilestone(id, changes))
  }

  function remove(m) {
    if (!window.confirm(`Delete the milestone "${m.title}"?`)) return
    save(items.filter((x) => x.id !== m.id), () => deleteMilestone(m.id))
  }

  // Drop the dragged milestone onto another one: it takes that one's place
  function moveOnto(draggedId, targetId) {
    if (!draggedId || draggedId === targetId) return
    const from = items.findIndex((x) => x.id === draggedId)
    const to = items.findIndex((x) => x.id === targetId)
    if (from < 0 || to < 0) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    const ordered = next.map((x, index) => ({ ...x, sort_order: index }))
    save(ordered, () => saveMilestoneOrder(ordered))
  }

  // Finger drag: the grip handle has touch-action: none, so it starts right away
  const touch = useTouchDrag({ holdMs: 0, onDrop: (m, targetId) => moveOnto(m.id, targetId) })

  if (items === null) return null
  // Nothing planned and it's not your project: don't show an empty box
  if (items.length === 0 && !isOwner) return null

  const today = todayLocal()
  const usedTitles = new Set(items.map((m) => m.title.toLowerCase()))
  const suggestions = MILESTONE_SUGGESTIONS.filter((s) => !usedTitles.has(s.toLowerCase())).slice(0, 6)

  return (
    <div className="card stack-sm">
      <div className="row-between">
        <h2 className="row"><Flag size={18} /> Milestones</h2>
        <MilestoneProgress milestones={items} />
      </div>

      {error && <small className="text-error">{error}</small>}
      {items.length === 0 && (
        <p className="muted small">Break the project into steps: plans, parts, and little wins along the way.</p>
      )}

      <ul className="ms-list">
        {items.map((m) => {
          const overdue = !m.done_at && m.due_date && m.due_date < today
          const lifted = mouseDragId === m.id || touch.ghost?.item.id === m.id
          const over = (mouseOverId === m.id || touch.overTarget === m.id) && !lifted

          if (editing?.id === m.id) {
            return (
              <li key={m.id} className="ms-item ms-item-editing">
                <form className="ms-edit" onSubmit={saveEdit}>
                  <input
                    autoFocus
                    maxLength={120}
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    aria-label="Milestone"
                  />
                  <input
                    type="date"
                    value={editing.due_date ?? ''}
                    onChange={(e) => setEditing({ ...editing, due_date: e.target.value })}
                    aria-label="Target date"
                  />
                  <span className="row">
                    <button type="button" className="icon-btn" onClick={() => setEditing(null)} aria-label="Cancel"><X size={16} /></button>
                    <button className="btn btn-xs btn-primary"><Check size={12} /> Save</button>
                  </span>
                </form>
              </li>
            )
          }

          return (
            <li
              key={m.id}
              data-drop-target={isOwner ? m.id : undefined}
              className={`ms-item ${m.done_at ? 'ms-item-done' : ''} ${lifted ? 'ms-item-lifted' : ''} ${over ? 'ms-item-over' : ''}`}
              onDragOver={(e) => {
                if (!isOwner || !e.dataTransfer.types.includes(MILESTONE_DRAG_TYPE)) return
                e.preventDefault()
                setMouseOverId(m.id)
              }}
              onDragLeave={() => setMouseOverId(null)}
              onDrop={(e) => {
                e.preventDefault()
                moveOnto(e.dataTransfer.getData(MILESTONE_DRAG_TYPE), m.id)
                setMouseDragId(null)
                setMouseOverId(null)
              }}
            >
              {isOwner && (
                <span
                  className="drag-handle ms-grip"
                  draggable
                  title="Drag to reorder"
                  onDragStart={(e) => {
                    e.dataTransfer.setData(MILESTONE_DRAG_TYPE, m.id)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setDragImage(e.currentTarget.closest('.ms-item'), 16, 16)
                    setMouseDragId(m.id)
                  }}
                  onDragEnd={() => { setMouseDragId(null); setMouseOverId(null) }}
                  onTouchStart={(e) => touch.handleTouchStart(e, m)}
                >
                  <GripVertical size={16} />
                </span>
              )}

              {isOwner ? (
                <button
                  className={`ms-check ${m.done_at ? 'ms-check-on' : ''}`}
                  onClick={() => toggleDone(m)}
                  role="checkbox"
                  aria-checked={Boolean(m.done_at)}
                  aria-label={m.done_at ? `Mark "${m.title}" as not done` : `Mark "${m.title}" as done`}
                >
                  {m.done_at && <Check size={14} strokeWidth={3} />}
                </button>
              ) : (
                <span className={`ms-check ms-check-readonly ${m.done_at ? 'ms-check-on' : ''}`} aria-hidden="true">
                  {m.done_at && <Check size={14} strokeWidth={3} />}
                </span>
              )}

              <span className="ms-text">
                <span className="ms-title">{m.title}</span>
                {(m.done_at || m.due_date) && (
                  <small className={`ms-meta ${overdue ? 'ms-meta-late' : ''}`}>
                    {m.done_at
                      ? <>Done {shortDay(toLocalDateString(new Date(m.done_at)))}</>
                      : <><CalendarDays size={11} /> {overdue ? 'Planned for' : 'By'} {shortDay(m.due_date)}</>}
                  </small>
                )}
              </span>

              {isOwner && (
                <span className="ms-actions">
                  <button className="icon-btn" onClick={() => setEditing({ id: m.id, title: m.title, due_date: m.due_date })} aria-label={`Edit "${m.title}"`} title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button className="icon-btn" onClick={() => remove(m)} aria-label={`Delete "${m.title}"`} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {/* Add a milestone (owner only) */}
      {isOwner && (
        <>
          <form className="ms-add" onSubmit={handleAdd}>
            <input
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a milestone, e.g. Finish the back panel"
              aria-label="New milestone"
            />
            {showDate ? (
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Target date (optional)" />
            ) : (
              <button type="button" className="icon-btn" onClick={() => setShowDate(true)} aria-label="Add a target date" title="Add a target date">
                <CalendarDays size={16} />
              </button>
            )}
            <button className="btn btn-primary btn-sm" disabled={!title.trim()}><Plus size={14} /> Add</button>
          </form>
          {suggestions.length > 0 && (
            <div className="ms-suggestions">
              <small className="muted">Quick add:</small>
              {suggestions.map((s) => (
                <button key={s} type="button" className="chip chip-sm" onClick={() => handleAdd(null, s)}>
                  <Plus size={11} /> {s}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* The milestone that follows your finger while dragging */}
      {touch.ghost && (
        <div className="drag-ghost" style={{ left: touch.ghost.x, top: touch.ghost.y }} aria-hidden="true">
          <GripVertical size={16} />
          <strong>{touch.ghost.item.title}</strong>
        </div>
      )}
    </div>
  )
}
