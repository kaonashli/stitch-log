// Add a new project (/projects/new) or edit one (/projects/:id/edit).
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Lock, Users } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { deleteProjectPhotoFiles, getPhotoUrls, uploadProjectPhoto } from '../lib/images.js'
import { todayLocal } from '../lib/dates.js'
import { STATUSES, withCost } from '../lib/constants.js'
import { DEFAULT_COLOR, DEFAULT_ICON, PROJECT_COLORS, PROJECT_ICONS } from '../lib/projectLooks.js'
import IconColorPicker from '../components/IconColorPicker.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import MaterialsEditor, { materialCostsToRows, materialsToRows } from '../components/MaterialsEditor.jsx'
import DifficultyPicker from '../components/DifficultyPicker.jsx'
import PhotoManager from '../components/PhotoManager.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import Spinner from '../components/Spinner.jsx'

const EMPTY_FORM = {
  title: '',
  craft_type_id: '',
  status: 'idea',
  start_date: todayLocal(),
  finish_date: '',
  made_for: '',
  pattern_url: '',
  icon: DEFAULT_ICON,
  color: DEFAULT_COLOR,
  description: '',
  difficulty: null, // 1-5 or null (not rated)
  is_private: false, // only the owner can see private projects
}

export default function ProjectFormPage() {
  const { id } = useParams() // undefined when adding a new project
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState(EMPTY_FORM)
  const [craftTypes, setCraftTypes] = useState([])
  const [materials, setMaterials] = useState([])
  const [notes, setNotes] = useState('') // private notes (saved in their own table)
  const [existingPhotos, setExistingPhotos] = useState([])
  const [removedPhotos, setRemovedPhotos] = useState([])
  const [addedPhotos, setAddedPhotos] = useState([])
  // The photo shown as the project's main image instead of its icon:
  // a saved photo's id, a new photo's key, or null (= show the icon)
  const [coverKey, setCoverKey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('') // text shown while saving, '' when idle
  const [error, setError] = useState('')

  // Load craft types (and the project, when editing)
  useEffect(() => {
    async function load() {
      const typesResult = await supabase.from('craft_types').select('id, name').eq('is_active', true).order('name')
      setCraftTypes(typesResult.data ?? [])

      if (!isEdit) {
        setForm({ ...EMPTY_FORM, start_date: todayLocal(), craft_type_id: typesResult.data?.[0]?.id ?? '' })
        setLoading(false)
        return
      }

      const { data: project, error } = await supabase
        .from('projects')
        .select('*, project_materials(*, material_costs(cost)), project_photos(id, storage_path, sort_order, is_cover)')
        .eq('id', id)
        .single()

      if (error || project.user_id !== user.id) {
        setError('Project not found, or you are not allowed to edit it.')
        setLoading(false)
        return
      }

      setForm({
        title: project.title,
        craft_type_id: project.craft_type_id,
        status: project.status,
        start_date: project.start_date,
        finish_date: project.finish_date ?? '',
        made_for: project.made_for ?? '',
        pattern_url: project.pattern_url ?? '',
        icon: project.icon ?? DEFAULT_ICON,
        color: project.color ?? DEFAULT_COLOR,
        description: project.description ?? '',
        difficulty: project.difficulty ?? null,
        is_private: project.is_private ?? false,
      })

      // Private notes are in a separate, owner-only table
      const notesResult = await supabase.from('project_notes').select('notes').eq('project_id', id).maybeSingle()
      setNotes(notesResult.data?.notes ?? '')

      // Database NULLs become '' so the inputs are "controlled" by React
      setMaterials(project.project_materials
        .map(withCost) // private cost from the material_costs table
        .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
        .map((m) => ({
          key: m.id,
          material_type: m.material_type,
          status: m.status ?? 'owned',
          quantity: m.quantity ?? 1,
          cost: m.cost ?? '',
          brand: m.brand ?? '', color: m.color ?? '', weight: m.weight ?? '',
          yardage: m.yardage ?? '', gauge: m.gauge ?? '', size: m.size ?? '', notes: m.notes ?? '',
        })))

      const photos = project.project_photos.sort((a, b) => a.sort_order - b.sort_order)
      const urls = await getPhotoUrls(photos.map((p) => p.storage_path))
      setExistingPhotos(photos.map((p) => ({ ...p, url: urls[p.storage_path] })))
      setCoverKey(photos.find((p) => p.is_cover)?.id ?? null)
      setLoading(false)
    }
    load()
  }, [id, isEdit, user.id])

  function handleChange(event) {
    const { name, value } = event.target
    setForm({ ...form, [name]: value })
  }

  function validate() {
    if (!form.title.trim()) return 'Please enter a title.'
    if (!PROJECT_ICONS[form.icon]) return 'Please choose an icon.'
    if (!PROJECT_COLORS.some((c) => c.name === form.color)) return 'Please choose a color.'
    if (!form.craft_type_id) return 'Please choose a craft type.'
    if (!form.start_date) return 'Please choose a start date.'
    if (form.finish_date && form.finish_date < form.start_date) return 'Finish date cannot be before the start date.'
    if (form.pattern_url && !/^https?:\/\//i.test(form.pattern_url.trim())) {
      return 'Pattern link must start with http:// or https://'
    }
    // Material costs are optional, but can't be negative
    for (const m of materials) {
      const cost = String(m.cost ?? '').trim()
      if (cost !== '' && !(Number(cost) >= 0)) return 'Material costs must be 0 or more.'
    }
    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const problem = validate()
    if (problem) return setError(problem)
    setError('')

    // Empty optional fields are saved as NULL
    const projectData = {
      title: form.title.trim(),
      craft_type_id: Number(form.craft_type_id),
      status: form.status,
      start_date: form.start_date,
      finish_date: form.finish_date || null,
      made_for: form.made_for.trim() || null,
      pattern_url: form.pattern_url.trim() || null,
      icon: form.icon,
      color: form.color,
      description: form.description.trim() || null,
      difficulty: form.difficulty,
      is_private: form.is_private,
    }

    try {
      // 1. Save the project itself
      setSaving('Saving project...')
      let projectId = id
      if (isEdit) {
        const { error } = await supabase.from('projects').update(projectData).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('projects').insert(projectData).select('id').single()
        if (error) throw error
        projectId = data.id
      }

      // 2. Materials: simplest approach is replace them all
      setSaving('Saving materials...')
      const { error: deleteError } = await supabase.from('project_materials').delete().eq('project_id', projectId)
      if (deleteError) throw deleteError
      if (materials.length) {
        const { error } = await supabase.from('project_materials').insert(materialsToRows(materials, projectId))
        if (error) throw error

        // Private costs (deleting the materials above removed the old ones)
        const costRows = materialCostsToRows(materials)
        if (costRows.length) {
          const { error: costError } = await supabase.from('material_costs').insert(costRows)
          if (costError) throw costError
        }
      }

      // 2b. Private notes: "upsert" = insert the row, or update it if it already exists
      if (isEdit || notes.trim()) {
        const { error } = await supabase
          .from('project_notes')
          .upsert({ project_id: projectId, notes: notes.trim() }, { onConflict: 'project_id' })
        if (error) throw error
      }

      // 3. Photos the user removed: delete the database rows, then the files
      if (removedPhotos.length) {
        setSaving('Removing photos...')
        const { error } = await supabase.from('project_photos').delete().in('id', removedPhotos.map((p) => p.id))
        if (error) throw error
        await deleteProjectPhotoFiles(removedPhotos.map((p) => p.storage_path))
      }

      // 3b. Main image: clear the old one first (only one is allowed), then mark
      //     the chosen saved photo. A chosen NEW photo is marked as it's uploaded below.
      if (isEdit) {
        const { error } = await supabase.from('project_photos').update({ is_cover: false }).eq('project_id', projectId).eq('is_cover', true)
        if (error) throw error
      }
      if (coverKey && existingPhotos.some((p) => p.id === coverKey)) {
        const { error } = await supabase.from('project_photos').update({ is_cover: true }).eq('id', coverKey)
        if (error) throw error
      }

      // 4. New photos: compress + upload one at a time, then record each in the database
      let sortOrder = existingPhotos.length
      for (let i = 0; i < addedPhotos.length; i++) {
        setSaving(`Uploading photo ${i + 1} of ${addedPhotos.length}...`)
        const path = await uploadProjectPhoto(user.id, projectId, addedPhotos[i].file)
        const { error } = await supabase
          .from('project_photos')
          .insert({ project_id: projectId, storage_path: path, sort_order: sortOrder++, is_cover: addedPhotos[i].key === coverKey })
        if (error) {
          await deleteProjectPhotoFiles([path]) // don't leave an orphan file behind
          throw error
        }
      }

      addedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      navigate(`/projects/${projectId}`)
    } catch (err) {
      setError(err.message || 'Something went wrong while saving.')
      setSaving('')
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="narrow">
      <div className="page-header">
        <h1>{isEdit ? 'Edit project' : 'New project'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="stack">
        <ErrorMessage message={error} />

        <section className="card stack">
          <div className="row-between">
            <h2>Details</h2>
            {/* Private: hidden from everyone else (friends and admins too) */}
            <label className="private-toggle" title="Only you can see private projects">
              <Lock size={15} />
              <span>Private</span>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                checked={form.is_private}
                onChange={(e) => setForm({ ...form, is_private: e.target.checked })}
                aria-label="Private project"
              />
            </label>
          </div>
          {form.is_private && (
            <small className="field-hint private-hint">
              <Lock size={13} /> Only you can see this project. It still counts in the project numbers on your profile.
            </small>
          )}
          <label className="field">
            <span>Title <span className="required">*</span></span>
            <input name="title" required maxLength={120} value={form.title} onChange={handleChange} />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              name="description"
              rows={3}
              maxLength={5000}
              value={form.description}
              onChange={handleChange}
              placeholder="What are you making? Any changes to the pattern?"
            />
            <small className="field-hint">
              {form.is_private
                ? <><Lock size={13} /> Only you can see this (the project is private).</>
                : <><Users size={13} /> Your friends can see this.</>}
            </small>
          </label>

          <div className="field">
            <span>Icon and color <span className="required">*</span></span>
            <IconColorPicker
              icon={form.icon}
              color={form.color}
              onChange={({ icon, color }) => setForm({ ...form, icon, color })}
            />
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Craft type <span className="required">*</span></span>
              <select name="craft_type_id" required value={form.craft_type_id} onChange={handleChange}>
                <option value="" disabled>Choose...</option>
                {craftTypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Status <span className="required">*</span></span>
              <select name="status" required value={form.status} onChange={handleChange}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Start date <span className="required">*</span></span>
              <input type="date" name="start_date" required value={form.start_date} onChange={handleChange} />
            </label>
            <label className="field">
              <span>Finish date</span>
              <input type="date" name="finish_date" min={form.start_date} value={form.finish_date} onChange={handleChange} />
            </label>
            <label className="field">
              <span>Who it's for</span>
              <input name="made_for" maxLength={100} value={form.made_for} onChange={handleChange} placeholder="e.g. Me, Grandma" />
            </label>
            <label className="field">
              <span>Pattern link</span>
              <input type="url" name="pattern_url" value={form.pattern_url} onChange={handleChange} placeholder="https://..." />
            </label>
            <div className="field">
              <span>Difficulty</span>
              <DifficultyPicker value={form.difficulty} onChange={(difficulty) => setForm({ ...form, difficulty })} />
            </div>
          </div>
        </section>

        <section className="card stack">
          <h2>Materials</h2>
          <MaterialsEditor materials={materials} onChange={setMaterials} />
        </section>

        <section className="card stack">
          <h2>Photos</h2>
          <PhotoManager
            existing={existingPhotos}
            added={addedPhotos}
            onRemoveExisting={(photo) => {
              setExistingPhotos(existingPhotos.filter((p) => p.id !== photo.id))
              setRemovedPhotos([...removedPhotos, photo])
              if (coverKey === photo.id) setCoverKey(null) // removed the main image: back to the icon
            }}
            onAdd={(newOnes) => setAddedPhotos([...addedPhotos, ...newOnes])}
            onRemoveAdded={(photo) => {
              URL.revokeObjectURL(photo.previewUrl)
              setAddedPhotos(addedPhotos.filter((p) => p.key !== photo.key))
              if (coverKey === photo.key) setCoverKey(null)
            }}
            coverKey={coverKey}
            onCoverChange={setCoverKey}
          />
        </section>

        <section className="card stack-sm">
          <h2>Personal notes</h2>
          <p className="field-hint"><Lock size={14} /> Only you can see these.</p>
          <textarea
            rows={4}
            maxLength={10000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Row counts, reminders, what you'd do differently..."
            aria-label="Personal notes"
          />
        </section>


        <div className="row-end">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} disabled={Boolean(saving)}>Cancel</button>
          <button className="btn btn-primary" disabled={Boolean(saving)}>
            {saving || (isEdit ? 'Save changes' : 'Create project')}
          </button>
        </div>
      </form>
    </div>
  )
}
