// The frame around every logged-in page.
//
// It's built like a phone app: the top bar and (on phones) the bottom tab bar
// are fixed, and ONLY the middle part (<main>) scrolls. That keeps the bars
// perfectly still while you scroll, instead of the whole page moving around.
import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { House, Layers, LogOut, Plus, Settings, Shield, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import Logo from './Logo.jsx'
import Avatar from './Avatar.jsx'
import ThemeToggle from './ThemeToggle.jsx'

export default function Layout() {
  const { profile, hasPermission, signOut } = useAuth()
  const location = useLocation()
  const mainRef = useRef(null)

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
            <NavLink to="/projects"><Layers size={18} /><span>Projects</span></NavLink>
            <NavLink to="/profile"><User size={18} /><span>Profile</span></NavLink>
            {hasPermission('admin.access') && (
              <NavLink to="/admin"><Shield size={18} /><span>Admin</span></NavLink>
            )}
          </nav>

          <div className="topbar-actions">
            <Link to="/projects/new" className="btn btn-primary btn-sm desktop-only">
              <Plus size={16} /><span>New project</span>
            </Link>
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
        <NavLink to="/projects" end><Layers size={22} /><span>Projects</span></NavLink>
        <NavLink to="/projects/new" className="tabbar-new" aria-label="New project">
          <span className="tabbar-new-circle"><Plus size={24} /></span>
        </NavLink>
        <NavLink to="/profile"><User size={22} /><span>Profile</span></NavLink>
        <NavLink to="/settings"><Settings size={22} /><span>Settings</span></NavLink>
      </nav>
    </div>
  )
}
