import Phone3DModel from './Phone3DModel.jsx'
import './MobileAppTeaser.css'

export default function MobileAppTeaser() {
  const handleDirectApkDownload = (e) => {
    e.preventDefault()
    alert('Iniciando descarga segura de SYSGAS App (Instalador Oficial APK v2.4 para Android)...')
  }

  return (
    <section className="section px-app section--white" id="app-movil">
      <div className="container">
        {/* Cabecera Apple Style */}
        <div className="px-app__header reveal">
          <div className="section-tag">
            <span className="section-tag__num">03</span>
            <span>APLICATIVO MÓVIL OFICIAL</span>
          </div>
          <h2 className="section-title">Tu gas en un solo toque. Descarga la App SYSGAS.</h2>
          <p className="section-desc">
            Pide tu balón en segundos en toda la región Puno, rastrea el camión en tiempo real sobre el mapa y certifica el peso exacto con balanza digital en la puerta de tu hogar.
          </p>
        </div>

        {/* Layout 2 Columnas: Beneficios + Teléfono 3D Three.js */}
        <div className="px-app__layout">
          {/* Columna Izquierda: Características y Botones de Descarga */}
          <div className="px-app__info reveal reveal-delay-1">
            <div className="px-app__feature-list">
              <div className="px-app__feature-item">
                <div className="px-app__feature-icon">
                  <i className="bi bi-geo-alt-fill" />
                </div>
                <div>
                  <h4 className="px-app__feature-title">Rastreo GPS en tiempo real</h4>
                  <p className="px-app__feature-desc">
                    Observa exactamente por qué calle viene la unidad repartidora y conoce el tiempo exacto de llegada sin esperas inciertas.
                  </p>
                </div>
              </div>

              <div className="px-app__feature-item">
                <div className="px-app__feature-icon">
                  <i className="bi bi-fingerprint" />
                </div>
                <div>
                  <h4 className="px-app__feature-title">Repetición Express en 3 segundos</h4>
                  <p className="px-app__feature-desc">
                    Tus direcciones frecuentes y tu tipo de balón favorito quedan guardados para pedir con solo pulsar un botón.
                  </p>
                </div>
              </div>

              <div className="px-app__feature-item">
                <div className="px-app__feature-icon">
                  <i className="bi bi-patch-check-fill" />
                </div>
                <div>
                  <h4 className="px-app__feature-title">Registro inmutable de peso</h4>
                  <p className="px-app__feature-desc">
                    El chofer conecta la balanza digital por Bluetooth a la app y recibes el recibo digital con la foto del precinto.
                  </p>
                </div>
              </div>
            </div>

            {/* Caja de Descarga de la Aplicación */}
            <div className="px-app__download-card">
              <div className="px-app__download-header">
                <span className="status-pill">
                  <span className="status-dot" />
                  DISPONIBLE EN PUNO
                </span>
                <span className="px-app__download-version">Versión Oficial 2.4</span>
              </div>

              <h3 className="px-app__download-title">Descarga nuestro aplicativo móvil</h3>
              <p className="px-app__download-desc">
                Instálalo ahora mismo desde la tienda de Google Play o descarga el instalador APK directo para tu teléfono.
              </p>

              {/* Botones de Descarga Monocromáticos y Elegantes */}
              <div className="px-app__download-buttons">
                <a
                  href="https://play.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-app__store-btn px-app__store-btn--play"
                >
                  <i className="bi bi-google-play" />
                  <div className="px-app__store-text">
                    <span className="px-app__store-sub">DISPONIBLE EN</span>
                    <strong className="px-app__store-name">Google Play</strong>
                  </div>
                </a>

                <a
                  href="#descargar-apk"
                  onClick={handleDirectApkDownload}
                  className="px-app__store-btn px-app__store-btn--direct"
                >
                  <i className="bi bi-download" />
                  <div className="px-app__store-text">
                    <span className="px-app__store-sub">DESCARGA DIRECTA</span>
                    <strong className="px-app__store-name">Instalador APK</strong>
                  </div>
                </a>
              </div>

              <div className="px-app__download-badges">
                <span><i className="bi bi-shield-check" /> Verificado y 100% Seguro</span>
                <span><i className="bi bi-phone" /> Compatible con Android</span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Teléfono 3D Three.js */}
          <div className="px-app__phone-col reveal reveal-delay-2">
            <div className="px-app__3d-container">
              <Phone3DModel />
              <div className="px-app__3d-hint">
                <i className="bi bi-arrow-repeat" />
                <span>Gira el teléfono en 3D</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
