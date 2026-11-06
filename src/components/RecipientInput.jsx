// "Who it's for" in the project form. Each person is a little chip:
//   - Tag yourself or a friend: start typing and pick them from the list.
//   - Anyone else: type a name (e.g. "Grandma") and press Enter. That name
//     becomes a category, so later we can count projects made for each person.
// Names you've used before are suggested too, so "Grandma" stays one category.
//
// value = [{ user_id, person: { id, username, display_name, avatar_path } } or { name }]
import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { listMyFriendships, otherPerson } from '../lib/friends.js'
import Avatar from './Avatar.jsx'

const MAX_RECIPIENTS = 10
const MAX_SUGGESTIONS = 6

// You + your friends, and the names you've used on your projects before
async function loadSuggestions(me) {
  const [friendships, used] = await Promise.all([
    listMyFriendships(),
    supabase.from('project_recipients').select('name, projects!inner(user_id)').eq('projects.user_id', me.id).not('name', 'is', null),
  ])
  const people = [
    { ...me, isMe: true },
    ...friendships.filter((f) => f.status === 'accepted').map((f) => otherPerson(f, me.id)),
  ]
  // Each name once (ignoring upper/lower case)
  const names = []
  for (const row of used.data ?? []) {
    if (!names.some((n) => n.toLowerCase() === row.name.toLowerCase())) names.push(row.name)
  }
  return { people, names }
}

export default function RecipientInput({ value, onChange, me }) {
  const [text, setText] = useState('')
  const [suggestions, setSuggestions] = useState(null) // null = not loaded yet
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  async function ensureLoaded() {
    if (suggestions !== null) return
    try {
      setSuggestions(await loadSuggestions(me))
    } catch {
      setSuggestions({ people: [{ ...me, isMe: true }], names: [] })
    }
  }

  // What matches the typed text (and isn't already picked)
  const query = text.trim().toLowerCase()
  const pickedIds = value.filter((r) => r.user_id).map((r) => r.user_id)
  const pickedNames = value.filter((r) => r.name).map((r) => r.name.toLowerCase())
  const options = []
  if (suggestions) {
    for (const person of suggestions.people) {
      if (pickedIds.includes(person.id)) continue
      const matches = !query
        || person.display_name.toLowerCase().includes(query)
        || person.username.toLowerCase().includes(query)
        || (person.isMe && 'me'.startsWith(query))
      if (matches) options.push({ kind: 'person', person })
    }
    for (const name of suggestions.names) {
      if (pickedNames.includes(name.toLowerCase())) continue
      if (!query || name.toLowerCase().includes(query)) options.push({ kind: 'name', name })
    }
  }
  const shown = options.slice(0, MAX_SUGGESTIONS)

  function add(option) {
    if (value.length >= MAX_RECIPIENTS) return
    if (option.kind === 'person') {
      onChange([...value, { user_id: option.person.id, person: option.person }])
    } else {
      const name = option.name.trim().slice(0, 60)
      if (!name || pickedNames.includes(name.toLowerCase())) return
      onChange([...value, { name }])
    }
    setText('')
    setHighlight(0)
  }

  function remove(index) {
    onChange(value.filter((_, i) => i !== index))
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' && shown.length) {
      event.preventDefault()
      setOpen(true)
      setHighlight((highlight + 1) % shown.length)
    } else if (event.key === 'ArrowUp' && shown.length) {
      event.preventDefault()
      setHighlight((highlight - 1 + shown.length) % shown.length)
    } else if (event.key === 'Enter') {
      // Enter adds a chip here; it must not submit the whole form
      event.preventDefault()
      if (open && query && shown[highlight]) add(shown[highlight])
      else if (query) add({ kind: 'name', name: text })
    } else if (event.key === 'Backspace' && !text && value.length) {
      remove(value.length - 1)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="recipient-input">
      <div className="chip-box" onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
        {value.map((r, index) => (
          <span key={r.user_id ?? r.name} className={`person-chip ${r.user_id ? 'person-chip-tagged' : ''}`}>
            {r.person && <Avatar profile={r.person} size={18} />}
            <span>{r.user_id === me.id ? 'Me' : (r.person?.display_name ?? r.name)}</span>
            <button type="button" onClick={() => remove(index)} aria-label={`Remove ${r.person?.display_name ?? r.name}`}>
              <X size={12} />
            </button>
          </span>
        ))}
        {value.length < MAX_RECIPIENTS && (
          <input
            value={text}
            maxLength={60}
            onChange={(e) => { setText(e.target.value); setOpen(true); setHighlight(0) }}
            onFocus={() => { ensureLoaded(); setOpen(true) }}
            // Wait a moment so a tap on a suggestion still counts
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={value.length ? '' : 'Me, a friend, or a name like Grandma'}
            aria-label="Who it's for"
          />
        )}
      </div>

      {open && (shown.length > 0 || query) && (
        <ul className="suggest-menu" role="listbox">
          {shown.map((option, index) => (
            <li key={option.kind === 'person' ? option.person.id : `name-${option.name}`}>
              <button
                type="button"
                className={`suggest-item ${index === highlight ? 'suggest-item-active' : ''}`}
                onMouseDown={(e) => e.preventDefault()} // keep the focus in the box
                onClick={() => add(option)}
              >
                {option.kind === 'person' ? (
                  <>
                    <Avatar profile={option.person} size={22} />
                    <span>{option.person.isMe ? `Me (${option.person.display_name})` : option.person.display_name}</span>
                    <small className="muted">@{option.person.username}</small>
                  </>
                ) : (
                  <span>{option.name}</span>
                )}
              </button>
            </li>
          ))}
          {query && !shown.some((o) => o.kind === 'name' && o.name.toLowerCase() === query) && (
            <li>
              <button
                type="button"
                className="suggest-item suggest-item-new"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add({ kind: 'name', name: text })}
              >
                Add "{text.trim()}" <small className="muted">(press Enter)</small>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
