import { useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import HeroSection from '../components/HeroSection.jsx'
import CatalogSection from '../components/CatalogSection.jsx'
import QRDemoSection from '../components/QRDemoSection.jsx'
import MobileAppTeaser from '../components/MobileAppTeaser.jsx'
import EnterpriseSection from '../components/EnterpriseSection.jsx'
import LifecycleTimeline from '../components/LifecycleTimeline.jsx'
import ValueProposition from '../components/ValueProposition.jsx'
import ContactCTA from '../components/ContactCTA.jsx'
import Footer from '../components/Footer.jsx'
import { useScrollReveal } from '../hooks/useScrollReveal.js'

export default function Landing() {
  const [selectedCapacity, setSelectedCapacity] = useState('10 kg')

  // Activa las transiciones y animaciones de scroll estilo Apple/Nike
  useScrollReveal()

  return (
    <>
      <Navbar />
      <main>
        {/* 1. Hero 100vh Full Screen con rotación 360° */}
        <HeroSection />

        {/* 2. Catálogo Inmediato (Nike Product Showcase) */}
        <CatalogSection onSelectProduct={setSelectedCapacity} />

        {/* 3. Experiencia Interactiva QR (Apple Feature Showcase) */}
        <QRDemoSection />

        {/* 4. Teaser de la Futura App Móvil (B2C) */}
        <MobileAppTeaser />

        {/* 5. Soluciones B2B para Distribuidoras (Enterprise Suite) */}
        <EnterpriseSection />

        {/* 6. Proceso en 3 Pasos Simples */}
        <LifecycleTimeline />

        {/* 7. Propuesta de Valor y Tranquilidad */}
        <ValueProposition />

        {/* 8. Pedido Express Inmediato */}
        <ContactCTA selectedCapacity={selectedCapacity} onSelectCapacity={setSelectedCapacity} />
      </main>
      <Footer />
    </>
  )
}
