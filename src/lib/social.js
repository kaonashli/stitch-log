// Database calls for hearts and comments on projects.
// Row Level Security decides who's allowed: friends of the owner can heart
// and comment; the owner can comment and delete any comment on their project.
// The database creates/removes the matching notifications by itself.
import { supabase } from './supabase.js'

const PROFILE_FIELDS = 'id, username, display_name, avatar_path'

export async function loadHearts(projectId) {
  const { data, error } = await supabase
    .from('project_likes')
    .select(`user_id, created_at, profile:profiles!project_likes_user_id_fkey(${PROFILE_FIELDS})`)
    .eq('project_id', projectId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function addHeart(projectId) {
  const { error } = await supabase.from('project_likes').insert({ project_id: projectId })
  if (error) throw error
}

export async function removeHeart(projectId, userId) {
  const { error } = await supabase.from('project_likes').delete().eq('project_id', projectId).eq('user_id', userId)
  if (error) throw error
}

export async function loadComments(projectId) {
  const { data, error } = await supabase
    .from('project_comments')
    .select(`id, body, created_at, user_id, author:profiles!project_comments_user_id_fkey(${PROFILE_FIELDS})`)
    .eq('project_id', projectId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function addComment(projectId, body) {
  const { error } = await supabase.from('project_comments').insert({ project_id: projectId, body })
  if (error) throw error
}

export async function deleteComment(commentId) {
  const { error } = await supabase.from('project_comments').delete().eq('id', commentId)
  if (error) throw error
}

// Are you friends with this person? (uses the is_friend() database function)
export async function checkIsFriend(otherUserId) {
  const { data, error } = await supabase.rpc('is_friend', { other_user: otherUserId })
  if (error) return false
  return Boolean(data)
}
