// View one project: details, materials, and photos.
// Friends can see this page too; only the owner gets Edit / Delete.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, Check, ChevronLeft, ChevronRight, ExternalLink, Gauge, Gift, Lock, Pencil, RotateCcw, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { getPhotoUrls } from '../lib/images.js'
import { DELETE_AFTER_DAYS, deleteForever, expiryDate, moveToTrash, restoreProject } from '../lib/trash.js'
import { formatDate, todayLocal } from '../lib/dates.js'
import {
  MATERIAL_FIELDS, MATERIAL_SECTIONS, MATERIAL_TYPES, STATUSES, formatMoney, hasCost, materialLineCost, withCost,
} from '../lib/constants.js'
import { useAuth } from '../context/AuthContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import ProjectIcon from '../components/ProjectIcon.jsx'
import { DifficultyDots } from '../components/DifficultyPicker.jsx'
import Avatar from '../components/Avatar.jsx'
import Spinner from '../components/Spinner.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import ProjectSocial from '../components/ProjectSocial.jsx'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile: me } = useAuth()
  const [project, setProject] = useState(null)
  const [photos, setPhotos] = useState([]) // [{ id, storage_path, url }]
  const [notes, setNotes] = useState('') // private notes, only loaded for the owner
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
          owner:profiles!projects_user_id_fkey(id, username, display_name, avatar_path),
          project_materials(*, material_costs(cost)),
          project_photos(id, storage_path, sort_order, is_cover)
        `)
        .eq('id', id)
        .maybeSingle()

      if (error) setError(error.message)
      else if (!data) setError('Project not found, or you do not have access to it.')
      else {
        // Costs are private: only your own projects come back with them
        setProject({ ...data, project_materials: data.project_materials.map(withCost) })
        const sorted = data.project_photos.sort((a, b) => a.sort_order - b.sort_order)
        const urls = await getPhotoUrls(sorted.map((p) => p.storage_path))
        setPhotos(sorted.map((p) => ({ ...p, url: urls[p.storage_path] })))

        // Private notes (the database only returns them to the owner anyway)
        if (data.user_id === user.id) {
          const notesResult = await supabase.from('project_notes').select('notes').eq('project_id', id).maybeSingle()
          setNotes(notesResult.data?.notes ?? '')
        }
      }
      setLoading(false)
    }
    load()
  }, [id, user.id])

  // Delete = move to "Recently deleted". It disappears for everyone else right
  // away, and is deleted for good after 30 days unless you restore it.
  async function handleDelete() {
    const message = `Delete "${project.title}"?

