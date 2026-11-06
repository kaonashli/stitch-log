// Release notes: what's in the app, in plain language. Anyone can open this
// page, logged in or not. The content lives in src/lib/releaseNotes.js.
import { Hammer } from 'lucide-react'
import { IN_DEVELOPMENT, RELEASES } from '../lib/releaseNotes.js'
import { formatDate } from '../lib/dates.js'
import Footer from '../components/Footer.jsx'
import FeedbackForm from '../components/FeedbackForm.jsx'

export default function ReleaseNotesPage() {
  return (
    <div className="narrow stack">
      <div className="page-header">
        <h1>Release notes</h1>
      </div>

      {IN_DEVELOPMENT && (
        <div className="dev-banner">
          <Hammer size={18} />
          <span><strong>Still in beta.</strong> Stitch Log is new and still being worked on, so things may change or break now and then.</span>
        </div>
      )}

      {/* Report a bug or request a change (shows up on the admin dashboard). Starts collapsed. */}
      <FeedbackForm />

      {RELEASES.map((release) => (
        <article key={release.version ?? 'upcoming'} className="card stack release">
          <header className="release-header">
            <h2>{release.version ? `Version ${release.version}` : release.title}</h2>
            {release.version
              ? release.date && <span className="muted">{formatDate(release.date)}</span>
              : <span className="badge badge-soft">In the works</span>}
          </header>
          {release.intro && <p className="muted">{release.intro}</p>}

          {release.sections.map((section) => (
            <section key={section.heading} className="stack-sm">
              <h3>{section.heading}</h3>
              <ul className="release-list">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ))}
        </article>
      ))}


      <Footer />
    </div>
  )
}
