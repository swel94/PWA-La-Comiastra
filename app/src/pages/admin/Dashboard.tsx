import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon, { type IconName } from '../../components/Icon'
import { fetchAppointmentsRange, type AppointmentRow } from '../../lib/appointments'
import { fetchCustomers, type CustomerListItem } from '../../lib/customers'
import { fetchProducts, isLowStock, type Product } from '../../lib/products'
import { fetchEarnings } from '../../lib/reports'

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmada', cls: 'is-confirmed' },
  completed: { label: 'Completada', cls: 'is-completed' },
  cancelled: { label: 'Cancelada', cls: 'is-cancelled' },
  no_show: { label: 'No se presentó', cls: 'is-noshow' },
  pending: { label: 'Pendiente', cls: 'is-pending' }
}

const quick: { label: string; desc: string; to: string; icon: IconName }[] = [
  { label: 'Agenda', desc: 'Ver citas de la semana', to: '/panel/citas', icon: 'calendar' },
  { label: 'Clientes', desc: 'Fichas y datos de contacto', to: '/panel/clientes', icon: 'users' },
  { label: 'Servicios', desc: 'Precios y visibilidad', to: '/panel/servicios', icon: 'sparkles' },
  { label: 'Reportes', desc: 'Ingresos del período', to: '/panel/reportes', icon: 'chart' }
]

function money(n: number) {
  return `RD$ ${n.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString('es-DO', {
    timeZone: 'America/Santo_Domingo',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function Dashboard() {
  const [appts, setAppts] = useState<AppointmentRow[]>([])
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [revenue, setRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const now = new Date()
    const dayFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const dayTo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
    const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthTo = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    Promise.all([
      fetchAppointmentsRange(dayFrom, dayTo),
      fetchCustomers(),
      fetchProducts(),
      fetchEarnings(monthFrom, monthTo)
    ])
      .then(([a, c, p, e]) => {
        if (cancelled) return
        setAppts(a)
        setCustomers(c)
        setProducts(p)
        setRevenue(e.service_revenue + e.product_revenue)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar el panel.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const activeAppts = appts.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
  const next = appts.find((a) => new Date(a.start_at) >= new Date())
  const lowStock = products.filter(isLowStock).length

  const stats = [
    {
      label: 'Citas hoy',
      value: loading ? '—' : String(activeAppts.length),
      hint: loading
        ? 'Cargando…'
        : next
          ? `Próxima a las ${timeOf(next.start_at)}`
          : 'Sin citas pendientes',
      icon: 'calendar' as IconName,
      to: '/panel/citas'
    },
    {
      label: 'Clientes',
      value: loading ? '—' : String(customers.length),
      hint: 'Fichas registradas',
      icon: 'users' as IconName,
      to: '/panel/clientes'
    },
    {
      label: 'Ingresos del mes',
      value: loading ? '—' : money(revenue),
      hint: 'Servicios y productos',
      icon: 'chart' as IconName,
      to: '/panel/reportes'
    },
    {
      label: 'Stock bajo',
      value: loading ? '—' : String(lowStock),
      hint: 'Productos por reponer',
      icon: 'box' as IconName,
      to: '/panel/inventario'
    }
  ]

  return (
    <div>
      <div className="admin__head">
        <div>
          <p className="admin__eyebrow">Resumen</p>
          <h1 className="admin__title">Panel</h1>
          <p className="admin__subtitle">
            Un vistazo rápido a tu agenda y a la marcha del negocio. Todo lo importante, en un solo
            lugar.
          </p>
        </div>
        <Link to="/panel/citas" className="btn btn-primary">
          Ver agenda
        </Link>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="admin__cards">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="admin__stat">
            <span className="admin__stat-icon">
              <Icon name={stat.icon} size={17} />
            </span>
            <span className="admin__stat-label">{stat.label}</span>
            <b className="admin__stat-value">{stat.value}</b>
            <span className="admin__stat-hint">{stat.hint}</span>
          </Link>
        ))}
      </div>

      <div className="dash-grid">
        <section className="admin__panel">
          <div className="admin__panel-head">
            <div>
              <h2 className="admin__section-title">Citas de hoy</h2>
              <p className="admin__panel-desc">Tu día, en orden cronológico.</p>
            </div>
            <Link to="/panel/citas" className="admin__panel-link">
              Ver todas <span aria-hidden="true">→</span>
            </Link>
          </div>

          {loading ? (
            <p className="muted">Cargando…</p>
          ) : appts.length === 0 ? (
            <p className="muted">No hay citas para hoy.</p>
          ) : (
            <div className="dash-timeline">
              {appts.map((a) => {
                const st = STATUS[a.status] ?? { label: a.status, cls: '' }
                return (
                  <div className="dash-slot" key={a.id}>
                    <span className="dash-slot__time">{timeOf(a.start_at)}</span>
                    <div className="dash-slot__body">
                      <b>{a.customer_name}</b>
                      <span>{a.services.join(', ') || 'Sin servicio'}</span>
                    </div>
                    <span className={'appt-status ' + st.cls}>{st.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="admin__panel">
          <div className="admin__panel-head">
            <div>
              <h2 className="admin__section-title">Accesos rápidos</h2>
              <p className="admin__panel-desc">Las secciones que más vas a usar.</p>
            </div>
          </div>

          <div className="dash-links">
            {quick.map((item) => (
              <Link key={item.to} to={item.to} className="dash-link">
                <span className="dash-link__icon">
                  <Icon name={item.icon} size={16} />
                </span>
                <span className="dash-link__text">
                  <b>{item.label}</b>
                  <small>{item.desc}</small>
                </span>
                <Icon name="chevron" size={15} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
