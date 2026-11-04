import { useEffect, useMemo, useState } from 'react'
import {
  fetchEarnings,
  fetchEarningsDaily,
  type DailyEarning,
  type EarningsTotals
} from '../../lib/reports'

function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthRange(offset = 0) {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return { from: toISO(first), to: toISO(last) }
}

function last30() {
  const now = new Date()
  const from = new Date(now)
  from.setDate(now.getDate() - 29)
  return { from: toISO(from), to: toISO(now) }
}

function rangeToISO(from: string, to: string) {
  const start = new Date(`${from}T00:00:00-04:00`)
  const end = new Date(new Date(`${to}T00:00:00-04:00`).getTime() + 86400000)
  return { fromISO: start.toISOString(), toISO: end.toISOString() }
}

function money(n: number) {
  return `RD$ ${n.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatDay(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('es-DO', { day: 'numeric', month: 'short' }).format(
    new Date(y, m - 1, d)
  )
}

const EMPTY: EarningsTotals = {
  service_revenue: 0,
  product_revenue: 0,
  product_profit: 0,
  completed_count: 0
}

export default function ReportesAdmin() {
  const [range, setRange] = useState(() => monthRange(0))
  const [totals, setTotals] = useState<EarningsTotals>(EMPTY)
  const [daily, setDaily] = useState<DailyEarning[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!range.from || !range.to) return
    setLoading(true)
    setError(null)
    try {
      const { fromISO, toISO } = rangeToISO(range.from, range.to)
      const [t, d] = await Promise.all([
        fetchEarnings(fromISO, toISO),
        fetchEarningsDaily(fromISO, toISO)
      ])
      setTotals(t)
      setDaily(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los ingresos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to])

  const max = useMemo(() => Math.max(1, ...daily.map((d) => d.service_revenue + d.product_revenue)), [
    daily
  ])
  const totalBilled = totals.service_revenue + totals.product_revenue

  return (
    <div>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Reportes</h1>
          <p className="admin__subtitle">
            Ingresos por servicios y productos en el período seleccionado.
          </p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="report-controls">
        <div className="field">
          <label className="label">Desde</label>
          <input
            className="input"
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
          />
        </div>
        <div className="field">
          <label className="label">Hasta</label>
          <input
            className="input"
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
          />
        </div>
        <button className="btn btn-soft" onClick={() => setRange(monthRange(0))}>
          Este mes
        </button>
        <button className="btn btn-soft" onClick={() => setRange(monthRange(-1))}>
          Mes pasado
        </button>
        <button className="btn btn-soft" onClick={() => setRange(last30())}>
          Últimos 30 días
        </button>
      </div>

      <div className="report-cards">
        <div className="report-card">
          <span>Ingresos por servicios</span>
          <b>{money(totals.service_revenue)}</b>
        </div>
        <div className="report-card">
          <span>Ingresos por productos</span>
          <b>{money(totals.product_revenue)}</b>
        </div>
        <div className="report-card">
          <span>Ganancia por productos</span>
          <b>{money(totals.product_profit)}</b>
        </div>
        <div className="report-card">
          <span>Total facturado</span>
          <b>{money(totalBilled)}</b>
        </div>
      </div>

      <p className="muted">{totals.completed_count} cita(s) completada(s) en el período.</p>

      {loading ? (
        <p className="muted">Calculando…</p>
      ) : daily.length === 0 ? (
        <p className="muted">No hay ingresos en este período.</p>
      ) : (
        <>
          <div className="chart">
            {daily.map((d) => {
              const total = d.service_revenue + d.product_revenue
              const h = Math.round((total / max) * 100)
              return (
                <div className="chart__col" key={d.day}>
                  <div
                    className="chart__bar"
                    style={{ height: `${h}%` }}
                    title={`${formatDay(d.day)}: ${money(total)}`}
                  />
                </div>
              )
            })}
          </div>
          <p className="muted small-chart-note">Total facturado por día</p>

          <table className="report-table">
            <thead>
              <tr>
                <th>Día</th>
                <th>Servicios</th>
                <th>Productos</th>
                <th>Ganancia prod.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.day}>
                  <td>{formatDay(d.day)}</td>
                  <td>{money(d.service_revenue)}</td>
                  <td>{money(d.product_revenue)}</td>
                  <td>{money(d.product_profit)}</td>
                  <td>{money(d.service_revenue + d.product_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
