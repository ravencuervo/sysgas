import { reportCsv } from '../lib/report-csv'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/supabase'
import { friendlyError, cylinderStates } from '../lib/forms'
import { parseBatch } from '../lib/codes'
import CodeScanner from './CodeScanner'

const money = n => new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n || 0)
const date = value => value ? new Date(value).toLocaleDateString('es-PE',{timeZone:'America/Lima'}) : 'Sin vigencia'
const source = (data,label) => data.map(r => [r.id,label(r)])
function Form({ title, fields, submit, busy, button = 'Guardar' }) {
  return <form className="module-form solid-card" onSubmit={e => { e.preventDefault(); void submit(Object.fromEntries(new FormData(e.currentTarget)),e.currentTarget) }}>
    <h3>{title}</h3>{fields.map(([name,label,type='text',options,initial]) => <label key={name}>{label}
      {type === 'select' ? <select name={name} required defaultValue={initial || ""}><option value="">Selecciona una opción</option>{options.map(([id,text]) => <option key={id} value={id}>{text}</option>)}</select>
        : type === 'textarea' ? <textarea name={name} maxLength={2000} required />
          : <input name={name} type={type} defaultValue={initial} required min={type==='number' ? 0 : undefined} step={type==='number' ? (['dias','capacidad','esperados'].includes(name)?'1':'0.01') : undefined} maxLength={type==='email'?120:150} />}</label>)}
    <button className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : button}</button>
  </form>
}

function CylinderQR({ code }) {
  const [image,setImage] = useState('')
  useEffect(() => {
    let active=true
    import('qrcode').then(m => m.default.toDataURL(`${window.location.origin}/balon/${encodeURIComponent(code)}`,{width:180,margin:2})).then(src => { if(active) setImage(src) }).catch(() => {})
    return () => {active=false}
  },[code])
  return image && <a href={image} download={`${code}.png`}><img className="cylinder-qr" src={image} alt={`Descargar QR de ${code}`} /></a>
}

