// "Project timeline" widget: one row per project, with a bar running from the
// day it started to the day it finished (or today, if it's still going).
// The bar is colored by what the project was doing on each day (idea, in
// progress, paused...), using its status history, so you can see at a glance
// how long each project took and when it was put aside.
//
// (The widget type is still called 'calendar' in the database; it used to be
// a dot calendar.)
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { STATUSES, statusLabel } from '../../lib/constants.js'
import { daysInclusive, formatDate, parseLocalDate, toLocalDateString, todayLocal } from '../../lib/dates.js'
import ProjectIcon from '../ProjectIcon.jsx'

// How far back the timeline can look (saved in the widget's settings)
const RANGES = [
  { value: '3m', label: '3 months', months: 3 },
  { value: '6m', label: '6 months', months: 6 },
  { value: '12m', label: '1 year', months: 12 },
  { value: '24m', label: '2 years', months: 24 },
  { value: '60m', label: '5 years', months: 60 },
]

// Long ranges would be crowded with a label for every month, so label
// every 3rd month (2 years) or only January (5 years)
function monthLabelStep(months) {
  if (months <= 12) return 1
  if (months <= 24) return 3
  return 12
}

// How many days a project spent paused (each pause is a "Paused" stretch in its history)
function pausedDays(segments) {
  return segments
    .filter((s) => s.status === 'paused')
    .reduce((sum, s) => sum + daysInclusive(s.from, s.to), 0)
}

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
  // Marked finished/frogged in the history, but this day is still before the
  // end of the bar (e.g. the finish date was changed later). There must be no
  // gap between start and finish, so count it as in progress. Only the last
  // day shows how it ended (when there's a finish date, that's handled above).
  if (done(entry.status)) {
    if (!project.finish_date && entry.day === day) return entry.status
    return 'in_progress'
  }
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

