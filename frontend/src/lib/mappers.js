import { formatCap } from '../pages/admin/adminData'

export function mapAffiliation(row) {
  return {
    id: row.id,
    empresa: row.nombre_empresa,
    representante: row.representante_nombre,
    ciudad: row.ciudad,
    telefono: row.telefono,
    correo: row.correo,
    volumen: row.volumen_mensual_balones,
    estado: row.estado,
    notas: row.notas_internas || '',
    fecha: row.created_at ? row.created_at.slice(0, 10) : '',
  }
}

export function mapLocation(row) {
  return {
    id: row.id,
    empresa: row.empresa_id ? 'Distribuidora afiliada' : 'SYSGAS',
    nombreLocal: row.nombre_local,
    tipo: row.tipo,
    ruc: row.ruc || '—',
    ciudad: row.ciudad,
    zona: row.zona || '',
    direccion: row.direccion,
    coords: row.coordenadas || '',
    estado: row.estado,
  }
}

export function mapBatch(row, locations = []) {
  const loc = locations.find((l) => l.id === row.local_id)
  return {
    id: row.id,
    localId: row.local_id,
    codigoLote: row.codigo_lote,
    local: loc ? loc.nombreLocal : 'Planta / Sin asignar',
    capacidad: formatCap(row.capacidad),
    cantidad: Number(row.cantidad || 1),
    movimiento: row.movimiento,
    taraKg: Number(row.tara_unitaria_kg || 0),
    pesoNetoKg: Number(row.peso_neto_unitario_kg || 0),
    pesoBrutoKg: Number(row.peso_total_kg || 0),
    calidad: row.calidad,
    codigosQr: row.codigos_qr || '',
    ultimaPrueba: row.ultima_prueba || '',
  }
}

export function mapOrder(row) {
  const firstItem = Array.isArray(row.pedido_items) && row.pedido_items[0] ? row.pedido_items[0] : null
  return {
    id: row.id,
    ticket: row.codigo_ticket,
    cliente: row.nombre_destinatario,
    telefono: row.telefono_contacto,
    ciudad: row.ciudad || 'Puno',
    direccion: row.direccion_entrega,
    referencia: row.referencia_direccion || '',
    coords: row.coordenadas || '',
    capacidad: firstItem ? formatCap(firstItem.capacidad) : '10 kg',
    cantidad: firstItem ? Number(firstItem.cantidad || 1) : 1,
    totalPen: Number(row.total_pedido_pen || 0),
    repartidor: row.chofer_id ? 'Asignado' : 'Sin asignar',
    metodoPago: row.metodo_pago || 'Efectivo',
    pesoRegistradoKg: Number(row.peso_bruto_entrega_kg || 0),
    taraKg: Number(row.tara_entrega_kg || 11.2),
    pesoNetoKg: Number(row.peso_neto_entrega_kg || 0),
    estado: row.estado,
  }
}

export function mapDriver(row, locations = []) {
  const loc = locations[0]
  return {
    id: row.id,
    nombre: row.chofer_asignado || row.nombre_unidad || 'Conductor',
    telefono: row.telefono_conductor || '—',
    placa: row.placa,
    local: loc ? loc.nombreLocal : 'Sede principal',
    estado: row.activo ? 'Disponible' : 'Inactivo',
  }
}

export function mapNotification(row) {
  return {
    id: row.id,
    texto: row.titulo ? `${row.titulo}: ${row.mensaje}` : row.mensaje,
    tiempo: row.created_at ? new Date(row.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : '',
    leida: Boolean(row.leida),
  }
}
