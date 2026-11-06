// Badges you earn and show on your profile.
//
// They're worked out from numbers the database gives us (see
// profile_badge_stats() in migration 016), every time the profile loads.
// Nothing is stored, so if you delete the projects that earned a badge,
// the badge goes away again by itself.
//
// Each badge: { id, family, level, name, description, earned(stats) }
//   family = which picture it gets (see BadgeIcon.jsx)
//   level  = 1, 2, 3... for badges that come in levels (shown as a ribbon number)
//
// To add a badge: add it here, and (for a new family) a picture in BadgeIcon.jsx.
//
// New badges: the database remembers which badges you already had
// (user_badges, migration 018), so checkMyBadges() can tell when a new one
// arrives. Then you get a notification and a congratulations pop-up.
import { supabase } from './supabase.js'

// Badges with levels: one badge per threshold
function levels(family, thresholds, names, statKey, describe) {
  return thresholds.map((count, index) => ({
    id: `${family}-${count}`,
    family,
    level: index + 1,
    ribbon: thresholds.length > 1 ? String(count) : null,
    name: names[index],
    description: describe(count),
    earned: (stats) => (stats[statKey] ?? 0) >= count,
  }))
}

const under = (key, days) => (stats) => stats[key] !== null && stats[key] !== undefined && stats[key] < days

export const BADGES = [
  // ----- Getting started -----
  {
    id: 'first-started', family: 'started', level: 1, name: 'First Project Started',
    description: 'Started working on a project.',
    earned: (s) => (s.started ?? 0) >= 1,
  },
  {
    id: 'first-finished', family: 'finished', level: 1, name: 'First Project Completed',
    description: 'Finished a project.',
    earned: (s) => (s.finished ?? 0) >= 1,
  },

  // ----- Crafts (with levels) -----
  ...levels(
    'knitter', [1, 5, 10, 15, 20, 30],
    ['Knitter', 'Busy Needles', 'Seasoned Knitter', 'Knitting Devotee', 'Master Knitter', 'Knitting Legend'],
    'knit_finished',
    (n) => (n === 1 ? 'Finished a knitting project.' : `Finished ${n} knitting projects.`),
  ),
  ...levels(
    'crocheter', [1, 5, 10, 15, 20, 30],
    ['Crocheter', 'Hooked', 'Seasoned Crocheter', 'Crochet Devotee', 'Master Crocheter', 'Crochet Legend'],
    'crochet_finished',
    (n) => (n === 1 ? 'Finished a crochet project.' : `Finished ${n} crochet projects.`),
  ),

  // ----- Speed -----
  {
    id: 'under-year', family: 'calendar-year', level: 1, name: 'Done Within a Year',
    description: 'Finished a project less than a year after starting it.',
    earned: under('fastest_days', 365),
  },
  {
    id: 'under-6-months', family: 'calendar-half', level: 2, name: 'Done Within 6 Months',
    description: 'Finished a project less than 6 months after starting it.',
    earned: under('fastest_days', 183),
  },
  {
    id: 'under-month', family: 'calendar-month', level: 3, name: 'Done Within a Month',
    description: 'Finished a project less than a month after starting it.',
    earned: under('fastest_days', 31),
  },
  {
    id: 'quick-knitter', family: 'quick-knit', level: 1, name: 'Quick Knitter',
    description: 'Finished a knitting project less than a week after starting it.',
    earned: under('fastest_knit_days', 7),
  },
  {
    id: 'quick-crocheter', family: 'quick-crochet', level: 1, name: 'Quick Crocheter',
    description: 'Finished a crochet project less than a week after starting it.',
    earned: under('fastest_crochet_days', 7),
  },
  {
    id: 'slow-steady', family: 'turtle', level: 1, name: 'Slow and Steady',
    description: 'Kept a project going for more than a year.',
    earned: (s) => (s.longest_days ?? 0) >= 365,
  },

  // ----- Friends (with levels) -----
  ...levels(
    'friends', [1, 3, 10, 20, 50],
    ['First Friend', 'Community', 'Circle of Friends', 'Knit Together', 'The Guild'],
    'friends',
    (n) => (n === 1 ? 'Made your first friend.' : `Have ${n} friends.`),
  ),

  // ----- Gifts (with levels) -----
  ...levels(
    'gift', [1, 5, 10, 20],
    ['Made with Love', 'Generous Maker', 'Gift Giver', 'Heart of Gold'],
    'gifts',
    (n) => (n === 1 ? 'Finished a project for someone else.' : `Finished ${n} projects for other people.`),
  ),

  // ----- Frogging -----
  {
    id: 'frogger', family: 'frog', level: 1, name: 'Rip It, Rip It',
    description: 'Frogged more than 5 projects. Every frog is a lesson!',
    earned: (s) => (s.frogged ?? 0) > 5,
  },
]

export function badgeById(id) {
  return BADGES.find((b) => b.id === id) ?? null
}

// The numbers behind the badges (you or a friend), or null if not allowed
export async function loadBadgeStats(userId) {
  const { data, error } = await supabase.rpc('profile_badge_stats', { target: userId })
  return error ? null : data
}

// When each badge was earned (you or a friend): Map of badge id -> date string.
// Empty if migration 019 hasn't been run or you're not allowed.
export async function loadBadgeDates(userId) {
  const { data, error } = await supabase.rpc('badge_earned_dates', { target: userId })
  return new Map(error ? [] : (data ?? []).map((row) => [row.badge_id, row.earned_at]))
}

// Put badges in the order they were earned (first earned first). Badges
// with no date yet go at the end; ties keep the normal BADGES order.
export function sortByEarned(badges, dates) {
  return [...badges].sort((a, b) => {
    const da = dates.get(a.id)
    const db = dates.get(b.id)
    if (da && db) return da.localeCompare(db)
    if (da) return -1
    if (db) return 1
    return 0
  })
}

// Check your own badges and tell the database which ones you have now.
// Returns the badges that are NEW since the last check (the database also
// creates a "New badge" notification for each one). Badges you lost
// (deleted projects) are forgotten, along with their notification.
export async function checkMyBadges(userId) {
  const stats = await loadBadgeStats(userId)
  if (!stats) return []
  const ids = earnedBadges(stats).map((b) => b.id)
  const { data, error } = await supabase.rpc('sync_badges', { earned: ids })
  if (error) return []
  return (data ?? []).map(badgeById).filter(Boolean)
}

// Ask for a badge check soon (after something that might earn one, like
// finishing a project). The BadgeWatcher in the app frame listens for this.
export function requestBadgeCheck() {
  window.dispatchEvent(new Event('stitchlog:check-badges'))
}

// Which badges these stats earn. For badges with levels, the profile shows
// the highest level of each family (and the rest in "All badges").
export function earnedBadges(stats) {
  if (!stats) return []
  return BADGES.filter((b) => b.earned(stats))
}

// The best earned badge of each family, in BADGES order
export function topBadges(stats) {
  const best = new Map()
  for (const badge of earnedBadges(stats)) {
    const current = best.get(badge.family)
    if (!current || badge.level > current.level) best.set(badge.family, badge)
  }
  return BADGES.filter((b) => best.get(b.family) === b)
}
