// Pop-up messages that slide in at the top of the screen and disappear on
// their own after a few seconds. Tap one to go to its page, or X to close it.
import { useNavigate } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import { useNotifications } from '../context/NotificationsContext.jsx'

export default function Toasts() {
  const { toasts, dismissToast, markRead } = useNotifications()
  const navigate = useNavigate()

  return (
    // aria-live makes screen readers announce new messages
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast" role="status">
          <button
            className="toast-body"
            onClick={() => {
              dismissToast(toast.id)
              // Clicking a notification's pop-up counts as seeing it
              if (toast.notificationId) markRead(toast.notificationId)
              if (toast.link) navigate(toast.link)
            }}
          >
            <span className="toast-icon"><Bell size={18} /></span>
            <span className="toast-text">
              <strong>{toast.title}</strong>
              <span>{toast.message}</span>
            </span>
          </button>
          <button className="icon-btn toast-close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
