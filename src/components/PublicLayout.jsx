// Simple frame for pages anyone can see without logging in (like the release
// notes): logo, light/dark toggle, and a Log in button.
import { Link, Outlet } from 'react-router-dom'
import Logo from './Logo.jsx'
import ThemeToggle from './ThemeToggle.jsx'

export default function PublicLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <Logo />
            <span>Stitch Log</span>
          </Link>
          <div className="topbar-actions">
            <ThemeToggle />
            <Link to="/login" className="btn btn-primary btn-sm">Log in</Link>
          </div>
        </div>
      </header>
      <main className="page-scroll">
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