It will be moved to Recently deleted (at the bottom of My projects) ` +
      `and deleted for good after ${DELETE_AFTER_DAYS} days. You can restore it until then.`
    if (!window.confirm(message)) return
    try {
      await moveToTrash(project.id)
      navigate('/projects')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRestore() {
    try {
      await restoreProject(project.id)
      setProject({ ...project, deleted_at: null })
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteForever() {
    if (!window.confirm(`Delete "${project.title}" forever? This can't be undone.`)) return
    try {
      await deleteForever(project.id)
      navigate('/projects')
    } catch (err) {
      setError(err.message)
    }
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
  const coverPhoto = photos.find((p) => p.is_cover)
  const materials = [...project.project_materials]
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
  // Total cost of all materials (cost each x amount), and how much of it is still to buy
  const totalCost = materials.reduce((sum, m) => sum + materialLineCost(m), 0)
  const toBuyCost = materials.filter((m) => m.status === 'to_buy').reduce((sum, m) => sum + materialLineCost(m), 0)
  const anyCosts = materials.some(hasCost)

  // Mark a "to buy" material as bought (moves it to the stash)
  async function markBought(material) {
    const { error } = await supabase.from('project_materials').update({ status: 'owned' }).eq('id', material.id)
    if (error) return setError(error.message)
    setProject({
      ...project,
      project_materials: project.project_materials.map((m) => (m.id === material.id ? { ...m, status: 'owned' } : m)),
    })
  }

  return (
    <div className="narrow stack">
      <ErrorMessage message={error} />

      {/* This project is in Recently deleted (only the owner can get here) */}
      {project.deleted_at && (
        <div className="deleted-banner">
          <Trash2 size={18} />
          <span>
            <strong>This project is deleted.</strong> Only you can see it, and it will be deleted for good
            on {expiryDate(project.deleted_at)}.
          </span>
          <span className="row">
            <button className="btn btn-sm btn-primary" onClick={handleRestore}><RotateCcw size={14} /> Restore</button>
            <button className="btn btn-sm btn-danger" onClick={handleDeleteForever}>Delete forever</button>
          </span>
        </div>
      )}

      <div className="card stack">
        <div className="row-between wrap">
          <div className="project-title-row">
            {/* The starred main image, or the project's icon */}
            {coverPhoto?.url
              ? <img className="project-cover-thumb" src={coverPhoto.url} alt="" />
              : <ProjectIcon icon={project.icon} color={project.color} size={52} />}
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
                {project.is_private && <span className="badge badge-private"><Lock size={11} /> Private</span>}
              </div>
            </div>
          </div>
          {isOwner && (
            <div className="row">
              <Link to={`/projects/${project.id}/edit`} className="btn btn-ghost"><Pencil size={16} /> Edit</Link>
              {/* Already deleted? The banner at the top has Restore / Delete forever instead */}
              {!project.deleted_at && <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={16} /> Delete</button>}
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
          {project.difficulty && (
            <div><dt><Gauge size={16} /> Difficulty</dt><dd><DifficultyDots value={project.difficulty} /></dd></div>
          )}
        </dl>
      </div>

      {project.description && (
        <div className="card stack-sm">
          <h2>Description</h2>
          <p className="prose">{project.description}</p>
        </div>
      )}

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
        {MATERIAL_SECTIONS.map((section) => {
          const items = materials.filter((m) => (m.status ?? 'owned') === section.value)
          if (items.length === 0) return null
          return (
            <div key={section.value} className="stack-sm">
              <h3 className={`material-list-heading material-list-heading-${section.value}`}>
                {section.label} <span className="muted">({items.length})</span>
              </h3>
              <ul className="material-list">
                {items.map((m) => (
                  <li key={m.id}>
                    <strong>
                      {m.quantity > 1 && <span className="material-qty">{m.quantity} &times; </span>}
                      {MATERIAL_TYPES[m.material_type]?.label ?? m.material_type}
                    </strong>
                    <span className="material-values">
                      {MATERIAL_TYPES[m.material_type]?.fields
                        // amount is shown before the name; cost is shown on the right
                        .filter((field) => field !== 'quantity' && field !== 'cost')
                        .filter((field) => m[field] !== null && m[field] !== '')
                        .map((field) => (
                          <span key={field}><span className="muted">{MATERIAL_FIELDS[field].label}:</span> {m[field]}</span>
                        ))}
                    </span>
                    {hasCost(m) && (
                      <span className="material-cost" title={m.quantity > 1 ? `${m.quantity} × ${formatMoney(m.cost)}` : undefined}>
                        {formatMoney(materialLineCost(m))}
                      </span>
                    )}
                    {isOwner && m.status === 'to_buy' && (
                      <button className="btn btn-xs btn-ghost material-bought" onClick={() => markBought(m)}>
                        <Check size={12} /> Bought
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        {anyCosts && (
          <div className="materials-total">
            <span>Total cost <strong>{formatMoney(totalCost)}</strong></span>
            {toBuyCost > 0 && <small className="muted">{formatMoney(toBuyCost)} still to buy</small>}
          </div>
        )}
      </div>

      {/* Hearts and comments */}
      <ProjectSocial project={project} me={me} />

      {isOwner && (
        <div className="card stack-sm card-private">
          <h2 className="row"><Lock size={18} /> Personal notes</h2>
          <p className="field-hint">Only you can see these.</p>
          {notes
            ? <p className="prose">{notes}</p>
            : <p className="muted">No notes yet. <Link to={`/projects/${project.id}/edit`}>Add some</Link></p>}
        </div>
      )}

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
