import { useEffect, useState } from 'react'
import { db, isSupabaseConfigured } from '../lib/supabase'
import { friendlyError } from '../lib/forms'
import './AffiliationModal.css'

export default function AffiliationModal({ onClose, initialVolume = 2500 }) {
  const [volume, setVolume] = useState(initialVolume)
  const [submitted, setSubmitted] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    const fields = Object.fromEntries(new FormData(e.currentTarget))
    const payload = {
      nombre_empresa: String(fields.nombre_empresa || '').trim(),
      representante_nombre: String(fields.representante_nombre || '').trim(),
      ciudad: String(fields.ciudad || 'Puno').trim(),
      telefono: String(fields.telefono || '').trim(),
      correo: String(fields.correo || '').trim(),
      volumen_mensual_balones: Number(volume),
    }

    setBusy(true)
    setError('')
    try {
      if (isSupabaseConfigured) {
        const { error: insertError } = await db()
          .from('solicitudes_afiliacion')
          .insert(payload)
        if (insertError) throw insertError
      }
      setSubmitted({
        empresa: payload.nombre_empresa,
        representante: payload.representante_nombre,
        ciudad: payload.ciudad,
        telefono: payload.telefono,
        correo: payload.correo,
        volumen: volume,
      })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="px-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="px-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="affiliation-modal-title"
      >
        <div className="px-modal__header">
          <div>
            <h3 id="affiliation-modal-title" className="px-modal__title">
              Afiliar distribuidora a SYSGAS
            </h3>
            <p className="px-modal__subtitle">
              Registra los datos de tu empresa para evaluar la incorporación al sistema.
            </p>
          </div>
          <button
            type="button"
            className="px-modal__close"
            onClick={onClose}
            aria-label="Cerrar formulario"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {submitted ? (
          <div className="px-modal__success" role="status" aria-live="polite">
            <i className="bi bi-check-circle-fill px-modal__success-icon" />
            <h4>Solicitud registrada en el formulario</h4>
            <p>
              <strong>{submitted.empresa}</strong> ({submitted.ciudad}) · {submitted.volumen.toLocaleString()} balones/mes.
            </p>
            <p className="px-modal__note">
              {isSupabaseConfigured
                ? 'Tu solicitud fue guardada en el sistema SYSGAS para revisión.'
                : 'Modo local: configura Supabase para guardar en la base de datos.'}
            </p>
            <div className="px-modal__actions">
              <button type="button" className="btn btn-primary px-modal__submit" onClick={onClose}>
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-secondary px-modal__submit"
                onClick={() => setSubmitted(null)}
              >
                Editar datos
              </button>
            </div>
          </div>
        ) : (
          <form className="px-modal__form" onSubmit={handleSubmit}>
            <div className="px-modal__field">
              <label htmlFor="modal-company">Empresa o distribuidora</label>
              <input
                id="modal-company"
                name="nombre_empresa"
                autoComplete="organization"
                placeholder="Ej. Distribuidora Sur Gas S.A.C."
                required
                maxLength={150}
              />
            </div>

            <div className="px-modal__field">
              <label htmlFor="modal-representative">Representante</label>
              <input
                id="modal-representative"
                name="representante_nombre"
                autoComplete="name"
                placeholder="Nombre completo"
                required
                maxLength={120}
              />
            </div>

            <div className="px-modal__field">
              <label htmlFor="modal-city">Ciudad o zona de operación</label>
              <input
                id="modal-city"
                name="ciudad"
                defaultValue="Puno"
                required
                maxLength={80}
              />
            </div>

            <div className="px-modal__field">
              <label htmlFor="modal-phone">Teléfono de contacto</label>
              <input
                id="modal-phone"
                name="telefono"
                type="tel"
                autoComplete="tel"
                placeholder="Ej. 951 667 696"
                required
                maxLength={20}
              />
            </div>

            <div className="px-modal__field px-modal__field--full">
              <label htmlFor="modal-email">Correo corporativo</label>
              <input
                id="modal-email"
                name="correo"
                type="email"
                autoComplete="email"
                placeholder="contacto@empresa.pe"
                required
                maxLength={120}
              />
            </div>

            <div className="px-modal__field px-modal__field--full">
              <div className="px-modal__volume-head">
                <label htmlFor="modal-volume">Volumen mensual estimado</label>
                <strong>{volume.toLocaleString()} balones / mes</strong>
              </div>
              <input
                id="modal-volume"
                type="range"
                min="500"
                max="10000"
                step="250"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="px-modal__range"
              />
            </div>

            {error && <p className="px-modal__note" role="alert" style={{ color: 'var(--color-danger)', fontWeight: 700 }}>{error}</p>}

            <div className="px-modal__actions">
              <button type="submit" className="btn btn-primary px-modal__submit" disabled={busy}>
                <span>{busy ? 'Enviando solicitud…' : 'Enviar solicitud de afiliación'}</span>
                <i className="bi bi-arrow-right" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
