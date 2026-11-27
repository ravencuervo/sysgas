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

    // ─── 1. Escena y Cámara (proporción real camión Hino Dutro / Isuzu NPR) ───
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 50)
    camera.position.set(5.1, 2.75, 5.9)
    camera.lookAt(0, 0.62, 0)

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
    renderer.toneMappingExposure = 1.2
    el.appendChild(renderer.domElement)

    // ─── 3. Iluminación Estudio Automotriz ───
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
    keyLight.position.set(5, 8, 5)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xa3f5dc, 1.15)
    fillLight.position.set(-5, 3, -4)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0)
    rimLight.position.set(-2, 4, 6)
    scene.add(rimLight)

    // ─── 4. Grupo Principal del Camión Realista SYSGAS ───
    const truckGroup = new THREE.Group()
    scene.add(truckGroup)
    truckGroupRef.current = truckGroup

    // Materiales realistas
    const cabPaintMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.22,
    })

    const jadeAccentMat = new THREE.MeshStandardMaterial({
      color: 0x00a878,
      roughness: 0.28,
      metalness: 0.28,
    })

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x16241e,
      roughness: 0.58,
      metalness: 0.3,
    })

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0d1f19,
      roughness: 0.06,
      metalness: 0.92,
    })

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe6eeea,
      roughness: 0.16,
      metalness: 0.9,
    })

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x181b1a,
      roughness: 0.86,
      metalness: 0.06,
    })

    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xf8fff9 })
    const amberLightMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 })

    const gasCylinderMat = new THREE.MeshStandardMaterial({
      color: 0x0066a2,
      roughness: 0.28,
      metalness: 0.24,
    })

    const brassValveMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.18,
      metalness: 0.9,
    })

    // ─── Chasis Doble Viga (largo real ~4.35 unidades, ~75% plataforma) ───
    const railGeo = new THREE.BoxGeometry(4.32, 0.16, 0.11)
    const chassisZs = [-0.42, 0.42]
    chassisZs.forEach((z) => {
      const beam = new THREE.Mesh(railGeo, darkTrimMat)
      beam.position.set(-0.18, 0.46, z)
      truckGroup.add(beam)
    })

    // Tanque de combustible cilíndrico + caja de baterías
    const tankGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.72, 20)
    tankGeo.rotateZ(Math.PI / 2)
    const fuelTank = new THREE.Mesh(tankGeo, chromeMat)
    fuelTank.position.set(0.08, 0.44, 0.64)
    truckGroup.add(fuelTank)

    const batteryBox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.24), darkTrimMat)
    batteryBox.position.set(0.15, 0.44, -0.62)
    truckGroup.add(batteryBox)

    // ─── Cabina Cab-Over Realista (Isuzu NPR / Hino Dutro) ───
    // Perfil lateral exacto: frente inclinado desde (1.92, 1.08) hasta (1.66, 1.72)
    const cabShape = new THREE.Shape()
    cabShape.moveTo(0.68, 0.56)
    cabShape.lineTo(1.88, 0.56)
    cabShape.quadraticCurveTo(1.94, 0.62, 1.94, 0.78)
    cabShape.lineTo(1.92, 1.08)
    cabShape.lineTo(1.66, 1.72)
    cabShape.quadraticCurveTo(1.6, 1.82, 1.44, 1.84)
    cabShape.lineTo(0.74, 1.84)
    cabShape.quadraticCurveTo(0.66, 1.82, 0.66, 1.72)
    cabShape.lineTo(0.68, 0.56)

    const cabExtrude = new THREE.ExtrudeGeometry(cabShape, {
      depth: 1.42,
      bevelEnabled: true,
      bevelThickness: 0.055,
      bevelSize: 0.045,
      bevelSegments: 4,
    })
    cabExtrude.translate(0, 0, -0.71)
    const cabMesh = new THREE.Mesh(cabExtrude, cabPaintMat)
    truckGroup.add(cabMesh)

    // Franja corporativa verde jade lateral en la cabina
    const cabStripe = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.12, 1.54), jadeAccentMat)
    cabStripe.position.set(1.3, 0.94, 0)
    truckGroup.add(cabStripe)

    // ─── Parabrisas Frontal Panorámico al Ras + Marco de Goma + Limpiaparabrisas ───
    const windshieldAngle = Math.atan2(1.92 - 1.66, 1.72 - 1.08) // ~0.386 rad
    const windshieldGroup = new THREE.Group()
    windshieldGroup.position.set(1.815, 1.41, 0)
    windshieldGroup.rotation.z = windshieldAngle
    truckGroup.add(windshieldGroup)

    // Marco negro de goma (sello perimetral)
    const gasketFrame = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.57, 1.38), darkTrimMat)
    windshieldGroup.add(gasketFrame)

    // Cristal panorámico ligeramente adelantado dentro del marco
    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.50, 1.30), glassMat)
    glassPane.position.x = 0.005
    windshieldGroup.add(glassPane)

    // Escobillas limpiaparabrisas
    const wiperZs = [-0.28, 0.28]
    wiperZs.forEach((wz) => {
      const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.42), darkTrimMat)
      wiper.position.set(0.04, -0.21, wz)
      wiper.rotation.x = 0.18
      windshieldGroup.add(wiper)
    })

    // Visera solar aerodinámica superior
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 1.42), jadeAccentMat)
    visor.position.set(1.70, 1.77, 0)
    visor.rotation.z = -0.15
    truckGroup.add(visor)

    // ─── Ventanas Laterales Escalonadas (corte clásico Hino/Isuzu) ───
    const sideWinShape = new THREE.Shape()
    sideWinShape.moveTo(0.84, 1.18)
    sideWinShape.lineTo(1.36, 1.18)
    sideWinShape.lineTo(1.48, 1.10) // escalón inferior delantero para visibilidad
    sideWinShape.lineTo(1.66, 1.10)
    sideWinShape.lineTo(1.54, 1.64)
    sideWinShape.lineTo(0.84, 1.64)
    sideWinShape.closePath()

    const sideFrameGeo = new THREE.ExtrudeGeometry(sideWinShape, {
      depth: 1.535,
      bevelEnabled: false,
    })
    sideFrameGeo.translate(0, 0, -0.7675)
    truckGroup.add(new THREE.Mesh(sideFrameGeo, darkTrimMat))

    const sideGlassGeo = new THREE.ExtrudeGeometry(sideWinShape, {
      depth: 1.545,
      bevelEnabled: false,
    })
    sideGlassGeo.translate(0, 0, -0.7725)
    const sideGlass = new THREE.Mesh(sideGlassGeo, glassMat)
    sideGlass.scale.set(0.96, 0.92, 1)
    sideGlass.position.set(0.05, 0.11, 0)
    truckGroup.add(sideGlass)

    // Manijas de puerta y peldaño de acceso
    const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 1.56), darkTrimMat)
    doorHandle.position.set(0.96, 1.03, 0)
    truckGroup.add(doorHandle)

    const sideStep = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 1.54), darkTrimMat)
    sideStep.position.set(0.88, 0.56, 0)
    truckGroup.add(sideStep)

    // ─── Parrilla Frontal + Faros + Parachoques Realista ───
    const grilleBg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.96), darkTrimMat)
    grilleBg.position.set(1.94, 0.89, 0)
    truckGroup.add(grilleBg)

    for (let i = 0; i < 3; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.88), chromeMat)
      slat.position.set(1.945, 0.81 + i * 0.08, 0)
      truckGroup.add(slat)
    }

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 1.56), darkTrimMat)
    bumper.position.set(1.91, 0.55, 0)
    truckGroup.add(bumper)

    const headGeo = new THREE.BoxGeometry(0.07, 0.12, 0.22)
    const turnGeo = new THREE.BoxGeometry(0.07, 0.12, 0.07)
    const frontLightZs = [-0.58, 0.58]
    frontLightZs.forEach((z) => {
      const head = new THREE.Mesh(headGeo, headlightMat)
      head.position.set(1.95, 0.69, z)
      truckGroup.add(head)

      const turn = new THREE.Mesh(turnGeo, amberLightMat)
      turn.position.set(1.94, 0.69, z > 0 ? z + 0.14 : z - 0.14)
      truckGroup.add(turn)
    })

    // Espejos retrovisores tipo camión comercial
    const mirrorZs = [-0.88, 0.88]
    mirrorZs.forEach((z) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.26, 8), darkTrimMat)
      arm.rotation.x = Math.PI / 2
      arm.position.set(1.66, 1.40, z > 0 ? 0.79 : -0.79)
      truckGroup.add(arm)

      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.11), darkTrimMat)
      mirror.position.set(1.68, 1.35, z)
      truckGroup.add(mirror)
    })

    // ─── Plataforma + Jaula Tubular de Seguridad para GLP ───
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.13, 1.60), darkTrimMat)
    bed.position.set(-0.90, 0.61, 0)
    truckGroup.add(bed)

    const rearSideZs = [-0.80, 0.80]
    rearSideZs.forEach((z) => {
      const mudguard = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.06, 0.30), darkTrimMat)
      mudguard.position.set(-1.32, 0.56, z)
      truckGroup.add(mudguard)

      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, 0.24), tailLightMat)
      tail.position.set(-2.34, 0.56, z > 0 ? 0.56 : -0.56)
      truckGroup.add(tail)
    })

    // Postes verticales y rieles tubulares de la jaula GLP
    const postGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.74, 10)
    const postXs = [-2.28, -1.36, -0.44, 0.48]
    const railZs = [-0.77, 0.77]
    postXs.forEach((px) => {
      railZs.forEach((pz) => {
        const post = new THREE.Mesh(postGeo, jadeAccentMat)
        post.position.set(px, 1.03, pz)
        truckGroup.add(post)
      })
    })

    const sideRailGeo = new THREE.CylinderGeometry(0.022, 0.022, 2.80, 10)
    sideRailGeo.rotateZ(Math.PI / 2)
    const railYs = [0.92, 1.16, 1.38]
    railYs.forEach((ry) => {
      railZs.forEach((rz) => {
        const rail = new THREE.Mesh(sideRailGeo, jadeAccentMat)
        rail.position.set(-0.90, ry, rz)
        truckGroup.add(rail)
      })
    })

    const backRailGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.56, 10)
    backRailGeo.rotateX(Math.PI / 2)
    railYs.forEach((ry) => {
      const rail = new THREE.Mesh(backRailGeo, jadeAccentMat)
      rail.position.set(-2.28, ry, 0)
      truckGroup.add(rail)
    })

    // ─── Ruedas Realistas (Delanteras simples + Traseras dobles DRW) ───
    const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.21, 32)
    tireGeo.rotateX(Math.PI / 2)
    const bevelRingGeo = new THREE.TorusGeometry(0.305, 0.052, 12, 28)
    const rimGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.22, 24)
    rimGeo.rotateX(Math.PI / 2)
    const hubGeo = new THREE.CylinderGeometry(0.085, 0.095, 0.25, 16)
    hubGeo.rotateX(Math.PI / 2)
    const lugGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.24, 8)
    lugGeo.rotateX(Math.PI / 2)

    const createSingleWheel = (withRimDetails = true, sideSign = 1) => {
      const g = new THREE.Group()
      g.add(new THREE.Mesh(tireGeo, tireMat))

      const sidewall = new THREE.Mesh(bevelRingGeo, tireMat)
      sidewall.position.z = sideSign * 0.065
      g.add(sidewall)

      if (withRimDetails) {
        g.add(new THREE.Mesh(rimGeo, chromeMat))
        g.add(new THREE.Mesh(hubGeo, darkTrimMat))
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2
          const lug = new THREE.Mesh(lugGeo, darkTrimMat)
          lug.position.set(Math.cos(angle) * 0.135, Math.sin(angle) * 0.135, 0)
          g.add(lug)
        }
      }
      return g
    }

    // Eje delantero (debajo de la cabina)
    const frontZs = [0.74, -0.74]
    frontZs.forEach((z) => {
      const w = createSingleWheel(true, z > 0 ? 1 : -1)
      w.position.set(1.36, 0.36, z)
      truckGroup.add(w)
    })

    // Eje trasero doble (DRW)
    const rearZs = [0.78, -0.78]
    rearZs.forEach((z) => {
      const sign = z > 0 ? 1 : -1
      const outer = createSingleWheel(true, sign)
      outer.position.set(-1.32, 0.36, z)
      truckGroup.add(outer)

      const inner = createSingleWheel(false, -sign)
      inner.position.set(-1.32, 0.36, z - sign * 0.22)
      truckGroup.add(inner)
    })

    // ─── 5. Carga de Balones de Gas 3D en la Jaula ───
    const cargoGroup = new THREE.Group()
    cargoGroup.position.set(-0.90, 0.68, 0)
    truckGroup.add(cargoGroup)
    cargoGroupRef.current = cargoGroup

    const cylGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.44, 18)
    const domeGeo = new THREE.SphereGeometry(0.18, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2)
    const collarGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.09, 14, 1, true)
    const valveGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.08, 10)

    const createMiniCylinder = () => {
      const g = new THREE.Group()
      const body = new THREE.Mesh(cylGeo, gasCylinderMat)
      body.position.y = 0.22
      g.add(body)

      const topDome = new THREE.Mesh(domeGeo, gasCylinderMat)
      topDome.position.y = 0.44
      g.add(topDome)

      const collar = new THREE.Mesh(collarGeo, gasCylinderMat)
      collar.position.y = 0.63
      g.add(collar)

      const valve = new THREE.Mesh(valveGeo, brassValveMat)
      valve.position.y = 0.62
      g.add(valve)
      return g
    }

    const rows = 5
    const cols = 3
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const miniCyl = createMiniCylinder()
        miniCyl.position.set(-1.02 + r * 0.50, 0, -0.44 + c * 0.44)
        cargoGroup.add(miniCyl)
      }
    }

    // Plataforma Circular Tecnológica
    const basePlateGeo = new THREE.CylinderGeometry(3.1, 3.2, 0.08, 56)
    const basePlateMat = new THREE.MeshStandardMaterial({
      color: 0x0a6849,
      roughness: 0.45,
      metalness: 0.3,
    })
    const basePlate = new THREE.Mesh(basePlateGeo, basePlateMat)
    basePlate.position.y = -0.04
    scene.add(basePlate)

    const ringGeo = new THREE.RingGeometry(3.0, 3.08, 64)
    ringGeo.rotateX(-Math.PI / 2)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xa3f5dc,
      side: THREE.DoubleSide,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.y = 0.01
    scene.add(ring)

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
          rotationVelocity = 0.003
        }
        truckGroup.position.y = Math.sin(elapsed * 1.8) * 0.02
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
