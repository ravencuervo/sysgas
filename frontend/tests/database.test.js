import { PGlite } from '@electric-sql/pglite'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'

test('migraciones y operaciones multiempresa en PostgreSQL aislado', async t => {
 const db = new PGlite()
 try {
  await db.exec(await readFile(new URL('./schema-fixture.sql',import.meta.url),'utf8'))
  const dir = new URL('../../supabase/migrations/',import.meta.url)
  for(const name of (await readdir(dir)).filter(n=>n.endsWith('.sql')).sort()) {
    try {await db.exec(await readFile(new URL(name,dir),'utf8'))} catch(e) {throw new Error(`Migración ${name}: ${e.message}`,{cause:e})}
  }
  const one = async (sql,args=[]) => (await db.query(sql,args)).rows[0]
  const admin=(await one("select id from auth.users where email='menaronaldocarlos@gmail.com'")).id
  async function asUser(id) {await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id || '']);await db.exec(id?'set role authenticated':'set role anon')}
  async function rpc(name,args) {return one(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args)}
  await db.exec("insert into public.empresas_distribuidoras(id,ruc,razon_social) values('11111111-1111-4111-8111-111111111111','11111111111','Empresa A'),('22222222-2222-4222-8222-222222222222','22222222222','Empresa B'); insert into public.productos_catalogo(capacidad,nombre_comercial,precio_venta_pen) values('10kg','Familiar',48);")
  const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222'
  async function user(email,role='cliente_comun',company=null) {
   await db.exec('reset role');const u=await one('insert into auth.users(email,email_confirmed_at) values($1,now()) returning id',[email]);await db.query('update public.perfiles set rol=$1,empresa_id=$2 where id=$3',[role,company,u.id]);return u.id
  }
  const ownerA=await user('owner-a@test.local','empresa_admin',a), ownerB=await user('owner-b@test.local','empresa_admin',b), customer=await user('customer@test.local'), driver=await user('driver@test.local'), operator=await user('operator@test.local')
  let plan, ticket, order, moto, truck, trip
  await t.test('no admite autoasignar roles ni administrar otra empresa',async()=>{
   await asUser(customer)
   await assert.rejects(db.query("update public.perfiles set rol='super_admin' where id=$1",[customer]),/permission denied/)
   await assert.rejects(rpc('guardar_inventario',[a,'10kg',48,2,true]),/Sin permiso/)
   await assert.rejects(rpc('gestion_membresia',['plan',{nombre:'Intruso',precio:1,dias:30}]),/Solo SYSGAS/)
  })
  await t.test('el registro no confía en roles enviados por el usuario',async()=>{
   await db.exec('reset role');const forged=await one("insert into auth.users(email,email_confirmed_at,raw_user_meta_data) values('falso@test.local',now(),'{\"rol\":\"super_admin\"}') returning id")
   assert.equal((await one('select rol from public.perfiles where id=$1',[forged.id])).rol,'cliente_comun')
  })
  await t.test('la verificación de pago activa la membresía una sola vez',async()=>{
   await asUser(admin);plan=(await rpc('gestion_membresia',['plan',{nombre:'Estándar',precio:100,dias:30}])).result
   await asUser(ownerA);const payment=(await rpc('gestion_membresia',['pago',{empresa_id:a,plan_id:plan,referencia:'TEST-TRANSFERENCIA'}])).result
   assert.equal((await rpc('membresia_activa',[a])).result,false)
   await asUser(admin);await rpc('gestion_membresia',['verificar',{pago_id:payment}]);await assert.rejects(rpc('gestion_membresia',['verificar',{pago_id:payment}]),/ya fue revisado/)
   assert.equal((await rpc('membresia_activa',[a])).result,true)
  })
  await t.test('vincula trabajadores únicamente a su invitación confirmada',async()=>{
   await asUser(ownerA);await rpc('gestion_personal',['invitar',a,'driver@test.local','motorizado',null]);await rpc('gestion_personal',['invitar',a,'operator@test.local','operador_flota',null])
   await asUser(customer);await assert.rejects(rpc('gestion_personal',['aceptar',a,'','',null]),/No hay una invitación/)
   await asUser(driver);await rpc('gestion_personal',['aceptar',a,'','',null]);assert.equal((await one('select rol from public.perfiles where id=$1',[driver])).rol,'chofer_repartidor')
   await asUser(operator);await rpc('gestion_personal',['aceptar',a,'','',null])
  })
  await t.test('registro, inspección y llenado mantienen trazabilidad e inventario',async()=>{
   await asUser(ownerA);await rpc('guardar_inventario',[a,'10kg',49,0,true])
   await rpc('gestion_logistica',['cilindro',a,{codigo:'TEST-CIL-001',serie:'SERIE-001',capacidad:'10kg',tara:11.5}])
   await assert.rejects(rpc('gestion_logistica',['llenar',a,{codigo:'TEST-CIL-001',peso:21.5}]),/requiere inspección/)
   await rpc('gestion_logistica',['inspeccionar',a,{codigo:'TEST-CIL-001',aprobado:true,detalle:'Inspección técnica de prueba'}]);await rpc('gestion_logistica',['llenar',a,{codigo:'TEST-CIL-001',peso:21.5}])
   assert.equal((await one('select stock from public.inventario_empresa where empresa_id=$1',[a])).stock,1)
  })
  await t.test('el pedido reserva stock, guarda precio empresarial y respeta RLS',async()=>{
   await asUser(customer);ticket=(await rpc('crear_pedido_seguro',['Cliente Prueba','999999999','Dirección de prueba','Referencia','10kg',a])).result
   order=await one('select * from public.pedidos where codigo_ticket=$1',[ticket]);assert.equal(Number(order.total_pedido_pen),49)
   await assert.rejects(rpc('crear_pedido_seguro',['Cliente Prueba','999999999','Dirección de prueba','','10kg',a]),/agotó/)
   await asUser(ownerB);assert.equal((await db.query('select id from public.pedidos where id=$1',[order.id])).rows.length,0)
   await asUser(null);assert.equal((await db.query('select id from public.pedidos where id=$1',[order.id])).rows.length,0)
  })
  await t.test('asignación, GPS limitado y entrega requieren el cilindro correcto',async()=>{
   await asUser(ownerA);moto=(await rpc('gestion_logistica',['moto',a,{placa:'TEST-01',descripcion:'Vehículo de prueba'}])).result
   await rpc('gestion_logistica',['asignar',a,{pedido_id:order.id,chofer_id:driver,vehiculo_id:moto,codigo:'TEST-CIL-001'}])
   await asUser(driver);await rpc('cambiar_estado_pedido',[order.id,'en_camino']);await rpc('compartir_ubicacion',[order.id,-15.84,-70.02])
   await asUser(customer);assert.equal((await db.query('select * from public.ubicaciones_repartidores where pedido_id=$1',[order.id])).rows.length,1)
   await asUser(ownerB);assert.equal((await db.query('select * from public.ubicaciones_repartidores where pedido_id=$1',[order.id])).rows.length,0)
   await asUser(driver);await rpc('cambiar_estado_pedido',[order.id,'en_puerta_pesaje']);await assert.rejects(rpc('cambiar_estado_pedido',[order.id,'entregado']),/usa el código/)
   await assert.rejects(rpc('gestion_logistica',['entregar',a,{pedido_id:order.id,codigo:'NO-CORRESPONDE'}]),/no corresponde/)
   await rpc('gestion_logistica',['entregar',a,{pedido_id:order.id,codigo:'TEST-CIL-001',peso:21.5,balanza:'BALANZA-PRUEBA'}]);await assert.rejects(rpc('compartir_ubicacion',[order.id,-15.84,-70.02]),/solo durante/)
   await asUser(customer);assert.equal((await db.query('select * from public.ubicaciones_repartidores where pedido_id=$1',[order.id])).rows.length,0)
  })
  await t.test('el cobro del gas y los ingresos de membresía permanecen separados',async()=>{
   await asUser(ownerA);await rpc('gestion_logistica',['cobro',a,{pedido_id:order.id,metodo:'efectivo'}]);const report=(await rpc('reporte_empresa',[a,'2020-01-01','2020-01-31'])).result;assert.equal(Number(report.cobrado_pen),0)
   await asUser(admin);assert.equal(Number((await rpc('reporte_sysgas',[])).result.ingresos_membresias_pen),100)
  })
  await t.test('la nota interna es idempotente y no declara aceptación SUNAT',async()=>{
   await asUser(ownerA);const first=(await rpc('emitir_nota_venta',[order.id])).result;const second=(await rpc('emitir_nota_venta',[order.id])).result;assert.equal(first,second)
   const receipt=await one('select * from public.comprobantes_pago where pedido_id=$1',[order.id]);assert.equal(receipt.estado_sunat,'NO_ENVIADO');assert.equal(receipt.tipo,'nota_venta')
   await asUser(ownerB);await assert.rejects(rpc('emitir_nota_venta',[order.id]),/no autorizado/)
  })
  await t.test('pasaporte público omite nombres y rutas internas',async()=>{
   await asUser(null);const passport=(await rpc('pasaporte_publico',['TEST-CIL-001'])).result;assert.equal(passport.operadorLlenado,'Información reservada');assert.ok(!JSON.stringify(passport).includes('Dirección de prueba'))
  })
  await t.test('transporte masivo detecta duplicados y repone stock solo al recibir',async()=>{
   await asUser(ownerA);await rpc('gestion_logistica',['cilindro',a,{codigo:'TEST-CIL-002',serie:'SERIE-002',capacidad:'10kg',tara:11.5}]);await rpc('gestion_logistica',['inspeccionar',a,{codigo:'TEST-CIL-002',aprobado:true,detalle:'Aprobado'}]);await rpc('gestion_logistica',['llenar',a,{codigo:'TEST-CIL-002',peso:21.5}])
   truck=(await rpc('gestion_logistica',['camion',a,{placa:'TRUCK-1',unidad:'U01',capacidad:20}])).result
   trip=(await rpc('gestion_logistica',['viaje',a,{camion_id:truck,operador_id:operator,origen:'Planta A',destino:'Almacén A',esperados:1}])).result
   await asUser(operator);await assert.rejects(rpc('gestion_logistica',['cargar',a,{viaje_id:trip,codigos:['TEST-CIL-002','TEST-CIL-002']}]),/repetidos/)
   await assert.rejects(rpc('gestion_logistica',['cargar',a,{viaje_id:trip,codigos:['TEST-CIL-002','ZZZ-INEXISTENTE'],diferencia:'Justificación local de prueba'}]),/no pertenece/)
   await rpc('gestion_logistica',['cargar',a,{viaje_id:trip,codigos:['TEST-CIL-002']}]);await rpc('compartir_ubicacion_flota',[trip,-15.84,-70.02]);await rpc('gestion_logistica',['recibir',a,{viaje_id:trip,codigos:['TEST-CIL-002']}]);await assert.rejects(rpc('gestion_logistica',['recibir',a,{viaje_id:trip,codigos:['TEST-CIL-002']}]),/estado del viaje/)
   await asUser(ownerA);assert.equal((await one('select stock from public.inventario_empresa where empresa_id=$1',[a])).stock,1)
  })
  await t.test('un reintento del mismo pedido no descuenta stock dos veces',async()=>{
   await asUser(customer);const key='99999999-9999-4999-8999-999999999999'
   const args=['Cliente Prueba','999999999','Dirección de prueba','','10kg',a,'Puno','',key]
   const first=(await rpc('crear_pedido_seguro',args)).result,second=(await rpc('crear_pedido_seguro',args)).result;assert.equal(first,second)
   const o=await one('select id from public.pedidos where codigo_ticket=$1',[first]);await asUser(ownerA);await rpc('cambiar_estado_pedido',[o.id,'cancelado'])
   assert.equal((await one('select stock from public.inventario_empresa where empresa_id=$1',[a])).stock,1)
  })
  await t.test('la cobertura se valida en el servidor y no puede eludirse por la función anterior',async()=>{
   await asUser(ownerA);await rpc('guardar_cobertura',[a,'Puno','Centro'])
   await asUser(customer);await assert.rejects(rpc('crear_pedido_seguro',['Cliente','999999999','Dirección de prueba','','10kg',a,'Lima','Centro']),/no atiende/)
   await assert.rejects(rpc('crear_pedido_empresa',['Cliente','999999999','Dirección de prueba','','10kg',a]),/permission denied/)
   await asUser(ownerA);assert.equal((await one('select stock from public.inventario_empresa where empresa_id=$1',[a])).stock,1)
  })
  await t.test('cancelación devuelve inventario una vez y la suspensión bloquea pedidos',async()=>{
   await asUser(customer);const ticket=(await rpc('crear_pedido_seguro',['Cliente Prueba','999999999','Dirección de prueba','','10kg',a,'Puno','Centro'])).result;const o=await one('select id from public.pedidos where codigo_ticket=$1',[ticket])
   await asUser(ownerA);await rpc('cambiar_estado_pedido',[o.id,'cancelado']);await rpc('cambiar_estado_pedido',[o.id,'cancelado']);assert.equal((await one('select stock from public.inventario_empresa where empresa_id=$1',[a])).stock,1)
   await asUser(admin);await rpc('gestion_membresia',['suspender',{empresa_id:a}])
   await asUser(customer);await assert.rejects(rpc('crear_pedido_seguro',['Cliente Prueba','999999999','Dirección de prueba','','10kg',a,'Puno','Centro']),/membresía/)
   await asUser(ownerA);assert.equal((await one('select stock from public.inventario_empresa where empresa_id=$1',[a])).stock,1)
  })
  await t.test('solo SYSGAS modifica planes y designa administradores empresariales',async()=>{
   await asUser(ownerA);await assert.rejects(rpc('editar_plan',[plan,'Plan intruso',1,30,true]),/Solo SYSGAS/)
   await assert.rejects(rpc('asignar_administrador',[b,'customer@test.local']),/Solo SYSGAS/)
   await assert.rejects(rpc('administrar_activo',['empresa',b,false]),/Solo SYSGAS/)
   await asUser(admin);await rpc('editar_plan',[plan,'Plan actualizado',110,30,true]);assert.equal(Number((await one('select precio_pen from public.planes_suscripcion where id=$1',[plan])).precio_pen),110)
  })
  await t.test('un lote de 200 balones mantiene contadores completos y evita viajes simultáneos',async()=>{
   await asUser(admin);await rpc('gestion_membresia',['reanudar',{empresa_id:a}]);await db.exec('reset role')
   await db.query("insert into public.cilindros(codigo_qr,uuid_inmutable,numero_serie_fabricacion,capacidad,empresa_duena_id,tara_calibrada_kg,peso_bruto_actual_kg,estado,aprobado_calidad) select 'BULK-'||n,gen_random_uuid()::text,'SERIE-BULK-'||n,'10kg',$1,11.5,21.5,'en_almacen',true from generate_series(1,200)n",[a])
   await asUser(ownerA);await rpc('guardar_inventario',[a,'10kg',49,201,true])
   const truck2=(await rpc('gestion_logistica',['camion',a,{placa:'BULK-01',unidad:'Carga masiva',capacidad:250}])).result
   const args={camion_id:truck2,operador_id:operator,origen:'Planta A',destino:'Almacén A',esperados:200}
   const trip2=(await rpc('gestion_logistica',['viaje',a,args])).result
   await assert.rejects(rpc('gestion_logistica',['viaje',a,args]),/duplicate key/)
   const codes=Array.from({length:200},(_,i)=>`BULK-${i+1}`)
   await asUser(operator);await rpc('gestion_logistica',['cargar',a,{viaje_id:trip2,codigos:codes}]);let summary=(await db.query('select * from public.resumen_viajes($1)',[a])).rows.find(v=>v.id===trip2);assert.equal(Number(summary.total),200)
   await rpc('gestion_logistica',['recibir',a,{viaje_id:trip2,codigos:codes}]);summary=(await db.query('select * from public.resumen_viajes($1)',[a])).rows.find(v=>v.id===trip2);assert.equal(Number(summary.recibidos),200)
   await asUser(ownerA);const canceled=(await rpc('gestion_logistica',['viaje',a,args])).result;await rpc('cancelar_viaje',[a,canceled])
   assert.equal((await one('select stock from public.inventario_empresa where empresa_id=$1',[a])).stock,201)
  })
  await t.test('el instalador combinado se puede repetir sin borrar registros',async()=>{
   await db.exec('reset role');const before=Number((await one('select count(*) n from public.pedidos')).n)
   await db.exec(await readFile(new URL('../../supabase/ACTUALIZAR_SYSGAS.sql',import.meta.url),'utf8'))
   assert.equal(Number((await one('select count(*) n from public.pedidos')).n),before)
  })
  await t.test('la baja de un balón no modifica pedidos ni borra su historial',async()=>{
   await asUser(admin);await rpc('gestion_membresia',['reanudar',{empresa_id:a}])
   await asUser(ownerA);await rpc('control_cilindro',[a,'TEST-CIL-002','en_mantenimiento','Revisión de válvula de prueba'])
   assert.equal((await one('select stock from public.inventario_empresa where empresa_id=$1',[a])).stock,200)
   const cylinder=await one('select id,estado from public.cilindros where codigo_qr=$1',['TEST-CIL-002']);assert.equal(cylinder.estado,'en_mantenimiento')
   assert.ok(Number((await one('select count(*) n from public.cilindros_trazabilidad where cilindro_id=$1',[cylinder.id])).n)>1)
  })
 } finally {await db.close()}
})

test('el SQL combinado instala una base con solo las migraciones iniciales',async()=>{
 const db=new PGlite()
 try {
  await db.exec(await readFile(new URL('./schema-fixture.sql',import.meta.url),'utf8'))
  for(const file of ['202610300001_frontend.sql','202610300002_admin_afiliaciones.sql']) await db.exec(await readFile(new URL(`../../supabase/migrations/${file}`,import.meta.url),'utf8'))
  await db.exec(await readFile(new URL('../../supabase/ACTUALIZAR_SYSGAS.sql',import.meta.url),'utf8'))
  const result=await db.query("select to_regprocedure('public.crear_pedido_seguro(text,text,text,text,public.capacidad_cilindro,uuid,text,text,uuid)') is not null as installed")
  assert.equal(result.rows[0].installed,true)
 } finally {await db.close()}
})
