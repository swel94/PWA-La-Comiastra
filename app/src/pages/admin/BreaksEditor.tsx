import { useEffect, useState } from 'react'
import { DAY_NAMES } from '../../lib/availability'
import { fetchBreaks, replaceBreaks, type BreakDraft } from '../../lib/schedule'

export default function BreaksEditor() {
  const [drafts, setDrafts] = useState<BreakDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBreaks()
      .then((rows) =>
        setDrafts(
          rows.map((r) => ({
            day_of_week: r.day_of_week,
            start_time: r.start_time,
            end_time: r.end_time
          }))
        )
      )
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudieron cargar los descansos.'))
      .finally(() => setLoading(false))
  }, [])

  function add() {
    setDrafts((list) => [...list, { day_of_week: 1, start_time: '13:00', end_time: '14:00' }])
  }

  function remove(index: number) {
    setDrafts((list) => list.filter((_, i) => i !== index))
  }

  function patch(index: number, p: Partial<BreakDraft>) {
    setDrafts((list) => list.map((d, i) => (i === index ? { ...d, ...p } : d)))
  }

  async function save() {
    setError(null)
    for (const d of drafts) {
      if (d.end_time <= d.start_time) {
        setError(
          `El descanso de ${DAY_NAMES[d.day_of_week - 1].toLowerCase()} no es válido: la hora final debe ser mayor.`
        )
        return
      }
    }
    setSaving(true)
    try {
      await replaceBreaks(drafts)
      setNotice('Descansos guardados.')
      window.setTimeout(() => setNotice(null), 3500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar los descansos.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="muted">Cargando descansos…</p>

  return (
    <div>
      {notice && <p className="admin__notice">{notice}</p>}
      {error && <p className="error">{error}</p>}

      {drafts.length === 0 ? (
        <p className="muted">No hay descansos configurados.</p>
      ) : (
        <div className="break-list">
          {drafts.map((d, i) => (
            <div className="break-row" key={i}>
              <select
                className="input"
                value={d.day_of_week}
                onChange={(e) => patch(i, { day_of_week: Number(e.target.value) })}
              >
                {DAY_NAMES.map((n, idx) => (
                  <option key={idx} value={idx + 1}>
                    {n}
                  </option>
                ))}
              </select>

              <input
                className="input"
                type="time"
                value={d.start_time}
                onChange={(e) => patch(i, { start_time: e.target.value })}
              />
              <span className="muted">a</span>
              <input
                className="input"
                type="time"
                value={d.end_time}
                onChange={(e) => patch(i, { end_time: e.target.value })}
              />

              <button type="button" className="btn btn-ghost" onClick={() => remove(i)}>
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <button className="btn btn-soft" onClick={add}>
          + Agregar descanso
        </button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar descansos'}
        </button>
      </div>
    </div>
  )
}
