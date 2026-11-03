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
  function stop() {
    const state = lifecycle.current
    state.generation++
    state.controls?.stop()
    state.controls = null
    setRunning(false)
  }
  async function start() {
    const state=lifecycle.current
    const current = ++state.generation
    setError(''); setRunning(true)
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser')
      if (!state.alive || current !== state.generation) return
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250, delayBetweenScanSuccess: 1200 })
      const scanner = await reader.decodeFromVideoDevice(undefined, video.current, result => {
        if (result && state.alive && current === state.generation) {
          try {
            const code = readCylinderCode(result.getText())
            stop()
            setError('')
            callback.current(code)
          }
          catch(e) { setError(e.message) }
        }
      })
      if (!state.alive || current !== state.generation) scanner.stop()
      else state.controls = scanner
    } catch { if (state.alive && current === state.generation) { setError('No se pudo abrir la cámara. Revisa el permiso o ingresa el código manualmente.'); setRunning(false) } }
  }
  return <div className="scanner"><video ref={video} muted playsInline hidden={!running} aria-label="Vista de la cámara para leer QR" />
    <button className="btn btn-secondary" type="button" onClick={running ? stop : start}><i className="bi bi-qr-code-scan" />{running ? 'Detener cámara' : 'Leer QR con cámara'}</button>
    {error && <p role="alert">{error}</p>}
  </div>
}
