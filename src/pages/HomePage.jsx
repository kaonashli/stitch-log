// Home: activity feed of what your friends are working on, plus a shortcut
// list of your own in-progress projects and the shopping list.
//
// The feed is built from project status history. Two kinds of entries:
//   - "started a new project": the first entry of a project, saved at the
//     same moment the project was created. Shown as a card with the
//     project's first photo (or its icon if it has no photos).
//   - "moved X to <status>": any later status change.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { timeAgo } from '../lib/dates.js'
import { getPhotoUrls } from '../lib/images.js'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from '../components/Avatar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import ProjectIcon from '../components/ProjectIcon.jsx'
import { colorVar } from '../lib/projectLooks.js'
import ShoppingList from '../components/ShoppingList.jsx'
import Footer from '../components/Footer.jsx'
import Spinner from '../components/Spinner.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'

// Is this the entry saved when the project was created? The database saves
// the project and its first status at the same moment, so the times match.
function isCreation(item) {
  const gap = Math.abs(new Date(item.changed_at) - new Date(item.projects.created_at))
  return gap < 5000 // within 5 seconds
}

export default function HomePage() {
  const { user, profile } = useAuth()
  const [feed, setFeed] = useState([])
  const [photoUrls, setPhotoUrls] = useState({}) // project id -> first photo link
  const [myActive, setMyActive] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      // Status changes on projects we're allowed to see (RLS = ours + friends'),
      // minus our own. "projects!inner" means: only rows that have a matching project,
      // which lets us filter on the project's user_id.
      const feedQuery = supabase
        .from('project_status_history')
        .select(`
          id, status, changed_at,
          projects!inner(
            id, title, user_id, created_at, icon, color,
            craft_types(name),
            profiles!projects_user_id_fkey(id, username, display_name, avatar_path),
            project_photos(storage_path, sort_order, is_cover)
          )
        `)
        .neq('projects.user_id', user.id)
        .is('projects.deleted_at', null) // deleted projects never show in the feed
        .order('changed_at', { ascending: false })
        .limit(40)

      const activeQuery = supabase
        .from('projects')
        .select('id, title, status, icon, color')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(6)

      const [feedResult, activeResult] = await Promise.all([feedQuery, activeQuery])
      if (feedResult.error) setError(feedResult.error.message)
      const items = (feedResult.data ?? []).map((item) => ({ ...item, isNewProject: isCreation(item) }))
      setFeed(items)
      setMyActive(activeResult.data ?? [])
      setLoading(false)

      // Photo links for the "new project" cards (photos are private, so we
      // ask for short-lived signed links; friends are allowed to see them)
      const firstPhotos = {}
      for (const item of items) {
        if (!item.isNewProject) continue
        // The starred main image if there is one, otherwise the first photo
        const photos = [...item.projects.project_photos].sort((a, b) => a.sort_order - b.sort_order)
        const chosen = photos.find((p) => p.is_cover) ?? photos[0]
        if (chosen) firstPhotos[item.projects.id] = chosen.storage_path
      }
      const urls = await getPhotoUrls(Object.values(firstPhotos))
      const byProject = {}
      for (const [projectId, path] of Object.entries(firstPhotos)) byProject[projectId] = urls[path]
      setPhotoUrls(byProject)
    }
    load()
  }, [user.id])

  return (
    <>
    <div className="home-layout">
      <section className="stack">
        <h1>Hi, {profile?.display_name}</h1>
        <h2>Friend activity</h2>
        <ErrorMessage message={error} />
        {loading && <Spinner />}

        {!loading && feed.length === 0 && (
          <div className="card empty">
            <Users size={28} />
            <p>No friend activity yet.</p>
            <Link to="/friends" className="btn btn-ghost">Find friends</Link>
          </div>
        )}

        <ul className="feed">
          {feed.map((item) => {
            const owner = item.projects.profiles
            const project = item.projects

            // A friend started a new project: bigger card with a photo or the project's icon
            if (item.isNewProject) {
              const photo = photoUrls[project.id]
              return (
                <li key={item.id} className="card feed-item feed-item-new">
                  <div className="feed-new-head">
                    <Link to={`/u/${owner.username}`}><Avatar profile={owner} size={40} /></Link>
                    <div className="feed-text">
                      <p>
                        <Link to={`/u/${owner.username}`} className="strong-link">{owner.display_name}</Link>
                        {' started a new project'}
                      </p>
                      <small className="muted">{timeAgo(item.changed_at)}</small>
                    </div>
                  </div>
                  <Link to={`/projects/${project.id}`} className="feed-project">
                    {photo ? (
                      <img className="feed-project-photo" src={photo} alt={project.title} loading="lazy" />
                    ) : (
                      <span className="feed-project-cover" style={{ '--pc': colorVar(project.color) }}>
                        <ProjectIcon icon={project.icon} color={project.color} size={64} className="project-icon-cover" />
                      </span>
                    )}
                    <span className="feed-project-info">
                      <strong>{project.title}</strong>
                      <span className="row">
                        <StatusBadge status={item.status} />
                        {project.craft_types?.name && <small className="muted">{project.craft_types.name}</small>}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            }

            return (
              <li key={item.id} className="card feed-item">
                <Link to={`/u/${owner.username}`}><Avatar profile={owner} size={40} /></Link>
                <div className="feed-text">
                  <p>
                    <Link to={`/u/${owner.username}`} className="strong-link">{owner.display_name}</Link>
                    {' moved '}
                    <Link to={`/projects/${item.projects.id}`} className="strong-link">{item.projects.title}</Link>
                    {' to '}
                    <StatusBadge status={item.status} />
                  </p>
                  <small className="muted">{timeAgo(item.changed_at)}</small>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <aside className="stack home-side">
        <div className="card stack">
          <h2>Your work in progress</h2>
          {myActive.length === 0 && <p className="muted">Nothing in progress.</p>}
          <ul className="simple-list">
            {myActive.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`} className="row">
                  <ProjectIcon icon={p.icon} color={p.color} size={26} />
                  <span>{p.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/projects/new" className="btn btn-primary"><Plus size={16} /> New project</Link>
        </div>

        <ShoppingList userId={user.id} />
      </aside>
    </div>

    {/* Release notes link + developed by */}
    <Footer />
    </>
  )
}
