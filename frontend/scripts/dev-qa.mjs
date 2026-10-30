// Servidor de QA exclusivamente local. No conecta con Supabase ni envía correos.
import { PGlite } from '@electric-sql/pglite'
import { createServer } from 'node:http'
import { readFile,readdir } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'

const db=new PGlite()
await db.exec(await readFile(new URL('../tests/schema-fixture.sql',import.meta.url),'utf8'))
const dir=new URL('../../supabase/migrations/',import.meta.url)
for(const file of (await readdir(dir)).filter(n=>n.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file,dir),'utf8'))
const one=async(sql,args=[]) => (await db.query(sql,args)).rows[0]
const admin=(await one("select id from auth.users where email='menaronaldocarlos@gmail.com'")).id
await db.query("update public.perfiles set nombres='Administrador',apellidos='Demo local' where id=$1",[admin])
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin])
const company=(await one("insert into public.empresas_distribuidoras(ruc,razon_social,nombre_comercial,ciudad) values('00000000001','Distribuidora de prueba local','DEMO LOCAL · Altiplano','Puno') returning id")).id
await db.exec("insert into public.productos_catalogo(capacidad,nombre_comercial,precio_venta_pen,peso_neto_gas_kg,tara_promedio_kg,descripcion,dimensiones) values('5kg','Balón portátil',28.50,5,6.2,'Producto de prueba local','38 × 23 cm'),('10kg','Balón familiar',48,10,11.5,'Producto de prueba local','62 × 30 cm'),('45kg','Balón industrial',185,45,38,'Producto de prueba local','132 × 38 cm')")
const users={}
users['admin@demo.local']={id:admin,email:'admin@demo.local'}
for(const [email,name,role] of [['empresa@demo.local','Encargada demo','empresa_admin'],['motorizado@demo.local','Repartidor demo','chofer_repartidor'],['flota@demo.local','Operador demo','planta_operador'],['cliente@demo.local','Cliente demo','cliente_comun']]) {
 const user=await one("insert into auth.users(email,email_confirmed_at) values($1,now()) returning id",[email])
 await db.query('update public.perfiles set nombres=$1,rol=$2,empresa_id=$3 where id=$4',[name,role,role==='cliente_comun'?null:company,user.id])
 users[email]={id:user.id,email}
}
const rpc=async(name,args)=>(await one(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args)).result
const plan=await rpc('gestion_membresia',['plan',{nombre:'Plan demostración local',precio:120,dias:30}])
const payment=await rpc('gestion_membresia',['pago',{empresa_id:company,plan_id:plan,referencia:'DEMO-NO-REAL-001'}])
await rpc('gestion_membresia',['verificar',{pago_id:payment}])
for(const [cap,price] of [['5kg',28.50],['10kg',48],['45kg',185]]) await rpc('guardar_inventario',[company,cap,price,0,true])
for(const [code,capacity,tara,peso] of [['DEMO-10-001','10kg',11.5,21.5],['DEMO-10-002','10kg',11.5,21.5],['DEMO-10-003','10kg',11.5,21.5]]) {
 await rpc('gestion_logistica',['cilindro',company,{codigo:code,serie:code,capacidad:capacity,tara}])
 await rpc('gestion_logistica',['inspeccionar',company,{codigo:code,aprobado:true,detalle:'Inspección de prueba local'}])
 await rpc('gestion_logistica',['llenar',company,{codigo:code,peso}])
}
await rpc('gestion_logistica',['moto',company,{placa:'QA-0001',descripcion:'Moto de demostración local'}])
await rpc('gestion_logistica',['camion',company,{placa:'QA-0002',unidad:'Camión de prueba',capacidad:100}])
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users['cliente@demo.local'].id])
await rpc('crear_pedido_seguro',['Cliente Demo Local','000000000','DIRECCIÓN FICTICIA - NO ENTREGAR','Registro exclusivo de QA','10kg',company])
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin])
await db.query("insert into public.solicitudes_afiliacion(nombre_empresa,representante_nombre,telefono,correo,volumen_mensual_balones) values('Empresa de ejemplo local','Solicitante demo','000000000','solicitante@demo.local',500)")
const tables=new Set((await db.query("select tablename from pg_tables where schemaname='public'")).rows.map(r=>r.tablename))
const identifiers=value=>{if(!/^[a-z_][a-z_0-9]*$/i.test(value))throw new Error('Identificador no válido');return '"'+value+'"'}
const sessions=new Map(),refreshes=new Map()
function session(user) {
 const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,email:user.email,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),randomBytes(24).toString('base64url')].join('.')
 const refresh=randomBytes(32).toString('base64url');sessions.set(token,user);refreshes.set(refresh,user)
 return {access_token:token,token_type:'bearer',expires_in:3600,refresh_token:refresh,user:{...user,aud:'authenticated',role:'authenticated',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{},identities:[]}}
}
function columns(text='*') {
 if(text==='*')return 't.*'
 const parts=text.match(/\w+\([^)]*\)|\w+/g) || []
 return parts.map(p=>{
  const match=p.match(/^(pedido_items|comprobantes_pago)\(([^)]+)\)$/)
  if(match){const fields=match[2].split(',').map(identifiers).join(',');return `(select coalesce(json_agg(c),'[]'::json) from(select ${fields} from public.${identifiers(match[1])} where pedido_id=t.id)c) as ${identifiers(match[1])}`}
  return 't.'+identifiers(p)
 }).join(',')
}
let queue=Promise.resolve()
createServer((req,res)=>{
 const origin=req.headers.origin
 if(origin && origin!=='http://127.0.0.1:3001'){res.writeHead(403);res.end();return}
 res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:3001')
 res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,accept-profile,content-profile')
 res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS')
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
 const send=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(value))}
 queue=queue.then(async()=>{
  try{
   const url=new URL(req.url,'http://127.0.0.1:54329')
   let body='';for await(const chunk of req)body+=chunk
   const values=body?JSON.parse(body):{}
   const token=(req.headers.authorization || '').replace(/^Bearer /,'')
   const user=sessions.get(token)
   if(url.pathname==='/auth/v1/token'){
    const u=url.searchParams.get('grant_type')==='refresh_token'?refreshes.get(values.refresh_token):(values.password==='Local-SYSGAS-2026!'?users[values.email]:null)
    if(!u){send(400,{message:'Invalid login credentials'});return}
    send(200,session(u));return
   }
   if(url.pathname==='/auth/v1/user'){send(user?200:401,user?{...user,app_metadata:{},user_metadata:{},identities:[]}:{message:'No session'});return}
   if(url.pathname==='/auth/v1/logout'){sessions.delete(token);send(200,{});return}
   await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user?.id || '']);await db.exec(user?'set role authenticated':'set role anon')
   const path=url.pathname.replace('/rest/v1/','')
   if(path.startsWith('rpc/')){
    const name=path.slice(4);identifiers(name)
    const keys=Object.keys(values);const sql=`select * from public.${identifiers(name)}(${keys.map((k,i)=>`${identifiers(k)} => $${i+1}`).join(',')})`
    const result=await db.query(sql,Object.values(values))
    await db.exec('reset role')
    const metadata=await one('select proretset from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname=\'public\' and proname=$1 limit 1',[name])
    send(200,metadata?.proretset?result.rows:(Object.values(result.rows[0] || {})[0]??null));return
   }
   if(!tables.has(path) || req.method!=='GET'){send(404,{message:'Ruta de QA no disponible'});return}
   const args=[],where=[]
   for(const [key,value] of url.searchParams){if(['select','order','limit'].includes(key))continue;if(!value.startsWith('eq.'))throw new Error('Filtro no soportado');args.push(value.slice(3));where.push(`t.${identifiers(key)}=$${args.length}`)}
   let sql=`select ${columns(url.searchParams.get('select') || '*')} from public.${identifiers(path)} t${where.length?' where '+where.join(' and '):''}`
   const order=url.searchParams.get('order');if(order){const [key,direction]=order.split('.');sql+=` order by t.${identifiers(key)} ${direction==='desc'?'desc':'asc'}`}
   sql+=` limit ${Math.min(100,Math.max(1,Number(url.searchParams.get('limit')) || 100))}`
   const result=await db.query(sql,args)
   const single=(req.headers.accept||'').includes('vnd.pgrst.object')
   send(200,single?(result.rows[0]??null):result.rows)
  }catch(e){console.error('QA:',e.message);send(400,{code:e.code || 'QA',message:e.message})}
 }).catch(e=>{console.error(e.message);if(!res.headersSent)send(500,{message:'Error de QA'})})
}).listen(54329,'127.0.0.1',()=>console.log('QA LOCAL: API en http://127.0.0.1:54329 · cuentas admin/empresa/cliente/motorizado/flota @demo.local · contraseña Local-SYSGAS-2026! · sin conexión de producción'))
