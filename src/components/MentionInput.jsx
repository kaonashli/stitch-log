// A comment box that understands tags (@mentions).
//
// - Type @ and a list pops up with everyone you can tag on this project
//   (your friends who are also friends with the project's owner). Keep typing
//   to filter it.
// - Or just start typing a friend's name ("Ma..."): if it matches someone you
//   can tag, a small "Tag someone?" list suggests them.
// - Tap a name (or use the arrow keys, then Enter / Tab) to insert @username.
// - Tags you've written are highlighted right inside the box (only real,
//   taggable friends; a typo won't be highlighted).
//
// How the highlight works: an invisible copy of the text (the "backdrop")
// sits exactly behind the box, with the tags wrapped in <mark>. The box itself
// has a see-through background, so the marks show through behind the letters.
//
// The list of people is loaded the first time you click into the box, and
// passed up with onCandidates so the parent can find the tags when posting.
import { useLayoutEffect, useRef, useState } from 'react'
import { loadMentionCandidates } from '../lib/social.js'
import Avatar from './Avatar.jsx'

const MAX_SUGGESTIONS = 6
// Styles the backdrop copies from the box so the text lines up exactly
const COPIED_STYLES = [
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'wordSpacing',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderRadius', 'textIndent', 'tabSize',
]

export default function MentionInput({
  projectId, value, onChange, onCandidates, multiline = false, className = '',
  loadCandidates = null, // optional: your own way to get the people (default: who can be tagged on projectId)
  emptyText = "No one to tag here. You can tag friends who are also friends with this project's owner.",
  ...inputProps
}) {
  const fieldRef = useRef(null)
  const backdropRef = useRef(null)
  const [candidates, setCandidates] = useState(null) // null = not loaded yet
  // While suggesting: { start, query, mode } where mode is 'at' (typed @) or 'name' (typing a name)
  const [mention, setMention] = useState(null)
  const [highlight, setHighlight] = useState(0)

  // Make the backdrop match the box's font, padding, and border exactly
  useLayoutEffect(() => {
    const field = fieldRef.current
    const backdrop = backdropRef.current
    if (!field || !backdrop) return
    function copy() {
      const style = getComputedStyle(field)
      for (const key of COPIED_STYLES) backdrop.style[key] = style[key]
    }
    copy()
    window.addEventListener('resize', copy)
    return () => window.removeEventListener('resize', copy)
  }, [])

  async function ensureCandidates() {
    if (candidates !== null) return
    const list = loadCandidates ? await loadCandidates() : await loadMentionCandidates(projectId)
    setCandidates(list)
    onCandidates?.(list)
  }

  // If you started typing before the list of people arrived, check the text
  // again as soon as it does (so suggestions still pop up)
  useLayoutEffect(() => {
    const field = fieldRef.current
    if (candidates && field && document.activeElement === field) {
      updateMention(field.value, field.selectionStart)
    }
  }, [candidates]) // eslint-disable-line react-hooks/exhaustive-deps

  function matchesPerson(person, text) {
    const q = text.toLowerCase()
    return person.username.toLowerCase().includes(q) || person.display_name.toLowerCase().includes(q)
  }

  // Name suggestions only when a word STARTS like someone's name or username
  function startsLikePerson(person, word) {
    const w = word.toLowerCase()
    return person.username.toLowerCase().startsWith(w) ||
      person.display_name.toLowerCase().split(/\s+/).some((part) => part.startsWith(w))
  }

  // Look at the text just before the cursor: are we typing a tag or a name?
  function updateMention(text, caret) {
    const before = text.slice(0, caret)
    const at = before.match(/(^|\s)@([A-Za-z0-9_]{0,20})$/)
    if (at) {
      setMention({ start: caret - at[2].length - 1, query: at[2], mode: 'at' })
      setHighlight(0)
      return
    }
    const word = before.match(/(^|\s)([A-Za-z][A-Za-z0-9_]{1,19})$/)
    if (word && candidates?.some((c) => startsLikePerson(c, word[2]))) {
      setMention({ start: caret - word[2].length, query: word[2], mode: 'name' })
      setHighlight(0)
      return
    }
    setMention(null)
  }

  const suggestions = !mention || !candidates ? [] : candidates
    .filter((c) => (mention.mode === 'at' ? matchesPerson(c, mention.query) : startsLikePerson(c, mention.query)))
    .slice(0, MAX_SUGGESTIONS)

  function pick(person) {
    const caret = fieldRef.current?.selectionStart ?? value.length
    const inserted = `@${person.username} `
    const next = value.slice(0, mention.start) + inserted + value.slice(caret)
    onChange(next)
    setMention(null)
    // put the cursor right after the inserted tag
    const position = mention.start + inserted.length
    requestAnimationFrame(() => {
      fieldRef.current?.focus()
      fieldRef.current?.setSelectionRange(position, position)
    })
  }

  function handleKeyDown(event) {
    if (!mention || suggestions.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((h) => (h + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Tab' || (event.key === 'Enter' && mention.mode === 'at')) {
      // (Enter only picks after an @, so typing a name and pressing Enter still sends)
      event.preventDefault()
      pick(suggestions[highlight])
    } else if (event.key === 'Escape') {
      setMention(null)
    }
  }

  // Keep the backdrop scrolled the same as the box
  function syncScroll() {
    if (!backdropRef.current || !fieldRef.current) return
    backdropRef.current.scrollTop = fieldRef.current.scrollTop
    backdropRef.current.scrollLeft = fieldRef.current.scrollLeft
  }

  // The backdrop's content: the same text, with real tags wrapped in <mark>
  const taggable = new Set((candidates ?? []).map((c) => c.username.toLowerCase()))
  const pieces = value.split(/(@[A-Za-z0-9_]{3,20})/g)
  const backdrop = pieces.map((piece, index) =>
    piece.startsWith('@') && taggable.has(piece.slice(1).toLowerCase())
      ? <mark key={index} className="mention-mark">{piece}</mark>
      : <span key={index}>{piece}</span>)

  const Field = multiline ? 'textarea' : 'input'

  return (
    <div className={`mention-wrap ${multiline ? 'mention-wrap-multiline' : 'mention-wrap-single'} ${className}`}>
      <div className="mention-backdrop" ref={backdropRef} aria-hidden="true">
        {backdrop}
        {/* a trailing space keeps the last line's height the same as the box */}
        {' '}
      </div>
      <Field
        ref={fieldRef}
        className="mention-field"
        value={value}
        onFocus={ensureCandidates}
        onChange={(e) => {
          onChange(e.target.value)
          updateMention(e.target.value, e.target.selectionStart)
        }}
        onKeyDown={handleKeyDown}
        onClick={(e) => updateMention(e.target.value, e.target.selectionStart)}
        onScroll={syncScroll}
        onBlur={() => setTimeout(() => setMention(null), 150)} // let a tap on a name finish first
        {...inputProps}
      />

      {mention && candidates !== null && (mention.mode === 'at' || suggestions.length > 0) && (
        <div className="mention-menu" role="listbox" aria-label="People you can tag">
          {mention.mode === 'name' && <div className="mention-menu-title">Tag someone?</div>}
          {suggestions.length === 0 ? (
            <div className="mention-empty">
              {candidates.length === 0
                ? emptyText
                : 'No matching friends.'}
            </div>
          ) : (
            suggestions.map((person, index) => (
              <button
                key={person.id}
                type="button"
                role="option"
                aria-selected={index === highlight}
                className={`mention-option ${index === highlight ? 'mention-option-active' : ''}`}
                // onMouseDown (not onClick) so the text box doesn't lose focus first
                onMouseDown={(e) => { e.preventDefault(); pick(person) }}
              >
                <Avatar profile={person} size={26} />
                <span className="person-names">
                  <strong>{person.display_name}</strong>
                  <small className="muted">@{person.username}</small>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
