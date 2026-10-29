import { useState } from 'react'
import './RolesSection.css'

const ROLES_DATA = [
  {
    id: 'admin',
    num: '01',
    role: 'Administrador del Sistema',
    badge: 'CONTROL TOTAL',
    badgeClass: 'solid-badge--amber',
    icon: 'bi-person-gear',
    summary: 'Visión estratégica y control global de plantas, flota, inventario general y cumplimiento normativo.',
    features: [
      'Dashboard ejecutivo con KPIs de despacho y rentabilidad en tiempo real.',
      'Gestión de usuarios y asignación de permisos según perfil y sede.',
      'Reportes automatizados para entes reguladores de hidrocarburos.',
      'Auditoría inmutable de logs en el sistema oficial.',
    ],
    techStack: 'Autenticación Criptográfica · Telemetría en Vivo',
    previewUi: 'Dashboard Analytics · Reporte General · Métricas de Plantas',
  },
  {
    id: 'supervisor',
    num: '02',
    role: 'Supervisor de Calidad ISO',
    badge: 'NORMATIVA & CALIDAD',
    badgeClass: 'solid-badge--jade',
    icon: 'bi-patch-check-fill',
    summary: 'Aprobación de lotes de envasado, certificación de pruebas hidrostáticas y auditoría de válvulas.',
    features: [
      'Registro de pruebas de presión hidrostática a 14.7 bar por lote.',
      'Emisión de certificados digitales de conformidad bajo norma ISO 4706.',
      'Bloqueo preventivo de cilindros con deformaciones o anomalías.',
      'Inspección de espesor de chapa y calibración de tara.',
    ],
    techStack: 'POST /calidad/pruebas · Módulo de Conformidad ISO',
    previewUi: 'Aprobación de Lotes · Certificados ISO · Auditoría de Válvulas',
  },
  {
    id: 'despachador',
    num: '03',
    role: 'Despachador en Ruta',
    badge: 'OPERACIÓN EN CAMPO',
    badgeClass: 'solid-badge--jade',
    icon: 'bi-truck',
    summary: 'App móvil ligera para choferes y repartidores: navegación GPS, escaneo de salidas y confirmación.',
    features: [
      'Check-in rápido de cilindros cargados mediante escaneo masivo de QR.',
      'Optimización de paradas con cálculo de tráfico y ruta más corta.',
      'Confirmación de entrega con firma digital y verificación del cliente.',
      'Reporte inmediato de cilindros averiados o devueltos en ruta.',
    ],
    techStack: 'App Móvil PWA · GPS WebSocket · POST /despachos/entregar',
    previewUi: 'Ruta Activa · Lector QR Cámara · Firma Digital de Entrega',
  },
  {
    id: 'usuario',
    num: '04',
    role: 'Usuario Común / Ciudadano',
    badge: 'TRANSPARENCIA TOTAL',
    badgeClass: 'solid-badge--jade',
    icon: 'bi-person-check-fill',
    summary: 'Acceso público y sin barreras: pedidos en un clic y escaneo del código QR de su propio balón.',
    features: [
      'Escaneo directo con la cámara del celular para ver la historia del balón.',
      'Solicitud de balón en 30 segundos con pago contra entrega o digital.',
      'Visualización de la llegada del camión repartidor en tiempo real.',
      'Certificado de seguridad descargable para tranquilidad del hogar.',
    ],
    techStack: 'Página Pública /balon/:id · WhatsApp Bot · Notificaciones Web',
    previewUi: 'Visor de Trazabilidad · Estado de Pedido · Certificado PDF',
  },
]

export default function RolesSection() {
  const [selectedRole, setSelectedRole] = useState('admin')
  const activeRole = ROLES_DATA.find((r) => r.id === selectedRole) || ROLES_DATA[0]

  return (
    <section className="px-roles section--white" id="roles">
      <div className="container">
        {/* Cabecera */}
        <div className="px-roles__header">
          <div className="section-tag">
            <span className="section-tag__num">04</span>
            <span>Ecosistema de Roles</span>
          </div>
          <h2 className="section-title">Una arquitectura pensada para cada perfil de la cadena.</h2>
          <p className="section-desc">
            Desde la alta dirección hasta el ciudadano en su hogar. Interfaces dedicadas con niveles de acceso estrictos y sincronización en tiempo real.
          </p>
        </div>

        {/* Roles Selector estilo PROGEX */}
        <div className="px-roles__grid">
          {ROLES_DATA.map((item) => (
            <div
              key={item.id}
              className={`px-roles__card solid-card ${selectedRole === item.id ? 'px-roles__card--active' : ''}`}
              onClick={() => setSelectedRole(item.id)}
            >
              <div className="px-roles__card-top">
                <span className="px-roles__card-num">{item.num}</span>
                <span className={`solid-badge ${item.badgeClass}`}>{item.badge}</span>
              </div>

              <div className="px-roles__card-icon-wrap">
                <i className={`bi ${item.icon}`} />
              </div>

              <h3 className="px-roles__card-title">{item.role}</h3>
              <p className="px-roles__card-summary">{item.summary}</p>

              <div className="px-roles__card-indicator">
                <span>{selectedRole === item.id ? 'Ver detalles activos' : 'Click para explorar'}</span>
                <i className="bi bi-arrow-right" />
              </div>
            </div>
          ))}
        </div>

        {/* Visor de Rol Seleccionado (Detalle Expandido) */}
        <div className="px-roles__detail solid-card">
          <div className="px-roles__detail-header">
            <div>
              <div className="px-roles__detail-sub">CAPACIDADES DEL PERFIL</div>
              <h3 className="px-roles__detail-title">{activeRole.role}</h3>
            </div>
            <span className={`solid-badge ${activeRole.badgeClass}`}>{activeRole.badge}</span>
          </div>

          <div className="px-roles__detail-body">
            <div className="px-roles__detail-col">
              <h4 className="px-roles__detail-h4">Funciones y Permisos Operativos:</h4>
              <ul className="px-roles__feature-list">
                {activeRole.features.map((feat) => (
                  <li key={feat} className="px-roles__feature-item">
                    <i className="bi bi-shield-fill-check text-jade" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-roles__detail-col">
              <h4 className="px-roles__detail-h4">Tecnología y Microservicios:</h4>
              <div className="px-roles__tech-box">
                <div className="px-roles__tech-row">
                  <span className="px-roles__tech-label">Integración Backend:</span>
                  <code className="px-roles__tech-code">{activeRole.techStack}</code>
                </div>
                <div className="px-roles__tech-row">
                  <span className="px-roles__tech-label">Vistas del Sistema:</span>
                  <span className="px-roles__tech-val">{activeRole.previewUi}</span>
                </div>
                <div className="px-roles__tech-row">
                  <span className="px-roles__tech-label">Seguridad de Datos:</span>
                  <span className="px-roles__tech-val">Registro Inmutable Cifrado (Acceso por rol)</span>
                </div>
              </div>

              <div className="px-roles__cta-box">
                <a href="#contacto" className="btn btn-primary btn-sm">
                  <span>Solicitar Demo de este Módulo</span>
                  <i className="bi bi-arrow-right" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
