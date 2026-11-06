// Watches for newly earned badges and says congratulations.
//
// It checks your badges (checkMyBadges in lib/badges.js):
//   - when the app opens
//   - when you go to another page (e.g. after saving a project)
//   - when your friends change (accepting a request can earn a badge)
//   - when another part of the app asks (requestBadgeCheck(), e.g. after
//     dragging a project to Finished on the board)
// Each new badge pops up one at a time in a little celebration card. The
// database also adds a "New badge" notification for each one.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { checkMyBadges } from '../lib/badges.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationsContext.jsx'
import BadgeIcon from './BadgeIcon.jsx'

export default function BadgeWatcher() {
  const { user, viewAs } = useAuth()
  const { friendshipsVersion } = useNotifications()
  const location = useLocation()
  const [queue, setQueue] = useState([]) // new badges waiting to be shown
  const running = useRef(false) // a check is in progress
  const again = useRef(false)   // another check was asked for meanwhile

  const userId = user?.id

  const check = useCallback(async () => {
    if (!userId || viewAs) return // not while an admin is testing "view as"
    if (running.current) {
      again.current = true
      return
    }
    running.current = true
    try {
      const fresh = await checkMyBadges(userId)
      if (fresh.length) setQueue((q) => [...q, ...fresh.filter((b) => !q.some((x) => x.id === b.id))])
    } catch {
      // A failed check just tries again next time
    }
    running.current = false
    if (again.current) {
      again.current = false
      check()
    }
  }, [userId, viewAs])

  // On app start, on every page change, and when friends change
  useEffect(() => { check() }, [check, location.pathname, friendshipsVersion])

  // When another part of the app asks for a check
  useEffect(() => {
    window.addEventListener('stitchlog:check-badges', check)
    return () => window.removeEventListener('stitchlog:check-badges', check)
  }, [check])

  const badge = queue[0]
  if (!badge) return null

  function next() {
    setQueue((q) => q.slice(1))
  }

  return (
    <div className="congrats-backdrop" onClick={next}>
      <div className="congrats-card card" role="dialog" aria-modal="true" aria-labelledby="congrats-title" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn congrats-close" onClick={next} aria-label="Close"><X size={18} /></button>
        {/* little bits of "confetti" around the badge (CSS only) */}
        <div className="congrats-badge">
          {Array.from({ length: 12 }, (_, i) => <span key={i} className="congrats-bit" style={{ '--i': i }} />)}
          <BadgeIcon badge={badge} size={120} />
        </div>
        <p className="congrats-kicker">Congratulations!</p>
        <h2 id="congrats-title">{badge.name}</h2>
        <p className="muted">{badge.description}</p>
        <div className="row-center">
          <Link to="/profile" className="btn btn-ghost" onClick={next}>See my badges</Link>
          <button className="btn btn-primary" onClick={next}>{queue.length > 1 ? `Next (${queue.length - 1} more)` : 'Yay!'}</button>
        </div>
      </div>
    </div>
  )
}
