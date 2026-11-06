// The "Photos" part of the project form. Shows photos already saved plus new
// ones picked from the computer. Nothing is uploaded until the form is saved.
//
//   existing: [{ id, storage_path, url }]   photos already in the database
//   added:    [{ key, file, previewUrl }]   new files waiting to be uploaded
//
// Main image: tap the star on a photo to show it instead of the project's
// icon (My Projects, the project page, friend activity). Tap it again to go
// back to the icon. coverKey is the chosen photo's id (saved photo) or key
// (new photo), or null for "use the icon".
import { ImagePlus, Star, X } from 'lucide-react'
import { MAX_PHOTOS } from '../lib/constants.js'

function CoverStar({ isCover, onClick }) {
  return (
    <button
      type="button"
      className={`photo-cover ${isCover ? 'photo-cover-on' : ''}`}
      onClick={onClick}
      aria-pressed={isCover}
      aria-label={isCover ? 'Main image (tap to use the icon instead)' : 'Use as main image'}
      title={isCover ? 'Main image' : 'Use as main image'}
    >
      <Star size={14} fill={isCover ? 'currentColor' : 'none'} />
    </button>
  )
}

export default function PhotoManager({ existing, added, onRemoveExisting, onAdd, onRemoveAdded, coverKey, onCoverChange }) {
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

  // Tap the star: make this the main image, or tap again to go back to the icon
  function toggleCover(key) {
    onCoverChange(coverKey === key ? null : key)
  }

  return (
    <div className="stack">
      <div className="photo-grid">
        {existing.map((photo) => (
          <div key={photo.id} className={`photo-thumb ${coverKey === photo.id ? 'photo-is-cover' : ''}`}>
            {photo.url ? <img src={photo.url} alt="" /> : <span className="muted">...</span>}
            <CoverStar isCover={coverKey === photo.id} onClick={() => toggleCover(photo.id)} />
            <button type="button" className="photo-remove" onClick={() => onRemoveExisting(photo)} aria-label="Remove photo">
              <X size={14} />
            </button>
          </div>
        ))}
        {added.map((photo) => (
          <div key={photo.key} className={`photo-thumb photo-new ${coverKey === photo.key ? 'photo-is-cover' : ''}`}>
            <img src={photo.previewUrl} alt="" />
            <CoverStar isCover={coverKey === photo.key} onClick={() => toggleCover(photo.key)} />
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
        {total > 0 && ' Tap the star on a photo to show it as the main image instead of the icon.'}
      </small>
    </div>
  )
}
