// Add a new project (/projects/new) or edit one (/projects/:id/edit).
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { deleteProjectPhotoFiles, getPhotoUrls, uploadProjectPhoto } from '../lib/images.js'
import { todayLocal } from '../lib/dates.js'
import { STATUSES } from '../lib/constants.js'
import { useAuth } from '../context/AuthContext.jsx'
import MaterialsEditor, { materialsToRows } from '../components/MaterialsEditor.jsx'
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
}

export default function ProjectFormPage() {
  const { id } = useParams() // undefined when adding a new project
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState(EMPTY_FORM)
  const [craftTypes, setCraftTypes] = useState([])
  const [materials, setMaterials] = useState([])
  const [existingPhotos, setExistingPhotos] = useState([])
  const [removedPhotos, setRemovedPhotos] = useState([])
  const [addedPhotos, setAddedPhotos] = useState([])
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
        .select('*, project_materials(*), project_photos(id, storage_path, sort_order)')
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
      })
      // Database NULLs become '' so the inputs are "controlled" by React
      setMaterials(project.project_materials
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((m) => ({
          key: m.id,
          material_type: m.material_type,
          brand: m.brand ?? '', color: m.color ?? '', weight: m.weight ?? '',
          yardage: m.yardage ?? '', gauge: m.gauge ?? '', size: m.size ?? '', notes: m.notes ?? '',
        })))

      const photos = project.project_photos.sort((a, b) => a.sort_order - b.sort_order)
      const urls = await getPhotoUrls(photos.map((p) => p.storage_path))
      setExistingPhotos(photos.map((p) => ({ ...p, url: urls[p.storage_path] })))
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
    if (!form.craft_type_id) return 'Please choose a craft type.'
    if (!form.start_date) return 'Please choose a start date.'
    if (form.finish_date && form.finish_date < form.start_date) return 'Finish date cannot be before the start date.'
    if (form.pattern_url && !/^https?:\/\//i.test(form.pattern_url.trim())) {
      return 'Pattern link must start with http:// or https://'
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
      }

      // 3. Photos the user removed: delete the database rows, then the files
      if (removedPhotos.length) {
        setSaving('Removing photos...')
        const { error } = await supabase.from('project_photos').delete().in('id', removedPhotos.map((p) => p.id))
        if (error) throw error
        await deleteProjectPhotoFiles(removedPhotos.map((p) => p.storage_path))
      }

      // 4. New photos: compress + upload one at a time, then record each in the database
      let sortOrder = existingPhotos.length
      for (let i = 0; i < addedPhotos.length; i++) {
        setSaving(`Uploading photo ${i + 1} of ${addedPhotos.length}...`)
        const path = await uploadProjectPhoto(user.id, projectId, addedPhotos[i].file)
        const { error } = await supabase
          .from('project_photos')
          .insert({ project_id: projectId, storage_path: path, sort_order: sortOrder++ })
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
          <h2>Details</h2>
          <label className="field">
            <span>Title <span className="required">*</span></span>
            <input name="title" required maxLength={120} value={form.title} onChange={handleChange} />
          </label>

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
            }}
            onAdd={(newOnes) => setAddedPhotos([...addedPhotos, ...newOnes])}
            onRemoveAdded={(photo) => {
              URL.revokeObjectURL(photo.previewUrl)
              setAddedPhotos(addedPhotos.filter((p) => p.key !== photo.key))
            }}
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
