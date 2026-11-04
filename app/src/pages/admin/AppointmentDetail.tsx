import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  addNote,
  addSale,
  fetchAppointmentDetail,
  fetchNotes,
  fetchSales,
  removeSale,
  updateAppointmentStatus,
  type AppointmentDetail,
  type NoteRow,
  type SaleRow
} from '../../lib/appointmentDetail'
import { fetchProducts, type Product } from '../../lib/products'

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmada', cls: 'is-confirmed' },
  completed: { label: 'Completada', cls: 'is-completed' },
  cancelled: { label: 'Cancelada', cls: 'is-cancelled' },
  no_show: { label: 'No se presentó', cls: 'is-noshow' },
  pending: { label: 'Pendiente', cls: 'is-pending' }
}

function money(n: number) {
  return `RD$ ${n.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function when(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('es-DO', {
    timeZone: 'America/Santo_Domingo',
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
  const time = d.toLocaleTimeString('es-DO', {
    timeZone: 'America/Santo_Domingo',
    hour: '2-digit',
    minute: '2-digit'
  })
  return `${date} · ${time}`
}

export default function AppointmentDetail() {
  const { id } = useParams()
  const [appt, setAppt] = useState<AppointmentDetail | null>(null)
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [sales, setSales] = useState<SaleRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const [saleProductId, setSaleProductId] = useState('')
  const [saleQty, setSaleQty] = useState('1')
  const [savingSale, setSavingSale] = useState(false)

  async function load() {
    if (!id) return
    setLoading(true)
    try {
      const [a, n, s, ps] = await Promise.all([
        fetchAppointmentDetail(id),
        fetchNotes(id),
        fetchSales(id),
        fetchProducts()
      ])
      if (!a) {
        setError('Cita no encontrada.')
        return
      }
      setAppt(a)
      setNotes(n)
      setSales(s)
      setProducts(ps.filter((p) => p.is_active))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la cita.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  function flash(msg: string) {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 3000)
  }

  async function changeStatus(status: string) {
    if (!appt) return
    setBusy(true)
    setError(null)
    try {
      await updateAppointmentStatus(appt.id, status)
      setAppt({ ...appt, status })
      flash('Estado actualizado.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el estado.')
    } finally {
      setBusy(false)
    }
  }

  async function saveNote() {
    if (!id || !noteText.trim()) return
    setSavingNote(true)
    setError(null)
    try {
      await addNote(id, noteText.trim())
      setNoteText('')
      setNotes(await fetchNotes(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la nota.')
    } finally {
      setSavingNote(false)
    }
  }

  async function addSaleItem() {
    if (!id || !saleProductId) return
    const product = products.find((p) => p.id === saleProductId)
    const qty = Number(saleQty)
    if (!product || !qty || qty <= 0) {
      setError('Selecciona un producto y una cantidad válida.')
      return
    }
    if (qty > product.quantity_on_hand) {
      setError(`Stock insuficiente: solo hay ${product.quantity_on_hand}.`)
      return
    }
    setSavingSale(true)
    setError(null)
    try {
      await addSale(id, product, qty)
      setSaleProductId('')
      setSaleQty('1')
      setSales(await fetchSales(id))
      setProducts(await fetchProducts())
      flash('Producto agregado a la venta.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar el producto.')
    } finally {
      setSavingSale(false)
    }
  }

  async function removeSaleItem(s: SaleRow) {
    if (!window.confirm(`¿Quitar "${s.product_name}" de la venta? Se restaura el stock.`)) return
    if (!id) return
    setError(null)
    try {
      await removeSale(s, id)
      setSales(await fetchSales(id))
      setProducts(await fetchProducts())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo quitar el producto.')
    }
  }

  if (loading) return <p className="muted">Cargando cita…</p>
  if (!appt) return <p className="error">{error ?? 'Cita no encontrada.'}</p>

  const st = STATUS[appt.status] ?? { label: appt.status, cls: '' }
  const total = sales.reduce((sum, s) => sum + s.sell_price_at_sale * s.quantity, 0)
  const profit = sales.reduce((sum, s) => sum + (s.sell_price_at_sale - s.cost_at_sale) * s.quantity, 0)

  return (
    <div>
      <div className="admin__head">
        <div>
          <Link to="/panel/citas" className="muted">
            ← Citas
          </Link>
          <h1 className="admin__title">{appt.customer_name}</h1>
          <p className="admin__subtitle">
            {when(appt.start_at)} · {appt.services.join(', ') || 'Sin servicio'}
          </p>
        </div>
        <span className={'appt-status ' + st.cls}>{st.label}</span>
      </div>

      {notice && <p className="admin__notice">{notice}</p>}
      {error && <p className="error">{error}</p>}

      <div className="appt-info-row">
        <Link to={`/panel/clientes/${appt.customer_id}`} className="btn btn-soft">
          Ver ficha del cliente
        </Link>
        <button
          className="btn btn-soft"
          onClick={() => changeStatus('completed')}
          disabled={busy || appt.status === 'completed'}
        >
          Marcar completada
        </button>
        <button
          className="btn btn-soft"
          onClick={() => changeStatus('no_show')}
          disabled={busy || appt.status === 'no_show'}
        >
          No se presentó
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => changeStatus('cancelled')}
          disabled={busy || appt.status === 'cancelled'}
        >
          Cancelar cita
        </button>
      </div>

      <section className="client-section">
        <h2 className="admin__section-title">Notas de tratamiento</h2>

        <div className="note-add">
          <textarea
            className="input"
            rows={2}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Escribe una nota de la cita…"
          />
          <button
            className="btn btn-primary"
            onClick={saveNote}
            disabled={savingNote || !noteText.trim()}
          >
            {savingNote ? 'Guardando…' : 'Agregar nota'}
          </button>
        </div>

        {notes.length === 0 ? (
          <p className="muted">Aún no hay notas para esta cita.</p>
        ) : (
          <div className="note-list">
            {notes.map((n) => (
              <div className="note-item" key={n.id}>
                <div className="note-meta">
                  {new Date(n.created_at).toLocaleString('es-DO', {
                    timeZone: 'America/Santo_Domingo',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div>{n.content}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="client-section">
        <h2 className="admin__section-title">Productos vendidos</h2>

        <div className="sale-add">
          <select
            className="input"
            value={saleProductId}
            onChange={(e) => setSaleProductId(e.target.value)}
          >
            <option value="">Selecciona un producto…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {money(p.sell_price)} (stock {p.quantity_on_hand})
              </option>
            ))}
          </select>
          <input
            className="input sale-qty"
            type="number"
            min={1}
            value={saleQty}
            onChange={(e) => setSaleQty(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={addSaleItem}
            disabled={savingSale || !saleProductId}
          >
            {savingSale ? 'Agregando…' : 'Agregar'}
          </button>
        </div>

        {sales.length === 0 ? (
          <p className="muted">No se han registrado productos en esta cita.</p>
        ) : (
          <>
            <div className="sale-list">
              {sales.map((s) => (
                <div className="sale-row" key={s.id}>
                  <div>
                    <b>{s.product_name}</b>
                    <div className="svc-meta">
                      {s.quantity} × {money(s.sell_price_at_sale)}
                    </div>
                  </div>
                  <div className="sale-row__right">
                    <b>{money(s.sell_price_at_sale * s.quantity)}</b>
                    <button className="btn btn-ghost" onClick={() => removeSaleItem(s)}>
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="sale-totals">
              <span>
                Total vendido: <b>{money(total)}</b>
              </span>
              <span>
                Ganancia: <b>{money(profit)}</b>
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
