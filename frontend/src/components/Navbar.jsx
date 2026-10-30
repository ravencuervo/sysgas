import { useSession } from '../hooks/useSession'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  const session = useSession()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '#inicio', label: 'Inicio', active: true },
    { href: '#catalogo', label: 'Catálogo' },
    { href: '#qr-demo', label: 'Verificación QR' },
    { href: '#app-movil', label: 'App Móvil' },
    { href: '#empresas', label: 'Empresas B2B' },
    { href: '#como-funciona', label: 'Cómo Funciona' },
    { href: '#contacto', label: 'Pedir Balón' },
  ]

  return (
    <header className={`sys-nav ${scrolled ? 'sys-nav--scrolled' : ''}`}>
      <div className="container sys-nav__container">
        {/* Brand / Logo SYSGAS Monocromático Blanco del Logo Original */}
        <Link to="/" className="sys-nav__brand">
          <img
            src="/images/logos/sysgas_logo_monochrome_white.png"
            alt="SYSGAS Logo"
            className="sys-nav__logo-white"
          />
          <div className="sys-nav__brand-info">
            <span className="sys-nav__brand-title">SYSGAS</span>
            <span className="sys-nav__brand-sub">DISPENSA DIGITAL</span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className={`sys-nav__menu ${menuOpen ? 'sys-nav__menu--open' : ''}`}>
          <ul className="sys-nav__list">
            {navLinks.map((item) => (
              <li key={item.href} className="sys-nav__item">
                <a
                  href={item.href}
                  className={`sys-nav__link ${item.active ? 'sys-nav__link--active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right CTA Button: LOGIN para acceso a plataforma y empresas */}
        <div className="sys-nav__actions">
          <Link to={session ? "/panel" : "/login"} className="sys-nav__pill-btn">
            <i className="bi bi-box-arrow-in-right" />
            <span>{session ? "MI PANEL" : "INGRESAR"}</span>
          </Link>
        </div>

        {/* Mobile Toggle Button */}
        <button
          className="sys-nav__toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
        >
          <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'}`} />
        </button>
      </div>
    </header>
  )
}
