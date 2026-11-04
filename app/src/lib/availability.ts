import { supabase } from './supabase'

export interface AvailabilityDay {
  day_of_week: number
  start_time: string
  end_time: string
  buffer_minutes: number
  is_off: boolean
}

export const DAY_NAMES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo'
]

function toHHMM(t: string) {
  return String(t).slice(0, 5)
}

export async function fetchAvailability(): Promise<AvailabilityDay[]> {
  const { data, error } = await supabase
    .from('availability')
    .select('day_of_week, start_time, end_time, buffer_minutes, is_off')
    .order('day_of_week')

  if (error) throw error

  const map = new Map<number, AvailabilityDay>()
  for (const row of data ?? []) {
    map.set(row.day_of_week, {
      day_of_week: row.day_of_week,
      start_time: toHHMM(row.start_time),
      end_time: toHHMM(row.end_time),
      buffer_minutes: row.buffer_minutes ?? 0,
      is_off: row.is_off
    })
  }

  return Array.from({ length: 7 }, (_, i) => {
    const dw = i + 1
    return (
      map.get(dw) ?? {
        day_of_week: dw,
        start_time: '09:00',
        end_time: '18:00',
        buffer_minutes: 10,
        is_off: true
      }
    )
  })
}

export async function saveAvailability(days: AvailabilityDay[]) {
  const payload = days.map((d) => ({
    day_of_week: d.day_of_week,
    start_time: d.start_time,
    end_time: d.end_time,
    buffer_minutes: d.buffer_minutes,
    is_off: d.is_off
  }))

  const { error } = await supabase
    .from('availability')
    .upsert(payload, { onConflict: 'day_of_week' })

  if (error) throw error
}
