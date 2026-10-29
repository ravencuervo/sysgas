import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import BalloonHistory from './pages/BalloonHistory.jsx'
import LoginPage from './pages/LoginPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/balon/:qrId" element={<BalloonHistory />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  )
}
