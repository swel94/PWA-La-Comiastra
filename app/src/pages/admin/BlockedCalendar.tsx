import { useEffect, useState } from 'react'
import MonthGrid from '../../components/MonthGrid'
import { fetchBlockedDays, setBlockedDay } from '../../lib/schedule'

export default function BlockedCalendar() {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [blocked, setBlocked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBlockedDays()
      .then((rows) => setBlocked(new Set(rows)))
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'No se pudieron cargar los días bloqueados.')
      )
      .finally(() => setLoading(false))
  }, [])

  async function toggle(day: string) {
    setError(null)
    const isBlocked = blocked.has(day)
    try {
      await setBlockedDay(day, !isBlocked)
      setBlocked((prev) => {
        const next = new Set(prev)
        if (isBlocked) next.delete(day)
        else next.add(day)
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el día.')
    }
  }

  if (loading) return <p className="muted">Cargando…</p>

  return (
    <div>
      {error && <p className="error">{error}</p>}
      <MonthGrid
        month={month}
        onPrev={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
        onNext={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
        onDayClick={toggle}
        isMarked={(d) => blocked.has(d)}
      />
      <p className="muted" style={{ marginTop: 10 }}>
        Toca un día para bloquearlo o desbloquearlo. Los días bloqueados no ofrecen horarios.
      </p>
    </div>
  )
}
