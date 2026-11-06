// Milestones: your own steps and plans inside a project (like tasks under a
// user story). Each has a title, an optional target date (due_date), and
// done_at (when you ticked it off). Stored in project_milestones (migration 020).
// Unlike materials, every change saves right away (no Edit form needed).
import { supabase } from './supabase.js'

// Quick-add ideas shown under the "Add a milestone" box
export const MILESTONE_SUGGESTIONS = [
  'Buy the yarn', 'Swatch', 'Cast on', 'Finish the body', 'Finish the sleeves',
  'Sew the pieces together', 'Weave in ends', 'Blocking', 'Add buttons',
]

const FIELDS = 'id, title, due_date, done_at, sort_order, created_at'

export async function loadMilestones(projectId) {
  const { data, error } = await supabase
    .from('project_milestones')
    .select(FIELDS)
    .eq('project_id', projectId)
    .order('sort_order')
    .order('created_at')
  if (error) throw error
  return data
}

// Adds it at the end of the list and returns the new row
export async function addMilestone(projectId, title, sortOrder, dueDate = null) {
  const { data, error } = await supabase
    .from('project_milestones')
    .insert({ project_id: projectId, title: title.trim(), sort_order: sortOrder, due_date: dueDate || null })
    .select(FIELDS)
    .single()
  if (error) throw error
  return data
}

// changes = e.g. { title }, { due_date }, or { done_at }
export async function updateMilestone(id, changes) {
  const { error } = await supabase.from('project_milestones').update(changes).eq('id', id)
  if (error) throw error
}

export async function deleteMilestone(id) {
  const { error } = await supabase.from('project_milestones').delete().eq('id', id)
  if (error) throw error
}

// Save a new order: each milestone's sort_order = its place in the list
export async function saveMilestoneOrder(list) {
  const results = await Promise.all(
    list.map((m, index) => supabase.from('project_milestones').update({ sort_order: index }).eq('id', m.id)),
  )
  const failed = results.find((r) => r.error)
  if (failed) throw failed.error
}

// { done, total, next } for progress bars. next = the first one not done yet.
export function milestoneProgress(milestones) {
  const list = [...(milestones ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.created_at?.localeCompare(b.created_at))
  return {
    done: list.filter((m) => m.done_at).length,
    total: list.length,
    next: list.find((m) => !m.done_at) ?? null,
  }
}
