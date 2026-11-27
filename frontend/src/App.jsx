import { lazy, Suspense, useEffect } from 'react'
import { Link, Routes, Route, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Preloader from './components/Preloader.jsx'
const Landing = lazy(() => import('./pages/Landing.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const CompanyPanel = lazy(() => import('./pages/CompanyPanel.jsx'))
const AdminPanel = lazy(() => import('./pages/AdminPanel.jsx'))
const DriverPanel = lazy(() => import('./pages/DriverPanel.jsx'))
const Recovery = lazy(() => import('./pages/Recovery.jsx'))
const BalloonHistory = lazy(() => import('./pages/BalloonHistory.jsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
export default function App() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1))
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname, location.hash])

  return (
    <Suspense fallback={<Preloader label="Cargando SYSGAS…" />}>
      <div key={location.pathname} className="route-transition">
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/registro" element={<Register />} />
          <Route
            path="/panel"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'empresa_admin']}>
                <CompanyPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gasero"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'empresa_admin', 'chofer_repartidor', 'planta_operador']}>
                <DriverPanel />
              </ProtectedRoute>
            }
          />
          <Route path="/recuperar" element={<Recovery />} />
          <Route path="/balon/:qrId" element={<BalloonHistory />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<main className="container section"><h1>Página no encontrada</h1><p>Revisa la dirección o vuelve al inicio.</p><Link to="/" className="btn btn-primary">Volver a SYSGAS</Link></main>} />
        </Routes>
      </div>
    </Suspense>
  )
}
