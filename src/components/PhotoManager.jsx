// The "Photos" part of the project form. Shows photos already saved plus new
// ones picked from the computer. Nothing is uploaded until the form is saved.
//
//   existing: [{ id, storage_path, url }]   photos already in the database
//   added:    [{ key, file, previewUrl }]   new files waiting to be uploaded
import { ImagePlus, X } from 'lucide-react'
import { MAX_PHOTOS } from '../lib/constants.js'

export default function PhotoManager({ existing, added, onRemoveExisting, onAdd, onRemoveAdded }) {
  const total = existing.length + added.length
  const remaining = MAX_PHOTOS - total

  function handleFiles(event) {
    const files = Array.from(event.target.files).filter((f) => f.type.startsWith('image/'))
    event.target.value = ''
    // Only take as many as still fit under the limit
    const accepted = files.slice(0, remaining).map((file) => ({
      key: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    if (accepted.length) onAdd(accepted)
  }

  return (
    <div className="stack">
      <div className="photo-grid">
        {existing.map((photo) => (
          <div key={photo.id} className="photo-thumb">
            {photo.url ? <img src={photo.url} alt="" /> : <span className="muted">...</span>}
            <button type="button" className="photo-remove" onClick={() => onRemoveExisting(photo)} aria-label="Remove photo">
              <X size={14} />
            </button>
          </div>
        ))}
        {added.map((photo) => (
          <div key={photo.key} className="photo-thumb photo-new">
            <img src={photo.previewUrl} alt="" />
            <button type="button" className="photo-remove" onClick={() => onRemoveAdded(photo)} aria-label="Remove photo">
              <X size={14} />
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <label className="photo-thumb photo-add">
            <ImagePlus size={24} />
            <small>Add photos</small>
            <input type="file" accept="image/*" multiple onChange={handleFiles} hidden />
          </label>
        )}
      </div>
      <small className="muted">
        {total} / {MAX_PHOTOS} photos. Images are resized and compressed before uploading.
      </small>
    </div>
  )
}
