import { useEffect, useRef, useState } from 'react'
import './StatsBar.css'

const METRICS = [
  {
    num: 24500,
    prefix: '+',
    suffix: '',
    label: 'Balones Despachados',
    sub: 'Trazabilidad y verificación con QR',
    icon: 'bi-box-seam',
  },
  {
    num: 1820,
    prefix: '+',
    suffix: '',
    label: 'Pruebas ISO Aprobadas',
    sub: 'Hermeticidad y presión 14.7 bar',
    icon: 'bi-patch-check-fill',
  },
  {
    num: 99.4,
    prefix: '',
    suffix: '%',
    label: 'Entregas a Tiempo',
    sub: 'Promedio de despacho < 35 min',
    icon: 'bi-lightning-charge-fill',
  },
  {
    num: 12,
    prefix: '',
    suffix: '',
    label: 'Ciudades Conectadas',
    sub: 'Red de plantas y centros de acopio',
    icon: 'bi-geo-alt-fill',
  },
]

function AnimatedCounter({ target, active, decimals = 0 }) {
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!active) return
    let start = null
    const duration = 1600

    const step = (timestamp) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const current = progress * target
      setVal(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current))
      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }
    requestAnimationFrame(step)
  }, [active, target, decimals])

  return (
    <span>
      {decimals > 0 ? val.toFixed(decimals) : val.toLocaleString()}
    </span>
  )
}

export default function StatsBar() {
  const [isInView, setIsInView] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="px-stats section--alt" id="metricas" ref={ref}>
      <div className="container">
        <div className="px-stats__header">
          <div className="section-tag">
            <span className="section-tag__num">01</span>
            <span>Métricas Operacionales</span>
          </div>
          <h2 className="px-stats__title">Tecnología que impacta operaciones reales.</h2>
        </div>

        <div className="px-stats__grid">
          {METRICS.map((item, idx) => (
            <div key={item.label} className="px-stats__card">
              <div className="px-stats__card-top">
                <span className="px-stats__idx">0{idx + 1}</span>
                <i className={`bi ${item.icon} px-stats__icon`} />
              </div>

              <div className="px-stats__number">
                {item.prefix}
                <AnimatedCounter
                  target={item.num}
                  active={isInView}
                  decimals={item.num % 1 !== 0 ? 1 : 0}
                />
                {item.suffix}
              </div>

              <div className="px-stats__label">{item.label}</div>
              <div className="px-stats__sub">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
