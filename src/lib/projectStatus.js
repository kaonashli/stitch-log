// What else changes when a project moves to another status.
// Used everywhere a status can change: the project board, the status
// dropdown on the project page, the status page, and the project form.
//
//   - Ideas have a PLANNED start date (it can be empty). When an idea moves
//     on (to In progress, Paused, ...), the start date becomes today: that's
//     the day work really started. From then on a start date is required.
//   - Moving to Finished sets the finish date to today.
import { todayLocal } from './dates.js'

// project = the project as it is now; returns the fields to save,
// e.g. { status: 'finished', finish_date: '2026-11-06' }
export function statusChangeFields(project, newStatus) {
  const today = todayLocal()
  const changes = { status: newStatus }
  if (newStatus === project.status) return changes

  // Leaving "Idea": work starts today
  if (project.status === 'idea' && newStatus !== 'idea') changes.start_date = today
  const start = changes.start_date ?? project.start_date

  // Finished today (but never before the start date)
  if (newStatus === 'finished') changes.finish_date = start && start > today ? start : today

  // An old finish date from before the new start date can't stay
  const finish = changes.finish_date ?? project.finish_date
  if (finish && start && finish < start) changes.finish_date = null

  return changes
}

// The label for the start date: ideas only have a planned one
export function startDateLabel(status) {
  return status === 'idea' ? 'Planned start' : 'Started'
}
