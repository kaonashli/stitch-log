// Plain text where every "@username" becomes a link to that profile.
// (Comments use CommentText instead, which only links people really tagged.)
import { Link } from 'react-router-dom'

export default function TaggedText({ text }) {
  const parts = text.split(/(@[A-Za-z0-9_]{3,20})/g)
  return (
    <p className="prose">
      {parts.map((part, index) => (part.startsWith('@')
        ? <Link key={index} to={`/u/${part.slice(1)}`} className="mention">{part}</Link>
        : <span key={index}>{part}</span>))}
    </p>
  )
}
