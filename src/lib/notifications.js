// Notifications: what to load, and how to turn one into words.
// (The database creates them; see supabase/migrations/008.)
import { supabase } from './supabase.js'

// Everything a notification needs to be shown: who did it, which project,
// the comment text, and the friend request's current status.
export const NOTIFICATION_FIELDS = `
  id, type, created_at, read_at, project_id, friendship_id,
  actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_path),
  project:projects(id, title, icon, color),
  comment:project_comments(body),
  friendship:friendships(id, status)
`

export async function loadNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_FIELDS)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}

export async function loadNotification(id) {
  const { data } = await supabase.from('notifications').select(NOTIFICATION_FIELDS).eq('id', id).maybeSingle()
  return data
}

// Shorten long comments for the notification text
function snippet(text, max = 80) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max - 3).trimEnd() + '...' : text
}

// { title, text, link } for a notification (used by the list and the pop-ups)
export function describeNotification(n) {
  const name = n.actor?.display_name ?? 'Someone'
  const project = n.project?.title ?? 'your project'
  switch (n.type) {
    case 'like':
      return { title: 'New heart', text: `${name} hearted ${project}.`, link: `/projects/${n.project_id}` }
    case 'comment':
      return {
        title: 'New comment',
        text: `${name} commented on ${project}: "${snippet(n.comment?.body)}"`,
        link: `/projects/${n.project_id}#comments`,
      }
    case 'friend_request':
      return { title: 'New friend request', text: `${name} sent you a friend request.`, link: '/friends' }
    case 'friend_accepted':
      return { title: 'Friend request accepted', text: `You and ${name} are now friends.`, link: `/u/${n.actor?.username}` }
    default:
      return { title: 'Notification', text: '', link: '/notifications' }
  }
}
