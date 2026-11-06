// "My projects": a grid of your projects with a status filter.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { getPhotoUrls } from '../lib/images.js'
import { formatDate } from '../lib/dates.js'
import { STATUSES } from '../lib/constants.js'
import { useAuth } from '../context/AuthContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import ProjectIcon from '../components/ProjectIcon.jsx'
import { colorVar } from '../lib/projectLooks.js'
import Spinner from '../components/Spinner.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [coverUrls, setCoverUrls] = useState({}) // projectId -> image url
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      // Supabase can "embed" related rows: craft_types(name) follows the
      // craft_type_id foreign key, project_photos(...) gets each project's photos.
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, status, start_date, finish_date, icon, color, craft_types(name), project_photos(storage_path, sort_order)')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      setProjects(data)
      setLoading(false)

      // Use the first photo of each project as its cover
      const covers = {}
      for (const project of data) {
        const sorted = [...project.project_photos].sort((a, b) => a.sort_order - b.sort_order)
        if (sorted[0]) covers[project.id] = sorted[0].storage_path
      }
      const urls = await getPhotoUrls(Object.values(covers))
      const byProject = {}
      for (const [projectId, path] of Object.entries(covers)) byProject[projectId] = urls[path]
      setCoverUrls(byProject)
    }
    load()
  }, [user.id])

  const shown = filter === 'all' ? projects : projects.filter((p) => p.status === filter)

  return (
    <div>
      <div className="page-header">
        <h1>My projects</h1>
        <Link to="/projects/new" className="btn btn-primary"><Plus size={16} /> New project</Link>
      </div>

      <div className="chips">
        <button className={`chip ${filter === 'all' ? 'chip-active' : ''}`} onClick={() => setFilter('all')}>
          All ({projects.length})
        </button>
        {STATUSES.map((s) => (
          <button key={s.value} className={`chip ${filter === s.value ? 'chip-active' : ''}`} onClick={() => setFilter(s.value)}>
            {s.label} ({projects.filter((p) => p.status === s.value).length})
          </button>
        ))}
      </div>

      <ErrorMessage message={error} />
      {loading && <Spinner />}

      {!loading && shown.length === 0 && (
        <div className="empty card">
          <p>No projects here yet.</p>
          <Link to="/projects/new" className="btn btn-primary"><Plus size={16} /> Add your first project</Link>
        </div>
      )}

      <div className="project-grid">
        {shown.map((project) => (
          <Link key={project.id} to={`/projects/${project.id}`} className="project-card card">
            {/* First photo as the cover; no photos = the project's icon on its color */}
            <div className="project-card-cover" style={{ '--pc': colorVar(project.color) }}>
              {coverUrls[project.id]
                ? <img src={coverUrls[project.id]} alt="" loading="lazy" />
                : <ProjectIcon icon={project.icon} color={project.color} size={72} className="project-icon-cover" />}
            </div>
            <div className="project-card-body">
              <div className="row-between">
                <strong>{project.title}</strong>
                <StatusBadge status={project.status} />
              </div>
              <small className="muted">
                {project.craft_types?.name} · Started {formatDate(project.start_date)}
                {project.finish_date && ` · Finished ${formatDate(project.finish_date)}`}
              </small>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
