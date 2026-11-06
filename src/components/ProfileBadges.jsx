// Badges on a profile. Shows the best badge of each kind you've earned;
// tap one to see what it's for. On your own profile, "All badges" also shows
// the ones still to earn (faded).
import { useEffect, useState } from 'react'
import { Award, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { BADGES, earnedBadges, topBadges } from '../lib/badges.js'
import BadgeIcon from './BadgeIcon.jsx'

export default function ProfileBadges({ userId, isOwn }) {
  const [stats, setStats] = useState(null)
  const [picked, setPicked] = useState(null) // badge whose description is showing
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setStats(null)
    supabase.rpc('profile_badge_stats', { target: userId }).then(({ data }) => setStats(data ?? null))
  }, [userId])

  if (!stats) return null

  const top = topBadges(stats)
  const earnedIds = new Set(earnedBadges(stats).map((b) => b.id))
  const list = showAll ? BADGES : top

  // Nothing earned and it's someone else's profile: don't show an empty box
  if (top.length === 0 && !isOwn) return null

  return (
    <div className="card stack-sm">
      <div className="row-between">
        <h2 className="row"><Award size={18} /> Badges <span className="muted">({earnedIds.size})</span></h2>
        {isOwn && (
          <button className="btn btn-xs btn-ghost" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>
            {showAll ? <><ChevronUp size={12} /> Earned only</> : <><ChevronDown size={12} /> All badges</>}
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <p className="muted small">No badges yet. Start a project to earn your first one.</p>
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
