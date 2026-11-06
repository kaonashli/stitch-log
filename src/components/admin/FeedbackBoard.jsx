// Admin: bug reports and change requests on a mini kanban.
// Drag a card to another column (mouse, or press-and-hold on a phone), or use
// the dropdown inside an opened card. Click a card to see its details.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bug, ChevronDown, ChevronUp, Lightbulb, Trash2 } from 'lucide-react'
import {
  FEEDBACK_STATUSES, deleteFeedback, feedbackKindLabel, loadAllFeedback, setFeedbackStatus,
} from '../../lib/feedback.js'
import { formatDate, toLocalDateString } from '../../lib/dates.js'
import { useTouchDrag } from '../../lib/useTouchDrag.js'
import Avatar from '../Avatar.jsx'
import Spinner from '../Spinner.jsx'
import ErrorMessage from '../ErrorMessage.jsx'

const REPORT_DRAG_TYPE = 'application/x-stitchlog-report'
const KIND_ICONS = { bug: Bug, change: Lightbulb }

export default function FeedbackBoard({ onChange }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null) // the card showing its details
  const [mouseOver, setMouseOver] = useState(null)

  async function reload() {
    try {
      setReports(await loadAllFeedback())
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  useEffect(() => { reload() }, [])

  async function moveTo(report, status) {
    if (report.status === status) return
    setError('')
    // Move it on screen right away, then save (put it back if that fails)
    setReports((all) => all.map((r) => (r.id === report.id ? { ...r, status } : r)))
    try {
      await setFeedbackStatus(report.id, status)
      onChange?.()
    } catch (err) {
      setError(err.message)
      setReports((all) => all.map((r) => (r.id === report.id ? { ...r, status: report.status } : r)))
    }
  }

  async function handleDelete(report) {
    if (!window.confirm(`Delete "${report.title}"?`)) return
    try {
      await deleteFeedback(report.id)
      setReports((all) => all.filter((r) => r.id !== report.id))
      onChange?.()
    } catch (err) {
      setError(err.message)
    }
  }

  const touch = useTouchDrag({ holdMs: 300, onDrop: (report, status) => moveTo(report, status) })

  if (loading) return <Spinner />

  return (
    <div className="stack-sm">
      <ErrorMessage message={error} />
      <small className="muted">
        Reports sent from the Release notes page. Drag a card to move it
        <span className="touch-only-inline"> (press and hold on a phone)</span>, or open it to change its column.
      </small>

      <div className="kanban" style={{ '--kanban-cols': FEEDBACK_STATUSES.length }}>
        {FEEDBACK_STATUSES.map((column) => {
          const items = reports.filter((r) => r.status === column.value)
          const isOver = mouseOver === column.value || touch.overTarget === column.value
          return (
            <div
              key={column.value}
              data-drop-target={column.value}
              className={`kanban-column ${isOver ? 'kanban-column-over' : ''}`}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(REPORT_DRAG_TYPE)) return
                e.preventDefault()
                setMouseOver(column.value)
              }}
              onDragLeave={() => setMouseOver(null)}
              onDrop={(e) => {
                e.preventDefault()
                setMouseOver(null)
                const report = reports.find((r) => r.id === e.dataTransfer.getData(REPORT_DRAG_TYPE))
                if (report) moveTo(report, column.value)
              }}
            >
              <div className="kanban-column-title feedback-column-title">
                {column.label}
                <span className="muted">{items.length}</span>
              </div>

              {items.map((report) => {
                const KindIcon = KIND_ICONS[report.kind] ?? Bug
                const open = openId === report.id
                return (
                  <div
                    key={report.id}
                    className={`feedback-card ${touch.ghost?.item.id === report.id ? 'kanban-card-lifted' : ''}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData(REPORT_DRAG_TYPE, report.id)}
                    onTouchStart={(e) => touch.handleTouchStart(e, report)}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <button
                      className="feedback-card-head"
                      onClick={() => { if (!touch.justDragged()) setOpenId(open ? null : report.id) }}
                      aria-expanded={open}
                    >
                      <span className={`badge feedback-kind feedback-kind-${report.kind}`}>
                        <KindIcon size={11} /> {feedbackKindLabel(report.kind)}
                      </span>
                      <strong>
                        {/* Short ID number, handy for talking about a report */}
                        {report.number && <span className="feedback-number">#{report.number}</span>}
                        {report.title}
                      </strong>
                      <small className="muted">
                        From {report.reporter ? report.reporter.display_name : `${report.guest_name} (guest)`} · {formatDate(toLocalDateString(new Date(report.created_at)))}
                      </small>
                      {open ? <ChevronUp size={14} className="feedback-chevron" /> : <ChevronDown size={14} className="feedback-chevron" />}
                    </button>

                    {open && (
                      <div className="feedback-card-details">
                        {report.details ? <p className="prose">{report.details}</p> : <p className="muted">No details.</p>}
                        {/* Who sent it: an account, or a guest with their name (and email if given) */}
                        {report.reporter ? (
                          <Link to={`/u/${report.reporter.username}`} className="row feedback-reporter">
                            <Avatar profile={report.reporter} size={22} />
                            <small>From {report.reporter.display_name} (@{report.reporter.username})</small>
                          </Link>
                        ) : (
                          <span className="feedback-reporter stack-sm">
                            <small>From {report.guest_name} <span className="badge badge-soft">Guest</span></small>
                            {report.guest_email
                              ? <small><a href={`mailto:${report.guest_email}`}>{report.guest_email}</a></small>
                              : <small className="muted">No email given</small>}
                          </span>
                        )}
                        <div className="row-between">
                          <select
                            className="select-sm"
                            value={report.status}
                            onChange={(e) => moveTo(report, e.target.value)}
                            aria-label="Column"
                          >
                            {FEEDBACK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                          <button className="icon-btn" onClick={() => handleDelete(report)} aria-label="Delete report" title="Delete report">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* The card that follows your finger during a touch drag */}
      {touch.ghost && (
        <div className="drag-ghost" style={{ left: touch.ghost.x, top: touch.ghost.y }} aria-hidden="true">
          <strong>{touch.ghost.item.number && `#${touch.ghost.item.number} `}{touch.ghost.item.title}</strong>
        </div>
      )}
    </div>
  )
}
