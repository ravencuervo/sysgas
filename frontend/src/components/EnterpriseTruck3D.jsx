import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function EnterpriseTruck3D() {
  const mountRef = useRef(null)
  const truckGroupRef = useRef(null)
  const cargoGroupRef = useRef(null)

  useEffect(() => {
    if (!mountRef.current) return
    const el = mountRef.current
    let width = el.clientWidth || 360
    let height = el.clientHeight || 340

    // ─── 1. Escena y Cámara ───
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50)
    camera.position.set(4.2, 3.2, 5.2)
    camera.lookAt(0, 0.2, 0)

    // ─── 2. Renderer WebGL ───
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    el.appendChild(renderer.domElement)

    // ─── 3. Iluminación Técnica ───
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0)
    keyLight.position.set(5, 7, 4)
    scene.add(keyLight)

    const jadeAccentLight = new THREE.DirectionalLight(0x00D294, 1.6)
    jadeAccentLight.position.set(-5, 2, -3)
    scene.add(jadeAccentLight)

    // ─── 4. Grupo Principal del Camión SYSGAS ───
    const truckGroup = new THREE.Group()
    scene.add(truckGroup)
    truckGroupRef.current = truckGroup

    // Materiales del Camión
    const jadeBodyMat = new THREE.MeshStandardMaterial({
      color: 0x00A878,
      roughness: 0.28,
      metalness: 0.25,
    })

    const darkCabMat = new THREE.MeshStandardMaterial({
      color: 0x0A1B14,
      roughness: 0.35,
      metalness: 0.4,
    })

    const windshieldMat = new THREE.MeshStandardMaterial({
      color: 0x1E3A30,
      roughness: 0.1,
      metalness: 0.9,
    })

    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x151816,
      roughness: 0.6,
      metalness: 0.8,
    })

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.85,
      metalness: 0.1,
    })

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xD6E4DC,
      roughness: 0.2,
      metalness: 0.85,
    })

    const headlightMat = new THREE.MeshBasicMaterial({
      color: 0x00D294,
    })

    const gasCylinderMat = new THREE.MeshStandardMaterial({
      color: 0x0066A2, // Azul gas oficial SYSGAS
      roughness: 0.32,
      metalness: 0.22,
    })

    const brassValveMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37, // Latón dorado
      roughness: 0.15,
      metalness: 0.9,
    })

    // Chasis Base
    const chassisGeo = new THREE.BoxGeometry(3.6, 0.22, 1.5)
    const chassis = new THREE.Mesh(chassisGeo, chassisMat)
    chassis.position.y = 0.5
    truckGroup.add(chassis)

    // Cabina Frontal (delantera)
    const cabGeo = new THREE.BoxGeometry(1.2, 1.1, 1.46)
    const cab = new THREE.Mesh(cabGeo, jadeBodyMat)
    cab.position.set(1.15, 1.15, 0)
    truckGroup.add(cab)

    // Parabrisas Frontal
    const windshieldGeo = new THREE.BoxGeometry(0.1, 0.52, 1.34)
    const windshield = new THREE.Mesh(windshieldGeo, windshieldMat)
    windshield.position.set(1.73, 1.28, 0)
    truckGroup.add(windshield)

    // Ventanas Laterales
    const sideWinGeo = new THREE.BoxGeometry(0.65, 0.42, 1.48)
    const sideWin = new THREE.Mesh(sideWinGeo, windshieldMat)
    sideWin.position.set(1.15, 1.32, 0)
    truckGroup.add(sideWin)

    // Parachoques y Faros
    const bumperGeo = new THREE.BoxGeometry(0.2, 0.32, 1.52)
    const bumper = new THREE.Mesh(bumperGeo, darkCabMat)
    bumper.position.set(1.78, 0.56, 0)
    truckGroup.add(bumper)

    const lightGeo = new THREE.BoxGeometry(0.06, 0.14, 0.24)
    const lightL = new THREE.Mesh(lightGeo, headlightMat)
    lightL.position.set(1.86, 0.58, 0.52)
    truckGroup.add(lightL)

    const lightR = new THREE.Mesh(lightGeo, headlightMat)
    lightR.position.set(1.86, 0.58, -0.52)
    truckGroup.add(lightR)

    // Plataforma de Carga Trasera
    const bedGeo = new THREE.BoxGeometry(2.35, 0.18, 1.48)
    const bed = new THREE.Mesh(bedGeo, darkCabMat)
    bed.position.set(-0.6, 0.7, 0)
    truckGroup.add(bed)

    // Barandas de la plataforma
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x00A878,
      roughness: 0.3,
      metalness: 0.3,
    })
    const railGeoBack = new THREE.BoxGeometry(0.08, 0.55, 1.48)
    const railBack = new THREE.Mesh(railGeoBack, railMat)
    railBack.position.set(-1.75, 1.0, 0)
    truckGroup.add(railBack)

    const railGeoSide = new THREE.BoxGeometry(2.35, 0.55, 0.08)
    const railSideL = new THREE.Mesh(railGeoSide, railMat)
    railSideL.position.set(-0.6, 1.0, 0.72)
    truckGroup.add(railSideL)

    const railSideR = new THREE.Mesh(railGeoSide, railMat)
    railSideR.position.set(-0.6, 1.0, -0.72)
    truckGroup.add(railSideR)

    // Ruedas (4 Ruedas Industriales con Aros)
    const wheelPositions = [
      { x: 1.15, z: 0.76 },
      { x: 1.15, z: -0.76 },
      { x: -0.95, z: 0.76 },
      { x: -0.95, z: -0.76 },
    ]

    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 24)
    wheelGeo.rotateX(Math.PI / 2)
    const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 16)
    rimGeo.rotateX(Math.PI / 2)

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeo, tireMat)
      wheel.position.set(pos.x, 0.36, pos.z)
      const rim = new THREE.Mesh(rimGeo, rimMat)
      wheel.add(rim)
      truckGroup.add(wheel)
    })

    // ─── 5. Carga de Balones de Gas 3D en la Plataforma ───
    const cargoGroup = new THREE.Group()
    cargoGroup.position.set(-0.6, 0.8, 0)
    truckGroup.add(cargoGroup)
    cargoGroupRef.current = cargoGroup

    // Geometría del baloncito
    const cylGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.52, 16)
    const domeGeo = new THREE.SphereGeometry(0.18, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    const valveGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.1, 10)

    const createMiniCylinder = () => {
      const g = new THREE.Group()
      const body = new THREE.Mesh(cylGeo, gasCylinderMat)
      body.position.y = 0.26
      g.add(body)

      const topDome = new THREE.Mesh(domeGeo, gasCylinderMat)
      topDome.position.y = 0.52
      g.add(topDome)

      const valve = new THREE.Mesh(valveGeo, brassValveMat)
      valve.position.y = 0.68
      g.add(valve)
      return g
    }

    // Rejilla de Balones en la plataforma (3 filas x 2 columnas)
    const rows = 4
    const cols = 3
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const miniCyl = createMiniCylinder()
        miniCyl.position.set(-0.75 + r * 0.48, 0, -0.42 + c * 0.42)
        cargoGroup.add(miniCyl)
      }
    }

    // Plataforma Circular Tecnológica
    const basePlateGeo = new THREE.CylinderGeometry(2.8, 2.9, 0.08, 36)
    const basePlateMat = new THREE.MeshStandardMaterial({
      color: 0x051C15,
      roughness: 0.4,
      metalness: 0.6,
    })
    const basePlate = new THREE.Mesh(basePlateGeo, basePlateMat)
    basePlate.position.y = -0.04
    scene.add(basePlate)

    // Anillo exterior de luz jade
    const ringGeo = new THREE.RingGeometry(2.7, 2.78, 48)
    ringGeo.rotateX(-Math.PI / 2)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00D294,
      side: THREE.DoubleSide,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.y = 0.01
    scene.add(ring)

    // Posición inicial del camión
    truckGroup.rotation.y = -0.65

    // ─── 6. Interacción de Rotación 360° con Mouse / Touch ───
    let isDragging = false
    let previousPointerX = 0
    let rotationVelocity = 0.004

    const onPointerMove = (e) => {

      if (isDragging) {
        const deltaX = e.clientX - previousPointerX
        rotationVelocity = deltaX * 0.009
        truckGroup.rotation.y += rotationVelocity
        previousPointerX = e.clientX
      }
    }

    const onPointerDown = (e) => {
      isDragging = true
      previousPointerX = e.clientX
      el.style.cursor = 'grabbing'
    }

    const onPointerUp = () => {
      isDragging = false
      el.style.cursor = 'grab'
    }

    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)

    // ─── 7. Bucle de Animación ───
    let frameId
    const timer = new THREE.Timer()

    const animate = (timestamp) => {
      frameId = requestAnimationFrame(animate)
      timer.update(timestamp)
      const elapsed = timer.getElapsed()

      if (!isDragging) {
        truckGroup.rotation.y += rotationVelocity
        rotationVelocity *= 0.96
        if (Math.abs(rotationVelocity) < 0.003) {
          rotationVelocity = 0.003 // Giro continuo y suave para exhibición
        }
        truckGroup.position.y = Math.sin(elapsed * 1.8) * 0.025
      }

      renderer.render(scene, camera)
    }
    animate()

    // ─── 8. Redimensionamiento ───
    const handleResize = () => {
      if (!mountRef.current) return
      width = mountRef.current.clientWidth
      height = mountRef.current.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      renderer.dispose()
      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '320px',
        position: 'relative',
        cursor: 'grab',
        touchAction: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title="Camión de Flota SYSGAS 3D — Arrastra para girar en 360°"
    />
  )
}

