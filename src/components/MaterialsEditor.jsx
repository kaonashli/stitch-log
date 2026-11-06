// The "Materials" part of the project form, split into two sections:
//   "To buy"       - things you still need (they show on the home shopping list)
//   "In my stash"  - things you already have
//
// Move a material between sections by dragging its grip handle (mouse or
// finger), or with the arrow button on the card. Each card only shows the
// fields that make sense for its type (see MATERIAL_TYPES).
//
// Every material has an Amount (at least 1) and an optional "Cost each".
// A material's cost = cost each x amount; the project total is shown below.
import { useState } from 'react'
import { ArrowDownUp, GripVertical, Trash2 } from 'lucide-react'
import {
  MATERIAL_FIELDS, MATERIAL_SECTIONS, MATERIAL_TYPES, YARN_WEIGHTS, formatMoney, hasCost, materialLineCost,
} from '../lib/constants.js'
import { useTouchDrag } from '../lib/useTouchDrag.js'

const MATERIAL_DRAG_TYPE = 'application/x-stitchlog-material'

// A blank material. "key" is only used by React to track list items.
export function newMaterial(type, status = 'owned') {
  return {
    key: crypto.randomUUID(), material_type: type, status, quantity: 1, cost: '',
    brand: '', color: '', weight: '', yardage: '', gauge: '', size: '', notes: '',
  }
}

// Amount must be a whole number, at least 1
function cleanQuantity(value) {
  return Math.max(1, Math.floor(Number(value) || 1))
}

// One-line summary shown in the drag ghost, e.g. "Yarn - Cascade 220, Charcoal"
function summary(material) {
  const type = MATERIAL_TYPES[material.material_type]
  const details = [material.brand, material.color, material.size].filter(Boolean).join(', ')
  return details ? `${type.label} - ${details}` : type.label
}

