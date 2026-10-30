import test from 'node:test'
import assert from 'node:assert/strict'
import { validateOrder, friendlyError } from './forms.js'

const order = { nombre: 'Ana Pérez', telefono: '+51 951 667 696', direccion: 'Jr. Lima 123, Puno', referencia: '' }
test('acepta un pedido válido con teléfono internacional y referencia opcional', () => {
  assert.equal(validateOrder(order), '')
})
test('rechaza nombres vacíos, incluso con espacios', () => {
  assert.match(validateOrder({ ...order, nombre: '   ' }), /nombre/)
})
test('rechaza teléfonos con letras o demasiado cortos', () => {
  for (const telefono of ['951ABC696', '123', '']) assert.match(validateOrder({ ...order, telefono }), /teléfono/)
})
test('rechaza una dirección incompleta y referencias que superan el límite de base de datos', () => {
  assert.match(validateOrder({ ...order, direccion: 'a' }), /dirección/)
  assert.match(validateOrder({ ...order, referencia: 'a'.repeat(501) }), /referencia/)
})
test('traduce problemas de acceso y conexión', () => {
  assert.match(friendlyError({ message: 'Invalid login credentials' }), /contraseña/)
  assert.match(friendlyError(new TypeError('Failed to fetch')), /conexión/)
})
test('no expone detalles SQL internos al usuario', () => {
  const message = friendlyError({ code: '23505', message: 'duplicate key value violates unique constraint internal_table' })
  assert.doesNotMatch(message, /internal_table|constraint/)
})

test('muestra validaciones de negocio del servidor sin ocultar el motivo', () => {
  assert.equal(friendlyError({ code: 'P0001', message: 'El solicitante debe confirmar su cuenta.' }), 'El solicitante debe confirmar su cuenta.')
})
