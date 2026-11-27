import { useState } from 'react'
import { mapsUrl } from './adminData'

function parseCoords(value) {
  const match = String(value || '').match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/)
  return match ? `${match[1]}, ${match[2]}` : value
}

export default function LocationPickerField({
  initialAddress = '',
  initialCoords = '-15.8402, -70.0219',
  addressLabel = 'Dirección exacta',
}) {
  const [address, setAddress] = useState(initialAddress)
  const [coords, setCoords] = useState(initialCoords)
  const [showMap, setShowMap] = useState(true)
  const [geoMsg, setGeoMsg] = useState('')

  const query = (coords && coords.trim()) || address.trim() || 'Puno, Peru'
  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`

  function captureGps() {
    if (!navigator.geolocation) {
      setGeoMsg('Tu navegador no soporta geolocalización.')
      return
    }
    setGeoMsg('Obteniendo ubicación exacta…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6)
        const lng = pos.coords.longitude.toFixed(6)
        setCoords(`${lat}, ${lng}`)
        setShowMap(true)
        setGeoMsg('Punto GPS capturado.')
      },
      () => {
        setGeoMsg('No se pudo obtener el GPS; ingresa o pega las coordenadas de Google Maps.')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  return (
    <div className="adm-loc-picker">
      <label className="adm-modal__full">
        {addressLabel}
        <input
          name="direccion"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Ej. Jr. Tacna 280, Puno"
          required
          maxLength={200}
        />
      </label>

      <div className="adm-loc-picker__coords">
        <label>
          Punto exacto Google Maps (lat, lng o enlace)
          <input
            name="coords"
            value={coords}
            onChange={(e) => setCoords(parseCoords(e.target.value))}
            placeholder="-15.8402, -70.0219"
            maxLength={120}
          />
        </label>
        <div className="adm-loc-picker__btns">
          <button type="button" className="btn btn-secondary" onClick={captureGps}>
            <i className="bi bi-crosshair" /> Usar mi GPS
          </button>
          <a
            href={mapsUrl(address, coords)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <i className="bi bi-box-arrow-up-right" /> Abrir Google Maps
          </a>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowMap((s) => !s)}
          >
            <i className="bi bi-map" /> {showMap ? 'Ocultar mapa' : 'Ver mapa'}
          </button>
        </div>
      </div>

      {geoMsg && <p className="adm-loc-picker__msg" role="status">{geoMsg}</p>}

      {showMap && (
        <div className="adm-loc-picker__map">
          <iframe
            title="Vista previa del punto en Google Maps"
            src={embedSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
    </div>
  )
}
