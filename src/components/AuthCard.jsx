// Centered card used by the login and signup pages.
import Logo from './Logo.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import Footer from './Footer.jsx'

export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="auth-theme"><ThemeToggle /></div>
      <div className="auth-card card">
        <div className="auth-brand">
          <Logo size={40} />
          <span>Stitch Log</span>
        </div>
        {/* One line about what the app is, for people who are new here */}
        <p className="auth-tagline">A journal for your knitting and crochet projects, to share with friends.</p>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
      </div>
      <Footer />
    </div>
  )
}
