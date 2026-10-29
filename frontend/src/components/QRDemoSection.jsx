import { useState } from 'react'
import { Link } from 'react-router-dom'
import './QRDemoSection.css'

export default function QRDemoSection() {
  const [isScanning, setIsScanning] = useState(false)
  const [verified, setVerified] = useState(true)

  const handleSimulateScan = () => {
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
      setVerified(true)
    }, 900)
  }

  return (
    <section className="section px-qr section--alt" id="qr-demo">
      <div className="container">
        {/* Cabecera Apple Style */}
        <div className="px-qr__header reveal">
          <div className="section-tag">
            <span className="section-tag__num">02</span>
            <span>VERIFICACIÓN EN TIEMPO REAL</span>
          </div>
          <h2 className="section-title">Un simple QR. La certeza de un gas 100% seguro.</h2>
          <p className="section-desc">
            Apunta la cámara de tu celular al código del cilindro. Sin instalar aplicaciones, comprueba que recibes los kilos exactos y el sello de máxima pureza.
          </p>
        </div>

        {/* Layout Interactivo de 2 Columnas */}
        <div className="px-qr__layout">
          {/* Lado Izquierdo: Simulador de Cámara Móvil */}
          <div className="px-qr__scanner-card solid-card card-hover-lift reveal reveal-delay-1">
            <div className="px-qr__scanner-header">
              <span className="solid-badge solid-badge--jade">
                <i className="bi bi-camera" /> ESCANEO EN VIVO
              </span>
              <span className="status-pill">
                <span className="status-dot" /> CÁMARA LISTA
              </span>
            </div>

            {/* Visor Móvil del QR */}
            <div className={`px-qr__viewport ${isScanning ? 'px-qr__viewport--scanning' : ''}`}>
              <div className="px-qr__corner px-qr__corner--tl" />
              <div className="px-qr__corner px-qr__corner--tr" />
              <div className="px-qr__corner px-qr__corner--bl" />
              <div className="px-qr__corner px-qr__corner--br" />

              {/* Matriz QR */}
              <div className="px-qr__matrix">
                {Array.from({ length: 64 }).map((_, i) => (
                  <span
                    key={i}
                    className="px-qr__pixel"
                    style={{
                      opacity: (i * 7 + 3) % 5 === 0 ? 0.95 : (i % 3 === 0 ? 0.75 : 0.08),
                    }}
                  />
                ))}
              </div>

              {/* Línea Láser Dinámica */}
              <div className="px-qr__laser" />
            </div>

            <div className="px-qr__code-info">
              <span className="px-qr__code-label">CÓDIGO IDENTIFICADOR:</span>
              <span className="px-qr__code-val">SYS-2026-LPG-001</span>
            </div>

            <button
              type="button"
              className="btn btn-primary px-qr__scan-btn"
              onClick={handleSimulateScan}
              disabled={isScanning}
            >
              {isScanning ? (
                <>
                  <i className="bi bi-arrow-repeat px-qr__spin" />
                  <span>Leyendo Certificado...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-qr-code-scan" />
                  <span>Probar Escaneo Interactivo</span>
                </>
              )}
            </button>
          </div>

          {/* Lado Derecho: Pasaporte Digital Inmediato */}
          <div className="px-qr__result-card solid-card card-hover-lift reveal reveal-delay-2">
            <div className="px-qr__result-header">
              <div className="px-qr__result-title-box">
                <i className="bi bi-patch-check-fill text-jade px-qr__verified-badge" />
                <div>
                  <h3 className="px-qr__result-title">Pasaporte Digital Certificado</h3>
                  <span className="px-qr__result-sub">SYSGAS · Lote #GD-2026-088</span>
                </div>
              </div>
              <span className="solid-badge solid-badge--jade"><i className="bi bi-patch-check-fill" /> 100% AUTÉNTICO</span>
            </div>

            {/* Tarjetas Resumen de Certificación */}
            <div className="px-qr__metrics-grid">
              <div className="px-qr__metric-box">
                <span className="px-qr__metric-label">TARA CALIBRADA</span>
                <span className="px-qr__metric-val text-jade">11.5 kg</span>
                <span className="px-qr__metric-desc">Pesado en balanza certificada</span>
              </div>
              <div className="px-qr__metric-box">
                <span className="px-qr__metric-label">PRESIÓN TEST</span>
                <span className="px-qr__metric-val text-jade">14.7 bar</span>
                <span className="px-qr__metric-desc">Prueba hidrostática sin fugas</span>
              </div>
              <div className="px-qr__metric-box">
                <span className="px-qr__metric-label">NORMA TÉCNICA</span>
                <span className="px-qr__metric-val text-dark">ISO 4706</span>
                <span className="px-qr__metric-desc">Control de calidad aprobado</span>
              </div>
              <div className="px-qr__metric-box">
                <span className="px-qr__metric-label">SELLO DE SEGURIDAD</span>
                <span className="px-qr__metric-val text-jade">INVIOLABLE</span>
                <span className="px-qr__metric-desc">Garantía hermética activa</span>
              </div>
            </div>

            <div className="px-qr__result-footer">
              <Link to="/balon/demo-001" className="btn btn-secondary btn-sm">
                <span>Ver Pasaporte Completo en Vivo</span>
                <i className="bi bi-arrow-right" />
              </Link>
              <span className="px-qr__footnote">
                <i className="bi bi-shield-check text-jade" />
                Registro criptográfico inmutable
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
