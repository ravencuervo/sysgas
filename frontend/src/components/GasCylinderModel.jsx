import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function GasCylinderModel() {
  const mountRef = useRef(null)

  useEffect(() => {
    if (!mountRef.current) return
    const el = mountRef.current
    let width = el.clientWidth || 440
    let height = el.clientHeight || 420

    // ─── 1. Escena y Cámara ───
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100)
    camera.position.set(0, 0.08, 6.2)

    if (width / height < 1) {
      camera.fov = 30 / (width / height)
      camera.updateProjectionMatrix()
    }

    // ─── 2. Renderer con Antialias y Fondo 100% Transparente ───
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

    // ─── 3. Material Único Azul Uniforme para TODO el Balón ───
    // Color azul gas industrial exacto (#0066A2)
    const UNIFORM_BLUE_HEX = 0x0066A2
    const uniformBlueMaterial = new THREE.MeshStandardMaterial({
      color: UNIFORM_BLUE_HEX,
      roughness: 0.32,
      metalness: 0.20,
      side: THREE.DoubleSide,
    })

    // Material dorado / latón de alto brillo para el perno y la válvula
    const goldBoltMaterial = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      roughness: 0.15,
      metalness: 0.92,
    })

    const valveRedMaterial = new THREE.MeshStandardMaterial({
      color: 0xD63031,
      roughness: 0.35,
      metalness: 0.2,
    })

    const darkHoleMaterial = new THREE.MeshBasicMaterial({
      color: 0x001B2E,
    })

    // ─── 4. Geometría Completa y Cerrada del Balón (Sin huecos en la base) ───
    const cylinderGroup = new THREE.Group()

    // 4.1 Tanque de Presión Sellado (LatheGeometry cerrado desde x=0 abajo hasta x=0 arriba)
    const profilePoints = []

    // 4.1.1 Centro inferior cerrado (y = -0.94)
    profilePoints.push(new THREE.Vector2(0.001, -0.94))

    // 4.1.2 Cúpula inferior convexa continua y sellada
    for (let i = 1; i <= 12; i++) {
      const t = i / 12
      const angle = (t * Math.PI) / 2
      const x = Math.sin(angle) // 0 -> 1.0
      const y = -0.94 + (0.94 - 0.52) * (1 - Math.cos(angle)) // -0.94 -> -0.52
      profilePoints.push(new THREE.Vector2(x, y))
    }

    // 4.1.3 Cilindro central (Barril de gas, radio 1.0)
    profilePoints.push(new THREE.Vector2(1.0, 0.0))
    profilePoints.push(new THREE.Vector2(1.0, 0.52))

    // 4.1.4 Cúpula superior (Hombro convexo)
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      const angle = (t * Math.PI) / 2
      const x = 1.0 - (1.0 - 0.18) * (1 - Math.cos(angle))
      const y = 0.52 + (1.16 - 0.52) * Math.sin(angle)
      profilePoints.push(new THREE.Vector2(x, y))
    }

    // 4.1.5 Cuello roscado superior cerrado
    profilePoints.push(new THREE.Vector2(0.18, 1.20))
    profilePoints.push(new THREE.Vector2(0.001, 1.20))

    const tankGeo = new THREE.LatheGeometry(profilePoints, 64)
    const tankMesh = new THREE.Mesh(tankGeo, uniformBlueMaterial)
    cylinderGroup.add(tankMesh)

    // 4.2 Cordón de soldadura circunferencial central
    const weldBeadGeo = new THREE.TorusGeometry(1.008, 0.012, 16, 64)
    const weldBeadMesh = new THREE.Mesh(weldBeadGeo, uniformBlueMaterial)
    weldBeadMesh.rotation.x = Math.PI / 2
    weldBeadMesh.position.y = 0.0
    cylinderGroup.add(weldBeadMesh)

    // 4.3 Base de Soporte Inferior Corta y Proporcionada (Aro de pie bajo como en la referencia)
    const footRingHeight = 0.22
    const footRingGeo = new THREE.CylinderGeometry(0.78, 0.80, footRingHeight, 48, 1, true)
    const footRingMesh = new THREE.Mesh(footRingGeo, uniformBlueMaterial)
    footRingMesh.position.y = -0.92
    cylinderGroup.add(footRingMesh)

    // Borde inferior curvado del pie de apoyo
    const footRimGeo = new THREE.TorusGeometry(0.80, 0.024, 16, 48)
    const footRimMesh = new THREE.Mesh(footRimGeo, uniformBlueMaterial)
    footRimMesh.rotation.x = Math.PI / 2
    footRimMesh.position.y = -1.03
    cylinderGroup.add(footRimMesh)

    // 4 orificios circulares de ventilación en la base (proporcionales)
    const holeGeo = new THREE.CircleGeometry(0.038, 16)
    const holeAngles = [
      Math.PI * 0.25,
      Math.PI * 0.75,
      Math.PI * 1.25,
      Math.PI * 1.75,
    ]
    holeAngles.forEach((angle) => {
      const hole = new THREE.Mesh(holeGeo, darkHoleMaterial)
      const r = 0.802
      hole.position.set(Math.cos(angle) * r, -0.93, Math.sin(angle) * r)
      hole.rotation.y = -angle + Math.PI / 2
      cylinderGroup.add(hole)
    })

    // 4.4 Collarín Protector Superior Unido Directamente a la Cúpula (Sin separación)
    // El hombro superior a radio 0.65 está en y = 1.054.
    // El collarín inicia en y = 1.04 asentando directamente sobre el balón y sube hasta y = 1.68.
    const collarOpenAngle = Math.PI * 0.44 // Ventana abierta frontal de 80°
    const collarSolidAngle = Math.PI * 2 - collarOpenAngle
    const thetaStart = collarOpenAngle / 2 - Math.PI

    const collarGeo = new THREE.CylinderGeometry(
      0.64,
      0.655,
      0.64,
      48,
      1,
      true,
      thetaStart,
      collarSolidAngle
    )
    const collarMesh = new THREE.Mesh(collarGeo, uniformBlueMaterial)
    collarMesh.position.y = 1.36
    cylinderGroup.add(collarMesh)

    // Cordón de soldadura que une el collarín a la cúpula
    const collarWeldGeo = new THREE.TorusGeometry(
      0.655,
      0.016,
      12,
      48,
      collarSolidAngle
    )
    const collarWeldMesh = new THREE.Mesh(collarWeldGeo, uniformBlueMaterial)
    collarWeldMesh.rotation.x = Math.PI / 2
    collarWeldMesh.rotation.z = -thetaStart
    collarWeldMesh.position.y = 1.05
    cylinderGroup.add(collarWeldMesh)

    // Aro superior del collarín
    const collarRimGeo = new THREE.TorusGeometry(
      0.64,
      0.038,
      16,
      48,
      collarSolidAngle
    )
    const collarRimMesh = new THREE.Mesh(collarRimGeo, uniformBlueMaterial)
    collarRimMesh.rotation.x = Math.PI / 2
    collarRimMesh.rotation.z = -thetaStart
    collarRimMesh.position.y = 1.68
    cylinderGroup.add(collarRimMesh)

    // Asas laterales para agarre
    const handleGeo = new THREE.TorusGeometry(0.13, 0.026, 12, 24)
    const leftHandle = new THREE.Mesh(handleGeo, uniformBlueMaterial)
    leftHandle.position.set(-0.645, 1.40, 0)
    leftHandle.rotation.y = Math.PI / 2
    cylinderGroup.add(leftHandle)

    const rightHandle = new THREE.Mesh(handleGeo, uniformBlueMaterial)
    rightHandle.position.set(0.645, 1.40, 0)
    rightHandle.rotation.y = Math.PI / 2
    cylinderGroup.add(rightHandle)

    // 4.5 Perno Dorado y Válvula de Gas (Directamente visible por la apertura frontal)
    const valveGroup = new THREE.Group()

    // Adaptador de cuello dorado
    const neckAdapter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.14, 20),
      goldBoltMaterial
    )
    neckAdapter.position.y = 1.20
    valveGroup.add(neckAdapter)

    // Perno dorado principal
    const boltStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.34, 16),
      goldBoltMaterial
    )
    boltStem.position.y = 1.38
    valveGroup.add(boltStem)

    // Tuerca hexagonal dorada del perno
    const boltNut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.10, 0.08, 6),
      goldBoltMaterial
    )
    boltNut.position.y = 1.44
    valveGroup.add(boltNut)

    // Boquilla dorada de salida para regulador
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.20, 16),
      goldBoltMaterial
    )
    nozzle.rotation.z = Math.PI / 2
    nozzle.rotation.y = Math.PI * 0.15
    nozzle.position.set(0.10, 1.42, 0.03)
    valveGroup.add(nozzle)

    // Tapa roja superior de la válvula
    const valveCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16),
      valveRedMaterial
    )
    valveCap.position.y = 1.58
    valveGroup.add(valveCap)

    cylinderGroup.add(valveGroup)

    // ─── 5. Texto SYSGAS en Verde Jade Nítido y Proporcional (Decal Curvo) ───
    // Carga de la textura con fondo 100% transparente: no altera el color azul del balón
    // y mantiene las letras nítidas, legibles y sin distorsión vertical.
    const decalTextureLoader = new THREE.TextureLoader()
    const decalTexture = decalTextureLoader.load('/images/logos/sysgas_decal_text.png')
    decalTexture.colorSpace = THREE.SRGBColorSpace

    const decalMaterial = new THREE.MeshBasicMaterial({
      map: decalTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    })

    // Superficie cilíndrica curva a radio 1.004 (justo en la chapa del barril)
    const decalHeight = 0.36
    const decalArc = 1.44 // ~82° de curvatura que envuelve el frontal
    const decalThetaStart = Math.PI - decalArc / 2

    const decalGeo = new THREE.CylinderGeometry(
      1.004,
      1.004,
      decalHeight,
      32,
      1,
      true,
      decalThetaStart,
      decalArc
    )
    const decalMesh = new THREE.Mesh(decalGeo, decalMaterial)
    decalMesh.position.y = 0.22 // Centrado en el vientre del balón
    cylinderGroup.add(decalMesh)

    // Orientar de modo que SYSGAS en verde jade y la apertura con el perno dorado queden al frente
    cylinderGroup.rotation.y = Math.PI

    // ─── 6. Nodo Raíz y Escalado ───
    const modelRoot = new THREE.Group()
    modelRoot.add(cylinderGroup)
    modelRoot.scale.setScalar(0.76)
    scene.add(modelRoot)

    // ─── 7. Iluminación Natural y Cálida de Estudio ───
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.25)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.5)
    keyLight.position.set(4, 7, 5)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x70C5F5, 0.6)
    fillLight.position.set(-4, 3, 4)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0x00FFD1, 0.4)
    rimLight.position.set(0, -3, -4)
    scene.add(rimLight)

    // ─── 8. Interacción de Rotación 360° con Inercia e Interfaz Táctil ───
    let mouseX = 0
    let mouseY = 0
    let isDragging = false
    let previousPointerPosition = { x: 0, y: 0 }
    let rotationVelocityY = 0.003 // Auto-rotación suave constante
    let rotationVelocityX = 0

    const onPointerMove = (e) => {
      const rect = el.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      mouseX = x
      mouseY = y

      if (isDragging) {
        const deltaX = e.clientX - previousPointerPosition.x
        const deltaY = e.clientY - previousPointerPosition.y
        rotationVelocityY = deltaX * 0.009
        rotationVelocityX = deltaY * 0.006
        cylinderGroup.rotation.y += rotationVelocityY
        cylinderGroup.rotation.x += rotationVelocityX
        previousPointerPosition = { x: e.clientX, y: e.clientY }
      }
    }

    const onPointerDown = (e) => {
      isDragging = true
      previousPointerPosition = { x: e.clientX, y: e.clientY }
      el.style.cursor = 'grabbing'
    }

    const onPointerUp = () => {
      isDragging = false
      el.style.cursor = 'grab'
    }

    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)

    // ─── 9. Bucle de Animación con THREE.Timer ───
    let frameId
    const timer = new THREE.Timer()

    const animate = (timestamp) => {
      frameId = requestAnimationFrame(animate)
      timer.update(timestamp)
      const elapsed = timer.getElapsed()

      if (!isDragging) {
        // Amortiguación con inercia y auto-rotación orbital sutil
        cylinderGroup.rotation.y += rotationVelocityY
        rotationVelocityY *= 0.95
        if (Math.abs(rotationVelocityY) < 0.0025) {
          rotationVelocityY = 0.0025 // velocidad base suave para mantener dinamismo
        }

        // Leve oscilación vertical flotante de energía pura
        cylinderGroup.rotation.x += (mouseY * 0.08 - cylinderGroup.rotation.x) * 0.04
        cylinderGroup.rotation.z += (-mouseX * 0.04 - cylinderGroup.rotation.z) * 0.04
        modelRoot.position.y = Math.sin(elapsed * 1.5) * 0.032
      } else {
        modelRoot.position.y = 0
      }

      renderer.render(scene, camera)
    }
    animate()

    // ─── 10. Redimensionamiento Responsivo ───
    const handleResize = () => {
      if (!mountRef.current) return
      width = mountRef.current.clientWidth
      height = mountRef.current.clientHeight
      const aspect = width / height
      camera.aspect = aspect
      if (aspect < 1) {
        camera.fov = 30 / aspect
      } else {
        camera.fov = 30
      }
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
        height: '100%',
        position: 'relative',
        cursor: 'grab',
        touchAction: 'none',
        background: 'transparent',
      }}
      title="Balón SYSGAS 3D — Arrastra con el cursor para rotar en 360°"
    />
  )
}
