// Heart + comment bar under a card in the home feed (friend activity).
// - Heart: tap to heart the project, tap again to take it back.
// - Comments: tap to open the project's comments right here, read them,
//   and add your own (you can delete your own comments).
// The counts and "did I heart it" come from the home page (loaded for the
// whole feed at once), so the same project shows the same numbers on every card.
import { useState } from 'react'
import { Heart, MessageCircle, Send } from 'lucide-react'
import { addComment, deleteComment, extractMentions, loadComments } from '../lib/social.js'
import MentionInput from './MentionInput.jsx'
import CommentThread from './CommentThread.jsx'

export default function FeedSocial({ projectId, me, hearted, heartCount, commentCount, onToggleHeart, onCommentCountChange }) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState(null) // null = not loaded yet
  const [draft, setDraft] = useState('')
  const [taggable, setTaggable] = useState([]) // people who can be @tagged here
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
      await addComment(projectId, body, extractMentions(body, taggable))
      setDraft('')
      setComments(await loadComments(projectId))
      onCommentCountChange(1)
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  // Reply to a comment (CommentThread calls this). Returns true when it worked.
  async function handleReply(parent, body, taggablePeople) {
    setError('')
    try {
      await addComment(projectId, body, extractMentions(body, taggablePeople), parent.id)
      setComments(await loadComments(projectId))
      onCommentCountChange(1)
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  async function handleDelete(comment) {
    const hasReplies = comments.some((c) => c.parent_id === comment.id)
    if (!window.confirm(hasReplies ? 'Delete your comment and its replies?' : 'Delete your comment?')) return
    try {
      await deleteComment(comment.id)
      // its replies go too, so reload and count again
      const fresh = await loadComments(projectId)
      onCommentCountChange(fresh.length - comments.length)
      setComments(fresh)
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

          {comments?.length > 0 && (
            <CommentThread
              comments={comments}
              me={me}
              projectId={projectId}
              avatarSize={28}
              canReply
              canDelete={(c) => c.user_id === me.id}
              onDelete={handleDelete}
              onReply={handleReply}
            />
          )}

          <form onSubmit={handlePost} className="feed-comment-form">
            <MentionInput
              projectId={projectId}
              value={draft}
              onChange={setDraft}
              onCandidates={setTaggable}
              className="mention-wrap-grow"
              maxLength={1000}
              placeholder="Write a comment... (@ to tag)"
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
