import { useEffect } from 'react'
import { CAPACITIES } from '../admin/adminData'
import LocationPickerField from '../admin/LocationPickerField.jsx'

export default function CompanyModal({ modal, onClose, onSave, locations, drivers }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (!modal) return null
  const { type, item } = modal
  const isEdit = Boolean(item)

  function submit(e) {
    e.preventDefault()
    const raw = Object.fromEntries(new FormData(e.currentTarget))
    onSave(type, raw, item?.id || item?.capacidad || null)
  }

  const titles = {
    order: isEdit ? 'Editar pedido y asignación' : 'Registrar pedido',
    cylinder: isEdit ? 'Editar lote de balones' : 'Registrar lote de balones (entrada / salida)',
    stock: `Actualizar precio y stock (${item?.capacidad || ''})`,
    location: isEdit ? 'Editar local de dispensa' : 'Nuevo local de dispensa',
    driver: isEdit ? 'Editar repartidor' : 'Registrar repartidor',
  }

  return (
    <div
      className="adm-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="cmp-modal-title">
        <div className="adm-modal__head">
          <h2 id="cmp-modal-title">{titles[type]}</h2>
          <button type="button" className="adm-modal__close" onClick={onClose} aria-label="Cerrar modal">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <form className="adm-modal__form" onSubmit={submit}>
          {type === 'order' && (
            <>
              <label>
                Cliente / Destinatario
                <input name="cliente" defaultValue={item?.cliente || ''} required maxLength={120} />
              </label>
              <label>
                Teléfono
                <input name="telefono" defaultValue={item?.telefono || ''} required maxLength={20} />
              </label>
              <label>
                Capacidad
                <select name="capacidad" defaultValue={item?.capacidad || '10 kg'}>
                  {CAPACITIES.map((cap) => (
                    <option key={cap} value={cap}>{cap}</option>
                  ))}
                </select>
              </label>
              <label>
                Cantidad
                <input name="cantidad" type="number" min="1" max="50" defaultValue={item?.cantidad ?? 1} required />
              </label>
              <label>
                Total (S/)
                <input name="totalPen" type="number" step="0.5" min="1" defaultValue={item?.totalPen ?? 46} required />
              </label>
              <label>
                Peso registrado en puerta (kg)
                <input name="pesoRegistradoKg" type="number" step="0.1" min="0" defaultValue={item?.pesoRegistradoKg ?? 0} />
              </label>
              <LocationPickerField
                initialAddress={item?.direccion || ''}
                initialCoords={item?.coords || '-15.8402, -70.0219'}
                addressLabel="Dirección de entrega"
              />
              <label>
                Repartidor asignado
                <select name="repartidor" defaultValue={item?.repartidor || 'Sin asignar'}>
                  <option value="Sin asignar">Sin asignar</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.nombre}>{d.nombre} ({d.placa})</option>
                  ))}
                </select>
              </label>
              <label className="adm-modal__full">
                Estado del pedido
                <select name="estado" defaultValue={item?.estado || 'pendiente'}>
                  <option value="pendiente">Pendiente</option>
                  <option value="asignado">Asignado a repartidor</option>
                  <option value="en_ruta">En ruta</option>
                  <option value="entregado">Entregado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </label>
            </>
          )}

          {type === 'cylinder' && (
            <>
              <label>
                Código de lote
                <input name="codigoLote" defaultValue={item?.codigoLote || 'LOT-GL-'} required maxLength={40} />
              </label>
              <label>
                Local de dispensa
                <select name="local" defaultValue={item?.local || locations[0]?.nombreLocal || ''}>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.nombreLocal}>{loc.nombreLocal}</option>
                  ))}
                </select>
              </label>
              <label>
                Capacidad del lote
                <select name="capacidad" defaultValue={item?.capacidad || '10 kg'}>
                  {CAPACITIES.map((cap) => (
                    <option key={cap} value={cap}>{cap}</option>
                  ))}
                </select>
              </label>
              <label>
                Cantidad de balones
                <input name="cantidad" type="number" min="1" max="1000" defaultValue={item?.cantidad ?? 20} required />
              </label>
              <label>
                Movimiento
                <select name="movimiento" defaultValue={item?.movimiento || 'Entrada'}>
                  <option value="Entrada">Entrada (almacén / vacíos)</option>
                  <option value="Salida">Salida (despacho llenos)</option>
                </select>
              </label>
              <label>
                Estado de calidad del lote
                <select name="calidad" defaultValue={item?.calidad || 'Apto'}>
                  <option value="Apto">Apto (Certificado)</option>
                  <option value="En inspección">En inspección</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                </select>
              </label>
              <label>
                Tara unitaria promedio (kg)
                <input name="taraKg" type="number" step="0.1" min="0" defaultValue={item?.taraKg ?? 11.2} required />
              </label>
              <label>
                Peso neto unitario (kg)
                <input name="pesoNetoKg" type="number" step="0.1" min="0" defaultValue={item?.pesoNetoKg ?? 10.0} required />
              </label>
              <label className="adm-modal__full">
                Rango / Códigos QR del lote
                <input name="codigosQr" defaultValue={item?.codigosQr || ''} placeholder="Ej. SYS-2026-GL-101 .. SYS-2026-GL-120" maxLength={120} />
              </label>
            </>
          )}

          {type === 'stock' && (
            <>
              <label>
                Precio unitario (S/)
                <input name="precioPen" type="number" step="0.5" min="1" defaultValue={item?.precioPen ?? 46} required />
              </label>
              <label>
                Balones llenos disponibles
                <input name="disponibles" type="number" min="0" defaultValue={item?.disponibles ?? 0} required />
              </label>
              <label className="adm-modal__full">
                Balones vacíos en local
                <input name="vacios" type="number" min="0" defaultValue={item?.vacios ?? 0} required />
              </label>
            </>
          )}

          {type === 'location' && (
            <>
              <label>
                Nombre del local
                <input name="nombreLocal" defaultValue={item?.nombreLocal || ''} required maxLength={140} />
              </label>
              <label>
                Ciudad
                <input name="ciudad" defaultValue={item?.ciudad || 'Puno'} required maxLength={80} />
              </label>
              <label>
                Zona de cobertura
                <input name="zona" defaultValue={item?.zona || ''} required maxLength={100} />
              </label>
              <label>
                Estado
                <select name="estado" defaultValue={item?.estado || 'activo'}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </label>
              <LocationPickerField
                initialAddress={item?.direccion || ''}
                initialCoords={item?.coords || '-15.8402, -70.0219'}
                addressLabel="Dirección exacta del local"
              />
            </>
          )}

          {type === 'driver' && (
            <>
              <label>
                Nombre completo
                <input name="nombre" defaultValue={item?.nombre || ''} required maxLength={120} />
              </label>
              <label>
                Teléfono
                <input name="telefono" defaultValue={item?.telefono || ''} required maxLength={20} />
              </label>
              <label>
                Placa del vehículo
                <input name="placa" defaultValue={item?.placa || ''} required maxLength={15} />
              </label>
              <label>
                Local base
                <select name="local" defaultValue={item?.local || locations[0]?.nombreLocal || ''}>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.nombreLocal}>{loc.nombreLocal}</option>
                  ))}
                </select>
              </label>
              <label className="adm-modal__full">
                Estado
                <select name="estado" defaultValue={item?.estado || 'Disponible'}>
                  <option value="Disponible">Disponible</option>
                  <option value="En ruta">En ruta</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </label>
            </>
          )}

          <div className="adm-modal__actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{isEdit ? 'Guardar cambios' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
