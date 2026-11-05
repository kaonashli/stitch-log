// Friends box on your own profile: search by username, incoming/outgoing
// requests, and your friends list.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Search, UserMinus, UserPlus, X } from 'lucide-react'
import {
  acceptFriendRequest, listMyFriendships, otherPerson, removeFriendship, searchProfiles, sendFriendRequest,
} from '../../lib/friends.js'
import Avatar from '../Avatar.jsx'
import ErrorMessage from '../ErrorMessage.jsx'

function PersonRow({ person, children }) {
  return (
    <li className="person-row">
      <Link to={`/u/${person.username}`} className="person-link">
        <Avatar profile={person} size={34} />
        <span className="person-names">
          <strong>{person.display_name}</strong>
          <small className="muted">@{person.username}</small>
        </span>
      </Link>
      <span className="row">{children}</span>
    </li>
  )
}

export default function FriendsPanel({ me }) {
  const [friendships, setFriendships] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // null = haven't searched yet
  const [error, setError] = useState('')

  async function reload() {
    try {
      setFriendships(await listMyFriendships())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { reload() }, [])

  // Run an action (send/accept/remove), show any error, then refresh the lists.
  async function run(action) {
    setError('')
    try {
      await action()
      await reload()
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

  return (
    <div className="card stack">
      <h2>Friends</h2>
      <ErrorMessage message={error} />

      <form onSubmit={handleSearch} className="search-box">
        <Search size={16} />
        <input placeholder="Find by username" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn btn-sm btn-primary">Search</button>
      </form>

      {results !== null && (
        <div>
          {results.length === 0 && <p className="muted">No one found.</p>}
          <ul className="person-list">
            {results.map((person) => {
              const existing = friendshipWith(person.id)
              return (
                <PersonRow key={person.id} person={person}>
                  {!existing && (
                    <button className="btn btn-sm btn-primary" onClick={() => run(() => sendFriendRequest(person.id))}>
                      <UserPlus size={14} /> Add
                    </button>
                  )}
                  {existing?.status === 'accepted' && <small className="muted">Friends</small>}
                  {existing?.status === 'pending' && <small className="muted">Pending</small>}
                </PersonRow>
              )
            })}
          </ul>
        </div>
      )}

      {incoming.length > 0 && (
        <div>
          <h3>Requests for you</h3>
          <ul className="person-list">
            {incoming.map((f) => (
              <PersonRow key={f.id} person={f.requester}>
                <button className="icon-btn icon-btn-success" title="Accept" aria-label="Accept" onClick={() => run(() => acceptFriendRequest(f.id))}>
                  <Check size={16} />
                </button>
                <button className="icon-btn" title="Decline" aria-label="Decline" onClick={() => run(() => removeFriendship(f.id))}>
                  <X size={16} />
                </button>
              </PersonRow>
            ))}
          </ul>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <h3>Sent requests</h3>
          <ul className="person-list">
            {outgoing.map((f) => (
              <PersonRow key={f.id} person={f.addressee}>
                <button className="btn btn-sm btn-ghost" onClick={() => run(() => removeFriendship(f.id))}>Cancel</button>
              </PersonRow>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3>Your friends ({friends.length})</h3>
        {friends.length === 0 && <p className="muted">No friends yet. Search for someone above.</p>}
        <ul className="person-list">
          {friends.map((f) => (
            <PersonRow key={f.id} person={otherPerson(f, me.id)}>
              <button
                className="icon-btn"
                title="Remove friend"
                aria-label="Remove friend"
                onClick={() => {
                  if (window.confirm(`Remove ${otherPerson(f, me.id).display_name} from your friends?`)) {
                    run(() => removeFriendship(f.id))
                  }
                }}
              >
                <UserMinus size={16} />
              </button>
            </PersonRow>
          ))}
        </ul>
      </div>
    </div>
  )
}
