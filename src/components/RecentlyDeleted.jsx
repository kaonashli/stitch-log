// "Recently deleted" box at the bottom of My Projects. Deleted projects wait
// here for 30 days (only you can see them), showing the date they'll be gone
// for good. Restore brings one back; Delete forever removes it right away.
// Starts collapsed, and hides itself completely when it's empty.
import { useEffect, useState } from 'react'
import { ChevronDown, RotateCcw, Trash2 } from 'lucide-react'
import { DELETE_AFTER_DAYS, daysLeft, deleteForever, expiryDate, loadTrash, restoreProject } from '../lib/trash.js'
import ProjectIcon from './ProjectIcon.jsx'
import ErrorMessage from './ErrorMessage.jsx'

export default function RecentlyDeleted({ userId, reloadKey, onRestored }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  async function reload() {
    try {
      setItems(await loadTrash(userId))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { reload() }, [userId, reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRestore(project) {
    setBusyId(project.id)
    setError('')
    try {
      await restoreProject(project.id)
      setItems(items.filter((p) => p.id !== project.id))
      onRestored?.()
    } catch (err) {
      setError(err.message)
    }
    setBusyId(null)
  }

  async function handleDeleteForever(project) {
    if (!window.confirm(`Delete "${project.title}" forever? This can't be undone.`)) return
    setBusyId(project.id)
    setError('')
    try {
      await deleteForever(project.id)
      setItems(items.filter((p) => p.id !== project.id))
    } catch (err) {
      setError(err.message)
    }
    setBusyId(null)
  }

  if (items.length === 0) return null

  return (
    <section className="card stack-sm recently-deleted">
      <button type="button" className="collapse-header" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Trash2 size={18} />
        <span>Recently deleted ({items.length})</span>
        <ChevronDown size={18} className={`collapse-chevron ${open ? 'collapse-chevron-open' : ''}`} />
      </button>

      {open && (
        <>
          <p className="muted small">
            Only you can see these. They're deleted for good {DELETE_AFTER_DAYS} days after you delete them.
          </p>
          <ErrorMessage message={error} />
          <ul className="trash-list">
            {items.map((project) => {
              const left = daysLeft(project.deleted_at)
              return (
                <li key={project.id} className="trash-item">
                  <ProjectIcon icon={project.icon} color={project.color} size={34} />
                  <span className="trash-text">
                    <strong>{project.title}</strong>
                    <small className={left <= 3 ? 'text-error' : 'muted'}>
                      Deleted for good on {expiryDate(project.deleted_at)}
                      {' '}({left === 0 ? 'today' : `${left} day${left === 1 ? '' : 's'} left`})
                    </small>
                  </span>
                  <span className="row trash-actions">
                    <button className="btn btn-sm btn-ghost" disabled={busyId === project.id} onClick={() => handleRestore(project)}>
                      <RotateCcw size={14} /> Restore
                    </button>
                    <button className="btn btn-sm btn-danger" disabled={busyId === project.id} onClick={() => handleDeleteForever(project)}>
                      Delete forever
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
