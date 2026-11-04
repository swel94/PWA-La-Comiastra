import { useEffect, useState } from 'react'
import {
  DAY_NAMES,
  fetchAvailability,
  saveAvailability,
  type AvailabilityDay
} from '../../lib/availability'
import BreaksEditor from './BreaksEditor'
import BlockedCalendar from './BlockedCalendar'

export default function SettingsAdmin() {
  const [days, setDays] = useState<AvailabilityDay[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAvailability()
      .then(setDays)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar el horario.'))
      .finally(() => setLoading(false))
  }, [])

  function patch(dw: number, p: Partial<AvailabilityDay>) {
    setDays((list) => list.map((d) => (d.day_of_week === dw ? { ...d, ...p } : d)))
  }

  async function save() {
    setError(null)

    for (const d of days) {
      if (!d.is_off && d.end_time <= d.start_time) {
        setError(
          `El horario del ${DAY_NAMES[d.day_of_week - 1].toLowerCase()} no es válido: la hora final debe ser mayor que la inicial.`
        )
        return
      }
    }

    setSaving(true)
    try {
      await saveAvailability(days)
      setNotice('Horario guardado.')
      window.setTimeout(() => setNotice(null), 3500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el horario.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Ajustes</h1>
          <p className="admin__subtitle">
            Define tu horario semanal, tus descansos y los días bloqueados. Los clientes podrán
            reservar hasta 90 días en el futuro.
          </p>
        </div>
      </div>

      {notice && <p className="admin__notice">{notice}</p>}
      {error && <p className="error">{error}</p>}

      {/* Horario semanal */}
      <h2 className="admin__section-title">Horario semanal</h2>
      {loading ? (
        <p className="muted">Cargando horario…</p>
      ) : (
        <>
          <div className="avail-list">
            {days.map((d) => (
              <div className="avail-row" key={d.day_of_week}>
                <label className="avail-day">
                  <input
                    type="checkbox"
                    checked={!d.is_off}
                    onChange={(e) => patch(d.day_of_week, { is_off: !e.target.checked })}
                  />
                  {DAY_NAMES[d.day_of_week - 1]}
                </label>

                <div className="avail-times" style={{ opacity: d.is_off ? 0.4 : 1 }}>
                  <input
                    type="time"
                    value={d.start_time}
                    disabled={d.is_off}
                    onChange={(e) => patch(d.day_of_week, { start_time: e.target.value })}
                  />
                  <span>a</span>
                  <input
                    type="time"
                    value={d.end_time}
                    disabled={d.is_off}
                    onChange={(e) => patch(d.day_of_week, { end_time: e.target.value })}
                  />
                </div>

                <div className="avail-buffer" style={{ opacity: d.is_off ? 0.4 : 1 }}>
                  <input
                    type="number"
                    min={0}
                    value={d.buffer_minutes}
                    disabled={d.is_off}
                    onChange={(e) =>
                      patch(d.day_of_week, { buffer_minutes: Number(e.target.value) || 0 })
                    }
                  />
                  <span>min búfer</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar horario'}
            </button>
          </div>
        </>
      )}

      <hr className="divider" style={{ margin: '28px 0' }} />

      {/* Descansos recurrentes */}
      <h2 className="admin__section-title">Descansos recurrentes</h2>
      <p className="admin__subtitle" style={{ marginBottom: 14 }}>
        Bloquea un rango de horas en un día de la semana (por ejemplo, lunes de 1:00 a 3:00 pm).
      </p>
      <BreaksEditor />

      <hr className="divider" style={{ margin: '28px 0' }} />

      {/* Días bloqueados */}
      <h2 className="admin__section-title">Días bloqueados</h2>
      <p className="admin__subtitle" style={{ marginBottom: 14 }}>
        Bloquea una fecha concreta sin cambiar el resto del horario semanal.
      </p>
      <BlockedCalendar />
    </div>
  )
}
