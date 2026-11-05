// Red message box. Renders nothing when there's no message.
import { CircleAlert } from 'lucide-react'

export default function ErrorMessage({ message }) {
  if (!message) return null
  return (
    <div className="alert alert-error" role="alert">
      <CircleAlert size={18} />
      <span>{message}</span>
    </div>
  )
}
