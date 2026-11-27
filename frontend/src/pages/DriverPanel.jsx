import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api.js'
import { db } from '../lib/supabase.js'
import { mapBatch, mapNotification, mapOrder } from '../lib/mappers.js'
import { mapsUrl } from './admin/adminData.js'
import './AdminPanel.css'

const NAV_ITEMS = [
  { id: 'entregas', icon: 'bi-truck', label: 'Mis entregas' },
  { id: 'carga', icon: 'bi-box-seam', label: 'Lotes en planta' },
  { id: 'historial', icon: 'bi-check2-circle', label: 'Entregados' },
  { id: 'incidencias', icon: 'bi-exclamation-triangle', label: 'Incidencias' },
]

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  asignado_chofer: 'Asignado',
  en_camino: 'En ruta',
  en_puerta_pesaje: 'En puerta (pesaje)',
  entregado: 'Entregado',
}

export default function DriverPanel() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('entregas')
  const [deliveries, setDeliveries] = useState([])
  const [loadBatches, setLoadBatches] = useState([])
  const [incidents, setIncidents] = useState([])
  const [notifications, setNotifications] = useState([])

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [weighModal, setWeighModal] = useState(null)
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState(null)

  function notify(text) {
    const id = `DN-${Date.now()}`
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
      setDeliveries((data.pedidos || []).map(mapOrder))
      setLoadBatches((data.lotes || []).map((b) => mapBatch(b, [])))
      setIncidents(data.incidencias || [])
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

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setWeighModal(null)
        setIncidentOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function advanceStatus(order, nextState) {
    try {
      await apiFetch(`/api/admin/pedidos/${order.id}`, {
        method: 'PATCH',
        body: { estado: nextState },
      })
      notify(`Pedido ${order.ticket} actualizado a: ${STATUS_LABELS[nextState] || nextState}`)
      await loadData()
    } catch (err) {
      notify(`Error: ${err.message}`)
    }
  }

  async function completeDelivery(e) {
    e.preventDefault()
    if (!weighModal) return
    const raw = Object.fromEntries(new FormData(e.currentTarget))
    const tara = Number(raw.taraKg)
    const bruto = Number(raw.pesoBrutoKg)
    const neto = Number((bruto - tara).toFixed(1))

    try {
      await apiFetch(`/api/admin/pedidos/${weighModal.id}`, {
        method: 'PATCH',
        body: {
          estado: 'entregado',
          metodo_pago: String(raw.metodoPago || 'Efectivo'),
          vacio_recuperado: Boolean(raw.vacioRecuperado),
          tara_entrega_kg: tara,
          peso_bruto_entrega_kg: bruto,
          peso_neto_entrega_kg: neto,
        },
      })
      notify(`Entrega confirmada en BD: ${weighModal.ticket} · Neto ${neto} kg`)
      setWeighModal(null)
      await loadData()
    } catch (err) {
      notify(`Error: ${err.message}`)
    }
  }

  async function saveIncident(e) {
    e.preventDefault()
    const raw = Object.fromEntries(new FormData(e.currentTarget))
    try {
      await apiFetch('/api/incidencias', {
        method: 'POST',
        body: {
          tipo: String(raw.tipo),
          descripcion: `${raw.ticket ? `[${raw.ticket}] ` : ''}${String(raw.detalle).trim()}`,
          estado: 'abierta',
        },
      })
      setIncidentOpen(false)
      notify(`Incidencia guardada en BD: ${raw.tipo}`)
      await loadData()
    } catch (err) {
      notify(`Error: ${err.message}`)
    }
  }

  const activeDeliveries = deliveries.filter((d) => !['entregado', 'cancelado'].includes(d.estado))
  const completedDeliveries = deliveries.filter((d) => d.estado === 'entregado')
  const unreadCount = notifications.filter((n) => !n.leida).length

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
          <p className="adm__role-tag">Panel de Repartidor</p>

          <nav className="adm__nav" aria-label="Menú del repartidor">
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
                {item.id === 'entregas' && (
                  <strong className="adm__nav-count">{activeDeliveries.length}</strong>
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
              <span>Repartidor SYSGAS</span>
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
                aria-label="Notificaciones del repartidor"
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

          {tab === 'entregas' && (
            <section className="adm__view" aria-labelledby="drv-entregas-title">
              <div className="adm__section-head">
                <div>
                  <h1 id="drv-entregas-title">Entregas en curso</h1>
                  <p>Pedidos activos desde `pedidos` en Supabase con ruta Google Maps y pesaje.</p>
                </div>
              </div>

              <div className="adm__metrics">
                <div className="adm__metric">
                  <span>Pendientes / en ruta</span>
                  <strong>{activeDeliveries.length}</strong>
                </div>
                <div className="adm__metric">
                  <span>Entregados</span>
                  <strong>{completedDeliveries.length}</strong>
                </div>
                <div className="adm__metric">
                  <span>Cobrado</span>
                  <strong>
                    S/ {completedDeliveries.reduce((acc, d) => acc + Number(d.totalPen || 0), 0).toFixed(2)}
                  </strong>
                </div>
                <div className="adm__metric">
                  <span>Lotes en BD</span>
                  <strong>{loadBatches.length}</strong>
                </div>
              </div>

              <div className="adm__list">
                {activeDeliveries.length === 0 ? (
                  <p className="adm__empty">No hay entregas pendientes en la base de datos.</p>
                ) : (
                  activeDeliveries.map((d) => (
                    <div key={d.id} className="adm__row">
                      <div className="adm__row-main">
                        <div className="adm__row-title">
                          <strong className="adm__num">{d.ticket}</strong>
                          <span>· {d.cliente}</span>
                          <span className={`adm__status adm__status--${d.estado === 'en_puerta_pesaje' ? 'pendiente_revision' : 'en_evaluacion'}`}>
                            {STATUS_LABELS[d.estado] || d.estado}
                          </span>
                        </div>
                        <p className="adm__row-meta">
                          {d.direccion} {d.referencia ? `(${d.referencia})` : ''} · <strong className="adm__num">{d.cantidad} × {d.capacidad}</strong> · <strong className="adm__num">S/ {d.totalPen.toFixed(2)}</strong>
                        </p>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '6px' }}>
                          <a
                            href={mapsUrl(d.direccion, d.coords)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="adm__map-link"
                          >
                            <i className="bi bi-geo-alt-fill" /> Abrir ruta en Google Maps
                          </a>
                          <a href={`tel:${d.telefono}`} className="adm__map-link">
                            <i className="bi bi-telephone-fill" /> Llamar ({d.telefono})
                          </a>
                        </div>
                      </div>

                      <div className="adm__row-actions" style={{ flexWrap: 'wrap' }}>
                        {(d.estado === 'pendiente' || d.estado === 'asignado_chofer') && (
                          <button type="button" className="btn btn-primary" onClick={() => advanceStatus(d, 'en_camino')}>
                            Iniciar ruta
                          </button>
                        )}
                        {d.estado === 'en_camino' && (
                          <button type="button" className="btn btn-secondary" onClick={() => advanceStatus(d, 'en_puerta_pesaje')}>
                            Llegué al domicilio
                          </button>
                        )}
                        <button type="button" className="btn btn-primary" onClick={() => setWeighModal(d)}>
                          Registrar peso y entregar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {tab === 'carga' && (
            <section className="adm__view" aria-labelledby="drv-carga-title">
              <div className="adm__section-head">
                <div>
                  <h1 id="drv-carga-title">Lotes registrados en BD</h1>
                  <p>Resumen de lotes disponibles (`lotes_balones`) por capacidad y movimiento.</p>
                </div>
              </div>

              <div className="adm__table-wrap">
                {loadBatches.length === 0 ? (
                  <p className="adm__empty">Aún no hay lotes en `lotes_balones`.</p>
                ) : (
                  <table className="adm__table">
                    <thead>
                      <tr>
                        <th>Código de lote</th>
                        <th>Capacidad</th>
                        <th>Cantidad</th>
                        <th>Movimiento</th>
                        <th>Peso total</th>
                        <th>Calidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadBatches.map((b) => (
                        <tr key={b.id}>
                          <td data-label="Lote" className="adm__num"><strong>{b.codigoLote}</strong></td>
                          <td data-label="Capacidad" className="adm__num">{b.capacidad}</td>
                          <td data-label="Cantidad" className="adm__num">{b.cantidad}</td>
                          <td data-label="Movimiento">{b.movimiento}</td>
                          <td data-label="Peso total" className="adm__num"><strong>{b.pesoBrutoKg} kg</strong></td>
                          <td data-label="Calidad">
                            <span className={`adm__status adm__status--${b.calidad === 'Apto' ? 'aprobada' : 'pendiente_revision'}`}>
                              {b.calidad}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {tab === 'historial' && (
            <section className="adm__view" aria-labelledby="drv-hist-title">
              <div className="adm__section-head">
                <div>
                  <h1 id="drv-hist-title">Entregas completadas</h1>
                  <p>Pedidos entregados registrados en Supabase.</p>
                </div>
              </div>

              <div className="adm__table-wrap">
                {completedDeliveries.length === 0 ? (
                  <p className="adm__empty">Todavía no hay entregas completadas en la base de datos.</p>
                ) : (
                  <table className="adm__table">
                    <thead>
                      <tr>
                        <th>Ticket / Cliente</th>
                        <th>Peso (Bruto / Tara / Neto)</th>
                        <th>Cobro</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedDeliveries.map((d) => (
                        <tr key={d.id}>
                          <td data-label="Ticket">
                            <div>
                              <strong className="adm__num">{d.ticket}</strong>
                              <div className="adm__cell-sub">{d.cliente} · {d.direccion}</div>
                            </div>
                          </td>
                          <td data-label="Peso" className="adm__num">
                            <span>{d.pesoRegistradoKg} / {d.taraKg} / <strong>{d.pesoNetoKg} kg</strong></span>
                          </td>
                          <td data-label="Cobro" className="adm__num">
                            <span><strong>S/ {d.totalPen.toFixed(2)}</strong> ({d.metodoPago})</span>
                          </td>
                          <td data-label="Estado"><span className="adm__status adm__status--aprobada">Entregado</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {tab === 'incidencias' && (
            <section className="adm__view" aria-labelledby="drv-inc-title">
              <div className="adm__section-head">
                <div>
                  <h1 id="drv-inc-title">Incidencias en ruta</h1>
                  <p>Reportes guardados en la tabla `incidencias` de Supabase.</p>
                </div>
                <button type="button" className="btn btn-primary" onClick={() => setIncidentOpen(true)}>
                  <i className="bi bi-plus-lg" /> Nueva incidencia
                </button>
              </div>

              <div className="adm__list">
                {incidents.length === 0 ? (
                  <p className="adm__empty">No hay incidencias registradas en BD.</p>
                ) : (
                  incidents.map((inc) => (
                    <div key={inc.id} className="adm__row">
                      <div className="adm__row-main">
                        <div className="adm__row-title">
                          <strong>{inc.tipo}</strong>
                          <span className="adm__status adm__status--pendiente_revision">{inc.estado}</span>
                        </div>
                        <p className="adm__row-meta">{inc.descripcion}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {weighModal && (
        <div
          className="adm-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setWeighModal(null)
          }}
        >
          <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="weigh-modal-title">
            <div className="adm-modal__head">
              <h2 id="weigh-modal-title">Registrar pesaje y entrega ({weighModal.ticket})</h2>
              <button type="button" className="adm-modal__close" onClick={() => setWeighModal(null)} aria-label="Cerrar modal">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <form className="adm-modal__form" onSubmit={completeDelivery}>
              <label>
                Método de cobro (S/ {weighModal.totalPen.toFixed(2)})
                <select name="metodoPago" defaultValue={weighModal.metodoPago}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Yape">Yape</option>
                  <option value="Plin">Plin</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </label>
              <label>
                Tara del balón (kg)
                <input name="taraKg" type="number" step="0.1" min="0" defaultValue={weighModal.taraKg} required />
              </label>
              <label className="adm-modal__full">
                Peso bruto en balanza (kg)
                <input
                  name="pesoBrutoKg"
                  type="number"
                  step="0.1"
                  min="1"
                  defaultValue={weighModal.capacidad === '45 kg' ? 83.4 : weighModal.capacidad === '5 kg' ? 11.1 : 21.2}
                  required
                />
              </label>
              <label className="adm-modal__full" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <input name="vacioRecuperado" type="checkbox" defaultChecked style={{ width: 'auto' }} />
                <span>Balón vacío recuperado del cliente</span>
              </label>
              <div className="adm-modal__actions">
                <button type="button" className="btn btn-secondary" onClick={() => setWeighModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Confirmar entrega</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {incidentOpen && (
        <div
          className="adm-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIncidentOpen(false)
          }}
        >
          <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="inc-modal-title">
            <div className="adm-modal__head">
              <h2 id="inc-modal-title">Registrar incidencia</h2>
              <button type="button" className="adm-modal__close" onClick={() => setIncidentOpen(false)} aria-label="Cerrar modal">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <form className="adm-modal__form" onSubmit={saveIncident}>
              <label>
                Tipo de incidencia
                <select name="tipo" required>
                  <option value="Cliente ausente">Cliente ausente en domicilio</option>
                  <option value="Válvula o precinto observado">Válvula o precinto observado</option>
                  <option value="Dirección incorrecta">Dirección no coincide en mapa</option>
                  <option value="Otro">Otro</option>
                </select>
              </label>
              <label>
                Pedido relacionado
                <select name="ticket">
                  <option value="">General / Unidad</option>
                  {deliveries.map((d) => (
                    <option key={d.id} value={d.ticket}>{d.ticket} · {d.cliente}</option>
                  ))}
                </select>
              </label>
              <label className="adm-modal__full">
                Detalle de lo ocurrido
                <input name="detalle" required maxLength={240} placeholder="Describe brevemente la novedad" />
              </label>
              <div className="adm-modal__actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIncidentOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar en BD</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="adm-toast" role="status" aria-live="polite">
          <i className="bi bi-check-circle-fill" />
          <span>{toast.texto}</span>
        </div>
      )}
    </div>
  )
}
