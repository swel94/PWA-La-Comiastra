import { useEffect, useState } from 'react'
import {
  adjustStock,
  createProduct,
  deleteProduct,
  fetchProducts,
  isLowStock,
  profitOf,
  updateProduct,
  type Product
} from '../../lib/products'

interface ProductForm {
  name: string
  category: string
  supplier: string
  unit: string
  cost: string
  sell: string
  lowStock: string
  isActive: boolean
  initialQty: string
}

const EMPTY_FORM: ProductForm = {
  name: '',
  category: '',
  supplier: '',
  unit: 'unidad',
  cost: '0',
  sell: '0',
  lowStock: '0',
  isActive: true,
  initialQty: '0'
}

function money(n: number) {
  return `RD$ ${n.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export default function InventoryAdmin() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const [productOpen, setProductOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [stockType, setStockType] = useState<'in' | 'out'>('in')
  const [stockQty, setStockQty] = useState('1')
  const [stockReason, setStockReason] = useState('')

  async function load() {
    setLoading(true)
    try {
      setProducts(await fetchProducts())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los productos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function flash(msg: string) {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 3000)
  }

  const filtered = products.filter((p) => {
    const hay = `${p.name} ${p.category ?? ''} ${p.sku ?? ''}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })

  function openNew() {
    setForm({ ...EMPTY_FORM })
    setEditingId(null)
    setError(null)
    setProductOpen(true)
  }

  function openEdit(p: Product) {
    setForm({
      name: p.name,
      category: p.category ?? '',
      supplier: p.supplier ?? '',
      unit: p.unit,
      cost: String(p.cost_price),
      sell: String(p.sell_price),
      lowStock: String(p.low_stock_threshold),
      isActive: p.is_active,
      initialQty: '0'
    })
    setEditingId(p.id)
    setError(null)
    setProductOpen(true)
  }

  async function saveProduct() {
    setError(null)
    if (!form.name.trim()) {
      setError('El nombre del producto es obligatorio.')
      return
    }

    const input = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      supplier: form.supplier.trim() || null,
      unit: form.unit.trim() || 'unidad',
      cost_price: Number(form.cost) || 0,
      sell_price: Number(form.sell) || 0,
      low_stock_threshold: Number(form.lowStock) || 0,
      is_active: form.isActive
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateProduct(editingId, input)
        flash('Producto actualizado.')
      } else {
        await createProduct(input, Number(form.initialQty) || 0)
        flash('Producto creado.')
      }
      setProductOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(p: Product) {
    if (!window.confirm(`¿Eliminar el producto "${p.name}"? Se borrará su historial de movimientos.`))
      return
    try {
      await deleteProduct(p.id)
      flash('Producto eliminado.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el producto.')
    }
  }

  function openStock(p: Product) {
    setStockProduct(p)
    setStockType('in')
    setStockQty('1')
    setStockReason('')
    setError(null)
  }

  async function applyStock() {
    if (!stockProduct) return
    const qty = Number(stockQty)
    if (!qty || qty <= 0) {
      setError('La cantidad debe ser mayor a 0.')
      return
    }
    if (stockType === 'out' && qty > stockProduct.quantity_on_hand) {
      setError('No puedes quitar más de lo que hay en stock.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await adjustStock(stockProduct.id, stockType === 'in' ? qty : -qty, stockReason)
      flash('Stock actualizado.')
      setStockProduct(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el stock.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Inventario</h1>
          <p className="admin__subtitle">
            Controla tus productos, su costo, precio de venta, ganancia y existencias.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ maxWidth: 220 }}
            placeholder="Buscar producto…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn btn-primary" onClick={openNew}>
            + Nuevo producto
          </button>
        </div>
      </div>

      {notice && <p className="admin__notice">{notice}</p>}
      {error && !productOpen && !stockProduct && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Cargando productos…</p>
      ) : filtered.length === 0 ? (
        <p className="muted">No hay productos. Crea el primero con “Nuevo producto”.</p>
      ) : (
        <div className="prod-list">
          {filtered.map((p) => (
            <div className="prod-row" key={p.id}>
              <div className="prod-main">
                <div className="prod-name">{p.name}</div>
                <div className="svc-meta">
                  {p.category || 'Sin categoría'}
                  {p.sku ? ` · ${p.sku}` : ''}
                </div>
              </div>

              <div className="prod-num">
                <span className="muted">Costo</span>
                <b>{money(p.cost_price)}</b>
              </div>
              <div className="prod-num">
                <span className="muted">Venta</span>
                <b>{money(p.sell_price)}</b>
              </div>
              <div className="prod-num">
                <span className="muted">Ganancia</span>
                <b>{money(profitOf(p))}</b>
              </div>

              <div className="prod-qty">
                <b>{p.quantity_on_hand}</b>
                {isLowStock(p) && <span className="svc-off">Stock bajo</span>}
              </div>

              <div className="prod-actions">
                <button className="btn btn-soft" onClick={() => openStock(p)}>
                  Stock
                </button>
                <button className="btn btn-soft" onClick={() => openEdit(p)}>
                  Editar
                </button>
                <button className="btn btn-ghost" onClick={() => remove(p)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {productOpen && (
        <div className="modal-backdrop" onClick={() => setProductOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Editar producto' : 'Nuevo producto'}</h2>

            <label className="label">Nombre</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            {editingId && (
              <p className="muted" style={{ margin: '0 0 10px' }}>
                Código: <b>{products.find((p) => p.id === editingId)?.sku ?? '—'}</b> · se asigna
                automáticamente
              </p>
            )}

            <label className="label">Categoría</label>
            <input
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />

            <div className="modal__row">
              <div>
                <label className="label">Proveedor</label>
                <input
                  className="input"
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Unidad de medida</label>
                <input
                  className="input"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="frasco, unidad, caja…"
                />
              </div>
            </div>

            <div className="modal__row">
              <div>
                <label className="label">Costo (RD$)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Precio de venta (RD$)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.sell}
                  onChange={(e) => setForm({ ...form, sell: e.target.value })}
                />
              </div>
            </div>

            <div className="modal__row">
              <div>
                <label className="label">Umbral de stock bajo</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.lowStock}
                  onChange={(e) => setForm({ ...form, lowStock: e.target.value })}
                />
              </div>
              {!editingId && (
                <div>
                  <label className="label">Cantidad inicial (stock de apertura)</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={form.initialQty}
                    onChange={(e) => setForm({ ...form, initialQty: e.target.value })}
                  />
                </div>
              )}
            </div>

            {!editingId && (
              <p className="muted" style={{ margin: '-2px 0 6px' }}>
                Cuántas unidades tienes al crear el producto. Luego se ajusta con “Stock”.
              </p>
            )}

            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Producto activo
            </label>

            <p className="muted" style={{ marginTop: 8 }}>
              Ganancia por unidad: <b>{money((Number(form.sell) || 0) - (Number(form.cost) || 0))}</b>
            </p>

            {error && productOpen && <p className="error">{error}</p>}

            <div className="modal__actions">
              <button className="btn btn-soft" onClick={() => setProductOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={saveProduct} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {stockProduct && (
        <div className="modal-backdrop" onClick={() => setStockProduct(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Stock · {stockProduct.name}</h2>
            <p className="muted">
              Actual: <b>{stockProduct.quantity_on_hand}</b> {stockProduct.unit}
            </p>

            <div className="b-toggle">
              <button
                type="button"
                className={stockType === 'in' ? 'on' : ''}
                onClick={() => setStockType('in')}
              >
                Entrada
              </button>
              <button
                type="button"
                className={stockType === 'out' ? 'on' : ''}
                onClick={() => setStockType('out')}
              >
                Salida
              </button>
            </div>

            <label className="label">Cantidad</label>
            <input
              className="input"
              type="number"
              min={1}
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
            />

            <label className="label">Motivo (opcional)</label>
            <input
              className="input"
              value={stockReason}
              onChange={(e) => setStockReason(e.target.value)}
              placeholder="Compra, consumo, ajuste…"
            />

            {error && stockProduct && <p className="error">{error}</p>}

            <div className="modal__actions">
              <button className="btn btn-soft" onClick={() => setStockProduct(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={applyStock} disabled={saving}>
                {saving ? 'Aplicando…' : 'Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
