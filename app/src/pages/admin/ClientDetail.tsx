import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { fetchCustomer, updateCustomer, deleteCustomer, type CustomerListItem } from '../../lib/customers'
import ClinicalForm from '../../components/ClinicalForm'
import { fetchClinicalFields, type ClinicalField } from '../../lib/clinicalFields'
import { buildWhatsAppLink } from '../../lib/whatsapp'

const MOTIVOS = [
  'Acné',
  'Rosácea',
  'Manchas',
  'Arrugas',
  'Blanqueamiento corporal',
  'Mantenimiento',
  'Otros'
]

interface Form {
  full_name: string
  phone: string
  age: string
  sex: string
  occupation: string
  motivo: string[]
  clinical: Record<string, unknown>
  adminNotes: string
}

const EMPTY_FORM: Form = {
  full_name: '',
  phone: '',
  age: '',
  sex: '',
  occupation: '',
  motivo: [],
  clinical: {},
  adminNotes: ''
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<CustomerListItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [clinicalFields, setClinicalFields] = useState<ClinicalField[]>([])

  useEffect(() => {
    fetchClinicalFields()
      .then(setClinicalFields)
      .catch(() => setClinicalFields([]))
  }, [])

  useEffect(() => {
    if (!id) return
    fetchCustomer(id)
      .then((c) => {
        if (!c) {
          setError('Cliente no encontrado.')
          return
        }
        setCustomer(c)
        setForm({
          full_name: c.full_name,
          phone: c.phone,
          age: c.age ? String(c.age) : '',
          sex: c.sex ?? '',
          occupation: c.occupation ?? '',
          motivo: c.motivo_visita ?? [],
          clinical: (c.clinical as Record<string, unknown>) ?? {},
          adminNotes: c.admin_notes ?? ''
        })
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar el cliente.'))
      .finally(() => setLoading(false))
  }, [id])

  async function save() {
    if (!customer) return
    setError(null)
    setSaving(true)
    try {
      await updateCustomer(customer, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        age: form.age ? Number(form.age) : null,
        sex: form.sex || null,
        occupation: form.occupation.trim() || null,
        motivo_visita: form.motivo,
        clinical: form.clinical,
        admin_notes: form.adminNotes.trim() || null
      })
      setNotice('Perfil guardado.')
      window.setTimeout(() => setNotice(null), 3500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  function openWhatsApp() {
    if (!customer) return
    const link = buildWhatsAppLink(customer.phone, `Hola ${customer.full_name || ''}, `)
    if (link) window.open(link, '_blank', 'noopener,noreferrer')
  }

  async function removeCustomer() {
    if (!customer) return
    if (
      !window.confirm(
        `¿Eliminar al cliente "${customer.full_name || 'Sin nombre'}"? También se eliminarán sus citas. Esta acción no se puede deshacer.`
      )
    )
      return
    setError(null)
    try {
      await deleteCustomer(customer.id)
      navigate('/panel/clientes')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el cliente.')
    }
  }

  if (loading) return <p className="muted">Cargando cliente…</p>
  if (!customer) return <p className="error">{error ?? 'Cliente no encontrado.'}</p>

  return (
    <div>
      <div className="admin__head">
        <div>
          <Link to="/panel/clientes" className="muted">
            ← Clientes
          </Link>
          <h1 className="admin__title">{customer.full_name || 'Cliente'}</h1>
          <p className="admin__subtitle">{customer.email || 'Sin correo'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-soft" onClick={openWhatsApp} disabled={!customer.phone}>
            WhatsApp
          </button>
          <button className="btn btn-ghost" onClick={removeCustomer}>
            Eliminar
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {notice && <p className="admin__notice">{notice}</p>}
      {error && <p className="error">{error}</p>}

      <section className="client-section">
        <h2 className="admin__section-title">Datos personales</h2>

        <div className="form-grid">
          <div>
            <label className="label">Nombre completo</label>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Edad</label>
            <input
              className="input"
              type="number"
              min={0}
              max={120}
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Sexo</label>
            <select
              className="input"
              value={form.sex}
              onChange={(e) => setForm({ ...form, sex: e.target.value })}
            >
              <option value="">—</option>
              <option value="hombre">Hombre</option>
              <option value="mujer">Mujer</option>
            </select>
          </div>
          <div>
            <label className="label">Ocupación</label>
            <input
              className="input"
              value={form.occupation}
              onChange={(e) => setForm({ ...form, occupation: e.target.value })}
            />
          </div>
        </div>

        <label className="label">Motivo de visita</label>
        <div className="clin-checks">
          {MOTIVOS.map((m) => (
            <label key={m} className="clin-check">
              <input
                type="checkbox"
                checked={form.motivo.includes(m)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    motivo: e.target.checked
                      ? [...form.motivo, m]
                      : form.motivo.filter((x) => x !== m)
                  })
                }
              />
              {m}
            </label>
          ))}
        </div>

        <label className="label">Notas internas</label>
        <textarea
          className="input"
          rows={3}
          value={form.adminNotes}
          onChange={(e) => setForm({ ...form, adminNotes: e.target.value })}
        />
      </section>

      <section className="client-section">
        <h2 className="admin__section-title">Ficha clínica</h2>
        <ClinicalForm
          fields={clinicalFields}
          value={form.clinical}
          onChange={(next) => setForm({ ...form, clinical: next })}
        />
      </section>

      <div style={{ marginTop: 24 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
