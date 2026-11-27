import { lazy } from 'react'
import Lazy3DStage from './Lazy3DStage.jsx'
import MorphIcon from './MorphIcon.jsx'
import './MobileAppTeaser.css'

const Phone3DModel = lazy(() => import('./Phone3DModel.jsx'))

export default function MobileAppTeaser() {
  return (
    <section className="section px-app section--white" id="app-movil">
      <div className="container">
        <div className="px-app__header reveal">
          <h2 className="section-title">SYSGAS también en tu celular.</h2>
          <p className="section-desc">
            Descarga el aplicativo oficial para Android (APK) y realiza pedidos, escanea el QR de tu balón y sigue tu entrega desde tu teléfono.
          </p>
        </div>

        <div className="px-app__layout">
          <div className="px-app__info reveal reveal-delay-1">
            <div className="px-app__feature-list">
              <div className="px-app__feature-item">
                <MorphIcon base="bi-geo-alt" active="bi-geo-alt-fill" className="px-app__feature-icon" />
                <div>
                  <h3 className="px-app__feature-title">Seguimiento del pedido</h3>
                  <p className="px-app__feature-desc">
                    Consulta en la web la última ubicación que tu repartidor comparta durante una entrega activa.
                  </p>
                </div>
              </div>

              <div className="px-app__feature-item">
                <MorphIcon base="bi-clock-history" active="bi-journal-check" className="px-app__feature-icon" />
                <div>
                  <h3 className="px-app__feature-title">Historial de pedidos</h3>
                  <p className="px-app__feature-desc">
                    Regístrate y consulta los pedidos asociados a tu cuenta desde el panel web.
                  </p>
                </div>
              </div>

              <div className="px-app__feature-item">
                <MorphIcon base="bi-patch-check" active="bi-patch-check-fill" className="px-app__feature-icon" />
                <div>
                  <h3 className="px-app__feature-title">Registro de pesaje</h3>
                  <p className="px-app__feature-desc">
                    El repartidor registra la lectura de peso de la entrega. La conexión automática a balanzas se integrará por separado.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-app__web-cta">
              <h3 className="px-app__download-title">Descargar aplicativo Android (APK)</h3>
              <p className="px-app__download-desc">
                Instalación directa sin Play Store. Descarga el archivo APK oficial de SYSGAS para Android o continúa desde la web.
              </p>
              <div className="px-app__download-actions">
                <a
                  href="/downloads/sysgas-app.apk"
                  download="SYSGAS.apk"
                  className="btn btn-primary"
                >
                  <i className="bi bi-android2" />
                  <span>Descargar APK</span>
                  <i className="bi bi-download" />
                </a>
                <a href="#contacto" className="px-app__secondary-link">
                  Pedir desde la web
                </a>
              </div>
            </div>
          </div>

          <div className="px-app__phone-col reveal reveal-delay-2">
            <div className="px-app__3d-container">
              <Lazy3DStage minHeight={520}>
                <Phone3DModel />
              </Lazy3DStage>
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
