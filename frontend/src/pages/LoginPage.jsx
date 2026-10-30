import { friendlyError } from '../lib/forms'
import { db } from '../lib/supabase'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      const { error } = await db().auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      navigate('/panel')
    } catch (e) { setMsg(friendlyError(e)) }
    finally { setLoading(false) }
  }

  const recover = async () => {
    if (!email) { setMsg('Escribe tu correo para recuperar tu contraseña.'); return }
    try {
      const { error } = await db().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/recuperar` })
      if (error) throw error
      setMsg('Revisa tu correo para continuar.')
    } catch (e) { setMsg(friendlyError(e)) }
  }

  return (
    <div className="login-page">
      {/* Contenedor Central */}
      <main className="login-page__main">
        <div className="login-card">
          {/* Header del Card con Logo Oficial SYSGAS */}
          <div className="login-card__header">
            <Link to="/" className="login-card__icon-box" title="Volver a SYSGAS">
              <img
                src="/images/logos/sysgas_emblem.png"
                alt="SYSGAS Logo"
                className="login-card__logo-img"
              />
            </Link>
            <h1 className="login-card__title">Acceso a la Plataforma</h1>
            <p className="login-card__subtitle">
              Acceso para clientes, empresas y trabajadores de SYSGAS
            </p>
          </div>

          <p className="login-card__subtitle">Tu panel se adapta al rol de tu cuenta.</p>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="login-card__form">
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
                  Contraseña de acceso
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
            </div>

            {msg && (
              <div className="login-card__alert" role="status">
                <i className="bi bi-check-circle-fill" />
                <span>{msg}</span>
              </div>
            )}

            <button type="submit" className="login-card__submit-btn" disabled={loading}>
              {loading ? (
                <span>Validando credenciales...</span>
              ) : (
                <>
                  <span>Ingresar al Sistema SYSGAS</span>
                  <i className="bi bi-arrow-right" />
                </>
              )}
            </button>
          </form>

          <p>¿Quieres consultar tus pedidos? <Link to="/registro">Crea tu cuenta de cliente</Link></p>
          {/* Footer de la tarjeta */}
          <div className="login-card__footer">
            <p>
              ¿Tu empresa distribuidora aún no usa SYSGAS?{' '}
              <Link to="/#empresas" className="login-card__partner-link">
                Solicita una afiliación
              </Link>
            </p>
            <p className="login-card__back-home">
              <Link to="/">
                <i className="bi bi-arrow-left" /> Volver a la página principal
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

