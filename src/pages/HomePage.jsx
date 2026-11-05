// Home: activity feed of what your friends are working on, plus a shortcut
// list of your own in-progress projects.
// (Basic version for now - we'll design the full feed later.)
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { timeAgo } from '../lib/dates.js'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from '../components/Avatar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Spinner from '../components/Spinner.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'

export default function HomePage() {
  const { user, profile } = useAuth()
  const [feed, setFeed] = useState([])
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
        .select('id, status, changed_at, projects!inner(id, title, user_id, profiles(id, username, display_name, avatar_path))')
        .neq('projects.user_id', user.id)
        .order('changed_at', { ascending: false })
        .limit(40)

      const activeQuery = supabase
        .from('projects')
        .select('id, title, status')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('updated_at', { ascending: false })
        .limit(6)

      const [feedResult, activeResult] = await Promise.all([feedQuery, activeQuery])
      if (feedResult.error) setError(feedResult.error.message)
      setFeed(feedResult.data ?? [])
      setMyActive(activeResult.data ?? [])
      setLoading(false)
    }
    load()
  }, [user.id])

  return (
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
            <Link to="/profile" className="btn btn-ghost">Find friends on your profile</Link>
          </div>
        )}

        <ul className="feed">
          {feed.map((item) => {
            const owner = item.projects.profiles
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

      <aside className="card stack home-side">
        <h2>Your work in progress</h2>
        {myActive.length === 0 && <p className="muted">Nothing in progress.</p>}
        <ul className="simple-list">
          {myActive.map((p) => (
            <li key={p.id}><Link to={`/projects/${p.id}`}>{p.title}</Link></li>
          ))}
        </ul>
        <Link to="/projects/new" className="btn btn-primary"><Plus size={16} /> New project</Link>
      </aside>
    </div>
  )
}
