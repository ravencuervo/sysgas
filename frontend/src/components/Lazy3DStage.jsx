import { Suspense, useEffect, useRef, useState } from 'react'

export default function Lazy3DStage({ children, minHeight = 420 }) {
  const hostRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '240px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={hostRef} style={{ width: '100%', minHeight: `${minHeight}px` }}>
      {visible ? (
        <Suspense fallback={<div style={{ minHeight: `${minHeight}px` }} />}>
          {children}
        </Suspense>
      ) : null}
    </div>
  )
}
