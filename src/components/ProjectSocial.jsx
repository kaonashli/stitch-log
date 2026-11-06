// Hearts and comments on a project page.
//   - Friends of the owner can heart the project (tap again to take it back)
//     and write comments.
//   - The owner sees who hearted it, can comment too, and can delete any
//     comment on their project. Everyone can delete their own comments.
// The database tells the owner about new hearts and comments (notifications),
// and removes those notifications if the heart or comment is taken back.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Send, Trash2 } from 'lucide-react'
import { addComment, addHeart, checkIsFriend, deleteComment, extractMentions, loadComments, loadHearts, removeHeart } from '../lib/social.js'
import MentionInput from './MentionInput.jsx'
import CommentText from './CommentText.jsx'
import { timeAgo } from '../lib/dates.js'
import Avatar from './Avatar.jsx'

export default function ProjectSocial({ project, me }) {
  const isOwner = project.user_id === me.id
  const [isFriend, setIsFriend] = useState(false)
  const [hearts, setHearts] = useState([])
  const [comments, setComments] = useState([])
  const [draft, setDraft] = useState('')
  const [taggable, setTaggable] = useState([]) // people who can be @tagged here
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [heartList, commentList, friend] = await Promise.all([
          loadHearts(project.id),
          loadComments(project.id),
          isOwner ? false : checkIsFriend(project.user_id),
        ])
        setHearts(heartList)
        setComments(commentList)
        setIsFriend(friend)
      } catch (err) {
        setError(err.message)
      }
    }
    load()
  }, [project.id, project.user_id, isOwner])

  // Scroll to the comments when arriving from a comment notification (#comments)
  useEffect(() => {
    if (window.location.hash === '#comments') {
      document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [comments.length])

  const hearted = hearts.some((h) => h.user_id === me.id)
  const canHeart = isFriend // the owner can't heart their own project
  const canComment = isOwner || isFriend

  async function toggleHeart() {
    setError('')
    // Update the screen right away, then save (undo if saving fails)
    const before = hearts
    if (hearted) setHearts(hearts.filter((h) => h.user_id !== me.id))
    else setHearts([...hearts, { user_id: me.id, profile: me }])
    try {
      if (hearted) await removeHeart(project.id, me.id)
      else await addHeart(project.id)
    } catch (err) {
      setHearts(before)
      setError(err.message)
    }
  }

  async function handleComment(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    setBusy(true)
    setError('')
    try {
      await addComment(project.id, body, extractMentions(body, taggable))
      setDraft('')
      setComments(await loadComments(project.id))
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  async function handleDelete(comment) {
    if (!window.confirm('Delete this comment?')) return
    try {
      await deleteComment(comment.id)
      setComments(comments.filter((c) => c.id !== comment.id))
    } catch (err) {
      setError(err.message)
    }
  }

  // "Loved by Maya, Sam and 3 others"
  const names = hearts.map((h) => h.profile?.display_name).filter(Boolean)
  const lovedBy = names.length === 0 ? ''
    : names.length <= 2 ? names.join(' and ')
    : `${names.slice(0, 2).join(', ')} and ${names.length - 2} other${names.length - 2 === 1 ? '' : 's'}`

  return (
    <div className="card stack" id="comments">
      {/* Hearts */}
      <div className="heart-row">
        {canHeart ? (
          <button
            className={`heart-button ${hearted ? 'heart-button-on' : ''}`}
            onClick={toggleHeart}
            aria-pressed={hearted}
            aria-label={hearted ? 'Remove your heart' : 'Heart this project'}
          >
            <Heart size={20} fill={hearted ? 'currentColor' : 'none'} />
            <span>{hearts.length}</span>
          </button>
        ) : (
          <span className="heart-count">
            <Heart size={20} fill={hearts.length ? 'currentColor' : 'none'} />
            <span>{hearts.length}</span>
          </span>
        )}
        {lovedBy && <small className="muted">Loved by {lovedBy}</small>}
      </div>

      {/* Comments */}
      <h2 className="row"><MessageCircle size={18} /> Comments ({comments.length})</h2>
      {error && <small className="text-error">{error}</small>}
      {comments.length === 0 && <p className="muted">No comments yet.</p>}

      <ul className="comment-list">
        {comments.map((c) => (
          <li key={c.id} className="comment">
            <Link to={`/u/${c.author?.username}`}><Avatar profile={c.author} size={34} /></Link>
            <div className="comment-body">
              <div className="comment-meta">
                <Link to={`/u/${c.author?.username}`} className="strong-link">{c.author?.display_name}</Link>
                <small className="muted">{timeAgo(c.created_at)}</small>
                {(c.user_id === me.id || isOwner) && (
                  <button className="icon-btn comment-delete" onClick={() => handleDelete(c)} aria-label="Delete comment" title="Delete comment">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <CommentText comment={c} />
            </div>
          </li>
        ))}
      </ul>

      {canComment && (
        <form onSubmit={handleComment} className="comment-form">
          <MentionInput
            multiline
            projectId={project.id}
            value={draft}
            onChange={setDraft}
            onCandidates={setTaggable}
            rows={2}
            maxLength={1000}
            placeholder={isOwner ? 'Reply to your friends... (type @ to tag someone)' : 'Say something nice... (type @ to tag someone)'}
            aria-label="Write a comment"
          />
          <button className="btn btn-primary" disabled={busy || !draft.trim()}>
            <Send size={16} /> Post
          </button>
        </form>
      )}
    </div>
  )
}
