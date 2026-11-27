import { useEffect, useRef } from 'react'

export default function HeroWaveGrid({ variant = 'hero' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isPanel = variant === 'panel'
    let animationFrameId = 0
    let width = 0
    let height = 0
    let dpr = 1
    let particles = []

    const pointer = { x: -1000, y: -1000, active: false }

    const createParticles = (w, h) => {
      const area = w * h
      const targetCount = isPanel
        ? Math.min(52, Math.max(24, Math.floor(area / 28000)))
        : Math.min(72, Math.max(32, Math.floor(area / 19000)))

      return Array.from({ length: targetCount }, (_, i) => {
        const isAccent = i % 4 === 0
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * (isPanel ? 0.28 : 0.42),
          vy: (Math.random() - 0.5) * (isPanel ? 0.28 : 0.42),
          r: isAccent ? (isPanel ? 2.1 : 2.5) : (isPanel ? 1.3 : 1.6),
          accent: isAccent,
          phase: Math.random() * Math.PI * 2,
        }
      })
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth
      height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles = createParticles(width, height)
    }

    resize()
    window.addEventListener('resize', resize)

    const onPointerMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
      pointer.active = true
    }

    const onPointerLeave = () => {
      pointer.active = false
      pointer.x = -1000
      pointer.y = -1000
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('mouseleave', onPointerLeave)

    const linkDist = isPanel ? 135 : 150
    const mouseDist = 170
    let tick = 0

    const render = () => {
      tick += 0.018
      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        if (pointer.active) {
          const dx = p.x - pointer.x
          const dy = p.y - pointer.y
          const dist = Math.hypot(dx, dy)
          if (dist > 0 && dist < mouseDist) {
            const push = (1 - dist / mouseDist) * 0.45
            p.x += (dx / dist) * push
            p.y += (dy / dist) * push
          }
        }
      }

      // Enlaces geométricos finos (Swiss hairline network)
      ctx.lineWidth = isPanel ? 0.75 : 0.9
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < linkDist) {
            const alpha = (1 - dist / linkDist) * (isPanel ? 0.14 : 0.24)
            ctx.strokeStyle = isPanel
              ? `rgba(0, 122, 87, ${alpha})`
              : `rgba(255, 255, 255, ${alpha})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }

        if (pointer.active) {
          const dx = a.x - pointer.x
          const dy = a.y - pointer.y
          const dist = Math.hypot(dx, dy)
          if (dist < mouseDist) {
            const alpha = (1 - dist / mouseDist) * (isPanel ? 0.22 : 0.36)
            ctx.strokeStyle = isPanel
              ? `rgba(0, 168, 120, ${alpha})`
              : `rgba(163, 245, 220, ${alpha})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(pointer.x, pointer.y)
            ctx.stroke()
          }
        }
      }

      // Nodos de partículas
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const pulse = 0.75 + Math.sin(tick + p.phase) * 0.25
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2)
        if (isPanel) {
          ctx.fillStyle = p.accent ? 'rgba(0, 168, 120, 0.32)' : 'rgba(0, 77, 54, 0.18)'
        } else {
          ctx.fillStyle = p.accent ? 'rgba(163, 245, 220, 0.78)' : 'rgba(255, 255, 255, 0.58)'
        }
        ctx.fill()
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
  }, [variant])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: variant === 'panel' ? 'fixed' : 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: variant === 'panel' ? 0 : 1,
      }}
      aria-hidden="true"
    />
  )
}
