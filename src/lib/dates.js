// Date helpers. Dates without a time (start_date, finish_date) are stored as
// 'YYYY-MM-DD' strings. We always use the user's LOCAL date, not UTC, so
// "today" means today where the user is.

export function toLocalDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayLocal() {
  return toLocalDateString(new Date())
}

// 'YYYY-MM-DD' -> Date at local midnight (new Date('2024-01-05') would be UTC!)
export function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// '2024-03-05' -> 'Mar 5, 2024'
export function formatDate(str) {
  if (!str) return ''
  return parseLocalDate(str).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Number of days from a to b, counting both ends ('2024-01-01' to '2024-01-01' = 1)
export function daysInclusive(a, b) {
  const ms = parseLocalDate(b) - parseLocalDate(a)
  return Math.round(ms / 86400000) + 1
}

// ISO timestamp -> '5 minutes ago', '3 days ago', or a date
export function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatDate(toLocalDateString(new Date(iso)))
}
