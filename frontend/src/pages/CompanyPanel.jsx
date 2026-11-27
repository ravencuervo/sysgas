import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api.js'
import { db } from '../lib/supabase.js'
import {
  mapBatch,
  mapDriver,
  mapLocation,
  mapNotification,
  mapOrder,
} from '../lib/mappers.js'
import AdminCharts from './admin/AdminCharts.jsx'
import { formatCap, mapsUrl } from './admin/adminData.js'
import CompanyModal from './company/CompanyModal.jsx'
import { COMPANY_INFO } from './company/companyData.js'
import './AdminPanel.css'

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'bi-bar-chart-line', label: 'Dashboard y reportes' },
  { id: 'pedidos', icon: 'bi-receipt', label: 'Pedidos y entregas' },
  { id: 'inventario', icon: 'bi-box-seam', label: 'Precios y lotes QR' },
  { id: 'locales', icon: 'bi-geo-alt', label: 'Locales y cobertura' },
  { id: 'repartidores', icon: 'bi-truck', label: 'Repartidores' },
]

const ORDER_STATUS = {
  pendiente: 'Pendiente',
  asignado_chofer: 'Asignado',
  en_camino: 'En ruta',
  en_puerta_pesaje: 'En puerta',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export default function CompanyPanel() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('dashboard')
  const [orders, setOrders] = useState([])
  const [catalog, setCatalog] = useState([])
  const [cylinders, setCylinders] = useState([])
  const [locations, setLocations] = useState([])
  const [drivers, setDrivers] = useState([])
  const [notifications, setNotifications] = useState([])

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)

  function notify(text) {
    const id = `CN-${Date.now()}`
    setToast({ id, texto: text })
    window.setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr))
    }, 3600)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await apiFetch('/api/admin/resumen')
      const locs = (data.locales || []).map(mapLocation)
      setLocations(locs)
      setOrders((data.pedidos || []).map(mapOrder))
      setCylinders((data.lotes || []).map((b) => mapBatch(b, locs)))
      setDrivers((data.vehiculos || []).map((v) => mapDriver(v, locs)))
      setNotifications((data.notificaciones || []).map(mapNotification))
      setCatalog(
        (data.catalog || []).map((p) => ({
          id: p.id,
          capacidad: formatCap(p.capacidad),
          precioPen: Number(p.precio_venta_pen || 0),
          nombre: p.nombre_comercial,
        }))
      )
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const unreadCount = notifications.filter((n) => !n.leida).length

  async function handleSave(type, raw, editKey) {
    try {
      if (type === 'order') {
        const body = {
          nombre_destinatario: raw.cliente,
          telefono_contacto: raw.telefono,
          ciudad: COMPANY_INFO.ciudad,
          direccion_entrega: raw.direccion,
          coordenadas: raw.coords || '',
          capacidad: raw.capacidad,
          cantidad: Number(raw.cantidad || 1),
          total_pedido_pen: Number(raw.totalPen || 46),
          peso_bruto_entrega_kg: Number(raw.pesoRegistradoKg || 0) || null,
          estado: raw.estado === 'en_ruta' ? 'en_camino' : raw.estado === 'asignado' ? 'asignado_chofer' : raw.estado,
        }
        await apiFetch(editKey ? `/api/admin/pedidos/${editKey}` : '/api/admin/pedidos', {
          method: editKey ? 'PATCH' : 'POST',
          body,
        })
        notify(editKey ? `Pedido actualizado: ${raw.cliente}` : `Pedido registrado: ${raw.cliente}`)
      } else if (type === 'cylinder') {
        const cantidad = Number(raw.cantidad || 1)
        const tara = Number(raw.taraKg)
        const neto = Number(raw.pesoNetoKg)
        const loc = locations.find((l) => l.nombreLocal === raw.local)
        const body = {
          codigo_lote: raw.codigoLote,
          local_id: loc ? loc.id : null,
          capacidad: raw.capacidad,
          cantidad,
          movimiento: raw.movimiento,
          tara_unitaria_kg: tara,
          peso_neto_unitario_kg: neto,
          peso_total_kg: Number((cantidad * (tara + neto)).toFixed(2)),
          calidad: raw.calidad,
          codigos_qr: raw.codigosQr || '',
        }
        await apiFetch(editKey ? `/api/admin/lotes/${editKey}` : '/api/admin/lotes', {
          method: editKey ? 'PATCH' : 'POST',
          body,
        })
        notify(editKey ? `Lote actualizado: ${raw.codigoLote}` : `Lote registrado: ${raw.codigoLote}`)
      } else if (type === 'stock') {
        const item = catalog.find((c) => c.capacidad === editKey)
        if (item) {
          await apiFetch(`/api/admin/catalogo/${item.id}`, {
            method: 'PATCH',
            body: { precio_venta_pen: Number(raw.precioPen) },
          })
        }
        notify(`Precio de ${editKey} actualizado en BD`)
      } else if (type === 'location') {
        const body = {
          nombre_local: raw.nombreLocal,
          tipo: 'Distribuidora afiliada',
          ciudad: raw.ciudad,
          zona: raw.zona,
          direccion: raw.direccion,
          coordenadas: raw.coords || '',
          estado: raw.estado,
        }
        await apiFetch(editKey ? `/api/admin/locales/${editKey}` : '/api/admin/locales', {
          method: editKey ? 'PATCH' : 'POST',
          body,
        })
        notify(editKey ? `Local actualizado: ${raw.nombreLocal}` : `Local agregado: ${raw.nombreLocal}`)
      } else if (type === 'driver') {
        const body = {
          placa: raw.placa,
          nombre_unidad: raw.nombre,
          chofer_asignado: raw.nombre,
          telefono_conductor: raw.telefono,
          activo: raw.estado !== 'Inactivo',
        }
        await apiFetch(editKey ? `/api/admin/vehiculos/${editKey}` : '/api/admin/vehiculos', {
          method: editKey ? 'PATCH' : 'POST',
          body,
        })
        notify(editKey ? `Repartidor actualizado: ${raw.nombre}` : `Repartidor registrado: ${raw.nombre}`)
      }
      setModal(null)
      await loadData()
    } catch (err) {
      notify(`Error: ${err.message}`)
    }
  }

  async function handleDelete(type, id, label) {
    if (!window.confirm(`¿Eliminar "${label}" de la base de datos?`)) return
    try {
      const endpoints = {
        order: `/api/admin/pedidos/${id}`,
        cylinder: `/api/admin/lotes/${id}`,
        location: `/api/admin/locales/${id}`,
        driver: `/api/admin/vehiculos/${id}`,
      }
      await apiFetch(endpoints[type], { method: 'DELETE' })
      notify(`Registro eliminado: ${label}`)
      await loadData()
    } catch (err) {
      notify(`Error: ${err.message}`)
    }
  }

  const totalSales = orders
    .filter((o) => o.estado !== 'cancelado')
    .reduce((acc, o) => acc + Number(o.totalPen || 0), 0)

  return (
    <div className="adm">
      {menuOpen && (
        <div
          className="adm__sidebar-backdrop"
          role="presentation"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`adm__sidebar ${menuOpen ? 'adm__sidebar--open' : ''}`}>
        <div className="adm__sidebar-top">
          <div className="adm__sidebar-head">
            <Link to="/" className="adm__brand">
              <img
                src="/images/logos/sysgas_logo_monochrome_white.png"
                alt="SYSGAS"
                className="adm__brand-img"
              />
              <span>SYSGAS</span>
            </Link>
            <button
              type="button"
              className="adm__sidebar-close"
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar menú"
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <p className="adm__role-tag">{COMPANY_INFO.nombre}</p>

          <nav className="adm__nav" aria-label="Menú de distribuidora">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`adm__nav-btn ${tab === item.id ? 'adm__nav-btn--active' : ''}`}
                onClick={() => {
                  setTab(item.id)
                  setMenuOpen(false)
                }}
              >
                <i className={`bi ${item.icon}`} />
                <span>{item.label}</span>
                {item.id === 'pedidos' && (
                  <strong className="adm__nav-count">
                    {orders.filter((o) => o.estado === 'pendiente').length}
                  </strong>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="adm__sidebar-foot">
          <Link to="/" className="adm__foot-link">
            <i className="bi bi-arrow-left" />
            <span>Landing page</span>
          </Link>
          <button
            type="button"
            className="adm__foot-link"
            style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}
            onClick={async () => {
              try {
                await db().auth.signOut({ scope: 'local' })
              } catch {
                // Continuar al login incluso si la red falla
              } finally {
                setMenuOpen(false)
                navigate('/login', { replace: true })
              }
            }}
          >
            <i className="bi bi-box-arrow-left" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="adm__main">
        <header className="adm__topbar">
          <div className="adm__topbar-left">
            <button
              type="button"
              className="adm__menu-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <i className="bi bi-list" />
            </button>
            <div className="adm__crumb">
              <span>{COMPANY_INFO.nombre}</span>
              <i className="bi bi-chevron-right" />
              <strong>{NAV_ITEMS.find((n) => n.id === tab)?.label}</strong>
            </div>
          </div>

          <div className="adm__topbar-right">
            <button type="button" className="adm__icon-btn" onClick={loadData} aria-label="Actualizar datos">
              <i className="bi bi-arrow-clockwise" />
            </button>
            <div className="adm__notif-wrap">
              <button
                type="button"
                className="adm__notif-btn"
                onClick={() => setNotifOpen((o) => !o)}
                aria-label="Notificaciones de empresa"
              >
                <i className="bi bi-bell" />
                {unreadCount > 0 && <span className="adm__notif-badge">{unreadCount}</span>}
              </button>

              {notifOpen && (
                <div className="adm__notif-drawer" role="region" aria-label="Ventana de notificaciones">
                  <div className="adm__notif-head">
                    <strong>Notificaciones BD</strong>
                    <button type="button" onClick={() => setNotifOpen(false)}>Cerrar</button>
                  </div>
                  <ul>
                    {notifications.length === 0 ? (
                      <li><p>Sin notificaciones en BD.</p></li>
                    ) : (
                      notifications.map((n) => (
                        <li key={n.id}>
                          <p>{n.texto}</p>
                          <small>{n.tiempo}</small>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="adm__content" key={tab}>
          {loadError && (
            <div className="adm__notice" role="alert" style={{ backgroundColor: '#FEE2E2', borderLeftColor: '#DC2626', color: '#991B1B' }}>
              <i className="bi bi-exclamation-triangle-fill" />
              <span>Sin conexión con backend ({loadError}). Inicia `backend` con `npm run dev`.</span>
            </div>
          )}
          {loading && !loadError && <p role="status">Cargando datos desde Supabase…</p>}

          {tab === 'dashboard' && (
            <section className="adm__view" aria-labelledby="cmp-dash-title">
              <div className="adm__section-head">
                <div>
                  <h1 id="cmp-dash-title">Resumen de distribuidora</h1>
                  <p>Entregas, lotes por capacidad (5 kg, 10 kg, 45 kg) y calidad desde Supabase.</p>
                </div>
              </div>

              <div className="adm__metrics">
                <div className="adm__metric">
                  <span>Balones en lotes</span>
                  <strong>{cylinders.reduce((a, c) => a + Number(c.cantidad || 0), 0)}</strong>
                </div>
                <div className="adm__metric">
                  <span>Pedidos registrados</span>
                  <strong>{orders.length}</strong>
                </div>
                <div className="adm__metric">
                  <span>Unidades activas</span>
                  <strong>{drivers.length}</strong>
                </div>
                <div className="adm__metric">
                  <span>Ingresos registrados</span>
                  <strong>S/ {totalSales.toFixed(2)}</strong>
                </div>
              </div>

              <AdminCharts cylinders={cylinders} orders={orders} locations={locations} />
            </section>
          )}

          {tab === 'pedidos' && (
            <section className="adm__view" aria-labelledby="cmp-orders-title">
              <div className="adm__section-head">
                <div>
                  <h1 id="cmp-orders-title">Pedidos y entregas de tu flota</h1>
                  <p>Gestiona pedidos en BD con dirección y Google Maps.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setModal({ type: 'order', item: null })}
                >
                  <i className="bi bi-plus-lg" /> Nuevo pedido
                </button>
              </div>

              <div className="adm__table-wrap">
                {orders.length === 0 ? (
                  <p className="adm__empty">Aún no hay pedidos registrados en BD.</p>
                ) : (
                  <table className="adm__table">
                    <thead>
                      <tr>
                        <th>Ticket / Cliente</th>
                        <th>Dirección y Mapa</th>
                        <th>Detalle</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id}>
                          <td data-label="Ticket">
                            <div>
                              <strong className="adm__num">{o.ticket}</strong>
                              <div className="adm__cell-sub">{o.cliente} · {o.telefono}</div>
                            </div>
                          </td>
                          <td data-label="Dirección">
                            <div>
                              <div>{o.direccion}</div>
                              <a
                                href={mapsUrl(o.direccion, o.coords)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="adm__map-link"
                              >
                                <i className="bi bi-geo-alt-fill" /> Ver en Google Maps
                              </a>
                            </div>
                          </td>
                          <td data-label="Detalle" className="adm__num">
                            <span>{o.cantidad} × {o.capacidad} · <strong>S/ {Number(o.totalPen).toFixed(2)}</strong></span>
                          </td>
                          <td data-label="Estado">
                            <span className={`adm__status adm__status--${o.estado === 'entregado' ? 'aprobada' : o.estado === 'en_camino' || o.estado === 'asignado_chofer' ? 'en_evaluacion' : o.estado === 'cancelado' ? 'rechazada' : 'pendiente_revision'}`}>
                              {ORDER_STATUS[o.estado] || o.estado}
                            </span>
                          </td>
                          <td data-label="Acciones">
                            <div className="adm__table-actions">
                              <button type="button" className="adm__icon-btn" onClick={() => setModal({ type: 'order', item: o })} aria-label={`Editar ${o.ticket}`}>
                                <i className="bi bi-pencil" />
                              </button>
                              <button type="button" className="adm__icon-btn adm__icon-btn--danger" onClick={() => handleDelete('order', o.id, o.ticket)} aria-label={`Eliminar ${o.ticket}`}>
                                <i className="bi bi-trash" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {tab === 'inventario' && (
            <section className="adm__view" aria-labelledby="cmp-inv-title">
              <div className="adm__section-head">
                <div>
                  <h1 id="cmp-inv-title">Precios y lotes de balones QR</h1>
                  <p>Precios del catálogo en Supabase y lotes registrados en `lotes_balones`.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setModal({ type: 'cylinder', item: null })}
                >
                  <i className="bi bi-plus-lg" /> Registrar lote
                </button>
              </div>

              <div className="adm__metrics">
                {catalog.map((s) => (
                  <div key={s.capacidad} className="adm__metric">
                    <span>{s.nombre} ({s.capacidad})</span>
                    <strong>S/ {s.precioPen.toFixed(2)}</strong>
                    <button
                      type="button"
                      className="adm__map-link"
                      style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}
                      onClick={() => setModal({ type: 'stock', item: s })}
                    >
                      Editar precio en BD
                    </button>
                  </div>
                ))}
              </div>

              <div className="adm__table-wrap">
                {cylinders.length === 0 ? (
                  <p className="adm__empty">Aún no hay lotes registrados en `lotes_balones`.</p>
                ) : (
                  <table className="adm__table">
                    <thead>
                      <tr>
                        <th>Lote / Rango QR</th>
                        <th>Local</th>
                        <th>Capacidad · Cant.</th>
                        <th>Movimiento</th>
                        <th>Peso total del lote</th>
                        <th>Calidad</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cylinders.map((c) => (
                        <tr key={c.id}>
                          <td data-label="Lote">
                            <div>
                              <strong className="adm__num">{c.codigoLote}</strong>
                              {c.codigosQr && <div className="adm__cell-sub">{c.codigosQr}</div>}
                            </div>
                          </td>
                          <td data-label="Local">{c.local}</td>
                          <td data-label="Cantidad" className="adm__num"><span><strong>{c.cantidad}</strong> × {c.capacidad}</span></td>
                          <td data-label="Movimiento">{c.movimiento}</td>
                          <td data-label="Peso total" className="adm__num">
                            <div>
                              <strong>{c.pesoBrutoKg} kg</strong>
                              <div className="adm__cell-sub">Tara {c.taraKg} kg · Neto {c.pesoNetoKg} kg/u</div>
                            </div>
                          </td>
                          <td data-label="Calidad">
                            <span className={`adm__status adm__status--${c.calidad === 'Apto' ? 'aprobada' : c.calidad === 'En inspección' ? 'pendiente_revision' : 'rechazada'}`}>
                              {c.calidad}
                            </span>
                          </td>
                          <td data-label="Acciones">
                            <div className="adm__table-actions">
                              <button type="button" className="adm__icon-btn" onClick={() => setModal({ type: 'cylinder', item: c })} aria-label={`Editar ${c.codigoLote}`}>
                                <i className="bi bi-pencil" />
                              </button>
                              <button type="button" className="adm__icon-btn adm__icon-btn--danger" onClick={() => handleDelete('cylinder', c.id, c.codigoLote)} aria-label={`Eliminar ${c.codigoLote}`}>
                                <i className="bi bi-trash" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {tab === 'locales' && (
            <section className="adm__view" aria-labelledby="cmp-loc-title">
              <div className="adm__section-head">
                <div>
                  <h1 id="cmp-loc-title">Locales de dispensa y cobertura</h1>
                  <p>Gestiona tus puntos de venta en `locales_dispensa` con Google Maps.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setModal({ type: 'location', item: null })}
                >
                  <i className="bi bi-plus-lg" /> Nuevo local
                </button>
              </div>

              <div className="adm__table-wrap">
                {locations.length === 0 ? (
                  <p className="adm__empty">Aún no hay locales registrados en BD.</p>
                ) : (
                  <table className="adm__table">
                    <thead>
                      <tr>
                        <th>Local</th>
                        <th>Zona / Ciudad</th>
                        <th>Dirección y Google Maps</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((loc) => (
                        <tr key={loc.id}>
                          <td data-label="Local"><strong>{loc.nombreLocal}</strong></td>
                          <td data-label="Zona">{loc.zona ? `${loc.zona} · ` : ''}{loc.ciudad}</td>
                          <td data-label="Dirección">
                            <div>
                              <div>{loc.direccion}</div>
                              <a
                                href={mapsUrl(loc.direccion, loc.coords)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="adm__map-link"
                              >
                                <i className="bi bi-geo-alt-fill" /> Ver en Google Maps
                              </a>
                            </div>
                          </td>
                          <td data-label="Estado">
                            <span className={`adm__status adm__status--${loc.estado === 'activo' ? 'aprobada' : 'rechazada'}`}>
                              {loc.estado}
                            </span>
                          </td>
                          <td data-label="Acciones">
                            <div className="adm__table-actions">
                              <button type="button" className="adm__icon-btn" onClick={() => setModal({ type: 'location', item: loc })} aria-label={`Editar ${loc.nombreLocal}`}>
                                <i className="bi bi-pencil" />
                              </button>
                              <button type="button" className="adm__icon-btn adm__icon-btn--danger" onClick={() => handleDelete('location', loc.id, loc.nombreLocal)} aria-label={`Eliminar ${loc.nombreLocal}`}>
                                <i className="bi bi-trash" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {tab === 'repartidores' && (
            <section className="adm__view" aria-labelledby="cmp-drv-title">
              <div className="adm__section-head">
                <div>
                  <h1 id="cmp-drv-title">Repartidores y unidades</h1>
                  <p>Unidades registradas en `vehiculos_reparto`.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setModal({ type: 'driver', item: null })}
                >
                  <i className="bi bi-plus-lg" /> Nuevo repartidor
                </button>
              </div>

              <div className="adm__table-wrap">
                {drivers.length === 0 ? (
                  <p className="adm__empty">Aún no hay repartidores registrados en BD.</p>
                ) : (
                  <table className="adm__table">
                    <thead>
                      <tr>
                        <th>Repartidor</th>
                        <th>Placa</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map((d) => (
                        <tr key={d.id}>
                          <td data-label="Repartidor">
                            <div>
                              <strong>{d.nombre}</strong>
                              <div className="adm__cell-sub">{d.telefono}</div>
                            </div>
                          </td>
                          <td data-label="Placa" className="adm__num">{d.placa}</td>
                          <td data-label="Estado">
                            <span className={`adm__status adm__status--${d.estado === 'Disponible' ? 'aprobada' : 'rechazada'}`}>
                              {d.estado}
                            </span>
                          </td>
                          <td data-label="Acciones">
                            <div className="adm__table-actions">
                              <button type="button" className="adm__icon-btn" onClick={() => setModal({ type: 'driver', item: d })} aria-label={`Editar ${d.nombre}`}>
                                <i className="bi bi-pencil" />
                              </button>
                              <button type="button" className="adm__icon-btn adm__icon-btn--danger" onClick={() => handleDelete('driver', d.id, d.nombre)} aria-label={`Eliminar ${d.nombre}`}>
                                <i className="bi bi-trash" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      <CompanyModal
        modal={modal}
        onClose={() => setModal(null)}
        onSave={handleSave}
        locations={locations}
        drivers={drivers}
      />

      {toast && (
        <div className="adm-toast" role="status" aria-live="polite">
          <i className="bi bi-check-circle-fill" />
          <span>{toast.texto}</span>
        </div>
      )}
    </div>
  )
}
