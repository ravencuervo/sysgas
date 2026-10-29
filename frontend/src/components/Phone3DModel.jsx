import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function Phone3DModel() {
  const mountRef = useRef(null)

  useEffect(() => {
    if (!mountRef.current) return
    const el = mountRef.current
    let width = el.clientWidth || 340
    let height = el.clientHeight || 480

    // ─── 1. Escena y Cámara ───
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50)
    camera.position.set(0, 0, 7.8)

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

    // ─── 3. Luces para Reflejos Metálicos de Titanio ───
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
    keyLight.position.set(4, 5, 6)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x00D294, 1.4)
    fillLight.position.set(-5, -2, 4)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0)
    rimLight.position.set(0, -6, -4)
    scene.add(rimLight)

    // ─── 4. Canvas Dinámico para la Pantalla OLED de la App SYSGAS ───
    const screenWidth = 512
    const screenHeight = 1024
    const screenCanvas = document.createElement('canvas')
    screenCanvas.width = screenWidth
    screenCanvas.height = screenHeight
    const ctx = screenCanvas.getContext('2d')
    const screenTexture = new THREE.CanvasTexture(screenCanvas)
    screenTexture.generateMipmaps = true
    screenTexture.minFilter = THREE.LinearMipmapLinearFilter

    // Función para renderizar la pantalla activa con animación de ruta
    let truckProgress = 0.45
    const drawAppScreen = (elapsed) => {
      ctx.clearRect(0, 0, screenWidth, screenHeight)

      // Fondo de la pantalla
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, screenWidth, screenHeight)

      // Barra Superior / Header de la App
      ctx.fillStyle = '#062118'
      ctx.fillRect(0, 0, screenWidth, 120)

      // Dynamic Island
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.roundRect(screenWidth / 2 - 75, 18, 150, 36, 18)
      ctx.fill()

      // Sensor de cámara en la isla
      ctx.fillStyle = '#101B2B'
      ctx.beginPath()
      ctx.arc(screenWidth / 2 + 50, 36, 6, 0, Math.PI * 2)
      ctx.fill()

      // Titular Header
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 24px Montserrat, sans-serif'
      ctx.fillText('SYSGAS PUNO', 30, 95)

      // Badge EN RUTA
      ctx.fillStyle = '#00D294'
      ctx.font = 'bold 16px "JetBrains Mono", monospace'
      ctx.textAlign = 'right'
      ctx.fillText('EN RUTA · GPS', screenWidth - 30, 95)
      ctx.textAlign = 'left'

      // Mapa de Calles y Trazado GPS
      ctx.fillStyle = '#F2F8F5'
      ctx.fillRect(0, 120, screenWidth, 480)

      // Cuadrícula de calles
      ctx.strokeStyle = '#D6E4DC'
      ctx.lineWidth = 3
      for (let x = 30; x < screenWidth; x += 65) {
        ctx.beginPath()
        ctx.moveTo(x, 120)
        ctx.lineTo(x, 600)
        ctx.stroke()
      }
      for (let y = 160; y < 600; y += 65) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(screenWidth, y)
        ctx.stroke()
      }

      // Ruta GPS curva animada en verde jade
      ctx.strokeStyle = '#00A878'
      ctx.lineWidth = 10
      ctx.setLineDash([16, 10])
      ctx.lineDashOffset = -elapsed * 35
      ctx.beginPath()
      ctx.moveTo(60, 520)
      ctx.bezierCurveTo(140, 420, 220, 280, 420, 210)
      ctx.stroke()
      ctx.setLineDash([])

      // Destino: Casa del Cliente (Pin rojo/negro)
      ctx.fillStyle = '#0A1B14'
      ctx.beginPath()
      ctx.arc(420, 210, 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#00D294'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('HOGAR', 420, 180)

      // Camión Repartidor en Movimiento
      truckProgress = 0.35 + Math.sin(elapsed * 0.8) * 0.2
      const truckX = 60 + (420 - 60) * truckProgress
      const truckY = 520 - (520 - 210) * Math.sin(truckProgress * Math.PI * 0.5)

      // Halo de pulso del camión
      ctx.strokeStyle = 'rgba(0, 168, 120, 0.4)'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.arc(truckX, truckY, 28 + Math.sin(elapsed * 4) * 8, 0, Math.PI * 2)
      ctx.stroke()

      // Círculo del camión
      ctx.fillStyle = '#00A878'
      ctx.beginPath()
      ctx.arc(truckX, truckY, 22, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 15px sans-serif'
      ctx.fillText('GAS', truckX, truckY + 5)
      ctx.textAlign = 'left'

      // ─── Tarjeta Inferior de Estado ───
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 600, screenWidth, 424)
      ctx.strokeStyle = '#E2EDE7'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, 600)
      ctx.lineTo(screenWidth, 600)
      ctx.stroke()

      // Info del Balón
      ctx.fillStyle = '#0A1B14'
      ctx.font = 'bold 28px Inter, sans-serif'
      ctx.fillText('Balón Familiar 10 kg', 32, 650)

      ctx.fillStyle = '#007A57'
      ctx.font = 'bold 20px "JetBrains Mono", monospace'
      ctx.fillText('Llegada estimada: ~6 min', 32, 686)

      ctx.fillStyle = '#004D36'
      ctx.beginPath()
      ctx.roundRect(screenWidth - 160, 624, 128, 42, 8)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 22px Inter, sans-serif'
      ctx.fillText('S/ 48.00', screenWidth - 146, 654)

      // Tarjeta del Chofer
      ctx.fillStyle = '#F6FAF8'
      ctx.beginPath()
      ctx.roundRect(32, 715, screenWidth - 64, 110, 14)
      ctx.fill()
      ctx.strokeStyle = '#D6E4DC'
      ctx.stroke()

      // Avatar del Chofer
      ctx.fillStyle = '#00A878'
      ctx.beginPath()
      ctx.arc(80, 770, 26, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 20px sans-serif'
      ctx.fillText('CM', 65, 777)

      // Nombre y Placa
      ctx.fillStyle = '#0A1B14'
      ctx.font = 'bold 22px Inter, sans-serif'
      ctx.fillText('Carlos Mendoza (Chofer)', 125, 760)

      ctx.fillStyle = '#5D786D'
      ctx.font = '17px Inter, sans-serif'
      ctx.fillText('Unidad #08 · Flota Puno Central', 125, 790)

      // Taras y Certificaciones
      ctx.fillStyle = '#E8F5EE'
      ctx.beginPath()
      ctx.roundRect(32, 845, (screenWidth - 80) / 2, 75, 10)
      ctx.fill()
      ctx.fillStyle = '#5D786D'
      ctx.font = 'bold 14px "JetBrains Mono", monospace'
      ctx.fillText('TARA CALIBRADA', 48, 875)
      ctx.fillStyle = '#004D36'
      ctx.font = 'bold 20px "JetBrains Mono", monospace'
      ctx.fillText('11.5 kg OK', 48, 905)

      ctx.fillStyle = '#E8F5EE'
      ctx.beginPath()
      ctx.roundRect(screenWidth / 2 + 8, 845, (screenWidth - 80) / 2, 75, 10)
      ctx.fill()
      ctx.fillStyle = '#5D786D'
      ctx.font = 'bold 14px "JetBrains Mono", monospace'
      ctx.fillText('SELLO HERMÉTICO', screenWidth / 2 + 24, 875)
      ctx.fillStyle = '#004D36'
      ctx.font = 'bold 20px "JetBrains Mono", monospace'
      ctx.fillText('QR AUDITADO', screenWidth / 2 + 24, 905)

      // Botón Inferior Contactar Repartidor
      ctx.fillStyle = '#00A878'
      ctx.beginPath()
      ctx.roundRect(32, 940, screenWidth - 64, 56, 12)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 20px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Coordinar con Repartidor en Ruta', screenWidth / 2, 975)
      ctx.textAlign = 'left'

      screenTexture.needsUpdate = true
    }

    // ─── 5. Geometría y Materiales del Teléfono 3D ───
    const phoneGroup = new THREE.Group()
    scene.add(phoneGroup)

    const phoneWidth = 2.4
    const phoneHeight = 4.8
    const phoneDepth = 0.22
    const cornerRadius = 0.32

    // Chasis con esquinas redondeadas
    const shape = new THREE.Shape()
    const x = -phoneWidth / 2
    const y = -phoneHeight / 2
    const w = phoneWidth
    const h = phoneHeight
    const r = cornerRadius

    shape.moveTo(x + r, y)
    shape.lineTo(x + w - r, y)
    shape.quadraticCurveTo(x + w, y, x + w, y + r)
    shape.lineTo(x + w, y + h - r)
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    shape.lineTo(x + r, y + h)
    shape.quadraticCurveTo(x, y + h, x, y + h - r)
    shape.lineTo(x, y + r)
    shape.quadraticCurveTo(x, y, x + r, y)

    const extrudeSettings = {
      depth: phoneDepth,
      bevelEnabled: true,
      bevelSegments: 6,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    }

    const chassisGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    chassisGeometry.center()

    const titaniumMaterial = new THREE.MeshStandardMaterial({
      color: 0x1A211D,
      metalness: 0.88,
      roughness: 0.24,
    })

    const phoneChassis = new THREE.Mesh(chassisGeometry, titaniumMaterial)
    phoneGroup.add(phoneChassis)

    // Pantalla Frontal
    const screenGeo = new THREE.PlaneGeometry(phoneWidth - 0.14, phoneHeight - 0.14)
    const screenMat = new THREE.MeshBasicMaterial({
      map: screenTexture,
      toneMapped: false,
    })
    const phoneScreen = new THREE.Mesh(screenGeo, screenMat)
    phoneScreen.position.z = phoneDepth / 2 + 0.042
    phoneGroup.add(phoneScreen)

    // Módulo de Cámara en la parte trasera
    const cameraBumpGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.06, 32)
    const cameraBumpMat = new THREE.MeshStandardMaterial({
      color: 0x111613,
      metalness: 0.9,
      roughness: 0.2,
    })
    const cameraBump = new THREE.Mesh(cameraBumpGeo, cameraBumpMat)
    cameraBump.rotation.x = Math.PI / 2
    cameraBump.position.set(-phoneWidth / 4, phoneHeight / 3.4, -phoneDepth / 2 - 0.05)
    phoneGroup.add(cameraBump)

    // Lentes de cámara
    const lensGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 24)
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x0A0D0B,
      metalness: 0.95,
      roughness: 0.1,
    })
    const lens1 = new THREE.Mesh(lensGeo, lensMat)
    lens1.rotation.x = Math.PI / 2
    lens1.position.set(-phoneWidth / 4 - 0.12, phoneHeight / 3.4 + 0.12, -phoneDepth / 2 - 0.08)
    phoneGroup.add(lens1)

    const lens2 = new THREE.Mesh(lensGeo, lensMat)
    lens2.rotation.x = Math.PI / 2
    lens2.position.set(-phoneWidth / 4 + 0.12, phoneHeight / 3.4 - 0.12, -phoneDepth / 2 - 0.08)
    phoneGroup.add(lens2)

    // Inclinación inicial isométrica atractiva
    phoneGroup.rotation.y = -0.22
    phoneGroup.rotation.x = 0.12
    phoneGroup.rotation.z = -0.04

    // ─── 6. Interacción Suave con el Mouse / Touch ───
    let mouseX = 0
    let mouseY = 0
    let isDragging = false
    let previousPointer = { x: 0, y: 0 }
    let extraRotationY = 0
    let extraRotationX = 0

    const onPointerMove = (e) => {
      const rect = el.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      mouseX = x
      mouseY = y

      if (isDragging) {
        const deltaX = e.clientX - previousPointer.x
        const deltaY = e.clientY - previousPointer.y
        extraRotationY += deltaX * 0.012
        extraRotationX += deltaY * 0.008
        previousPointer = { x: e.clientX, y: e.clientY }
      }
    }

    const onPointerDown = (e) => {
      isDragging = true
      previousPointer = { x: e.clientX, y: e.clientY }
      el.style.cursor = 'grabbing'
    }

    const onPointerUp = () => {
      isDragging = false
      el.style.cursor = 'grab'
    }

    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)

    // ─── 7. Bucle de Animación con THREE.Timer ───
    let frameId
    const timer = new THREE.Timer()

    const animate = (timestamp) => {
      frameId = requestAnimationFrame(animate)
      timer.update(timestamp)
      const elapsed = timer.getElapsed()

      // Actualizar pantalla interactiva con el camión en movimiento
      drawAppScreen(elapsed)

      // Movimiento 3D flotante y respuesta al cursor
      if (!isDragging) {
        phoneGroup.position.y = Math.sin(elapsed * 1.6) * 0.08
        phoneGroup.rotation.y += (-0.22 + mouseX * 0.35 + extraRotationY - phoneGroup.rotation.y) * 0.06
        phoneGroup.rotation.x += (0.12 - mouseY * 0.25 + extraRotationX - phoneGroup.rotation.x) * 0.06
        extraRotationY *= 0.96
        extraRotationX *= 0.96
      } else {
        phoneGroup.rotation.y = extraRotationY
        phoneGroup.rotation.x = extraRotationX
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
        height: '520px',
        position: 'relative',
        cursor: 'grab',
        touchAction: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title="Teléfono 3D SYSGAS — Arrastra para girar en 3D"
    />
  )
}

