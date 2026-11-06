// A small progress bar for a project's milestones: "3/7" with a bar.
// Shows nothing if the project has no milestones.
import { milestoneProgress } from '../lib/milestones.js'

export default function MilestoneProgress({ milestones, showNext = false }) {
  const { done, total, next } = milestoneProgress(milestones)
  if (total === 0) return null
  const percent = Math.round((done / total) * 100)
  return (
    <span className="ms-progress" title={`${done} of ${total} milestones done`}>
      <span className="ms-progress-row">
        <span className="ms-progress-track" aria-hidden="true">
          <span className="ms-progress-fill" style={{ width: `${percent}%` }} />
        </span>
        <small className="ms-progress-count">{done}/{total}</small>
      </span>
      {showNext && next && <small className="muted ms-progress-next">Next: {next.title}</small>}
      {showNext && !next && <small className="ms-progress-next ms-progress-all">All milestones done!</small>}
    </span>
  )
}
