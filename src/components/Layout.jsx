// The frame around every logged-in page.
//
// It's built like a phone app: the top bar and (on phones) the bottom tab bar
// are fixed, and ONLY the middle part (<main>) scrolls. That keeps the bars
// perfectly still while you scroll, instead of the whole page moving around.
import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Bell, House, LogOut, Plus, Settings, Shield, User, Users } from 'lucide-react'
import { YarnBall } from '../lib/customIcons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationsContext.jsx'
import Logo from './Logo.jsx'
import Avatar from './Avatar.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import Toasts from './Toasts.jsx'

// Little red number on an icon (hidden when there's nothing new)
function CountBadge({ count }) {
  if (!count) return null
  return <span className="count-badge" aria-label={`${count} new`}>{count > 9 ? '9+' : count}</span>
}

export default function Layout() {
  const { profile, hasPermission, signOut } = useAuth()
  const { requestCount, unreadCount } = useNotifications()
  const location = useLocation()
  const mainRef = useRef(null)

  // Settings is reached from the profile on phones, so keep the Profile tab
  // highlighted there too.
  const profileTabActive = ['/profile', '/settings'].includes(location.pathname)

  // Because <main> is the thing that scrolls (not the window), we have to
  // scroll it back to the top ourselves when you go to another page.
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <Logo />
            <span>Stitch Log</span>
          </Link>

          {/* Desktop navigation (hidden on phones, where the bottom tab bar is used) */}
          <nav className="nav desktop-only">
            {/* NavLink adds class="active" to the link for the current page */}
            <NavLink to="/" end><House size={18} /><span>Home</span></NavLink>
            <NavLink to="/projects"><YarnBall size={18} /><span>Projects</span></NavLink>
            <NavLink to="/friends">
              <span className="badge-anchor"><Users size={18} /><CountBadge count={requestCount} /></span>
              <span>Friends</span>
            </NavLink>
            <NavLink to="/profile"><User size={18} /><span>Profile</span></NavLink>
            {hasPermission('admin.access') && (
              <NavLink to="/admin"><Shield size={18} /><span>Admin</span></NavLink>
            )}
          </nav>

          <div className="topbar-actions">
            <Link to="/projects/new" className="btn btn-primary btn-sm desktop-only">
              <Plus size={16} /><span>New project</span>
            </Link>
            {/* Bell: hearts, comments, friend requests. Badge = not seen yet */}
            <NavLink to="/notifications" className="icon-btn" title="Notifications" aria-label={`Notifications${unreadCount ? ` (${unreadCount} new)` : ''}`}>
              <span className="badge-anchor"><Bell size={18} /><CountBadge count={unreadCount} /></span>
            </NavLink>
            <ThemeToggle />
            <Link to="/settings" className="icon-btn desktop-only" title="Settings" aria-label="Settings">
              <Settings size={18} />
            </Link>
            <button className="icon-btn desktop-only" onClick={signOut} title="Log out" aria-label="Log out">
              <LogOut size={18} />
            </button>
            {profile && (
              <Link to="/profile" title={profile.display_name}>
                <Avatar profile={profile} size={32} />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="page-scroll" ref={mainRef}>
        <div className="page">
          {/* The current page renders here */}
          <Outlet />
        </div>
      </main>

      {/* Phone bottom tab bar (hidden on desktop) */}
      <nav className="tabbar" aria-label="Main">
        <NavLink to="/" end><House size={22} /><span>Home</span></NavLink>
        <NavLink to="/projects" end><YarnBall size={22} /><span>Projects</span></NavLink>
        <NavLink to="/projects/new" className="tabbar-new" aria-label="New project">
          <span className="tabbar-new-circle"><Plus size={24} /></span>
        </NavLink>
        <NavLink to="/friends">
          <span className="badge-anchor"><Users size={22} /><CountBadge count={requestCount} /></span>
          <span>Friends</span>
        </NavLink>
        <NavLink to="/profile" className={profileTabActive ? 'active' : ''}><User size={22} /><span>Profile</span></NavLink>
      </nav>

      {/* Pop-up messages at the top of the screen */}
      <Toasts />
    </div>
  )
}
