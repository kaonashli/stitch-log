// Small "Friends can see" on/off switch, used for links and wrap-up answers.
import { Lock, Users } from 'lucide-react'

export default function PublicSwitch({ checked, onChange, label = 'this' }) {
  return (
    <label className="public-switch" title={checked ? 'Your friends can see this' : 'Only you can see this'}>
      {checked ? <Users size={14} /> : <Lock size={14} />}
      <span>{checked ? 'Friends' : 'Only me'}</span>
      <input
        type="checkbox"
        role="switch"
        className="switch switch-sm"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={`Friends can see ${label}`}
      />
    </label>
  )
}
