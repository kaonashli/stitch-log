// "Report a bug or request a change" box at the top of the release notes page.
// It starts collapsed; click the header to open it.
// Logged in: the report is linked to your account, and you see your past reports.
// Not logged in: you give your name (required) and email (optional).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bug, ChevronDown, Lightbulb, MessageSquarePlus, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { FEEDBACK_KINDS, feedbackKindLabel, feedbackStatusLabel, loadMyFeedback, sendFeedback } from '../lib/feedback.js'
import { timeAgo } from '../lib/dates.js'
import ErrorMessage from './ErrorMessage.jsx'

const KIND_ICONS = { bug: Bug, change: Lightbulb }

export default function FeedbackForm() {
  const { user } = useAuth()
  const [kind, setKind] = useState('bug')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [mine, setMine] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [thanks, setThanks] = useState(false)
  const [open, setOpen] = useState(false) // collapsed by default
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [website, setWebsite] = useState('') // hidden "honeypot" box: only spam bots fill it in

  useEffect(() => {
    if (user) loadMyFeedback(user.id).then(setMine).catch(() => {})
  }, [user])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!user && !guestName.trim()) return setError('Please tell us your name.')
    // Email is optional, but if it's filled in it should look like one (something@something.something)
    if (!user && guestEmail.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guestEmail.trim())) {
      return setError("That email doesn't look right. You can also leave it empty.")
    }
    if (!title.trim()) return setError('Please give it a short title.')
    if (website) return // a bot filled in the hidden box: quietly ignore it
    setBusy(true)
    setError('')
    try {
      await sendFeedback(user ? { kind, title, details } : { kind, title, details, guestName, guestEmail })
      setTitle('')
      setDetails('')
      setThanks(true)
      if (user) setMine(await loadMyFeedback(user.id))
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  // Clickable header that opens/closes the box
  const header = (
    <button type="button" className="collapse-header" onClick={() => setOpen(!open)} aria-expanded={open}>
      <MessageSquarePlus size={20} />
      <span>Found a bug or have an idea?</span>
      <ChevronDown size={18} className={`collapse-chevron ${open ? 'collapse-chevron-open' : ''}`} />
    </button>
  )

  return (
    <section className="card stack" id="feedback">
      {header}
      {open && (<>
      <p className="muted">Tell us what went wrong or what you'd like to see. Every report gets read.</p>

      <form onSubmit={handleSubmit} className="stack-sm">
        <ErrorMessage message={error} />
        {thanks && <div className="alert alert-success">Thanks! Your report was sent.</div>}

        {/* Not logged in: who is this from? */}
        {!user && (
          <div className="field-grid">
            <label className="field">
              <span>Your name <span className="required">*</span></span>
              <input maxLength={60} value={guestName} onChange={(e) => setGuestName(e.target.value)} autoComplete="name" />
            </label>
            <label className="field">
              <span>Email <span className="muted">(optional)</span></span>
              <input type="email" maxLength={254} value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} autoComplete="email" placeholder="So we can get back to you" />
            </label>
          </div>
        )}
        {!user && (
          <small className="muted">Have an account? <Link to="/login">Log in</Link> to keep track of your reports.</small>
        )}
        {/* Hidden from people; spam bots tend to fill in every box */}
        <input className="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />

        {/* Bug or change request */}
        <div className="chips" role="radiogroup" aria-label="Type of report">
          {FEEDBACK_KINDS.map((k) => {
            const Icon = KIND_ICONS[k.value]
            return (
              <button
                key={k.value}
                type="button"
                role="radio"
                aria-checked={kind === k.value}
                className={`chip ${kind === k.value ? 'chip-active' : ''}`}
                onClick={() => setKind(k.value)}
              >
                <Icon size={14} /> {k.label}
              </button>
            )
          })}
        </div>

        <label className="field">
          <span>Title <span className="required">*</span></span>
          <input
            maxLength={120}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setThanks(false) }}
            placeholder={kind === 'bug' ? 'e.g. Photos won\'t upload on my phone' : 'e.g. Let me sort projects by start date'}
          />
        </label>
        <label className="field">
          <span>Details</span>
          <textarea
            rows={4}
            maxLength={4000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={kind === 'bug' ? 'What were you doing, and what happened?' : 'What would you like, and why?'}
          />
        </label>
        <div className="row-end">
          <button className="btn btn-primary" disabled={busy}><Send size={16} /> {busy ? 'Sending...' : 'Send'}</button>
        </div>
      </form>

      {user && mine.length > 0 && (
        <div className="stack-sm">
          <h3>Your reports</h3>
          <ul className="my-reports">
            {mine.map((r) => (
              <li key={r.id}>
                <span className={`badge feedback-kind feedback-kind-${r.kind}`}>{feedbackKindLabel(r.kind)}</span>
                <span className="my-report-title">{r.number && <span className="muted">#{r.number} </span>}{r.title}</span>
                <small className="muted">{timeAgo(r.created_at)}</small>
                <span className={`badge feedback-status feedback-status-${r.status}`}>{feedbackStatusLabel(r.status)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      </>)}
    </section>
  )
}
