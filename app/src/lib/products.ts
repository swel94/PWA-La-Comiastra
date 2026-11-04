import { supabase } from './supabase'

export interface Product {
  id: string
  name: string
  sku: string | null
  category: string | null
  supplier: string | null
  unit: string
  cost_price: number
  sell_price: number
  quantity_on_hand: number
  low_stock_threshold: number
  is_active: boolean
}

export interface ProductInput {
  name: string
  category: string | null
  supplier: string | null
  unit: string
  cost_price: number
  sell_price: number
  low_stock_threshold: number
  is_active: boolean
}

function mapProduct(r: any): Product {
  return {
    id: r.id,
    name: r.name,
    sku: r.sku,
    category: r.category,
    supplier: r.supplier,
    unit: r.unit ?? 'unidad',
    cost_price: Number(r.cost_price ?? 0),
    sell_price: Number(r.sell_price ?? 0),
    quantity_on_hand: Number(r.quantity_on_hand ?? 0),
    low_stock_threshold: Number(r.low_stock_threshold ?? 0),
    is_active: r.is_active
  }
}

export function profitOf(p: Product) {
  return p.sell_price - p.cost_price
}

export function isLowStock(p: Product) {
  return p.quantity_on_hand <= p.low_stock_threshold
}

function newSku() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `PROD-${s}`
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapProduct)
}

export async function createProduct(input: ProductInput, initialQuantity: number) {
  let data: { id: string } | null = null

  // El SKU se genera automáticamente y se reintenta si colisiona (unique).
  for (let attempt = 0; attempt < 5 && !data; attempt++) {
    const res = await supabase
      .from('products')
      .insert({ ...input, sku: newSku(), quantity_on_hand: 0 })
      .select('id')
      .single()

    if (res.error) {
      if (res.error.code === '23505') continue
      throw res.error
    }
    data = res.data
  }

  if (!data) throw new Error('No se pudo generar un código único para el producto.')

  if (initialQuantity > 0) {
    const { error: txnError } = await supabase.from('inventory_transactions').insert({
      product_id: data.id,
      type: 'in',
      quantity_delta: initialQuantity,
      reason: 'Stock inicial'
    })
    if (txnError) throw txnError
  }
}

export async function updateProduct(id: string, input: ProductInput) {
  const { error } = await supabase.from('products').update(input).eq('id', id)
  if (error) throw error
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function adjustStock(productId: string, delta: number, reason: string) {
  if (!delta) return
  const { error } = await supabase.from('inventory_transactions').insert({
    product_id: productId,
    type: delta > 0 ? 'in' : 'out',
    quantity_delta: delta,
    reason: reason.trim() || null
  })
  if (error) throw error
}
