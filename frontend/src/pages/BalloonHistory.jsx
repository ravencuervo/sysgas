import { useParams, Link } from 'react-router-dom'
import './BalloonHistory.css'

const DEMO_DATA = {
  'demo-001': {
    codigo: 'GD-2024-00142',
    uuid: 'f839a1-2026-c774-4b10-891920',
    tipo: '10 kg Familiar',
    planta: 'Planta Envasadora Central A · Bahía 04',
    tara: '11.45 kg',
    pesoBruto: '21.45 kg',
    estado: 'EN RUTA DE ENTREGA',
    fechaLlenado: '12 Oct 2026 · 08:14 AM',
    operadorLlenado: 'Ing. Carlos Morales · Lic. GLP-884',
    eventos: [
      {
        fecha: '12/10/2026 08:14',
        evento: 'Llenado y Control de Tara',
        detalle: 'Carga computarizada de 10.00 kg netos de propano/butano. Báscula calibrada #B-04.',
        operador: 'Ing. Carlos Morales (Planta Central)',
        icono: 'bi-droplet-fill',
        ok: true,
      },
      {
        fecha: '14/10/2026 10:30',
        evento: 'Prueba de Presión Hidrostática',
        detalle: 'Presión aplicada de 14.7 bar durante 60 segundos. Deformación permanente: 0.00%. APROBADO.',
        operador: 'Inspector de Ensayos No Destructivos',
        icono: 'bi-speedometer2',
        ok: true,
      },
      {
        fecha: '14/10/2026 11:15',
        evento: 'Certificación de Calidad ISO 4706',
        detalle: 'Inspección de cordón de soldadura por ultrasonido. Válvula de alivio calibrada a 24 bar.',
        operador: 'Supervisor ISO: T. Gómez · Acta #ISO-4706-9912',
        icono: 'bi-patch-check-fill',
        ok: true,
      },
      {
        fecha: '20/10/2026 07:00',
        evento: 'Ingreso a Almacén & Asignación QR',
        detalle: 'Placa con QR inmutable remachada al collarín y vinculada en el registro oficial digital.',
        operador: 'Jefe de Patio y Logística',
        icono: 'bi-qr-code',
        ok: true,
      },
      {
        fecha: '28/10/2026 08:45',
        evento: 'Despacho y Carga a Vehículo',
        detalle: 'Salida de planta en camión GLP-03 con precinto de seguridad #PR-7721.',
        operador: 'Despachador en Ruta: J. Pérez',
        icono: 'bi-truck',
        ok: true,
      },
      {
        fecha: '28/10/2026 14:10',
        evento: 'Telemetría en Vivo de Aproximación',
        detalle: 'Vehículo a 850 metros del domicilio de destino. Hora estimada de llegada: 14:35.',
        operador: 'Sensor GPS en tiempo real',
        icono: 'bi-geo-alt-fill',
        ok: null,
      },
    ],
    certificados: [
      {
        norma: 'ISO 9001:2015',
        descripcion: 'Sistema de Gestión de Calidad en Envasado y Distribución',
        codigoCert: 'CERT-SGC-2026-081',
        estado: 'VIGENTE & APROBADO',
      },
      {
        norma: 'ISO 4706',
        descripcion: 'Cilindros de gas de acero soldados recargables para GLP',
        codigoCert: 'CERT-REC-2026-944',
        estado: 'VIGENTE & APROBADO',
      },
      {
        norma: 'NTC 522-1',
        descripcion: 'Reglamento Técnico Colombiano de Recipientes a Presión',
        codigoCert: 'RUT-MINMINAS-2026',
        estado: 'CONFORME',
      },
    ],
  },
}

export default function BalloonHistory() {
  const { qrId } = useParams()
  const data = DEMO_DATA[qrId]

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
            <span>CERTIFICADO OFICIAL VERIFICADO</span>
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
              Cada hito ha sido firmado digitalmente por los supervisores y operadores de la planta.
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
                <h3 className="px-bh__side-title">Ficha Técnica de Envasado</h3>
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
                  <span>Planta de Envasado</span>
                  <span>{data.planta}</span>
                </div>
                <div className="px-bh__spec-row">
                  <span>Operador de Llenado</span>
                  <span>{data.operadorLlenado}</span>
                </div>
              </div>

              <div className="px-bh__side-footer">
                <a
                  href="#contacto"
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
