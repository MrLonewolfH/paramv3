import {
  AmbientLight, BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry,
  DirectionalLight, DoubleSide, Float32BufferAttribute, Group, HemisphereLight,
  MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, OrthographicCamera,
  PCFSoftShadowMap, PlaneGeometry, Scene, ShadowMaterial, SphereGeometry,
  SRGBColorSpace, TorusGeometry, Vector3, WebGLRenderer,
} from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export function createLearningScene(container, canvas, { onReady, onError }) {
  const styles = getComputedStyle(document.documentElement)
  const palette = {
    primary: new Color(styles.getPropertyValue('--primary').trim()),
    accent: new Color(styles.getPropertyValue('--accent').trim()),
    background: new Color(styles.getPropertyValue('--background').trim()),
    surface: new Color(styles.getPropertyValue('--surface').trim()),
    foreground: new Color(styles.getPropertyValue('--foreground').trim()),
  }
  const constrained = innerWidth < 768 || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 5) || (navigator.deviceMemory && navigator.deviceMemory < 5)
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: !constrained, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false })
  renderer.setClearColor(palette.background, 0)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.setPixelRatio(1)
  renderer.shadowMap.enabled = !constrained
  renderer.shadowMap.type = PCFSoftShadowMap
  renderer.shadowMap.autoUpdate = false
  const scene = new Scene()
  const camera = new OrthographicCamera(-4, 4, 4, -4, 0.1, 60)
  camera.position.set(6.5, 5.7, 9.8)
  camera.lookAt(0, 1.05, 0)
  const world = new Group()
  world.rotation.y = -0.23
  scene.add(world)

  const geometries = new Set()
  const materials = new Set()
  const textures = new Set()
  function geometry(value) { geometries.add(value); return value }
  function material(value) { materials.add(value); return value }
  function tint(color, amount) { return palette.surface.clone().lerp(color, amount) }
  const green = material(new MeshStandardMaterial({ color: palette.primary, roughness: 0.43, metalness: 0.06 }))
  const sage = material(new MeshStandardMaterial({ color: tint(palette.primary, 0.29), roughness: 0.72, metalness: 0 }))
  const mint = material(new MeshStandardMaterial({ color: tint(palette.primary, 0.13), roughness: 0.75 }))
  const warm = material(new MeshStandardMaterial({ color: palette.accent, roughness: 0.32, metalness: 0.04 }))
  const softOrange = material(new MeshStandardMaterial({ color: tint(palette.accent, 0.75), roughness: 0.62 }))
  const pageWhite = material(new MeshStandardMaterial({ color: palette.background, roughness: 0.95, side: DoubleSide }))
  const pageEdge = material(new MeshStandardMaterial({ color: tint(palette.primary, 0.045), roughness: 1, side: DoubleSide }))
  const orbitalGreen = material(new MeshStandardMaterial({ color: tint(palette.primary, 0.88), roughness: 0.3, metalness: 0.34 }))

  scene.add(new AmbientLight(palette.surface, 1.25))
  scene.add(new HemisphereLight(palette.surface, tint(palette.primary, 0.6), 2.1))
  const key = new DirectionalLight(palette.surface, 3.2)
  key.position.set(-3, 7, 5)
  key.castShadow = !constrained
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = -5
  key.shadow.camera.right = 5
  key.shadow.camera.top = 6
  key.shadow.camera.bottom = -4
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 20
  key.shadow.bias = -0.001
  key.shadow.normalBias = 0.025
  scene.add(key)
  const fill = new DirectionalLight(palette.surface, 1.5)
  fill.position.set(4, 4, -3)
  scene.add(fill)

  function mesh(shape, surface, parent = world) {
    const object = new Mesh(shape, surface)
    object.castShadow = !constrained
    object.receiveShadow = !constrained
    parent.add(object)
    return object
  }
  const cylinder = geometry(new CylinderGeometry(1, 1, 1, constrained ? 48 : 80))
  const roundBox = geometry(new RoundedBoxGeometry(1, 1, 1, 2, 0.055))
  const sphere = geometry(new SphereGeometry(1, constrained ? 24 : 36, constrained ? 16 : 24))

  for (let i = 0; i < 3; i++) {
    const tier = mesh(cylinder, i === 2 ? sage : mint)
    const radius = 2.75 - i * 0.19
    tier.scale.set(radius, 0.13, radius)
    tier.position.y = -0.7 + i * 0.15
  }
  const shadowTextureCanvas = document.createElement('canvas')
  shadowTextureCanvas.width = 128
  shadowTextureCanvas.height = 128
  const shadowContext = shadowTextureCanvas.getContext('2d')
  if (shadowContext) {
    const gradient = shadowContext.createRadialGradient(64, 64, 8, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(33,58,50,0.16)')
    gradient.addColorStop(0.55, 'rgba(33,58,50,0.10)')
    gradient.addColorStop(1, 'rgba(33,58,50,0)')
    shadowContext.fillStyle = gradient
    shadowContext.fillRect(0, 0, 128, 128)
    const contactTexture = new CanvasTexture(shadowTextureCanvas)
    textures.add(contactTexture)
    const contactShadow = mesh(geometry(new PlaneGeometry(7.4, 7.4)), material(new MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false })))
    contactShadow.rotation.x = -Math.PI / 2
    contactShadow.position.y = -0.8
    contactShadow.castShadow = false
    contactShadow.receiveShadow = false
  }
  const receiver = mesh(geometry(new PlaneGeometry(10, 10)), material(new ShadowMaterial({ color: palette.primary, opacity: 0.1 })))
  receiver.rotation.x = -Math.PI / 2
  receiver.position.y = -0.79
  receiver.castShadow = false

  const book = new Group()
  book.position.set(0.12, -0.17, 0.1)
  book.rotation.y = -0.08
  world.add(book)
  for (const side of [-1, 1]) {
    const cover = mesh(roundBox, green, book)
    cover.scale.set(1.94, 0.085, 2.55)
    cover.position.set(side * 0.99, 0.075, 0)
    cover.rotation.z = side * 0.06
  }
  const spine = mesh(geometry(new CylinderGeometry(0.135, 0.135, 2.54, 20)), green, book)
  spine.rotation.x = Math.PI / 2
  spine.position.y = 0.07

  function pageShape(side) {
    const positions = []
    const uvs = []
    const indices = []
    const steps = 30
    const depthSteps = 5
    for (let z = 0; z <= depthSteps; z++) {
      for (let x = 0; x <= steps; x++) {
        const t = x / steps
        const longitudinal = z / depthSteps
        const height = 0.11 + Math.sin(t * Math.PI) * 0.26 + t * 0.18
        positions.push(side * (t * 1.82 + 0.015), height, (longitudinal - 0.5) * 2.37)
        uvs.push(side === 1 ? t : 1 - t, longitudinal)
      }
    }
    for (let z = 0; z < depthSteps; z++) {
      for (let x = 0; x < steps; x++) {
        const a = z * (steps + 1) + x
        const b = a + 1
        const c = a + steps + 1
        const d = c + 1
        if (side > 0) indices.push(a, c, b, b, c, d)
        else indices.push(a, b, c, b, d, c)
      }
    }
    const shape = new BufferGeometry()
    shape.setAttribute('position', new Float32BufferAttribute(positions, 3))
    shape.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    shape.setIndex(indices)
    shape.computeVertexNormals()
    return geometry(shape)
  }

  function createPageTexture(side) {
    const page = document.createElement('canvas')
    page.width = 384
    page.height = 512
    const context = page.getContext('2d')
    if (!context) return null
    context.fillStyle = '#fafbf8'
    context.fillRect(0, 0, 384, 512)
    context.strokeStyle = 'rgba(38,78,66,0.20)'
    context.lineWidth = 2
    for (let line = 0; line < 21; line++) {
      const y = 70 + line * 17
      if (line >= 7 && line <= 13) continue
      const width = line % 5 === 4 ? 180 : 272
      context.beginPath()
      context.moveTo(56, y)
      context.lineTo(56 + width, y)
      context.stroke()
    }
    context.strokeStyle = 'rgba(38,78,66,0.48)'
    context.lineWidth = 1.5
    if (side === 1) {
      for (const angle of [-Math.PI / 3, 0, Math.PI / 3]) {
        context.beginPath()
        context.ellipse(190, 245, 68, 26, angle, 0, Math.PI * 2)
        context.stroke()
      }
      context.fillStyle = '#df7548'
      context.beginPath()
      context.arc(190, 245, 7, 0, Math.PI * 2)
      context.fill()
    } else {
      context.beginPath()
      context.moveTo(82, 290)
      context.lineTo(82, 195)
      context.moveTo(82, 290)
      context.lineTo(287, 290)
      context.stroke()
      context.beginPath()
      for (let i = 0; i < 180; i++) {
        const x = 90 + i
        const y = 248 - Math.sin(i / 30) * 38
        if (i === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.stroke()
    }
    const texture = new CanvasTexture(page)
    texture.colorSpace = SRGBColorSpace
    textures.add(texture)
    return texture
  }
  for (const side of [-1, 1]) {
    const shape = pageShape(side)
    for (let index = 0; index < 11; index++) {
      const surface = index === 10
        ? material(new MeshStandardMaterial({ color: palette.surface, map: createPageTexture(side), roughness: 0.95, side: DoubleSide }))
        : index % 2 === 0 ? pageWhite : pageEdge
      const page = mesh(shape, surface, book)
      page.position.y = index * 0.016
      page.rotation.z = side * index * 0.007
      page.castShadow = index === 10 && !constrained
    }
  }

  const stackedBooks = new Group()
  stackedBooks.position.set(-1.72, -0.28, 1.27)
  stackedBooks.rotation.y = 0.11
  stackedBooks.rotation.z = -0.015
  world.add(stackedBooks)
  const closedBookCover = geometry(new RoundedBoxGeometry(0.89, 0.052, 0.69, 2, 0.025))
  const closedBookPages = geometry(new BoxGeometry(0.82, 0.12, 0.64))
  for (let i = 0; i < 3; i++) {
    const surface = i === 0 ? softOrange : i === 1 ? pageWhite : sage
    const volume = new Group()
    volume.rotation.y = (i - 1) * 0.075
    volume.position.y = i * 0.185
    stackedBooks.add(volume)
    mesh(closedBookCover, surface, volume).position.y = -0.04
    mesh(closedBookCover, surface, volume).position.y = 0.11
    mesh(closedBookPages, pageWhite, volume).position.set(0.018, 0.035, 0)
    const coverSpine = mesh(roundBox, surface, volume)
    coverSpine.scale.set(0.055, 0.14, 0.69)
    coverSpine.position.set(-0.415, 0.03, 0)
  }
  const pencil = new Group()
  pencil.position.set(-2.01, 0.25, 0.5)
  pencil.rotation.z = -0.1
  world.add(pencil)
  const pencilBody = mesh(geometry(new CylinderGeometry(0.032, 0.032, 1.15, 6)), green, pencil)
  const pencilTip = mesh(geometry(new CylinderGeometry(0, 0.032, 0.17, 6)), softOrange, pencil)
  pencilTip.position.y = 0.66
  pencilBody.castShadow = false

  const atom = new Group()
  atom.position.set(0.05, 2.39, -0.05)
  atom.rotation.set(0.08, -0.18, 0.08)
  world.add(atom)
  const nucleus = mesh(sphere, warm, atom)
  nucleus.scale.setScalar(0.41)
  const ringShape = geometry(new TorusGeometry(1.46, 0.025, 8, constrained ? 72 : 96))
  const orbits = []
  for (let i = 0; i < 3; i++) {
    const orbit = new Group()
    orbit.rotation.z = (i * Math.PI) / 3
    orbit.rotation.y = 0.2
    orbit.scale.set(1, 0.48, 1)
    atom.add(orbit)
    const ring = mesh(ringShape, orbitalGreen, orbit)
    ring.castShadow = false
    const electron = mesh(sphere, softOrange, orbit)
    electron.scale.set(0.082, 0.171, 0.082)
    electron.castShadow = false
    orbits.push({ orbit, electron, phase: i * 2.08 })
  }
  const cube = mesh(geometry(new RoundedBoxGeometry(0.55, 0.55, 0.55, 3, 0.09)), sage)
  cube.position.set(1.95, 1.6, -0.05)
  cube.rotation.set(0.2, 0.35, -0.16)

  let disposed = false
  let paused = false
  let visible = true
  let tabVisible = !document.hidden
  let frame = 0
  let elapsed = 0
  let lastTime = 0
  let width = 0
  let height = 0
  let box = container.getBoundingClientRect()
  let targetX = 0
  let targetY = 0
  let currentX = 0
  let currentY = 0
  let pixelScale = Math.min(devicePixelRatio || 1, constrained ? 1.15 : 1.5)
  let sampleCount = 0
  let sampleTime = 0
  let hasRendered = false

  function resize() {
    if (disposed) return
    box = container.getBoundingClientRect()
    if (!box.width || !box.height) return
    const nextWidth = Math.round(box.width)
    const nextHeight = Math.round(box.height)
    if (nextWidth === width && nextHeight === height) return
    width = nextWidth
    height = nextHeight
    const maximumPixels = constrained ? 380000 : 800000
    const effectiveScale = Math.min(pixelScale, Math.sqrt(maximumPixels / (width * height)))
    renderer.setSize(Math.round(width * effectiveScale), Math.round(height * effectiveScale), false)
    const aspect = width / height
    const verticalSpan = 6.75
    camera.left = -verticalSpan * aspect / 2
    camera.right = verticalSpan * aspect / 2
    camera.top = verticalSpan / 2
    camera.bottom = -verticalSpan / 2
    camera.updateProjectionMatrix()
    renderer.shadowMap.needsUpdate = true
    if (paused || !visible || !tabVisible) renderOnce()
  }

  function renderOnce() {
    if (disposed || !width || !height) return
    try {
      renderer.render(scene, camera)
      if (!hasRendered) { hasRendered = true; onReady?.() }
    } catch {
      stop()
      onError?.()
    }
  }

  function animate(now) {
    frame = 0
    if (disposed || paused || !visible || !tabVisible) return
    const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016
    if (lastTime && sampleCount < 150) {
      sampleTime += now - lastTime
      sampleCount++
      if (sampleCount === 150 && sampleTime / sampleCount > 26 && pixelScale > 1) {
        pixelScale = 1
        width = 0
        resize()
        container.dataset.quality = 'adaptive'
      }
    }
    lastTime = now
    elapsed += delta
    const smoothing = 1 - Math.exp(-delta * 3.3)
    currentX = MathUtils.lerp(currentX, targetX, smoothing)
    currentY = MathUtils.lerp(currentY, targetY, smoothing)
    world.rotation.y = -0.23 + currentX * 0.13
    world.rotation.x = currentY * 0.06
    atom.rotation.y = -0.18 + Math.sin(elapsed * 0.24) * 0.12
    atom.rotation.z = 0.08 + Math.sin(elapsed * 0.2) * 0.045
    atom.position.y = 2.39 + Math.sin(elapsed * 0.7) * 0.055
    for (const { electron, phase } of orbits) {
      const angle = elapsed * 0.22 + phase
      electron.position.set(Math.cos(angle) * 1.46, Math.sin(angle) * 1.46, 0)
    }
    cube.rotation.y = 0.35 + elapsed * 0.08
    cube.position.y = 1.6 + Math.sin(elapsed * 0.65 + 1.4) * 0.065
    renderOnce()
    if (!disposed && !paused && visible && tabVisible) frame = requestAnimationFrame(animate)
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    lastTime = 0
  }
  function sync() {
    if (disposed || paused || !visible || !tabVisible) stop()
    else if (!frame) { lastTime = 0; frame = requestAnimationFrame(animate) }
  }
  function pointerMove(event) {
    if (paused || event.pointerType === 'touch') return
    targetX = MathUtils.clamp(((event.clientX - box.left) / box.width - 0.5) * 2, -1, 1)
    targetY = MathUtils.clamp(((event.clientY - box.top) / box.height - 0.5) * 2, -1, 1)
  }
  function pointerEnter() { box = container.getBoundingClientRect() }
  function pointerLeave() { targetX = 0; targetY = 0 }
  function visibilityChange() { tabVisible = !document.hidden; sync() }
  function contextLost(event) { event.preventDefault(); stop(); onError?.() }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)
  const intersectionObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting
    if (visible) box = container.getBoundingClientRect()
    sync()
  }, { threshold: 0.03 })
  intersectionObserver.observe(container)
  container.addEventListener('pointermove', pointerMove, { passive: true })
  container.addEventListener('pointerenter', pointerEnter, { passive: true })
  container.addEventListener('pointerleave', pointerLeave, { passive: true })
  canvas.addEventListener('webglcontextlost', contextLost, false)
  document.addEventListener('visibilitychange', visibilityChange)
  resize()
  renderer.shadowMap.needsUpdate = true
  renderOnce()
  sync()

  return {
    setPaused(value) { paused = value; sync() },
    dispose() {
      if (disposed) return
      disposed = true
      stop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      container.removeEventListener('pointermove', pointerMove)
      container.removeEventListener('pointerenter', pointerEnter)
      container.removeEventListener('pointerleave', pointerLeave)
      document.removeEventListener('visibilitychange', visibilityChange)
      canvas.removeEventListener('webglcontextlost', contextLost)
      geometries.forEach(item => item.dispose())
      materials.forEach(item => item.dispose())
      textures.forEach(item => item.dispose())
      key.shadow.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
