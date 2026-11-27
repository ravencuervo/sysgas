import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api.js'
import { db } from '../lib/supabase.js'
import {
  mapAffiliation,
  mapBatch,
  mapDriver,
  mapLocation,
  mapNotification,
  mapOrder,
} from '../lib/mappers.js'
import HeroWaveGrid from '../components/HeroWaveGrid.jsx'
import AdminCharts from './admin/AdminCharts.jsx'
import AdminCrudModal from './admin/AdminCrudModal.jsx'
import { mapsUrl } from './admin/adminData.js'
import './AdminPanel.css'

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'bi-bar-chart-line', label: 'Dashboard y reportes' },
  { id: 'afiliaciones', icon: 'bi-buildings', label: 'Afiliaciones' },
  { id: 'locales', icon: 'bi-geo-alt', label: 'Locales y distribuidoras' },
  { id: 'balones', icon: 'bi-qr-code', label: 'Lotes de balones' },
  { id: 'pedidos', icon: 'bi-receipt', label: 'Pedidos y entregas' },
  { id: 'repartidores', icon: 'bi-truck', label: 'Vehículos y flota' },
]

const AFF_STATUS = {
  pendiente_revision: 'Pendiente de revisión',
  contactado: 'Contactado',
  aprobada_activa: 'Aprobada',
  rechazada: 'Rechazada',
}

