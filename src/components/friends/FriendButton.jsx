// Button on someone else's profile: Add friend / Cancel / Accept / Unfriend.
import { useEffect, useState } from 'react'
import { Check, UserMinus, UserPlus } from 'lucide-react'
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

  let button
  if (!friendship) {
    button = <button className="btn btn-primary" onClick={() => run(() => sendFriendRequest(other.id))}><UserPlus size={16} /> Add friend</button>
  } else if (friendship.status === 'accepted') {
    button = (
      <button
        className="btn btn-ghost"
        onClick={() => window.confirm(`Remove ${other.display_name} from your friends?`) && run(() => removeFriendship(friendship.id))}
      >
        <UserMinus size={16} /> Friends
      </button>
    )
  } else if (friendship.requester_id === me.id) {
    button = <button className="btn btn-ghost" onClick={() => run(() => removeFriendship(friendship.id))}>Cancel request</button>
  } else {
    button = (
      <span className="row">
        <button className="btn btn-primary" onClick={() => run(() => acceptFriendRequest(friendship.id))}><Check size={16} /> Accept</button>
        <button className="btn btn-ghost" onClick={() => run(() => removeFriendship(friendship.id))}>Decline</button>
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
