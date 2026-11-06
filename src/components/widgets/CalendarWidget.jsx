// "Project timeline" widget: one row per project, with a bar running from the
// day it started to the day it finished (or today, if it's still going).
// The bar is colored by what the project was doing on each day (idea, in
// progress, paused...), using its status history, so you can see at a glance
// how long each project took and when it was put aside.
//
// (The widget type is still called 'calendar' in the database; it used to be
// a dot calendar.)
import { Link } from 'react-router-dom'
import { STATUSES, statusLabel } from '../../lib/constants.js'
import { daysInclusive, formatDate, parseLocalDate, toLocalDateString, todayLocal } from '../../lib/dates.js'
import ProjectIcon from '../ProjectIcon.jsx'

// How far back the timeline can look (saved in the widget's settings)
const RANGES = [
  { value: '3m', label: '3 months', months: 3 },
  { value: '6m', label: '6 months', months: 6 },
  { value: '12m', label: '1 year', months: 12 },
]

const done = (status) => status === 'finished' || status === 'frogged'

// What status was this project in on this day? null = not being worked on.
export function statusOnDay(project, day, today) {
  if (day < project.start_date || day > today) return null
  if (project.finish_date && day > project.finish_date) return null

  // The finish day itself shows the final status
  if (project.finish_date && day === project.finish_date && done(project.status)) return project.status

  // Find the latest status change on or before this day
  let entry = null
  for (const h of project.history) {
    if (h.day <= day) entry = h
    else break
  }

  if (!entry) {
    // Before anything was recorded (a project logged with an older start date).
    // If it was logged as already done, assume they were working on it until then.
    const first = project.history[0]?.status ?? project.status
    return done(first) ? 'in_progress' : first
  }
  // After finishing/frogging, the project no longer shows up
  if (done(entry.status)) return entry.day === day ? entry.status : null
  return entry.status
}

// The last day a project shows on the timeline (finish day, or today)
function lastDay(project, today) {
  if (project.finish_date) return project.finish_date < today ? project.finish_date : today
  if (done(project.status)) {
    const doneEntry = [...project.history].reverse().find((h) => done(h.status))
    if (doneEntry) return doneEntry.day
  }
  return today
}

// 'Mar 5' (no year, to keep the labels short)
function shortDate(dayString) {
  return parseLocalDate(dayString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function addDays(dayString, n) {
  const d = parseLocalDate(dayString)
  d.setDate(d.getDate() + n)
  return toLocalDateString(d)
}

// Split a project's days (within the visible range) into runs of the same status
function segmentsFor(project, rangeStart, today) {
  const from = project.start_date > rangeStart ? project.start_date : rangeStart
  const to = lastDay(project, today)
  const segments = []
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const status = statusOnDay(project, day, today)
    const last = segments[segments.length - 1]
    if (status && last && last.status === status && last.to === addDays(day, -1)) last.to = day
    else if (status) segments.push({ status, from: day, to: day })
  }
  return segments
}

export default function CalendarWidget({ projects, settings, editable, onSettingsChange }) {
  const today = todayLocal()
  const range = RANGES.find((r) => r.value === settings?.range) ?? RANGES[1] // 6 months by default

  // The timeline starts on the 1st of the month, N months back
  const startDate = new Date()
  startDate.setDate(1)
  startDate.setMonth(startDate.getMonth() - (range.months - 1))
  const rangeStart = toLocalDateString(startDate)
  const totalDays = daysInclusive(rangeStart, today)

  // Position of a day across the timeline, as a percentage of the width
  const position = (day) => ((daysInclusive(rangeStart, day) - 1) / totalDays) * 100

  // Month labels along the top
  const months = []
  for (let i = 0; i < range.months; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1)
    months.push({ day: toLocalDateString(d), label: d.toLocaleDateString(undefined, { month: 'short' }) })
  }

  // Projects that overlap the visible range, oldest start first
  const rows = projects
    .filter((p) => p.start_date <= today && lastDay(p, today) >= rangeStart)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .map((p) => ({ project: p, segments: segmentsFor(p, rangeStart, today), end: lastDay(p, today) }))

  return (
    <div className="stack-sm">
      <div className="row-between wrap">
        <small className="muted">From the day each project started to the day it finished.</small>
        {editable ? (
          <select
            className="select-sm"
            value={range.value}
            onChange={(e) => onSettingsChange({ ...settings, range: e.target.value })}
            aria-label="Time range"
          >
            {RANGES.map((r) => <option key={r.value} value={r.value}>Last {r.label}</option>)}
          </select>
        ) : (
          <small className="muted">Last {range.label}</small>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="muted">No projects in this time range.</p>
      ) : (
        <div className="timeline">
          {/* Month labels + faint lines down the timeline */}
          <div className="timeline-axis">
            <span className="timeline-label-spacer" />
            <div className="timeline-axis-track">
              {/* (month names too close to the right edge would bump into "Today") */}
              {months.filter((m) => position(m.day) < 88).map((m) => (
                <span key={m.day} className="timeline-month" style={{ left: `${position(m.day)}%` }}>{m.label}</span>
              ))}
              <span className="timeline-today">Today</span>
            </div>
          </div>

          {rows.map(({ project, segments, end }) => {
            const isDone = done(project.status)
            const days = daysInclusive(project.start_date, end)
            const startsBefore = project.start_date < rangeStart // started before what's shown
            return (
              <Link key={project.id} to={`/projects/${project.id}`} className="timeline-row">
                <span className="timeline-label">
                  <ProjectIcon icon={project.icon} color={project.color} size={22} />
                  <span className="timeline-label-text">
                    <strong>{project.title}</strong>
                    <small className="muted">
                      {shortDate(project.start_date)} {isDone ? `to ${shortDate(end)}` : 'to now'} · {days} day{days === 1 ? '' : 's'}
                    </small>
                  </span>
                </span>
                <span className="timeline-track">
                  {months.map((m) => (
                    <span key={m.day} className="timeline-gridline" style={{ left: `${position(m.day)}%` }} />
                  ))}
                  {segments.map((s, i) => (
                    <span
                      key={s.from}
                      className={`timeline-seg status-bg-${s.status} ${i === 0 && !startsBefore ? 'timeline-seg-first' : ''} ${i === segments.length - 1 ? 'timeline-seg-last' : ''}`}
                      style={{ left: `${position(s.from)}%`, width: `${Math.max(position(addDays(s.to, 1)) - position(s.from), 0.8)}%` }}
                      title={`${statusLabel(s.status)}: ${formatDate(s.from)} to ${formatDate(s.to)}`}
                    />
                  ))}
                  {/* Start knot, and an end cap for finished / frogged projects */}
                  {!startsBefore && segments.length > 0 && (
                    <span className="timeline-knot" style={{ left: `${position(project.start_date)}%` }} />
                  )}
                  {isDone && segments.length > 0 && (
                    <span
                      className={`timeline-end timeline-end-${project.status}`}
                      style={{ left: `${position(addDays(end, 1))}%` }}
                      title={`${statusLabel(project.status)} ${formatDate(end)}`}
                    />
                  )}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      <div className="cal-legend">
        {STATUSES.map((s) => (
          <span key={s.value}><span className={`timeline-legend-dot status-bg-${s.value}`} />{s.label}</span>
        ))}
      </div>
    </div>
  )
}
