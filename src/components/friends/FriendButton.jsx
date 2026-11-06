// Button on someone else's profile: Add friend / Cancel / Accept / Unfriend.
import { useEffect, useState } from 'react'
import { Check, Clock, UserCheck, UserPlus, X } from 'lucide-react'
import {
  acceptFriendRequest, getFriendshipWith, removeFriendship, sendFriendRequest,
} from '../../lib/friends.js'
import { useNotifications } from '../../context/NotificationsContext.jsx'

export default function FriendButton({ me, other, onChange }) {
  const [friendship, setFriendship] = useState(undefined) // undefined = still loading
  const [error, setError] = useState('')
  const { refreshRequests, friendshipsVersion } = useNotifications()

  async function reload() {
    const found = await getFriendshipWith(other.id)
    setFriendship(found)
    onChange?.(found)
  }

  // Reload when viewing someone new, or when a friendship changes live
  useEffect(() => { reload().catch((err) => setError(err.message)) }, [other.id, friendshipsVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  async function run(action) {
    setError('')
    try {
      await action()
      await reload()
      refreshRequests() // keep the Friends badge in sync
    } catch (err) {
      setError(err.message)
    }
  }

  if (friendship === undefined) return null

  // Every button has an icon AND a label. On phones the label is hidden and
  // the button becomes a round icon in the profile card's top-right corner
  // (see .profile-actions-corner in index.css), so the label is also given
  // as aria-label / title.
  let button
  if (!friendship) {
    button = (
      <button className="btn btn-primary friend-btn" onClick={() => run(() => sendFriendRequest(other.id))} aria-label="Add friend" title="Add friend">
        <UserPlus size={16} /> <span className="friend-btn-label">Add friend</span>
      </button>
    )
  } else if (friendship.status === 'accepted') {
    button = (
      <button
        className="btn btn-ghost friend-btn friend-btn-friends"
        onClick={() => window.confirm(`Remove ${other.display_name} from your friends?`) && run(() => removeFriendship(friendship.id))}
        aria-label={`Friends with ${other.display_name}. Tap to remove.`}
        title="Friends (tap to remove)"
      >
        <UserCheck size={16} /> <span className="friend-btn-label">Friends</span>
      </button>
    )
  } else if (friendship.requester_id === me.id) {
    button = (
      <button className="btn btn-ghost friend-btn" onClick={() => run(() => removeFriendship(friendship.id))} aria-label="Request sent. Tap to cancel." title="Request sent (tap to cancel)">
        <Clock size={16} /> <span className="friend-btn-label">Cancel request</span>
      </button>
    )
  } else {
    button = (
      <span className="row friend-btn-pair">
        <button className="btn btn-primary friend-btn" onClick={() => run(() => acceptFriendRequest(friendship.id))} aria-label="Accept friend request" title="Accept">
          <Check size={16} /> <span className="friend-btn-label">Accept</span>
        </button>
        <button className="btn btn-ghost friend-btn" onClick={() => run(() => removeFriendship(friendship.id))} aria-label="Decline friend request" title="Decline">
          <X size={16} /> <span className="friend-btn-label">Decline</span>
        </button>
      </span>
    )
  }

  return (
    <div className="stack-sm">
      {button}
      {error && <small className="text-error">{error}</small>}
    </div>
  )
}
