// Notifications: hearts, comments, and friend requests, newest first.
// Opening this page marks everything as seen (the badge goes away), but the
// notifications stay in the list. Ones that were new when you opened the page
// stay highlighted while you're here. If someone takes back a heart or deletes
// a comment, it disappears from this list too (the database removes it).
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AtSign, Bell, Bug, Check, Heart, MessageCircle, UserCheck, UserPlus } from 'lucide-react'
import { describeNotification, loadNotifications } from '../lib/notifications.js'
import { acceptFriendRequest, removeFriendship } from '../lib/friends.js'
import { timeAgo } from '../lib/dates.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationsContext.jsx'
import Avatar from '../components/Avatar.jsx'
import Spinner from '../components/Spinner.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'

// Small icon in the corner of the avatar showing what kind of notification it is
const TYPE_ICONS = {
  like: Heart,
  comment: MessageCircle,
  friend_request: UserPlus,
  friend_accepted: UserCheck,
  feedback: Bug,
  mention: AtSign,
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const { markAllRead, notificationsVersion, refreshRequests } = useNotifications()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // ids that were unread when they arrived on this page (to highlight them)
  const newIds = useRef(new Set())

  async function reload() {
    try {
      const list = await loadNotifications(user.id)
      list.filter((n) => !n.read_at).forEach((n) => newIds.current.add(n.id))
      setItems(list)
      // You're looking at them now, so they're seen
      if (list.some((n) => !n.read_at)) markAllRead()
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  // Load now, and again whenever a notification arrives or is removed
  useEffect(() => { reload() }, [notificationsVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  async function respond(action) {
    setError('')
    try {
      await action()
      refreshRequests()
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="narrow stack">
      <div className="page-header">
        <h1>Notifications</h1>
      </div>

      <ErrorMessage message={error} />

      {items.length === 0 && (
        <div className="card empty">
          <Bell size={28} />
          <p>Nothing yet. Hearts, comments, and friend requests will show up here.</p>
        </div>
      )}

      <ul className="notification-list">
        {items.map((n) => {
          const { text, link } = describeNotification(n)
          const TypeIcon = TYPE_ICONS[n.type] ?? Bell
          const pendingRequest = n.type === 'friend_request' && n.friendship?.status === 'pending'
          return (
            <li key={n.id} className={`card notification ${newIds.current.has(n.id) ? 'notification-new' : ''}`}>
              <Link to={link} className="notification-main">
                <span className="notification-avatar">
                  <Avatar profile={n.actor} size={42} />
                  <span className={`notification-type notification-type-${n.type}`}><TypeIcon size={12} /></span>
                </span>
                <span className="notification-text">
                  <span>{text}</span>
                  <small className="muted">{timeAgo(n.created_at)}</small>
                </span>
              </Link>

              {/* Answer friend requests right here */}
              {pendingRequest && (
                <span className="row notification-actions">
                  <button className="btn btn-sm btn-primary" onClick={() => respond(() => acceptFriendRequest(n.friendship_id))}>
                    <Check size={14} /> Accept
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => respond(() => removeFriendship(n.friendship_id))}>
                    Decline
                  </button>
                </span>
              )}
              {n.type === 'friend_request' && n.friendship?.status === 'accepted' && (
                <small className="muted notification-actions">Accepted</small>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
