import { supabase } from './supabase'

export type ClinicalFieldType = 'select' | 'select_text' | 'multi'

export interface ClinicalOption {
  value: string
  label: string
}

export interface ClinicalField {
  id: string
  key: string
  label: string
  type: ClinicalFieldType
  options: ClinicalOption[]
  detail_when: string[]
  placeholder: string | null
  required: boolean
  sort_order: number
  is_active: boolean
}

export interface ClinicalFieldInput {
  key: string
  label: string
  type: ClinicalFieldType
  options: ClinicalOption[]
  detail_when: string[]
  placeholder: string | null
  required: boolean
  sort_order: number
  is_active: boolean
}

function normalize(row: any): ClinicalField {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    type: row.type,
    options: (row.options ?? []) as ClinicalOption[],
    detail_when: (row.detail_when ?? []) as string[],
    placeholder: row.placeholder,
    required: row.required,
    sort_order: row.sort_order,
    is_active: row.is_active
  }
}

export async function fetchClinicalFields(): Promise<ClinicalField[]> {
  const { data, error } = await supabase
    .from('clinical_fields')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []).map(normalize)
}

export async function fetchAllClinicalFields(): Promise<ClinicalField[]> {
  const { data, error } = await supabase
    .from('clinical_fields')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []).map(normalize)
}

export async function createClinicalField(input: ClinicalFieldInput) {
  const { error } = await supabase.from('clinical_fields').insert(input)
  if (error) throw error
}

export async function updateClinicalField(id: string, patch: Partial<ClinicalFieldInput>) {
  const { error } = await supabase.from('clinical_fields').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteClinicalField(id: string) {
  const { error } = await supabase.from('clinical_fields').delete().eq('id', id)
  if (error) throw error
}

/** Devuelve la respuesta (string) de un valor clínico. */
export function responseOf(v: unknown): string {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return ((v as Record<string, unknown>).respuesta as string) ?? ''
  }
  if (typeof v === 'string') return v
  return ''
}

export function slugifyKey(label: string): string {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)

  const rand = Math.random().toString(36).slice(2, 6)
  return `${base || 'campo'}_${rand}`
}
