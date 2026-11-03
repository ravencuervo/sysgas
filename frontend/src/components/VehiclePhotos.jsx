import { useCallback, useEffect, useState } from 'react'
import { db } from '../lib/supabase'
import { friendlyError } from '../lib/forms'

const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const bucket = () => db().storage.from('estado-vehiculos')

export default function VehiclePhotos({ vehicle }) {
  const [open, setOpen] = useState(false)
  const [photos, setPhotos] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [gallery, setGallery] = useState('loading')
  const [refresh, setRefresh] = useState(0)
  const [notice, setNotice] = useState('')
  const folder = `${vehicle.empresa_id}/${vehicle.kind}/${vehicle.id}`
  const load = useCallback(async () => {
    const { data, error } = await bucket().list(folder, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } })
    if (error) throw error
    const files = data.filter(f => f.id)
    if (!files.length) return []
    const signed = await bucket().createSignedUrls(files.map(f => `${folder}/${f.name}`), 300)
    if (signed.error) throw signed.error
    const photos = files.map((f, i) => ({ ...f, url: signed.data[i]?.signedUrl }))
    if (photos.some(photo => !photo.url)) throw new Error('No se pudieron abrir todas las fotos.')
    return photos
  }, [folder])
  useEffect(() => {
    if (!open) return
    let active = true
    load().then(items => {
      if (!active) return
      setPhotos(items)
      setGallery('ready')
    }).catch(() => { if (active) setGallery('error') })
    return () => { active = false }
  }, [open, load, refresh])
  function refreshGallery() {
    setGallery('loading')
    setRefresh(value => value + 1)
  }
  async function upload(event) {
    const input = event.currentTarget
    const files = Array.from(input.files || [])
    input.value = ''
    if (!files.length || busy) return
    setNotice('')
    if (files.length > 5 || files.some(f => !extensions[f.type] || f.size === 0 || f.size > 5242880)) {
      setError('Elige hasta cinco imágenes JPG, PNG o WebP, de máximo 5 MB cada una.')
      return
    }
    setBusy(true)
    setError('')
    const failures = []
    for (const file of files) {
      try {
        const { error } = await bucket().upload(`${folder}/${crypto.randomUUID()}.${extensions[file.type]}`, file, { contentType: file.type, upsert: false })
        if (error) throw error
      } catch (e) {
        failures.push(`${file.name} (${friendlyError(e)})`)
      }
    }
    const saved = files.length - failures.length
    if (saved) {
      setNotice(saved === 1 ? 'Se guardó una foto.' : `Se guardaron ${saved} fotos.`)
      refreshGallery()
    }
    if (failures.length) setError(`Vuelve a seleccionar solo los archivos que fallaron: ${failures.join(', ')}`)
    setBusy(false)
  }
  return <section className="vehicle-photos">
    <button className="btn btn-secondary" type="button" aria-expanded={open} disabled={busy} onClick={() => { setOpen(!open); setGallery('loading'); setError(''); setNotice('') }}>{open ? 'Ocultar fotos' : 'Fotos del estado'}</button>
    {open && <>
      <label>Agregar fotos de {vehicle.placa}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={upload} /></label>
      <p className="panel__hint">Fotos privadas. Hasta cinco por carga, de 5 MB cada una.</p>
      {busy && <p role="status">Guardando fotos…</p>}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {gallery === 'loading' && <p role="status">Cargando fotos…</p>}
      {gallery === 'error' && <p role="alert">No se pudo cargar la galería. Intenta actualizarla.</p>}
      {gallery === 'ready' && !photos.length && <p>Aún no hay fotos de este vehículo.</p>}
      {gallery !== 'loading' && <button className="btn btn-secondary" type="button" disabled={busy} onClick={refreshGallery}>Actualizar galería</button>}
      {gallery === 'ready' && <div className="vehicle-photos__grid">{photos.map((p, i) => <a key={p.id} href={p.url} target="_blank" rel="noreferrer"><img loading="lazy" src={p.url} alt={`Estado de ${vehicle.placa}, foto ${i + 1}`} />{new Date(p.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</a>)}</div>}
    </>}
  </section>
}
