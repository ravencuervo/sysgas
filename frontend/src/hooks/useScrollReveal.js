import { useEffect } from 'react'

/**
 * Hook para animaciones de revelado en scroll estilo Apple / Nike.
 * Detecta elementos con la clase `.reveal` y les añade `.is-visible` al entrar en viewport.
 */
export function useScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal:not(.is-visible)')
    if (!elements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    )

    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  })
}

