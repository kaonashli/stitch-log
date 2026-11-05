// "Stitch calendar": the last few months as small month calendars made of dots.
//  - One project selected: each day's dot is colored by that project's status that day.
//  - All projects: dots get darker the more projects were in progress that day.
import { STATUSES, statusLabel } from '../../lib/constants.js'
import { daysInclusive, parseLocalDate, toLocalDateString, todayLocal } from '../../lib/dates.js'

const MONTHS_SHOWN = 6
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// What status was this project in on this day? null = not being worked on.
export function statusOnDay(project, day, today) {
  if (day < project.start_date || day > today) return null
  if (project.finish_date && day > project.finish_date) return null
  const done = (s) => s === 'finished' || s === 'frogged'

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

// The months to draw, oldest first: [{ year, month }] (month is 0-11)
function recentMonths() {
  const now = new Date()
  const months = []
  for (let i = MONTHS_SHOWN - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() })
  }
  return months
}

function MonthGrid({ year, month, renderDay }) {
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(<span key={`blank-${i}`} className="cal-dot cal-blank" />)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(renderDay(toLocalDateString(new Date(year, month, d)), d))
  }
  const name = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  return (
    <div className="cal-month">
      <div className="cal-month-name">{name}</div>
      <div className="cal-grid">
        {WEEKDAYS.map((w, i) => <span key={i} className="cal-weekday">{w}</span>)}
        {cells}
      </div>
    </div>
  )
}

export default function CalendarWidget({ projects, settings, editable, onSettingsChange }) {
  const today = todayLocal()
  const projectId = settings?.projectId ?? 'all'
  const selected = projects.find((p) => p.id === projectId) ?? null
  const months = recentMonths()

  // ----- How each day looks -----
  function renderDay(day, dayNumber) {
    const isToday = day === today ? ' cal-today' : ''
    const label = parseLocalDate(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

    if (selected) {
      const status = statusOnDay(selected, day, today)
      return (
        <span
          key={day}
          className={`cal-dot${status ? ` status-bg-${status}` : ''}${isToday}`}
          title={status ? `${label}: ${statusLabel(status)}` : label}
        >{dayNumber}</span>
      )
    }

    const active = projects.filter((p) => statusOnDay(p, day, today) === 'in_progress')
    const level = Math.min(active.length, 3) // 0-3 intensity
    return (
      <span
        key={day}
        className={`cal-dot${level ? ` cal-level-${level}` : ''}${isToday}`}
        title={active.length ? `${label}: ${active.map((p) => p.title).join(', ')}` : label}
      >{dayNumber}</span>
    )
  }

  // ----- Summary line -----
  let summary
  if (selected) {
    const end = selected.finish_date && selected.finish_date < today ? selected.finish_date : today
    const total = selected.start_date <= end ? daysInclusive(selected.start_date, end) : 0
    // Count days actually spent "in progress" (paused days don't count)
    let worked = 0
    for (let i = 0; i < total; i++) {
      const d = parseLocalDate(selected.start_date)
      d.setDate(d.getDate() + i)
      if (statusOnDay(selected, toLocalDateString(d), today) === 'in_progress') worked++
    }
    summary = `${statusLabel(selected.status)} · ${worked} day${worked === 1 ? '' : 's'} in progress · ${total} day${total === 1 ? '' : 's'} since start`
  } else {
    const activeNow = projects.filter((p) => p.status === 'in_progress').length
    summary = `${activeNow} project${activeNow === 1 ? '' : 's'} in progress right now`
  }

  return (
    <div className="stack-sm">
      <div className="row-between wrap">
        {editable ? (
          <select
            className="select-sm"
            value={projectId}
            onChange={(e) => onSettingsChange({ ...settings, projectId: e.target.value })}
            aria-label="Project shown in calendar"
          >
            <option value="all">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        ) : (
          <strong>{selected ? selected.title : 'All projects'}</strong>
        )}
        <small className="muted">{summary}</small>
      </div>

      <div className="cal-months">
        {months.map((m) => <MonthGrid key={`${m.year}-${m.month}`} year={m.year} month={m.month} renderDay={renderDay} />)}
      </div>

      <div className="cal-legend">
        {selected ? (
          STATUSES.map((s) => (
            <span key={s.value}><span className={`cal-dot cal-legend-dot status-bg-${s.value}`} />{s.label}</span>
          ))
        ) : (
          <>
            <span className="muted">Fewer</span>
            <span className="cal-dot cal-legend-dot" />
            <span className="cal-dot cal-legend-dot cal-level-1" />
            <span className="cal-dot cal-legend-dot cal-level-2" />
            <span className="cal-dot cal-legend-dot cal-level-3" />
            <span className="muted">More projects in progress</span>
          </>
        )}
      </div>
    </div>
  )
}
