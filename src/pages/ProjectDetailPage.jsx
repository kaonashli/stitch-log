// View one project: details, materials, and photos.
// Friends can see this page too; only the owner gets Edit / Delete.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, EyeOff, Gauge, Gift, Link2, Lock, Pencil, RotateCcw, Star, Trash2, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { getPhotoUrls } from '../lib/images.js'
import { DELETE_AFTER_DAYS, deleteForever, expiryDate, moveToTrash, restoreProject } from '../lib/trash.js'
import { formatDate } from '../lib/dates.js'
import { startDateLabel, statusChangeFields } from '../lib/projectStatus.js'
import {
  ENJOYMENT_LABELS, MAKE_AGAIN_OPTIONS, REFLECTION_FIELDS, hasWrapUp, linkLabel, loadLinks, loadRecipients, loadReflections,
} from '../lib/projectExtras.js'
import TaggedText from '../components/TaggedText.jsx'
import { requestBadgeCheck } from '../lib/badges.js'
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
  const { user, profile: me, refreshProfile, viewAs, viewingAsOther } = useAuth()
  const [project, setProject] = useState(null)
  const [photos, setPhotos] = useState([]) // [{ id, storage_path, url }]
  const [notes, setNotes] = useState('') // private notes, only loaded for the owner
  const [recipients, setRecipients] = useState([]) // "Who it's for"
  const [links, setLinks] = useState([])
  const [reflections, setReflections] = useState({}) // wrap-up answers
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

        // The database only returns private links and answers to the owner
        const [recipientList, linkList, answers] = await Promise.all([
          loadRecipients(id).catch(() => []),
          loadLinks(id).catch(() => []),
          loadReflections(id).catch(() => ({})),
        ])
        setRecipients(recipientList)
        setLinks(linkList)
        setReflections(answers)

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
    // Same rules as the project board (start date when leaving Idea, finish date when Finished)
    const changes = statusChangeFields(project, event.target.value)
    const { error } = await supabase.from('projects').update(changes).eq('id', project.id)
    if (error) return setError(error.message)
    setProject({ ...project, ...changes })
    requestBadgeCheck() // e.g. finishing a project can earn a badge
  }

  // Star / unstar this as your focus project (only one at a time)
  async function toggleFocus() {
    const next = me.focus_project_id === project.id ? null : project.id
    const { error } = await supabase.from('profiles').update({ focus_project_id: next }).eq('id', user.id)
    if (error) return setError(error.message)
    refreshProfile()
  }

  if (loading) return <Spinner />
  if (!project) return <ErrorMessage message={error} />

  // Admin "view as": a stranger can't open anyone's projects
  if (viewAs === 'stranger') {
    return (
      <div className="card empty">
        <EyeOff size={24} />
        <p>A stranger can't see this project. Only friends of its owner can.</p>
      </div>
    )
  }

  // "View as a friend" on your own project: no owner tools, no private things
  const isOwner = project.user_id === user.id && !viewingAsOther
  const showPrivate = !viewingAsOther
  const isFocus = me.focus_project_id === project.id
  const coverPhoto = photos.find((p) => p.is_cover)
  const shownLinks = links.filter((l) => showPrivate || l.is_public)
  const shownAnswers = REFLECTION_FIELDS
    .map((f) => ({ ...f, answer: reflections[f.field] }))
    .filter((f) => f.answer && (showPrivate || f.answer.is_public))
  const materials = [...project.project_materials]
    .map((m) => (showPrivate ? m : { ...m, cost: null })) // costs are private
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
              {/* Focus project: the one you're showing off on your profile */}
              {!project.deleted_at && (
                <button
                  className={`btn btn-ghost focus-btn ${isFocus ? 'focus-btn-on' : ''}`}
                  onClick={toggleFocus}
                  aria-pressed={isFocus}
                  title={isFocus ? 'Your focus project. Tap to unstar.' : 'Star as your focus project'}
                >
                  <Star size={16} fill={isFocus ? 'currentColor' : 'none'} /> {isFocus ? 'Focus' : 'Make focus'}
                </button>
              )}
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
          {/* Ideas only have a planned start date (maybe none yet) */}
          {(project.start_date || project.status !== 'idea') && (
            <div><dt><CalendarDays size={16} /> {startDateLabel(project.status)}</dt><dd>{formatDate(project.start_date) || 'Not set'}</dd></div>
          )}
          {project.finish_date && <div><dt><CalendarDays size={16} /> Finished</dt><dd>{formatDate(project.finish_date)}</dd></div>}
          {recipients.length > 0 && (
            <div>
              <dt><Gift size={16} /> For</dt>
              <dd className="recipient-list">
                {recipients.map((r) => (r.person
                  ? <Link key={r.id} to={`/u/${r.person.username}`} className="person-chip person-chip-tagged">
                      <Avatar profile={r.person} size={18} />
                      {r.person.id === project.user_id ? `${r.person.display_name} (themselves)` : r.person.display_name}
                    </Link>
                  : <span key={r.id} className="person-chip">{r.name}</span>))}
              </dd>
            </div>
          )}
          {shownLinks.length > 0 && (
            <div>
              <dt><Link2 size={16} /> Links</dt>
              <dd className="link-list">
                {shownLinks.map((l) => (
                  <span key={l.id} className="row">
                    {/* rel="noopener noreferrer" stops the other site from controlling this tab */}
                    <a href={l.url} target="_blank" rel="noopener noreferrer">{linkLabel(l)}</a>
                    {!l.is_public && <Lock size={12} className="muted" aria-label="Only you can see this link" />}
                  </span>
                ))}
              </dd>
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

      {/* Wrap-up answers (finished / frogged projects) */}
      {hasWrapUp(project.status) && shownAnswers.length > 0 && (
        <div className="card stack-sm">
          <h2>Wrap-up</h2>
          <dl className="wrapup-list">
            {shownAnswers.map(({ field, label, answer }) => (
              <div key={field}>
                <dt>
                  {label}
                  {!answer.is_public && <Lock size={12} className="muted" aria-label="Only you can see this" />}
                </dt>
                <dd>
                  {field === 'make_again' && (MAKE_AGAIN_OPTIONS.find((o) => o.value === answer.value)?.label ?? answer.value)}
                  {field === 'enjoyment' && (
                    <span className="row">
                      <span className="enjoyment-picker enjoyment-readonly" aria-hidden="true">
                        {[1, 2, 3, 4, 5].map((n) => <span key={n} className={`enjoyment-dot ${Number(answer.value) >= n ? 'enjoyment-dot-on' : ''}`} />)}
                      </span>
                      {ENJOYMENT_LABELS[Number(answer.value)]}
                    </span>
                  )}
                  {field === 'skills' && <p className="prose">{answer.value}</p>}
                  {field === 'recommend_to' && <TaggedText text={answer.value} />}
                </dd>
              </div>
            ))}
          </dl>
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
                      {m.quantity === null && <span><span className="muted">Amount:</span> Unsure</span>}
                      {MATERIAL_TYPES[m.material_type]?.fields
                        // amount is shown before the name; cost is shown on the right
                        .filter((field) => field !== 'quantity' && field !== 'cost')
                        .filter((field) => m[field] !== null && m[field] !== undefined && m[field] !== '' && !(Array.isArray(m[field]) && !m[field].length))
                        .map((field) => (
                          <span key={field}>
                            <span className="muted">{MATERIAL_FIELDS[field].label}:</span>{' '}
                            {Array.isArray(m[field]) ? m[field].join(', ') : m[field]}
                          </span>
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
      <ProjectSocial project={project} me={me} viewingAsOther={viewingAsOther} />

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
