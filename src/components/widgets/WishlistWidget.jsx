// "Wish list" widget: things you still need to buy and have put on your wish
// list (the gift button on the home page Shopping list). Friends can see it,
// so they know what to get you. Costs are never shown, and items from a
// private project don't show that project's name.
// Bought items leave the wish list by themselves.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gift } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { MATERIAL_TYPES } from '../../lib/constants.js'
import ProjectIcon from '../ProjectIcon.jsx'

// e.g. "2 × Yarn: Cascade 220, Charcoal, DK, Merino + Silk"
function describe(item) {
  const type = MATERIAL_TYPES[item.material_type]?.label ?? item.material_type
  const parts = [
    item.brand,
    item.color,
    item.colors?.length ? item.colors.join(' + ') : null, // color tags
    item.weight,
    item.size,
    item.yardage ? `${item.yardage} yds` : null,
    item.fibers?.length ? item.fibers.join(' + ') : null,
  ].filter(Boolean)
  const amount = item.quantity > 1 ? `${item.quantity} × ` : ''
  return amount + (parts.length ? `${type}: ${parts.join(', ')}` : type)
}

export default function WishlistWidget({ userId, editable }) {
  const [items, setItems] = useState(null) // null = loading

  useEffect(() => {
    setItems(null)
    supabase.rpc('wishlist_of', { target: userId }).then(({ data }) => setItems(data ?? []))
  }, [userId])

  if (items === null) return <p className="muted small">Loading wish list...</p>

  if (items.length === 0) {
    return (
      <p className="muted small">
        {editable
          ? 'Your wish list is empty. On your home page Shopping list, tap the gift button on something you need, and your friends will see it here.'
          : 'Nothing on the wish list right now.'}
      </p>
    )
  }

  // Group by project; items from a private project (no title) go together at the end
  const groups = []
  for (const item of items) {
    const key = item.project_id ?? 'private'
    let group = groups.find((g) => g.key === key)
    if (!group) {
      group = { key, item, list: [] }
      groups.push(group)
    }
    group.list.push(item)
  }
  groups.sort((a, b) => (a.key === 'private') - (b.key === 'private'))

  return (
    <div className="stack-sm">
      {groups.map(({ key, item: first, list }) => (
        <div key={key} className="wish-group">
          {first.project_id ? (
            <Link to={`/projects/${first.project_id}`} className="shopping-project">
              <ProjectIcon icon={first.project_icon} color={first.project_color} size={22} />
              <span className="shopping-project-title">For {first.project_title}</span>
            </Link>
          ) : (
            <span className="shopping-project muted">For a secret project</span>
          )}
          <ul className="wish-items">
            {list.map((i) => (
              <li key={i.id} className="wish-item">
                <Gift size={15} className="wish-item-icon" />
                <span>
                  {describe(i)}
                  {i.notes && <small className="muted wish-item-notes">{i.notes}</small>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
