// A profile's friends list (your own, or a friend's). Shows a row of
// avatars; tap "See all" for the full list with names.
// The database only answers for yourself and your friends (friends_of()).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Users } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import Avatar from './Avatar.jsx'

const PREVIEW = 8

export default function FriendsOfList({ userId, title = 'Friends' }) {
  const [friends, setFriends] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setFriends(null)
    setOpen(false)
    supabase.rpc('friends_of', { target: userId }).then(({ data }) => setFriends(data ?? []))
  }, [userId])

  if (!friends) return null

  return (
    <div className="card stack-sm">
      <div className="row-between">
        <h2 className="row"><Users size={18} /> {title} <span className="muted">({friends.length})</span></h2>
        {friends.length > 0 && (
          <button className="btn btn-xs btn-ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? <><ChevronUp size={12} /> Less</> : <><ChevronDown size={12} /> See all</>}
          </button>
        )}
      </div>

      {friends.length === 0 && <p className="muted small">No friends yet.</p>}

      {!open && friends.length > 0 && (
        <div className="avatar-row">
          {friends.slice(0, PREVIEW).map((f) => (
            <Link key={f.id} to={`/u/${f.username}`} title={f.display_name}>
              <Avatar profile={f} size={36} />
            </Link>
          ))}
          {friends.length > PREVIEW && <span className="muted small">+{friends.length - PREVIEW}</span>}
        </div>
      )}

      {open && (
        <ul className="person-list">
          {friends.map((f) => (
            <li key={f.id} className="person-row">
              <Link to={`/u/${f.username}`} className="person-link">
                <Avatar profile={f} size={34} />
                <span className="person-names">
                  <strong>{f.display_name}</strong>
                  <small className="muted">@{f.username}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
