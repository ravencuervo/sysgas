import { useCatalog } from '../hooks/useCatalog'
import CatalogCylinder3D from './CatalogCylinder3D.jsx'
import './CatalogSection.css'

export default function CatalogSection({ onSelectProduct }) {
  const { products, error, loading } = useCatalog()
  const handleSelect = (capacity) => {
    if (onSelectProduct) onSelectProduct(capacity)
    const appEl = document.getElementById('app-movil')
    if (appEl) {
      appEl.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="section px-catalog section--white" id="catalogo">
      <div className="container">
        <div className="px-catalog__header reveal">
          <h2 className="section-title">Elige tu cilindro y tu distribuidora.</h2>
          <p className="section-desc">
            Cada balón incluye garantía de peso exacto, precinto inviolable y pasaporte QR escaneable desde tu celular. Gira e inspecciona cada modelo en 3D con sus medidas oficiales.
          </p>
        </div>

        {loading && <p role="status">Cargando catálogo…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && !products.length && <p>No hay productos disponibles por el momento.</p>}

        <div className="px-catalog__grid">
          {products.map((item, idx) => (
            <article
              key={item.capacity}
              className={`px-catalog__item reveal reveal-delay-${idx + 1} ${
                item.popular ? 'px-catalog__item--popular' : ''
              }`}
            >
              <div className="px-catalog__item-head">
                <div>
                  <span className="px-catalog__capacity">{item.capacity}</span>
                  <span className="px-catalog__name">{item.name}</span>
                </div>
                {item.popular && <span className="px-catalog__popular-label">Más pedido</span>}
              </div>

              <div className="px-catalog__3d-stage">
                <div className="px-catalog__3d-canvas-wrap">
                  <CatalogCylinder3D capacity={item.capacity} />
                </div>
                <div className="px-catalog__3d-meta">
                  <span title={`Medidas oficiales: ${item.dimensions}`}>
                    <i className="bi bi-rulers" /> {item.dimensions}
                  </span>
                  <span>
                    <i className="bi bi-arrow-repeat" /> 3D 360°
                  </span>
                </div>
              </div>

              <div className="px-catalog__price-box">
                <span className="px-catalog__price">{item.price}</span>
                <span className="px-catalog__price-sub">precio de referencia · elige distribuidora al pedir</span>
              </div>

              <p className="px-catalog__ideal">{item.idealFor}</p>

              <ul className="px-catalog__specs-list">
                {item.specs.map((spec, i) => (
                  <li key={i} className="px-catalog__spec-item">
                    <i className="bi bi-check2 text-jade" />
                    <span>{spec}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleSelect(item.capacity)}
                className={`btn px-catalog__btn ${item.popular ? 'btn-primary' : 'btn-secondary'}`}
              >
                <span>Pedir {item.capacity} Ahora</span>
                <i className="bi bi-arrow-right" />
              </button>
            </article>
          ))}
        </div>

        <div className="px-catalog__trust-bar reveal reveal-delay-4">
          <div className="px-catalog__trust-item">
            <i className="bi bi-clock-history text-jade" />
            <div>
              <strong>Entrega coordinada con tu distribuidora</strong>
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
