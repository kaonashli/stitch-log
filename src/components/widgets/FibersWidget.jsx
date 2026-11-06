// "Favorite fibers" widget: which fibers show up the most in your projects'
// yarn and string (each fiber counts once per project).
const MAX_ROWS = 8

export function countFibers(projects) {
  const counts = new Map()
  for (const project of projects) {
    const inThisProject = new Set()
    for (const m of project.project_materials ?? []) {
      for (const fiber of m.fibers ?? []) inThisProject.add(fiber)
    }
    for (const fiber of inThisProject) counts.set(fiber, (counts.get(fiber) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([fiber, count]) => ({ fiber, count }))
    .sort((a, b) => b.count - a.count || a.fiber.localeCompare(b.fiber))
}

export default function FibersWidget({ projects }) {
  const rows = countFibers(projects).slice(0, MAX_ROWS)
  const most = rows[0]?.count ?? 1

  if (rows.length === 0) {
    return <p className="muted">No fibers yet. Pick a fiber on a project's yarn or string to see it here.</p>
  }

  return (
    <ul className="bar-list">
      {rows.map((row, index) => (
        <li key={row.fiber} className="bar-row">
          <span className="bar-label">
            {/* the top fiber gets a little ribbon */}
            {index === 0 && <span className="fiber-top" aria-label="Favorite" />}
            {row.fiber}
          </span>
          <span className="bar-track"><span className="bar-fill bar-fill-fiber" style={{ width: `${(row.count / most) * 100}%` }} /></span>
          <span className="bar-value">
            <strong>{row.count}</strong> <small className="muted">project{row.count === 1 ? '' : 's'}</small>
          </span>
        </li>
      ))}
    </ul>
  )
}
