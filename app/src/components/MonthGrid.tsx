import { useMemo } from 'react'
import '../lib/calendar.css'

interface MonthGridProps {
  month: Date
  onPrev: () => void
  onNext: () => void
  selected?: string | null
  onDayClick: (day: string) => void
  isDisabled?: (day: string) => boolean
  isMarked?: (day: string) => boolean
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function MonthGrid({
  month,
  onPrev,
  onNext,
  selected,
  onDayClick,
  isDisabled,
  isMarked
}: MonthGridProps) {
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7
    const start = new Date(first)
    start.setDate(first.getDate() - offset)

    const out: { date: Date; iso: string; inMonth: boolean }[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      out.push({ date: d, iso: toISO(d), inMonth: d.getMonth() === month.getMonth() })
    }
    return out
  }, [month])

  const label = new Intl.DateTimeFormat('es-DO', {
    month: 'long',
    year: 'numeric'
  }).format(month)

  return (
    <div className="cal">
      <div className="cal__head">
        <button type="button" className="cal__nav" onClick={onPrev} aria-label="Mes anterior">
          ‹
        </button>
        <span className="cal__label">{label}</span>
        <button type="button" className="cal__nav" onClick={onNext} aria-label="Mes siguiente">
          ›
        </button>
      </div>

      <div className="cal__weekdays">
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      <div className="cal__grid">
        {cells.map((c) => {
          const disabled = !c.inMonth || (isDisabled?.(c.iso) ?? false)
          const marked = isMarked?.(c.iso) ?? false
          const sel = selected === c.iso
          return (
            <button
              key={c.iso}
              type="button"
              disabled={disabled}
              className={
                'cal__day' +
                (c.inMonth ? '' : ' cal__day--out') +
                (marked ? ' is-marked' : '') +
                (sel ? ' is-selected' : '')
              }
              onClick={() => onDayClick(c.iso)}
            >
              {c.date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
