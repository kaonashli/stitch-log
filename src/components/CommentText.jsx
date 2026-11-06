// Shows a comment's text, turning "@username" tags into links to that
// person's profile. Only real tags (people actually tagged in this comment)
// become links; any other "@word" stays plain text.
import { Link } from 'react-router-dom'

export default function CommentText({ comment }) {
  const tagged = new Map(
    (comment.mentions ?? [])
      .filter((m) => m.user)
      .map((m) => [m.user.username.toLowerCase(), m.user.username]),
  )
  // Split into plain text and "@word" pieces
  const parts = comment.body.split(/(@[A-Za-z0-9_]{3,20})/g)
  return (
    <p className="prose">
      {parts.map((part, index) => {
        const username = part.startsWith('@') ? tagged.get(part.slice(1).toLowerCase()) : null
        return username
          ? <Link key={index} to={`/u/${username}`} className="mention">@{username}</Link>
          : <span key={index}>{part}</span>
      })}
    </p>
  )
}
