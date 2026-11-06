// "Wrap-up" questions in the project form. They show up once a project is
// Finished or Frogged. Every answer has its own switch: friends can see it,
// or only you. Leave a question empty to skip it.
//
// value = { make_again: { value, is_public }, enjoyment: {...}, skills: {...}, recommend_to: {...} }
import { listMyFriendships, otherPerson } from '../lib/friends.js'
import { ENJOYMENT_LABELS, MAKE_AGAIN_OPTIONS, REFLECTION_FIELDS } from '../lib/projectExtras.js'
import PublicSwitch from './PublicSwitch.jsx'
import MentionInput from './MentionInput.jsx'

export default function WrapUpEditor({ value, onChange, me }) {
  function update(field, changes) {
    onChange({ ...value, [field]: { ...value[field], ...changes } })
  }

  // Friends you can tag in "Who would I recommend this to?"
  async function loadFriends() {
    const friendships = await listMyFriendships()
    return friendships.filter((f) => f.status === 'accepted').map((f) => otherPerson(f, me.id))
  }

  return (
    <div className="stack">
      {REFLECTION_FIELDS.map(({ field, label }) => {
        const answer = value[field]
        return (
          <div key={field} className="field wrapup-field">
            <div className="row-between">
              <span>{label}</span>
              <PublicSwitch checked={answer.is_public} onChange={(v) => update(field, { is_public: v })} label={label} />
            </div>

            {field === 'make_again' && (
              <div className="choice-row" role="radiogroup" aria-label={label}>
                {MAKE_AGAIN_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={answer.value === o.value}
                    className={`chip ${answer.value === o.value ? 'chip-active' : ''}`}
                    // tap the chosen one again to clear it
                    onClick={() => update(field, { value: answer.value === o.value ? '' : o.value })}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}

            {field === 'enjoyment' && (
              <div className="enjoyment-picker" role="radiogroup" aria-label={label}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const on = Number(answer.value) >= n
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={Number(answer.value) === n}
                      aria-label={`${n} of 5: ${ENJOYMENT_LABELS[n]}`}
                      className={`enjoyment-dot ${on ? 'enjoyment-dot-on' : ''}`}
                      onClick={() => update(field, { value: Number(answer.value) === n ? '' : String(n) })}
                    />
                  )
                })}
                <small className="muted">{ENJOYMENT_LABELS[Number(answer.value)] || 'Not rated'}</small>
              </div>
            )}

            {field === 'skills' && (
              <textarea
                rows={2}
                maxLength={2000}
                value={answer.value}
                onChange={(e) => update(field, { value: e.target.value })}
                placeholder="e.g. Cables, magic loop, invisible decrease"
                aria-label={label}
              />
            )}

            {field === 'recommend_to' && (
              <MentionInput
                multiline
                rows={2}
                maxLength={2000}
                value={answer.value}
                onChange={(text) => update(field, { value: text })}
                loadCandidates={loadFriends}
                emptyText="No friends to tag yet."
                placeholder="e.g. Anyone new to cables, or @a friend (type @ to tag)"
                aria-label={label}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
