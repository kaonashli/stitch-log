// Create an account: email, password, display name, username, optional avatar.
// username + display_name are sent as "metadata"; a database trigger
// (handle_new_user in schema.sql) uses them to create the profile row.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { clearPendingAvatar, savePendingAvatar } from '../lib/images.js'
import AuthCard from '../components/AuthCard.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import AvatarPicker from '../components/AvatarPicker.jsx'
import { MIN_PASSWORD_LENGTH, USERNAME_PATTERN } from '../lib/constants.js'

export default function SignupPage() {
  const [form, setForm] = useState({ email: '', password: '', confirm: '', displayName: '', username: '' })
  const [avatarFile, setAvatarFile] = useState(null)
  const [usernameStatus, setUsernameStatus] = useState('') // '', 'checking', 'available', 'taken'
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  // One change handler for every text box: uses the input's "name" to know which field to update.
  function handleChange(event) {
    const { name, value } = event.target
    setForm({ ...form, [name]: value })
    if (name === 'username') setUsernameStatus('')
  }

  async function checkUsername() {
    const username = form.username.trim()
    if (!USERNAME_PATTERN.test(username)) return false
    setUsernameStatus('checking')
    const { data, error } = await supabase.rpc('is_username_available', { check_username: username })
    if (error) {
      setUsernameStatus('')
      return true // let the server decide on submit
    }
    setUsernameStatus(data ? 'available' : 'taken')
    return data
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    // Check everything in the browser first for quick feedback.
    // (The database enforces the same rules, so this can't be bypassed.)
    const username = form.username.trim()
    const displayName = form.displayName.trim()
    if (!displayName) return setError('Please enter a display name.')
    if (!USERNAME_PATTERN.test(username)) {
      return setError('Username must be 3-20 characters: letters, numbers, or underscores.')
    }
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
    }
    if (form.password !== form.confirm) return setError('Passwords do not match.')

    setBusy(true)
    const available = await checkUsername()
    if (!available) {
      setBusy(false)
      return setError('That username is taken. Try another one.')
    }

    // Keep the avatar until the first login (we may not have a session yet).
    if (avatarFile) await savePendingAvatar(form.email.trim(), avatarFile)

    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { username, display_name: displayName },
        emailRedirectTo: window.location.origin, // where the confirmation link sends them
      },
    })
    setBusy(false)

    if (error) {
      clearPendingAvatar()
      // The trigger failing (e.g. username taken a second ago) shows up as a generic database error
      if (error.message.toLowerCase().includes('database error')) {
        setError('That username was just taken. Try another one.')
      } else {
        setError(error.message)
      }
      return
    }

    // If email confirmation is OFF we're logged in already and the router
    // redirects us. If it's ON, tell the user to check their email.
    if (!data.session) setDone(true)
  }

  if (done) {
    return (
      <AuthCard title="Check your email">
        <div className="alert alert-info">
          <MailCheck size={18} />
          <span>We sent a confirmation link to <strong>{form.email}</strong>. Click it, then log in.</span>
        </div>
        <Link to="/login" className="btn btn-primary btn-block">Go to login</Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Create your account" subtitle="Start logging your knitting and crochet projects.">
      <form onSubmit={handleSubmit} className="stack">
        <ErrorMessage message={error} />

        <AvatarPicker file={avatarFile} onChange={setAvatarFile} />

        <label className="field">
          <span>Display name</span>
          <input name="displayName" required maxLength={50} value={form.displayName} onChange={handleChange} autoComplete="name" />
        </label>

        <label className="field">
          <span>Username</span>
          <input
            name="username"
            required
            maxLength={20}
            value={form.username}
            onChange={handleChange}
            onBlur={checkUsername}
            autoComplete="username"
            placeholder="letters, numbers, _"
          />
          {usernameStatus === 'checking' && <small className="muted">Checking...</small>}
          {usernameStatus === 'available' && <small className="text-success">Available</small>}
          {usernameStatus === 'taken' && <small className="text-error">Already taken</small>}
        </label>

        <label className="field">
          <span>Email</span>
          <input name="email" type="email" required value={form.email} onChange={handleChange} autoComplete="email" />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
          />
          <small className="muted">At least {MIN_PASSWORD_LENGTH} characters.</small>
        </label>

        <label className="field">
          <span>Confirm password</span>
          <input name="confirm" type="password" required value={form.confirm} onChange={handleChange} autoComplete="new-password" />
        </label>

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="auth-switch muted">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthCard>
  )
}
