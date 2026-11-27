import { lazy, Suspense } from 'react'
import HeroWaveGrid from './HeroWaveGrid.jsx'
import './HeroSection.css'

const GasCylinderModel = lazy(() => import('./GasCylinderModel.jsx'))

export default function HeroSection() {
  return (
    <section className="sys-hero" id="inicio">
      {/* Cuadrícula Técnica Dinámica con Ondas de Flujo (Opción 3) */}
      <HeroWaveGrid />

      <div className="container sys-hero__container">
        {/* Titular ENERGIA PURA Arriba Sin Sombras */}
        <div className="sys-hero__header">
          <h1 className="sys-hero__heading">ENERGIA PURA</h1>
        </div>

        {/* Modelo 3D Abajo con indicador 360° */}
        <div className="sys-hero__stage">
          <div className="sys-hero__cylinder-wrapper">
            <div className="sys-hero__3d-box">
              <Suspense fallback={null}>
                <GasCylinderModel />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Marquee Ticker */}
      <div className="marquee-container">
        <div className="marquee-track">
          <div className="marquee-item"><i className="bi bi-qr-code" /> SYSGAS: TRAZABILIDAD TOTAL EN CADA BALÓN <span className="marquee-bullet">✦</span></div>
          <div className="marquee-item"><i className="bi bi-patch-check-fill" /> HISTORIAL DEL BALÓN POR QR <span className="marquee-bullet">✦</span></div>
          <div className="marquee-item"><i className="bi bi-shield-fill-check" /> CONSULTA EL PESO REGISTRADO <span className="marquee-bullet">✦</span></div>
          <div className="marquee-item"><i className="bi bi-truck" /> TELEMETRÍA Y CONTROL DE FLOTA EN RUTA <span className="marquee-bullet">✦</span></div>
          <div className="marquee-item"><i className="bi bi-house-check-fill" /> ENTREGA SEGURA Y FIRMA DIGITAL EN HOGAR <span className="marquee-bullet">✦</span></div>
          <div className="marquee-item"><i className="bi bi-patch-check-fill" /> PESO EXACTO Y CERTIFICADO OFICIAL DE TARA <span className="marquee-bullet">✦</span></div>
        </div>
        <div className="marquee-track" aria-hidden="true">
          <div className="marquee-item"><i className="bi bi-qr-code" /> SYSGAS: TRAZABILIDAD TOTAL EN CADA BALÓN <span className="marquee-bullet">✦</span></div>
          <div className="marquee-item"><i className="bi bi-patch-check-fill" /> HISTORIAL DEL BALÓN POR QR <span className="marquee-bullet">✦</span></div>
          <div className="marquee-item"><i className="bi bi-shield-fill-check" /> CONSULTA EL PESO REGISTRADO <span className="marquee-bullet">✦</span></div>
          <div className="marquee-item"><i className="bi bi-truck" /> TELEMETRÍA Y CONTROL DE FLOTA EN RUTA <span className="marquee-bullet">✦</span></div>
          <div className="marquee-item"><i className="bi bi-house-check-fill" /> ENTREGA SEGURA Y FIRMA DIGITAL EN HOGAR <span className="marquee-bullet">✦</span></div>
          <div className="marquee-item"><i className="bi bi-patch-check-fill" /> PESO EXACTO Y CERTIFICADO OFICIAL DE TARA <span className="marquee-bullet">✦</span></div>
        </div>
      </div>
    </section>
  )
}
