import { useEffect, useRef, useState } from 'react'
import { db } from '../lib/supabase'
import { friendlyError } from '../lib/forms'
import CodeScanner from './CodeScanner'
import { readCylinderCode } from '../lib/codes'

export default function DeliveryTools({ order, profile, onSaved }) {
  const [open,setOpen]=useState(false)
  const [staff,setStaff]=useState([])
  const [vehicles,setVehicles]=useState([])
  const [code,setCode]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [location,setLocation]=useState(null)
  const [sharing,setSharing]=useState(false)
  const watch=useRef(null)
  const lastUpdate=useRef(0)
  const manager=['empresa_admin','super_admin'].includes(profile.rol)
  const worker=profile.rol==='chofer_repartidor'
  const active=['asignado_chofer','en_camino','en_puerta_pesaje'].includes(order.estado)
  useEffect(()=>()=>{if(watch.current!==null) navigator.geolocation?.clearWatch(watch.current)},[])
  async function expand() {
    setOpen(!open);setError('')
    if(!open && manager && order.empresa_id) {
      const [a,b]=await Promise.all([db().rpc('listar_personal',{p_empresa:order.empresa_id}),db().from('vehiculos_reparto').select('id,placa').eq('empresa_id',order.empresa_id).eq('activo',true)])
      if(a.error || b.error) setError(friendlyError(a.error || b.error))
      else {setStaff(a.data.filter(p=>p.rol==='chofer_repartidor' && p.activo));setVehicles(b.data)}
    }
  }
  async function logistics(action,data) {
    if(busy)return
    setBusy(true);setError('')
    try {
      const {error}=await db().rpc('gestion_logistica',{p_accion:action,p_empresa:order.empresa_id,p_datos:{...data,pedido_id:order.id}})
      if(error)throw error
      onSaved()
    }catch(e){setError(friendlyError(e))}finally{setBusy(false)}
  }
  async function receipt() {
    if(busy) return
    setBusy(true); setError('')
    try {const {error}=await db().rpc('emitir_nota_venta',{p_pedido:order.id}); if(error)throw error;onSaved()}
    catch(e){setError(friendlyError(e))}finally{setBusy(false)}
  }
  async function share() {
    if(sharing){navigator.geolocation.clearWatch(watch.current);watch.current=null;setSharing(false);return}
    if(!navigator.geolocation){setError('Este navegador no tiene geolocalización.');return}
    setSharing(true);setError('')
    watch.current=navigator.geolocation.watchPosition(async p=>{
      if(Date.now()-lastUpdate.current<10000)return
      lastUpdate.current=Date.now()
      const {error}=await db().rpc('compartir_ubicacion',{p_pedido:order.id,p_latitud:p.coords.latitude,p_longitud:p.coords.longitude})
      if(error){setError(friendlyError(error));navigator.geolocation.clearWatch(watch.current);watch.current=null;setSharing(false)}
    },()=>{setError('No se pudo obtener la ubicación. Revisa el permiso y la señal GPS.');if(watch.current!==null)navigator.geolocation.clearWatch(watch.current);watch.current=null;setSharing(false)}, {enableHighAccuracy:true,timeout:15000,maximumAge:5000})
  }
  async function tracking() {
    setError('')
    const {data,error}=await db().from('ubicaciones_repartidores').select('latitud,longitud,updated_at').eq('pedido_id',order.id).maybeSingle()
    if(error)setError(friendlyError(error));else if(!data)setError('El repartidor todavía no ha compartido su ubicación.');else setLocation(data)
  }
  return <div className="delivery-tools">
    {(manager || worker) && <button className="btn btn-secondary" onClick={expand}>{open?'Cerrar herramientas':'Gestionar entrega'}</button>}
    {active && <button className="btn btn-secondary" onClick={tracking}>Consultar ubicación</button>}
    {location && active && <p>Última actualización: {new Date(location.updated_at).toLocaleTimeString('es-PE')} · <a href={`https://www.openstreetmap.org/?mlat=${Number(location.latitud)}&mlon=${Number(location.longitud)}#map=17/${Number(location.latitud)}/${Number(location.longitud)}`} target="_blank" rel="noreferrer">Ver ubicación en mapa</a></p>}
    {error && <p role="alert" className="panel__notice">{error}</p>}
    {order.comprobantes_pago?.map(c=><p key={c.id}>Nota de venta interna: <strong>{c.numero_completo}</strong> · S/ {Number(c.total_pen).toFixed(2)} · Sin valor tributario.</p>)}
    {open && <>
      {manager && order.estado==='entregado' && order.estado_pago==='completado' && !order.comprobantes_pago?.length && <button className="btn btn-secondary" disabled={busy} onClick={receipt}>Generar nota de venta interna</button>}
      {manager && ['pendiente','asignado_chofer'].includes(order.estado) && <form className="module-form" onSubmit={e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));try{void logistics('asignar',{...f,codigo:readCylinderCode(code)})}catch(e){setError(e.message)}}}>
        <label>Motorizado<select name="chofer_id" required><option value="">Selecciona</option>{staff.map(p=><option key={p.id} value={p.id}>{p.nombres}</option>)}</select></label>
        <label>Vehículo<select name="vehiculo_id" required><option value="">Selecciona</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.placa}</option>)}</select></label>
        <label>Código del balón asignado<input value={code} onChange={e=>setCode(e.target.value)} required /></label><CodeScanner onCode={setCode}/>
        <button className="btn btn-primary" disabled={busy}>Asignar reparto</button>
      </form>}
      {worker && active && <><button className="btn btn-secondary" onClick={share}>{sharing?'Detener ubicación':'Compartir ubicación durante este pedido'}</button><p className="panel__hint">Requiere tu permiso. Se comparte mientras esta pantalla esté abierta; el cliente deja de verla al terminar el servicio.</p></>}
      {order.estado==='en_puerta_pesaje' && <form className="module-form" onSubmit={e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));try{void logistics('entregar',{codigo:readCylinderCode(code),vacio:f.vacio?readCylinderCode(f.vacio):'',peso:f.peso,balanza:f.balanza})}catch(e){setError(e.message)}}}>
        <label>Código del balón entregado<input value={code} onChange={e=>setCode(e.target.value)} required /></label><CodeScanner onCode={setCode}/>
        <label>Peso bruto medido (kg)<input name="peso" type="number" min="0.01" step="0.01" required /></label><label>Identificador de la balanza<input name="balanza" maxLength={60} required /></label><p className="panel__hint">Ingresa la lectura real. Esta pantalla no conecta automáticamente una balanza Bluetooth.</p>
        <label>Código del vacío recuperado (opcional)<input name="vacio" /></label><button className="btn btn-primary" disabled={busy}>Confirmar entrega verificada</button>
      </form>}
      {manager && order.estado==='entregado' && order.estado_pago==='pendiente' && <form className="module-form" onSubmit={e=>{e.preventDefault();void logistics('cobro',Object.fromEntries(new FormData(e.currentTarget)))}}>
        <label>Método de pago<select name="metodo"><option value="efectivo">Efectivo</option><option value="yape">Yape</option><option value="plin">Plin</option><option value="tarjeta_pos">Tarjeta POS</option><option value="transferencia">Transferencia</option></select></label>
        <p>Registra un cobro ya recibido. Esta acción no procesa un pago ni emite comprobantes SUNAT.</p><button className="btn btn-primary" disabled={busy}>Registrar cobro recibido</button>
      </form>}
    </>}
  </div>
}
