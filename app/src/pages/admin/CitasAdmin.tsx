import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteAppointment,
  fetchAppointmentsRange,
  markReminderSent,
  type AppointmentRow
} from '../../lib/appointments'
import { buildReminderMessage, buildWhatsAppLink } from '../../lib/whatsapp'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmada', cls: 'is-confirmed' },
  completed: { label: 'Completada', cls: 'is-completed' },
  cancelled: { label: 'Cancelada', cls: 'is-cancelled' },
  no_show: { label: 'No se presentó', cls: 'is-noshow' },
  pending: { label: 'Pendiente', cls: 'is-pending' }
}

function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function timeOf(ts: string) {
  return new Date(ts).toLocaleTimeString('es-DO', {
    timeZone: 'America/Santo_Domingo',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function localDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' })
}

function longDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date(y, m - 1, d))
}

export default function CitasAdmin() {
  const [selected, setSelected] = useState(() => toISO(new Date()))
  const [weekAppts, setWeekAppts] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const weekStart = useMemo(() => {
    const d = parseISO(selected)
    const dow = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - dow)
    return d
  }, [selected])

  const weekStartISO = toISO(weekStart)

  useEffect(() => {
    const from = new Date(`${weekStartISO}T00:00:00-04:00`)
    const to = new Date(from.getTime() + 7 * 86400000)
    setLoading(true)
    fetchAppointmentsRange(from.toISOString(), to.toISOString())
      .then(setWeekAppts)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudieron cargar las citas.'))
      .finally(() => setLoading(false))
  }, [weekStartISO])

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i)
        return { iso: toISO(d), label: WEEKDAYS[i], num: String(d.getDate()) }
      }),
    [weekStart]
  )

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of weekAppts) {
      const key = localDate(a.start_at)
      map[key] = (map[key] ?? 0) + 1
    }
    return map
  }, [weekAppts])

  const dayAppts = weekAppts.filter((a) => localDate(a.start_at) === selected)

  function shiftWeek(n: number) {
    setSelected(toISO(addDays(parseISO(selected), n * 7)))
  }

  async function sendReminder(a: AppointmentRow) {
    const message = buildReminderMessage({
      customerName: a.customer_name,
      service: a.services.join(', ') || 'tu cita',
      dateLabel: longDate(localDate(a.start_at)),
      timeLabel: timeOf(a.start_at)
    })
    const link = buildWhatsAppLink(a.customer_phone, message)
    if (!link) return

    window.open(link, '_blank', 'noopener,noreferrer')

    const sentAt = new Date().toISOString()
    setWeekAppts((prev) => prev.map((x) => (x.id === a.id ? { ...x, reminder_sent_at: sentAt } : x)))
    try {
      await markReminderSent(a.id)
    } catch {
      // El envío ya se abrió; no bloqueamos por el fallo de la marca.
    }
  }

  async function removeAppointment(a: AppointmentRow) {
    if (
      !window.confirm(
        `¿Eliminar la cita de ${a.customer_name} del ${longDate(localDate(a.start_at))}? Esta acción no se puede deshacer.`
      )
    )
      return
    setError(null)
    try {
      await deleteAppointment(a.id)
      setWeekAppts((prev) => prev.filter((x) => x.id !== a.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la cita.')
    }
  }

  return (
    <div>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Citas</h1>
          <p className="admin__subtitle">
            Tu agenda de la semana. Usa “WhatsApp” para enviar un recordatorio.
          </p>
        </div>
        <div className="citas-nav">
          <button className="btn btn-soft" onClick={() => shiftWeek(-1)}>
            ‹ Semana
          </button>
          <button className="btn btn-soft" onClick={() => setSelected(toISO(new Date()))}>
            Hoy
          </button>
          <button className="btn btn-soft" onClick={() => shiftWeek(1)}>
            Semana ›
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="week-strip">
        {days.map((d) => (
          <button
            key={d.iso}
            className={'week-day' + (d.iso === selected ? ' is-selected' : '')}
            onClick={() => setSelected(d.iso)}
          >
            <span>{d.label}</span>
            <b>{d.num}</b>
            {counts[d.iso] > 0 && <em>{counts[d.iso]}</em>}
          </button>
        ))}
      </div>

      <div className="day-head">
        <h2 className="admin__section-title">{longDate(selected)}</h2>
        <span className="muted">{dayAppts.length} cita(s)</span>
      </div>

      {loading ? (
        <p className="muted">Cargando citas…</p>
      ) : dayAppts.length === 0 ? (
        <p className="muted">No hay citas para este día.</p>
      ) : (
        <div className="appt-list">
          {dayAppts.map((a) => {
            const st = STATUS[a.status] ?? { label: a.status, cls: '' }
            return (
              <div className="appt-row" key={a.id}>
                <Link to={`/panel/citas/${a.id}`} className="appt-main">
                  <div className="appt-time">
                    <b>{timeOf(a.start_at)}</b>
                    <span>{timeOf(a.end_at)}</span>
                  </div>
                  <div className="appt-info">
                    <div className="appt-name">{a.customer_name}</div>
                    <div className="appt-service">{a.services.join(', ') || 'Sin servicio'}</div>
                  </div>
                </Link>

                <span className={'appt-status ' + st.cls}>{st.label}</span>

                {a.reminder_sent_at ? (
                  <span className="appt-sent" title={`Recordado ${timeOf(a.reminder_sent_at)}`}>
                    ✓ Recordado
                  </span>
                ) : (
                  <button
                    className="btn btn-soft appt-wa"
                    onClick={() => sendReminder(a)}
                    disabled={!a.customer_phone}
                    title={a.customer_phone ? 'Enviar recordatorio por WhatsApp' : 'Sin teléfono'}
                  >
                    WhatsApp
                  </button>
                )}

                <button
                  className="btn btn-ghost appt-wa"
                  onClick={() => removeAppointment(a)}
                  title="Eliminar cita"
                >
                  Eliminar
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
