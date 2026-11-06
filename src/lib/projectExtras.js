// Extra parts of a project that live in their own tables:
//   - project_recipients   "Who it's for": tagged people (you or friends) or plain names
//   - project_links        links, each with an optional title, public or private
//   - project_reflections  wrap-up answers for finished / frogged projects,
//                          each one public (friends) or private
// Like materials, saving replaces the whole list (delete, then insert).
import { supabase } from './supabase.js'

// ---------- Wrap-up questions ----------
// field = the database value (project_reflections.field)
export const REFLECTION_FIELDS = [
  { field: 'make_again', label: 'Would I make this again?' },
  { field: 'enjoyment', label: 'Enjoyment level' },
  { field: 'skills', label: 'Skills learned' },
  { field: 'recommend_to', label: 'Who would I recommend this project to?' },
]

export const MAKE_AGAIN_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'No' },
]

export const ENJOYMENT_LABELS = ['', 'Not fun', 'Meh', 'It was okay', 'Enjoyed it', 'Loved it']

// Do wrap-up questions apply to this status?
export function hasWrapUp(status) {
  return status === 'finished' || status === 'frogged'
}

// Empty answers for the form: { make_again: { value: '', is_public: true }, ... }
export function emptyReflections() {
  const result = {}
  for (const { field } of REFLECTION_FIELDS) result[field] = { value: '', is_public: true }
  return result
}

// ---------- Loading ----------
const PERSON = 'id, username, display_name, avatar_path'

export async function loadRecipients(projectId) {
  const { data, error } = await supabase
    .from('project_recipients')
    .select(`id, name, user_id, sort_order, person:profiles!project_recipients_user_id_fkey(${PERSON})`)
    .eq('project_id', projectId)
    .order('sort_order')
  if (error) throw error
  return data
}

export async function loadLinks(projectId) {
  const { data, error } = await supabase
    .from('project_links')
    .select('id, url, title, is_public, sort_order')
    .eq('project_id', projectId)
    .order('sort_order')
  if (error) throw error
  return data
}

// Returns { make_again: { value, is_public }, ... } with only the answered ones
export async function loadReflections(projectId) {
  const { data, error } = await supabase
    .from('project_reflections')
    .select('field, value, is_public')
    .eq('project_id', projectId)
  if (error) throw error
  const result = {}
  for (const row of data) result[row.field] = { value: row.value, is_public: row.is_public }
  return result
}

// ---------- Saving (replace the whole list) ----------
// recipients = [{ user_id } or { name }]
export async function saveRecipients(projectId, recipients) {
  const { error } = await supabase.from('project_recipients').delete().eq('project_id', projectId)
  if (error) throw error
  if (!recipients.length) return
  const rows = recipients.map((r, index) => ({
    project_id: projectId,
    user_id: r.user_id ?? null,
    name: r.user_id ? null : r.name.trim(),
    sort_order: index,
  }))
  const { error: insertError } = await supabase.from('project_recipients').insert(rows)
  if (insertError) throw insertError
}

// links = [{ url, title, is_public }]; rows with an empty URL are skipped
export async function saveLinks(projectId, links) {
  const { error } = await supabase.from('project_links').delete().eq('project_id', projectId)
  if (error) throw error
  const rows = links
    .filter((l) => l.url.trim())
    .map((l, index) => ({
      project_id: projectId,
      url: l.url.trim(),
      title: l.title.trim() || null,
      is_public: l.is_public,
      sort_order: index,
    }))
  if (!rows.length) return
  const { error: insertError } = await supabase.from('project_links').insert(rows)
  if (insertError) throw insertError
}

// reflections = { field: { value, is_public } }; empty answers are not saved
export async function saveReflections(projectId, reflections) {
  const { error } = await supabase.from('project_reflections').delete().eq('project_id', projectId)
  if (error) throw error
  const rows = Object.entries(reflections)
    .filter(([, r]) => String(r.value ?? '').trim())
    .map(([field, r]) => ({ project_id: projectId, field, value: String(r.value).trim(), is_public: r.is_public }))
  if (!rows.length) return
  const { error: insertError } = await supabase.from('project_reflections').insert(rows)
  if (insertError) throw insertError
}

// ---------- Display helpers ----------
// "Grandma", or the tagged person's display name
export function recipientName(recipient) {
  return recipient.person?.display_name ?? recipient.name ?? ''
}

// The text after a link, e.g. "Pattern" or "ravelry.com"
export function linkLabel(link) {
  if (link.title) return link.title
  try {
    return new URL(link.url).hostname.replace(/^www\./, '')
  } catch {
    return link.url
  }
}
