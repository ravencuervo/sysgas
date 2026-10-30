import { useCallback, useEffect, useState } from 'react'
import { db } from '../lib/supabase'
import { friendlyError } from '../lib/forms'

const labels = { pendiente_revision: 'Pendiente de revisión', contactado: 'Contactado', aprobada_activa: 'Aprobada', rechazada: 'Rechazada' }
export default function AffiliationAdmin() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(null)
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await db().from('solicitudes_afiliacion')
        .select('id,nombre_empresa,representante_nombre,telefono,correo,ciudad,volumen_mensual_balones,estado,notas_internas,created_at')
        .order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      setRows(data)
    } catch (e) { setRows([]); setError(friendlyError(e)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])
  async function review(e, row) {
    e.preventDefault()
    if (busy) return
    const values = Object.fromEntries(new FormData(e.currentTarget))
    setBusy(row.id); setError(''); setMessage('')
    try {
      const { error } = await db().rpc('revisar_afiliacion', {
        p_solicitud: row.id, p_estado: values.estado, p_notas: values.notas,
        p_ruc: values.ruc, p_direccion: values.direccion,
      })
      if (error) throw error
      setMessage(values.estado === 'aprobada_activa' ? 'Afiliación aprobada. Empresa creada y cuenta vinculada como administrador de empresa.' : 'Solicitud actualizada.')
      await load()
    } catch (e) { setError(friendlyError(e)) }
    finally { setBusy(null) }
  }
  return <section aria-labelledby="affiliations-title" className="affiliations">
    <div className="panel__header"><div><h2 id="affiliations-title">Solicitudes de afiliación</h2><p>Revisa los datos y autoriza el acceso empresarial.</p></div>
      <button className="btn btn-secondary" disabled={loading || !!busy} onClick={load}>Actualizar solicitudes</button></div>
    <label className="affiliations__filter">Filtrar por estado <select value={filter} onChange={e => setFilter(e.target.value)}><option value="">Todos</option>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <p className="panel__hint">Últimas 100 solicitudes. Para aprobar, el solicitante debe tener una cuenta confirmada con el correo indicado.</p>
    {error && <p className="panel__notice" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {loading && <p role="status">Cargando solicitudes…</p>}
    {!loading && !error && !rows.some(r => !filter || r.estado === filter) && <p>No hay solicitudes para este estado.</p>}
    {!loading && rows.filter(r => !filter || r.estado === filter).map(row => <article className="solid-card panel__order" key={row.id}>
      <div className="panel__order-top"><h3>{row.nombre_empresa}</h3><span className="solid-badge solid-badge--jade">{labels[row.estado]}</span></div>
      <p>Representante: {row.representante_nombre}</p><p>Correo: {row.correo}</p><p>Teléfono: {row.telefono}</p>
      <p>{row.ciudad} · {row.volumen_mensual_balones} balones/mes</p><p>Recibida: {new Date(row.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</p>
      {['pendiente_revision','contactado'].includes(row.estado) ? <form className="affiliations__form" onSubmit={e => review(e,row)}>
        <label>Decisión<select name="estado" required><option value="contactado">Marcar contactado</option><option value="aprobada_activa">Aprobar y crear empresa</option><option value="rechazada">Rechazar solicitud</option></select></label>
        <label>RUC (obligatorio al aprobar)<input name="ruc" inputMode="numeric" maxLength={11} placeholder="11 dígitos" /></label>
        <label>Dirección fiscal (obligatoria al aprobar)<input name="direccion" maxLength={500} /></label>
        <label>Notas internas<textarea name="notas" maxLength={2000} defaultValue={row.notas_internas || ''} /></label>
        <button className="btn btn-primary" disabled={!!busy}>{busy === row.id ? 'Guardando…' : 'Guardar decisión'}</button>
      </form> : <p>Notas internas: {row.notas_internas || 'Sin notas'}</p>}
    </article>)}
  </section>
}
