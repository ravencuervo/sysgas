import './ValueProposition.css'

const FEATURES = [
  {
    icon: 'bi-speedometer2',
    title: 'Registro de peso en la entrega',
    desc: 'Consulta la tara y el peso registrado por el repartidor al entregar tu balón.',
    highlight: 'Peso neto calculado',
  },
  {
    icon: 'bi-shield-fill-check',
    title: 'Historial del balón',
    desc: 'Consulta los eventos de llenado, inspección y entrega registrados por la distribuidora.',
    highlight: 'Consulta mediante QR',
  },
  {
    icon: 'bi-lightning-charge-fill',
    title: 'Despacho Rápido a tu Zona',
    desc: 'La empresa recibe tu pedido y asigna un repartidor para coordinar la entrega.',
    highlight: 'Atención según cobertura',
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