export default function CompanyOperations({ profile, section }) {
  const [company,setCompany] = useState(profile.empresa_id || '')
  const [companies,setCompanies] = useState([])
  const [data,setData] = useState({})
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [busy,setBusy] = useState(false)
  const [loading,setLoading] = useState(true)
  const [batch,setBatch] = useState('')
  const [period,setPeriod] = useState(() => { const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); return {from:today.slice(0,8)+'01',to:today} })
  const [checkedAt] = useState(() => Date.now())
  const manager = ['empresa_admin','super_admin'].includes(profile.rol)
  const superadmin = profile.rol === 'super_admin'
  const load = useCallback(async () => {
    setLoading(true); setError(''); setData({})
    try {
      const {data: companies,error} = await db().from('empresas_distribuidoras').select('id,razon_social')
      if(error) throw error
      setCompanies(companies)
      const out={}
      async function table(key,tableName,columns='*',field='empresa_id') {
        let query = db().from(tableName).select(columns)
        if(field) query=query.eq(field,company)
        if (['pagos_membresia','invitaciones_personal','cilindros','incidencias','auditoria_operaciones'].includes(tableName)) query=query.order('created_at',{ascending:false})
        const result = await query.limit(100)
        if(result.error) throw result.error
        out[key]=result.data
      }
      if(section==='membresia') {
        await table('plans','planes_suscripcion','*',null)
        if(superadmin) { const {data,error}=await db().rpc('reporte_sysgas'); if(error) throw error; out.global=data }
        if(company) await Promise.all([table('subscriptions','suscripciones_empresas'),table('payments','pagos_membresia')])
      }
      if(company) {
        if(section==='empresa') await table('companyInfo','empresas_distribuidoras','id,ruc,razon_social,nombre_comercial,ciudad,estado','id')
        if(section==='personal') {
          const {data,error}=await db().rpc('listar_personal',{p_empresa:company}); if(error) throw error; out.staff=data
          await table('invites','invitaciones_personal')
        }
        if(section==='vehiculos') await Promise.all([table('motos','vehiculos_reparto'),table('trucks','camiones_flota')])
        if(section==='cilindros') await table('cylinders','cilindros','id,codigo_qr,capacidad,estado,aprobado_calidad,tara_calibrada_kg','empresa_duena_id')
        if(section==='flota') {
          await table('trucks','camiones_flota')
          const {data: trips,error: tripError}=await db().rpc('resumen_viajes',{p_empresa:company}); if(tripError) throw tripError; out.trips=trips
          if(manager) { const {data,error}=await db().rpc('listar_personal',{p_empresa:company}); if(error) throw error; out.staff=data }
        }
        if(section==='incidencias') await table('incidents','incidencias')
        if(section==='cobertura') await table('zones','zonas_cobertura')
        if(section==='auditoria') await table('audit','auditoria_operaciones')
        if(section==='reportes') { const {data,error}=await db().rpc('reporte_empresa',{p_empresa:company,p_desde:period.from,p_hasta:period.to}); if(error) throw error; out.report=data }
      }
      setData(out)
    } catch(e) {setError(friendlyError(e))} finally {setLoading(false)}
  },[company,section,superadmin,manager,period.from,period.to])
  useEffect(() => {queueMicrotask(() => {void load()})},[load])
  async function run(rpc,args,form) {
    if(busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      const {error} = await db().rpc(rpc,args)
      if(error) throw error
      form?.reset(); setNotice('Operación guardada correctamente.'); await load()
    } catch(e) {setError(friendlyError(e))} finally {setBusy(false)}
  }
  function exportReport() {
    if(!data.report) return
    const link=document.createElement('a'),url=URL.createObjectURL(new Blob([reportCsv(data.report,period)],{type:'text/csv;charset=utf-8'}))
    link.href=url;link.download=`sysgas-reporte-${period.from}-${period.to}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),0)
  }
  function gps(trip) {
    if(!navigator.geolocation) {setError('Geolocalización no disponible.');return}
    navigator.geolocation.getCurrentPosition(p => {void run('compartir_ubicacion_flota',{p_viaje:trip.id,p_latitud:p.coords.latitude,p_longitud:p.coords.longitude})},()=>setError('No se obtuvo ubicación. Revisa el permiso del navegador.'),{enableHighAccuracy:true,timeout:15000})
  }
  const operation = action => (values,form) => run('gestion_logistica',{p_accion:action,p_empresa:company,p_datos:values},form)
  const membership = action => (values,form) => run('gestion_membresia',{p_accion:action,p_datos:{...values,empresa_id:company}},form)
  const common = {busy:busy || loading}
  const staffOptions = cargo => source((data.staff || []).filter(p=>p.activo && p.rol===cargo),p=>p.nombres)
  return <section className="module">
    <div className="module__toolbar"><label>Empresa<select value={company} disabled={busy} onChange={e=>{setCompany(e.target.value);setNotice('')}}><option value="">Selecciona una empresa</option>{companies.map(c=><option key={c.id} value={c.id}>{c.razon_social}</option>)}</select></label><button className="btn btn-secondary" disabled={busy || loading} onClick={load}>Actualizar módulo</button></div>
    {error && <p className="panel__notice" role="alert">{error}</p>}{notice && <p className="dash-success" role="status">{notice}</p>}
    {loading && <p role="status">Consultando información…</p>}
    {!loading && !company && <p>Selecciona una empresa para consultar sus datos.</p>}
    {section==='membresia' && <>
      {data.global && <div className="report-grid">{Object.entries(data.global).map(([key,value])=><article className="solid-card" key={key}><span>{key.replaceAll('_',' ')}</span><strong>{key.includes('pen')?money(value):value}</strong></article>)}</div>}
      <div className="module-grid">
      {superadmin && <Form {...common} title="Crear plan de suscripción" fields={[["nombre","Nombre"],["precio","Precio mensual (S/)","number"],["dias","Días de vigencia","number"]]} submit={membership('plan')} />}
      {company && <Form {...common} title="Registrar pago de membresía" button="Enviar a verificación" fields={[["plan_id","Plan","select",source(data.plans||[],p=>`${p.nombre} · ${money(p.precio_pen)} / ${p.dias} días`)],["referencia","Referencia de transferencia o comprobante"]]} submit={membership('pago')} />}
      </div>
      {superadmin && <div className="module-grid">{(data.plans||[]).map(p=><Form key={p.id} {...common} title={`Editar plan: ${p.nombre}`} fields={[["nombre","Nombre","text",null,p.nombre],["precio","Precio (S/)","number",null,p.precio_pen],["dias","Días","number",null,p.dias],["activo","Disponibilidad","select",[['true','Disponible'],['false','Retirado']],String(p.activo)]]} submit={(v,f)=>run('editar_plan',{p_id:p.id,p_nombre:v.nombre,p_precio:Number(v.precio),p_dias:Number(v.dias),p_activo:v.activo==='true'},f)} />)}</div>}
      <p className="panel__hint">Registrar una referencia no realiza un cobro ni activa la membresía. SYSGAS debe verificar el pago recibido.</p>
      {(data.subscriptions||[]).map(s=><article className="solid-card panel__order" key={s.empresa_id}><h3>Membresía: {s.estado==='activa' && new Date(s.vigente_hasta).getTime()<checkedAt?'vencida':s.estado}</h3><p>Vigencia hasta {date(s.vigente_hasta)}</p>{superadmin && <button className="btn btn-secondary" disabled={busy} onClick={()=>membership(s.estado==='suspendida'?'reanudar':'suspender')({})}>{s.estado==='suspendida'?'Reanudar':'Suspender'}</button>}</article>)}
      {company && !loading && !data.subscriptions?.length && <p>Esta empresa todavía no tiene membresía activa.</p>}
      {(data.payments||[]).map(p=><article className="solid-card panel__order" key={p.id}><h3>{money(p.importe_pen)} · {p.estado}</h3><p>Referencia: {p.referencia} · {date(p.created_at)}</p>{superadmin && p.estado==='pendiente' && <div className="panel__order-actions"><button className="btn btn-primary" disabled={busy} onClick={()=>{if(window.confirm('¿Verificaste que este dinero fue recibido? Esto activará la membresía.')) void membership('verificar')({pago_id:p.id})}}>Verificar y activar</button><button className="btn btn-secondary" disabled={busy} onClick={()=>membership('rechazar')({pago_id:p.id})}>Rechazar pago</button></div>}</article>)}
    </>}
    {company && section==='empresa' && <>{(data.companyInfo||[]).map(c=><article className="solid-card panel__order" key={c.id}><h3>{c.razon_social}</h3><p>RUC {c.ruc} · {c.ciudad} · {c.estado}</p>{superadmin && <button className="btn btn-secondary" disabled={busy} onClick={()=>run('administrar_activo',{p_tipo:'empresa',p_id:c.id,p_activo:c.estado!=='activo'})}>{c.estado==='activo'?'Suspender empresa':'Habilitar empresa'}</button>}</article>)}
      {superadmin && <Form {...common} title="Asignar administrador empresarial" fields={[["correo","Correo de la cuenta confirmada","email"]]} submit={(v,f)=>run('asignar_administrador',{p_empresa:company,p_correo:v.correo},f)} />}
    </>}
    {company && section==='personal' && <>
      <Form {...common} title="Invitar trabajador" button="Crear invitación" fields={[["correo","Correo del trabajador","email"],["cargo","Cargo","select",[['motorizado','Motorizado domiciliario'],['operador_flota','Operador de flota']]]]} submit={(v,f)=>run('gestion_personal',{p_accion:'invitar',p_empresa:company,p_correo:v.correo,p_cargo:v.cargo},f)} />
      <p className="panel__hint">Comparte el enlace de registro de SYSGAS con el trabajador. Debe confirmar ese correo, entrar y aceptar la invitación en Notificaciones. No se envía un correo automático desde este formulario.</p>
      {(data.staff||[]).map(p=><article className="solid-card panel__order" key={p.id}><h3>{p.nombres}</h3><p>{p.correo} · {p.rol==='chofer_repartidor'?'Motorizado':'Operador de flota'} · {p.activo?'Activo':'Desactivado'}</p><button className="btn btn-secondary" disabled={busy} onClick={()=>run('gestion_personal',{p_accion:p.activo?'desactivar':'activar',p_empresa:company,p_usuario:p.id})}>{p.activo?'Desactivar':'Activar'}</button></article>)}
      {(data.invites||[]).map(i=><article className="solid-card panel__order" key={i.id}><p>{i.correo} · {i.cargo} · {i.estado}</p>{i.estado==='pendiente' && <button className="btn btn-secondary" disabled={busy} onClick={()=>run('gestion_personal',{p_accion:'revocar',p_empresa:company,p_correo:i.correo})}>Revocar invitación</button>}</article>)}
    </>}
    {company && section==='vehiculos' && <><div className="module-grid">
      {manager && <><Form {...common} title="Vehículo domiciliario" fields={[["placa","Placa"],["descripcion","Descripción"]]} submit={operation('moto')} />
      <Form {...common} title="Camión de transporte masivo" fields={[["placa","Placa"],["unidad","Número de unidad"],["capacidad","Capacidad de balones","number"]]} submit={operation('camion')} /></>}
      </div>{[...(data.motos||[]).map(v=>({...v,kind:'moto'})),...(data.trucks||[]).map(v=>({...v,kind:'camion'}))].map(v=><article className="solid-card panel__order" key={v.id}><h3>{v.placa}</h3><p>{v.descripcion || v.numero_unidad} {v.capacidad_balones && `· ${v.capacidad_balones} balones`}</p><p>{v.activo?'Activo':'Fuera de servicio'}</p>{manager && <button className="btn btn-secondary" disabled={busy} onClick={()=>run('administrar_activo',{p_tipo:v.kind,p_id:v.id,p_activo:!v.activo})}>{v.activo?'Desactivar':'Activar'}</button>}</article>)}</>}
    {company && section==='cilindros' && <><div className="module-grid">
      <Form {...common} title="Registrar balón" fields={[["codigo","Código único"],["serie","Serie de fabricación"],["capacidad","Capacidad","select",[['5kg','5 kg'],['10kg','10 kg'],['45kg','45 kg']]],["tara","Tara (kg)","number"]]} submit={operation('cilindro')} />
      <Form {...common} title="Registrar inspección" fields={[["codigo","Código del balón"],["detalle","Resultado de inspección","textarea"],["aprobado","Conformidad","select",[['true','Aprobado'],['false','Rechazado / mantenimiento']]]]} submit={operation('inspeccionar')} />
      <Form {...common} title="Registrar llenado y peso" fields={[["codigo","Código del balón"],["peso","Peso bruto medido (kg)","number"]]} submit={operation('llenar')} />
      <Form {...common} title="Mantenimiento o retiro" fields={[["codigo","Código del balón"],["estado","Acción","select",[['en_mantenimiento','Enviar a mantenimiento'],['baja_recalificacion','Retirar del servicio']]],["motivo","Motivo","textarea"]]} submit={(v,f)=>run('control_cilindro',{p_empresa:company,p_codigo:v.codigo,p_estado:v.estado,p_motivo:v.motivo},f)} />
      </div><p className="panel__hint">El registro inicial queda pendiente de inspección. Un llenado válido incorpora una unidad al stock. No vuelvas a sumar esa misma unidad mediante un ajuste manual.</p>
      <div className="module-grid">{(data.cylinders||[]).map(c=><article className="solid-card panel__order cylinder-card" key={c.id}><CylinderQR code={c.codigo_qr}/><h3>{c.codigo_qr}</h3><p>{c.capacidad} · {cylinderStates[c.estado] || c.estado} · Tara {c.tara_calibrada_kg} kg</p><Link to={`/balon/${encodeURIComponent(c.codigo_qr)}`}>Consultar pasaporte</Link></article>)}</div></>}
    {company && section==='flota' && <>
      {manager && <Form {...common} title="Programar viaje" fields={[["camion_id","Camión","select",source(data.trucks||[],v=>`${v.placa} · ${v.numero_unidad}`)],["operador_id","Operador","select",staffOptions('planta_operador')],["origen","Origen"],["destino","Destino"],["esperados","Cantidad esperada de balones","number"]]} submit={operation('viaje')} />}
      {(data.trips||[]).map(v=><article className="solid-card panel__order" key={v.id}><h3>{v.origen} → {v.destino}</h3>{manager && v.estado==='preparacion' && <button className="btn btn-secondary" disabled={busy} onClick={()=>run('cancelar_viaje',{p_empresa:company,p_viaje:v.id})}>Cancelar viaje sin carga</button>}<p>Viaje {v.id.slice(0,8)} · {v.estado} · {v.esperados} esperados · {v.total} balones cargados · {v.recibidos} recibidos</p>{v.estado==='en_transito' && profile.rol==='planta_operador' && <button disabled={busy} className="btn btn-secondary" onClick={()=>gps(v)}>Actualizar GPS de este viaje</button>}
      {(data.trucks||[]).find(c=>c.id===v.camion_id)?.ultima_latitud != null && <p>GPS del camión: {(data.trucks||[]).find(c=>c.id===v.camion_id)?.ultima_latitud}, {(data.trucks||[]).find(c=>c.id===v.camion_id)?.ultima_longitud} · Última actualización: {date((data.trucks||[]).find(c=>c.id===v.camion_id)?.ultima_telemetria)}</p>}</article>)}
      <form className="module-form solid-card" onSubmit={e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));try{void run('gestion_logistica',{p_accion:f.accion,p_empresa:company,p_datos:{viaje_id:f.viaje_id,codigos:parseBatch(batch),diferencia:f.diferencia}})}catch(e){setError(e.message)}}}>
        <h3>Carga y recepción por lote</h3><label>Viaje<select name="viaje_id" required><option value="">Selecciona</option>{(data.trips||[]).filter(v=>['preparacion','en_transito'].includes(v.estado)).map(v=><option key={v.id} value={v.id}>{v.origen} → {v.destino} · {v.estado}</option>)}</select></label>
        <label>Operación<select name="accion"><option value="cargar">Confirmar carga y salida</option><option value="recibir">Confirmar recepción</option></select></label>
        <CodeScanner onCode={code=>{if(batch.split(/[\s,;]+/).includes(code)) setError(`Código ya registrado en el lote: ${code}`); else {setError('');setBatch(`${batch}\n${code}`.trim())}}} />
        <label>Códigos, uno por línea<textarea value={batch} onChange={e=>setBatch(e.target.value)} required rows={8} /></label><p>{batch.split(/[\s,;]+/).filter(Boolean).length} códigos · Se validan duplicados y propiedad antes de guardar.</p>
        <label>Justificación si la cantidad difiere de la esperada<input name="diferencia" maxLength={1000} /></label>
        <button className="btn btn-primary" disabled={busy || loading}>Confirmar lote</button>
      </form>
    </>}
    {company && section==='incidencias' && <><Form {...common} title="Reportar incidencia" fields={[["descripcion","Descripción","textarea"]]} submit={operation('incidencia')} />{(data.incidents||[]).map(i=><article className="solid-card panel__order" key={i.id}><p>{i.descripcion}</p><p>{i.estado} · {date(i.created_at)}</p>{manager && i.estado==='abierta' && <button disabled={busy} className="btn btn-secondary" onClick={()=>operation('resolver')({id:i.id})}>Marcar resuelta</button>}</article>)}</>}
    {company && section==='cobertura' && <><Form {...common} title="Agregar zona de atención" fields={[["ciudad","Ciudad"],["zona","Distrito o zona"]]} submit={(v,f)=>run('guardar_cobertura',{p_empresa:company,p_ciudad:v.ciudad,p_zona:v.zona},f)} />{(data.zones||[]).map(z=><article className="solid-card panel__order" key={z.id}><h3>{z.ciudad}</h3><p>{z.zona}</p></article>)}</>}
    {company && section==='reportes' && <><div className="module__toolbar"><label>Desde<input type="date" value={period.from} onChange={e=>setPeriod({...period,from:e.target.value})}/></label><label>Hasta<input type="date" value={period.to} onChange={e=>setPeriod({...period,to:e.target.value})}/></label></div>
      <p className="panel__hint">Periodo por fecha de creación del pedido, zona horaria Perú. Ventas corresponde a pedidos entregados; cobrado, a pagos registrados. Stock e incidencias son el saldo actual; recepciones y devoluciones usan la fecha del evento.</p>
      {data.report && <><button className="btn btn-secondary" onClick={exportReport}>Exportar reporte CSV</button><div className="report-grid">{Object.entries(data.report).filter(([,v])=>!Array.isArray(v)).map(([k,v])=><article className="solid-card" key={k}><span>{k.replaceAll('_',' ')}</span><strong>{k.includes('pen')?money(v):v}</strong></article>)}</div>
      <h3>Balones por estado</h3>{data.report.cilindros.map(r=><p key={r.estado}>{cylinderStates[r.estado] || r.estado}: {r.cantidad}</p>)}<h3>Productos entregados</h3>{data.report.productos.map(r=><p key={r.capacidad}>{r.capacidad}: {r.unidades} unidades</p>)}<h3>Entregas por repartidor</h3>{data.report.repartidores?.map((r,i)=><p key={i}>{r.nombres}: {r.entregas} entregas</p>)}</>}
    </>}
    {company && section==='auditoria' && <>{(data.audit||[]).map(a=><article className="solid-card panel__order" key={a.id}><h3>{a.operacion.replaceAll('_',' ')}</h3><p>{date(a.created_at)} · Responsable: {a.usuario_id} · Registro: {a.entidad_id || '—'}</p></article>)}</>}
    {!loading && company && <p className="panel__hint">Las listas operativas muestran hasta 100 registros autorizados. Los reportes se calculan en el servidor sobre el periodo completo.</p>}
  </section>
}
