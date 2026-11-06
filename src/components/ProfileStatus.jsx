// The "About me" status on a profile: a little speech bubble coming from the
// person's picture, like a status message.
//   - Everyone sees it (it also shows when people look you up to add you).
//   - On your own profile, tap the bubble (or "Set a status") to edit it
//     right there. Saving an empty bubble clears it.
// Stored in profiles.bio (up to 300 characters).
import { useState } from 'react'
import { Check, MessageCircleHeart, Pencil, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

const MAX_LENGTH = 300

export default function ProfileStatus({ profile, editable }) {
  const { refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function startEditing() {
    setDraft(profile.bio ?? '')
    setError('')
    setEditing(true)
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const { error } = await supabase.from('profiles').update({ bio: draft.trim() || null }).eq('id', profile.id)
    setSaving(false)
    if (error) return setError(error.message)
    await refreshProfile() // the profile page shows the new text
    setEditing(false)
  }

  // Editing your own status
  if (editing) {
    return (
      <form className="status-bubble status-bubble-editing" onSubmit={save}>
        <textarea
          autoFocus
          rows={2}
          maxLength={MAX_LENGTH}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false) }}
          placeholder="What are you making these days? A few words about you..."
          aria-label="Your status"
        />
        <div className="status-edit-bar">
          <small className="muted">{MAX_LENGTH - draft.length} left</small>
          {error && <small className="text-error">{error}</small>}
          <button type="button" className="icon-btn" onClick={() => setEditing(false)} aria-label="Cancel"><X size={16} /></button>
          <button className="btn btn-xs btn-primary" disabled={saving}><Check size={12} /> {saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    )
  }

  // No status yet: your own profile gets an invitation, others see nothing
  if (!profile.bio) {
    if (!editable) return null
    return (
      <button className="status-bubble status-bubble-empty" onClick={startEditing}>
        <MessageCircleHeart size={16} /> Set a status: what are you making, what do you love?
      </button>
    )
  }

  const text = <p className="status-text">{profile.bio}</p>
  return editable ? (
    <button className="status-bubble status-bubble-own" onClick={startEditing} title="Edit your status">
      {text}
      <Pencil size={13} className="status-edit-icon" aria-label="Edit" />
    </button>
  ) : (
    <div className="status-bubble">{text}</div>
  )
}
