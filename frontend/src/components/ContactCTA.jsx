import { Link } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { friendlyError, validateOrder } from '../lib/forms'
import { db } from '../lib/supabase'
import { useCatalog } from '../hooks/useCatalog'
import { useEffect, useRef, useState } from 'react'
import './ContactCTA.css'

export default function ContactCTA({ selectedCapacity, onSelectCapacity }) {
  const requestId = useRef(null)
  const session = useSession()
  const { products, error: catalogError } = useCatalog()
  const [zones, setZones] = useState([])
  const [city, setCity] = useState('Puno')
  const [zone, setZone] = useState('')
  const [offersVersion, setOffersVersion] = useState(0)
  const [offers, setOffers] = useState([])
  const [company, setCompany] = useState('')
  const [offersError, setOffersError] = useState('')
  const [offersLoading, setOffersLoading] = useState(true)
  useEffect(() => {
    let active = true
    Promise.all([db().rpc('ofertas_distribuidoras'), db().from('zonas_cobertura').select('empresa_id,ciudad,zona')]).then(([{data,error}, coverage]) => {
      if (!active) return
      if (error) { setOffersError(friendlyError(error)); return }
      if (coverage.error) { setOffersError(friendlyError(coverage.error)); return }
      setOffers(data || []); setZones(coverage.data || [])
    }).catch(e => { if (active) setOffersError(friendlyError(e)) }).finally(() => { if (active) setOffersLoading(false) })
    return () => { active = false }
  }, [offersVersion])
  const available = offers.filter(o => o.capacidad === (selectedCapacity || '10 kg').replace(' ', '') && o.stock > 0 && (o.ciudad.toLowerCase() === city.toLowerCase() || zones.some(z => z.empresa_id===o.empresa_id && z.ciudad.toLowerCase()===city.toLowerCase())) && (!zone || !zones.some(z=>z.empresa_id===o.empresa_id) || zones.some(z=>z.empresa_id===o.empresa_id && z.ciudad.toLowerCase()===city.toLowerCase() && z.zona===zone)))
  const chosenOffer = available.find(o => o.empresa_id === company)
  const [error, setError] = useState('')
  const [confirmation,setConfirmation] = useState(null)
  const [ticket, setTicket] = useState('')
  const capacity = selectedCapacity || '10 kg'
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    referencia: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    const validation = validateOrder(formData)
    if (validation) { setError(validation); return }
    if (!products.some(p => p.capacity === capacity)) { setError('Selecciona un producto disponible.'); return }
    if (!chosenOffer) { setError('Selecciona la distribuidora que atenderá tu pedido.'); return }
    if (zones.some(z=>z.empresa_id===company) && !zone) { setError('Selecciona tu zona de entrega.'); return }
    if (!requestId.current) requestId.current = crypto.randomUUID()
    setLoading(true)
    setError('')
    try {
      const { data, error } = await db().rpc('crear_pedido_seguro', {
        p_nombre: formData.nombre.trim(), p_telefono: formData.telefono.trim(),
        p_direccion: formData.direccion.trim(), p_referencia: formData.referencia,
        p_capacidad: capacity.replace(' ', ''), p_empresa: company, p_ciudad: city, p_zona: zone, p_solicitud: requestId.current,
      })
      if (error) throw error
      setConfirmation({capacity,phone:formData.telefono,company:chosenOffer.empresa_nombre,price:chosenOffer.precio_pen})
      setTicket(data)
      setSubmitted(true)
    } catch (e) { setError(friendlyError(e)) }
    finally { setLoading(false) }
  }

  const whatsappMessage = encodeURIComponent(
    `¡Hola SYSGAS! Deseo solicitar un balón de ${capacity} a la dirección: ${formData.direccion || '(indicar dirección)'}. Mi nombre es ${formData.nombre || ''}.`
  )

  return (
    <section className="section px-cta section--alt" id="contacto">
      <div className="container">
        {/* Cabecera Limpia */}
        <div className="px-cta__header reveal">
          <div className="section-tag">
            <span className="section-tag__num">07</span>
            <span>PEDIDO EXPRESS</span>
          </div>
          <h2 className="section-title">Pide tu balón SYSGAS en un instante.</h2>
          {!session && <p><Link to="/login">Inicia sesión</Link> antes de pedir para guardar el pedido en tu cuenta, o continúa como invitado.</p>}
          <p className="section-desc">
            Indica tu dirección y el cilindro que necesitas. Coordinamos la entrega inmediata con la unidad más cercana a tu zona.
          </p>
        </div>

        <div className="px-cta__box solid-card reveal reveal-delay-1">
          {submitted ? (
            <div className="px-cta__success">
              <div className="px-cta__success-icon">
                <i className="bi bi-check-circle-fill text-jade" />
              </div>
              <h3 className="px-cta__success-title">¡Pedido Recibido con Éxito!</h3>
              <p className="px-cta__success-desc">
                Registramos tu pedido {ticket} de <strong>{confirmation?.capacity}</strong> con {confirmation?.company} por S/ {Number(confirmation?.price).toFixed(2)} para su coordinación de entrega. Te contactaremos al <strong>{confirmation?.phone}</strong> en los próximos minutos.
              </p>
              {session && <Link className="btn btn-secondary" to="/panel">Ver mis pedidos</Link>}
              <div className="px-cta__success-actions">
                <a
                  href={`https://wa.me/51951667696?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <i className="bi bi-whatsapp" />
                  <span>Confirmar por WhatsApp</span>
                </a>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setSubmitted(false); setError(''); requestId.current=null; setCompany(''); setOffersLoading(true); setOffersVersion(v=>v+1); setFormData({ nombre: '', telefono: '', direccion: '', referencia: '' }) }}
                >
                  Hacer Otro Pedido
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-cta__form"><fieldset disabled={loading} aria-label="Datos del pedido" style={{border:0,padding:0,minWidth:0}}>
              {/* Selector Rápido de Balón */}
              <div className="px-cta__field">
                <label className="px-cta__label">1. Selecciona tu cilindro:</label>
                <div className="px-cta__cylinder-selector">
                  {products.map((c) => (
                    <button
                      key={c.capacity}
                      type="button"
                      className={`px-cta__cylinder-pill ${capacity === c.capacity ? 'px-cta__cylinder-pill--active' : ''}`}
                      onClick={() => { onSelectCapacity(c.capacity); setCompany('') }}
                    >
                      <span className="px-cta__pill-name">{c.name}</span>
                      <span className="px-cta__pill-price">{offers.some(o => o.capacidad === c.capacidad && o.stock > 0) ? `Desde S/ ${Math.min(...offers.filter(o => o.capacidad === c.capacidad && o.stock > 0).map(o => Number(o.precio_pen))).toFixed(2)}` : 'Sin stock'}</span>
                      {c.popular && <span className="px-cta__pill-star"><i className="bi bi-star-fill" /> Más pedido</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-cta__field">
                <label className="px-cta__label" htmlFor="pedido-ciudad">Ciudad de entrega</label>
                <input className="px-cta__input" id="pedido-ciudad" maxLength={60} value={city} onChange={e=>{setCity(e.target.value);setCompany('');setZone('')}} required />
                <label className="px-cta__label" htmlFor="pedido-zona">Zona o distrito</label>
                <select className="px-cta__input" id="pedido-zona" value={zone} onChange={e=>{setZone(e.target.value);setCompany('')}}><option value="">Selecciona tu zona si está disponible</option>{[...new Set(zones.filter(z=>z.ciudad.toLowerCase()===city.toLowerCase()).map(z=>z.zona))].map(z=><option key={z} value={z}>{z}</option>)}</select>
                <label className="px-cta__label" htmlFor="pedido-empresa">Distribuidora que atenderá tu pedido</label>
                {offersLoading && <p role="status">Consultando precios y stock…</p>}
                {offersError && <p role="alert">{offersError}</p>}
                <button className="btn btn-secondary" type="button" disabled={offersLoading || loading} onClick={()=>{setOffersError('');setOffersLoading(true);setOffersVersion(v=>v+1)}}>Actualizar precios y stock</button>
                <select className="px-cta__input" id="pedido-empresa" value={chosenOffer ? company : ''} onChange={e => setCompany(e.target.value)} required disabled={offersLoading || loading}>
                  <option value="">Selecciona una distribuidora</option>
                  {available.map(o => <option key={o.empresa_id} value={o.empresa_id}>{o.empresa_nombre} · {o.ciudad} · S/ {Number(o.precio_pen).toFixed(2)}</option>)}
                </select>
                {!offersLoading && !offersError && !available.length && <p>No hay distribuidoras con stock de esta capacidad por el momento.</p>}
                {chosenOffer && <p>Total: <strong>S/ {Number(chosenOffer.precio_pen).toFixed(2)}</strong> · El pedido llegará a {chosenOffer.empresa_nombre}.</p>}
              </div>
              {/* Campos Rápidos de Entrega */}
              <div className="px-cta__field">
                <label className="px-cta__label">2. Datos de entrega:</label>
                <div className="px-cta__grid-inputs">
                  <div className="px-cta__input-wrap">
                    <label className="px-cta__sublabel" htmlFor="nombre">Tu Nombre Completo</label>
                    <input
                      id="nombre"
                      type="text"
                      name="nombre" minLength={2} maxLength={120} autoComplete="name"
                      value={formData.nombre}
                      onChange={handleChange}
                      placeholder="Ej. María Sánchez"
                      className="px-cta__input"
                      required
                    />
                  </div>

                  <div className="px-cta__input-wrap">
                    <label className="px-cta__sublabel" htmlFor="telefono">Teléfono / WhatsApp</label>
                    <input
                      id="telefono"
                      type="tel"
                      name="telefono" maxLength={20} autoComplete="tel"
                      value={formData.telefono}
                      onChange={handleChange}
                      placeholder="Ej. 987 654 321"
                      className="px-cta__input"
                      required
                    />
                  </div>
                </div>

                <div className="px-cta__input-wrap px-cta__input-wrap--full">
                  <label className="px-cta__sublabel" htmlFor="direccion">Dirección y Distrito</label>
                  <input
                    id="direccion"
                    type="text"
                    name="direccion" minLength={5} maxLength={500} autoComplete="street-address"
                    value={formData.direccion}
                    onChange={handleChange}
                    placeholder="Ej. Av. Los Próceres 452, Dpto 301, Surco"
                    className="px-cta__input"
                    required
                  />
                </div>
              </div>

              <div className="px-cta__field">
                <label htmlFor="referencia">Referencia de entrega (opcional)</label>
                <input className="px-cta__input" id="referencia" name="referencia" maxLength={500} value={formData.referencia} onChange={handleChange} placeholder="Piso, puerta o punto de referencia" />
              </div>
              {(error || catalogError) && <p role="alert">{error || catalogError}</p>}
              <div className="px-cta__actions">
                <button
                  type="submit"
                  disabled={loading || offersLoading || !products.length || !chosenOffer}
                  className="btn btn-primary px-cta__submit-btn"
                >
                  {loading ? (
                    <>
                      <i className="bi bi-arrow-repeat px-qr__spin" />
                      <span>Coordinando Despachador...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-truck" />
                      <span>Confirmar Despacho a Domicilio</span>
                      <i className="bi bi-arrow-right" />
                    </>
                  )}
                </button>

                <a
                  href={`https://wa.me/51951667696?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary px-cta__wa-btn"
                >
                  <i className="bi bi-whatsapp text-jade" />
                  <span>Pedir Directo por WhatsApp</span>
                </a>
              </div>

              <div className="px-cta__guarantee">
                <i className="bi bi-shield-check text-jade" />
                <span>Pago contra entrega en efectivo, Yape, Plin o tarjeta · Pesaje verificado con balanza en puerta</span>
              </div>
            </fieldset></form>
          )}
        </div>
      </div>
    </section>
  )
}
