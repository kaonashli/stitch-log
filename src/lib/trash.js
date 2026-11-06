// "Recently deleted" (soft delete) for projects.
//
// Deleting a project just sets deleted_at. The database then hides it from
// everyone except the owner (see supabase/migrations/011). The owner can
// restore it, or delete it forever, until it expires. Expired projects are
// deleted for good (photos included) by purgeExpiredProjects(), which runs
// when the owner opens the app.
import { supabase } from './supabase.js'
import { deleteProjectPhotoFiles } from './images.js'
import { formatDate, toLocalDateString } from './dates.js'

export const DELETE_AFTER_DAYS = 30

// The date a deleted project will be gone for good, e.g. 'Dec 5, 2026'
export function expiryDate(deletedAt) {
  const d = new Date(deletedAt)
  d.setDate(d.getDate() + DELETE_AFTER_DAYS)
  return formatDate(toLocalDateString(d))
}

// Whole days left before it's gone for good (0 = today)
export function daysLeft(deletedAt) {
  const expires = new Date(deletedAt).getTime() + DELETE_AFTER_DAYS * 86400000
  return Math.max(0, Math.ceil((expires - Date.now()) / 86400000))
}

export async function moveToTrash(projectId) {
  const { error } = await supabase.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', projectId)
  if (error) throw error
}

export async function restoreProject(projectId) {
  const { error } = await supabase.from('projects').update({ deleted_at: null }).eq('id', projectId)
  if (error) throw error
}

// Delete for good: photo files first (the database can't remove those), then
// the project, which removes its materials, history, hearts, comments, and
// friend activity entries along with it.
export async function deleteForever(projectId) {
  const { data: photos } = await supabase.from('project_photos').select('storage_path').eq('project_id', projectId)
  await deleteProjectPhotoFiles((photos ?? []).map((p) => p.storage_path))
  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  if (error) throw error
}

export async function loadTrash(userId) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, icon, color, status, deleted_at')
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
  if (error) throw error
  return data
}

// Delete for good anything that's been in Recently deleted for 30+ days
export async function purgeExpiredProjects(userId) {
  const cutoff = new Date(Date.now() - DELETE_AFTER_DAYS * 86400000).toISOString()
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', userId)
    .lt('deleted_at', cutoff)
  for (const project of data ?? []) {
    try {
      await deleteForever(project.id)
    } catch (err) {
      console.error('Could not remove an expired project', err)
    }
  }
}
