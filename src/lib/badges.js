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
