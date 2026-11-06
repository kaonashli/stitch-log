// Bug reports and change requests (the feedback_reports table).
// Anyone can send one: logged-in users (linked to their account, and they
// can see their own), or guests (with a name and optional email, and they
// can't see any). Admins with the 'feedback.manage' permission see all of
// them on a mini kanban.
import { supabase } from './supabase.js'

export const FEEDBACK_KINDS = [
  { value: 'bug', label: 'Bug' },
  { value: 'change', label: 'Change request' },
]

// Columns of the admin kanban, in order. Must match the database check.
export const FEEDBACK_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
]

export function feedbackStatusLabel(value) {
  return FEEDBACK_STATUSES.find((s) => s.value === value)?.label ?? value
}

export function feedbackKindLabel(value) {
  return FEEDBACK_KINDS.find((k) => k.value === value)?.label ?? value
}

// guestName / guestEmail are only used when nobody is logged in
export async function sendFeedback({ kind, title, details, guestName = null, guestEmail = null }) {
  const report = { kind, title: title.trim(), details: details.trim() || null }
  if (guestName !== null) {
    report.guest_name = guestName.trim()
    report.guest_email = guestEmail?.trim() || null
  }
  const { error } = await supabase.from('feedback_reports').insert(report)
  if (error) throw error
}

export async function loadMyFeedback(userId) {
  const { data, error } = await supabase
    .from('feedback_reports')
    .select('id, number, kind, title, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function loadAllFeedback() {
  const { data, error } = await supabase
    .from('feedback_reports')
    .select('id, number, kind, title, details, status, created_at, guest_name, guest_email, reporter:profiles!feedback_reports_user_id_fkey(id, username, display_name, avatar_path)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function setFeedbackStatus(id, status) {
  const { error } = await supabase.from('feedback_reports').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteFeedback(id) {
  const { error } = await supabase.from('feedback_reports').delete().eq('id', id)
  if (error) throw error
}
