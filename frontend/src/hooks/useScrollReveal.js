import { useEffect } from 'react'

/**
 * Hook para animaciones de revelado en scroll estilo Apple / Nike.
 * Detecta elementos con la clase `.reveal` y les añade `.is-visible` al entrar en viewport.
 */
export function useScrollReveal() {
  useEffect(() => {
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

    const observeNew = () => document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => observer.observe(el))
    observeNew()
    const mutations = new MutationObserver(observeNew)
    mutations.observe(document.body, { childList: true, subtree: true })
    return () => { observer.disconnect(); mutations.disconnect() }
  }, [])
}

