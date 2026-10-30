import CompanyOperations from '../components/CompanyOperations'
import AccountInbox from '../components/AccountInbox'
import DeliveryTools from '../components/DeliveryTools'
import CompanyInventory from '../components/CompanyInventory'
import AffiliationAdmin from '../components/AffiliationAdmin'
import './Panel.css'
import { friendlyError, orderStates } from '../lib/forms'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase'

export default function Panel() {
  const previousRole = useRef(null)
  const navigate = useNavigate()
  const [section, setSection] = useState('pedidos')
  const [saving, setSaving] = useState(null)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [orders, setOrders] = useState([])
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    await Promise.resolve()
    setError('')
    setOrders([])
    setLoading(true)
    try {
      const { data: { user }, error: authError } = await db().auth.getUser()
      if (authError || !user) { navigate('/login'); return }
      const { data: person, error: profileError } = await db().from('perfiles').select('nombres,rol,activo,empresa_id').eq('id', user.id).single()
      if (profileError) throw profileError
      if (!person.activo) throw new Error('Tu perfil está desactivado.')
      if (previousRole.current !== person.rol) { setSection(person.rol === 'planta_operador' ? 'flota' : 'pedidos'); previousRole.current = person.rol }
      setProfile(person)
      const { data, error } = await db().from('pedidos').select('id,codigo_ticket,nombre_destinatario,direccion_entrega,estado,estado_pago,empresa_id,chofer_id,total_pedido_pen,created_at,comprobantes_pago(id,numero_completo,total_pen),pedido_items(id,capacidad,cantidad,precio_unitario_pen,subtotal_pen)').order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      setOrders(data)
    } catch (e) { setError(friendlyError(e)) }
    finally { setLoading(false) }
  }, [navigate])
  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])
  useEffect(() => {
    const { data: { subscription } } = db().auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') { setOrders([]); setProfile(null); navigate('/login', { replace: true }) }
    })
    return () => subscription.unsubscribe()
  }, [navigate])
  async function logout() {
    try { const { error } = await db().auth.signOut(); if (error) throw error; navigate('/login') }
    catch (e) { setError(friendlyError(e)) }
  }
  const manager = profile && ['super_admin','empresa_admin'].includes(profile.rol)
  async function changeState(order, state) {
    if (saving) return
    setSaving(order.id); setError(''); setNotice('')
    try {
      const { error } = await db().rpc('cambiar_estado_pedido', { p_pedido: order.id, p_estado: state })
      if (error) throw error
      await load()
      setNotice('Estado del pedido actualizado.')
    } catch(e) { setError(friendlyError(e)) } finally { setSaving(null) }
  }
  const visible = orders.filter(order => (!status || order.estado === status) &&
    `${order.codigo_ticket} ${order.nombre_destinatario} ${order.direccion_entrega}`.toLowerCase().includes(query.toLowerCase()))
  const money = value => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
  return <div className="dashboard">
    <aside className="dashboard__sidebar">
      <Link to="/" className="dashboard__brand"><span className="dashboard__logo"><i className="bi bi-fire" /></span><span>SYSGAS<small>GESTIÓN INTELIGENTE</small></span></Link>
      <div className="dashboard__workspace"><span className="dash-live" />{manager ? 'Centro de operaciones' : 'Mi cuenta SYSGAS'}<small>{profile?.rol.replaceAll('_',' ') || 'Conectando…'}</small></div>
      <span className="dashboard__nav-label">PRINCIPAL</span>
      <nav aria-label="Secciones del panel">
        <button className={section === 'pedidos' ? 'active' : ''} onClick={() => setSection('pedidos')}><i className="bi bi-grid-1x2" />{manager ? 'Pedidos y entregas' : profile?.rol === 'chofer_repartidor' ? 'Mis entregas' : 'Mis pedidos'}<span>{orders.filter(o => o.estado === 'pendiente').length}</span></button>
        {manager && <button className={section === 'inventario' ? 'active' : ''} onClick={() => setSection('inventario')}><i className="bi bi-box-seam" />Precios y stock</button>}
        {profile?.rol === 'super_admin' && <button className={section === 'afiliaciones' ? 'active' : ''} onClick={() => setSection('afiliaciones')}><i className="bi bi-buildings" />Afiliaciones</button>}
        {manager && [['empresa','bi-building','Mi empresa'],['personal','bi-people','Personal'],['vehiculos','bi-truck','Vehículos'],['cilindros','bi-qr-code','Balones y QR'],['flota','bi-boxes','Transporte masivo'],['cobertura','bi-geo-alt','Cobertura'],['reportes','bi-bar-chart','Reportes'],['membresia','bi-credit-card','Membresía'],['auditoria','bi-shield-check','Auditoría']].map(([key,icon,label]) => <button key={key} className={section===key?'active':''} onClick={()=>setSection(key)}><i className={`bi ${icon}`} />{label}</button>)}
        {profile?.rol==='planta_operador' && <button className={section==='flota'?'active':''} onClick={()=>setSection('flota')}><i className="bi bi-boxes" />Mis viajes</button>}
        {(manager || ['chofer_repartidor','planta_operador'].includes(profile?.rol)) && <button className={section==='incidencias'?'active':''} onClick={()=>setSection('incidencias')}><i className="bi bi-exclamation-triangle" />Incidencias</button>}
        <button className={section==='notificaciones'?'active':''} onClick={()=>setSection('notificaciones')}><i className="bi bi-bell" />Notificaciones</button>
        <Link to="/#contacto"><i className="bi bi-plus-circle" />Nuevo pedido</Link>
      </nav>
      <div className="dashboard__sidebar-foot"><i className="bi bi-shield-check" /><p>Tu operación, bajo control.<small>Acceso según tu cuenta</small></p></div>
      <button className="dashboard__logout" onClick={logout}><i className="bi bi-box-arrow-left" />Cerrar sesión</button>
    </aside>
    <main className="panel dashboard__main">
      <header className="dashboard__topbar"><span>Mi espacio <i className="bi bi-chevron-right" /> {section.charAt(0).toUpperCase()+section.slice(1)}</span><div className="dashboard__user"><span>{profile?.nombres || 'Usuario'}</span><b>{profile?.nombres?.charAt(0) || 'S'}</b></div></header>
      <div className="dashboard__content">
      <div className="panel__header"><div><span className="dashboard__eyebrow">TU DISTRIBUIDORA, MÁS CONECTADA</span><h1>{section === 'pedidos' ? (manager ? 'Tu operación de un vistazo' : profile?.rol === 'chofer_repartidor' ? 'Tus entregas asignadas' : 'Tus pedidos, en un solo lugar') : section === 'inventario' ? 'Control de productos' : section.charAt(0).toUpperCase()+section.slice(1)}</h1><p>{section === 'pedidos' ? 'Consulta los pedidos y mantén cada entrega en orden.' : 'Información actualizada para tomar mejores decisiones.'}</p></div><button className="btn btn-secondary" onClick={load} disabled={loading}><i className="bi bi-arrow-clockwise" />Actualizar</button></div>
      {notice && <p className="dash-success" role="status">{notice}</p>}
      {section === 'inventario' && manager && <CompanyInventory profile={profile} />}
      {section === 'afiliaciones' && profile?.rol === 'super_admin' && <AffiliationAdmin />}
      {section === 'notificaciones' && <AccountInbox onAccepted={load} />}
      {profile && ['empresa','personal','vehiculos','cilindros','flota','cobertura','reportes','membresia','auditoria','incidencias'].includes(section) && <CompanyOperations key={section} profile={profile} section={section} />}
      {section === 'pedidos' && <>
    <div className="panel__metrics" aria-label="Resumen de los pedidos cargados">
      <article className="solid-card"><span><i className="bi bi-bag-check" /> Pedidos registrados</span><strong>{orders.length}</strong></article>
      <article className="solid-card"><span><i className="bi bi-truck" /> En proceso</span><strong>{orders.filter(o => !['entregado', 'cancelado'].includes(o.estado)).length}</strong></article>
      <article className="solid-card"><span><i className="bi bi-check2-circle" /> Entregados</span><strong>{orders.filter(o => o.estado === 'entregado').length}</strong></article>
    </div>
    <div className="panel__filters">
      <label>Buscar pedido<input type="search" placeholder="Ticket, destinatario o dirección" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <label>Estado<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos los estados</option>{Object.entries(orderStates).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    </div>
    <p className="panel__hint">Últimos 100 pedidos autorizados para tu cuenta. Las cifras corresponden a esta lista.</p>
    {error && <p className="panel__notice" role="alert">{error}</p>}
    {loading ? <p role="status">Consultando pedidos…</p> : !error && visible.length === 0 && <div className="solid-card panel__empty"><h2>{orders.length ? 'Sin coincidencias' : 'Todavía no hay pedidos'}</h2><p>{orders.length ? 'Prueba con otro texto o estado.' : 'Los pedidos asociados a tu cuenta aparecerán aquí.'}</p></div>}
    <div className="panel__orders">{!loading && visible.map(order => <article className="solid-card panel__order" key={order.id}>
      <div className="panel__order-top"><h2>{order.codigo_ticket}</h2><span className={`order-status order-status--${order.estado}`}>{orderStates[order.estado] || order.estado}</span></div>
      <h3>{order.nombre_destinatario}</h3><p>{order.direccion_entrega}</p>
      <ul className="panel__items" aria-label="Detalle del pedido">{order.pedido_items?.map(item => <li key={item.id}>{item.cantidad} × Balón de {item.capacidad} · {money(item.subtotal_pen)}</li>)}</ul>
      {(manager || profile?.rol === 'chofer_repartidor') && !['entregado','cancelado'].includes(order.estado) && <div className="panel__order-actions">
        {order.estado === 'asignado_chofer' && <button className="btn btn-primary" disabled={!!saving} onClick={() => changeState(order,'en_camino')}>Iniciar reparto</button>}
        {order.estado === 'en_camino' && <button className="btn btn-primary" disabled={!!saving} onClick={() => changeState(order,'en_puerta_pesaje')}>Registrar llegada</button>}
        {manager && <>
        <button className="btn btn-secondary" disabled={!!saving} onClick={() => { if (window.confirm('¿Cancelar este pedido? El stock reservado se devolverá.')) void changeState(order,'cancelado') }}>Cancelar pedido</button>
        </>}
      </div>}
      {profile && <DeliveryTools order={order} profile={profile} onSaved={load} />}
      <footer><time dateTime={order.created_at}>{new Date(order.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</time><strong>{money(order.total_pedido_pen)}</strong></footer>
    </article>)}</div>
    </>}
    {section !== 'pedidos' && error && <p role="alert" className="panel__notice">{error}</p>}
    </div></main>
  </div>
}
