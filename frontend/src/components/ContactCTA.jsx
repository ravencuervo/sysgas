import { Link } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import './ContactCTA.css'

const ORDER_CHANNELS = [
  {
    icon: 'bi-person-check-fill',
    title: 'Todo desde tu cuenta SYSGAS',
    desc: 'Regístrate o inicia sesión para solicitar tu balón sin intermediarios ni mensajes externos.',
  },
  {
    icon: 'bi-geo-alt-fill',
    title: 'Distribuidora asignada por zona',
    desc: 'El sistema muestra las distribuidoras con stock disponible en tu ciudad y distrito.',
  },
  {
    icon: 'bi-receipt',
    title: 'Seguimiento y comprobante en el panel',
    desc: 'Consulta el estado de tu entrega, el peso registrado en puerta y tu historial completo.',
  },
]

export default function ContactCTA({ selectedCapacity }) {
  const session = useSession()

  return (
    <section className="section px-cta section--smoke" id="contacto">
      <div className="container">
        <div className="px-cta__layout">
          <div className="px-cta__header reveal">
            <h2 className="section-title">Pide tu balón directamente en el sistema SYSGAS.</h2>
            <p className="section-desc">
              Todos los pedidos, asignaciones de repartidor y verificaciones de peso se gestionan dentro de la plataforma para garantizar trazabilidad de principio a fin.
            </p>
            {selectedCapacity && (
              <p className="px-cta__selected-note">
                Capacidad seleccionada en catálogo: <strong>{selectedCapacity}</strong>
              </p>
            )}
            <div className="px-cta__actions">
              {session ? (
                <Link to="/panel" className="btn btn-primary">
                  <span>Ir a mi panel de pedidos</span>
                  <i className="bi bi-arrow-right" />
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn btn-primary">
                    <span>Ingresar al sistema</span>
                    <i className="bi bi-arrow-right" />
                  </Link>
                  <Link to="/registro" className="px-cta__secondary-link">
                    Crear cuenta nueva
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="px-cta__list">
            {ORDER_CHANNELS.map((item, idx) => (
              <div key={item.title} className={`px-cta__item reveal reveal-delay-${idx + 1}`}>
                <i className={`bi ${item.icon} px-cta__item-icon`} />
                <div>
                  <h3 className="px-cta__item-title">{item.title}</h3>
                  <p className="px-cta__item-desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
