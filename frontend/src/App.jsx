import { lazy, Suspense } from 'react'
import { Link, Routes, Route } from 'react-router-dom'
const Landing = lazy(() => import('./pages/Landing.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const Panel = lazy(() => import('./pages/Panel.jsx'))
const Recovery = lazy(() => import('./pages/Recovery.jsx'))
const BalloonHistory = lazy(() => import('./pages/BalloonHistory.jsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
export default function App() {
  return <Suspense fallback={<main className="container section" role="status">Cargando SYSGAS…</main>}><Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/registro" element={<Register />} />
    <Route path="/panel" element={<Panel />} />
    <Route path="/recuperar" element={<Recovery />} />
    <Route path="/balon/:qrId" element={<BalloonHistory />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="*" element={<main className="container section"><h1>Página no encontrada</h1><p>Revisa la dirección o vuelve al inicio.</p><Link to="/" className="btn btn-primary">Volver a SYSGAS</Link></main>} />
  </Routes></Suspense>
}
