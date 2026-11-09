import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './AppMockup.css'

export default function AppMockup() {
  const [currentScreen, setCurrentScreen] = useState('home') // home, checkout, tracking, weight, scanner, history
  const [selectedCapacity, setSelectedCapacity] = useState('10 kg')
  const [quantity, setQuantity] = useState(1)
  const [ticketCode, setTicketCode] = useState('TK-2026-84210')
  const [grossWeight, setGrossWeight] = useState(21.52)
  const [laserY, setLaserY] = useState(20)
  const [eta, setEta] = useState(11)

  const products = [
    {
      capacity: '5 kg',
      name: 'Balón Portátil',
      price: 28.50,
      dimensions: '38 cm alto × 23 cm ø',
      tare: 6.2,
      net: 5.0,
      desc: 'Para departamentos, campamentos y parrillas.',
      popular: false
    },
    {
      capacity: '10 kg',
      name: 'Balón Familiar',
      price: 48.00,
      dimensions: '62 cm alto × 30 cm ø',
      tare: 11.5,
      net: 10.0,
      desc: 'El más solicitado en Puno y Juliaca. Alto rendimiento en frío extremo.',
      popular: true
    },
    {
      capacity: '45 kg',
      name: 'Balón Industrial',
      price: 185.00,
      dimensions: '132 cm alto × 38 cm ø',
      tare: 38.0,
      net: 45.0,
      desc: 'Para restaurantes, hoteles y panaderías continuas.',
      popular: false
    }
  ]

  const selectedProduct = products.find(p => p.capacity === selectedCapacity) || products[1]

  // Simulación de láser de escaneo en la pantalla de pasaporte
  useEffect(() => {
    if (currentScreen !== 'scanner') return
    const interval = setInterval(() => {
      setLaserY(prev => (prev > 160 ? 20 : prev + 6))
    }, 40)
    return () => clearInterval(interval)
  }, [currentScreen])

  // Simulación de acercamiento del camión
  useEffect(() => {
    if (currentScreen !== 'tracking') return
    const interval = setInterval(() => {
      setEta(prev => (prev > 1 ? prev - 1 : 12))
    }, 8000)
    return () => clearInterval(interval)
  }, [currentScreen])

  const tareKg = selectedCapacity === '45 kg' ? 38.0 : selectedCapacity === '5 kg' ? 6.2 : 11.5
  const netGasKg = (grossWeight - tareKg).toFixed(2)

  return (
    <div className="app-mockup-wrapper">
      {/* Controles y Selector Rápido */}
      <div className="app-mockup-controls">
        <div className="app-mockup-badge">
          <i className="bi bi-phone" /> Simulador de Interfaz Móvil · Android Native
        </div>
        <h1 className="app-mockup-title">SYSGAS App Móvil (Kotlin / Compose)</h1>
        <p className="app-mockup-subtitle">
          Esta es la réplica exacta interactiva del código desarrollado en <code>android/app/src/main/java</code>. Puedes navegar por cada pantalla o cambiar de pestaña.
        </p>

        <div className="app-mockup-pills">
          <button
            className={`app-mockup-pill-btn ${currentScreen === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('home')}
          >
            <i className="bi bi-fire" /> 1. Catálogo
          </button>
          <button
            className={`app-mockup-pill-btn ${currentScreen === 'checkout' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('checkout')}
          >
            <i className="bi bi-cart-check" /> 2. Checkout
          </button>
          <button
            className={`app-mockup-pill-btn ${currentScreen === 'tracking' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('tracking')}
          >
            <i className="bi bi-truck" /> 3. Rastreo GPS
          </button>
          <button
            className={`app-mockup-pill-btn ${currentScreen === 'weight' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('weight')}
          >
            <i className="bi bi-speedometer" /> 4. Balanza Bluetooth
          </button>
          <button
            className={`app-mockup-pill-btn ${currentScreen === 'scanner' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('scanner')}
          >
            <i className="bi bi-qr-code-scan" /> 5. Pasaporte QR
          </button>
          <button
            className={`app-mockup-pill-btn ${currentScreen === 'history' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('history')}
          >
            <i className="bi bi-clock-history" /> 6. Historial
          </button>
          <Link to="/" className="app-mockup-pill-btn" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <i className="bi bi-arrow-left" /> Volver a Landing
          </Link>
        </div>
      </div>

      {/* Chasis de Teléfono Android */}
      <div className="phone-frame">
        {/* Notch y Cámara Frontal */}
        <div className="phone-notch">
          <div className="phone-speaker" />
          <div className="phone-camera-lens" />
        </div>

        {/* Barra de Estado Android */}
        <div className="phone-status-bar">
          <span>10:42</span>
          <div className="phone-status-icons">
            <i className="bi bi-wifi" />
            <i className="bi bi-reception-4" />
            <span>94%</span>
            <i className="bi bi-battery-full" />
          </div>
        </div>

        {/* Barra Superior SYSGAS */}
        <div className="app-topbar">
          <div className="app-topbar-brand">
            <div className="app-topbar-logo">
              <i className="bi bi-fire" />
            </div>
            <div>
              <p className="app-topbar-title">SYSGAS Altiplano</p>
              <p className="app-topbar-sub">Puno & Juliaca · Pedido Seguro</p>
            </div>
          </div>
          <div className="app-topbar-altitude">
            <i className="bi bi-geo-alt-fill" style={{ color: '#00A878' }} />
            <span>Puno 3,812 m</span>
          </div>
        </div>

        {/* Viewport de Pantalla Móvil */}
        <div className="phone-viewport">
          {/* ═════════ 1. PANTALLA: CATÁLOGO / INICIO ═════════ */}
          {currentScreen === 'home' && (
            <div className="screen-container">
              {/* Barra de dirección */}
              <div style={{ background: '#FFF', padding: '10px 14px', borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="bi bi-geo-alt-fill" style={{ color: '#00A878', fontSize: '1.1rem' }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Entregar en:</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F2E22' }}>Jr. Arequipa 520, Puno</div>
                  </div>
                </div>
                <span style={{ background: '#E8F5EE', color: '#00A878', fontSize: '0.68rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>
                  20-30 min
                </span>
              </div>

              {/* Banner Hero */}
              <div style={{ background: 'linear-gradient(135deg, #062118 0%, #0F3E30 100%)', borderRadius: 16, padding: '16px', color: '#FFF' }}>
                <span style={{ background: '#00A878', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                  Altiplano Seguro
                </span>
                <h3 style={{ margin: '8px 0 4px 0', fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.3 }}>
                  Tu balón de gas con balanza digital en tu puerta
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#D6E4DC' }}>
                  El repartidor pesa el cilindro frente a ti antes de cobrar.
                </p>
              </div>

              {/* Selector de Cilindros */}
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F2E22', marginTop: 4 }}>
                Elige la capacidad del cilindro
              </div>

              {products.map(p => {
                const isSelected = p.capacity === selectedCapacity
                return (
                  <div
                    key={p.capacity}
                    onClick={() => setSelectedCapacity(p.capacity)}
                    style={{
                      background: isSelected ? '#F0FDF4' : '#FFFFFF',
                      border: isSelected ? '2px solid #00A878' : '1px solid #D6E4DC',
                      borderRadius: 14,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 4px 12px rgba(0, 168, 120, 0.15)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: isSelected ? '#00A878' : '#E8F5EE',
                          color: isSelected ? '#FFF' : '#00A878',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem'
                        }}>
                          <i className="bi bi-fire" />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F2E22' }}>{p.capacity}</span>
                            {p.popular && (
                              <span style={{ background: '#00A878', color: '#FFF', fontSize: '0.6rem', fontWeight: 800, padding: '1px 5px', borderRadius: 4 }}>
                                MÁS PEDIDO
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{p.name}</div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#00A878' }}>
                          S/ {p.price.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>con entrega</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 8, background: '#F8FAFC', padding: '5px 8px', borderRadius: 6, fontSize: '0.7rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                      <span>📏 {p.dimensions}</span>
                      <span>Tara: {p.tare}kg · Gas: {p.net}kg</span>
                    </div>
                  </div>
                )
              })}

              {/* Cantidad y Botón Continuar */}
              <div style={{ background: '#FFF', borderRadius: 14, padding: '14px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F2E22' }}>Cantidad:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F1F5F9', borderRadius: 8, padding: '2px 8px' }}>
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      style={{ border: 'none', background: 'transparent', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', padding: '2px 6px' }}
                    >−</button>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      style={{ border: 'none', background: 'transparent', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', padding: '2px 6px' }}
                    >+</button>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Total:</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#00A878' }}>
                      S/ {(selectedProduct.price * quantity).toFixed(2)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentScreen('checkout')}
                  style={{
                    width: '100%',
                    background: '#00A878',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 12px rgba(0, 168, 120, 0.3)'
                  }}
                >
                  <span>Pedir {selectedProduct.capacity} Ahora</span>
                  <i className="bi bi-arrow-right" />
                </button>
              </div>
            </div>
          )}

          {/* ═════════ 2. PANTALLA: CHECKOUT ═════════ */}
          {currentScreen === 'checkout' && (
            <div className="screen-container">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
                <button
                  onClick={() => setCurrentScreen('home')}
                  style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#0F2E22' }}
                >
                  <i className="bi bi-arrow-left" />
                </button>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F2E22' }}>Confirmar Pedido</span>
              </div>

              {/* Resumen de Producto */}
              <div style={{ background: '#FFF', padding: '12px', borderRadius: 12, border: '1.5px solid #00A878', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F2E22' }}>
                    {quantity}× Balón {selectedProduct.capacity} ({selectedProduct.name})
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                    Tara: {selectedProduct.tare}kg · Gas garantizado: {selectedProduct.net}kg
                  </div>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#00A878' }}>
                  S/ {(selectedProduct.price * quantity).toFixed(2)}
                </div>
              </div>

              {/* Dirección */}
              <div style={{ background: '#FFF', padding: '12px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F2E22', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="bi bi-geo-alt" style={{ color: '#00A878' }} /> Dirección en el Altiplano
                </div>
                <input
                  type="text"
                  defaultValue="Jr. Arequipa 520, Puno"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', marginBottom: 6, boxSizing: 'border-box' }}
                />
                <input
                  type="text"
                  defaultValue="Frente al Colegio San Carlos, cerca a Plaza de Armas"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.78rem', color: '#64748B', boxSizing: 'border-box' }}
                />
              </div>

              {/* Contacto */}
              <div style={{ background: '#FFF', padding: '12px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F2E22', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="bi bi-person" style={{ color: '#00A878' }} /> ¿Quién recibe?
                </div>
                <input
                  type="text"
                  defaultValue="Wilson Emanuel Cuervo"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', marginBottom: 6, boxSizing: 'border-box' }}
                />
                <input
                  type="text"
                  defaultValue="+51 951 667 696"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Método de Pago */}
              <div style={{ background: '#FFF', padding: '12px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F2E22', marginBottom: 8 }}>Forma de Pago</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="radio" name="pay" defaultChecked />
                    <strong>Yape</strong> (QR o al 951 667 696)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="radio" name="pay" />
                    <strong>Plin</strong>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="radio" name="pay" />
                    <strong>Efectivo contra entrega</strong>
                  </label>
                </div>
              </div>

              <button
                onClick={() => {
                  setTicketCode(`TK-2026-${Math.floor(10000 + Math.random() * 90000)}`)
                  setCurrentScreen('tracking')
                }}
                style={{
                  width: '100%',
                  background: '#00A878',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: 12,
                  padding: '14px',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Confirmar Pedido · S/ {(selectedProduct.price * quantity).toFixed(2)}
              </button>
            </div>
          )}

          {/* ═════════ 3. PANTALLA: RASTREO GPS ═════════ */}
          {currentScreen === 'tracking' && (
            <div className="screen-container">
              {/* Header de Ticket */}
              <div style={{ background: '#062118', padding: '14px', borderRadius: 14, color: '#FFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#90D5B7', fontWeight: 800 }}>SEGUIMIENTO EN VIVO GPS</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'monospace' }}>{ticketCode}</div>
                  </div>
                  <span style={{ background: '#00A878', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800 }}>
                    EN RUTA
                  </span>
                </div>
              </div>

              {/* Mapa de Ruta */}
              <div style={{
                height: 220,
                background: '#0F251E',
                borderRadius: 16,
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #1B3D32'
              }}>
                {/* Cuadrícula de calles de Puno */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'linear-gradient(#1B3D32 1px, transparent 1px), linear-gradient(90deg, #1B3D32 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                  opacity: 0.4
                }} />

                {/* Ruta dibujada */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  <path d="M 60 70 L 180 120 L 290 170" fill="none" stroke="#00A878" strokeWidth="4" strokeDasharray="8,6" />
                  {/* Pin camión */}
                  <circle cx="60" cy="70" r="16" fill="rgba(0, 168, 120, 0.3)" />
                  <circle cx="60" cy="70" r="8" fill="#00A878" />
                  {/* Pin cliente Jr. Arequipa */}
                  <circle cx="290" cy="170" r="10" fill="#EF4444" />
                  <circle cx="290" cy="170" r="4" fill="#FFFFFF" />
                </svg>

                {/* Badge ETA */}
                <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.85)', padding: '6px 10px', borderRadius: 8, fontSize: '0.72rem', color: '#FFF', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="bi bi-speedometer2" style={{ color: '#00A878' }} />
                  <span>Llegada en {eta} min · 1.4 km</span>
                </div>

                <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.85)', padding: '4px 8px', borderRadius: 6, fontSize: '0.68rem', color: '#FFF' }}>
                  📍 Jr. Arequipa 520, Puno
                </div>
              </div>

              {/* Tarjeta del Repartidor */}
              <div style={{ background: '#FFF', padding: '14px', borderRadius: 14, border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#E8F5EE', color: '#00A878', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                    <i className="bi bi-truck" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F2E22' }}>Ramiro Quispe Condori</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Hino Dutro City · Placa V8X-721</div>
                    <div style={{ fontSize: '0.68rem', color: '#00A878', fontWeight: 700 }}>✓ Balanza digital Bluetooth a bordo</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href="tel:+51951667696"
                    style={{ flex: 1, background: '#00A878', color: '#FFF', padding: '10px', borderRadius: 8, textAlign: 'center', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}
                  >
                    <i className="bi bi-telephone-fill" /> Llamar
                  </a>
                  <a
                    href="https://wa.me/51951667696"
                    target="_blank"
                    rel="noreferrer"
                    style={{ flex: 1, border: '1px solid #00A878', color: '#00A878', padding: '10px', borderRadius: 8, textAlign: 'center', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}
                  >
                    <i className="bi bi-whatsapp" /> WhatsApp
                  </a>
                </div>
              </div>

              {/* Botón de acceso a Balanza */}
              <button
                onClick={() => setCurrentScreen('weight')}
                style={{
                  width: '100%',
                  background: '#0F3E30',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <i className="bi bi-speedometer" /> Abrir Balanza y Verificar Kilos al Llegar
              </button>
            </div>
          )}

          {/* ═════════ 4. PANTALLA: BALANZA DIGITAL ═════════ */}
          {currentScreen === 'weight' && (
            <div className="screen-container">
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F2E22' }}>Pesaje Digital en Puerta</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Auditoría de kilos exactos para el usuario</div>
              </div>

              {/* Estado Bluetooth */}
              <div style={{ background: '#FFF', padding: '10px 14px', borderRadius: 10, border: '1px solid #D6E4DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="bi bi-bluetooth" style={{ color: '#0284C7', fontSize: '1.1rem' }} />
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E293B' }}>SYSGAS-SCALE-BT04</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748B' }}>Calibración INACAL · Batería 94%</div>
                  </div>
                </div>
                <span style={{ background: '#E0F2FE', color: '#0369A1', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
                  CONECTADA
                </span>
              </div>

              {/* Display LCD Digital */}
              <div style={{ background: '#0C1F17', borderRadius: 18, padding: '20px 16px', color: '#FFF', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#90D5B7', fontWeight: 800, letterSpacing: '0.05em' }}>
                  GAS NETO REAL MEDIDO
                </div>
                <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'monospace', color: '#00E699', margin: '6px 0' }}>
                  {netGasKg} <span style={{ fontSize: '1.3rem' }}>KG</span>
                </div>
                <div style={{ display: 'inline-block', background: '#104430', color: '#FFF', padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                  ✓ PESO EXACTO Y GARANTIZADO
                </div>

                <div style={{ marginTop: 16, background: '#06140F', borderRadius: 10, padding: '10px', display: 'flex', justifyContent: 'space-around', fontSize: '0.72rem' }}>
                  <div>
                    <div style={{ color: '#94A3B8' }}>BRUTO</div>
                    <div style={{ fontWeight: 800 }}>{grossWeight.toFixed(2)} kg</div>
                  </div>
                  <div style={{ color: '#94A3B8' }}>−</div>
                  <div>
                    <div style={{ color: '#94A3B8' }}>TARA</div>
                    <div style={{ fontWeight: 800 }}>{tareKg.toFixed(2)} kg</div>
                  </div>
                  <div style={{ color: '#94A3B8' }}>=</div>
                  <div>
                    <div style={{ color: '#00A878' }}>NETO</div>
                    <div style={{ fontWeight: 800, color: '#00A878' }}>{netGasKg} kg</div>
                  </div>
                </div>
              </div>

              {/* Botón de simulación */}
              <button
                onClick={() => setGrossWeight(tareKg + selectedProduct.net + (Math.random() * 0.08))}
                style={{
                  width: '100%',
                  background: '#00A878',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <i className="bi bi-arrow-repeat" /> Pesar Cilindro en Vivo (Lectura BT)
              </button>

              <button
                onClick={() => alert('¡Comprobante de pesaje guardado con éxito en tu historial!')}
                style={{
                  width: '100%',
                  background: '#0F3E30',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                ✓ Aceptar y Guardar Comprobante
              </button>
            </div>
          )}

          {/* ═════════ 5. PANTALLA: PASAPORTE QR ═════════ */}
          {currentScreen === 'scanner' && (
            <div className="screen-container">
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F2E22' }}>Pasaporte Digital del Balón</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Escanea el código QR grabado en el cilindro</div>
              </div>

              {/* Visor de Cámara con Retícula */}
              <div style={{
                height: 190,
                background: '#06140F',
                borderRadius: 16,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: 130,
                  height: 130,
                  border: '2px dashed #00A878',
                  borderRadius: 12,
                  position: 'relative'
                }}>
                  {/* Línea láser animada */}
                  <div style={{
                    position: 'absolute',
                    left: 4,
                    right: 4,
                    top: laserY,
                    height: 2,
                    background: '#00FFB2',
                    boxShadow: '0 0 8px #00FFB2'
                  }} />
                </div>
                <div style={{ position: 'absolute', bottom: 8, fontSize: '0.65rem', color: '#FFF' }}>
                  Apunta al código QR del cuello del balón
                </div>
              </div>

              {/* Ficha Técnica Certificada */}
              <div style={{ background: '#FFF', padding: '14px', borderRadius: 14, border: '1.5px solid #00A878' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#0F3E30' }}>
                    CERTIFICADO OSINERGMIN
                  </span>
                  <span style={{ background: '#E8F5EE', color: '#00A878', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                    VIGENTE
                  </span>
                </div>

                <div style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: 'monospace', color: '#0F2E22' }}>
                  CIL-PU-10-84920
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: 10 }}>
                  10 kg · Distribuidora Altiplano Gas S.A.C.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', borderTop: '1px solid #F1F5F9', paddingTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Tara grabada:</span>
                    <strong>11.50 kg</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Gas neto:</span>
                    <strong>10.00 kg</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Prueba hidrostática:</span>
                    <strong style={{ color: '#00A878' }}>14.7 bar (Aprobada)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Próxima inspección:</span>
                    <strong>15/01/2031</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Sello de seguridad:</span>
                    <strong>SEC-882194-SYS</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ 6. PANTALLA: HISTORIAL ═════════ */}
          {currentScreen === 'history' && (
            <div className="screen-container">
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F2E22' }}>Historial de Pedidos</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Tus balones con comprobante de pesaje auditado</div>
              </div>

              {[
                { code: 'TK-2026-84210', date: 'Hoy, hace 20 min', cap: '10 kg', total: 48.00, status: 'EN RUTA' },
                { code: 'TK-2026-72109', date: '24 Oct 2026', cap: '10 kg × 2', total: 96.00, status: 'ENTREGADO' }
              ].map(item => (
                <div key={item.code} style={{ background: '#FFF', padding: '12px 14px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, fontFamily: 'monospace' }}>{item.code}</span>
                    <span style={{
                      background: item.status === 'ENTREGADO' ? '#E8F5EE' : '#E0F2FE',
                      color: item.status === 'ENTREGADO' ? '#00A878' : '#0284C7',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 4
                    }}>
                      {item.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', margin: '4px 0' }}>{item.date} · Jr. Arequipa 520, Puno</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Balón {item.cap}</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#00A878' }}>S/ {item.total.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCapacity('10 kg')
                      setCurrentScreen('checkout')
                    }}
                    style={{
                      width: '100%',
                      marginTop: 8,
                      background: '#F1F5F9',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#0F2E22',
                      cursor: 'pointer'
                    }}
                  >
                    Pedir de nuevo este balón
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Barra Inferior Android (M3 NavigationBar) */}
        <div className="app-bottombar">
          <button
            className={`app-nav-item ${currentScreen === 'home' || currentScreen === 'checkout' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('home')}
          >
            <i className="bi bi-fire" />
            <span>Catálogo</span>
          </button>
          <button
            className={`app-nav-item ${currentScreen === 'tracking' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('tracking')}
          >
            <i className="bi bi-truck" />
            <span>Rastrear</span>
          </button>
          <button
            className={`app-nav-item ${currentScreen === 'weight' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('weight')}
          >
            <i className="bi bi-speedometer" />
            <span>Balanza</span>
          </button>
          <button
            className={`app-nav-item ${currentScreen === 'scanner' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('scanner')}
          >
            <i className="bi bi-qr-code-scan" />
            <span>Pasaporte</span>
          </button>
          <button
            className={`app-nav-item ${currentScreen === 'history' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('history')}
          >
            <i className="bi bi-clock-history" />
            <span>Historial</span>
          </button>
        </div>
      </div>
    </div>
  )
}
