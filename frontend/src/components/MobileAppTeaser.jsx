import { useState } from 'react'
import './MobileAppTeaser.css'

export default function MobileAppTeaser() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (!email) return
    setSubscribed(true)
  }

  return (
    <section className="section px-app section--white" id="app-movil">
      <div className="container">
        {/* Cabecera Apple Style */}
        <div className="px-app__header reveal">
          <div className="section-tag">
            <span className="section-tag__num">03</span>
            <span>PRÓXIMAMENTE APP MÓVIL</span>
          </div>
          <h2 className="section-title">Tu gas en un solo toque. Conoce la nueva App SYSGAS.</h2>
          <p className="section-desc">
            Diseñada para la familia moderna. Pide tu balón en segundos, rastrea el camión en tiempo real sobre el mapa y certifica el peso exacto en la puerta de tu hogar.
          </p>
        </div>

        {/* Layout 2 Columnas: Beneficios + Mockup de Celular */}
        <div className="px-app__layout">
          {/* Columna Izquierda: Características y Formulario Beta */}
          <div className="px-app__info reveal reveal-delay-1">
            <div className="px-app__feature-list">
              <div className="px-app__feature-item">
                <div className="px-app__feature-icon">
                  <i className="bi bi-geo-alt-fill" />
                </div>
                <div>
                  <h4 className="px-app__feature-title">Rastreo GPS en tiempo real</h4>
                  <p className="px-app__feature-desc">
                    Observa exactamente por qué calle viene el repartidor y conoce el tiempo exacto de llegada sin esperas inciertas.
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

            {/* Caja de Registro a la Beta con beneficio */}
            <div className="px-app__early-box">
              <div className="px-app__early-header">
                <span className="status-pill">
                  <span className="status-dot" />
                  ACCESO ANTICIPADO
                </span>
                <span className="px-app__early-benefit">
                  <i className="bi bi-tag-fill" /> S/ 5.00 de descuento en tu primer pedido
                </span>
              </div>

              {subscribed ? (
                <div className="px-app__subscribed-msg">
                  <i className="bi bi-check-circle-fill" />
                  <span>¡Excelente! Te notificaremos al WhatsApp/email apenas se libere la versión Beta.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="px-app__form">
                  <input
                    type="text"
                    className="px-app__input"
                    placeholder="Ingresa tu celular o correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary px-app__submit-btn">
                    <span>Unirme a la Beta</span>
                    <i className="bi bi-arrow-right" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Columna Derecha: Mockup iPhone 16 con App Interactiva */}
          <div className="px-app__phone-col reveal reveal-delay-2">
            <div className="phone-mockup">
              {/* Marco Externo del Teléfono */}
              <div className="phone-mockup__bezel">
                {/* Dynamic Island */}
                <div className="phone-mockup__island">
                  <div className="phone-mockup__camera" />
                </div>

                {/* Pantalla de la App */}
                <div className="phone-mockup__screen">
                  {/* Barra Superior de la App */}
                  <div className="phone-app__header">
                    <div className="phone-app__brand">
                      <i className="bi bi-fire" />
                      <span>SYSGAS APP</span>
                    </div>
                    <span className="phone-app__live-badge">EN RUTA</span>
                  </div>

                  {/* Mapa Simulado con Ruta de Despacho */}
                  <div className="phone-app__map">
                    <div className="phone-app__map-grid" />
                    {/* Ruta de Entrega */}
                    <svg className="phone-app__route-svg" viewBox="0 0 200 150">
                      <path
                        d="M 20 120 Q 60 40, 110 80 T 180 30"
                        fill="none"
                        stroke="#00A878"
                        strokeWidth="3.5"
                        strokeDasharray="5,4"
                      />
                    </svg>
                    {/* Pin de Destino (Hogar) */}
                    <div className="phone-app__pin phone-app__pin--home" style={{ top: '22px', right: '16px' }}>
                      <i className="bi bi-house-door-fill" />
                    </div>
                    {/* Camión en Movimiento */}
                    <div className="phone-app__truck" style={{ top: '68px', left: '100px' }}>
                      <i className="bi bi-truck" />
                      <span className="phone-app__truck-pulse" />
                    </div>
                  </div>

                  {/* Tarjeta de Estado del Pedido */}
                  <div className="phone-app__status-card">
                    <div className="phone-app__status-top">
                      <div>
                        <span className="phone-app__status-title">Balón Familiar 10 kg</span>
                        <span className="phone-app__status-time">Llegada estimada: 6 min</span>
                      </div>
                      <span className="phone-app__price-pill">S/ 48.00</span>
                    </div>

                    <div className="phone-app__driver-row">
                      <div className="phone-app__driver-avatar">
                        <i className="bi bi-person-fill" />
                      </div>
                      <div className="phone-app__driver-info">
                        <span className="phone-app__driver-name">Carlos Mendoza</span>
                        <span className="phone-app__driver-plate">Unidad #08 · Camión Certificado</span>
                      </div>
                      <a href="#contacto" className="phone-app__call-btn" title="Llamar al repartidor">
                        <i className="bi bi-telephone-fill" />
                      </a>
                    </div>

                    <div className="phone-app__metric-row">
                      <div className="phone-app__metric">
                        <span className="phone-app__metric-label">TARA DIGITAL</span>
                        <span className="phone-app__metric-val">11.5 kg OK</span>
                      </div>
                      <div className="phone-app__metric">
                        <span className="phone-app__metric-label">SELLO QR</span>
                        <span className="phone-app__metric-val">VERIFICADO</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

