import CatalogCylinder3D from './CatalogCylinder3D.jsx'
import './CatalogSection.css'

const PRODUCTS = [
  {
    capacity: '5 kg',
    name: 'Balón Portátil',
    dimensions: '38 cm alto × 23 cm ø',
    idealFor: 'Departamentos, campamentos, parrillas y espacios reducidos.',
    price: 'S/ 28.50',
    tara: '6.2 kg',
    popular: false,
    icon: 'bi-house-heart-fill',
    specs: ['Tara certificada 6.2 kg', 'Conexión rápida 7/8"', 'Sello hermético probado'],
  },
  {
    capacity: '10 kg',
    name: 'Balón Familiar',
    dimensions: '62 cm alto × 30 cm ø',
    idealFor: 'El más elegido para hogares familiares, cocinas y pequeños negocios.',
    price: 'S/ 48.00',
    tara: '11.5 kg',
    popular: true,
    icon: 'bi-fire',
    specs: ['Tara calibrada 11.5 kg', 'Sello inviolable con QR', 'Pesaje en balanza digital en puerta'],
  },
  {
    capacity: '45 kg',
    name: 'Balón Industrial',
    dimensions: '132 cm alto × 38 cm ø',
    idealFor: 'Restaurantes, panaderías, hoteles y calderas de alta demanda.',
    price: 'S/ 185.00',
    tara: '38.0 kg',
    popular: false,
    icon: 'bi-building-fill-gear',
    specs: ['Tara de alta carga 38.0 kg', 'Válvula POL con doble alivio', 'Monitoreo de ruta programado'],
  },
]

export default function CatalogSection({ onSelectProduct }) {
  const handleSelect = (capacity) => {
    if (onSelectProduct) onSelectProduct(capacity)
    const contactEl = document.getElementById('contacto')
    if (contactEl) {
      contactEl.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="section px-catalog section--white" id="catalogo">
      <div className="container">
        {/* Cabecera Limpia y Directa */}
        <div className="px-catalog__header reveal">
          <div className="section-tag">
            <span className="section-tag__num">01</span>
            <span>CATÁLOGO SYSGAS</span>
          </div>
          <h2 className="section-title">Elige tu cilindro. Recíbelo en minutos.</h2>
          <p className="section-desc">
            Cada balón incluye garantía de peso exacto, precinto inviolable y pasaporte QR escaneable desde tu celular. Gira e inspecciona cada modelo en 3D con sus medidas oficiales.
          </p>
        </div>

        {/* Grid de Productos Estilo Nike/Apple con Modelos 3D */}
        <div className="px-catalog__grid">
          {PRODUCTS.map((item, idx) => (
            <div
              key={item.capacity}
              className={`px-catalog__card solid-card card-hover-lift reveal reveal-delay-${idx + 1} ${
                item.popular ? 'px-catalog__card--popular' : ''
              }`}
            >
              {item.popular && (
                <div className="px-catalog__ribbon">
                  <span className="solid-badge solid-badge--jade"><i className="bi bi-star-fill" /> MÁS PEDIDO</span>
                </div>
              )}

              <div className="px-catalog__card-top">
                <div className="px-catalog__badge-icon">
                  <i className={`bi ${item.icon}`} />
                </div>
                <div className="px-catalog__meta">
                  <span className="px-catalog__capacity">{item.capacity}</span>
                  <span className="px-catalog__name">{item.name}</span>
                </div>
              </div>

              {/* Visor 3D Interactivo con Medidas Reales Calibradas */}
              <div className="px-catalog__3d-box">
                <div className="px-catalog__3d-canvas-wrap">
                  <CatalogCylinder3D capacity={item.capacity} />
                </div>
                <div className="px-catalog__3d-footer">
                  <span className="px-catalog__3d-dim" title={`Medidas oficiales: ${item.dimensions}`}>
                    <i className="bi bi-rulers" />
                    <span>{item.dimensions}</span>
                  </span>
                  <span className="px-catalog__3d-hint">
                    <i className="bi bi-arrow-repeat" />
                    <span>3D 360°</span>
                  </span>
                </div>
              </div>

              <div className="px-catalog__price-box">
                <span className="px-catalog__price">{item.price}</span>
                <span className="px-catalog__price-sub">con entrega a domicilio</span>
              </div>

              <p className="px-catalog__ideal">{item.idealFor}</p>

              <div className="px-catalog__specs-list">
                {item.specs.map((spec, i) => (
                  <div key={i} className="px-catalog__spec-item">
                    <i className="bi bi-check2-circle text-jade" />
                    <span>{spec}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleSelect(item.capacity)}
                className={`btn px-catalog__btn ${item.popular ? 'btn-primary' : 'btn-secondary'}`}
              >
                <span>Pedir {item.capacity} Ahora</span>
                <i className="bi bi-arrow-right" />
              </button>
            </div>
          ))}
        </div>

        {/* Barra de Confianza Apple-Style */}
        <div className="px-catalog__trust-bar reveal reveal-delay-4">
          <div className="px-catalog__trust-item">
            <i className="bi bi-clock-history text-jade" />
            <div>
              <strong>Entrega en ~25 minutos</strong>
              <span>Despachador más cercano a tu zona</span>
            </div>
          </div>
          <div className="px-catalog__trust-item">
            <i className="bi bi-speedometer text-jade" />
            <div>
              <strong>Pesaje en tu puerta</strong>
              <span>Balanzas digitales calibradas</span>
            </div>
          </div>
          <div className="px-catalog__trust-item">
            <i className="bi bi-shield-check text-jade" />
            <div>
              <strong>Garantía de peso exacto</strong>
              <span>Sello hermético 100% certificado</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
