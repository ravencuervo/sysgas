import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/supabase'
import { friendlyError } from '../lib/forms'
import './LoginPage.css'

export default function Register() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)
  async function submit(e) {
    e.preventDefault()
    if (busy) return
    const fields = Object.fromEntries(new FormData(e.currentTarget))
    if (fields.password !== fields.confirmation) { setMessage('Las contraseñas no coinciden.'); return }
    if (fields.nombres.trim().length < 2 || fields.apellidos.trim().length < 2) { setMessage('Completa tus nombres y apellidos.'); return }
    setBusy(true)
    setMessage('')
    try {
      const { error } = await db().auth.signUp({
        email: fields.email.trim(), password: fields.password,
        options: { data: { nombres: fields.nombres.trim(), apellidos: fields.apellidos.trim() },
          emailRedirectTo: `${window.location.origin}/panel` },
      })
      if (error) throw error
      setDone(true)
    } catch (e) { setMessage(friendlyError(e)) }
    finally { setBusy(false) }
  }
  return <main className="login-page"><div className="login-page__main"><div className="login-card">
    <Link to="/">← Volver a SYSGAS</Link>
    <h1 className="login-card__title">Crea tu cuenta de cliente</h1>
    <p>Inicia sesión antes de pedir para consultar tus pedidos desde el panel.</p>
    {done ? <div role="status"><p>Solicitud procesada. Si tu correo necesita confirmación, revisa tu bandeja de entrada antes de iniciar sesión.</p><Link className="btn btn-primary" to="/login">Ir al acceso</Link></div> :
      <form className="login-card__form" onSubmit={submit}>
        <label className="login-card__field">Nombres<input className="login-card__input" name="nombres" autoComplete="given-name" required minLength={2} maxLength={100} /></label>
        <label className="login-card__field">Apellidos<input className="login-card__input" name="apellidos" autoComplete="family-name" required minLength={2} maxLength={100} /></label>
        <label className="login-card__field">Correo<input className="login-card__input" name="email" type="email" autoComplete="email" required maxLength={120} /></label>
        <label className="login-card__field">Contraseña<input className="login-card__input" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
        <label className="login-card__field">Confirma tu contraseña<input className="login-card__input" name="confirmation" type="password" autoComplete="new-password" minLength={8} required /></label>
        <p>Usa al menos 8 caracteres. Las cuentas de empresa requieren afiliación.</p>
        {message && <p role="alert">{message}</p>}
        <button className="login-card__submit-btn" disabled={busy}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</button>
      </form>}
    <p>¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link></p>
  </div></div></main>
}