// The "Choose projects" panel (sliders button in the widget header).
// settings.projectIds: missing = all projects (sorted by start date, new ones
// appear by themselves); a list = only those projects, in that order.
function TimelineSettings({ projects, settings, onSettingsChange }) {
  const picked = Array.isArray(settings?.projectIds)
    ? settings.projectIds.map((id) => projects.find((p) => p.id === id)).filter(Boolean)
    : null
  const others = picked ? projects.filter((p) => !picked.some((x) => x.id === p.id)) : []

  function save(list) {
    onSettingsChange({ ...settings, projectIds: list.map((p) => p.id) })
  }

  function move(index, direction) {
    const target = index + direction
    if (target < 0 || target >= picked.length) return
    const next = [...picked]
    ;[next[index], next[target]] = [next[target], next[index]]
    save(next)
  }

  return (
    <div className="kanban-settings timeline-settings">
      {/* Two-option switch: all projects, or only the ones you pick */}
      <div className="segmented" role="radiogroup" aria-label="Which projects to show">
        <button
          type="button"
          role="radio"
          aria-checked={!picked}
          className={`segmented-option ${!picked ? 'segmented-option-on' : ''}`}
          onClick={() => {
            if (!picked) return
            const rest = { ...settings }
            delete rest.projectIds
            onSettingsChange(rest)
          }}
        >
          All projects
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={Boolean(picked)}
          className={`segmented-option ${picked ? 'segmented-option-on' : ''}`}
          // start from what's shown now, oldest start first
          onClick={() => {
            if (!picked) save([...projects].filter((p) => p.start_date).sort((a, b) => a.start_date.localeCompare(b.start_date)))
          }}
        >
          Pick projects
        </button>
      </div>
      {!picked && <small className="muted">Every project, oldest first. New ones show up by themselves.</small>}

      {picked && (
        <>
          <small className="muted">Shown, top to bottom (untick to hide, arrows to reorder)</small>
          {picked.length === 0 && <small className="muted">None yet. Tick projects below.</small>}
          {picked.map((p, index) => (
            <div key={p.id} className="kanban-settings-row">
              <label>
                <input type="checkbox" checked onChange={() => save(picked.filter((x) => x.id !== p.id))} />
                <span>{p.title}</span>
              </label>
              <button type="button" className="icon-btn" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${p.title} up`}>
                <ArrowUp size={15} />
              </button>
              <button type="button" className="icon-btn" onClick={() => move(index, 1)} disabled={index === picked.length - 1} aria-label={`Move ${p.title} down`}>
                <ArrowDown size={15} />
              </button>
            </div>
          ))}
          {others.length > 0 && <small className="muted">Hidden</small>}
          {others.map((p) => (
            <div key={p.id} className="kanban-settings-row">
              <label>
                <input type="checkbox" checked={false} onChange={() => save([...picked, p])} />
                <span className="muted">{p.title}{!p.start_date && ' (no start date yet)'}</span>
              </label>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export default function CalendarWidget({ projects, settings, editable, onSettingsChange, customizing = false }) {
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

  // Month labels along the top (with the year on long ranges)
  const step = monthLabelStep(range.months)
  const months = []
  for (let i = 0; i < range.months; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1)
    const labelled = step === 12 ? d.getMonth() === 0 : i % step === 0
    const label = range.months > 12
      ? d.toLocaleDateString(undefined, step === 12 ? { year: 'numeric' } : { month: 'short', year: '2-digit' })
      : d.toLocaleDateString(undefined, { month: 'short' })
    months.push({ day: toLocalDateString(d), label, labelled })
  }

  // Which projects, in which order: the ones you picked (in your order), or
  // all of them, oldest start first. Either way only projects that overlap
  // the visible range get a row (ideas without a start date have nothing to show).
  const picked = Array.isArray(settings?.projectIds)
  const chosen = picked
    ? settings.projectIds.map((id) => projects.find((p) => p.id === id)).filter(Boolean)
    : [...projects].filter((p) => p.start_date).sort((a, b) => a.start_date.localeCompare(b.start_date))
  const rows = chosen
    .filter((p) => p.start_date && p.start_date <= today && lastDay(p, today) >= rangeStart)
    .map((p) => ({ project: p, segments: segmentsFor(p, rangeStart, today), end: lastDay(p, today) }))

  return (
    <div className="stack-sm">
      {customizing && editable && (
        <TimelineSettings projects={projects} settings={settings} onSettingsChange={onSettingsChange} />
      )}
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
        <p className="muted">{picked ? 'None of the projects you picked are in this time range.' : 'No projects in this time range.'}</p>
      ) : (
        <div className="timeline">
          {/* Month labels + faint lines down the timeline */}
          <div className="timeline-axis">
            <span className="timeline-label-spacer" />
            <div className="timeline-axis-track">
              {/* (month names too close to the right edge would bump into "Today") */}
              {months.filter((m) => m.labelled && position(m.day) < 88).map((m) => (
                <span key={m.day} className="timeline-month" style={{ left: `${position(m.day)}%` }}>{m.label}</span>
              ))}
              <span className="timeline-today">Today</span>
            </div>
          </div>

          {rows.map(({ project, segments, end }) => {
            const isDone = done(project.status)
            const days = daysInclusive(project.start_date, end)
            const startsBefore = project.start_date < rangeStart // started before what's shown
            const paused = pausedDays(segments)
            return (
              <Link key={project.id} to={`/projects/${project.id}`} className="timeline-row">
                <span className="timeline-label">
                  <ProjectIcon icon={project.icon} color={project.color} size={22} />
                  <span className="timeline-label-text">
                    <strong>{project.title}</strong>
                    <small className="muted">
                      {shortDate(project.start_date)} {isDone ? `to ${shortDate(end)}` : 'to now'} · {days} day{days === 1 ? '' : 's'}
                      {paused > 0 && <span className="timeline-paused-note"> · paused {paused} day{paused === 1 ? '' : 's'}</span>}
                    </small>
                  </span>
                </span>
                <span className="timeline-track">
                  {months.filter((m) => m.labelled).map((m) => (
                    <span key={m.day} className="timeline-gridline" style={{ left: `${position(m.day)}%` }} />
                  ))}
                  {segments.map((s, i) => (
                    <span
                      key={s.from}
                      className={`timeline-seg status-bg-${s.status} ${s.status === 'paused' ? 'timeline-seg-paused' : ''} ${i === 0 && !startsBefore ? 'timeline-seg-first' : ''} ${i === segments.length - 1 ? 'timeline-seg-last' : ''}`}
                      style={{ left: `${position(s.from)}%`, width: `${Math.max(position(addDays(s.to, 1)) - position(s.from), 0.8)}%` }}
                      title={`${statusLabel(s.status)}: ${formatDate(s.from)} to ${formatDate(s.to)}`}
                    />
                  ))}
                  {/* A little diamond for each milestone done inside the visible range */}
                  {(project.project_milestones ?? [])
                    .filter((m) => m.done_at)
                    .map((m) => ({ ...m, day: toLocalDateString(new Date(m.done_at)) }))
                    .filter((m) => m.day >= rangeStart && m.day >= project.start_date && m.day <= end)
                    .map((m) => (
                      <span
                        key={m.id}
                        className="timeline-milestone"
                        style={{ left: `${position(m.day)}%` }}
                        title={`Milestone: ${m.title} (${formatDate(m.day)})`}
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
        {/* Paused stretches are striped, so the breaks stand out */}
        {STATUSES.map((s) => (
          <span key={s.value}><span className={`timeline-legend-dot status-bg-${s.value} ${s.value === 'paused' ? 'timeline-seg-paused' : ''}`} />{s.label}</span>
        ))}
        <span><span className="timeline-milestone timeline-milestone-legend" />Milestone done</span>
      </div>
    </div>
  )
}
