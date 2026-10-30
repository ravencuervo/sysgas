import { friendlyError } from '../lib/forms'
import { useEffect, useState } from 'react'
import { db } from '../lib/supabase'
import { useParams, Link } from 'react-router-dom'
import './BalloonHistory.css'

export default function BalloonHistory() {
  const { qrId } = useParams()
  const [result, setResult] = useState({ loading: true, data: null, error: '' })
  useEffect(() => {
    let active = true
    dbLoad()
    async function dbLoad() {
      try {
        await Promise.resolve()
        if (active) setResult({ loading: true, data: null, error: '' })
        const { data, error } = await db().rpc('pasaporte_publico', { p_codigo: qrId })
        if (error) throw error
        if (active) setResult({ loading: false, data, error: '' })
      } catch (e) { if (active) setResult({ loading: false, data: null, error: friendlyError(e) }) }
    }
    return () => { active = false }
  }, [qrId])
  const { data, loading, error } = result
  if (loading) return <main className="container" role="status">Consultando historial…</main>
  if (error) return <main className="container" role="alert">{error} <Link to="/">Volver</Link></main>

  if (!data) {
    return (
      <div className="px-bh__notfound section--dark">
        <div className="container px-bh__notfound-box solid-card">
          <i className="bi bi-shield-exclamation text-amber px-bh__notfound-icon" />
          <h2>Cilindro No Encontrado</h2>
          <p>El código QR <code>{qrId}</code> no corresponde a un balón registrado en la red oficial de SYSGAS.</p>
          <Link to="/" className="btn btn-primary">
            <i className="bi bi-arrow-left" />
            <span>Volver a SYSGAS</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-bh section--white">
      {/* Header Superior estilo PROGEX */}
      <header className="px-bh__header">
        <div className="container px-bh__header-inner">
          <Link to="/" className="btn btn-secondary btn-sm">
            <i className="bi bi-arrow-left" />
            <span>Volver a SYSGAS</span>
          </Link>

          <div className="status-pill">
            <span className="status-dot" />
            <span>REGISTRO DE TRAZABILIDAD</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-bh__main">
        {/* Banner del Balón */}
        <div className="px-bh__banner solid-card">
          <div className="px-bh__banner-left">
            <div className="px-bh__qr-badge">
              <i className="bi bi-qr-code" />
            </div>
            <div>
              <div className="section-tag" style={{ marginBottom: 4 }}>
                <span className="section-tag__num">BALÓN #{data.codigo}</span>
                <span>{data.tipo}</span>
              </div>
              <h1 className="px-bh__title">Hoja de Trazabilidad e Historial Inmutable</h1>
              <p className="px-bh__meta-uuid">Código Único de Trazabilidad: <code>{data.uuid}</code></p>
            </div>
          </div>

          <div className="px-bh__banner-right">
            <span className="solid-badge solid-badge--jade px-bh__status-badge">
              <span className="status-dot" />
              {data.estado}
            </span>
          </div>
        </div>

        {/* Grid de 2 Columnas: Eventos vs Ficha Técnica */}
        <div className="px-bh__grid">
          {/* Columna Izquierda: Historial de Eventos */}
          <section className="px-bh__events-card solid-card">
            <div className="px-bh__section-title-wrap">
              <i className="bi bi-clock-history text-jade" />
              <h2 className="px-bh__section-title">Cadena de Custodia &amp; Eventos Registrados</h2>
            </div>
            <p className="px-bh__section-desc">
              Eventos registrados en la base de datos de SYSGAS.
            </p>

            <div className="px-bh__timeline">
              {data.eventos.map((ev, idx) => (
                <div key={idx} className="px-bh__ev">
                  <div className="px-bh__ev-left">
                    <div className="px-bh__ev-icon-wrap">
                      <i className={`bi ${ev.icono}`} />
                    </div>
                    {idx < data.eventos.length - 1 && <div className="px-bh__ev-vline" />}
                  </div>

                  <div className="px-bh__ev-body">
                    <div className="px-bh__ev-top">
                      <h3 className="px-bh__ev-title">{ev.evento}</h3>
                      {ev.ok === true && (
                        <span className="solid-badge solid-badge--jade">
                          <i className="bi bi-check2" /> APROBADO
                        </span>
                      )}
                      {ev.ok === false && <span className="solid-badge solid-badge--amber">NO CONFORME</span>}
                      {ev.ok === null && (
                        <span className="solid-badge solid-badge--amber">
                          <i className="bi bi-clock" /> EN CURSO
                        </span>
                      )}
                    </div>

                    <p className="px-bh__ev-detail">{ev.detalle}</p>

                    <div className="px-bh__ev-meta">
                      <span><i className="bi bi-person-fill text-jade" /> {ev.operador}</span>
                      <span><i className="bi bi-calendar3 text-jade" /> {ev.fecha}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Columna Derecha: Certificaciones y Ficha de Tara */}
          <aside className="px-bh__sidebar">
            {/* Certificados ISO */}
            <div className="px-bh__side-card solid-card">
              <div className="px-bh__section-title-wrap">
                <i className="bi bi-patch-check-fill text-jade" />
                <h3 className="px-bh__side-title">Certificaciones ISO</h3>
              </div>

              <div className="px-bh__iso-list">
                {data.certificados.map((c) => (
                  <div key={c.norma} className="px-bh__iso-item">
                    <div className="px-bh__iso-top">
                      <strong>{c.norma}</strong>
                      <span className="solid-badge solid-badge--jade">{c.estado}</span>
                    </div>
                    <p className="px-bh__iso-desc">{c.descripcion}</p>
                    <span className="px-bh__iso-cert">Registro: {c.codigoCert}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ficha Técnica del Cilindro */}
            <div className="px-bh__side-card solid-card" style={{ marginTop: 24 }}>
              <div className="px-bh__section-title-wrap">
                <i className="bi bi-info-circle-fill text-jade" />
                <h3 className="px-bh__side-title">Ficha técnica del balón</h3>
              </div>

              <div className="px-bh__specs-list">
                <div className="px-bh__spec-row">
                  <span>Capacidad GLP</span>
                  <strong>{data.tipo}</strong>
                </div>
                <div className="px-bh__spec-row">
                  <span>Tara del Cilindro</span>
                  <strong>{data.tara}</strong>
                </div>
                <div className="px-bh__spec-row">
                  <span>Peso Bruto Despachado</span>
                  <strong className="text-jade">{data.pesoBruto}</strong>
                </div>
                <div className="px-bh__spec-row">
                  <span>Empresa responsable</span>
                  <span>{data.planta}</span>
                </div>
                <div className="px-bh__spec-row"><span>Último llenado registrado</span><span>{data.fechaLlenado || 'Sin registro'}</span></div>
                <div className="px-bh__spec-row">
                  <span>Operador de Llenado</span>
                  <span>{data.operadorLlenado}</span>
                </div>
              </div>

              <div className="px-bh__side-footer">
                <a
                  href="/#contacto"
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                >
                  <i className="bi bi-arrow-repeat" />
                  <span>Pedir Reposición de este Balón</span>
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
