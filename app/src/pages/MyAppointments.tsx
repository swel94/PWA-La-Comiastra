import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  cancelMyAppointment,
  fetchMyAppointments,
  type MyAppointment
} from '../lib/appointments'
import { downloadIcs, googleCalendarUrl } from '../lib/calendarLinks'
import '../lib/landing.css'
import '../lib/booking.css'

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No se presentó',
  pending: 'Pendiente'
}

function formatWhen(iso: string) {
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

function titleOf(a: MyAppointment) {
  return `${a.services.join(', ') || 'Cita'} — La Cosmiatra`
}

export default function MyAppointments() {
  const { signOut } = useAuth()
  const [items, setItems] = useState<MyAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setItems(await fetchMyAppointments())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus citas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const isUpcoming = (a: MyAppointment) =>
    (a.status === 'confirmed' || a.status === 'pending') &&
    new Date(a.start_at).getTime() >= Date.now() - 3600000

  const upcoming = items
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  const past = items
    .filter((a) => !isUpcoming(a))
    .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())

  async function cancel(a: MyAppointment) {
    if (!window.confirm('¿Cancelar esta cita?')) return
    setBusyId(a.id)
    setError(null)
    try {
      await cancelMyAppointment(a.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cancelar la cita.')
    } finally {
      setBusyId(null)
    }
  }

  function addToGoogle(a: MyAppointment) {
    window.open(
      googleCalendarUrl({
        id: a.id,
        title: titleOf(a),
        startISO: a.start_at,
        endISO: a.end_at,
        description: 'Tu cita en La Cosmiatra'
      }),
      '_blank',
      'noopener,noreferrer'
    )
  }

  function addIcs(a: MyAppointment) {
    downloadIcs({
      id: a.id,
      title: titleOf(a),
      startISO: a.start_at,
      endISO: a.end_at,
      description: 'Tu cita en La Cosmiatra'
    })
  }

  return (
    <div className="site">
      <div className="booking">
        <div className="booking__top">
          <Link to="/" className="booking__back">
            ← Inicio
          </Link>
          <button className="l-btn l-btn--ghost l-btn--sm" onClick={() => signOut()}>
            Salir
          </button>
        </div>

        <h1 className="booking__title">Mis citas</h1>
        <p className="booking__sub">Revisa tus próximas citas y tu historial.</p>

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p className="b-empty">Cargando tus citas…</p>
        ) : (
          <>
            <div className="label" style={{ marginTop: 18 }}>Próximas</div>
            {upcoming.length === 0 ? (
              <p className="b-empty">No tienes citas próximas.</p>
            ) : (
              upcoming.map((a) => (
                <div className="myappt" key={a.id}>
                  <div className="myappt__top">
                    <div>
                      <div className="myappt__service">{a.services.join(', ') || 'Cita'}</div>
                      <div className="myappt__when">{formatWhen(a.start_at)}</div>
                    </div>
                    <span className="muted small">{STATUS_LABEL[a.status] ?? a.status}</span>
                  </div>
                  <div className="myappt__actions">
                    <button className="l-btn l-btn--ghost l-btn--sm" onClick={() => addToGoogle(a)}>
                      Google Calendar
                    </button>
                    <button className="l-btn l-btn--ghost l-btn--sm" onClick={() => addIcs(a)}>
                      Descargar .ics
                    </button>
                    <button
                      className="l-btn l-btn--ghost l-btn--sm"
                      onClick={() => cancel(a)}
                      disabled={busyId === a.id}
                    >
                      {busyId === a.id ? 'Cancelando…' : 'Cancelar'}
                    </button>
                  </div>
                </div>
              ))
            )}

            <div className="label" style={{ marginTop: 22 }}>Pasadas</div>
            {past.length === 0 ? (
              <p className="b-empty">No hay citas pasadas.</p>
            ) : (
              past.map((a) => (
                <div className="myappt" key={a.id}>
                  <div className="myappt__top">
                    <div>
                      <div className="myappt__service">{a.services.join(', ') || 'Cita'}</div>
                      <div className="myappt__when">{formatWhen(a.start_at)}</div>
                    </div>
                    <span className="muted small">{STATUS_LABEL[a.status] ?? a.status}</span>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