const ORDER_STATUS = {
  pendiente: 'Pendiente',
  asignado_chofer: 'Asignado',
  en_camino: 'En ruta',
  en_puerta_pesaje: 'En puerta',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export default function AdminPanel() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('dashboard')
  const [affiliations, setAffiliations] = useState([])
  const [locations, setLocations] = useState([])
  const [cylinders, setCylinders] = useState([])
  const [orders, setOrders] = useState([])
  const [drivers, setDrivers] = useState([])
  const [notifications, setNotifications] = useState([])

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [reviewId, setReviewId] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')

  function notify(text) {
    const id = `N-${Date.now()}`
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
      setAffiliations((data.afiliaciones || []).map(mapAffiliation))
      setCylinders((data.lotes || []).map((b) => mapBatch(b, locs)))
      setOrders((data.pedidos || []).map(mapOrder))
      setDrivers((data.vehiculos || []).map((v) => mapDriver(v, locs)))
      setNotifications((data.notificaciones || []).map(mapNotification))
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

  const visibleAffiliations = useMemo(() => {
    const q = search.trim().toLowerCase()
    return affiliations.filter((row) => {
      if (filter && row.estado !== filter) return false
      if (!q) return true
      return `${row.empresa} ${row.representante} ${row.ciudad} ${row.correo}`.toLowerCase().includes(q)
    })
  }, [affiliations, filter, search])

  async function handleSaveCrud(type, raw, editId) {
    try {
      if (type === 'location') {
        const body = {
          nombre_local: raw.nombreLocal,
          tipo: raw.tipo,
          ruc: raw.ruc || null,
          ciudad: raw.ciudad,
          direccion: raw.direccion,
          coordenadas: raw.coords || '',
          estado: raw.estado,
        }
        await apiFetch(editId ? `/api/admin/locales/${editId}` : '/api/admin/locales', {
          method: editId ? 'PATCH' : 'POST',
          body,
        })
        notify(editId ? `Local actualizado: ${raw.nombreLocal}` : `Local registrado: ${raw.nombreLocal}`)
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
          ultima_prueba: raw.ultimaPrueba,
        }
        await apiFetch(editId ? `/api/admin/lotes/${editId}` : '/api/admin/lotes', {
          method: editId ? 'PATCH' : 'POST',
          body,
        })
        notify(editId ? `Lote actualizado: ${raw.codigoLote}` : `Lote registrado: ${raw.codigoLote}`)
      } else if (type === 'order') {
        const body = {
          nombre_destinatario: raw.cliente,
          telefono_contacto: raw.telefono,
          ciudad: raw.ciudad,
          direccion_entrega: raw.direccion,
          coordenadas: raw.coords || '',
          capacidad: raw.capacidad,
          cantidad: Number(raw.cantidad || 1),
          total_pedido_pen: Number(raw.totalPen || 46),
          estado: raw.estado === 'en_ruta' ? 'en_camino' : raw.estado === 'asignado' ? 'asignado_chofer' : raw.estado,
        }
        await apiFetch(editId ? `/api/admin/pedidos/${editId}` : '/api/admin/pedidos', {
          method: editId ? 'PATCH' : 'POST',
          body,
        })
        notify(editId ? `Pedido actualizado: ${raw.cliente}` : `Pedido creado para ${raw.cliente}`)
      } else if (type === 'driver') {
        const body = {
          placa: raw.placa,
          nombre_unidad: raw.nombre,
          chofer_asignado: raw.nombre,
          telefono_conductor: raw.telefono,
          activo: raw.estado !== 'Inactivo',
        }
        await apiFetch(editId ? `/api/admin/vehiculos/${editId}` : '/api/admin/vehiculos', {
          method: editId ? 'PATCH' : 'POST',
          body,
        })
        notify(editId ? `Unidad actualizada: ${raw.placa}` : `Unidad registrada: ${raw.placa}`)
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
        location: `/api/admin/locales/${id}`,
        cylinder: `/api/admin/lotes/${id}`,
        order: `/api/admin/pedidos/${id}`,
        driver: `/api/admin/vehiculos/${id}`,
        affiliation: `/api/admin/afiliaciones/${id}`,
      }
      await apiFetch(endpoints[type], { method: 'DELETE' })
      notify(`Registro eliminado: ${label}`)
      await loadData()
    } catch (err) {
      notify(`Error al eliminar: ${err.message}`)
    }
  }

  async function handleReviewAffiliation(e, row) {
    e.preventDefault()
    const fields = Object.fromEntries(new FormData(e.currentTarget))
    try {
      await apiFetch(`/api/admin/afiliaciones/${row.id}`, {
        method: 'PATCH',
        body: {
          estado: fields.estado,
          ruc: fields.ruc,
          direccion: fields.direccion,
          notas_internas: fields.notas,
        },
      })
      setReviewId(null)
      notify(`Afiliación actualizada: ${row.empresa}`)
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
      <HeroWaveGrid variant="panel" />
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
          <p className="adm__role-tag">Panel de Administración</p>

          <nav className="adm__nav" aria-label="Secciones de administración">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`adm__nav-btn ${tab === item.id ? 'adm__nav-btn--active' : ''}`}
                onClick={() => {
                  setTab(item.id)
                  setSearch('')
                  setFilter('')
                  setMenuOpen(false)
                }}
              >
                <i className={`bi ${item.icon}`} />
                <span>{item.label}</span>
                {item.id === 'afiliaciones' && (
                  <strong className="adm__nav-count">
                    {affiliations.filter((a) => a.estado === 'pendiente_revision').length}
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
              <span>SYSGAS</span>
              <i className="bi bi-chevron-right" />
              <strong>{NAV_ITEMS.find((n) => n.id === tab)?.label}</strong>
            </div>
          </div>

          <div className="adm__topbar-right">
            <button type="button" className="adm__icon-btn" onClick={loadData} aria-label="Actualizar datos" title="Actualizar desde Supabase">
              <i className="bi bi-arrow-clockwise" />
            </button>
            <div className="adm__notif-wrap">
              <button
                type="button"
                className="adm__notif-btn"
                onClick={() => setNotifOpen((o) => !o)}
                aria-label="Notificaciones del sistema"
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
                      <li><p>Sin notificaciones recientes en la base de datos.</p></li>
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
              <span>No se pudo conectar con el backend ({loadError}). Inicia `backend` con `npm run dev`.</span>
            </div>
          )}

          {loading && !loadError && <p role="status">Cargando datos desde Supabase…</p>}

          {tab === 'dashboard' && (
            <section className="adm__view" aria-labelledby="adm-dash-title">
              <div className="adm__section-head">
                <div>
                  <h1 id="adm-dash-title">Dashboard operativo y reportes</h1>
                  <p>Datos en tiempo real desde Supabase: locales, lotes de balones, pedidos y calidad.</p>
                </div>
              </div>

              <div className="adm__metrics">
                <div className="adm__metric">
                  <span>Locales y distribuidoras</span>
                  <strong>{locations.length}</strong>
                </div>
                <div className="adm__metric">
                  <span>Balones en lotes</span>
                  <strong>{cylinders.reduce((acc, c) => acc + Number(c.cantidad || 0), 0)}</strong>
                </div>
                <div className="adm__metric">
                  <span>Pedidos en BD</span>
                  <strong>{orders.length}</strong>
                </div>
                <div className="adm__metric">
                  <span>Facturación en pedidos</span>
                  <strong>S/ {totalSales.toFixed(2)}</strong>
                </div>
              </div>

              <AdminCharts cylinders={cylinders} orders={orders} locations={locations} />
            </section>
          )}

          {tab === 'afiliaciones' && (
            <section className="adm__view" aria-labelledby="adm-afiliaciones-title">
              <div className="adm__section-head">
                <div>
                  <h1 id="adm-afiliaciones-title">Solicitudes de afiliación</h1>
                  <p>Solicitudes reales enviadas desde la landing page a `solicitudes_afiliacion`.</p>
                </div>
              </div>

              <div className="adm__toolbar">
                <input
                  type="search"
                  placeholder="Buscar por empresa, representante o ciudad…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="adm__input"
                />
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="adm__select">
                  <option value="">Todos los estados</option>
                  {Object.entries(AFF_STATUS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="adm__list">
                {visibleAffiliations.length === 0 ? (
                  <p className="adm__empty">No hay solicitudes registradas en la base de datos.</p>
                ) : (
                  visibleAffiliations.map((row) => (
                    <div key={row.id} className="adm__row">
                      <div className="adm__row-main">
                        <div className="adm__row-title">
                          <strong>{row.empresa}</strong>
                          <span className={`adm__status adm__status--${row.estado === 'aprobada_activa' ? 'aprobada' : row.estado === 'contactado' ? 'en_evaluacion' : row.estado}`}>
                            {AFF_STATUS[row.estado] || row.estado}
                          </span>
                        </div>
                        <p className="adm__row-meta">
                          {row.representante} · {row.ciudad} · {row.telefono} · {row.correo}
                        </p>
                        <p className="adm__row-sub">
                          Volumen: <strong>{row.volumen.toLocaleString()} balones/mes</strong> · {row.fecha}
                          {row.notas ? ` · Nota: ${row.notas}` : ''}
                        </p>
                      </div>
                      <div className="adm__row-actions">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setReviewId(reviewId === row.id ? null : row.id)}
                        >
                          {reviewId === row.id ? 'Cerrar' : 'Revisar'}
                        </button>
                        <button
                          type="button"
                          className="adm__icon-btn adm__icon-btn--danger"
                          onClick={() => handleDelete('affiliation', row.id, row.empresa)}
                          aria-label={`Eliminar ${row.empresa}`}
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>

                      {reviewId === row.id && (
                        <form className="adm__review-form" onSubmit={(e) => handleReviewAffiliation(e, row)}>
                          <label>
                            Decisión
                            <select name="estado" defaultValue={row.estado} required>
                              <option value="contactado">Marcar contactado</option>
                              <option value="aprobada_activa">Aprobar y crear empresa</option>
                              <option value="rechazada">Rechazar</option>
                            </select>
                          </label>
                          <label>
                            RUC (al aprobar)
                            <input name="ruc" maxLength={11} placeholder="11 dígitos" />
                          </label>
                          <label>
                            Dirección fiscal (al aprobar)
                            <input name="direccion" maxLength={200} />
                          </label>
                          <label className="adm__review-full">
                            Notas internas
                            <input name="notas" defaultValue={row.notas} maxLength={300} />
                          </label>
                          <div className="adm__review-actions">
                            <button type="submit" className="btn btn-primary">Guardar decisión</button>
                          </div>
                        </form>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {tab === 'locales' && (
            <section className="adm__view" aria-labelledby="adm-locales-title">
              <div className="adm__section-head">
                <div>
                  <h1 id="adm-locales-title">Locales de dispensa y distribuidoras</h1>
                  <p>Gestiona en BD sedes propias, distribuidoras afiliadas, direcciones y puntos Google Maps.</p>
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
                  <p className="adm__empty">Aún no hay locales registrados en `locales_dispensa`.</p>
                ) : (
                  <table className="adm__table">
                    <thead>
                      <tr>
                        <th>Local</th>
                        <th>Tipo</th>
                        <th>RUC</th>
                        <th>Dirección y Google Maps</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((loc) => (
                        <tr key={loc.id}>
                          <td data-label="Local">
                            <div>
                              <strong>{loc.nombreLocal}</strong>
                              <div className="adm__cell-sub">{loc.ciudad}</div>
                            </div>
                          </td>
                          <td data-label="Tipo">{loc.tipo}</td>
                          <td data-label="RUC" className="adm__num">{loc.ruc}</td>
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
                            <span className={`adm__status adm__status--${loc.estado === 'activo' ? 'aprobada' : loc.estado === 'piloto' ? 'en_evaluacion' : 'rechazada'}`}>
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

          {tab === 'balones' && (
            <section className="adm__view" aria-labelledby="adm-balones-title">
              <div className="adm__section-head">
                <div>
                  <h1 id="adm-balones-title">Lotes de balones: entrada, salida por kg y calidad</h1>
                  <p>Registro real en `lotes_balones` por capacidad (`5 kg`, `10 kg`, `45 kg`).</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setModal({ type: 'cylinder', item: null })}
                >
                  <i className="bi bi-plus-lg" /> Registrar lote
                </button>
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

          {tab === 'pedidos' && (
            <section className="adm__view" aria-labelledby="adm-pedidos-title">
              <div className="adm__section-head">
                <div>
                  <h1 id="adm-pedidos-title">Pedidos y entregas</h1>
                  <p>Pedidos reales almacenados en `pedidos` con dirección y Google Maps.</p>
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
                  <p className="adm__empty">Aún no hay pedidos registrados en `pedidos`.</p>
                ) : (
                  <table className="adm__table">
                    <thead>
                      <tr>
                        <th>Ticket / Cliente</th>
                        <th>Dirección y Mapa</th>
                        <th>Pedido</th>
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
                                <i className="bi bi-geo-alt-fill" /> Abrir en Google Maps
                              </a>
                            </div>
                          </td>
                          <td data-label="Pedido" className="adm__num">
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

          {tab === 'repartidores' && (
            <section className="adm__view" aria-labelledby="adm-repartidores-title">
              <div className="adm__section-head">
                <div>
                  <h1 id="adm-repartidores-title">Vehículos y repartidores</h1>
                  <p>Unidades de reparto registradas en `vehiculos_reparto`.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setModal({ type: 'driver', item: null })}
                >
                  <i className="bi bi-plus-lg" /> Nueva unidad
                </button>
              </div>

              <div className="adm__table-wrap">
                {drivers.length === 0 ? (
                  <p className="adm__empty">Aún no hay vehículos registrados en `vehiculos_reparto`.</p>
                ) : (
                  <table className="adm__table">
                    <thead>
                      <tr>
                        <th>Conductor / Unidad</th>
                        <th>Placa</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map((d) => (
                        <tr key={d.id}>
                          <td data-label="Conductor">
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
                              <button type="button" className="adm__icon-btn" onClick={() => setModal({ type: 'driver', item: d })} aria-label={`Editar ${d.placa}`}>
                                <i className="bi bi-pencil" />
                              </button>
                              <button type="button" className="adm__icon-btn adm__icon-btn--danger" onClick={() => handleDelete('driver', d.id, d.placa)} aria-label={`Eliminar ${d.placa}`}>
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

      <AdminCrudModal
        modal={modal}
        onClose={() => setModal(null)}
        onSave={handleSaveCrud}
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
