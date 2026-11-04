import { supabase } from './supabase'

export interface EarningsTotals {
  service_revenue: number
  product_revenue: number
  product_profit: number
  completed_count: number
}

export interface DailyEarning {
  day: string
  service_revenue: number
  product_revenue: number
  product_profit: number
}

export async function fetchEarnings(fromISO: string, toISO: string): Promise<EarningsTotals> {
  const { data, error } = await supabase.rpc('get_earnings', { p_from: fromISO, p_to: toISO })
  if (error) throw error

  const r = (data ?? [])[0] ?? {}
  return {
    service_revenue: Number(r.service_revenue ?? 0),
    product_revenue: Number(r.product_revenue ?? 0),
    product_profit: Number(r.product_profit ?? 0),
    completed_count: Number(r.completed_count ?? 0)
  }
}

export async function fetchEarningsDaily(
  fromISO: string,
  toISO: string
): Promise<DailyEarning[]> {
  const { data, error } = await supabase.rpc('get_earnings_daily', {
    p_from: fromISO,
    p_to: toISO
  })
  if (error) throw error

  return (data ?? []).map((r: any) => ({
    day: r.day,
    service_revenue: Number(r.service_revenue ?? 0),
    product_revenue: Number(r.product_revenue ?? 0),
    product_profit: Number(r.product_profit ?? 0)
  }))
}
