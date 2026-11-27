import { lazy, useState } from 'react'
import AffiliationModal from './AffiliationModal.jsx'
import Lazy3DStage from './Lazy3DStage.jsx'
import MorphIcon from './MorphIcon.jsx'
import './EnterpriseSection.css'

const EnterpriseTruck3D = lazy(() => import('./EnterpriseTruck3D.jsx'))

export default function EnterpriseSection() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <section className="section px-enterprise section--jade" id="empresas">
      <div className="container">
        <div className="px-enterprise__header reveal">
          <h2 className="section-title">Impulsa tu distribuidora de gas con SYSGAS.</h2>
          <p className="section-desc">
            Sistema operativo para distribuidoras, envasadoras y flotas de GLP en Puno y el sur del país. Controla entregas, elimina pérdidas de cilindros con pasaporte QR y registra cobros en puerta.
          </p>
        </div>

        <div className="px-enterprise__grid">
          <div className="px-enterprise__module reveal reveal-delay-1">
            <MorphIcon base="bi-truck" active="bi-truck-front-fill" className="px-enterprise__icon" />
            <h3 className="px-enterprise__card-title">Despacho y telemetría en ruta</h3>
            <p className="px-enterprise__card-desc">
              Asigna pedidos a tus repartidores y consulta la ubicación que comparten durante una entrega activa.
            </p>
            <ul className="px-enterprise__bullet-list">
              <li><i className="bi bi-check2" /> Asignación de repartidor y vehículo</li>
              <li><i className="bi bi-check2" /> Ubicación durante la entrega</li>
              <li><i className="bi bi-check2" /> Registro de vehículos y fotos</li>
            </ul>
          </div>

          <div className="px-enterprise__module reveal reveal-delay-2">
            <MorphIcon base="bi-qr-code" active="bi-qr-code-scan" className="px-enterprise__icon" />
            <h3 className="px-enterprise__card-title">Trazabilidad anti-pérdidas</h3>
            <p className="px-enterprise__card-desc">
              Cada balón posee un número de serie y QR único para auditar quién cargó el cilindro, a quién se entregó y si el vacío fue recuperado.
            </p>
            <ul className="px-enterprise__bullet-list">
              <li><i className="bi bi-check2" /> Registro de balones vacíos recuperados</li>
              <li><i className="bi bi-check2" /> Fecha de prueba y tara de fábrica</li>
              <li><i className="bi bi-check2" /> Auditoría de inventario</li>
            </ul>
          </div>

          <div className="px-enterprise__module reveal reveal-delay-3">
            <MorphIcon base="bi-receipt" active="bi-receipt-cutoff" className="px-enterprise__icon" />
            <h3 className="px-enterprise__card-title">Panel web de reparto y cobros</h3>
            <p className="px-enterprise__card-desc">
              Tus repartidores registran el peso medido desde el panel web, consultan entregas y generan notas de venta internas.
            </p>
            <ul className="px-enterprise__bullet-list">
              <li><i className="bi bi-check2" /> Validación de peso antes de cobrar</li>
              <li><i className="bi bi-check2" /> Nota de venta interna</li>
              <li><i className="bi bi-check2" /> Reporte de cobros registrados</li>
            </ul>
          </div>
        </div>

        <div className="px-enterprise__pilot-row reveal">
          <div className="px-enterprise__truck-stage">
            <Lazy3DStage minHeight={360}>
              <EnterpriseTruck3D />
            </Lazy3DStage>
            <div className="px-enterprise__3d-hint">
              <i className="bi bi-arrow-repeat" />
              <span>Gira el camión de flota en 3D</span>
            </div>
          </div>

          <div className="px-enterprise__pilot-info">
            <h3 className="px-enterprise__calc-title">Afilia tu distribuidora a la red SYSGAS</h3>
            <p className="px-enterprise__calc-desc">
              Conecta tu flota al sistema para gestionar pedidos por zona, controlar el retorno de cilindros vacíos y emitir comprobantes internos desde un solo panel.
            </p>

            <div className="px-enterprise__cta-wrap">
              <button
                type="button"
                className="btn px-enterprise__btn-affiliate"
                onClick={() => setModalOpen(true)}
              >
                <span>Afiliar mi distribuidora</span>
                <i className="bi bi-arrow-right" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <AffiliationModal onClose={() => setModalOpen(false)} />
      )}
    </section>
  )
}
