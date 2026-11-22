/** Luce direzionale unica (sole di giorno, luna di notte) con ombra aggiornata solo quando serve. */
import { smoothstep } from './keys.js'

// lighting.sun.frustum: volume coperto dalla camera d'ombra
const BOX_MIN = [-1, -1, 0]
const BOX_MAX = [30, 4, 16]
const SUN_DISTANCE = 60 // m dalla casa, lungo la direzione opposta alla luce
const SHADOW_MARGIN = 1
const CASTER_REACH = 8 // m in più verso il sole: edifici alti sopra il volume proiettano comunque
// lighting.horizonFade: intensità × smoothstep(0, 4, el)
const FADE_EL0 = 0
const FADE_EL1 = 4
// lighting.sun.shadowUpdate: ridisegno solo se la direzione cambia di più di 0,2°
const SHADOW_DIR_DEG = 0.2
const MIN_INTENSITY = 0.002
const DEG = Math.PI / 180

/**
 * @param {object} ctx contesto condiviso
 * @param {{ gain: number }} opts fattore di scala dell'intensità
 */
export function createSun(ctx, { gain }) {
  const { THREE, renderer, lighting } = ctx
  const light = new THREE.DirectionalLight('#ffffff', 0)
  light.shadow.radius = lighting.sun.radius
  light.shadow.bias = -0.0004
  light.shadow.normalBias = 0.04
  ctx.groups.lights.add(light, light.target)
  renderer.shadowMap.autoUpdate = false // la scena è ferma: la mappa si rifà solo su richiesta (refreshShadow)

  const box = new THREE.Box3(new THREE.Vector3(...BOX_MIN), new THREE.Vector3(...BOX_MAX))
  const center = box.getCenter(new THREE.Vector3())
  light.target.position.copy(center)
  light.target.updateMatrixWorld()

  const dir = new THREE.Vector3(0, -1, 0) // dal sole verso la scena
  const shadowDir = new THREE.Vector3(0, 0, 0)
  const tmp = new THREE.Vector3()
  const lo = new THREE.Vector3()
  const hi = new THREE.Vector3()
  const info = { elevation: 0, size: lighting.sun.shadowMapSize.high, wantShadow: true }

  /** Camera d'ombra ortografica che copre il volume della casa lungo la direzione corrente. */
  function fitShadowCamera() {
    const cam = light.shadow.camera
    cam.position.copy(light.position)
    cam.lookAt(center)
    cam.updateMatrixWorld()
    lo.set(Infinity, Infinity, Infinity)
    hi.set(-Infinity, -Infinity, -Infinity)
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      tmp.set(x, y, z).applyMatrix4(cam.matrixWorldInverse)
      lo.min(tmp)
      hi.max(tmp)
    }
    cam.left = lo.x - SHADOW_MARGIN
    cam.right = hi.x + SHADOW_MARGIN
    cam.bottom = lo.y - SHADOW_MARGIN
    cam.top = hi.y + SHADOW_MARGIN
    cam.near = Math.max(0.1, -hi.z - SHADOW_MARGIN - CASTER_REACH)
    cam.far = -lo.z + SHADOW_MARGIN
    cam.updateProjectionMatrix()
  }

  /** Rifà la camera e segna la mappa d'ombra da ridisegnare. */
  function refreshShadow() {
    fitShadowCamera()
    shadowDir.copy(dir)
    renderer.shadowMap.needsUpdate = true
  }

  /** Dimensione della mappa d'ombra secondo la qualità (0 = ombre spente). */
  function setQuality(level) {
    const size = lighting.sun.shadowMapSize[level] ?? lighting.sun.shadowMapSize.high
    info.wantShadow = size > 0
    if (size > 0 && light.shadow.mapSize.x !== size) {
      light.shadow.mapSize.set(size, size)
      const map = light.shadow.map
      if (map) {
        map.depthTexture?.dispose()
        map.dispose()
        light.shadow.map = null
      }
    }
    info.size = size
    refreshShadow()
  }

  /**
   * Applica direzione, colore e intensità del campione `st`.
   * @param {object} st grandezze interpolate (keys.js)
   * @param {number} [boost=1] moltiplicatore dell'intensità (taratura della luna)
   */
  function apply(st, boost = 1) {
    const az = st.az * DEG
    const el = st.el * DEG
    dir.set(-Math.sin(az) * Math.cos(el), -Math.sin(el), -Math.cos(az) * Math.cos(el))
    light.position.copy(center).addScaledVector(dir, -SUN_DISTANCE)
    light.updateMatrixWorld()
    light.color.copy(st.sunColor)
    const fade = smoothstep(FADE_EL0, FADE_EL1, st.el)
    light.intensity = st.sunI * fade * gain * boost
    info.elevation = st.el
    const casts = info.wantShadow && st.el > 0 && light.intensity > MIN_INTENSITY
    if (casts !== light.castShadow) {
      light.castShadow = casts
      if (casts) refreshShadow()
    }
    if (shadowDir.lengthSq() === 0 || dir.angleTo(shadowDir) > SHADOW_DIR_DEG * DEG) refreshShadow()
  }

  return { light, apply, refreshShadow, setQuality, info }
}
