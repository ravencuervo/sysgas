import CodeScanner from './CodeScanner'
import { readCylinderCode } from '../lib/codes'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './QRDemoSection.css'
export default function QRDemoSection() {
  const [code, setCode] = useState('SYS-2026-LPG-001')
  const [error,setError] = useState('')
  const navigate = useNavigate()
  return <section className="section section--alt" id="qr-demo"><div className="container">
    <h2 className="section-title">Consulta el pasaporte de tu cilindro</h2>
    <p>Ingresa el código impreso en el cilindro para consultar su trazabilidad registrada.</p>
    <CodeScanner onCode={code=>navigate(`/balon/${encodeURIComponent(code)}`)} />
    {error && <p role="alert">{error}</p>}
    <form onSubmit={e => { e.preventDefault(); try {navigate(`/balon/${encodeURIComponent(readCylinderCode(code))}`)} catch(e) {setError(e.message)} }}>
      <label htmlFor="qr-code">Código QR del cilindro</label>{' '}
      <input id="qr-code" value={code} onChange={e => setCode(e.target.value)} required maxLength={60} />{' '}
      <button className="btn btn-primary" disabled={!code.trim()}>Consultar historial</button>
    </form>
  </div></section>
}
