// Heart + comment bar under a card in the home feed (friend activity).
// - Heart: tap to heart the project, tap again to take it back.
// - Comments: tap to open the project's comments right here, read them,
//   and add your own (you can delete your own comments).
// The counts and "did I heart it" come from the home page (loaded for the
// whole feed at once), so the same project shows the same numbers on every card.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Send, Trash2 } from 'lucide-react'
import { addComment, deleteComment, loadComments } from '../lib/social.js'
import { timeAgo } from '../lib/dates.js'
import Avatar from './Avatar.jsx'

export default function FeedSocial({ projectId, me, hearted, heartCount, commentCount, onToggleHeart, onCommentCountChange }) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState(null) // null = not loaded yet
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function toggleComments() {
    const next = !open
    setOpen(next)
    if (next && comments === null) {
      try {
        setComments(await loadComments(projectId))
      } catch (err) {
        setError(err.message)
      }
    }
  }

  async function handlePost(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    setBusy(true)
    setError('')
    try {
      await addComment(projectId, body)
      setDraft('')
      setComments(await loadComments(projectId))
      onCommentCountChange(1)
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  async function handleDelete(comment) {
    if (!window.confirm('Delete your comment?')) return
    try {
      await deleteComment(comment.id)
      setComments(comments.filter((c) => c.id !== comment.id))
      onCommentCountChange(-1)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="feed-social">
      <div className="feed-social-bar">
        <button
          type="button"
          className={`feed-action ${hearted ? 'feed-action-hearted' : ''}`}
          onClick={onToggleHeart}
          aria-pressed={hearted}
          aria-label={hearted ? 'Remove your heart' : 'Heart this project'}
        >
          <Heart size={18} fill={hearted ? 'currentColor' : 'none'} />
          <span>{heartCount}</span>
        </button>
        <button
          type="button"
          className={`feed-action ${open ? 'feed-action-open' : ''}`}
          onClick={toggleComments}
          aria-expanded={open}
          aria-label="Comments"
        >
          <MessageCircle size={18} />
          <span>{commentCount}</span>
        </button>
      </div>

      {open && (
        <div className="feed-comments">
          {error && <small className="text-error">{error}</small>}
          {comments === null && !error && <small className="muted">Loading comments...</small>}
          {comments?.length === 0 && <small className="muted">No comments yet. Be the first!</small>}

          {comments?.map((c) => (
            <div key={c.id} className="feed-comment">
              <Link to={`/u/${c.author?.username}`}><Avatar profile={c.author} size={28} /></Link>
              <div className="feed-comment-body">
                <div className="comment-meta">
                  <Link to={`/u/${c.author?.username}`} className="strong-link">{c.author?.display_name}</Link>
                  <small className="muted">{timeAgo(c.created_at)}</small>
                  {c.user_id === me.id && (
                    <button className="icon-btn comment-delete" onClick={() => handleDelete(c)} aria-label="Delete comment" title="Delete comment">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <p className="prose">{c.body}</p>
              </div>
            </div>
          ))}

          <form onSubmit={handlePost} className="feed-comment-form">
            <input
              maxLength={1000}
              placeholder="Write a comment..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Write a comment"
            />
            <button className="icon-btn feed-send" disabled={busy || !draft.trim()} aria-label="Post comment">
              <Send size={17} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
