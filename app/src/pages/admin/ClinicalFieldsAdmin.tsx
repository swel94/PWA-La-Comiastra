import { useEffect, useState } from 'react'
import {
  createClinicalField,
  deleteClinicalField,
  fetchAllClinicalFields,
  slugifyKey,
  updateClinicalField,
  type ClinicalField,
  type ClinicalFieldType,
  type ClinicalOption
} from '../../lib/clinicalFields'

const TYPE_LABEL: Record<ClinicalFieldType, string> = {
  select: 'Selección',
  select_text: 'Selección + detalle',
  multi: 'Selección múltiple'
}

interface FieldForm {
  id: string | null
  label: string
  type: ClinicalFieldType
  options: ClinicalOption[]
  detail_when: string[]
  placeholder: string
  required: boolean
  is_active: boolean
}

const EMPTY_FORM: FieldForm = {
  id: null,
  label: '',
  type: 'select',
  options: [
    { value: 'si', label: 'Sí' },
    { value: 'no', label: 'No' }
  ],
  detail_when: [],
  placeholder: '',
  required: true,
  is_active: true
}

export default function ClinicalFieldsAdmin() {
  const [fields, setFields] = useState<ClinicalField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FieldForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setFields(await fetchAllClinicalFields())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la ficha clínica.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function flash(msg: string) {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 3000)
  }

  function openNew() {
    setForm({ ...EMPTY_FORM, options: EMPTY_FORM.options.map((o) => ({ ...o })) })
    setError(null)
    setOpen(true)
  }

  function openEdit(f: ClinicalField) {
    setForm({
      id: f.id,
      label: f.label,
      type: f.type,
      options: f.options.map((o) => ({ ...o })),
      detail_when: [...f.detail_when],
      placeholder: f.placeholder ?? '',
      required: f.required,
      is_active: f.is_active
    })
    setError(null)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setSaving(false)
  }

  function patchOption(index: number, label: string) {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === index ? { ...o, label } : o))
    }))
  }

  function addOption() {
    setForm((f) => ({
      ...f,
      options: [...f.options, { value: `opt_${Math.random().toString(36).slice(2, 6)}`, label: '' }]
    }))
  }

  function removeOption(index: number) {
    setForm((f) => {
      const opt = f.options[index]
      return {
        ...f,
        options: f.options.filter((_, i) => i !== index),
        detail_when: f.detail_when.filter((v) => v !== opt.value)
      }
    })
  }

  function toggleDetail(value: string) {
    setForm((f) => ({
      ...f,
      detail_when: f.detail_when.includes(value)
        ? f.detail_when.filter((v) => v !== value)
        : [...f.detail_when, value]
    }))
  }

  async function save() {
    setError(null)
    if (!form.label.trim()) {
      setError('La pregunta necesita un texto.')
      return
    }
    if (form.options.length === 0 || form.options.some((o) => !o.label.trim())) {
      setError('Agrega al menos una opción con texto.')
      return
    }

    const options = form.options.map((o) => ({ value: o.value, label: o.label.trim() }))
    const detailWhen =
      form.type === 'select_text'
        ? form.detail_when.filter((v) => options.some((o) => o.value === v))
        : []
    const placeholder = form.type === 'select_text' ? form.placeholder.trim() || null : null

    setSaving(true)
    try {
      if (form.id) {
        await updateClinicalField(form.id, {
          label: form.label.trim(),
          type: form.type,
          options,
          detail_when: detailWhen,
          placeholder,
          required: form.required,
          is_active: form.is_active
        })
        flash('Pregunta actualizada.')
      } else {
        const maxOrder = fields.reduce((m, f) => Math.max(m, f.sort_order), 0)
        await createClinicalField({
          key: slugifyKey(form.label),
          label: form.label.trim(),
          type: form.type,
          options,
          detail_when: detailWhen,
          placeholder,
          required: form.required,
          is_active: form.is_active,
          sort_order: maxOrder + 1
        })
        flash('Pregunta creada.')
      }
      setOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(f: ClinicalField) {
    if (
      !window.confirm(
        `¿Eliminar la pregunta "${f.label}"? Las respuestas existentes se conservan.`
      )
    )
      return
    try {
      await deleteClinicalField(f.id)
      flash('Pregunta eliminada.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar.')
    }
  }

  async function toggleActive(f: ClinicalField) {
    try {
      await updateClinicalField(f.id, { is_active: !f.is_active })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar.')
    }
  }

  async function move(f: ClinicalField, dir: -1 | 1) {
    const idx = fields.findIndex((x) => x.id === f.id)
    const other = fields[idx + dir]
    if (!other) return
    try {
      await updateClinicalField(f.id, { sort_order: other.sort_order })
      await updateClinicalField(other.id, { sort_order: f.sort_order })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reordenar.')
    }
  }

  return (
    <div>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Ficha clínica</h1>
          <p className="admin__subtitle">
            Agrega, edita, elimina o reordena las preguntas que verán los clientes al registrarse.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          + Nueva pregunta
        </button>
      </div>

      {notice && <p className="admin__notice">{notice}</p>}
      {error && !open && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : fields.length === 0 ? (
        <p className="muted">No hay preguntas configuradas.</p>
      ) : (
        <div className="cf-list">
          {fields.map((f) => (
            <div className={'cf-row' + (f.is_active ? '' : ' cf-inactive')} key={f.id}>
              <div className="cf-row__main">
                <div className="cf-row__label">{f.label}</div>
                <div className="cf-row__meta">
                  {TYPE_LABEL[f.type]} · {f.options.length} opción(es)
                  {f.required ? ' · Obligatoria' : ''}
                  {f.is_active ? '' : ' · Inactiva'}
                </div>
              </div>
              <div className="cf-row__actions">
                <button className="btn btn-soft" onClick={() => move(f, -1)} title="Subir">
                  ↑
                </button>
                <button className="btn btn-soft" onClick={() => move(f, 1)} title="Bajar">
                  ↓
                </button>
                <button className="btn btn-soft" onClick={() => openEdit(f)}>
                  Editar
                </button>
                <button className="btn btn-soft" onClick={() => toggleActive(f)}>
                  {f.is_active ? 'Desactivar' : 'Activar'}
                </button>
                <button className="btn btn-ghost" onClick={() => remove(f)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? 'Editar pregunta' : 'Nueva pregunta'}</h2>

            <label className="label">Pregunta</label>
            <input
              className="input"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Ej. ¿Tiene alguna alergia?"
            />

            <label className="label">Tipo</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as ClinicalFieldType })}
            >
              <option value="select">Selección</option>
              <option value="select_text">Selección + detalle</option>
              <option value="multi">Selección múltiple</option>
            </select>

            <label className="label">Opciones</label>
            {form.options.map((o, i) => (
              <div className="opt-row" key={o.value}>
                <input
                  className="input"
                  value={o.label}
                  placeholder={`Opción ${i + 1}`}
                  onChange={(e) => patchOption(i, e.target.value)}
                />
                <button type="button" className="btn btn-ghost" onClick={() => removeOption(i)}>
                  Quitar
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-soft" onClick={addOption}>
              + Agregar opción
            </button>

            {form.type === 'select_text' && (
              <>
                <label className="label">Mostrar detalle cuando se elija</label>
                <div className="clin-checks">
                  {form.options.map((o) => (
                    <label key={o.value} className="clin-check">
                      <input
                        type="checkbox"
                        checked={form.detail_when.includes(o.value)}
                        onChange={() => toggleDetail(o.value)}
                      />
                      {o.label || o.value}
                    </label>
                  ))}
                </div>
                <label className="label">Texto de ayuda del detalle</label>
                <input
                  className="input"
                  value={form.placeholder}
                  onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
                  placeholder="Ej. Explique brevemente"
                />
              </>
            )}

            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.required}
                onChange={(e) => setForm({ ...form, required: e.target.checked })}
              />
              Obligatoria
            </label>

            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Activa
            </label>

            {error && open && <p className="error">{error}</p>}

            <div className="modal__actions">
              <button type="button" className="btn btn-soft" onClick={close}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