export default function MaterialsEditor({ materials, onChange }) {
  const [mouseOverSection, setMouseOverSection] = useState(null)
  const [draggingKey, setDraggingKey] = useState(null) // mouse drag

  function updateMaterial(key, field, value) {
    onChange(materials.map((m) => (m.key === key ? { ...m, [field]: value } : m)))
  }

  function removeMaterial(key) {
    onChange(materials.filter((m) => m.key !== key))
  }

  // Move a material to a section (to the end of it)
  function moveTo(key, status) {
    const material = materials.find((m) => m.key === key)
    if (!material || material.status === status) return
    onChange([...materials.filter((m) => m.key !== key), { ...material, status }])
  }

  // Touch drag: the grip handle has touch-action: none, so dragging starts right away
  const touch = useTouchDrag({ holdMs: 0, onDrop: (material, status) => moveTo(material.key, status) })

  // Totals for the summary under the sections
  const totalCost = materials.reduce((sum, m) => sum + materialLineCost(m), 0)
  const toBuyCost = materials.filter((m) => m.status === 'to_buy').reduce((sum, m) => sum + materialLineCost(m), 0)
  const anyCosts = materials.some(hasCost)

  return (
    <div className="stack">
      <small className="muted">Drag a material by its handle to move it between sections.</small>

      {MATERIAL_SECTIONS.map((section) => {
        const items = materials.filter((m) => m.status === section.value)
        const isOver = mouseOverSection === section.value || touch.overTarget === section.value
        return (
          <div
            key={section.value}
            data-drop-target={section.value}
            className={`material-section material-section-${section.value} ${isOver ? 'material-section-over' : ''}`}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(MATERIAL_DRAG_TYPE)) return
              e.preventDefault()
              setMouseOverSection(section.value)
            }}
            onDragLeave={(e) => {
              // only clear when actually leaving the section (not moving between its children)
              if (!e.currentTarget.contains(e.relatedTarget)) setMouseOverSection(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              setMouseOverSection(null)
              moveTo(e.dataTransfer.getData(MATERIAL_DRAG_TYPE), section.value)
            }}
          >
            <div className="material-section-header">
              <strong>{section.label}</strong>
              <span className="muted">{items.length}</span>
              <small className="muted material-section-hint">{section.hint}</small>
            </div>

            {items.length === 0 && <p className="drop-hint">Nothing here. Drag materials here or add one below.</p>}

            {items.map((material) => {
              const type = MATERIAL_TYPES[material.material_type]
              const other = MATERIAL_SECTIONS.find((s) => s.value !== material.status)
              const lifted = draggingKey === material.key || touch.ghost?.item.key === material.key
              return (
                <div key={material.key} className={`material-card ${lifted ? 'material-card-lifted' : ''}`}>
                  <div className="row-between">
                    <span className="row">
                      {/* Drag handle: mouse (draggable) and finger (onTouchStart) */}
                      <span
                        className="drag-handle"
                        draggable
                        title="Drag to move"
                        onDragStart={(e) => {
                          e.dataTransfer.setData(MATERIAL_DRAG_TYPE, material.key)
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setDragImage(e.currentTarget.closest('.material-card'), 20, 20)
                          setDraggingKey(material.key)
                        }}
                        onDragEnd={() => setDraggingKey(null)}
                        onTouchStart={(e) => touch.handleTouchStart(e, material)}
                      >
                        <GripVertical size={18} />
                      </span>
                      <strong>{type.label}</strong>
                      {/* This material's cost (cost each x amount), if a cost was entered */}
                      {hasCost(material) && <span className="line-cost">{formatMoney(materialLineCost(material))}</span>}
                    </span>
                    <span className="row">
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        onClick={() => moveTo(material.key, other.value)}
                        title={`Move to ${other.label}`}
                      >
                        <ArrowDownUp size={12} /> {other.label}
                      </button>
                      <button type="button" className="icon-btn" onClick={() => removeMaterial(material.key)} aria-label={`Remove ${type.label}`}>
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </div>
                  <div className="field-grid">
                    {type.fields.map((field) => {
                      const info = MATERIAL_FIELDS[field]
                      return (
                        <label key={field} className={`field ${field === 'notes' ? 'field-wide' : ''}`}>
                          <span>{info.label}</span>
                          <input
                            type={info.type || 'text'}
                            min={info.type === 'number' ? (info.min ?? 0) : undefined}
                            step={info.type === 'number' ? (info.step ?? 'any') : undefined}
                            inputMode={field === 'quantity' ? 'numeric' : field === 'cost' ? 'decimal' : undefined}
                            placeholder={info.placeholder}
                            list={field === 'weight' ? 'yarn-weights' : undefined}
                            value={material[field]}
                            onChange={(e) => {
                              const value = e.target.value
                              // Amount: anything below 1 becomes 1 right away. An empty box is
                              // allowed while typing (so you can clear it and type a new number).
                              if (field === 'quantity' && value !== '') updateMaterial(material.key, field, cleanQuantity(value))
                              else updateMaterial(material.key, field, value)
                            }}
                            // ...and an empty Amount box goes back to 1 when you leave it
                            onBlur={field === 'quantity'
                              ? (e) => updateMaterial(material.key, field, cleanQuantity(e.target.value))
                              : undefined}
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Add a new material straight into this section */}
            <select
              className="select-sm add-material-select"
              value=""
              onChange={(e) => {
                if (e.target.value) onChange([...materials, newMaterial(e.target.value, section.value)])
              }}
              aria-label={`Add material to ${section.label}`}
            >
              <option value="">+ Add material...</option>
              {Object.entries(MATERIAL_TYPES).map(([value, t]) => <option key={value} value={value}>{t.label}</option>)}
            </select>
          </div>
        )
      })}

      {/* Total cost of all materials (only once at least one cost is entered) */}
      {anyCosts && (
        <div className="materials-total">
          <span>Total cost <strong>{formatMoney(totalCost)}</strong></span>
          {toBuyCost > 0 && <small className="muted">{formatMoney(toBuyCost)} still to buy</small>}
        </div>
      )}

      {/* Suggestions for the yarn weight box */}
      <datalist id="yarn-weights">
        {YARN_WEIGHTS.map((w) => <option key={w} value={w} />)}
      </datalist>

      {/* The card that follows your finger during a touch drag */}
      {touch.ghost && (
        <div className="drag-ghost" style={{ left: touch.ghost.x, top: touch.ghost.y }} aria-hidden="true">
          <GripVertical size={16} />
          <strong>{summary(touch.ghost.item)}</strong>
        </div>
      )}
    </div>
  )
}

// Turn the form's materials into database rows: only the fields for that type,
// empty boxes become NULL, yardage becomes a number. sort_order keeps each
// section in the order shown. The material's "key" is used as its id so the
// private cost rows (below) can point at it. Cost is NOT included here.
export function materialsToRows(materials, projectId) {
  const counters = {}
  return materials.map((m) => {
    counters[m.status] = (counters[m.status] ?? 0) + 1
    const row = {
      id: m.key,
      project_id: projectId,
      material_type: m.material_type,
      status: m.status,
      sort_order: counters[m.status] - 1,
    }
    for (const field of MATERIAL_TYPES[m.material_type].fields) {
      if (field === 'cost') continue // saved separately, in the private material_costs table
      const value = String(m[field] ?? '').trim()
      if (field === 'quantity') row.quantity = cleanQuantity(value)
      else if (field === 'yardage') row.yardage = value === '' ? null : Number(value)
      else row[field] = value === '' ? null : value
    }
    return row
  })
}

// Rows for the private material_costs table: one per material that has a cost
export function materialCostsToRows(materials) {
  return materials
    .filter(hasCost)
    .map((m) => ({ material_id: m.key, cost: Number(m.cost) }))
}
