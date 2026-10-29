import './ValueProposition.css'

const FEATURES = [
  {
    icon: 'bi-speedometer2',
    title: 'Peso Exacto al Gramo',
    desc: 'Cada cilindro cuenta con su tara calibrada de fábrica. Verificamos el peso neto en tu puerta antes de instalarlo.',
    highlight: 'Garantía 100% de llenado',
  },
  {
    icon: 'bi-shield-fill-check',
    title: 'Sello Hermético Inviolable',
    desc: 'Precinto probado a 14.7 bar bajo norma ISO 4706. Cero fugas y máxima concentración de gas licuado para mayor duración.',
    highlight: 'Certificación ISO 9001:2015',
  },
  {
    icon: 'bi-lightning-charge-fill',
    title: 'Despacho Rápido a tu Zona',
    desc: 'Unidades de distribución inteligentes en ruta para que tu pedido llegue en promedio en 25 minutos a tu hogar.',
    highlight: 'Tiempo promedio: ~25 min',
  },
]

export default function ValueProposition() {
  return (
    <section className="section px-value section--alt" id="capacidades">
      <div className="container">
        {/* Cabecera Limpia */}
        <div className="px-value__header reveal">
          <div className="section-tag">
            <span className="section-tag__num">06</span>
            <span>POR QUÉ SYSGAS</span>
          </div>
          <h2 className="section-title">La diferencia está en la tranquilidad.</h2>
          <p className="section-desc">
            Diseñado desde cero para que nunca más tengas dudas sobre la duración de tu balón ni sobre la seguridad de tu familia.
          </p>
        </div>

        {/* 3 Tarjetas Espaciadas y Limpias */}
        <div className="px-value__grid">
          {FEATURES.map((item, idx) => (
            <div
              key={item.title}
              className={`px-value__card solid-card card-hover-lift reveal reveal-delay-${idx + 1}`}
            >
              <div className="px-value__icon-box">
                <i className={`bi ${item.icon}`} />
              </div>

              <h3 className="px-value__title">{item.title}</h3>
              <p className="px-value__desc">{item.desc}</p>

              <div className="px-value__footer">
                <span className="solid-badge solid-badge--jade">
                  <i className="bi bi-check-circle-fill" /> {item.highlight}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
