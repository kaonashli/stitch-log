// "Badges" widget: the best badge of each kind you've earned. Tap one to see
// what it's for. On your own profile, "All badges" also shows the ones still
// to earn, as secrets: just a dashed outline and "???", so they stay a surprise.
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { BADGES, earnedBadges, loadBadgeDates, loadBadgeStats, sortByEarned, topBadges } from '../../lib/badges.js'
import BadgeIcon from '../BadgeIcon.jsx'

export default function BadgesWidget({ userId, editable }) {
  const [stats, setStats] = useState(null)
  const [picked, setPicked] = useState(null) // badge whose description is showing
  const [showAll, setShowAll] = useState(false)

  const [dates, setDates] = useState(new Map()) // badge id -> when it was earned

  useEffect(() => {
    setStats(null)
    Promise.all([loadBadgeStats(userId), loadBadgeDates(userId)]).then(([s, d]) => {
      setDates(d)
      setStats(s)
    })
  }, [userId])

  if (!stats) return <p className="muted small">Loading badges...</p>

  // Earned view: in the order they were earned. "All badges": the usual order.
  const top = sortByEarned(topBadges(stats), dates)
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
          {list.map((badge) => {
            const earned = earnedIds.has(badge.id)
            return (
              <button
                key={badge.id}
                className={`badge-tile ${picked?.id === badge.id ? 'badge-tile-picked' : ''}`}
                onClick={() => setPicked(picked?.id === badge.id ? null : badge)}
                aria-pressed={picked?.id === badge.id}
              >
                {/* Not earned yet = a secret: only its outline, no name */}
                <BadgeIcon badge={badge} earned={earned} size={56} />
                <span className={`badge-tile-name ${earned ? '' : 'muted'}`}>{earned ? badge.name : '???'}</span>
              </button>
            )
          })}
        </div>
      )}

      {picked && (earnedIds.has(picked.id) ? (
        <p className="badge-detail"><strong>{picked.name}:</strong> {picked.description}</p>
      ) : (
        <p className="badge-detail">
          <strong>Secret badge.</strong> <span className="muted">Keep crafting to find out what it is!</span>
        </p>
      ))}
    </div>
  )
}
