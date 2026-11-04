import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  fetchServicesForAdmin,
  uploadServiceImage,
  type ServiceWithPrice
} from '../../lib/services'
import { supabase } from '../../lib/supabase'

interface FormState {
  id: string | null
  name: string
  description: string
  durationMinutes: string
  category: string
  price: string
  isActive: boolean
  imageUrl: string
}

const emptyForm: FormState = {
  id: null,
  name: '',
  description: '',
  durationMinutes: '60',
  category: '',
  price: '0',
  isActive: true,
  imageUrl: ''
}

function formatPrice(value: number) {
  return value.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export default function ServicesAdmin() {
  const [services, setServices] = useState<ServiceWithPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setServices(await fetchServicesForAdmin())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los servicios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function flash(message: string) {
    setNotice(message)
    setError(null)
    window.setTimeout(() => setNotice(null), 3500)
  }

  function openNew() {
    setForm(emptyForm)
    setError(null)
    setOpen(true)
  }

  function openEdit(s: ServiceWithPrice) {
    setForm({
      id: s.id,
      name: s.name,
      description: s.description ?? '',
      durationMinutes: String(s.duration_minutes),
      category: s.category ?? '',
      price: String(s.internal_price),
      isActive: s.is_active,
      imageUrl: s.image_url ?? ''
    })
    setError(null)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setSaving(false)
    setUploading(false)
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadServiceImage(file)
      setForm((f) => ({ ...f, imageUrl: url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const duration = Number(form.durationMinutes)
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (!duration || duration <= 0) {
      setError('La duración debe ser mayor a 0 minutos.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        duration_minutes: duration,
        category: form.category.trim() || null,
        is_active: form.isActive,
        image_url: form.imageUrl || null
      }

      let serviceId = form.id

      if (serviceId) {
        const { error } = await supabase.from('services').update(payload).eq('id', serviceId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('services')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        serviceId = data.id
      }

      const price = Number(form.price) || 0
      const { error: priceError } = await supabase
        .from('service_pricing')
        .upsert({ service_id: serviceId, internal_price: price }, { onConflict: 'service_id' })
      if (priceError) throw priceError

      await load()
      flash(form.id ? 'Servicio actualizado.' : 'Servicio creado.')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el servicio.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(s: ServiceWithPrice) {
    if (!window.confirm(`¿Eliminar el servicio "${s.name}"? Esta acción no se puede deshacer.`)) {
      return
    }
    setError(null)
    const { error } = await supabase.from('services').delete().eq('id', s.id)
    if (error) {
      setError(error.message)
      return
    }
    await load()
    flash('Servicio eliminado.')
  }

  async function toggleActive(s: ServiceWithPrice) {
    setError(null)
    const { error } = await supabase
      .from('services')
      .update({ is_active: !s.is_active })
      .eq('id', s.id)
    if (error) {
      setError(error.message)
      return
    }
    await load()
  }

  return (
    <div>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Servicios</h1>
          <p className="admin__subtitle">
            Crea y edita los servicios, su precio interno y su imagen. El precio nunca se muestra
            en la página pública.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          + Nuevo servicio
        </button>
      </div>

      {notice && <p className="admin__notice">{notice}</p>}
      {error && !open && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Cargando servicios…</p>
      ) : (
        <div className="svc-list">
          {services.map((s) => (
            <div className="svc-row" key={s.id}>
              {s.image_url ? (
                <img className="svc-thumb" src={s.image_url} alt={s.name} loading="lazy" />
              ) : (
                <div className="svc-thumb svc-thumb--ph" aria-hidden="true">
                  {s.name.charAt(0)}
                </div>
              )}

              <div className="svc-info">
                <h3>{s.name}</h3>
                <div className="svc-meta">
                  {s.duration_minutes} min · {s.category || 'Sin categoría'} ·{' '}
                  <span className="svc-price">RD$ {formatPrice(s.internal_price)}</span>
                  {!s.is_active && <span className="svc-off">Inactivo</span>}
                </div>
              </div>

              <div className="svc-actions">
                <button className="btn btn-soft" onClick={() => openEdit(s)}>
                  Editar
                </button>
                <button className="btn btn-soft" onClick={() => toggleActive(s)}>
                  {s.is_active ? 'Desactivar' : 'Activar'}
                </button>
                <button className="btn btn-ghost" onClick={() => remove(s)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          {services.length === 0 && (
            <p className="muted">Todavía no hay servicios. Crea el primero con “Nuevo servicio”.</p>
          )}
        </div>
      )}

      {open && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? 'Editar servicio' : 'Nuevo servicio'}</h2>

            <form onSubmit={save}>
              <label className="label">Nombre</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Limpieza facial"
                required
              />

              <label className="label">Descripción</label>
              <textarea
                className="input"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Breve descripción del servicio"
              />

              <div className="modal__row">
                <div>
                  <label className="label">Duración (min)</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Categoría</label>
                  <input
                    className="input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Facial, corporal…"
                  />
                </div>
              </div>

              <label className="label">Precio interno (RD$)</label>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />

              <label className="label">Imagen del servicio</label>
              {form.imageUrl ? (
                <div className="modal__img">
                  <img src={form.imageUrl} alt="Vista previa" />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setForm({ ...form, imageUrl: '' })}
                  >
                    Quitar imagen
                  </button>
                </div>
              ) : (
                <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
              )}
              {uploading && <p className="muted">Subiendo imagen…</p>}

              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Visible en la página pública
              </label>

              {error && open && <p className="error">{error}</p>}

              <div className="modal__actions">
                <button type="button" className="btn btn-soft" onClick={close}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
