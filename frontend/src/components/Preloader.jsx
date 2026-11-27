export default function Preloader({ label = 'Cargando SYSGAS…', overlay = false }) {
  return (
    <div
      className={`sys-preloader ${overlay ? 'sys-preloader--overlay' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="sys-preloader__inner">
        <div className="sys-preloader__ring" aria-hidden="true">
          <span className="sys-preloader__arc" />
          <img
            src="/images/logos/sysgas_emblem.png"
            alt=""
            className="sys-preloader__logo"
          />
        </div>
        <p className="sys-preloader__label">{label}</p>
      </div>
    </div>
  )
}
