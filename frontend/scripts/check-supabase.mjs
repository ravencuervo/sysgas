import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
assert.ok(url && key, 'Configura la URL y la clave pública en .env.local')
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const { data: products, error: catalogError } = await client.from('productos_catalogo')
  .select('capacidad,precio_venta_pen').eq('disponible_en_puno', true)
assert.ifError(catalogError)
assert.ok(products.length, 'El catálogo está vacío')
assert.ok(products.every(p => Number(p.precio_venta_pen) > 0), 'Existen precios inválidos')
console.log(`Catálogo: ${products.length} productos disponibles`)

const { data: passport, error: passportError } = await client.rpc('pasaporte_publico', { p_codigo: 'demo-001' })
assert.ifError(passportError)
assert.ok(passport?.codigo && Array.isArray(passport.eventos), 'Falta el pasaporte de prueba demo-001')
console.log(`Pasaporte: ${passport.eventos.length} eventos registrados`)

const { data: missing, error: missingError } = await client.rpc('pasaporte_publico', { p_codigo: '__verificacion_inexistente__' })
assert.ifError(missingError)
assert.equal(missing, null)

const { error: offersError } = await client.rpc('ofertas_distribuidoras')
assert.ifError(offersError)
console.log('Ofertas por distribuidora: disponibles')

// Los campos vacíos se rechazan antes de insertar: no se crean pedidos de prueba.
const { error: validationError } = await client.rpc('crear_pedido_seguro', {
  p_nombre: '', p_telefono: '', p_direccion: '', p_referencia: '', p_capacidad: '10kg', p_empresa: null,
})
assert.equal(validationError?.code, 'P0001', 'La función debe rechazar los pedidos inválidos')
console.log('Pedidos: validación del servidor activa')

for (const table of ['pedidos', 'perfiles']) {
  const { data, error } = await client.from(table).select('id').limit(1)
  assert.ifError(error)
  assert.equal(data.length, 0, `La tabla ${table} expone datos a visitantes`)
}
const { error: relationError } = await client.from('pedidos')
  .select('id,pedido_items(id,capacidad,cantidad,precio_unitario_pen,subtotal_pen)').limit(1)
assert.ifError(relationError)
console.log('Permisos: sin acceso anónimo a pedidos ni perfiles; relación de ítems disponible')
console.log('Conexión verificada. Esta prueba no crea usuarios ni pedidos.')
