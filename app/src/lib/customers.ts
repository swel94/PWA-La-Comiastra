import { supabase } from './supabase'

export interface CustomerListItem {
  id: string
  profile_id: string
  full_name: string
  phone: string
  email: string
  age: number | null
  sex: string | null
  occupation: string | null
  motivo_visita: string[] | null
  clinical: Record<string, unknown> | null
  admin_notes: string | null
  created_at: string
}

const SELECT =
  'id, profile_id, age, sex, occupation, motivo_visita, clinical, admin_notes, created_at, profiles(full_name, phone, email)'

function flatten(row: any): CustomerListItem {
  const p = row.profiles ?? {}
  return {
    id: row.id,
    profile_id: row.profile_id,
    full_name: p.full_name ?? '',
    phone: p.phone ?? '',
    email: p.email ?? '',
    age: row.age,
    sex: row.sex,
    occupation: row.occupation,
    motivo_visita: row.motivo_visita,
    clinical: row.clinical,
    admin_notes: row.admin_notes,
    created_at: row.created_at
  }
}

export async function fetchCustomers(): Promise<CustomerListItem[]> {
  const { data, error } = await supabase
    .from('customers')
    .select(SELECT)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(flatten)
}

export async function fetchCustomer(id: string): Promise<CustomerListItem | null> {
  const { data, error } = await supabase.from('customers').select(SELECT).eq('id', id).maybeSingle()

  if (error) throw error
  return data ? flatten(data) : null
}

export interface CustomerEdit {
  full_name: string
  phone: string
  age: number | null
  sex: string | null
  occupation: string | null
  motivo_visita: string[]
  clinical: Record<string, unknown>
  admin_notes: string | null
}

export async function updateCustomer(customer: CustomerListItem, fields: CustomerEdit) {
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: fields.full_name, phone: fields.phone })
    .eq('id', customer.profile_id)

  if (profileError) throw profileError

  const { error: customerError } = await supabase
    .from('customers')
    .update({
      age: fields.age,
      sex: fields.sex,
      occupation: fields.occupation,
      motivo_visita: fields.motivo_visita,
      clinical: fields.clinical,
      admin_notes: fields.admin_notes
    })
    .eq('id', customer.id)

  if (customerError) throw customerError
}

export async function deleteCustomer(id: string) {
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw error
}

export async function customerExistsByEmail(email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('customer_exists_for_email', { p_email: email })
  if (error) throw error
  return Boolean(data)
}
