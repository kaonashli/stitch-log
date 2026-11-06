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
  // How many (whole number, at least 1), or "Unsure" (stored as NULL).
  // Stored as project_materials.quantity.
  quantity: { label: 'Amount', type: 'number', min: 1, step: 1 },
  // Price for ONE; the line's cost is cost x amount. Optional.
  cost: { label: 'Cost each', type: 'number', min: 0, step: 0.01, placeholder: '0.00' },
  brand: { label: 'Brand' },
  color: { label: 'Color' },
  weight: { label: 'Weight', placeholder: 'e.g. DK, Worsted' },
  yardage: { label: 'Yardage', type: 'number' },
  gauge: { label: 'Gauge', placeholder: 'e.g. 22 sts x 30 rows = 10 cm' },
  size: { label: 'Size', placeholder: 'e.g. 4.0 mm, US 6' },
  // Picked from FIBERS (several for a blend). Stored as project_materials.fibers (a list).
  fibers: { label: 'Fiber' },
  notes: { label: 'Notes' },
}

// Which fields each material type uses. Must match the check constraint
// on project_materials.material_type.
// Every type starts with Amount and ends with Cost each + Notes.
export const MATERIAL_TYPES = {
  yarn: { label: 'Yarn', fields: ['quantity', 'brand', 'color', 'weight', 'yardage', 'gauge', 'fibers', 'cost', 'notes'] },
  needle: { label: 'Needle / hook', fields: ['quantity', 'size', 'cost', 'notes'] },
  string: { label: 'String', fields: ['quantity', 'fibers', 'cost', 'notes'] },
  stuffing: { label: 'Stuffing', fields: ['quantity', 'cost', 'notes'] },
  buttons: { label: 'Buttons', fields: ['quantity', 'color', 'cost', 'notes'] },
}

// Material costs are private, so they live in their own table (material_costs).
// Queries fetch them with "project_materials(*, material_costs(cost))"; this
// copies the cost onto the material as m.cost (null if none, or if it's
// someone else's project, since the database only gives you your own costs).
export function withCost(material) {
  const row = Array.isArray(material.material_costs) ? material.material_costs[0] : material.material_costs
  return { ...material, cost: row?.cost ?? null }
}

// Cost of one material line (cost each x amount), or 0 if no cost was entered.
// An "Unsure" amount counts as 1.
export function materialLineCost(material) {
  const cost = Number(material.cost)
  if (material.cost === null || material.cost === '' || Number.isNaN(cost)) return 0
  return cost * Math.max(1, Math.floor(Number(material.quantity) || 1))
}

// Does this material have a cost entered?
export function hasCost(material) {
  return material.cost !== null && material.cost !== undefined && String(material.cost).trim() !== ''
}

// Suggestions shown in the yarn "Weight" box (users can still type anything).
export const YARN_WEIGHTS = ['Lace', 'Fingering', 'Sport', 'DK', 'Worsted', 'Aran', 'Bulky', 'Super Bulky', 'Jumbo']

// The two material sections. Must match the check constraint on
// project_materials.status. "to_buy" items show on the home shopping list.
export const MATERIAL_SECTIONS = [
  { value: 'to_buy', label: 'To buy', hint: 'Still need to get these' },
  { value: 'owned', label: 'In my stash', hint: 'Already have these' },
]

// Difficulty 1-5 (projects.difficulty). Based on the usual yarn-craft skill levels.
export const DIFFICULTIES = [
  { value: 1, label: 'Beginner' },
  { value: 2, label: 'Easy' },
  { value: 3, label: 'Intermediate' },
  { value: 4, label: 'Experienced' },
  { value: 5, label: 'Expert' },
]

export function difficultyLabel(value) {
  return DIFFICULTIES.find((d) => d.value === value)?.label ?? ''
}

// Money display. Change CURRENCY to show another currency symbol (e.g. 'EUR', 'CAD').
// "narrowSymbol" shows just "$" (some browsers would otherwise show "US$").
export const CURRENCY = 'USD'
const moneyFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY, currencyDisplay: 'narrowSymbol' })
export function formatMoney(amount) {
  return moneyFormat.format(Number(amount) || 0)
}

export const MAX_PHOTOS = 10

// Must match the check constraint on profile_widgets.widget_type.
export const WIDGET_TYPES = {
  kanban: { label: 'Project board', description: 'Your projects in columns by status' },
  calendar: { label: 'Project timeline', description: 'When each project started and finished' },
  gallery: { label: 'Project gallery', description: 'Your favorite projects in a photo grid' },
  focus: { label: 'Focus project', description: 'Show off the project you starred' },
  made_for: { label: 'Made for', description: 'How many projects you made for each person' },
  fibers: { label: 'Favorite fibers', description: 'The fibers you use the most' },
}

// Admin "view as" modes (see AuthContext)
export const VIEW_AS_LABELS = {
  user: 'a regular user',
  friend: 'a friend',
  stranger: 'a stranger',
}

// Fibers for yarn and string. You can pick several for a blend.
export const FIBERS = [
  'Acrylic', 'Alpaca', 'Angora', 'Bamboo', 'Cashmere', 'Cotton', 'Hemp', 'Linen', 'Merino',
  'Mohair', 'Nylon', 'Polyester', 'Silk', 'Wool', 'Yak', 'Other',
]

// "Who it's for" written as a name: these mean yourself
export function isSelfName(name) {
  return ['me', 'myself'].includes(String(name ?? '').trim().toLowerCase())
}
