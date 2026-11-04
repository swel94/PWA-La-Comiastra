import { supabase } from './supabase'

export interface Service {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  category: string | null
  is_active: boolean
  image_url: string | null
}

export interface ServiceWithPrice extends Service {
  internal_price: number
}

const SERVICE_FIELDS =
  'id, name, description, duration_minutes, category, is_active, image_url'

/** Servicios activos (público / landing). */
export async function fetchActiveServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_FIELDS)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as Service[]
}

/** Todos los servicios + precio interno (solo admin). */
export async function fetchServicesForAdmin(): Promise<ServiceWithPrice[]> {
  const [svcs, prices] = await Promise.all([
    supabase.from('services').select(SERVICE_FIELDS).order('created_at', { ascending: true }),
    supabase.from('service_pricing').select('service_id, internal_price')
  ])

  if (svcs.error) throw svcs.error
  if (prices.error) throw prices.error

  const priceMap = new Map<string, number>(
    (prices.data ?? []).map((p) => [p.service_id as string, Number(p.internal_price)])
  )

  return (svcs.data ?? []).map((s) => ({
    ...(s as Service),
    internal_price: priceMap.get((s as Service).id) ?? 0
  }))
}

/** Sube una imagen al bucket y devuelve su URL pública. */
export async function uploadServiceImage(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from('service-images')
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })

  if (error) throw error

  const { data } = supabase.storage.from('service-images').getPublicUrl(path)
  return data.publicUrl
}
