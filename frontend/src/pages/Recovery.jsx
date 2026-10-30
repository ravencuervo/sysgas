import './LoginPage.css'
import { friendlyError } from '../lib/forms'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../lib/supabase'
export default function Recovery() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    let active=true
    try {
      db().auth.getSession().then(({data,error})=>{if(!active)return;if(error)setMessage(friendlyError(error));else if(data.session)setReady(true)}).catch(e=>{if(active)setMessage(friendlyError(e))})
      const { data } = db().auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') setReady(true) })
      return () => {active=false;data.subscription.unsubscribe()}
    } catch (e) { queueMicrotask(() => setMessage(friendlyError(e))) }
  }, [])
  async function submit(e) {
    e.preventDefault()
    if (password !== confirmation) { setMessage('Las contraseñas no coinciden.'); return }
    setBusy(true)
    setMessage('')
    try { const { error } = await db().auth.updateUser({ password }); if (error) throw error; navigate('/panel') }
    catch (e) { setMessage(friendlyError(e)) } finally { setBusy(false) }
  }
  return <main className="login-page"><div className="login-page__main"><div className="login-card">
    <Link to="/login">← Volver al acceso</Link><h1 className="login-card__title">Restablecer contraseña</h1>
    {ready ? <form className="login-card__form" onSubmit={submit}>
      <label className="login-card__field">Nueva contraseña<input className="login-card__input" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <label className="login-card__field">Confirma tu contraseña<input className="login-card__input" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
      <p>Usa al menos 8 caracteres.</p><button className="login-card__submit-btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
    </form> : <p>Abre el enlace de recuperación enviado a tu correo. Si venció, solicita uno nuevo desde el acceso.</p>}
    <p role="status">{message}</p></div></div></main>
}
