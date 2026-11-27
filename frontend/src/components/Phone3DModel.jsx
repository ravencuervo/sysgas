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
    camera.position.set(0, 0, 8.9)

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

    // ─── 4. Canvas Dinámico con Capturas Reales de la App SYSGAS ───
    const screenWidth = 512
    const screenHeight = 1024
    const screenCanvas = document.createElement('canvas')
    screenCanvas.width = screenWidth
    screenCanvas.height = screenHeight
    const ctx = screenCanvas.getContext('2d')
    const screenTexture = new THREE.CanvasTexture(screenCanvas)
    screenTexture.colorSpace = THREE.SRGBColorSpace
    screenTexture.generateMipmaps = true
    screenTexture.minFilter = THREE.LinearMipmapLinearFilter

    const screenSources = [
      '/images/app/screen-1-login.jpg',
      '/images/app/screen-2-home.jpg',
      '/images/app/screen-3-tracking.jpg',
      '/images/app/screen-4-scanner.jpg',
      '/images/app/screen-5-profile.jpg',
    ]
    const screenImages = screenSources.map((src) => {
      const img = new Image()
      img.src = src
      return img
    })

    const drawCoverImage = (img, offsetX = 0, alpha = 1) => {
      if (!img.complete || img.naturalWidth === 0) return
      ctx.save()
      ctx.globalAlpha = alpha
      const imgRatio = img.naturalWidth / img.naturalHeight
      const boxRatio = screenWidth / screenHeight
      let drawW = screenWidth
      let drawH = screenHeight
      let drawX = offsetX
      let drawY = 0
      if (imgRatio > boxRatio) {
        drawW = screenHeight * imgRatio
        drawX = offsetX + (screenWidth - drawW) / 2
      } else {
        drawH = screenWidth / imgRatio
        drawY = (screenHeight - drawH) / 2
      }
      ctx.drawImage(img, drawX, drawY, drawW, drawH)
      ctx.restore()
    }

    const slideDuration = 5.0
    const transitionDuration = 0.7

    const drawAppScreen = (elapsed) => {
      ctx.clearRect(0, 0, screenWidth, screenHeight)
      ctx.fillStyle = '#062118'
      ctx.fillRect(0, 0, screenWidth, screenHeight)

      const total = screenImages.length
      const cyclePos = elapsed / slideDuration
      const currentIdx = Math.floor(cyclePos) % total
      const nextIdx = (currentIdx + 1) % total
      const slideTime = (cyclePos - Math.floor(cyclePos)) * slideDuration

      if (slideTime > slideDuration - transitionDuration) {
        const rawT = (slideTime - (slideDuration - transitionDuration)) / transitionDuration
        const ease = 0.5 - 0.5 * Math.cos(Math.PI * rawT)
        drawCoverImage(screenImages[nextIdx], 0, 1)
        drawCoverImage(screenImages[currentIdx], 0, 1 - ease)
      } else {
        drawCoverImage(screenImages[currentIdx], 0, 1)
      }

      // Dynamic Island superior sutil
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.roundRect(screenWidth / 2 - 72, 16, 144, 34, 17)
      ctx.fill()

      // Indicadores discretos de pantalla activa
      const activeDot = slideTime > slideDuration - transitionDuration ? nextIdx : currentIdx
      const dotGap = 18
      const startX = screenWidth / 2 - ((total - 1) * dotGap) / 2
      for (let i = 0; i < total; i++) {
        ctx.fillStyle = i === activeDot ? '#00A878' : 'rgba(255, 255, 255, 0.45)'
        ctx.beginPath()
        ctx.arc(startX + i * dotGap, screenHeight - 26, i === activeDot ? 5 : 3.5, 0, Math.PI * 2)
        ctx.fill()
      }

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

