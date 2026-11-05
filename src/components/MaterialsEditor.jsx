// The "Materials" part of the project form. Shows one small card per material
// with only the fields that make sense for its type (see MATERIAL_TYPES).
import { Plus, Trash2 } from 'lucide-react'
import { MATERIAL_FIELDS, MATERIAL_TYPES, YARN_WEIGHTS } from '../lib/constants.js'

// A blank material of the given type. "key" is only used by React to track list items.
export function newMaterial(type) {
  return { key: crypto.randomUUID(), material_type: type, brand: '', color: '', weight: '', yardage: '', gauge: '', size: '', notes: '' }
}

export default function MaterialsEditor({ materials, onChange }) {
  function updateMaterial(key, field, value) {
    onChange(materials.map((m) => (m.key === key ? { ...m, [field]: value } : m)))
  }

  function removeMaterial(key) {
    onChange(materials.filter((m) => m.key !== key))
  }

  return (
    <div className="stack">
      {materials.length === 0 && <p className="muted">No materials added.</p>}

      {materials.map((material) => {
        const type = MATERIAL_TYPES[material.material_type]
        return (
          <div key={material.key} className="material-card">
            <div className="row-between">
              <strong>{type.label}</strong>
              <button type="button" className="icon-btn" onClick={() => removeMaterial(material.key)} aria-label={`Remove ${type.label}`}>
                <Trash2 size={16} />
              </button>
            </div>
            <div className="field-grid">
              {type.fields.map((field) => {
                const info = MATERIAL_FIELDS[field]
                return (
                  <label key={field} className={`field ${field === 'notes' ? 'field-wide' : ''}`}>
                    <span>{info.label}</span>
                    <input
                      type={info.type || 'text'}
                      min={info.type === 'number' ? 0 : undefined}
                      step={info.type === 'number' ? 'any' : undefined}
                      placeholder={info.placeholder}
                      list={field === 'weight' ? 'yarn-weights' : undefined}
                      value={material[field]}
                      onChange={(e) => updateMaterial(material.key, field, e.target.value)}
                    />
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Suggestions for the yarn weight box */}
      <datalist id="yarn-weights">
        {YARN_WEIGHTS.map((w) => <option key={w} value={w} />)}
      </datalist>

      <div className="add-material">
        <span className="muted">Add:</span>
        {Object.entries(MATERIAL_TYPES).map(([value, type]) => (
          <button key={value} type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...materials, newMaterial(value)])}>
            <Plus size={14} /> {type.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Turn the form's materials into database rows: only the fields for that type,
// empty boxes become NULL, yardage becomes a number.
export function materialsToRows(materials, projectId) {
  return materials.map((m) => {
    const row = { project_id: projectId, material_type: m.material_type }
    for (const field of MATERIAL_TYPES[m.material_type].fields) {
      const value = String(m[field] ?? '').trim()
      if (field === 'yardage') row.yardage = value === '' ? null : Number(value)
      else row[field] = value === '' ? null : value
    }
    return row
  })
}
