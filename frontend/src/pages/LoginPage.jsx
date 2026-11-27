import { friendlyError } from '../lib/forms'
import { db } from '../lib/supabase'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AffiliationModal from '../components/AffiliationModal.jsx'
import HeroWaveGrid from '../components/HeroWaveGrid.jsx'
import MorphIcon from '../components/MorphIcon.jsx'
import Preloader from '../components/Preloader.jsx'
import './LoginPage.css'

const ROLE_ROUTES = {
  super_admin: { path: '/admin', label: 'Panel Administrador' },
  empresa_admin: { path: '/panel', label: 'Panel de Empresa' },
  chofer_repartidor: { path: '/gasero', label: 'Panel de Reparto' },
  planta_operador: { path: '/gasero', label: 'Panel de Planta' },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('error')
  const [activeSession, setActiveSession] = useState(null)
  const [affiliationOpen, setAffiliationOpen] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { data } = await db().auth.getSession()
        const sessionUser = data.session?.user
        if (!sessionUser) return
        const { data: perfil } = await db()
          .from('perfiles')
          .select('rol,activo')
          .eq('id', sessionUser.id)
          .single()
        if (!active || !perfil?.activo) return
        const target = ROLE_ROUTES[perfil.rol]
        if (target) {
          setActiveSession({
            email: sessionUser.email,
            path: target.path,
            roleLabel: target.label,
          })
        }
      } catch {
        // Sin sesión previa activa
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      const { data, error } = await db().auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      const { data: perfil } = await db()
        .from('perfiles')
        .select('rol,activo')
        .eq('id', data.user.id)
        .single()
      if (!perfil || !perfil.activo) {
        throw new Error('Tu cuenta no está activa.')
      }
      if (perfil.rol === 'super_admin') navigate('/admin')
      else if (perfil.rol === 'empresa_admin') navigate('/panel')
      else if (perfil.rol === 'chofer_repartidor' || perfil.rol === 'planta_operador') navigate('/gasero')
      else navigate('/')
    } catch (err) {
      setMsgType('error')
      setMsg(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const recover = async () => {
    if (!email.trim()) {
      setMsgType('error')
      setMsg('Escribe tu correo para recuperar tu contraseña.')
      return
    }
    try {
      const { error } = await db().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/recuperar`,
      })
      if (error) throw error
      setMsgType('success')
      setMsg('Revisa tu correo para continuar con el restablecimiento.')
    } catch (err) {
      setMsgType('error')
      setMsg(friendlyError(err))
    }
  }

  const checkCaps = (e) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLock(e.getModifierState('CapsLock'))
    }
  }

  return (
    <div className="login-split">
      {loading && <Preloader overlay label="Ingresando al sistema SYSGAS…" />}

      <aside className="login-split__brand">
        <HeroWaveGrid variant="hero" />

        <Link to="/" className="login-split__logo">
          <img
            src="/images/logos/sysgas_logo_monochrome_white.png"
            alt="SYSGAS"
            className="login-split__logo-img"
          />
          <span>SYSGAS</span>
        </Link>

        <div className="login-split__hero">
          <h2 className="login-split__headline">Un solo acceso para toda la operación.</h2>
          <p className="login-split__copy">
            Distribuidoras afiliadas y repartidores ingresan desde aquí a su panel operativo.
          </p>
          <ul className="login-split__points">
            <li className="sys-morph-trigger">
              <MorphIcon base="bi-qr-code" active="bi-qr-code-scan" className="login-split__point-icon" />
              <span>Control de inventario y trazabilidad QR</span>
            </li>
            <li className="sys-morph-trigger">
              <MorphIcon base="bi-clipboard-check" active="bi-clipboard2-check-fill" className="login-split__point-icon" />
              <span>Gestión de pedidos, rutas y cobros</span>
            </li>
            <li className="sys-morph-trigger">
              <MorphIcon base="bi-truck" active="bi-truck-front-fill" className="login-split__point-icon" />
              <span>Operación de flota y entregas en ruta</span>
            </li>
          </ul>
        </div>

        <Link to="/" className="login-split__back">
          <i className="bi bi-arrow-left" />
          <span>Volver a la página principal</span>
        </Link>
      </aside>

      <main className="login-split__main">
        <div className="login-form-wrap">
          {activeSession && (
            <div className="login-session-card">
              <div className="login-session-card__info">
                <span className="login-session-card__kicker">Sesión activa</span>
                <strong className="login-session-card__email">{activeSession.email}</strong>
                <span className="login-session-card__role">{activeSession.roleLabel}</span>
              </div>
              <button
                type="button"
                className="login-session-card__btn"
                onClick={() => navigate(activeSession.path)}
              >
                <span>Continuar</span>
                <i className="bi bi-arrow-right" />
              </button>
            </div>
          )}

          <div className="login-form-wrap__head">
            <h1 className="login-form-wrap__title">Iniciar sesión</h1>
            <p className="login-form-wrap__sub">
              Acceso exclusivo para distribuidoras afiliadas y repartidores.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form-wrap__form">
            <div className="login-card__field">
              <label className="login-card__label" htmlFor="login-email">
                Correo electrónico
              </label>
              <div className="login-card__input-wrap">
                <i className="bi bi-envelope login-card__input-icon" />
                <input
                  autoComplete="username"
                  id="login-email"
                  type="email"
                  className="login-card__input"
                  placeholder="tu-correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-card__field">
              <div className="login-card__label-row">
                <label className="login-card__label" htmlFor="login-pass">
                  Contraseña
                </label>
                <button type="button" onClick={recover} className="login-card__forgot-link">
                  ¿Olvidaste tu clave?
                </button>
              </div>
              <div className="login-card__input-wrap">
                <i className="bi bi-lock login-card__input-icon" />
                <input
                  autoComplete="current-password"
                  id="login-pass"
                  type={showPass ? 'text' : 'password'}
                  className="login-card__input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={checkCaps}
                  onKeyDown={checkCaps}
                  required
                />
                <button
                  type="button"
                  className="login-card__toggle-pass"
                  onClick={() => setShowPass(!showPass)}
                  aria-label="Ver u ocultar contraseña"
                >
                  <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
              </div>
              {capsLock && (
                <p className="login-card__caps" role="status">
                  <i className="bi bi-capslock-fill" />
                  <span>Bloq Mayús activado</span>
                </p>
              )}
            </div>

            {msg && (
              <div
                className={`login-card__alert ${
                  msgType === 'success' ? 'login-card__alert--success' : 'login-card__alert--error'
                }`}
                role="status"
              >
                <i className={`bi ${msgType === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`} />
                <span>{msg}</span>
              </div>
            )}

            <button type="submit" className="login-card__submit-btn" disabled={loading}>
              {loading ? (
                <span>Validando credenciales…</span>
              ) : (
                <>
                  <span>Ingresar al sistema</span>
                  <i className="bi bi-arrow-right" />
                </>
              )}
            </button>
          </form>

          <div className="login-form-wrap__links">
            <p>
              ¿Tu empresa aún no está afiliada?{' '}
              <button
                type="button"
                className="login-form-wrap__aff-btn"
                onClick={() => setAffiliationOpen(true)}
              >
                Solicitar afiliación
              </button>
            </p>
          </div>
        </div>
      </main>

      {affiliationOpen && (
        <AffiliationModal onClose={() => setAffiliationOpen(false)} />
      )}
    </div>
  )
}
