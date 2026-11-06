// Edit your display name, username, and profile image.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { avatarUrl, deleteAvatarFile, uploadAvatar } from '../lib/images.js'
import { useAuth } from '../context/AuthContext.jsx'
import { USERNAME_PATTERN } from '../lib/constants.js'
import AvatarPicker from '../components/AvatarPicker.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'

export default function SettingsPage() {
  const { user, profile, refreshProfile, hasPermission, signOut } = useAuth()
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [username, setUsername] = useState(profile.username)
  const [bio, setBio] = useState(profile.bio ?? '') // "About me"
  const [avatarFile, setAvatarFile] = useState(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    const cleanName = displayName.trim()
    const cleanUsername = username.trim()
    if (!cleanName) return setError('Please enter a display name.')
    if (!USERNAME_PATTERN.test(cleanUsername)) {
      return setError('Username must be 3-20 characters: letters, numbers, or underscores.')
    }

    setBusy(true)
    try {
      const changes = { display_name: cleanName, username: cleanUsername, bio: bio.trim() || null }
      const oldAvatar = profile.avatar_path

      if (avatarFile) {
        changes.avatar_path = await uploadAvatar(user.id, avatarFile)
      } else if (removeAvatar) {
        changes.avatar_path = null
      }

      const { error } = await supabase.from('profiles').update(changes).eq('id', user.id)
      if (error) {
        if (error.code === '23505') throw new Error('That username is taken. Try another one.')
        throw error
      }

      // Delete the old image file only after the profile points at the new one
      if (oldAvatar && 'avatar_path' in changes) await deleteAvatarFile(oldAvatar)

      await refreshProfile()
      setAvatarFile(null)
      setRemoveAvatar(false)
      setMessage('Saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="narrow">
      <Link to="/profile" className="back-link"><ChevronLeft size={16} /> Profile</Link>
      <div className="page-header">
        <h1>Settings</h1>
      </div>
      <form onSubmit={handleSubmit} className="card stack">
        <ErrorMessage message={error} />
        {message && <div className="alert alert-success">{message}</div>}

        <AvatarPicker
          file={avatarFile}
          onChange={(f) => { setAvatarFile(f); setRemoveAvatar(false) }}
          currentUrl={removeAvatar ? null : avatarUrl(profile.avatar_path)}
          onRemoveCurrent={() => setRemoveAvatar(true)}
        />

        <label className="field">
          <span>Display name</span>
          <input required maxLength={50} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="field">
          <span>Username</span>
          <input required maxLength={20} value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="field">
          <span>About me</span>
          <textarea
            rows={3}
            maxLength={300}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A few words about you and what you like to make"
          />
          <small className="field-hint">Shown on your profile and when people look you up to add you. {300 - bio.length} characters left.</small>
        </label>
        <label className="field">
          <span>Email</span>
          <input value={user.email} disabled />
        </label>

        <div className="row-end">
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
        </div>
      </form>

      {/* Account links (on phones this is the only place to find these) */}
      <div className="card settings-links">
        {hasPermission('admin.access') && (
          <Link to="/admin" className="settings-link">
            <Shield size={18} /> <span>Admin</span> <ChevronRight size={18} className="muted" />
          </Link>
        )}
        <button className="settings-link settings-link-danger" onClick={signOut}>
          <LogOut size={18} /> <span>Log out</span>
        </button>
      </div>
    </div>
  )
}
