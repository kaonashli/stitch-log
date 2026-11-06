// "Focus project" widget: shows off the one project you starred as your
// focus (the Star button on a project's page). Big picture, status, and
// how long you've been working on it.
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { colorVar } from '../../lib/projectLooks.js'
import { daysInclusive, formatDate, todayLocal } from '../../lib/dates.js'
import { startDateLabel } from '../../lib/projectStatus.js'
import StatusBadge from '../StatusBadge.jsx'
import ProjectIcon from '../ProjectIcon.jsx'
import MilestoneProgress from '../MilestoneProgress.jsx'

export default function FocusWidget({ projects, focusId, editable }) {
  const project = projects.find((p) => p.id === focusId)

  if (!project) {
    return (
      <p className="muted">
        {editable
          ? 'No focus project yet. Open one of your projects and tap "Make focus" to star it here.'
          : 'Nothing starred yet.'}
      </p>
    )
  }

  const today = todayLocal()
  const working = project.start_date && project.start_date <= today && !project.finish_date
  const days = working ? daysInclusive(project.start_date, today) : null

  return (
    <Link to={`/projects/${project.id}`} className="focus-card">
      <div className="focus-cover" style={{ '--pc': colorVar(project.color) }}>
        {project.coverUrl
          ? <img src={project.coverUrl} alt="" loading="lazy" />
          : <ProjectIcon icon={project.icon} color={project.color} size={88} className="project-icon-cover" />}
        <span className="focus-star" aria-label="Focus project"><Star size={14} fill="currentColor" /> Focus</span>
      </div>
      <div className="focus-body">
        <strong className="focus-title">{project.title}</strong>
        <span className="row muted">
          <StatusBadge status={project.status} />
          <span>{project.craft_types?.name}</span>
        </span>
        {project.start_date && (
          <small className="muted">
            {startDateLabel(project.status)} {formatDate(project.start_date)}
            {days && ` · day ${days}`}
          </small>
        )}
        {/* Milestones: how far along, and what's next */}
        <MilestoneProgress milestones={project.project_milestones} showNext />
        {project.description && <p className="focus-description">{project.description}</p>}
      </div>
    </Link>
  )
}
