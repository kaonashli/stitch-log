// View one project: details, materials, and photos.
// Friends can see this page too; only the owner gets Edit / Delete.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Gift, Pencil, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { deleteProjectPhotoFiles, getPhotoUrls } from '../lib/images.js'
import { formatDate, todayLocal } from '../lib/dates.js'
import { MATERIAL_FIELDS, MATERIAL_TYPES, STATUSES } from '../lib/constants.js'
import { useAuth } from '../context/AuthContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Avatar from '../components/Avatar.jsx'
import Spinner from '../components/Spinner.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [photos, setPhotos] = useState([]) // [{ id, storage_path, url }]
  const [openPhoto, setOpenPhoto] = useState(null) // index of the photo shown large, or null
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          craft_types(name),
          owner:profiles(id, username, display_name, avatar_path),
          project_materials(*),
          project_photos(id, storage_path, sort_order)
        `)
        .eq('id', id)
        .maybeSingle()

      if (error) setError(error.message)
      else if (!data) setError('Project not found, or you do not have access to it.')
      else {
        setProject(data)
        const sorted = data.project_photos.sort((a, b) => a.sort_order - b.sort_order)
        const urls = await getPhotoUrls(sorted.map((p) => p.storage_path))
        setPhotos(sorted.map((p) => ({ ...p, url: urls[p.storage_path] })))
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function handleDelete() {
    if (!window.confirm(`Delete "${project.title}"? This cannot be undone.`)) return
    // Remove the image files first; deleting the project removes all its rows (cascade)
    await deleteProjectPhotoFiles(photos.map((p) => p.storage_path))
    const { error } = await supabase.from('projects').delete().eq('id', project.id)
    if (error) return setError(error.message)
    navigate('/projects')
  }

  // Quick status change for the owner (handy on phones, where kanban drag doesn't work)
  async function handleStatusChange(event) {
    const status = event.target.value
    const changes = { status }
    const today = todayLocal()
    // Same rule as the kanban: finishing fills in today as the finish date if it's empty
    if (status === 'finished' && !project.finish_date && today >= project.start_date) changes.finish_date = today
    const { error } = await supabase.from('projects').update(changes).eq('id', project.id)
    if (error) return setError(error.message)
    setProject({ ...project, ...changes })
  }

  if (loading) return <Spinner />
  if (!project) return <ErrorMessage message={error} />

  const isOwner = project.user_id === user.id
  const materials = [...project.project_materials].sort((a, b) => a.created_at.localeCompare(b.created_at))

  return (
    <div className="narrow stack">
      <ErrorMessage message={error} />

      <div className="card stack">
        <div className="row-between wrap">
          <div>
            <h1>{project.title}</h1>
            <div className="row muted">
              {isOwner ? (
                <select
                  className={`select-sm status-select status-${project.status}`}
                  value={project.status}
                  onChange={handleStatusChange}
                  aria-label="Status"
                >
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              ) : (
                <StatusBadge status={project.status} />
              )}
              <span>{project.craft_types?.name}</span>
            </div>
          </div>
          {isOwner && (
            <div className="row">
              <Link to={`/projects/${project.id}/edit`} className="btn btn-ghost"><Pencil size={16} /> Edit</Link>
              <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={16} /> Delete</button>
            </div>
          )}
        </div>

        {!isOwner && project.owner && (
          <Link to={`/u/${project.owner.username}`} className="row owner-link">
            <Avatar profile={project.owner} size={28} />
            <span>{project.owner.display_name} <span className="muted">@{project.owner.username}</span></span>
          </Link>
        )}

        <dl className="details">
          <div><dt><CalendarDays size={16} /> Started</dt><dd>{formatDate(project.start_date)}</dd></div>
          {project.finish_date && <div><dt><CalendarDays size={16} /> Finished</dt><dd>{formatDate(project.finish_date)}</dd></div>}
          {project.made_for && <div><dt><Gift size={16} /> For</dt><dd>{project.made_for}</dd></div>}
          {project.pattern_url && (
            <div>
              <dt><ExternalLink size={16} /> Pattern</dt>
              {/* rel="noopener noreferrer" stops the other site from controlling this tab */}
              <dd><a href={project.pattern_url} target="_blank" rel="noopener noreferrer">{project.pattern_url}</a></dd>
            </div>
          )}
        </dl>
      </div>

      {photos.length > 0 && (
        <div className="card stack">
          <h2>Photos</h2>
          <div className="photo-grid">
            {photos.map((photo, index) => (
              <button key={photo.id} className="photo-thumb" onClick={() => setOpenPhoto(index)}>
                <img src={photo.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card stack">
        <h2>Materials</h2>
        {materials.length === 0 && <p className="muted">No materials listed.</p>}
        <ul className="material-list">
          {materials.map((m) => (
            <li key={m.id}>
              <strong>{MATERIAL_TYPES[m.material_type]?.label ?? m.material_type}</strong>
              <span className="material-values">
                {MATERIAL_TYPES[m.material_type]?.fields
                  .filter((field) => m[field] !== null && m[field] !== '')
                  .map((field) => (
                    <span key={field}><span className="muted">{MATERIAL_FIELDS[field].label}:</span> {m[field]}</span>
                  ))}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Simple full-screen photo viewer */}
      {openPhoto !== null && (
        <div className="lightbox" onClick={() => setOpenPhoto(null)}>
          <img src={photos[openPhoto].url} alt="" onClick={(e) => e.stopPropagation()} />
          <button className="lightbox-btn lightbox-close" onClick={() => setOpenPhoto(null)} aria-label="Close"><X /></button>
          {photos.length > 1 && (
            <>
              <button
                className="lightbox-btn lightbox-prev"
                aria-label="Previous photo"
                onClick={(e) => { e.stopPropagation(); setOpenPhoto((openPhoto - 1 + photos.length) % photos.length) }}
              ><ChevronLeft /></button>
              <button
                className="lightbox-btn lightbox-next"
                aria-label="Next photo"
                onClick={(e) => { e.stopPropagation(); setOpenPhoto((openPhoto + 1) % photos.length) }}
              ><ChevronRight /></button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
