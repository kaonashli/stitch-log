// Lets the user choose a profile image and shows a round preview.
// It only picks the file; the parent decides when to upload it.
import { useEffect, useState } from 'react'
import { Camera, X } from 'lucide-react'

export default function AvatarPicker({ file, onChange, currentUrl = null, onRemoveCurrent = null }) {
  const [previewUrl, setPreviewUrl] = useState(null)

  // Make a temporary local URL so we can show the chosen file before uploading.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url) // free memory when the file changes
  }, [file])

  function handleFile(event) {
    const chosen = event.target.files[0]
    event.target.value = '' // allow picking the same file again later
    if (!chosen) return
    if (!chosen.type.startsWith('image/')) return
    onChange(chosen)
  }

  const shown = previewUrl || currentUrl

  return (
    <div className="avatar-picker">
      <label className="avatar-picker-circle" title="Choose a profile image">
        {shown ? <img src={shown} alt="Profile preview" /> : <Camera size={28} />}
        <input type="file" accept="image/*" onChange={handleFile} hidden />
      </label>
      <div className="avatar-picker-text">
        <strong>Profile image</strong>
        <small className="muted">Optional. Click the circle to choose one.</small>
        {file && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>
            <X size={14} /> Remove
          </button>
        )}
        {!file && currentUrl && onRemoveCurrent && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onRemoveCurrent}>
            <X size={14} /> Remove current image
          </button>
        )}
      </div>
    </div>
  )
}
