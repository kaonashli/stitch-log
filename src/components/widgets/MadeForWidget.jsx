// "Made for" widget: how many projects were made for each person, using
// "Who it's for" on each project (tagged people and plain names like "Grandma").
import { Link } from 'react-router-dom'
import { isSelfName } from '../../lib/constants.js'
import Avatar from '../Avatar.jsx'

// [{ key, label, person, total, finished }] sorted by most projects
export function countRecipients(projects, ownerId) {
  const people = new Map()
  for (const project of projects) {
    const seen = new Set() // count each person once per project
    for (const r of project.project_recipients ?? []) {
      // The owner counts as "Me", whether tagged or typed as "me"
      const isSelf = r.user_id === ownerId || (!r.user_id && isSelfName(r.name))
      const key = isSelf ? 'me' : r.user_id ?? `name:${r.name.trim().toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      if (!people.has(key)) {
        people.set(key, {
          key,
          label: isSelf ? 'Me' : r.person?.display_name ?? r.name.trim(),
          person: r.person && !isSelf ? r.person : null,
          total: 0,
          finished: 0,
        })
      }
      const entry = people.get(key)
      entry.total++
      if (project.status === 'finished') entry.finished++
    }
  }
  return [...people.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
}

export default function MadeForWidget({ projects, ownerId }) {
  const rows = countRecipients(projects, ownerId)
  const most = rows[0]?.total ?? 1

  if (rows.length === 0) {
    return <p className="muted">No one yet. Fill in "Who it's for" on a project to see it here.</p>
  }

  return (
    <ul className="bar-list">
      {rows.map((row) => (
        <li key={row.key} className="bar-row">
          <span className="bar-label">
            {row.person
              ? <Link to={`/u/${row.person.username}`} className="row"><Avatar profile={row.person} size={22} /> {row.label}</Link>
              : <span>{row.label}</span>}
          </span>
          <span className="bar-track"><span className="bar-fill" style={{ width: `${(row.total / most) * 100}%` }} /></span>
          <span className="bar-value">
            <strong>{row.total}</strong>
            {row.finished > 0 && <small className="muted"> ({row.finished} done)</small>}
          </span>
        </li>
      ))}
    </ul>
  )
}
