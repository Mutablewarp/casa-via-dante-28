/**
 * Ombra del sole sul quartiere. La mappa d'ombra di three copre solo la casa (circa 1 cm per texel); questa seconda
 * mappa di profondità, vista dal sole, copre le vie e gli edifici attorno (circa 20 cm per texel) e nello shader vale
 * solo dove la prima non arriva (probe-shader.js). Si ridisegna quando il sole si sposta, non a ogni fotogramma.
 */
const SIZE = { high: 2048, medium: 1024, low: 0 }
const HALF = 190 // m: metà lato del quadrato coperto, centrato sulla casa
const BELOW_STREET = 2 // m sotto la strada
const Y_MAX = 30 // m sopra il pavimento dell'attico: tetti e ultimi piani dei vicini
const SUN_DISTANCE = 600 // m: la camera sta fuori dal volume in qualunque direzione
const LAYER = 2 // livello dato agli oggetti che proiettano: la camera della mappa vede solo quello
const GROUPS = ['city', 'exterior', 'architecture', 'ceilings']
// Una mappa grossolana si auto-ombreggia: il punto si sposta lungo la normale e il confronto ha una tolleranza
const NORMAL_OFFSET = 0.3 // m
const DEPTH_BIAS = 0.25 // m

/**
 * @param {object} ctx contesto condiviso
 * @param {() => string} level funzione che restituisce il livello di qualità effettivo
 * @param {{ light: object, dir: object, info: { version: number } }} sun sole (sun.js)
 * @returns {{ uniforms: Record<string, {value: unknown}>, update: () => void, info: () => object }}
 */
export function createFarShadow(ctx, level, sun) {
  const { THREE, renderer, scene } = ctx
  const cam = new THREE.OrthographicCamera()
  cam.layers.set(LAYER)
  // facce posteriori, come fa three: le facce al sole non si ombreggiano da sole
  const depthMat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.BackSide })
  const center = sun.light.target.position
  const ground = -ctx.plan.context.terraceLevel
  const box = new THREE.Box3(
    new THREE.Vector3(center.x - HALF, ground - BELOW_STREET, center.z - HALF),
    new THREE.Vector3(center.x + HALF, Y_MAX, center.z + HALF),
  )
  const matrix = new THREE.Matrix4()
  const tmp = new THREE.Vector3()
  const lo = new THREE.Vector3()
  const hi = new THREE.Vector3()
  const uniforms = {
    casaFarMap: { value: null },
    casaFarMatrix: { value: matrix },
    casaFarParams: { value: new THREE.Vector4(0, 0, NORMAL_OFFSET, 0) }, // attiva, texel in uv, scostamento (m), tolleranza
  }
  let target = null
  let seen = -1
  let draws = 0

  /** Camera ortografica lungo la direzione del sole che contiene tutto il volume del quartiere. */
  function fit() {
    cam.position.copy(center).addScaledVector(sun.dir, -SUN_DISTANCE)
    cam.lookAt(center)
    cam.updateMatrixWorld()
    lo.set(Infinity, Infinity, Infinity)
    hi.set(-Infinity, -Infinity, -Infinity)
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      tmp.set(x, y, z).applyMatrix4(cam.matrixWorldInverse)
      lo.min(tmp)
      hi.max(tmp)
    }
    cam.left = lo.x
    cam.right = hi.x
    cam.bottom = lo.y
    cam.top = hi.y
    cam.near = Math.max(0.1, -hi.z)
    cam.far = -lo.z
    cam.updateProjectionMatrix()
    // dal mondo a uv e profondità della mappa, tutto in 0..1
    matrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse)
    uniforms.casaFarParams.value.w = DEPTH_BIAS / (cam.far - cam.near)
  }

  /** Crea o ridimensiona la mappa (stesso formato delle mappe d'ombra di three: confronto e filtro fatti dalla GPU). */
  function resize(size) {
    if (target?.width === size) return
    target?.depthTexture.dispose()
    target?.dispose()
    target = new THREE.WebGLRenderTarget(size, size)
    const depth = new THREE.DepthTexture(size, size, THREE.UnsignedIntType)
    depth.compareFunction = THREE.LessEqualCompare
    depth.minFilter = THREE.LinearFilter
    depth.magFilter = THREE.LinearFilter
    target.depthTexture = depth
    uniforms.casaFarMap.value = depth
    uniforms.casaFarParams.value.y = 1 / size
    seen = -1
  }

  /** Ridisegna la mappa se il sole si è spostato dall'ultima volta (sun.info.version). Da chiamare prima della scena. */
  function update() {
    const size = SIZE[level()] ?? 0
    const on = size > 0 && sun.light.castShadow
    uniforms.casaFarParams.value.x = on ? 1 : 0
    if (!on) return
    resize(size)
    if (seen === sun.info.version) return
    seen = sun.info.version
    draws++
    // muri e arredi cambiano con lo stile: il livello si riassegna ogni volta a ciò che proietta
    for (const g of GROUPS) ctx.groups[g].traverse((o) => { if (o.isMesh && o.castShadow) o.layers.enable(LAYER) })
    fit()
    const previous = renderer.getRenderTarget()
    // la mappa di three in attesa si rifarebbe qui con il filtro di livelli di questa camera, cioè senza arredi
    const pending = renderer.shadowMap.needsUpdate
    renderer.shadowMap.needsUpdate = false
    scene.overrideMaterial = depthMat
    renderer.setRenderTarget(target)
    renderer.clear()
    renderer.render(scene, cam)
    scene.overrideMaterial = null
    renderer.setRenderTarget(previous)
    renderer.shadowMap.needsUpdate = pending
  }

  return { uniforms, update, info: () => ({ on: uniforms.casaFarParams.value.x === 1, size: target?.width ?? 0, draws }) }
}
