// Friends page: friend requests (yours to answer first), search by username,
// requests you've sent, and your friends list. Updates live when someone
// sends or accepts a request (via NotificationsContext).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Search, UserMinus, UserPlus, X } from 'lucide-react'
import {
  acceptFriendRequest, listMyFriendships, otherPerson, removeFriendship, searchProfiles, sendFriendRequest,
} from '../lib/friends.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationsContext.jsx'
import Avatar from '../components/Avatar.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Spinner from '../components/Spinner.jsx'

function PersonRow({ person, children }) {
  return (
    <li className="person-row">
      <Link to={`/u/${person.username}`} className="person-link">
        <Avatar profile={person} size={40} />
        <span className="person-names">
          <strong>{person.display_name}</strong>
          <small className="muted">@{person.username}</small>
          {/* Their "About me", so you know who you're adding */}
          {person.bio && <small className="person-bio">{person.bio}</small>}
        </span>
      </Link>
      <span className="row">{children}</span>
    </li>
  )
}

export default function FriendsPage() {
  const { profile: me } = useAuth()
  const { friendshipsVersion, refreshRequests, showToast } = useNotifications()
  const [friendships, setFriendships] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // null = haven't searched yet
  const [error, setError] = useState('')

  async function reload() {
    try {
      setFriendships(await listMyFriendships())
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  // Load now, and again whenever a friendship changes (live updates)
  useEffect(() => { reload() }, [friendshipsVersion])

  // Run an action (send/accept/remove), show any error, then refresh everything.
  async function run(action, successMessage) {
    setError('')
    try {
      await action()
      await reload()
      refreshRequests() // update the badge
      if (successMessage) showToast(successMessage)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSearch(event) {
    event.preventDefault()
    const term = query.trim()
    if (term.length < 2) return setResults([])
    setError('')
    try {
      setResults(await searchProfiles(term, me.id))
    } catch (err) {
      setError(err.message)
    }
  }

  const incoming = friendships.filter((f) => f.status === 'pending' && f.addressee_id === me.id)
  const outgoing = friendships.filter((f) => f.status === 'pending' && f.requester_id === me.id)
  const friends = friendships.filter((f) => f.status === 'accepted')

  // For a search result, find any existing friendship with that person
  function friendshipWith(personId) {
    return friendships.find((f) => f.requester_id === personId || f.addressee_id === personId)
  }

  if (loading) return <Spinner />

  return (
    <div className="narrow stack">
      <div className="page-header">
        <h1>Friends</h1>
      </div>

      <ErrorMessage message={error} />

      {incoming.length > 0 && (
        <section className="card stack-sm card-highlight">
          <h2>Friend requests <span className="count-pill">{incoming.length}</span></h2>
          <ul className="person-list">
            {incoming.map((f) => (
              <PersonRow key={f.id} person={f.requester}>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => run(() => acceptFriendRequest(f.id), {
                    title: 'Friend added',
                    message: `You and ${f.requester.display_name} are now friends.`,
                  })}
                >
                  <Check size={14} /> Accept
                </button>
                <button className="icon-btn" title="Decline" aria-label="Decline" onClick={() => run(() => removeFriendship(f.id))}>
                  <X size={16} />
                </button>
              </PersonRow>
            ))}
          </ul>
        </section>
      )}

      <section className="card stack-sm">
        <h2>Find friends</h2>
        <form onSubmit={handleSearch} className="search-box">
          <Search size={16} />
          <input placeholder="Search by username" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn btn-sm btn-primary">Search</button>
        </form>

        {results !== null && (
          <>
            {results.length === 0 && <p className="muted">No one found.</p>}
            <ul className="person-list">
              {results.map((person) => {
                const existing = friendshipWith(person.id)
                return (
                  <PersonRow key={person.id} person={person}>
                    {!existing && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => run(() => sendFriendRequest(person.id), {
                          title: 'Request sent',
                          message: `We'll let you know when ${person.display_name} accepts.`,
                        })}
                      >
                        <UserPlus size={14} /> Add
                      </button>
                    )}
                    {existing?.status === 'accepted' && <small className="muted">Friends</small>}
                    {existing?.status === 'pending' && <small className="muted">Pending</small>}
                  </PersonRow>
                )
              })}
            </ul>
          </>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="card stack-sm">
          <h2>Sent requests</h2>
          <ul className="person-list">
            {outgoing.map((f) => (
              <PersonRow key={f.id} person={f.addressee}>
                <button className="btn btn-sm btn-ghost" onClick={() => run(() => removeFriendship(f.id))}>Cancel</button>
              </PersonRow>
            ))}
          </ul>
        </section>
      )}

      <section className="card stack-sm">
        <h2>Your friends ({friends.length})</h2>
        {friends.length === 0 && <p className="muted">No friends yet. Search for someone above.</p>}
        <ul className="person-list">
          {friends.map((f) => {
            const person = otherPerson(f, me.id)
            return (
              <PersonRow key={f.id} person={person}>
                <button
                  className="icon-btn"
                  title="Remove friend"
                  aria-label="Remove friend"
                  onClick={() => {
                    if (window.confirm(`Remove ${person.display_name} from your friends?`)) run(() => removeFriendship(f.id))
                  }}
                >
                  <UserMinus size={16} />
                </button>
              </PersonRow>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
