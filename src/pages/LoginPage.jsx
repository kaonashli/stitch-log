// Email + password login. Supabase Auth checks the password (stored hashed on
// their side) and keeps the session for us.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import AuthCard from '../components/AuthCard.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault() // stop the browser from reloading the page
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)

    if (error) {
      if (error.code === 'email_not_confirmed') {
        setError('Please confirm your email first. Check your inbox for the link.')
      } else {
        // Don't reveal whether the email exists - same message either way.
        setError('Incorrect email or password.')
      }
    }
    // On success there's nothing to do: AuthContext sees the new session and
    // the router sends us to the home page.
  }

  return (
    <AuthCard title="Welcome back" subtitle="Log in to your stitch journal.">
      <form onSubmit={handleSubmit} className="stack">
        <ErrorMessage message={error} />
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p className="auth-switch muted">
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </AuthCard>
  )
}
