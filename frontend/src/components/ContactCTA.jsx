import { useState } from 'react'
import './ContactCTA.css'

const CYLINDER_OPTIONS = [
  { id: '10 kg', name: '10 kg Familiar', price: 'S/ 48.00', popular: true },
  { id: '5 kg', name: '5 kg Portátil', price: 'S/ 28.50', popular: false },
  { id: '45 kg', name: '45 kg Industrial', price: 'S/ 185.00', popular: false },
]

export default function ContactCTA({ selectedCapacity }) {
  const [capacity, setCapacity] = useState(selectedCapacity || '10 kg')
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    referencia: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.nombre || !formData.telefono || !formData.direccion) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 800)
  }

  const whatsappMessage = encodeURIComponent(
    `¡Hola SYSGAS! Deseo solicitar un balón de ${capacity} a la dirección: ${formData.direccion || '(indicar dirección)'}. Mi nombre es ${formData.nombre || ''}.`
  )

  return (
    <section className="section px-cta section--alt" id="contacto">
      <div className="container">
        {/* Cabecera Limpia */}
        <div className="px-cta__header reveal">
          <div className="section-tag">
            <span className="section-tag__num">07</span>
            <span>PEDIDO EXPRESS</span>
          </div>
          <h2 className="section-title">Pide tu balón SYSGAS en un instante.</h2>
          <p className="section-desc">
            Indica tu dirección y el cilindro que necesitas. Coordinamos la entrega inmediata con la unidad más cercana a tu zona.
          </p>
        </div>

        <div className="px-cta__box solid-card reveal reveal-delay-1">
          {submitted ? (
            <div className="px-cta__success">
              <div className="px-cta__success-icon">
                <i className="bi bi-check-circle-fill text-jade" />
              </div>
              <h3 className="px-cta__success-title">¡Pedido Recibido con Éxito!</h3>
              <p className="px-cta__success-desc">
                Hemos asignado tu pedido de <strong>{capacity}</strong> al despachador más cercano. Te contactaremos al <strong>{formData.telefono}</strong> en los próximos minutos.
              </p>
              <div className="px-cta__success-actions">
                <a
                  href={`https://wa.me/?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <i className="bi bi-whatsapp" />
                  <span>Confirmar por WhatsApp</span>
                </a>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSubmitted(false)}
                >
                  Hacer Otro Pedido
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-cta__form">
              {/* Selector Rápido de Balón */}
              <div className="px-cta__field">
                <label className="px-cta__label">1. Selecciona tu cilindro:</label>
                <div className="px-cta__cylinder-selector">
                  {CYLINDER_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`px-cta__cylinder-pill ${capacity === c.id ? 'px-cta__cylinder-pill--active' : ''}`}
                      onClick={() => setCapacity(c.id)}
                    >
                      <span className="px-cta__pill-name">{c.name}</span>
                      <span className="px-cta__pill-price">{c.price}</span>
                      {c.popular && <span className="px-cta__pill-star"><i className="bi bi-star-fill" /> Más pedido</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campos Rápidos de Entrega */}
              <div className="px-cta__field">
                <label className="px-cta__label">2. Datos de entrega:</label>
                <div className="px-cta__grid-inputs">
                  <div className="px-cta__input-wrap">
                    <label className="px-cta__sublabel" htmlFor="nombre">Tu Nombre Completo</label>
                    <input
                      id="nombre"
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      placeholder="Ej. María Sánchez"
                      className="px-cta__input"
                      required
                    />
                  </div>

                  <div className="px-cta__input-wrap">
                    <label className="px-cta__sublabel" htmlFor="telefono">Teléfono / WhatsApp</label>
                    <input
                      id="telefono"
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      placeholder="Ej. 987 654 321"
                      className="px-cta__input"
                      required
                    />
                  </div>
                </div>

                <div className="px-cta__input-wrap px-cta__input-wrap--full">
                  <label className="px-cta__sublabel" htmlFor="direccion">Dirección y Distrito</label>
                  <input
                    id="direccion"
                    type="text"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    placeholder="Ej. Av. Los Próceres 452, Dpto 301, Surco"
                    className="px-cta__input"
                    required
                  />
                </div>
              </div>

              {/* Botones de Envío */}
              <div className="px-cta__actions">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary px-cta__submit-btn"
                >
                  {loading ? (
                    <>
                      <i className="bi bi-arrow-repeat px-qr__spin" />
                      <span>Coordinando Despachador...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-truck" />
                      <span>Confirmar Despacho a Domicilio</span>
                      <i className="bi bi-arrow-right" />
                    </>
                  )}
                </button>

                <a
                  href={`https://wa.me/?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary px-cta__wa-btn"
                >
                  <i className="bi bi-whatsapp text-jade" />
                  <span>Pedir Directo por WhatsApp</span>
                </a>
              </div>

              <div className="px-cta__guarantee">
                <i className="bi bi-shield-check text-jade" />
                <span>Pago contra entrega en efectivo, Yape, Plin o tarjeta · Pesaje verificado con balanza en puerta</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
