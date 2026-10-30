// Usa una cuenta de prueba ya confirmada. Las credenciales se reciben por stdin.
import { createClient } from '@supabase/supabase-js'
import assert from 'node:assert/strict'

let input = ''
for await (const chunk of process.stdin) input += chunk
const { email, password, ticket: existingTicket, empresa_id: company } = JSON.parse(input)
assert.ok(email && password, 'Se requiere una cuenta de prueba confirmada')
const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const client = createClient(url, key, options)
const visitor = createClient(url, key, options)
try {
  const { data: auth, error: loginError } = await client.auth.signInWithPassword({ email, password })
  assert.ifError(loginError)
  const { data: profile, error: profileError } = await client.from('perfiles').select('id,activo,rol').eq('id', auth.user.id).single()
  assert.ifError(profileError)
  assert.ok(profile.activo, 'La cuenta de prueba debe estar activa')
  assert.equal(profile.rol, 'cliente_comun', 'Usar una cuenta de cliente para verificar sus permisos')
  console.log('Acceso y perfil: correctos')
  const { data: offers, error: offersError } = await client.rpc('ofertas_distribuidoras')
  if (!existingTicket) assert.ifError(offersError)
  const product = company ? offers?.find(o => o.empresa_id === company && o.capacidad === '10kg') : null
  if (!existingTicket) assert.ok(product, 'La distribuidora debe tener una oferta activa de 10kg')

  let ticket = existingTicket
  if (!ticket) {
    assert.ok(company, 'Indica empresa_id de una distribuidora con stock para probar el nuevo flujo')
    const { data, error } = await client.rpc('crear_pedido_seguro', {
      p_nombre: 'PRUEBA TÉCNICA SYSGAS - NO DESPACHAR', p_telefono: '000000000',
      p_direccion: 'PRUEBA DE INTEGRACIÓN - NO REALIZAR ENTREGA',
      p_referencia: 'Verificación autorizada por el propietario. Registro de prueba, sin cliente ni entrega real.',
      p_capacidad: '10kg', p_empresa: company,
    })
    assert.ifError(error)
    ticket = data
    console.log(`Pedido de prueba creado: ${ticket}`)
  }
  const { data: order, error: orderError } = await client.from('pedidos')
    .select('id,codigo_ticket,cliente_id,total_pedido_pen,pedido_items(id,capacidad,cantidad,precio_unitario_pen,subtotal_pen)')
    .eq('codigo_ticket', ticket).single()
  assert.ifError(orderError)
  assert.equal(order.cliente_id, auth.user.id)
  if (product) assert.equal(Number(order.total_pedido_pen), Number(product.precio_pen))
  assert.equal(order.pedido_items.length, 1)
  const item = order.pedido_items[0]
  assert.equal(item.capacidad, '10kg')
  assert.equal(item.cantidad, 1)
  assert.equal(Number(item.precio_unitario_pen), Number(order.total_pedido_pen))
  assert.equal(Number(item.subtotal_pen), Number(order.total_pedido_pen))
  console.log('Persistencia, asociación al cliente, ítem y precio del catálogo: correctos')

  for (const [table, column, value] of [['pedidos', 'id', order.id], ['pedido_items', 'pedido_id', order.id]]) {
    const { data, error } = await visitor.from(table).select('id').eq(column, value)
    assert.ifError(error)
    assert.equal(data.length, 0, `${table} expone el pedido al visitante`)
  }
  console.log('Visitante sin sesión: no puede consultar el pedido ni sus ítems')
  const { error: logoutError } = await client.auth.signOut()
  assert.ifError(logoutError)
  const { data: afterLogout, error: afterLogoutError } = await client.from('pedidos').select('id').eq('id', order.id)
  assert.ifError(afterLogoutError)
  assert.equal(afterLogout.length, 0)
  console.log('Cierre de sesión: acceso al pedido revocado')
  console.log(`Verificación completa. Registro de prueba conservado: ${ticket}`)
} finally {
  await client.auth.signOut()
}
