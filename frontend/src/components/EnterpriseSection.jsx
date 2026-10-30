import { friendlyError } from '../lib/forms'
import { db } from '../lib/supabase'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import EnterpriseTruck3D from './EnterpriseTruck3D.jsx'
import './EnterpriseSection.css'

export default function EnterpriseSection() {
  const [cylinderVolume, setCylinderVolume] = useState(2500)

  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function affiliate(e) {
    e.preventDefault()
    const form = e.currentTarget
    const fields = Object.fromEntries(new FormData(form))
    setBusy(true)
    setMessage('')
    try {
      const { error } = await db().from('solicitudes_afiliacion').insert({ ...fields, volumen_mensual_balones: cylinderVolume })
      if (error) throw error
      setMessage('Solicitud registrada. Nuestro equipo se pondrá en contacto contigo.')
      form.reset()
    } catch (e) { setMessage(friendlyError(e)) }
    finally { setBusy(false) }
  }

  // Cálculos de ahorro basados en métricas estándar de la industria GLP
  const lossSavings = Math.round(cylinderVolume * 0.025 * 95) // Reducción de mermas y balones perdidos
  const routeSavings = Math.round(cylinderVolume * 0.85) // Optimización de rutas y combustible
  const totalMonthlySavings = lossSavings + routeSavings

  return (
    <section className="section px-enterprise section--alt" id="empresas">
      <div className="container">
        {/* Cabecera B2B */}
        <div className="px-enterprise__header reveal">
          <div className="section-tag">
            <span className="section-tag__num">04</span>
            <span>PLATAFORMA B2B ENTERPRISE</span>
          </div>
          <h2 className="section-title">Impulsa tu distribuidora de gas con la tecnología SYSGAS.</h2>
          <p className="section-desc">
            El sistema operativo para empresas distribuidoras, envasadoras y flotas de GLP en Puno y el sur del país. Controla tus camiones en tiempo real, elimina pérdidas de cilindros con pasaporte QR y digitaliza el cobro en puerta.
          </p>
        </div>

        {/* 3 Módulos de la Plataforma */}
        <div className="px-enterprise__grid">
          {/* Card 1: Despacho y Telemetría */}
          <div className="px-enterprise__card solid-card card-hover-lift reveal reveal-delay-1">
            <div className="px-enterprise__icon-box">
              <i className="bi bi-truck-front-fill" />
            </div>
            <h3 className="px-enterprise__card-title">Despacho &amp; Telemetría en Ruta</h3>
            <p className="px-enterprise__card-desc">
              Visualiza tus unidades en un mapa con geocercas en tiempo real. Los pedidos entrantes se asignan automáticamente al chofer más cercano para reducir tiempos de espera.
            </p>
            <ul className="px-enterprise__bullet-list">
              <li><i className="bi bi-check2-circle" /> Asignación algorítmica por proximidad</li>
              <li><i className="bi bi-check2-circle" /> Historial de kilometraje y desvíos</li>
              <li><i className="bi bi-check2-circle" /> Alerta de combustible y mantenimiento</li>
            </ul>
          </div>

          {/* Card 2: Control de Balones con QR */}
          <div className="px-enterprise__card solid-card card-hover-lift reveal reveal-delay-2">
            <div className="px-enterprise__icon-box">
              <i className="bi bi-qr-code-scan" />
            </div>
            <h3 className="px-enterprise__card-title">Trazabilidad Anti-Pérdidas</h3>
            <p className="px-enterprise__card-desc">
              Cada balón posee un número de serie y QR único. El sistema audita exactamente qué chofer cargó el cilindro, a qué cliente se entregó y si el cilindro vacío fue recuperado.
            </p>
            <ul className="px-enterprise__bullet-list">
              <li><i className="bi bi-check2-circle" /> Cero extravíos de cilindros vacíos</li>
              <li><i className="bi bi-check2-circle" /> Registro de fecha de prueba y tara de fábrica</li>
              <li><i className="bi bi-check2-circle" /> Auditoría inmutable de inventario</li>
            </ul>
          </div>

          {/* Card 3: POS Móvil y Balanza Digital */}
          <div className="px-enterprise__card solid-card card-hover-lift reveal reveal-delay-3">
            <div className="px-enterprise__icon-box">
              <i className="bi bi-receipt-cutoff" />
            </div>
            <h3 className="px-enterprise__card-title">App de Chofer &amp; Facturación</h3>
            <p className="px-enterprise__card-desc">
              Tus repartidores usan la App Móvil de chofer con conexión bluetooth a balanza digital. Emite boletas y facturas electrónicas en segundos y acepta Yape, Plin o tarjetas.
            </p>
            <ul className="px-enterprise__bullet-list">
              <li><i className="bi bi-check2-circle" /> Validación obligatoria de peso antes de cobrar</li>
              <li><i className="bi bi-check2-circle" /> Emisión electrónica SUNAT en puerta</li>
              <li><i className="bi bi-check2-circle" /> Liquidación diaria automática de caja</li>
            </ul>
          </div>
        </div>

        {/* Módulo de Afiliación & Calculadora Interactiva de Rentabilidad (ROI) con Modelo 3D */}
        <div className="px-enterprise__calculator reveal">
          <div className="px-enterprise__calc-left">
            <div className="px-enterprise__calc-header-tag">
              <span className="status-pill">
                <span className="status-dot" />
                AFILIACIÓN DISPONIBLE EN PUNO
              </span>
              <span className="px-enterprise__tag-extra">RED GLP 2026</span>
            </div>

            <h3 className="px-enterprise__calc-title">Solicita tu afiliación a nuestro servicio</h3>
            <p className="px-enterprise__calc-desc">
              Conecta tu flota distribuidora al sistema inteligente de SYSGAS. Desliza según el volumen mensual de balones para estimar tu ahorro y rendimiento operativo.
            </p>

            {/* Modelo 3D del Camión de Distribución SYSGAS */}
            <div className="px-enterprise__truck-3d-box">
              <EnterpriseTruck3D cylinderVolume={cylinderVolume} />
              <div className="px-enterprise__3d-hint">
                <i className="bi bi-arrow-repeat" />
                <span>Gira el camión de flota en 3D</span>
              </div>
            </div>

            {/* Slider de Volumen */}
            <div className="px-enterprise__slider-box">
              <div className="px-enterprise__slider-label">
                <span>Volumen mensual de tu flota:</span>
                <strong className="px-enterprise__slider-val">{cylinderVolume.toLocaleString()} balones / mes</strong>
              </div>
              <input
                type="range"
                min="500"
                max="10000"
                step="250"
                value={cylinderVolume}
                onChange={(e) => setCylinderVolume(Number(e.target.value))}
                className="px-enterprise__range"
                aria-label="Volumen mensual de balones distribuidos"
              />
              <div className="px-enterprise__slider-ticks">
                <span>500 balones</span>
                <span>5,000 balones</span>
                <span>10,000+ balones</span>
              </div>
            </div>
          </div>

          <div className="px-enterprise__calc-right">
            <div className="px-enterprise__savings-box">
              <span className="px-enterprise__savings-label">AHORRO MENSUAL ESTIMADO</span>
              <div className="px-enterprise__savings-amount">
                S/ {totalMonthlySavings.toLocaleString()}
                <span className="px-enterprise__savings-period">/ mes</span>
              </div>
              <div className="px-enterprise__savings-breakdown">
                <div className="px-enterprise__breakdown-item">
                  <span>Ahorro en cilindros recuperados:</span>
                  <strong>S/ {lossSavings.toLocaleString()}</strong>
                </div>
                <div className="px-enterprise__breakdown-item">
                  <span>Optimización de ruta &amp; combustible:</span>
                  <strong>S/ {routeSavings.toLocaleString()}</strong>
                </div>
              </div>

              <form onSubmit={affiliate} style={{ display: 'grid', gap: 12 }}>
                <label>Empresa <input name="nombre_empresa" required maxLength={150} /></label>
                <label>Representante <input name="representante_nombre" required maxLength={120} /></label>
                <label>Teléfono <input name="telefono" type="tel" required maxLength={20} /></label>
                <label>Correo <input name="correo" type="email" required maxLength={120} /></label>
                <button className="btn btn-primary" disabled={busy}>{busy ? 'Enviando…' : 'Registrar solicitud de afiliación'}</button>
                <p role="status">{message}</p>
              </form>
              {/* Botones de Afiliación y Contacto B2B */}
              <div className="px-enterprise__cta-actions">
                <a
                  href={`https://wa.me/51951667696?text=${encodeURIComponent(
                    `¡Hola SYSGAS Puno! Deseo solicitar la afiliación de mi empresa distribuidora al servicio de telemetría y red de gas (Volumen estimado: ${cylinderVolume} balones/mes).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary px-enterprise__btn-affiliate"
                >
                  <i className="bi bi-shield-fill-check" />
                  <span>Solicitar Afiliación al Servicio</span>
                </a>

                <a
                  href={`https://wa.me/51951667696?text=${encodeURIComponent(
                    `¡Hola SYSGAS! Solicito una demostración guiada del sistema para mi distribuidora (${cylinderVolume} balones/mes).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  <i className="bi bi-calendar-check" />
                  <span>Solicitar Demo Guiada</span>
                </a>

                <Link to="/login" className="btn btn-secondary">
                  <i className="bi bi-box-arrow-in-right" />
                  <span>Acceso LOGIN</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
