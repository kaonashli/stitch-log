// Profile page. /profile shows your own; /u/:username shows someone else's.
// Your own profile has editable widgets and a Settings button (on phones
// that's the way to reach Settings). Friends see your badges, friends list,
// and widgets read-only. Non-friends just see your name, "About me", and an
// Add button.
//
// Admins testing with "View as a friend / a stranger" see their OWN profile
// the way that person would (see AuthContext).
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Eye, Lock, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { escapeLike } from '../lib/friends.js'
import { formatDate, toLocalDateString } from '../lib/dates.js'
import { VIEW_AS_LABELS } from '../lib/constants.js'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from '../components/Avatar.jsx'
import Spinner from '../components/Spinner.jsx'
import FriendButton from '../components/friends/FriendButton.jsx'
import WidgetBoard from '../components/widgets/WidgetBoard.jsx'
import FriendsOfList from '../components/FriendsOfList.jsx'
import ProfileStatus from '../components/ProfileStatus.jsx'

export default function ProfilePage() {
  const { username } = useParams()
  const { profile: me, viewAs } = useAuth()
  const isOwn = !username || username.toLowerCase() === me.username.toLowerCase()

  const [profile, setProfile] = useState(isOwn ? me : null)
  const [loading, setLoading] = useState(!isOwn)
  const [isFriend, setIsFriend] = useState(false)
  const [counts, setCounts] = useState(null) // { total, in_progress, finished }

  // What this visit should look like. Normally: your own view, or friend /
  // stranger depending on the real friendship. "View as" overrides it.
  const viewingOwnAsOther = isOwn && (viewAs === 'friend' || viewAs === 'stranger')
  const ownView = isOwn && !viewingOwnAsOther
  const friendView = viewAs === 'stranger' ? false : viewAs === 'friend' ? true : isFriend
  const canSeeDetails = ownView || (!isOwn && friendView) || (viewingOwnAsOther && viewAs === 'friend')

  useEffect(() => {
    if (isOwn) {
      setProfile(me)
      setLoading(false)
      return
    }
    setLoading(true)
    supabase
      .from('profiles')
      .select('*')
      .ilike('username', escapeLike(username)) // case-insensitive exact match
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data)
        setLoading(false)
      })
  }, [username, isOwn, me])

  // Project counts for the header. These include private projects (just the
  // numbers, nothing else), and are only shown to you and your friends.
  const profileId = profile?.id
  useEffect(() => {
    setCounts(null)
    if (!profileId || !canSeeDetails) return
    supabase.rpc('profile_project_counts', { target: profileId }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data
      if (row) setCounts({ total: Number(row.total), in_progress: Number(row.in_progress), finished: Number(row.finished) })
    })
  }, [profileId, canSeeDetails])

  if (loading) return <Spinner />
  if (!profile) return <div className="card empty"><p>No one with the username @{username}.</p></div>

  const memberSince = formatDate(toLocalDateString(new Date(profile.created_at)))

  return (
    <div className="stack">
      {viewingOwnAsOther && (
        <p className="view-as-note"><Eye size={14} /> This is how your profile looks to {VIEW_AS_LABELS[viewAs]}.</p>
      )}

      <div className="card profile-header">
        <Avatar profile={profile} size={84} />
        <div className="profile-names">
          <h1>{profile.display_name}</h1>
          <span className="muted">@{profile.username} · Joined {memberSince}</span>
          {counts && (
            <span className="profile-counts">
              <span><strong>{counts.total}</strong> project{counts.total === 1 ? '' : 's'}</span>
              <span><strong>{counts.in_progress}</strong> in progress</span>
              <span><strong>{counts.finished}</strong> finished</span>
            </span>
          )}
        </div>
        {/* On phones these buttons (your Settings, or Add friend / Friends / Accept) sit in the
            top-right corner as round icons, so the status bubble stays right under the name */}
        <div className="profile-actions profile-actions-corner">
          {ownView && (
            <Link to="/settings" className="btn btn-ghost profile-settings-btn" aria-label="Settings" title="Settings">
              <Settings size={16} /> <span className="profile-settings-label">Settings</span>
            </Link>
          )}
          {!isOwn && <FriendButton me={me} other={profile} onChange={(f) => setIsFriend(f?.status === 'accepted')} />}
        </div>
        {/* Status / About me: everyone can see it (it helps people decide to add you).
            Edit your own by tapping it. */}
        <ProfileStatus profile={profile} editable={ownView} />
      </div>

      {canSeeDetails ? (
        <>
          <FriendsOfList userId={profile.id} title={ownView ? 'Your friends' : 'Friends'} />
          <WidgetBoard userId={profile.id} editable={ownView} focusProjectId={profile.focus_project_id} />
        </>
      ) : (
        <div className="card empty">
          <Lock size={24} />
          <p>Become friends with {profile.display_name} to see their projects.</p>
        </div>
      )}
    </div>
  )
}
