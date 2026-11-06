// Profile page. /profile shows your own; /u/:username shows someone else's.
// Your own profile has editable widgets and a Settings button (on phones
// that's the way to reach Settings). Friends see your widgets read-only.
// Non-friends just see your name and an Add button.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Lock, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { escapeLike } from '../lib/friends.js'
import { formatDate, toLocalDateString } from '../lib/dates.js'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from '../components/Avatar.jsx'
import Spinner from '../components/Spinner.jsx'
import FriendButton from '../components/friends/FriendButton.jsx'
import WidgetBoard from '../components/widgets/WidgetBoard.jsx'

export default function ProfilePage() {
  const { username } = useParams()
  const { profile: me } = useAuth()
  const isOwn = !username || username.toLowerCase() === me.username.toLowerCase()

  const [profile, setProfile] = useState(isOwn ? me : null)
  const [loading, setLoading] = useState(!isOwn)
  const [isFriend, setIsFriend] = useState(false)

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

  if (loading) return <Spinner />
  if (!profile) return <div className="card empty"><p>No one with the username @{username}.</p></div>

  const memberSince = formatDate(toLocalDateString(new Date(profile.created_at)))

  return (
    <div className="stack">
      <div className="card profile-header">
        <Avatar profile={profile} size={84} />
        <div className="profile-names">
          <h1>{profile.display_name}</h1>
          <span className="muted">@{profile.username} · Joined {memberSince}</span>
        </div>
        <div className="profile-actions">
          {isOwn
            ? <Link to="/settings" className="btn btn-ghost"><Settings size={16} /> Settings</Link>
            : <FriendButton me={me} other={profile} onChange={(f) => setIsFriend(f?.status === 'accepted')} />}
        </div>
      </div>

      {isOwn ? (
        <WidgetBoard userId={me.id} editable />
      ) : isFriend ? (
        <WidgetBoard userId={profile.id} editable={false} />
      ) : (
        <div className="card empty">
          <Lock size={24} />
          <p>Become friends with {profile.display_name} to see their projects.</p>
        </div>
      )}
    </div>
  )
}
