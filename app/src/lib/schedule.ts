import { supabase } from './supabase'

export interface RecurringBreak {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
}

export interface BreakDraft {
  day_of_week: number
  start_time: string
  end_time: string
}

export async function fetchBreaks(): Promise<RecurringBreak[]> {
  const { data, error } = await supabase
    .from('availability_breaks')
    .select('id, day_of_week, start_time, end_time')
    .order('day_of_week')

  if (error) throw error

  return (data ?? []).map((b) => ({
    id: b.id,
    day_of_week: b.day_of_week,
    start_time: String(b.start_time).slice(0, 5),
    end_time: String(b.end_time).slice(0, 5)
  }))
}

/** Reemplaza todos los descansos por el conjunto actual (solo admin). */
export async function replaceBreaks(breaks: BreakDraft[]) {
  const { error: delError } = await supabase
    .from('availability_breaks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (delError) throw delError

  if (breaks.length > 0) {
    const { error } = await supabase.from('availability_breaks').insert(
      breaks.map((b) => ({
        day_of_week: b.day_of_week,
        start_time: b.start_time,
        end_time: b.end_time
      }))
    )
    if (error) throw error
  }
}

export async function fetchBlockedDays(): Promise<string[]> {
  const { data, error } = await supabase.from('blocked_days').select('day').order('day')
  if (error) throw error
  return (data ?? []).map((r) => String(r.day))
}

export async function setBlockedDay(day: string, block: boolean) {
  if (block) {
    const { error } = await supabase
      .from('blocked_days')
      .upsert({ day }, { onConflict: 'day' })
    if (error) throw error
  } else {
    const { error } = await supabase.from('blocked_days').delete().eq('day', day)
    if (error) throw error
  }
}
