import { useState } from 'react'
import { db } from '../lib/supabase'
import { friendlyError } from '../lib/forms'

export default function CustomerWeight({ order }) {
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function check(event) {
    event.preventDefault()
    if (busy) return
    const weight = Number(new FormData(event.currentTarget).get('weight'))
    setBusy(true)
    setError('')
    try {
      const { data, error } = await db().rpc('comprobar_peso_cliente', { p_pedido: order.id, p_peso: weight })
      if (error) throw error
      setResult(data)
    } catch (e) { setError(friendlyError(e)) }
    finally { setBusy(false) }
  }
  return <section>
    {order.pesajes_entrega?.map(weight => <p key={weight.id}>
      Peso registrado en la entrega · {weight.peso_bruto_medido_kg} kg en total, {weight.tara_descontada_kg} kg de balón vacío y {weight.peso_neto_calculado_kg} kg de gas.
    </p>)}
    {order.estado === 'entregado' && order.pesajes_entrega?.length > 0 && <form onSubmit={check}>
      <h3>Pesé mi balón</h3>
      <p>Comprueba el balón al recibirlo, antes de consumir gas. Se usará la tara y el margen guardados en la entrega. La lectura requiere revisión de la distribuidora si presenta una diferencia.</p>
      <label>Peso total que marca tu balanza (kg)<input name="weight" type="number" min="0.01" max="9999.99" step="0.01" required disabled={busy || Boolean(result)} /></label>
      <button className="btn btn-secondary" disabled={busy || Boolean(result)}>{busy ? 'Comprobando…' : 'Comprobar peso recibido'}</button>
      {result && <p role="status">{result.incidencia_id
        ? `Registramos tu reclamo. La diferencia calculada es de ${Math.round(Number(result.faltante_kg) * 1000)} gramos. La empresa debe revisar la medición.`
        : 'El peso informado está dentro del margen registrado para la entrega.'} Se conserva la primera comprobación de este pedido.</p>}
      {error && <p role="alert">{error}</p>}
    </form>}
  </section>
}
