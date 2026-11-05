// Round profile picture. Falls back to the person's initial if they have no image.
import { avatarUrl } from '../lib/images.js'

export default function Avatar({ profile, size = 40 }) {
  const style = { width: size, height: size, fontSize: size * 0.42 }
  const url = avatarUrl(profile?.avatar_path)
  if (url) {
    return <img className="avatar" src={url} alt="" style={style} />
  }
  const initial = (profile?.display_name || profile?.username || '?').trim().charAt(0).toUpperCase()
  return <span className="avatar avatar-fallback" style={style} aria-hidden="true">{initial}</span>
}
