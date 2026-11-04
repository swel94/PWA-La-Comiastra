import { supabase } from './supabase'

export interface AppointmentRow {
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

export interface MyAppointment {
  id: string
  start_at: string
  end_at: string
  status: string
  services: string[]
}

const SELECT =
  'id,start_at,end_at,status,reminder_sent_at,customer_id,customers(id,profiles(full_name,phone)),appointment_services(services(name))'

function mapRow(row: any): AppointmentRow {
  const services: string[] = (row.appointment_services ?? [])
    .map((as: any) => as.services?.name)
    .filter((n: unknown): n is string => Boolean(n))

  return {
    id: row.id,
    start_at: row.start_at,
    end_at: row.end_at,
    status: row.status,
    reminder_sent_at: row.reminder_sent_at ?? null,
    customer_id: row.customer_id,
    customer_name: row.customers?.profiles?.full_name ?? 'Cliente',
    customer_phone: row.customers?.profiles?.phone ?? '',
    services
  }
}

export async function fetchAppointmentsRange(
  fromISO: string,
  toISO: string
): Promise<AppointmentRow[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(SELECT)
    .gte('start_at', fromISO)
    .lt('start_at', toISO)
    .order('start_at', { ascending: true })

  if (error) throw error
  return (data ?? []).map(mapRow)
}

export async function markReminderSent(appointmentId: string) {
  const { error } = await supabase
    .from('appointments')
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq('id', appointmentId)
  if (error) throw error
}

/** Citas del cliente autenticado (RLS filtra por su propio perfil). */
export async function fetchMyAppointments(): Promise<MyAppointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('id,start_at,end_at,status,appointment_services(services(name))')
    .order('start_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.id,
    start_at: row.start_at,
    end_at: row.end_at,
    status: row.status,
    services: (row.appointment_services ?? [])
      .map((as: any) => as.services?.name)
      .filter((n: unknown): n is string => Boolean(n))
  }))
}

export async function cancelMyAppointment(appointmentId: string) {
  const { error } = await supabase.rpc('cancel_booking', {
    p_appointment_id: appointmentId,
    p_reason: 'Cancelada por el cliente'
  })
  if (error) throw error
}

export async function deleteAppointment(appointmentId: string) {
  const { error } = await supabase.from('appointments').delete().eq('id', appointmentId)
  if (error) throw error
}
