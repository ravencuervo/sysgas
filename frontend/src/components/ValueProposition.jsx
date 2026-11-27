import MorphIcon from './MorphIcon.jsx'
import './ValueProposition.css'

const FEATURES = [
  {
    baseIcon: 'bi-speedometer',
    activeIcon: 'bi-speedometer2',
    title: 'Registro de peso en la entrega',
    desc: 'Consulta la tara y el peso registrado por el repartidor al entregar tu balón.',
    highlight: 'Peso neto calculado',
  },
  {
    baseIcon: 'bi-shield-check',
    activeIcon: 'bi-shield-fill-check',
    title: 'Historial del balón',
    desc: 'Consulta los eventos de llenado, inspección y entrega registrados por la distribuidora.',
    highlight: 'Consulta mediante QR',
  },
  {
    baseIcon: 'bi-lightning-charge',
    activeIcon: 'bi-lightning-charge-fill',
    title: 'Despacho rápido a tu zona',
    desc: 'La empresa recibe tu pedido y asigna un repartidor para coordinar la entrega.',
    highlight: 'Atención según cobertura',
  },
]

export default function ValueProposition() {
  return (
    <section className="section px-value section--white" id="capacidades">
      <div className="container">
        <div className="px-value__layout">
          <div className="px-value__header reveal">
            <h2 className="section-title">La diferencia está en la tranquilidad.</h2>
            <p className="section-desc">
              Diseñado desde cero para que nunca más tengas dudas sobre la duración de tu balón ni sobre la seguridad de tu familia.
            </p>
          </div>

          <div className="px-value__list">
            {FEATURES.map((item, idx) => (
              <div
                key={item.title}
                className={`px-value__row reveal reveal-delay-${idx + 1}`}
              >
                <MorphIcon
                  base={item.baseIcon}
                  active={item.activeIcon}
                  className="px-value__icon"
                />
                <div className="px-value__content">
                  <div className="px-value__row-head">
                    <h3 className="px-value__title">{item.title}</h3>
                    <span className="px-value__highlight">{item.highlight}</span>
                  </div>
                  <p className="px-value__desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
