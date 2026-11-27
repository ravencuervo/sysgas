import './QRDemoSection.css'

const PASSPORT_POINTS = [
  {
    icon: 'bi-speedometer2',
    title: 'Tara de fábrica y peso neto',
    desc: 'Cada cilindro registra su tara oficial y el peso medido al salir de planta y al entregarse en puerta.',
  },
  {
    icon: 'bi-clock-history',
    title: 'Historial de llenado e inspección',
    desc: 'Consulta la fecha de última prueba hidrostática, planta de envasado y movimientos registrados.',
  },
  {
    icon: 'bi-shield-check',
    title: 'Distribuidora y lote verificados',
    desc: 'Confirma qué empresa autorizada despachó el balón y el código de serie único grabado en el envase.',
  },
]

export default function QRDemoSection() {
  return (
    <section className="section px-qr section--smoke" id="qr-demo">
      <div className="container">
        <div className="px-qr__layout">
          <div className="px-qr__copy reveal">
            <h2 className="section-title">Cada cilindro tiene un pasaporte QR verificable.</h2>
            <p className="section-desc">
              El código QR impreso en el balón conecta directamente con el historial del sistema SYSGAS para que verifiques su origen, peso y seguridad antes de recibirlo.
            </p>
          </div>

          <div className="px-qr__points">
            {PASSPORT_POINTS.map((item, idx) => (
              <div key={item.title} className={`px-qr__point reveal reveal-delay-${idx + 1}`}>
                <i className={`bi ${item.icon} px-qr__point-icon`} />
                <div>
                  <h3 className="px-qr__point-title">{item.title}</h3>
                  <p className="px-qr__point-desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
