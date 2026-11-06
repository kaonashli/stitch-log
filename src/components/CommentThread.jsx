// A list of comments with their replies, used on the project page and in the
// home feed. Replies sit under the comment they belong to (one level deep, so
// it stays readable on a phone). Tap Reply on any comment or reply to answer
// it; the person you reply to gets a notification (the database does that).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Reply, Send, Trash2, X } from 'lucide-react'
import { timeAgo } from '../lib/dates.js'
import Avatar from './Avatar.jsx'
import CommentText from './CommentText.jsx'
import MentionInput from './MentionInput.jsx'

// Group a flat list into [{ comment, replies: [...] }]. A reply to a reply
// goes under the same top comment.
function groupComments(comments) {
  const byId = new Map(comments.map((c) => [c.id, c]))
  function topOf(comment) {
    let current = comment
    let steps = 0
    while (current.parent_id && byId.has(current.parent_id) && steps < 50) {
      current = byId.get(current.parent_id)
      steps++
    }
    return current
  }
  const threads = []
  const threadOf = new Map()
  for (const c of comments) {
    const top = topOf(c)
    if (top.id === c.id) {
      const thread = { comment: c, replies: [] }
      threads.push(thread)
      threadOf.set(c.id, thread)
    }
  }
  for (const c of comments) {
    const top = topOf(c)
    if (top.id !== c.id) threadOf.get(top.id)?.replies.push(c)
  }
  return { threads, byId }
}

export default function CommentThread({
  comments, me, projectId, avatarSize = 34, canReply, canDelete, onDelete, onReply,
}) {
  const [replyTo, setReplyTo] = useState(null) // the comment being answered
  const [draft, setDraft] = useState('')
  const [taggable, setTaggable] = useState([])
  const [busy, setBusy] = useState(false)
  const { threads, byId } = groupComments(comments)

  async function sendReply(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || !replyTo) return
    setBusy(true)
    const ok = await onReply(replyTo, body, taggable)
    setBusy(false)
    if (ok) {
      setDraft('')
      setReplyTo(null)
    }
  }

  function renderComment(c, isReply) {
    const parent = isReply && c.parent_id ? byId.get(c.parent_id) : null
    return (
      <div className={`comment ${isReply ? 'comment-reply' : ''}`}>
        <Link to={`/u/${c.author?.username}`}><Avatar profile={c.author} size={isReply ? avatarSize - 6 : avatarSize} /></Link>
        <div className="comment-body">
          <div className="comment-meta">
            <Link to={`/u/${c.author?.username}`} className="strong-link">{c.author?.display_name}</Link>
            <small className="muted">{timeAgo(c.created_at)}</small>
            {canDelete(c) && (
              <button className="icon-btn comment-delete" onClick={() => onDelete(c)} aria-label="Delete comment" title="Delete comment">
                <Trash2 size={14} />
              </button>
            )}
          </div>
          {/* Replying to a reply: say who it answers */}
          {parent && parent.parent_id && <small className="muted reply-to-note">Replying to {parent.author?.display_name}</small>}
          <CommentText comment={c} />
          {canReply && (
            <button
              className="reply-btn"
              onClick={() => { setReplyTo(c); setDraft('') }}
              aria-label={`Reply to ${c.author?.display_name}`}
            >
              <Reply size={13} /> Reply
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <ul className="comment-list">
      {threads.map(({ comment, replies }) => {
        const replyingHere = replyTo && (replyTo.id === comment.id || replies.some((r) => r.id === replyTo.id))
        return (
          <li key={comment.id} className="comment-thread">
            {renderComment(comment, false)}
            {(replies.length > 0 || replyingHere) && (
              <div className="comment-replies">
                {replies.map((r) => <div key={r.id}>{renderComment(r, true)}</div>)}

                {replyingHere && (
                  <form onSubmit={sendReply} className="reply-form">
                    <small className="muted row">
                      Replying to {replyTo.author?.display_name}
                      <button type="button" className="icon-btn reply-cancel" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
                        <X size={13} />
                      </button>
                    </small>
                    <div className="reply-form-row">
                      <MentionInput
                        projectId={projectId}
                        value={draft}
                        onChange={setDraft}
                        onCandidates={setTaggable}
                        className="mention-wrap-grow"
                        maxLength={1000}
                        placeholder="Write a reply..."
                        aria-label="Write a reply"
                        autoFocus
                      />
                      <button className="icon-btn feed-send" disabled={busy || !draft.trim()} aria-label="Send reply">
                        <Send size={16} />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
