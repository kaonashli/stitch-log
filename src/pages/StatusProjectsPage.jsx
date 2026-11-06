// /projects/status/:status - every project you have in one status (e.g. all
// your Ideas). Opened by tapping a column title on your project board.
// Here you can:
//   - add a project straight into this status
//   - move a project to another status (it leaves this list)
//   - edit or delete (move to Recently deleted) a project
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { getPhotoUrls } from '../lib/images.js'
import { formatDate } from '../lib/dates.js'
import { STATUSES, statusLabel } from '../lib/constants.js'
import { startDateLabel, statusChangeFields } from '../lib/projectStatus.js'
import { DELETE_AFTER_DAYS, moveToTrash } from '../lib/trash.js'
import { useAuth } from '../context/AuthContext.jsx'
import ProjectIcon from '../components/ProjectIcon.jsx'
import Spinner from '../components/Spinner.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'

export default function StatusProjectsPage() {
  const { status } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [coverUrls, setCoverUrls] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const known = STATUSES.some((s) => s.value === status)

  useEffect(() => {
    if (!known) return
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, status, start_date, finish_date, icon, color, craft_types(name), project_photos(storage_path, is_cover)')
        .eq('user_id', user.id)
        .eq('status', status)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      setProjects(data)
      setLoading(false)
      // Starred main images
      const covers = {}
      for (const p of data) {
        const cover = p.project_photos.find((photo) => photo.is_cover)
        if (cover) covers[p.id] = cover.storage_path
      }
      const urls = await getPhotoUrls(Object.values(covers))
      const byProject = {}
      for (const [id, path] of Object.entries(covers)) byProject[id] = urls[path]
      setCoverUrls(byProject)
    }
    load()
  }, [status, known, user.id])

  if (!known) return <Navigate to="/profile" replace />

  async function moveProject(project, newStatus) {
    setError('')
    const changes = statusChangeFields(project, newStatus)
    const { error } = await supabase.from('projects').update(changes).eq('id', project.id)
    if (error) return setError(error.message)
    setProjects(projects.filter((p) => p.id !== project.id))
    setMessage(`Moved "${project.title}" to ${statusLabel(newStatus)}.`)
  }

  async function deleteProject(project) {
    if (!window.confirm(`Delete "${project.title}"?\n\nIt will be moved to Recently deleted for ${DELETE_AFTER_DAYS} days, so you can restore it.`)) return
    try {
      await moveToTrash(project.id)
      setProjects(projects.filter((p) => p.id !== project.id))
      setMessage(`"${project.title}" was moved to Recently deleted.`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="narrow stack">
      <Link to="/profile" className="back-link"><ChevronLeft size={16} /> Profile</Link>

      <div className="page-header">
        <h1 className="row"><span className={`dot dot-lg status-bg-${status}`} /> {statusLabel(status)}</h1>
        <Link to={`/projects/new?status=${status}`} className="btn btn-primary"><Plus size={16} /> Add project</Link>
      </div>

      {/* Jump to another status */}
      <div className="chips">
        {STATUSES.map((s) => (
          <button key={s.value} className={`chip ${s.value === status ? 'chip-active' : ''}`} onClick={() => { setMessage(''); navigate(`/projects/status/${s.value}`) }}>
            {s.label}
          </button>
        ))}
      </div>

      <ErrorMessage message={error} />
      {message && <div className="alert alert-success">{message}</div>}
      {loading && <Spinner />}

      {!loading && projects.length === 0 && (
        <div className="card empty">
          <p className="muted">No {statusLabel(status).toLowerCase()} projects.</p>
        </div>
      )}

      <ul className="status-list">
        {projects.map((p) => (
          <li key={p.id} className="card status-item">
            <Link to={`/projects/${p.id}`} className="status-item-main">
              {coverUrls[p.id]
                ? <img className="status-item-photo" src={coverUrls[p.id]} alt="" loading="lazy" />
                : <ProjectIcon icon={p.icon} color={p.color} size={48} />}
              <span className="status-item-text">
                <strong>{p.title}</strong>
                <small className="muted">
                  {p.craft_types?.name}
                  {p.start_date && ` · ${startDateLabel(p.status)} ${formatDate(p.start_date)}`}
                  {p.finish_date && ` · Finished ${formatDate(p.finish_date)}`}
                </small>
              </span>
            </Link>
            <div className="status-item-actions">
              <select
                className="select-sm"
                value=""
                onChange={(e) => { if (e.target.value) moveProject(p, e.target.value) }}
                aria-label={`Move ${p.title} to another status`}
              >
                <option value="">Move to...</option>
                {STATUSES.filter((s) => s.value !== status).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <Link to={`/projects/${p.id}/edit`} className="icon-btn" aria-label={`Edit ${p.title}`} title="Edit"><Pencil size={16} /></Link>
              <button className="icon-btn" onClick={() => deleteProject(p)} aria-label={`Delete ${p.title}`} title="Delete"><Trash2 size={16} /></button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
