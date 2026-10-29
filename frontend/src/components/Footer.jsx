import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="px-footer-ref">
      {/* ─── ZONA SUPERIOR: 3 COLUMNAS INSTITUCIONALES ─── */}
      <div className="px-footer-ref__top">
        <div className="container px-footer-ref__container">
          {/* Columna Izquierda: Reseña Institucional + Sello Oficial */}
          <div className="px-footer-ref__col-left">
            <p className="px-footer-ref__desc">
              SYSGAS Puno es la red y plataforma tecnológica líder en distribución, trazabilidad y dispensación segura de gas licuado de petróleo (GLP) en la región de Puno. Comprometidos con la seguridad energética de hogares y empresas puneñas, garantizamos cilindros con calibración de tara digital, sello hermético inviolable y despacho optimizado bajo estrictas normas de control y calidad nacional.
            </p>

            {/* Sello Circular Oficial de Certificación */}
            <div className="px-footer-ref__seal-box">
              <div className="px-footer-ref__seal-ring">
                <svg viewBox="0 0 100 100" className="px-footer-ref__seal-svg">
                  <path
                    id="sealCirclePath"
                    d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                    fill="none"
                  />
                  <text className="px-footer-ref__seal-text">
                    <textPath xlinkHref="#sealCirclePath" startOffset="50%" textAnchor="middle">
                      CERTIFICACIÓN ISO 9001 · ISO 4706 · OSINERGMIN
                    </textPath>
                  </text>
                </svg>
                <div className="px-footer-ref__seal-center">
                  <i className="bi bi-patch-check-fill" />
                  <span className="px-footer-ref__seal-sub">PUNO · 100% SEGURO</span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Central: Gran Emblema Oficial + Lema Institucional */}
          <div className="px-footer-ref__col-center">
            <Link to="/" className="px-footer-ref__emblem-link" title="SYSGAS Puno Energía Pura">
              <img
                src="/images/logos/sysgas_emblem.png"
                alt="Emblema Oficial SYSGAS"
                className="px-footer-ref__emblem-img"
              />
            </Link>
            <p className="px-footer-ref__motto">"Energía Pura, Peso Exacto, Confianza Total"</p>
          </div>

          {/* Columna Derecha: Datos de Contacto + Botones de Redes Sociales */}
          <div className="px-footer-ref__col-right">
            <ul className="px-footer-ref__contact-list">
              <li className="px-footer-ref__contact-item">
                <i className="bi bi-telephone-fill" />
                <span><strong>Tel:</strong> (051) 359900</span>
              </li>
              <li className="px-footer-ref__contact-item">
                <i className="bi bi-phone-fill" />
                <span><strong>Cel:</strong> +51 951 667 696</span>
              </li>
              <li className="px-footer-ref__contact-item">
                <i className="bi bi-whatsapp" />
                <span><strong>Cel:</strong> +51 943 592 886</span>
              </li>
              <li className="px-footer-ref__contact-item">
                <i className="bi bi-envelope-fill" />
                <span><strong>Correo Electrónico:</strong> contacto@sysgas.pe</span>
              </li>
            </ul>

            {/* Círculos de Redes Sociales Monocromáticos */}
            <div className="px-footer-ref__social-circles">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-footer-ref__social-btn"
                aria-label="Facebook SYSGAS"
              >
                <i className="bi bi-facebook" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-footer-ref__social-btn"
                aria-label="YouTube SYSGAS"
              >
                <i className="bi bi-youtube" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-footer-ref__social-btn"
                aria-label="TikTok SYSGAS"
              >
                <i className="bi bi-tiktok" />
              </a>
              <a
                href="https://wa.me/51951667696"
                target="_blank"
                rel="noopener noreferrer"
                className="px-footer-ref__social-btn"
                aria-label="WhatsApp SYSGAS"
              >
                <i className="bi bi-whatsapp" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ZONA INFERIOR: FRANJA CONTRASTE PROFUNDO + TEXTO ANIMADO SYSGAS + PUNO ─── */}
      <div className="px-footer-ref__bottom">
        <div className="container px-footer-ref__bottom-container">
          {/* Texto Animado SYSGAS que Aparece y Desaparece con Color / Glow */}
          <div className="px-footer-ref__pulse-brand">
            <span className="px-footer-ref__brand-glow-text">SYSGAS</span>
          </div>

          {/* Líneas Institucionales Centrales */}
          <h4 className="px-footer-ref__legal-title">SYSGAS Puno - Trazabilidad y Distribución de GLP</h4>
          <p className="px-footer-ref__legal-sub">Plataforma Tecnológica de Trazabilidad Integral &amp; Dispensación Segura</p>
          <p className="px-footer-ref__legal-cert">Cumplimiento Normativo NTP 321 · Certificación Oficial de Calibración de Tara</p>
          <p className="px-footer-ref__legal-copy">Puno – Perú © 2026</p>

          {/* Iconos de Redes Sociales Centrales en Miniatura */}
          <div className="px-footer-ref__bottom-social">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i className="bi bi-facebook" />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <i className="bi bi-youtube" />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <i className="bi bi-tiktok" />
            </a>
            <a href="https://wa.me/51987654321" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <i className="bi bi-whatsapp" />
            </a>
          </div>

          {/* Botón Flotante para Volver Arriba */}
          <button
            type="button"
            className="px-footer-ref__scroll-top"
            onClick={scrollToTop}
            title="Volver al inicio"
            aria-label="Volver al inicio"
          >
            <i className="bi bi-chevron-up" />
          </button>
        </div>
      </div>
    </footer>
  )
}
