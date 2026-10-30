import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Modelo 3D de Cilindro SYSGAS para el Catálogo
 * Adaptado con dimensiones reales según capacidad: 5kg, 10kg y 45kg.
 * Conserva la alta fidelidad visual del hero (azul GLP uniforme, perno dorado, calcomanía SYSGAS).
 */
export default function CatalogCylinder3D({ capacity = '10 kg' }) {
  const mountRef = useRef(null)

  useEffect(() => {
    if (!mountRef.current) return
    const el = mountRef.current
    let width = el.clientWidth || 320
    let height = el.clientHeight || 240

    // ─── 1. Escena y Cámara Adaptada por Capacidad ───
    const scene = new THREE.Scene()

    // Configuración de cámara y encuadre según la altura del cilindro
    let fov = 30
    let camZ = 5.6
    let camY = 0.15
    let lookAtY = 0.15

    const normCapacity = capacity.toLowerCase().trim()
    const is45Kg = normCapacity.includes('45')
    const is5Kg = !is45Kg && (normCapacity.includes('5kg') || normCapacity.startsWith('5') || normCapacity.includes('5 kg'))

    if (is45Kg) {
      camZ = 7.5
      camY = 0.38
      lookAtY = 0.38
    } else if (is5Kg) {
      camZ = 4.4
      camY = 0.05
      lookAtY = 0.05
    }

    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 50)
    camera.position.set(0, camY, camZ)
    camera.lookAt(0, lookAtY, 0)

    if (width / height < 1) {
      camera.fov = fov / (width / height)
      camera.updateProjectionMatrix()
    }

    // ─── 2. Renderer WebGL Optimizado ───
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.18
    el.appendChild(renderer.domElement)

    // ─── 3. Materiales Oficiales SYSGAS ───
    const UNIFORM_BLUE_HEX = 0x0066A2 // Azul gas oficial
    const uniformBlueMaterial = new THREE.MeshStandardMaterial({
      color: UNIFORM_BLUE_HEX,
      roughness: 0.32,
      metalness: 0.20,
      side: THREE.DoubleSide,
    })

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

    // Decal de Texto SYSGAS
    const decalTextureLoader = new THREE.TextureLoader()
    const decalTexture = decalTextureLoader.load('/images/logos/sysgas_decal_text.png')
    decalTexture.colorSpace = THREE.SRGBColorSpace

    const decalMaterial = new THREE.MeshBasicMaterial({
      map: decalTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    })

    // ─── 4. Construcción de Geometría según Medidas Reales ───
    const cylinderGroup = new THREE.Group()

    if (is5Kg) {
      // ═══════════════════════════════════════════════════════════════
      // 4.A CILINDRO 5 KG (PORTÁTIL / CAMPING / COMPACTO)
      // Dimensiones: Altura ~38 cm, Diámetro ~23 cm
      // Proporción: Bajo, rechoncho, asa superior ergonómica
      // ═══════════════════════════════════════════════════════════════
      const bodyRadius = 0.76
      const baseCenterY = -0.65
      const lowerDomeEndY = -0.32
      const barrelEndY = 0.12
      const upperDomeEndY = 0.58
      const neckY = 0.62

      const profilePoints = [
        new THREE.Vector2(0.001, baseCenterY),
      ]
      for (let i = 1; i <= 10; i++) {
        const t = i / 10
        const angle = (t * Math.PI) / 2
        const x = bodyRadius * Math.sin(angle)
        const y = baseCenterY + (Math.abs(baseCenterY) - Math.abs(lowerDomeEndY)) * (1 - Math.cos(angle))
        profilePoints.push(new THREE.Vector2(x, y))
      }
      profilePoints.push(new THREE.Vector2(bodyRadius, barrelEndY))
      for (let i = 0; i <= 10; i++) {
        const t = i / 10
        const angle = (t * Math.PI) / 2
        const x = bodyRadius - (bodyRadius - 0.14) * (1 - Math.cos(angle))
        const y = barrelEndY + (upperDomeEndY - barrelEndY) * Math.sin(angle)
        profilePoints.push(new THREE.Vector2(x, y))
      }
      profilePoints.push(new THREE.Vector2(0.14, neckY))
      profilePoints.push(new THREE.Vector2(0.001, neckY))

      const tankMesh = new THREE.Mesh(new THREE.LatheGeometry(profilePoints, 48), uniformBlueMaterial)
      cylinderGroup.add(tankMesh)

      // Cordón de soldadura
      const weldMesh = new THREE.Mesh(new THREE.TorusGeometry(bodyRadius + 0.006, 0.010, 14, 48), uniformBlueMaterial)
      weldMesh.rotation.x = Math.PI / 2
      weldMesh.position.y = -0.10
      cylinderGroup.add(weldMesh)

      // Aro de pie base
      const footRingMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.60, 0.16, 36, 1, true), uniformBlueMaterial)
      footRingMesh.position.y = -0.63
      cylinderGroup.add(footRingMesh)

      const footRimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.60, 0.018, 14, 36), uniformBlueMaterial)
      footRimMesh.rotation.x = Math.PI / 2
      footRimMesh.position.y = -0.71
      cylinderGroup.add(footRimMesh)

      // Orificios base
      const holeGeo = new THREE.CircleGeometry(0.030, 14)
      ;[Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75].forEach((angle) => {
        const hole = new THREE.Mesh(holeGeo, darkHoleMaterial)
        hole.position.set(Math.cos(angle) * 0.602, -0.63, Math.sin(angle) * 0.602)
        hole.rotation.y = -angle + Math.PI / 2
        cylinderGroup.add(hole)
      })

      // Collarín compacto con asa superior
      const collarMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.50, 0.51, 0.44, 36, 1, true, -Math.PI * 0.8, Math.PI * 1.6),
        uniformBlueMaterial
      )
      collarMesh.position.y = 0.74
      cylinderGroup.add(collarMesh)

      const collarRimMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.50, 0.026, 14, 36, Math.PI * 1.6),
        uniformBlueMaterial
      )
      collarRimMesh.rotation.x = Math.PI / 2
      collarRimMesh.rotation.z = Math.PI * 0.8
      collarRimMesh.position.y = 0.96
      cylinderGroup.add(collarRimMesh)

      // Asa ergonómica lateral izquierda y derecha
      const handleGeo = new THREE.TorusGeometry(0.10, 0.022, 10, 20)
      const leftH = new THREE.Mesh(handleGeo, uniformBlueMaterial)
      leftH.position.set(-0.505, 0.78, 0)
      leftH.rotation.y = Math.PI / 2
      cylinderGroup.add(leftH)

      const rightH = new THREE.Mesh(handleGeo, uniformBlueMaterial)
      rightH.position.set(0.505, 0.78, 0)
      rightH.rotation.y = Math.PI / 2
      cylinderGroup.add(rightH)

      // Válvula 5kg
      const valveGroup = new THREE.Group()
      valveGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.11, 16), goldBoltMaterial))
      const boltStem = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.26, 14), goldBoltMaterial)
      boltStem.position.y = 0.14
      valveGroup.add(boltStem)
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 14), goldBoltMaterial)
      nozzle.rotation.z = Math.PI / 2
      nozzle.rotation.y = Math.PI * 0.15
      nozzle.position.set(0.08, 0.16, 0.02)
      valveGroup.add(nozzle)
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 14), valveRedMaterial)
      cap.position.y = 0.28
      valveGroup.add(cap)
      valveGroup.position.y = 0.62
      cylinderGroup.add(valveGroup)

      // Decal SYSGAS para 5kg
      const decalMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyRadius + 0.003, bodyRadius + 0.003, 0.26, 28, 1, true, Math.PI - 1.44 / 2, 1.44),
        decalMaterial
      )
      decalMesh.position.y = -0.06
      cylinderGroup.add(decalMesh)

    } else if (is45Kg) {
      // ═══════════════════════════════════════════════════════════════
      // 4.B CILINDRO 45 KG (INDUSTRIAL / COMERCIAL / ALTA DEMANDA)
      // Dimensiones reales: Altura ~132 cm, Diámetro ~38 cm (Ratio ~3.5:1)
      // Proporción: Muy alargado, esbelto y alto (columna industrial),
      // con doble cordón de soldadura, collarín pesado y base de alta carga
      // ═══════════════════════════════════════════════════════════════
      const bodyRadius = 1.02
      const baseCenterY = -3.05
      const lowerDomeEndY = -2.60
      const barrelEndY = 2.60
      const upperDomeEndY = 3.25
      const neckY = 3.32

      const profilePoints = [
        new THREE.Vector2(0.001, baseCenterY),
      ]
      for (let i = 1; i <= 12; i++) {
        const t = i / 12
        const angle = (t * Math.PI) / 2
        const x = bodyRadius * Math.sin(angle)
        const y = baseCenterY + (Math.abs(baseCenterY) - Math.abs(lowerDomeEndY)) * (1 - Math.cos(angle))
        profilePoints.push(new THREE.Vector2(x, y))
      }
      profilePoints.push(new THREE.Vector2(bodyRadius, barrelEndY))
      for (let i = 0; i <= 12; i++) {
        const t = i / 12
        const angle = (t * Math.PI) / 2
        const x = bodyRadius - (bodyRadius - 0.20) * (1 - Math.cos(angle))
        const y = barrelEndY + (upperDomeEndY - barrelEndY) * Math.sin(angle)
        profilePoints.push(new THREE.Vector2(x, y))
      }
      profilePoints.push(new THREE.Vector2(0.20, neckY))
      profilePoints.push(new THREE.Vector2(0.001, neckY))

      const tankMesh = new THREE.Mesh(new THREE.LatheGeometry(profilePoints, 56), uniformBlueMaterial)
      cylinderGroup.add(tankMesh)

      // Doble cordón de soldadura industrial en el cuerpo alargado (tercio inferior y superior)
      const weld1 = new THREE.Mesh(new THREE.TorusGeometry(bodyRadius + 0.008, 0.013, 14, 56), uniformBlueMaterial)
      weld1.rotation.x = Math.PI / 2
      weld1.position.y = -1.30
      cylinderGroup.add(weld1)

      const weld2 = new THREE.Mesh(new THREE.TorusGeometry(bodyRadius + 0.008, 0.013, 14, 56), uniformBlueMaterial)
      weld2.rotation.x = Math.PI / 2
      weld2.position.y = 1.30
      cylinderGroup.add(weld2)

      // Base de apoyo pesada y reforzada
      const footRingMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.86, 0.44, 40, 1, true), uniformBlueMaterial)
      footRingMesh.position.y = -3.00
      cylinderGroup.add(footRingMesh)

      const footRimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.035, 14, 40), uniformBlueMaterial)
      footRimMesh.rotation.x = Math.PI / 2
      footRimMesh.position.y = -3.20
      cylinderGroup.add(footRimMesh)

      // Ranuras de ventilación base
      const holeGeo = new THREE.CircleGeometry(0.052, 16)
      ;[Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75].forEach((angle) => {
        const hole = new THREE.Mesh(holeGeo, darkHoleMaterial)
        hole.position.set(Math.cos(angle) * 0.862, -3.00, Math.sin(angle) * 0.862)
        hole.rotation.y = -angle + Math.PI / 2
        cylinderGroup.add(hole)
      })

      // Collarín protector industrial superior reforzado
      const collarMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.64, 0.66, 0.76, 40, 1, true, -Math.PI * 0.78, Math.PI * 1.56),
        uniformBlueMaterial
      )
      collarMesh.position.y = 3.55
      cylinderGroup.add(collarMesh)

      const collarRimMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.64, 0.040, 16, 40, Math.PI * 1.56),
        uniformBlueMaterial
      )
      collarRimMesh.rotation.x = Math.PI / 2
      collarRimMesh.rotation.z = Math.PI * 0.78
      collarRimMesh.position.y = 3.95
      cylinderGroup.add(collarRimMesh)

      // Asas industriales robustas
      const handleGeo = new THREE.TorusGeometry(0.15, 0.032, 12, 24)
      const leftH = new THREE.Mesh(handleGeo, uniformBlueMaterial)
      leftH.position.set(-0.65, 3.58, 0)
      leftH.rotation.y = Math.PI / 2
      cylinderGroup.add(leftH)

      const rightH = new THREE.Mesh(handleGeo, uniformBlueMaterial)
      rightH.position.set(0.65, 3.58, 0)
      rightH.rotation.y = Math.PI / 2
      cylinderGroup.add(rightH)

      // Válvula industrial pesada con volante
      const valveGroup = new THREE.Group()
      valveGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.15, 20), goldBoltMaterial))
      const boltStem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.38, 16), goldBoltMaterial)
      boltStem.position.y = 0.20
      valveGroup.add(boltStem)
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 16), goldBoltMaterial)
      nozzle.rotation.z = Math.PI / 2
      nozzle.rotation.y = Math.PI * 0.15
      nozzle.position.set(0.11, 0.22, 0.04)
      valveGroup.add(nozzle)
      const wheelCap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.09, 18), valveRedMaterial)
      wheelCap.position.y = 0.44
      valveGroup.add(wheelCap)
      valveGroup.position.y = 3.32
      cylinderGroup.add(valveGroup)

      // Decal SYSGAS 45kg en sector superior del barril
      const decalMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyRadius + 0.004, bodyRadius + 0.004, 0.54, 32, 1, true, Math.PI - 1.44 / 2, 1.44),
        decalMaterial
      )
      decalMesh.position.y = 1.40
      cylinderGroup.add(decalMesh)

    } else {
      // ═══════════════════════════════════════════════════════════════
      // 4.C CILINDRO 10 KG (FAMILIAR DOMÉSTICO ESTÁNDAR)
      // Dimensiones: Altura ~62 cm, Diámetro ~30 cm
      // Proporción clásica exacta del Hero de SYSGAS
      // ═══════════════════════════════════════════════════════════════
      const baseCenterY = -0.94
      const barrelEndY = 0.52
      const upperDomeEndY = 1.16
      const neckY = 1.20

      const profilePoints = [
        new THREE.Vector2(0.001, baseCenterY),
      ]
      for (let i = 1; i <= 12; i++) {
        const t = i / 12
        const angle = (t * Math.PI) / 2
        const x = Math.sin(angle)
        const y = baseCenterY + (0.94 - 0.52) * (1 - Math.cos(angle))
        profilePoints.push(new THREE.Vector2(x, y))
      }
      profilePoints.push(new THREE.Vector2(1.0, 0.0))
      profilePoints.push(new THREE.Vector2(1.0, barrelEndY))
      for (let i = 0; i <= 12; i++) {
        const t = i / 12
        const angle = (t * Math.PI) / 2
        const x = 1.0 - (1.0 - 0.18) * (1 - Math.cos(angle))
        const y = barrelEndY + (upperDomeEndY - barrelEndY) * Math.sin(angle)
        profilePoints.push(new THREE.Vector2(x, y))
      }
      profilePoints.push(new THREE.Vector2(0.18, neckY))
      profilePoints.push(new THREE.Vector2(0.001, neckY))

      const tankMesh = new THREE.Mesh(new THREE.LatheGeometry(profilePoints, 56), uniformBlueMaterial)
      cylinderGroup.add(tankMesh)

      // Cordón de soldadura circunferencial central
      const weldMesh = new THREE.Mesh(new THREE.TorusGeometry(1.008, 0.012, 16, 56), uniformBlueMaterial)
      weldMesh.rotation.x = Math.PI / 2
      weldMesh.position.y = 0.0
      cylinderGroup.add(weldMesh)

      // Base soporte inferior
      const footRingMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.80, 0.22, 40, 1, true), uniformBlueMaterial)
      footRingMesh.position.y = -0.92
      cylinderGroup.add(footRingMesh)

      const footRimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.80, 0.024, 16, 40), uniformBlueMaterial)
      footRimMesh.rotation.x = Math.PI / 2
      footRimMesh.position.y = -1.03
      cylinderGroup.add(footRimMesh)

      // Orificios ventilación base
      const holeGeo = new THREE.CircleGeometry(0.038, 16)
      ;[Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75].forEach((angle) => {
        const hole = new THREE.Mesh(holeGeo, darkHoleMaterial)
        hole.position.set(Math.cos(angle) * 0.802, -0.93, Math.sin(angle) * 0.802)
        hole.rotation.y = -angle + Math.PI / 2
        cylinderGroup.add(hole)
      })

      // Collarín protector superior estándar
      const collarOpenAngle = Math.PI * 0.44
      const collarSolidAngle = Math.PI * 2 - collarOpenAngle
      const thetaStart = collarOpenAngle / 2 - Math.PI

      const collarMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.64, 0.655, 0.64, 44, 1, true, thetaStart, collarSolidAngle),
        uniformBlueMaterial
      )
      collarMesh.position.y = 1.36
      cylinderGroup.add(collarMesh)

      const collarRimMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.64, 0.038, 16, 44, collarSolidAngle),
        uniformBlueMaterial
      )
      collarRimMesh.rotation.x = Math.PI / 2
      collarRimMesh.rotation.z = -thetaStart
      collarRimMesh.position.y = 1.68
      cylinderGroup.add(collarRimMesh)

      // Asas laterales
      const handleGeo = new THREE.TorusGeometry(0.13, 0.026, 12, 24)
      const leftH = new THREE.Mesh(handleGeo, uniformBlueMaterial)
      leftH.position.set(-0.645, 1.40, 0)
      leftH.rotation.y = Math.PI / 2
      cylinderGroup.add(leftH)

      const rightH = new THREE.Mesh(handleGeo, uniformBlueMaterial)
      rightH.position.set(0.645, 1.40, 0)
      rightH.rotation.y = Math.PI / 2
      cylinderGroup.add(rightH)

      // Válvula dorada con perno y tapa roja
      const valveGroup = new THREE.Group()
      valveGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.14, 20), goldBoltMaterial))
      const boltStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.34, 16), goldBoltMaterial)
      boltStem.position.y = 0.18
      valveGroup.add(boltStem)
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.20, 16), goldBoltMaterial)
      nozzle.rotation.z = Math.PI / 2
      nozzle.rotation.y = Math.PI * 0.15
      nozzle.position.set(0.10, 0.22, 0.03)
      valveGroup.add(nozzle)
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16), valveRedMaterial)
      cap.position.y = 0.38
      valveGroup.add(cap)
      valveGroup.position.y = 1.20
      cylinderGroup.add(valveGroup)

      // Decal SYSGAS para 10kg
      const decalMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.004, 1.004, 0.36, 32, 1, true, Math.PI - 1.44 / 2, 1.44),
        decalMaterial
      )
      decalMesh.position.y = 0.22
      cylinderGroup.add(decalMesh)
    }

    // Orientar SYSGAS y apertura frontal hacia la cámara
    cylinderGroup.rotation.y = Math.PI

    // ─── 5. Escala y Nodo Raíz ───
    const modelRoot = new THREE.Group()
    modelRoot.add(cylinderGroup)
    scene.add(modelRoot)

    // Ajuste fino de escala proporcional según capacidad
    if (is45Kg) {
      modelRoot.scale.setScalar(0.48)
    } else if (is5Kg) {
      modelRoot.scale.setScalar(0.92)
    } else {
      modelRoot.scale.setScalar(0.74)
    }

    // ─── 6. Iluminación Técnica de Estudio ───
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.35)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.6)
    keyLight.position.set(4, 7, 5)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x70C5F5, 0.6)
    fillLight.position.set(-4, 3, 4)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0x00FFD1, 0.35)
    rimLight.position.set(0, -3, -4)
    scene.add(rimLight)

    // ─── 7. Interacción de Rotación 360° con Inercia ───
    let mouseX = 0
    let mouseY = 0
    let isDragging = false
    let previousPointerPosition = { x: 0, y: 0 }
    let rotationVelocityY = 0.003
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
        rotationVelocityY = deltaX * 0.010
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

    // ─── 8. IntersectionObserver para Optimizar Rendimiento ───
    let isVisible = true
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
    }, { threshold: 0.1 })
    observer.observe(el)

    // ─── 9. Bucle de Renderizado Suave ───
    let frameId
    const timer = new THREE.Timer()

    const animate = (timestamp) => {
      frameId = requestAnimationFrame(animate)
      if (!isVisible) return

      timer.update(timestamp)
      const elapsed = timer.getElapsed()

      if (!isDragging) {
        cylinderGroup.rotation.y += rotationVelocityY
        rotationVelocityY *= 0.95
        if (Math.abs(rotationVelocityY) < 0.0022) {
          rotationVelocityY = 0.0022 // Auto-rotación sutil permanente
        }

        // Leve amortiguación reactiva
        cylinderGroup.rotation.x += (mouseY * 0.05 - cylinderGroup.rotation.x) * 0.04
        cylinderGroup.rotation.z += (-mouseX * 0.03 - cylinderGroup.rotation.z) * 0.04
        modelRoot.position.y = Math.sin(elapsed * 1.5) * 0.024
      } else {
        modelRoot.position.y = 0
      }

      renderer.render(scene, camera)
    }
    animate()

    // ─── 10. Manejo de Resize ───
    const handleResize = () => {
      if (!mountRef.current) return
      width = mountRef.current.clientWidth
      height = mountRef.current.clientHeight
      const aspect = width / height
      camera.aspect = aspect
      if (aspect < 1) {
        camera.fov = fov / aspect
      } else {
        camera.fov = fov
      }
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      window.removeEventListener('resize', handleResize)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      renderer.dispose()
      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement)
      }
    }
  }, [capacity])

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
      title={`Cilindro SYSGAS ${capacity} 3D — Arrastra con el cursor para rotar en 360°`}
    />
  )
}

