/** Vista dall'alto: parametri d'orbita, inquadratura della pianta, comandi e selezione di un punto a terra. */

const MARGIN = 1.1 // margine attorno alla pianta (10 %)
const ELEVATION = (55 * Math.PI) / 180 // inclinazione iniziale
const PHI_MIN = (25 * Math.PI) / 180
const PHI_MAX = (89 * Math.PI) / 180
const DIST_MIN = 8
const DIST_MAX = 60
const MIN_Y = 0.2 // quota minima della camera
const TOP_UP = 0.1 // distacco sopra un muro incontrato
const ORBIT_SENS = 0.005 // rad per pixel

/**
 * Crea il controllore della vista dall'alto.
 * @param {object} ctx contesto condiviso
 * @returns {object} controllore con `params`, `fit`, `poseOf`, `orbit`, `zoom`, `pan`, `pick`
 */
export function createDollhouse(ctx) {
  const { THREE, camera, grid, plan } = ctx
  const H = plan.meta.ceilingHeight
  const raycaster = new THREE.Raycaster()
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const hit = new THREE.Vector3()

  // estensione in pianta di footprint e spazi esterni
  const box = { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity }
  const rects = [...plan.footprint, ...plan.outdoor.flatMap((o) => o.rects)]
  for (const [x0, z0, x1, z1] of rects) {
    box.x0 = Math.min(box.x0, x0)
    box.z0 = Math.min(box.z0, z0)
    box.x1 = Math.max(box.x1, x1)
    box.z1 = Math.max(box.z1, z1)
  }
  const center = { x: (box.x0 + box.x1) / 2, z: (box.z0 + box.z1) / 2 }
  const params = { tx: center.x, tz: center.z, theta: 0, phi: ELEVATION, dist: 16 }
  let distMax = DIST_MAX

  /** Distanza minima a cui tutta la pianta sta nell'inquadratura, con margine. */
  function fitDistance(yaw, pitch) {
    const cp = Math.cos(pitch)
    const f = [Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp]
    const r = [-Math.cos(yaw), 0, Math.sin(yaw)]
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
    const th = Math.tan((camera.fov * Math.PI) / 360)
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    const corners = []
    for (const x of [box.x0, box.x1]) for (const z of [box.z0, box.z1]) for (const y of [0, H]) corners.push([x, y, z])
    const target = [center.x, 0, center.z]
    const fits = (d) => {
      const eye = [target[0] - f[0] * d, target[1] - f[1] * d, target[2] - f[2] * d]
      return corners.every((c) => {
        const v = [c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]]
        const zc = dot(v, f)
        if (zc < 0.1) return false
        return Math.abs(dot(v, r)) / (zc * th * camera.aspect) * MARGIN <= 1 && Math.abs(dot(v, u)) / (zc * th) * MARGIN <= 1
      })
    }
    let lo = 1
    let hi = 400
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2
      if (fits(mid)) hi = mid
      else lo = mid
    }
    return hi
  }

  /** Riporta l'orbita alla posizione iniziale: dal lato +z, 55 gradi, tutta la pianta inquadrata. */
  function reset() {
    params.tx = center.x
    params.tz = center.z
    params.theta = 0
    params.phi = ELEVATION
    // camera dal lato +z che guarda verso -z: yaw = theta + PI
    params.dist = fitDistance(Math.PI, -ELEVATION)
    distMax = Math.max(DIST_MAX, params.dist * 1.25)
    params.dist = Math.min(Math.max(params.dist, DIST_MIN), distMax)
  }

  /** Posa dell'osservatore che guarda il punto (tx, 0, tz) da (ex, ey, ez). */
  function lookFrom(ex, ey, ez) {
    const dx = params.tx - ex
    const dz = params.tz - ez
    return { x: ex, y: ey, z: ez, yaw: Math.atan2(dx, dz), pitch: Math.atan2(-ey, Math.hypot(dx, dz)) }
  }

  /** Alza `y` sopra un muro o un pieno che la camera starebbe attraversando. */
  function clearOfWalls(x, y, z) {
    let out = Math.max(y, MIN_Y)
    const c = grid.cellAt(x, z)
    if (c < 0) return out
    for (const [y0, y1] of grid.solidSpans(c)) {
      if (out >= y0 - TOP_UP && out <= y1 + TOP_UP) out = y1 + TOP_UP
    }
    return out
  }

  /**
   * Posa della camera per la vista richiesta.
   * @param {'dollhouse'|'top'} view
   * @returns {{x:number,y:number,z:number,yaw:number,pitch:number}}
   */
  function poseOf(view) {
    if (view === 'top') {
      const d = fitDistance(Math.PI, -Math.PI / 2)
      return { x: center.x, y: d, z: center.z, yaw: Math.PI, pitch: -Math.PI / 2 }
    }
    const { tx, tz, theta, phi, dist } = params
    const ex = tx + dist * Math.sin(theta) * Math.cos(phi)
    const ez = tz + dist * Math.cos(theta) * Math.cos(phi)
    const ey = clearOfWalls(ex, dist * Math.sin(phi), ez)
    return lookFrom(ex, ey, ez)
  }

  /** Ruota l'orbita: `dx`, `dy` in pixel di trascinamento. */
  function orbit(dx, dy) {
    params.theta -= dx * ORBIT_SENS
    params.phi = Math.min(PHI_MAX, Math.max(PHI_MIN, params.phi + dy * ORBIT_SENS))
  }

  /** Avvicina o allontana: `factor` moltiplica la distanza. */
  function zoom(factor) {
    params.dist = Math.min(distMax, Math.max(DIST_MIN, params.dist * factor))
  }

  /** Sposta il bersaglio sul piano di terra di `dx`, `dy` pixel, entro la pianta. */
  function pan(dx, dy) {
    const perPx = (2 * params.dist * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(window.innerHeight, 1)
    const sx = Math.sin(params.theta)
    const cx = Math.cos(params.theta)
    // destra dello schermo = (-cos(yaw), sin(yaw)) con yaw = theta + PI -> (cos, -sin)
    const rx = cx
    const rz = -sx
    // verso l'alto dello schermo sul terreno = direzione di sguardo = (-sin, -cos)
    const fx = -sx
    const fz = -cx
    params.tx = Math.min(box.x1, Math.max(box.x0, params.tx - dx * perPx * rx + dy * perPx * fx))
    params.tz = Math.min(box.z1, Math.max(box.z0, params.tz - dx * perPx * rz + dy * perPx * fz))
  }

  /**
   * Punto del piano y = 0 sotto il puntatore (i muri non intercettano il raggio).
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{x:number,z:number}|null}
   */
  function pick(clientX, clientY) {
    const rect = ctx.canvas.getBoundingClientRect()
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    camera.updateMatrixWorld(true)
    raycaster.setFromCamera(ndc, camera)
    return raycaster.ray.intersectPlane(ground, hit) ? { x: hit.x, z: hit.z } : null
  }

  reset()
  return { params, reset, poseOf, orbit, zoom, pan, pick, box }
}
