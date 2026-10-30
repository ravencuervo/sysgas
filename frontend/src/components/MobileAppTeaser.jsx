import Phone3DModel from './Phone3DModel.jsx'
import './MobileAppTeaser.css'

export default function MobileAppTeaser() {
  return (
    <section className="section px-app section--white" id="app-movil">
      <div className="container">
        {/* Cabecera Apple Style */}
        <div className="px-app__header reveal">
          <div className="section-tag">
            <span className="section-tag__num">03</span>
            <span>PRÓXIMAMENTE EN ANDROID</span>
          </div>
          <h2 className="section-title">SYSGAS también llegará a tu celular.</h2>
          <p className="section-desc">
            La aplicación Android está planificada para clientes, motorizados y operadores. Por ahora puedes utilizar SYSGAS desde el navegador de tu celular.
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
                  <h4 className="px-app__feature-title">Seguimiento del pedido</h4>
                  <p className="px-app__feature-desc">
                    Consulta en la web la última ubicación que tu repartidor comparta durante una entrega activa.
                  </p>
                </div>
              </div>

              <div className="px-app__feature-item">
                <div className="px-app__feature-icon">
                  <i className="bi bi-fingerprint" />
                </div>
                <div>
                  <h4 className="px-app__feature-title">Historial de pedidos</h4>
                  <p className="px-app__feature-desc">
                    Regístrate y consulta los pedidos asociados a tu cuenta desde el panel web.
                  </p>
                </div>
              </div>

              <div className="px-app__feature-item">
                <div className="px-app__feature-icon">
                  <i className="bi bi-patch-check-fill" />
                </div>
                <div>
                  <h4 className="px-app__feature-title">Registro de pesaje</h4>
                  <p className="px-app__feature-desc">
                    El repartidor registra la lectura de peso de la entrega. La conexión automática a balanzas se integrará por separado.
                  </p>
                </div>
              </div>
            </div>

            {/* Caja de Descarga de la Aplicación */}
            <div className="px-app__download-card">
              <div className="px-app__download-header">
                <span className="status-pill">
                  <span className="status-dot" />
                  VERSIÓN WEB DISPONIBLE
                </span>
                <span className="px-app__download-version">APK pendiente</span>
              </div>

              <h3 className="px-app__download-title">Continúa desde la web</h3>
              <p className="px-app__download-desc">
                No hay una APK publicada todavía. Realiza tu pedido y consulta los códigos QR desde esta web.
              </p>

              <div className="px-app__download-buttons"><a href="#contacto" className="btn btn-primary">Pedir desde la web</a><a href="#qr-demo" className="btn btn-secondary">Consultar un balón</a></div>
              <div className="px-app__download-badges">
                <span><i className="bi bi-shield-check" /> Acceso según tu cuenta</span>
                <span><i className="bi bi-phone" /> Web adaptable a celular</span>
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
