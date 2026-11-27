import { friendlyError } from '../lib/forms'
import { db } from '../lib/supabase'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Preloader from '../components/Preloader.jsx'
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
      setMsg(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const recover = async () => {
    if (!email.trim()) {
      setMsg('Escribe tu correo para recuperar tu contraseña.')
      return
    }
    try {
      const { error } = await db().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/recuperar`,
      })
      if (error) throw error
      setMsg('Revisa tu correo para continuar.')
    } catch (err) {
      setMsg(friendlyError(err))
    }
  }

  return (
    <div className="login-split">
      {loading && <Preloader overlay label="Ingresando al sistema SYSGAS…" />}
      <aside className="login-split__brand">
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
            <li><i className="bi bi-check2" /> Control de inventario y trazabilidad QR</li>
            <li><i className="bi bi-check2" /> Gestión de pedidos, rutas y cobros</li>
            <li><i className="bi bi-check2" /> Operación de flota y entregas en ruta</li>
          </ul>
        </div>

        <Link to="/" className="login-split__back">
          <i className="bi bi-arrow-left" />
          <span>Volver a la página principal</span>
        </Link>
      </aside>

      <main className="login-split__main">
        <div className="login-form-wrap">
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
                <i className="bi bi-info-circle-fill" />
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
              ¿Tu empresa aún no está afiliada? <Link to="/#empresas">Solicitar afiliación</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
