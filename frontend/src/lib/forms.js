export function validateOrder(data) {
  if (data.nombre.trim().length < 2 || data.nombre.trim().length > 120) return 'Escribe un nombre de entre 2 y 120 caracteres.'
  if (!/^\+?[0-9 ()-]{7,20}$/.test(data.telefono.trim())) return 'Escribe un teléfono válido, por ejemplo 951 667 696.'
  if (data.direccion.trim().length < 5 || data.direccion.trim().length > 500) return 'Escribe una dirección de entre 5 y 500 caracteres.'
  if (data.referencia.length > 500) return 'La referencia debe tener como máximo 500 caracteres.'
  return ''
}

export function friendlyError(error) {
  const message = error?.message || ''
  if (/Invalid login credentials/i.test(message)) return 'El correo o la contraseña no son correctos.'
  if (/Email not confirmed/i.test(message)) return 'Confirma tu correo antes de ingresar.'
  if (/rate limit|too many requests/i.test(message)) return 'Has realizado varios intentos. Espera unos minutos y vuelve a intentar.'
  if (/fetch|network/i.test(message)) return 'No pudimos conectar. Revisa tu conexión e inténtalo otra vez.'
  if (['PGRST202','PGRST205','42P01','42883'].includes(error?.code)) return 'Este servicio todavía necesita configuración. Contacta al administrador.'
  if (error?.code === 'P0001') return message
  if (error?.code === '42501') return 'Tu cuenta no tiene permiso para realizar esta acción.'
  if (error?.code) return 'No pudimos completar la operación. Inténtalo de nuevo o contacta al administrador.'
  return message || 'Ocurrió un error inesperado. Inténtalo otra vez.'
}

export const orderStates = {
  pendiente: 'Pendiente', asignado_chofer: 'Chofer asignado', en_camino: 'En camino',
  en_puerta_pesaje: 'Pesaje en puerta', entregado: 'Entregado', cancelado: 'Cancelado',
}

export const cylinderStates = {
 en_planta:'En planta', en_almacen:'En almacén', cargado_camion:'En transporte masivo', en_ruta_entrega:'En reparto',
 entregado_cliente:'En poder del cliente', recuperado_vacio:'Vacío recuperado', en_mantenimiento:'En mantenimiento', baja_recalificacion:'Retirado del servicio',
}
