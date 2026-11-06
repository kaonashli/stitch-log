// Small, quiet footer: link to the release notes + "Developed by kaonashli".
// Used on the login/signup pages, the home page, and the release notes page.
import { Link, useLocation } from 'react-router-dom'

const DEVELOPER = 'kaonashli'
const DEVELOPER_URL = 'https://github.com/kaonashli/stitch-log/blob/main/README.md'

export default function Footer() {
  const { pathname } = useLocation()
  return (
    <footer className="app-footer">
      {/* no link to the page you're already on */}
      {pathname !== '/release-notes' && (
        <>
          <Link to="/release-notes">Release notes</Link>
          <span aria-hidden="true">·</span>
        </>
      )}
      <span>
        Developed by{' '}
        <a href={DEVELOPER_URL} target="_blank" rel="noopener noreferrer">{DEVELOPER}</a>
      </span>
    </footer>
  )
}
