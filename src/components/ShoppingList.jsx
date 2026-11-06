// Home page "Shopping list": every material marked "To buy" across your
// projects, grouped by project (with its icon and status). Tick the box when
// you've bought something and it moves to that project's stash.
// The gift button puts an item on your wish list, which friends can see on
// your profile (Wish list widget).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gift, ShoppingCart } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { MATERIAL_TYPES, formatMoney, hasCost, materialLineCost, withCost } from '../lib/constants.js'
import ProjectIcon from './ProjectIcon.jsx'
import StatusBadge from './StatusBadge.jsx'

// Projects you're actively working on come first
const STATUS_ORDER = ['in_progress', 'idea', 'paused', 'finished', 'frogged']

// e.g. "3 × Yarn: Cascade 220, Charcoal, 1320 yds"
function describe(material) {
  const type = MATERIAL_TYPES[material.material_type]?.label ?? material.material_type
  const parts = [
    material.brand,
    material.color,
    material.colors?.length ? material.colors.join(' + ') : null, // color tags
    material.weight,
    material.size,
    material.yardage ? `${material.yardage} yds` : null,
    material.notes,
  ].filter(Boolean)
  // An "Unsure" amount (NULL) is noted at the end
  if (material.quantity === null) parts.push('amount unsure')
  const amount = material.quantity > 1 ? `${material.quantity} × ` : ''
  return amount + (parts.length ? `${type}: ${parts.join(', ')}` : type)
}

export default function ShoppingList({ userId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      // "projects!inner" = only materials whose project matches the filter below (my projects)
      const { data, error } = await supabase
        .from('project_materials')
        .select('id, material_type, brand, color, colors, weight, yardage, size, notes, quantity, sort_order, on_wishlist, material_costs(cost), projects!inner(id, title, icon, color, status, user_id)')
        .eq('status', 'to_buy')
        .eq('projects.user_id', userId)
        .is('projects.deleted_at', null) // nothing to buy for deleted projects
      if (error) setError(error.message)
      setItems((data ?? []).map(withCost))
      setLoading(false)
    }
    load()
  }, [userId])

  async function markBought(item) {
    // Remove it from the list right away (feels instant), then save
    setItems((all) => all.filter((i) => i.id !== item.id))
    const { error } = await supabase.from('project_materials').update({ status: 'owned' }).eq('id', item.id)
    if (error) {
      setError(error.message)
      setItems((all) => [...all, item]) // put it back if saving failed
    }
  }

  // Put an item on your wish list (friends see it in your Wish list widget), or take it off
  async function toggleWishlist(item) {
    const on_wishlist = !item.on_wishlist
    setItems((all) => all.map((i) => (i.id === item.id ? { ...i, on_wishlist } : i)))
    const { error } = await supabase.from('project_materials').update({ on_wishlist }).eq('id', item.id)
    if (error) {
      setError(error.message)
      setItems((all) => all.map((i) => (i.id === item.id ? { ...i, on_wishlist: !on_wishlist } : i)))
    }
  }

  // Group the materials by project
  const groups = []
  for (const item of items) {
    let group = groups.find((g) => g.project.id === item.projects.id)
    if (!group) {
      group = { project: item.projects, items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }
  groups.sort((a, b) =>
    STATUS_ORDER.indexOf(a.project.status) - STATUS_ORDER.indexOf(b.project.status) ||
    a.project.title.localeCompare(b.project.title))
  for (const group of groups) group.items.sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="card stack-sm">
      <h2 className="row"><ShoppingCart size={18} /> Shopping list</h2>
      {error && <small className="text-error">{error}</small>}
      {!loading && groups.length === 0 && (
        <p className="muted">Nothing to buy. Materials you mark as "To buy" in a project show up here.</p>
      )}

      {groups.map(({ project, items: projectItems }) => (
        <div key={project.id} className="shopping-group">
          <Link to={`/projects/${project.id}`} className="shopping-project">
            <ProjectIcon icon={project.icon} color={project.color} size={24} />
            <span className="shopping-project-title">{project.title}</span>
            <StatusBadge status={project.status} />
          </Link>
          <ul className="shopping-items">
            {projectItems.map((item) => (
              <li key={item.id}>
                <div className="shopping-item-row">
                  <label className="shopping-item">
                    <input type="checkbox" onChange={() => markBought(item)} aria-label={`Bought ${describe(item)}`} />
                    <span className="shopping-item-text">{describe(item)}</span>
                    {hasCost(item) && <span className="muted">{formatMoney(materialLineCost(item))}</span>}
                  </label>
                  {/* Gift button: put it on (or take it off) your wish list, which friends can see */}
                  <button
                    type="button"
                    className={`icon-btn wish-toggle ${item.on_wishlist ? 'wish-toggle-on' : ''}`}
                    onClick={() => toggleWishlist(item)}
                    aria-pressed={item.on_wishlist}
                    aria-label={item.on_wishlist ? `Take ${describe(item)} off your wish list` : `Add ${describe(item)} to your wish list`}
                    title={item.on_wishlist ? 'On your wish list (friends can see it). Tap to remove.' : 'Add to your wish list (friends can see it)'}
                  >
                    <Gift size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
