import { useCallback, useEffect, useState } from 'react'
import { db } from '../lib/supabase'
import { friendlyError } from '../lib/forms'

export default function AccountInbox({ onAccepted }) {
  const [invites, setInvites] = useState([])
  const [requests,setRequests] = useState([])
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    try {
      const { data: { user } } = await db().auth.getUser()
      if (!user) return
      const [a,b,c] = await Promise.all([
        db().rpc('mis_invitaciones'),
        db().from('notificaciones').select('id,titulo,created_at').eq('leida',false).order('created_at',{ascending:false}).limit(30),
        db().rpc('mis_solicitudes'),
      ])
      if (a.error || b.error || c.error) throw a.error || b.error || c.error
      setInvites(a.data); setMessages(b.data); setRequests(c.data)
    } catch(e) { setError(friendlyError(e)) }
  }, [])
  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])
  async function action(invite, message) {
    if(busy) return
    setBusy(true); setError('')
    try {
      const {error} = invite ? await db().rpc('gestion_personal',{p_accion:'aceptar',p_empresa:invite.empresa_id}) : await db().rpc('leer_notificacion',{p_id:message.id})
      if(error) throw error
      await load()
      if(invite) onAccepted()
    } catch(e) { setError(friendlyError(e)) } finally { setBusy(false) }
  }
  return <section className="module"><h2>Notificaciones e invitaciones</h2><p>Las invitaciones de trabajo se vinculan a tu correo confirmado. Al aceptarlas accedes como trabajador de esa empresa.</p>
    {error && <p role="alert" className="panel__notice">{error}</p>}
    {!invites.length && !messages.length && !requests.length && !error && <p>No tienes notificaciones pendientes.</p>}
    {invites.map(i => <article className="solid-card panel__order" key={i.id}><h3>Invitación: {i.cargo.replaceAll('_',' ')}</h3><p>Empresa: {i.empresa_nombre}</p><button className="btn btn-primary" disabled={busy} onClick={() => action(i)}>Aceptar invitación</button></article>)}
    {requests.map(r=><article className="solid-card panel__order" key={r.id}><h3>Mi solicitud: {r.nombre_empresa}</h3><p>{r.representante_nombre} · {r.correo} · {r.telefono}</p><p>Estado: {r.estado.replaceAll('_',' ')}</p></article>)}
    {messages.map(m => <article className="solid-card panel__order" key={m.id}><p>{m.titulo}</p><button className="btn btn-secondary" disabled={busy} onClick={() => action(null,m)}>Marcar como leída</button></article>)}
  </section>
}
