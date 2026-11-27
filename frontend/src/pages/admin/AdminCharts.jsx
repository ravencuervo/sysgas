import { CAPACITIES, formatCap } from './adminData'

export default function AdminCharts({ cylinders, orders, locations }) {
  const sumBatch = (list) => list.reduce((acc, c) => acc + Number(c.cantidad || 0), 0)

  // Barras reales por capacidad (5 kg, 10 kg, 45 kg): salidas vs entradas
  const byCapacity = CAPACITIES.map((cap) => {
    const matchingCyl = cylinders.filter((c) => formatCap(c.capacidad) === cap)
    const salidas = sumBatch(matchingCyl.filter((c) => c.movimiento === 'Salida'))
    const entradas = sumBatch(matchingCyl.filter((c) => c.movimiento === 'Entrada'))
    const capOrders = orders.filter((o) => formatCap(o.capacidad) === cap)
    const pedidos = capOrders.reduce((acc, o) => acc + Number(o.cantidad || 1), 0)
    const revenue = capOrders.reduce((acc, o) => acc + Number(o.totalPen || 0), 0)
    return { cap, salidas, entradas, pedidos, revenue }
  })

  const peakSalidas = Math.max(1, ...byCapacity.map((d) => Math.max(d.salidas, d.entradas)))
  const totalSalidas = byCapacity.reduce((acc, d) => acc + d.salidas, 0)
  const totalEntradas = byCapacity.reduce((acc, d) => acc + d.entradas, 0)
  const totalVentas = byCapacity.reduce((acc, d) => acc + d.revenue, 0)

  // Curva de tendencia basada en pedidos reales ordenados cronológicamente
  const salesPointsRaw = orders
    .slice()
    .reverse()
    .map((o, idx) => ({
      label: o.ticket || `#${idx + 1}`,
      ventas: Number(o.totalPen || 0),
    }))
  const series = salesPointsRaw.length
    ? salesPointsRaw
    : [{ label: 'Sin pedidos', ventas: 0 }]

  const maxSales = Math.max(1, ...series.map((s) => s.ventas))
  const chartW = 380
  const chartH = 120
  const points = series.map((s, i) => {
    const x = series.length === 1 ? chartW / 2 : 18 + (i / (series.length - 1)) * (chartW - 36)
    const y = chartH - 16 - (s.ventas / maxSales) * (chartH - 36)
    return { x, y, ...s }
  })
  const polylinePts = points.map((p) => `${p.x},${p.y}`).join(' ')
  const areaPts =
    points.length > 1
      ? `${points[0].x},${chartH - 14} ${polylinePts} ${points[points.length - 1].x},${chartH - 14}`
      : `${points[0].x - 20},${chartH - 14} ${points[0].x},${points[0].y} ${points[0].x + 20},${chartH - 14}`

  // Donut de calidad de balones (sumando cantidad real por lote)
  const qualityCounts = [
    { label: 'Apto', count: sumBatch(cylinders.filter((c) => c.calidad === 'Apto')), color: '#00A878' },
    { label: 'En inspección', count: sumBatch(cylinders.filter((c) => c.calidad === 'En inspección')), color: '#D97706' },
    { label: 'Mantenimiento', count: sumBatch(cylinders.filter((c) => c.calidad === 'Mantenimiento')), color: '#DC2626' },
  ]
  const totalCyl = sumBatch(cylinders)
  const safeTotalCyl = Math.max(1, totalCyl)
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const donutSegments = qualityCounts.reduce((acc, seg) => {
    const prevOffset = acc.length ? acc[acc.length - 1].nextOffset : 0
    const length = (seg.count / safeTotalCyl) * circumference
    acc.push({ ...seg, length, dashOffset: -prevOffset, nextOffset: prevOffset + length })
    return acc
  }, [])

  return (
    <div className="adm-report-suite">
      <div className="adm-charts-row">
        <div className="adm-chart">
          <div className="adm-chart__head">
            <div>
              <h3>Movimiento real de balones por capacidad</h3>
              <p className="adm-chart__sub">Salidas vs entradas registradas en lotes de BD</p>
            </div>
            <div className="adm-chart__legend">
              <span><i className="adm-dot adm-dot--jade" /> Salidas ({totalSalidas})</span>
              <span><i className="adm-dot adm-dot--mint" /> Entradas ({totalEntradas})</span>
            </div>
          </div>

          <svg viewBox="0 0 420 185" className="adm-chart__svg" role="img" aria-label="Gráfico de barras de movimiento real por capacidad">
            {[0, 0.5, 1].map((step) => {
              const y = 144 - step * 108
              return (
                <line
                  key={step}
                  x1="20"
                  y1={y}
                  x2="404"
                  y2={y}
                  stroke="#E2EDE7"
                  strokeDasharray="5 5"
                  strokeWidth="1"
                />
              )
            })}

            {byCapacity.map((item, i) => {
              const groupX = 56 + i * 124
              const hOut = (item.salidas / peakSalidas) * 108
              const hIn = (item.entradas / peakSalidas) * 108
              return (
                <g key={item.cap} className="adm-bar-group">
                  <rect x={groupX} y={144 - hOut} width="26" height={Math.max(4, hOut)} rx="5" fill="#00A878" />
                  <rect x={groupX + 32} y={144 - hIn} width="26" height={Math.max(4, hIn)} rx="5" fill="#7AD8BA" />
                  <text x={groupX + 13} y={136 - hOut} textAnchor="middle" fill="#062118" fontSize="11" fontWeight="800">
                    {item.salidas}
                  </text>
                  <text x={groupX + 45} y={136 - hIn} textAnchor="middle" fill="#062118" fontSize="11" fontWeight="800">
                    {item.entradas}
                  </text>
                  <text x={groupX + 29} y="168" textAnchor="middle" fill="#5D786D" fontSize="12" fontWeight="700">
                    {item.cap}
                  </text>
                </g>
              )
            })}
          </svg>

          <div className="adm-chart__foot">
            <div>
              <strong>{totalCyl.toLocaleString()} balones</strong>
              <span>en lotes registrados en BD</span>
            </div>
            <span className="adm-delta">{cylinders.length} lotes totales</span>
          </div>
        </div>

        <div className="adm-chart">
          <div className="adm-chart__head">
            <div>
              <h3>Ingresos por pedidos</h3>
              <p className="adm-chart__sub">Facturación calculada desde pedidos en BD</p>
            </div>
            <strong className="adm-chart__kpi">S/ {totalVentas.toFixed(2)}</strong>
          </div>

          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="adm-chart__svg" role="img" aria-label="Tendencia de ingresos de pedidos">
            <defs>
              <linearGradient id="sysgasAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00A878" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#00A878" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polygon points={areaPts} fill="url(#sysgasAreaGrad)" />
            {points.length > 1 && (
              <polyline
                fill="none"
                stroke="#00A878"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePts}
              />
            )}
            {points.map((p) => (
              <circle key={p.label} cx={p.x} cy={p.y} r="4" fill="#FFFFFF" stroke="#007A57" strokeWidth="2.5" />
            ))}
          </svg>

          <div className="adm-cap-breakdown">
            {byCapacity.map((c) => (
              <div key={c.cap} className="adm-cap-item">
                <span>{c.cap}</span>
                <strong>{c.pedidos} ped.</strong>
                <small>S/ {c.revenue.toFixed(2)}</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="adm-charts-row adm-charts-row--equal">
        <div className="adm-chart">
          <div className="adm-chart__head">
            <div>
              <h3>Control de calidad de balones</h3>
              <p className="adm-chart__sub">Distribución real según lotes en BD</p>
            </div>
          </div>

          <div className="adm-donut-wrap">
            <svg viewBox="0 0 120 120" className="adm-donut-svg" role="img" aria-label="Distribución de calidad de cilindros">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#EEF2F0" strokeWidth="14" />
              {donutSegments.map((seg) => (
                <circle
                  key={seg.label}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="14"
                  strokeDasharray={`${seg.length} ${circumference}`}
                  strokeDashoffset={seg.dashOffset}
                  transform="rotate(-90 60 60)"
                />
              ))}
              <text x="60" y="57" textAnchor="middle" fill="#0A1B14" fontSize="20" fontWeight="900">
                {totalCyl}
              </text>
              <text x="60" y="72" textAnchor="middle" fill="#5D786D" fontSize="9" fontWeight="700">
                BALONES
              </text>
            </svg>

            <div className="adm-donut-legend">
              {qualityCounts.map((seg) => {
                const pct = totalCyl ? Math.round((seg.count / totalCyl) * 100) : 0
                return (
                  <div key={seg.label} className="adm-donut-legend__row">
                    <span className="adm-donut-legend__label">
                      <i className="adm-dot" style={{ backgroundColor: seg.color }} />
                      {seg.label}
                    </span>
                    <strong>{seg.count} ({pct}%)</strong>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="adm-chart">
          <div className="adm-chart__head">
            <div>
              <h3>Actividad por local de dispensa</h3>
              <p className="adm-chart__sub">Balones registrados por cada local en BD</p>
            </div>
          </div>

          <div className="adm-loc-bars">
            {locations.length === 0 ? (
              <p className="adm__empty" style={{ padding: 0 }}>Aún no hay locales registrados en la base de datos.</p>
            ) : (
              locations.map((loc) => {
                const count = sumBatch(cylinders.filter((c) => c.localId === loc.id || c.local === loc.nombreLocal))
                const pct = totalCyl ? Math.round((count / totalCyl) * 100) : 0
                return (
                  <div key={loc.id} className="adm-quality-row">
                    <div className="adm-quality-row__top">
                      <span>{loc.nombreLocal}</span>
                      <strong>{count} bal. · {loc.ciudad}</strong>
                    </div>
                    <div className="adm-quality-track">
                      <div className="adm-quality-fill adm-quality-fill--jade" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
