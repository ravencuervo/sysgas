import { useCallback, useEffect, useState } from 'react'
import { db } from '../lib/supabase'
import { friendlyError, cylinderStates } from '../lib/forms'

export default function CompanyInventory({ profile }) {
  const [companies, setCompanies] = useState([])
  const [company, setCompany] = useState(profile.empresa_id || '')
  const [items, setItems] = useState([])
  const [physical,setPhysical] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setBusy(true); setError(''); setItems([])
    try {
      const { data: companies, error: companyError } = await db().from('empresas_distribuidoras').select('id,razon_social').eq('estado','activo')
      if (companyError) throw companyError
      setCompanies(companies)
      if (!company) return
      const [{ data: catalog, error: catalogError }, { data: inventory, error }, summary] = await Promise.all([
        db().from('productos_catalogo').select('capacidad,nombre_comercial,precio_venta_pen').order('peso_neto_gas_kg'),
        db().from('inventario_empresa').select('capacidad,precio_pen,stock,activo').eq('empresa_id',company),
        db().rpc('resumen_inventario',{p_empresa:company}),
      ])
      if (catalogError || error || summary.error) throw catalogError || error || summary.error
      setPhysical(summary.data)
      setItems(catalog.map(p => ({ ...p, ...inventory.find(i => i.capacidad === p.capacidad) })))
    } catch(e) { setError(friendlyError(e)) } finally { setBusy(false) }
  }, [company])
  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])
  async function save(e, capacity) {
    e.preventDefault()
    if (busy) return
    const fields = Object.fromEntries(new FormData(e.currentTarget))
    setBusy(true); setError(''); setMessage('')
    try {
      const { error } = await db().rpc('guardar_inventario', { p_empresa:company,p_capacidad:capacity,
        p_precio:Number(fields.price),p_stock:Number(fields.stock),p_activo:fields.active==='on' })
      if(error) throw error
      setMessage(`Producto de ${capacity} actualizado.`)
      await load()
    } catch(e) { setError(friendlyError(e)) } finally { setBusy(false) }
  }
  return <section className="inventory"><div className="panel__header"><div><h2>Precios e inventario</h2><p>Administra los balones disponibles para tus clientes.</p></div><span className="dash-tag">POR DISTRIBUIDORA</span></div>
    <label className="inventory__company">Distribuidora<select value={company} disabled={busy} onChange={e => { setCompany(e.target.value); setMessage('') }}><option value="">Selecciona una empresa</option>{companies.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}</select></label>
    <p className="panel__hint">El stock representa unidades disponibles. Cada pedido reserva una unidad; al cancelarlo se devuelve. Las correcciones manuales reemplazan el saldo actual. El conteo físico por estado se obtiene de los balones registrados y puede diferir mientras hay reservas o ajustes.</p>
    {error && <p role="alert" className="panel__notice">{error}</p>}{message && <p role="status" className="dash-success">{message}</p>}
    {busy && <p role="status">Actualizando inventario…</p>}
    {!busy && !company && <div className="panel__empty">Elige una distribuidora para gestionar sus productos.</div>}
    {!busy && company && !error && !items.length && <p>No hay productos en el catálogo general. El administrador debe configurar el catálogo antes de registrar precios.</p>}
    <div className="inventory__grid">{!busy && items.map(item => <form key={`${company}-${item.capacidad}`} className="inventory__card" onSubmit={e => save(e,item.capacidad)}>
      <div className="inventory__visual"><i className="bi bi-fire" /><strong>{item.capacidad.replace('kg',' kg')}</strong><span>{item.nombre_comercial}</span></div>
      <div className="inventory__physical"><strong>Balones físicos registrados</strong>{physical.filter(p=>p.capacidad===item.capacidad).map(p=><p key={p.estado}>{cylinderStates[p.estado] || p.estado}: <b>{p.cantidad}</b></p>)}{!physical.some(p=>p.capacidad===item.capacidad) && <p>Sin balones unitarios registrados.</p>}</div>
      <label>Precio de venta (S/)<input name="price" type="number" min="0.01" max="999999.99" step="0.01" required defaultValue={item.precio_pen ?? item.precio_venta_pen} /></label>
      <label>Unidades disponibles<input name="stock" type="number" min="0" max="2147483647" step="1" required defaultValue={item.stock ?? 0} /></label>
      <label className="inventory__check"><input name="active" type="checkbox" defaultChecked={item.activo ?? true} /> Disponible para venta</label>
      <button className="btn btn-primary" disabled={busy}><i className="bi bi-check2" /> Guardar cambios</button>
    </form>)}</div>
  </section>
}
