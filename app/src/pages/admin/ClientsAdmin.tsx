import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteCustomer, fetchCustomers, type CustomerListItem } from '../../lib/customers'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const out = parts.map((p) => p.charAt(0).toUpperCase()).join('')
  return out || '?'
}

export default function ClientsAdmin() {
  const [items, setItems] = useState<CustomerListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [q, setQ] = useState('')

  async function load() {
    setLoading(true)
    try {
      setItems(await fetchCustomers())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los clientes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = items.filter((c) => {
    const hay = `${c.full_name} ${c.phone} ${c.email}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })

  async function remove(c: CustomerListItem) {
    if (
      !window.confirm(
        `¿Eliminar al cliente "${c.full_name || 'Sin nombre'}"? También se eliminarán sus citas. Esta acción no se puede deshacer.`
      )
    )
      return
    setBusyId(c.id)
    setError(null)
    try {
      await deleteCustomer(c.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el cliente.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Clientes</h1>
          <p className="admin__subtitle">Edita los datos de cada cliente y su ficha clínica.</p>
        </div>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Buscar por nombre, teléfono o correo…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Cargando clientes…</p>
      ) : filtered.length === 0 ? (
        <p className="muted">No hay clientes todavía.</p>
      ) : (
        <div className="client-list">
          {filtered.map((c) => (
            <div className="client-row" key={c.id}>
              <Link to={`/panel/clientes/${c.id}`} className="client-main">
                <div className="client-avatar">{initials(c.full_name)}</div>
                <div style={{ flex: 1 }}>
                  <div className="client-name">{c.full_name || 'Sin nombre'}</div>
                  <div className="svc-meta">
                    {c.phone || 'Sin teléfono'}
                    {c.email ? ` · ${c.email}` : ''}
                  </div>
                </div>
              </Link>

              <button
                className="btn btn-ghost"
                onClick={() => remove(c)}
                disabled={busyId === c.id}
              >
                {busyId === c.id ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
