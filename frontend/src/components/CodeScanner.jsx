import { useEffect, useRef, useState } from 'react'
import { readCylinderCode } from '../lib/codes'

export default function CodeScanner({ onCode }) {
  const video = useRef(null)
  const lifecycle = useRef({alive:true,generation:0,controls:null})
  const callback = useRef(onCode)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { callback.current = onCode }, [onCode])
  useEffect(() => {
    const state=lifecycle.current
    state.alive = true
    return () => { state.alive = false; state.generation++; state.controls?.stop() }
  }, [])
  async function start() {
    const state=lifecycle.current
    const current = ++state.generation
    setError(''); setRunning(true)
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser')
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250, delayBetweenScanSuccess: 1200 })
      const scanner = await reader.decodeFromVideoDevice(undefined, video.current, result => {
        if (result && state.alive && current === state.generation) {
          try { callback.current(readCylinderCode(result.getText())) }
          catch(e) { setError(e.message) }
        }
      })
      if (!state.alive || current !== state.generation) scanner.stop()
      else state.controls = scanner
    } catch { if (state.alive && current === state.generation) { setError('No se pudo abrir la cámara. Revisa el permiso o ingresa el código manualmente.'); setRunning(false) } }
  }
  return <div className="scanner"><video ref={video} muted playsInline hidden={!running} aria-label="Vista de la cámara para leer QR" />
    <button className="btn btn-secondary" type="button" onClick={() => { if (running) { lifecycle.current.generation++; lifecycle.current.controls?.stop(); setRunning(false) } else void start() }}><i className="bi bi-qr-code-scan" />{running ? 'Detener cámara' : 'Leer QR con cámara'}</button>
    {error && <p role="alert">{error}</p>}
  </div>
}
