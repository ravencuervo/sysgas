import './LifecycleTimeline.css'

const STEPS = [
  {
    num: '01',
    title: 'Elige tu balón en segundos',
    desc: 'Selecciona la capacidad que necesitas (5 kg, 10 kg o 45 kg) e ingresa tu dirección sin registros complicados.',
    meta: '30 segundos',
  },
  {
    num: '02',
    title: 'Tu repartidor va en camino',
    desc: 'El sistema asigna de inmediato el pedido a la unidad en ruta más cercana a tu hogar con geolocalización en vivo.',
    meta: '~25 minutos',
  },
  {
    num: '03',
    title: 'Pesaje y prueba en tu puerta',
    desc: 'El despachador pesa el cilindro con balanza digital frente a ti y escaneas el QR para verificar el sello hermético.',
    meta: 'Peso registrado',
  },
]

export default function LifecycleTimeline() {
  return (
    <section className="section px-steps section--smoke" id="como-funciona">
      <div className="container">
        <div className="px-steps__header reveal">
          <h2 className="section-title">Tu gas en casa en 3 simples pasos.</h2>
          <p className="section-desc">
            Sin formularios interminables ni incertidumbre. Transparencia total desde que haces tu pedido hasta que lo instalamos en tu cocina.
          </p>
        </div>

        <div className="px-steps__grid">
          {STEPS.map((step, idx) => (
            <div
              key={step.num}
              className={`px-steps__item reveal reveal-delay-${idx + 1}`}
            >
              <div className="px-steps__top">
                <span className="px-steps__num">{step.num}</span>
                <span className="px-steps__meta">{step.meta}</span>
              </div>
              <h3 className="px-steps__title">{step.title}</h3>
              <p className="px-steps__desc">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="px-steps__cta reveal reveal-delay-4">
          <a href="#contacto" className="btn btn-primary">
            <span>Pedir Mi Balón Ahora</span>
            <i className="bi bi-arrow-right" />
          </a>
        </div>
      </div>
    </section>
  )
}
