import { useEffect, useRef } from 'react'

export default function HeroWaveGrid() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId
    let width = 0
    let height = 0
    let dpr = 1

    // Posición del mouse para interacción reactiva
    let mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth
      height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.scale(dpr, dpr)
    }

    resize()
    window.addEventListener('resize', resize)

    const onPointerMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouse.targetX = e.clientX - rect.left
      mouse.targetY = e.clientY - rect.top
    }

    const onPointerLeave = () => {
      mouse.targetX = -1000
      mouse.targetY = -1000
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('mouseleave', onPointerLeave)

    // Configuración de la cuadrícula
    const spacing = 32 // Distancia entre puntos
    let time = 0

    const render = () => {
      time += 0.02

      // Suavizado del mouse
      mouse.x += (mouse.targetX - mouse.x) * 0.1
      mouse.y += (mouse.targetY - mouse.y) * 0.1

      ctx.clearRect(0, 0, width, height)

      const cols = Math.ceil(width / spacing) + 1
      const rows = Math.ceil(height / spacing) + 1

      for (let r = 0; r < rows; r++) {
        const baseY = r * spacing

        for (let c = 0; c < cols; c++) {
          const baseX = c * spacing

          // 1. Onda matemática diagonal fluida (flujo continuo de presión / energía)
          const wave1 = Math.sin(baseX * 0.012 + baseY * 0.014 + time * 1.6)
          const wave2 = Math.cos(baseX * 0.008 - baseY * 0.01 + time * 1.2)
          const combinedWave = (wave1 + wave2) * 0.5 // Valor entre -1 y 1

          // 2. Interacción sutil con el cursor (efecto onda expansiva)
          const dx = baseX - mouse.x
          const dy = baseY - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const mouseInfluence = dist < 180 ? Math.cos((dist / 180) * (Math.PI / 2)) : 0

          // Desplazamiento orgánico
          const offsetX = combinedWave * 2.5 + (dx / (dist + 1)) * mouseInfluence * 6
          const offsetY = combinedWave * 3.5 + (dy / (dist + 1)) * mouseInfluence * 6
          const currentX = baseX + offsetX
          const currentY = baseY + offsetY

          // Escala dinámica del punto
          const radius = Math.max(0.8, 1.25 + combinedWave * 0.75 + mouseInfluence * 1.5)

          // Opacidad y color
          // En picos de onda: blanco puro brillante (#FFFFFF)
          // En valles: blanco translúcido sutil
          const opacity = Math.min(0.85, Math.max(0.12, 0.22 + combinedWave * 0.25 + mouseInfluence * 0.45))

          ctx.beginPath()
          ctx.arc(currentX, currentY, radius, 0, Math.PI * 2)

          if (mouseInfluence > 0.3) {
            // Cerca del cursor emite un destello verde jade
            ctx.fillStyle = `rgba(0, 255, 209, ${opacity})`
          } else if (combinedWave > 0.4) {
            // Crestas de onda más iluminadas
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
          } else {
            // Reposo
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
          }

          ctx.fill()
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('mouseleave', onPointerLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
      aria-hidden="true"
    />
  )
}

