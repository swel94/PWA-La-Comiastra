import type { ClinicalField } from '../lib/clinicalFields'

interface ClinicalValue {
  respuesta: string
  detalle: string
}

interface ClinicalFormProps {
  fields: ClinicalField[]
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

function objValue(v: unknown): ClinicalValue {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>
    return { respuesta: (o.respuesta as string) ?? '', detalle: (o.detalle as string) ?? '' }
  }
  if (typeof v === 'string') return { respuesta: v, detalle: '' }
  return { respuesta: '', detalle: '' }
}

export default function ClinicalForm({ fields, value, onChange }: ClinicalFormProps) {
  function set(key: string, v: unknown) {
    onChange({ ...value, [key]: v })
  }

  if (fields.length === 0) {
    return <p className="muted">No hay preguntas configuradas en la ficha clínica.</p>
  }

  return (
    <div className="clin-grid">
      {fields.map((f) => {
        if (f.type === 'multi') {
          const arr = Array.isArray(value[f.key]) ? (value[f.key] as string[]) : []
          return (
            <div className="clin-field" key={f.key}>
              <label>
                {f.label}
                {f.required ? ' *' : ''}
              </label>
              <div className="clin-checks">
                {f.options.map((o) => (
                  <label key={o.value} className="clin-check">
                    <input
                      type="checkbox"
                      checked={arr.includes(o.value)}
                      onChange={(e) =>
                        set(
                          f.key,
                          e.target.checked ? [...arr, o.value] : arr.filter((x) => x !== o.value)
                        )
                      }
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          )
        }

        if (f.type === 'select_text') {
          const cur = objValue(value[f.key])
          const showDetail =
            cur.respuesta !== '' &&
            (f.detail_when.length === 0 || f.detail_when.includes(cur.respuesta))

          return (
            <div className="clin-field" key={f.key}>
              <label>
                {f.label}
                {f.required ? ' *' : ''}
              </label>
              <select
                value={cur.respuesta}
                onChange={(e) => set(f.key, { respuesta: e.target.value, detalle: cur.detalle })}
              >
                <option value="">—</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {showDetail && (
                <textarea
                  rows={2}
                  value={cur.detalle}
                  placeholder={f.placeholder ?? 'Detalle'}
                  onChange={(e) => set(f.key, { respuesta: cur.respuesta, detalle: e.target.value })}
                />
              )}
            </div>
          )
        }

        return (
          <div className="clin-field" key={f.key}>
            <label>
              {f.label}
              {f.required ? ' *' : ''}
            </label>
            <select
              value={(value[f.key] as string) ?? ''}
              onChange={(e) => set(f.key, e.target.value)}
            >
              <option value="">—</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )
      })}
    </div>
  )
}
