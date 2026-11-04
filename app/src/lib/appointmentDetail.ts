import { supabase } from './supabase'
import type { Product } from './products'

export interface AppointmentDetail {
  id: string
  start_at: string
  end_at: string
  status: string
  reminder_sent_at: string | null
  customer_id: string
  customer_name: string
  customer_phone: string
  services: string[]
}

const APPT_SELECT =
  'id,start_at,end_at,status,reminder_sent_at,customer_id,customers(id,profiles(full_name,phone)),appointment_services(services(name))'

export async function fetchAppointmentDetail(id: string): Promise<AppointmentDetail | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select(APPT_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as any
  return {
    id: row.id,
    start_at: row.start_at,
    end_at: row.end_at,
    status: row.status,
    reminder_sent_at: row.reminder_sent_at,
    customer_id: row.customer_id,
    customer_name: row.customers?.profiles?.full_name ?? 'Cliente',
    customer_phone: row.customers?.profiles?.phone ?? '',
    services: (row.appointment_services ?? [])
      .map((as: any) => as.services?.name)
      .filter((n: unknown): n is string => Boolean(n))
  }
}

export async function updateAppointmentStatus(id: string, status: string) {
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
  if (error) throw error
}

/* ---------------- Notes ---------------- */

export interface NoteRow {
  id: string
  content: string
  note_type: string
  created_at: string
}

export async function fetchNotes(appointmentId: string): Promise<NoteRow[]> {
  const { data, error } = await supabase
    .from('appointment_notes')
    .select('id,content,note_type,created_at')
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as NoteRow[]
}

export async function addNote(appointmentId: string, content: string) {
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

  const { error } = await supabase.from('appointment_notes').insert({
    appointment_id: appointmentId,
    author_id: profile.id,
    content,
    note_type: 'general'
  })

  if (error) throw error
}

/* ---------------- Sales ---------------- */

export interface SaleRow {
  id: string
  product_id: string
  product_name: string
  quantity: number
  sell_price_at_sale: number
  cost_at_sale: number
}

export async function fetchSales(appointmentId: string): Promise<SaleRow[]> {
  const { data, error } = await supabase
    .from('sale_items')
    .select('id,product_id,quantity,sell_price_at_sale,cost_at_sale,products(name)')
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((r: any) => ({
    id: r.id,
    product_id: r.product_id,
    product_name: r.products?.name ?? 'Producto',
    quantity: Number(r.quantity),
    sell_price_at_sale: Number(r.sell_price_at_sale),
    cost_at_sale: Number(r.cost_at_sale)
  }))
}

export async function addSale(appointmentId: string, product: Product, quantity: number) {
  const { error } = await supabase.from('sale_items').insert({
    appointment_id: appointmentId,
    product_id: product.id,
    quantity,
    sell_price_at_sale: product.sell_price,
    cost_at_sale: product.cost_price
  })

  if (error) throw error
}

export async function removeSale(sale: SaleRow, appointmentId: string) {
  const { error } = await supabase.from('sale_items').delete().eq('id', sale.id)
  if (error) throw error

  // Restaura el inventario de la venta eliminada (movimiento de entrada).
  const { error: txnError } = await supabase.from('inventory_transactions').insert({
    product_id: sale.product_id,
    type: 'in',
    quantity_delta: sale.quantity,
    reason: 'Venta eliminada',
    appointment_id: appointmentId
  })
  if (txnError) throw txnError
}
