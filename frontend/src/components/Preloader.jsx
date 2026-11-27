export default function Preloader({ label = 'Cargando SYSGAS…', overlay = false }) {
  return (
    <div
      className={`sys-preloader ${overlay ? 'sys-preloader--overlay' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="sys-preloader__inner">
        <img
          src="/images/logos/sysgas_logo_monochrome_white.png"
          alt="SYSGAS"
          className="sys-preloader__logo"
        />

        <div className="sys-preloader__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        {label ? <p className="sys-preloader__label">{label}</p> : null}
      </div>
    </div>
  )
}
