// "Badges" widget: the best badge of each kind you've earned. Tap one to see
// what it's for. On your own profile, "All badges" also shows the ones still
// to earn (faded).
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { BADGES, earnedBadges, loadBadgeStats, topBadges } from '../../lib/badges.js'
import BadgeIcon from '../BadgeIcon.jsx'

export default function BadgesWidget({ userId, editable }) {
  const [stats, setStats] = useState(null)
  const [picked, setPicked] = useState(null) // badge whose description is showing
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setStats(null)
    loadBadgeStats(userId).then(setStats)
  }, [userId])

  if (!stats) return <p className="muted small">Loading badges...</p>

  const top = topBadges(stats)
  const earnedIds = new Set(earnedBadges(stats).map((b) => b.id))
  const list = showAll ? BADGES : top

  return (
    <div className="stack-sm">
      <div className="row-between">
        <small className="muted">{earnedIds.size} earned</small>
        {editable && (
          <button className="btn btn-xs btn-ghost" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>
            {showAll ? <><ChevronUp size={12} /> Earned only</> : <><ChevronDown size={12} /> All badges</>}
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <p className="muted small">{editable ? 'No badges yet. Start a project to earn your first one.' : 'No badges yet.'}</p>
      ) : (
        <div className="badge-grid">
          {list.map((badge) => (
            <button
              key={badge.id}
              className={`badge-tile ${picked?.id === badge.id ? 'badge-tile-picked' : ''}`}
              onClick={() => setPicked(picked?.id === badge.id ? null : badge)}
              aria-pressed={picked?.id === badge.id}
            >
              <BadgeIcon badge={badge} earned={earnedIds.has(badge.id)} size={56} />
              <span className="badge-tile-name">{badge.name}</span>
            </button>
          ))}
        </div>
      )}

      {picked && (
        <p className="badge-detail">
          <strong>{picked.name}:</strong> {picked.description}
          {!earnedIds.has(picked.id) && <span className="muted"> (not earned yet)</span>}
        </p>
      )}
    </div>
  )
}
