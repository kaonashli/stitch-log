// Image helpers: shrink images in the browser BEFORE uploading so we stay well
// under Supabase's free 1 GB storage, then upload / build URLs.
import imageCompression from 'browser-image-compression'
import { supabase } from './supabase.js'

// Project photos: max ~300 KB, longest side 1600px. A 5 MB phone photo becomes ~250 KB.
export function compressPhoto(file) {
  return imageCompression(file, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1600,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
    useWebWorker: true,
  })
}

// Avatars: tiny, 256px is plenty for a profile picture.
export function compressAvatar(file) {
  return imageCompression(file, {
    maxSizeMB: 0.05,
    maxWidthOrHeight: 256,
    fileType: 'image/jpeg',
    useWebWorker: true,
  })
}

// ---------- Avatars (public bucket) ----------

export function avatarUrl(path) {
  if (!path) return null
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

// Compresses and uploads an avatar. Returns the storage path to save on the profile.
// Files go in '<userId>/...' because the storage rules only allow writing to your own folder.
export async function uploadAvatar(userId, file) {
  const compressed = await compressAvatar(file)
  const path = `${userId}/${Date.now()}.jpg` // new name each time so browsers don't show a cached old image
  const { error } = await supabase.storage.from('avatars').upload(path, compressed, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

export async function deleteAvatarFile(path) {
  if (!path) return
  await supabase.storage.from('avatars').remove([path])
}

// If email confirmation is on, a new user has no session right after signing up,
// so we can't upload their avatar yet. We keep the (already small) image in
// localStorage and upload it the first time they log in.
const PENDING_AVATAR_KEY = 'stitchlog.pendingAvatar'

export async function savePendingAvatar(email, file) {
  const compressed = await compressAvatar(file)
  const dataUrl = await imageCompression.getDataUrlFromFile(compressed)
  try {
    localStorage.setItem(PENDING_AVATAR_KEY, JSON.stringify({ email: email.toLowerCase(), dataUrl }))
  } catch {
    // Storage full or blocked: the user can still add an avatar later in Settings.
  }
}

export function clearPendingAvatar() {
  try { localStorage.removeItem(PENDING_AVATAR_KEY) } catch { /* ignore */ }
}

// Called after login. Returns the new avatar path, or null if there was nothing to do.
export async function uploadPendingAvatar(user, profile) {
  let pending = null
  try { pending = JSON.parse(localStorage.getItem(PENDING_AVATAR_KEY)) } catch { return null }
  if (!pending || pending.email !== (user.email || '').toLowerCase()) return null
  clearPendingAvatar()
  if (profile.avatar_path) return null

  try {
    const file = await imageCompression.getFilefromDataUrl(pending.dataUrl, 'avatar.jpg')
    const path = await uploadAvatar(user.id, file)
    const { error } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', user.id)
    if (error) throw error
    return path
  } catch (err) {
    console.error('Could not upload saved avatar', err)
    return null
  }
}

// ---------- Project photos (private bucket) ----------

// The bucket is private, so we ask Supabase for temporary signed links (valid 1 hour).
// Returns an object like { 'user/project/file.jpg': 'https://...signed...' }
export async function getPhotoUrls(paths) {
  if (!paths.length) return {}
  const { data, error } = await supabase.storage.from('project-photos').createSignedUrls(paths, 60 * 60)
  if (error) {
    console.error('Could not load photo links', error)
    return {}
  }
  const urls = {}
  for (const item of data) {
    if (item.signedUrl) urls[item.path] = item.signedUrl
  }
  return urls
}

// Compresses and uploads one project photo. Returns its storage path.
export async function uploadProjectPhoto(userId, projectId, file) {
  const compressed = await compressPhoto(file)
  const path = `${userId}/${projectId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('project-photos').upload(path, compressed, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

export async function deleteProjectPhotoFiles(paths) {
  if (!paths.length) return
  const { error } = await supabase.storage.from('project-photos').remove(paths)
  if (error) console.error('Could not delete photo files', error)
}
