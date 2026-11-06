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
    .select(`id, body, created_at, user_id, parent_id, author:profiles!project_comments_user_id_fkey(${PROFILE_FIELDS}), mentions:comment_mentions(user:profiles(id, username))`)
    .eq('project_id', projectId)
    .order('created_at')
  if (error) throw error
  return data
}

// Post a comment. mentionIds = people tagged in it (see extractMentions).
// parentId = the comment this one replies to (or null).
// The database checks each tag is allowed and notifies the tagged people
// (and, for a reply, the person replied to).
export async function addComment(projectId, body, mentionIds = [], parentId = null) {
  const { data, error } = await supabase
    .from('project_comments')
    .insert({ project_id: projectId, body, parent_id: parentId })
    .select('id')
    .single()
  if (error) throw error
  if (mentionIds.length) {
    const { error: mentionError } = await supabase
      .from('comment_mentions')
      .insert(mentionIds.map((userId) => ({ comment_id: data.id, user_id: userId })))
    if (mentionError) throw mentionError
  }
}

// People I'm allowed to tag in a comment on this project: friends of mine
// who are also friends with the project's owner (mention_candidates() in the database)
export async function loadMentionCandidates(projectId) {
  const { data, error } = await supabase.rpc('mention_candidates', { project: projectId })
  if (error) return []
  return data
}

// Find the "@username" tags in a comment that match people I can tag.
// Returns their ids (each person once).
export function extractMentions(body, candidates) {
  const ids = new Set()
  for (const match of body.matchAll(/@([A-Za-z0-9_]{3,20})/g)) {
    const person = candidates.find((c) => c.username.toLowerCase() === match[1].toLowerCase())
    if (person) ids.add(person.id)
  }
  return [...ids]
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
