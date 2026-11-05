// App-wide lists and settings. Keep these in sync with supabase/schema.sql.

// Same rule as the check constraint on profiles.username
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/
export const MIN_PASSWORD_LENGTH = 8

// Must match the "project_status" enum in the database.
export const STATUSES = [
  { value: 'idea', label: 'Idea' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'paused', label: 'Paused' },
  { value: 'finished', label: 'Finished' },
  { value: 'frogged', label: 'Frogged' },
]

export function statusLabel(value) {
  const found = STATUSES.find((s) => s.value === value)
  return found ? found.label : value
}

// Every possible material field and how to show it in the form.
export const MATERIAL_FIELDS = {
  brand: { label: 'Brand' },
  color: { label: 'Color' },
  weight: { label: 'Weight', placeholder: 'e.g. DK, Worsted' },
  yardage: { label: 'Yardage', type: 'number' },
  gauge: { label: 'Gauge', placeholder: 'e.g. 22 sts x 30 rows = 10 cm' },
  size: { label: 'Size', placeholder: 'e.g. 4.0 mm, US 6' },
  notes: { label: 'Notes' },
}

// Which fields each material type uses. Must match the check constraint
// on project_materials.material_type.
export const MATERIAL_TYPES = {
  yarn: { label: 'Yarn', fields: ['brand', 'color', 'weight', 'yardage', 'gauge', 'notes'] },
  needle: { label: 'Needle / hook', fields: ['size', 'notes'] },
  string: { label: 'String', fields: ['notes'] },
  stuffing: { label: 'Stuffing', fields: ['notes'] },
  buttons: { label: 'Buttons', fields: ['color', 'notes'] },
}

// Suggestions shown in the yarn "Weight" box (users can still type anything).
export const YARN_WEIGHTS = ['Lace', 'Fingering', 'Sport', 'DK', 'Worsted', 'Aran', 'Bulky', 'Super Bulky', 'Jumbo']

export const MAX_PHOTOS = 10

// Must match the check constraint on profile_widgets.widget_type.
export const WIDGET_TYPES = {
  kanban: { label: 'Project board', description: 'Your projects in columns by status' },
  calendar: { label: 'Stitch calendar', description: 'Which days you worked on your projects' },
}
