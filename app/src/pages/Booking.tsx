import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { fetchActiveServices, type Service } from '../lib/services'
import { fetchClinicalFields, responseOf, type ClinicalField } from '../lib/clinicalFields'
import MonthGrid from '../components/MonthGrid'
import ClinicalForm from '../components/ClinicalForm'
import { googleCalendarUrl } from '../lib/calendarLinks'
import '../lib/landing.css'
import '../lib/booking.css'

interface Slot {
  slot_start: string
  slot_end: string
}

interface Intake {
  name: string
  phone: string
  age: string
  sex: string
  occupation: string
  motivo: string[]
  clinical: Record<string, unknown>
}

const MOTIVOS = [
  'Acné',
  'Rosácea',
  'Manchas',
  'Arrugas',
  'Blanqueamiento corporal',
  'Mantenimiento',
  'Otros'
]

const EMPTY_INTAKE: Intake = {
  name: '',
  phone: '',
  age: '',
  sex: '',
  occupation: '',
  motivo: [],
  clinical: {}
}

function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-DO', {
    timeZone: 'America/Santo_Domingo',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDayLong(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date(y, m - 1, d))
}

export default function Booking() {
  const { session, signIn, signUp } = useAuth()

  const [step, setStep] = useState(1)
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [service, setService] = useState<Service | null>(null)

  const [day, setDay] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slot, setSlot] = useState<Slot | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')

  const [intake, setIntake] = useState<Intake>(EMPTY_INTAKE)
  const [clinicalFields, setClinicalFields] = useState<ClinicalField[]>([])

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appointmentId, setAppointmentId] = useState<string | null>(null)

  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const todayIso = useMemo(() => toISODate(new Date()), [])
  const maxIso = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 90)
    return toISODate(d)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchActiveServices()
      .then((data) => {
        if (!cancelled) setServices(data)
      })
      .catch(() => {
        if (!cancelled) setServices([])
      })
      .finally(() => {
        if (!cancelled) setLoadingServices(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchClinicalFields()
      .then((data) => {
        if (!cancelled) setClinicalFields(data)
      })
      .catch(() => {
        if (!cancelled) setClinicalFields([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Si el navegador restaura la página desde su caché (bfcache) al volver,
  // recargamos para empezar el flujo desde cero y evitar estados a medias.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) window.location.reload()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  useEffect(() => {
    if (step !== 2 || !service || !day) return
    let cancelled = false
    setLoadingSlots(true)
    setSlots([])
    setSlot(null)
    supabase
      .rpc('get_available_slots', { p_service_id: service.id, p_day: day })
      .then(({ data, error }) => {
        if (cancelled) return
        setLoadingSlots(false)
        if (error) {
          setError(error.message)
          return
        }
        setSlots((data ?? []) as Slot[])
      })
    return () => {
      cancelled = true
    }
  }, [step, service, day])

  async function afterAuth() {
    setBusy(true)
    setError(null)
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        setError('No se pudo obtener tu sesión. Intenta de nuevo.')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (!profile) {
        setError('No encontramos tu perfil.')
        return
      }

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle()

      if (customer) {
        setStep(5)
      } else {
        setIntake((f) => ({ ...f, name: profile.full_name || '', phone: profile.phone || '' }))
        setStep(4)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error.')
    } finally {
      setBusy(false)
    }
  }

  async function handleContinueFromSlot() {
    if (session) {
      await afterAuth()
    } else {
      setStep(3)
    }
  }

  async function handleAuth(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const action = mode === 'signup' ? signUp : signIn
    const { error } = await action(email, password)
    if (error) {
      setBusy(false)
      if (/already|registrad/i.test(error)) {
        setError('Ese correo ya está registrado. Usa “Ya tengo cuenta”.')
      } else {
        setError('No pudimos continuar. Verifica tus datos e intenta de nuevo.')
      }
      return
    }
    await afterAuth()
    setBusy(false)
  }

  async function saveIntake(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const missing = clinicalFields.filter((f) => {
      if (!f.required || f.type === 'multi') return false
      const v = intake.clinical[f.key]
      return f.type === 'select_text' ? !responseOf(v) : !v
    })
    if (missing.length > 0) {
      setError(`Falta responder: ${missing[0].label}`)
      return
    }

    setBusy(true)
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesión no encontrada.')

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (!profile) throw new Error('Perfil no encontrado.')

      const payload = {
        profile_id: profile.id,
        sex: intake.sex || null,
        age: intake.age ? Number(intake.age) : null,
        occupation: intake.occupation || null,
        motivo_visita: intake.motivo,
        clinical: intake.clinical,
        intake_completed_at: new Date().toISOString()
      }

      const { error } = await supabase.from('customers').insert(payload)
      if (error) throw error

      await supabase
        .from('profiles')
        .update({ full_name: intake.name, phone: intake.phone })
        .eq('id', profile.id)

      setStep(5)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar tu ficha.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmBooking() {
    if (!service || !slot) return
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.rpc('create_booking', {
      p_service_ids: [service.id],
      p_start_at: slot.slot_start
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setAppointmentId(String(data))
    setStep(6)
  }

  return (
    <div className="site">
      <div className="booking">
        {step <= 5 && (
          <>
            <div className="booking__top">
              <Link to="/" className="booking__back">
                ← Inicio
              </Link>
              <span className="booking__step-count">Paso {step} de 5</span>
            </div>
            <div className="booking__progress">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= step ? 'on' : ''} />
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="booking__title">¿Qué servicio deseas?</h1>
            <p className="booking__sub">Elige el tratamiento para tu cita.</p>

            {loadingServices ? (
              <p className="b-empty">Cargando servicios…</p>
            ) : services.length === 0 ? (
              <p className="b-empty">No hay servicios disponibles por ahora.</p>
            ) : (
              services.map((s) => (
                <button
                  key={s.id}
                  className={'b-option' + (service?.id === s.id ? ' is-selected' : '')}
                  onClick={() => {
                    setService(s)
                    setError(null)
                  }}
                >
                  <div>
                    <div className="b-option__name">{s.name}</div>
                    <div className="b-option__meta">
                      {s.duration_minutes} min
                      {s.description ? ` · ${s.description}` : ''}
                    </div>
                  </div>
                  <span className="b-option__dot" />
                </button>
              ))
            )}

            <div className="b-actions">
              <button
                className="l-btn l-btn--primary"
                disabled={!service}
                onClick={() => setStep(2)}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="booking__title">Elige fecha y hora</h1>
            <p className="booking__sub">Selecciona el día y el horario que prefieras.</p>

            <MonthGrid
              month={month}
              onPrev={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              onNext={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              selected={day}
              onDayClick={setDay}
              isDisabled={(iso) => iso < todayIso || iso > maxIso}
            />
            <p className="booking__sub" style={{ marginTop: 10 }}>
              Puedes reservar hasta 90 días de anticipación.
            </p>

            {loadingSlots && <p className="b-empty">Buscando horarios…</p>}
            {!loadingSlots && day && slots.length === 0 && (
              <p className="b-empty">No hay horarios disponibles para este día.</p>
            )}
            {slots.length > 0 && (
              <div className="b-slots">
                {slots.map((s) => (
                  <button
                    key={s.slot_start}
                    className={'b-slot' + (slot?.slot_start === s.slot_start ? ' is-selected' : '')}
                    onClick={() => setSlot(s)}
                  >
                    {formatTime(s.slot_start)}
                  </button>
                ))}
              </div>
            )}

            <div className="b-actions">
              <button className="l-btn l-btn--ghost" onClick={() => setStep(1)}>
                Atrás
              </button>
              <button
                className="l-btn l-btn--primary"
                disabled={!slot}
                onClick={handleContinueFromSlot}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="booking__title">Identifícate</h1>
            <p className="booking__sub">Necesitamos tu correo para guardar tu cita.</p>

            <div className="b-toggle">
              <button className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>
                Soy nueva
              </button>
              <button className={mode === 'signin' ? 'on' : ''} onClick={() => setMode('signin')}>
                Ya tengo cuenta
              </button>
            </div>

            <form onSubmit={handleAuth} autoComplete="off">
              <label className="label">Correo electrónico</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <label className="label">Contraseña</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
              />
              {error && <p className="error">{error}</p>}
              <div className="b-actions">
                <button type="button" className="l-btn l-btn--ghost" onClick={() => setStep(2)}>
                  Atrás
                </button>
                <button type="submit" className="l-btn l-btn--primary" disabled={busy}>
                  {busy ? 'Ingresando…' : 'Continuar'}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="booking__title">Cuéntanos de ti</h1>
            <p className="booking__sub">Es tu primera visita. Completa tus datos básicos.</p>

            <form onSubmit={saveIntake} autoComplete="off">
              <label className="label">Nombre completo</label>
              <input
                className="input"
                value={intake.name}
                onChange={(e) => setIntake({ ...intake, name: e.target.value })}
                required
              />
              <label className="label">Teléfono celular</label>
              <input
                className="input"
                value={intake.phone}
                onChange={(e) => setIntake({ ...intake, phone: e.target.value })}
                required
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Edad</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={120}
                    value={intake.age}
                    onChange={(e) => setIntake({ ...intake, age: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Sexo</label>
                  <select
                    className="input"
                    value={intake.sex}
                    onChange={(e) => setIntake({ ...intake, sex: e.target.value })}
                  >
                    <option value="">—</option>
                    <option value="hombre">Hombre</option>
                    <option value="mujer">Mujer</option>
                  </select>
                </div>
              </div>

              <label className="label">Ocupación</label>
              <input
                className="input"
                value={intake.occupation}
                onChange={(e) => setIntake({ ...intake, occupation: e.target.value })}
              />

              <label className="label">Motivo de visita</label>
              <div className="motivos">
                {MOTIVOS.map((m) => (
                  <label key={m} className="motivo">
                    <input
                      type="checkbox"
                      checked={intake.motivo.includes(m)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...intake.motivo, m]
                          : intake.motivo.filter((x) => x !== m)
                        setIntake({ ...intake, motivo: next })
                      }}
                    />
                    {m}
                  </label>
                ))}
              </div>

              <div className="label" style={{ marginTop: 24 }}>
                Ficha clínica
              </div>
              <p className="booking__sub" style={{ margin: '6px 0 12px' }}>
                Completa la información para que tu esteticista conozca tu piel.
              </p>
              <ClinicalForm
                fields={clinicalFields}
                value={intake.clinical}
                onChange={(next) => setIntake({ ...intake, clinical: next })}
              />

              {error && <p className="error">{error}</p>}

              <div className="b-actions">
                <button type="button" className="l-btn l-btn--ghost" onClick={() => setStep(2)}>
                  Atrás
                </button>
                <button type="submit" className="l-btn l-btn--primary" disabled={busy}>
                  {busy ? 'Guardando…' : 'Continuar'}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 5 && (
          <>
            <h1 className="booking__title">Confirma tu cita</h1>
            <p className="booking__sub">Revisa los detalles antes de confirmar.</p>

            <div className="b-summary">
              <div className="b-row">
                <span>Servicio</span>
                <b>{service?.name}</b>
              </div>
              <div className="b-row">
                <span>Fecha</span>
                <b>{day ? formatDayLong(day) : ''}</b>
              </div>
              <div className="b-row">
                <span>Hora</span>
                <b>{slot ? formatTime(slot.slot_start) : ''}</b>
              </div>
              <div className="b-row">
                <span>Duración</span>
                <b>{service?.duration_minutes} min</b>
              </div>
            </div>

            {error && <p className="error">{error}</p>}

            <div className="b-actions">
              <button className="l-btn l-btn--ghost" onClick={() => setStep(1)}>
                Cambiar
              </button>
              <button className="l-btn l-btn--primary" disabled={busy} onClick={confirmBooking}>
                {busy ? 'Confirmando…' : 'Confirmar cita'}
              </button>
            </div>
          </>
        )}

        {step === 6 && (
          <div className="b-success">
            <div className="b-success__icon">✓</div>
            <h1 className="booking__title">¡Cita confirmada!</h1>
            <p className="booking__sub">Te esperamos. Aquí están los detalles.</p>

            <div className="b-summary" style={{ textAlign: 'left' }}>
              <div className="b-row">
                <span>Servicio</span>
                <b>{service?.name}</b>
              </div>
              <div className="b-row">
                <span>Fecha</span>
                <b>{day ? formatDayLong(day) : ''}</b>
              </div>
              <div className="b-row">
                <span>Hora</span>
                <b>{slot ? formatTime(slot.slot_start) : ''}</b>
              </div>
            </div>

            {appointmentId && (
              <p className="b-empty" style={{ textAlign: 'center' }}>
                Cita #{appointmentId.slice(0, 8)}
              </p>
            )}

            {appointmentId && service && slot && (
              <div className="b-actions" style={{ marginBottom: 10 }}>
                <button
                  className="l-btn l-btn--ghost"
                  onClick={() =>
                    window.open(
                      googleCalendarUrl({
                        id: appointmentId,
                        title: `${service.name} — La Cosmiatra`,
                        startISO: slot.slot_start,
                        endISO: slot.slot_end,
                        description: 'Tu cita en La Cosmiatra'
                      }),
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                >
                  Añadir a mi calendario
                </button>
              </div>
            )}

            <div className="b-actions">
              <Link to="/" className="l-btn l-btn--ghost">
                Volver al inicio
              </Link>
              <Link to="/mis-citas" className="l-btn l-btn--primary">
                Ver mis citas
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
