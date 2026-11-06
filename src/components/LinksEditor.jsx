// Links in the project form: as many as you like, each with an optional short
// title (e.g. "Pattern", "Video tutorial") and a switch for who can see it.
// New links are visible to friends by default.
import { Plus, Trash2 } from 'lucide-react'
import PublicSwitch from './PublicSwitch.jsx'

export function newLink() {
  return { key: crypto.randomUUID(), url: '', title: '', is_public: true }
}

export default function LinksEditor({ links, onChange }) {
  function update(key, field, value) {
    onChange(links.map((l) => (l.key === key ? { ...l, [field]: value } : l)))
  }

  return (
    <div className="stack-sm">
      {links.length === 0 && <p className="muted small">No links yet. Add a pattern, a video, or anything handy.</p>}
      {links.map((link) => (
        <div key={link.key} className="link-row">
          <input
            className="link-title"
            maxLength={80}
            value={link.title}
            onChange={(e) => update(link.key, 'title', e.target.value)}
            placeholder="Title (optional)"
            aria-label="Link title"
          />
          <input
            type="url"
            className="link-url"
            value={link.url}
            onChange={(e) => update(link.key, 'url', e.target.value)}
            placeholder="https://..."
            aria-label="Link address"
          />
          <span className="link-row-actions">
            <PublicSwitch checked={link.is_public} onChange={(v) => update(link.key, 'is_public', v)} label="this link" />
            <button type="button" className="icon-btn" onClick={() => onChange(links.filter((l) => l.key !== link.key))} aria-label="Remove link">
              <Trash2 size={16} />
            </button>
          </span>
        </div>
      ))}
      <div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange([...links, newLink()])}>
          <Plus size={14} /> Add link
        </button>
      </div>
    </div>
  )
}
