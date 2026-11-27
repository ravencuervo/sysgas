import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollProgressBar() {
  const fillRef = useRef(null)
  const { pathname } = useLocation()

  useEffect(() => {
    let rafId = 0

    const update = () => {
      rafId = 0
      const el = fillRef.current
      if (!el) return

      const doc = document.documentElement
      const maxScroll = doc.scrollHeight - window.innerHeight
      if (maxScroll <= 0) {
        el.style.opacity = '0'
        el.style.transform = 'scaleX(0)'
        return
      }

      const ratio = Math.min(1, Math.max(0, window.scrollY / maxScroll))
      el.style.opacity = '1'
      el.style.transform = `scaleX(${ratio})`
    }

    const onScroll = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [pathname])

  return (
    <div className="sys-scroll-progress" aria-hidden="true">
      <div ref={fillRef} className="sys-scroll-progress__fill" />
    </div>
  )
}
