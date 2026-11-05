// Colored pill showing a project's status. Colors come from index.css (--status-*).
import { statusLabel } from '../lib/constants.js'

export default function StatusBadge({ status }) {
  return <span className={`badge status-${status}`}>{statusLabel(status)}</span>
}
