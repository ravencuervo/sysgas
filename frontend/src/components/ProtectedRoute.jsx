import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { db, isSupabaseConfigured } from '../lib/supabase.js'
import Preloader from './Preloader.jsx'

function homeForRole(rol) {
  if (rol === 'super_admin') return '/admin'
  if (rol === 'empresa_admin') return '/panel'
  if (rol === 'chofer_repartidor' || rol === 'planta_operador') return '/gasero'
  return '/'
}

export default function ProtectedRoute({ allowedRoles, children }) {
  const [state, setState] = useState({ checking: true, allowed: false, redirect: null, rol: null })

  useEffect(() => {
    let active = true
    async function verify() {
      if (!isSupabaseConfigured) {
        if (active) setState({ checking: false, allowed: false, redirect: '/login', rol: null })
        return
      }
      try {
        const { data: { session } } = await db().auth.getSession()
        if (!session?.user) {
          if (active) setState({ checking: false, allowed: false, redirect: '/login', rol: null })
          return
        }
        const { data: perfil, error } = await db()
          .from('perfiles')
          .select('rol,activo')
          .eq('id', session.user.id)
          .single()
        if (error || !perfil || !perfil.activo) {
          if (active) setState({ checking: false, allowed: false, redirect: '/login', rol: null })
          return
        }
        const ok = allowedRoles.includes(perfil.rol)
        if (active) {
          setState({ checking: false, allowed: ok, redirect: ok ? null : homeForRole(perfil.rol), rol: perfil.rol })
        }
      } catch {
        if (active) setState({ checking: false, allowed: false, redirect: '/login', rol: null })
      }
    }
    void verify()
    return () => { active = false }
  }, [allowedRoles])

  if (state.checking) {
    return <Preloader label="Verificando acceso al sistema…" />
  }

  if (state.redirect === '/login') {
    return <Navigate to="/login" replace />
  }

  if (!state.allowed) {
    return (
      <main className="container section" role="alert">
        <h1>Acceso restringido</h1>
        <p>Tu cuenta no tiene permisos para ingresar a esta sección.</p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
          <Link to={state.redirect || '/'} className="btn btn-primary">
            Ir a mi panel
          </Link>
          <Link to="/login" className="btn btn-secondary">
            Cambiar de cuenta
          </Link>
        </div>
      </main>
    )
  }

  return children
}
