/** Prima persona: posa canonica, movimento morbido, collisioni con scivolamento. */

const RADIUS = 0.28 // raggio del visitatore (m)
const WALK = 1.6 // velocità di camminata (m/s)
const RUN = 3.0 // velocità di corsa (m/s)
const EASE = 0.12 // tempo di accelerazione e frenata (s)
const SUBSTEP = 1 / 60 // passo massimo di simulazione (s)
const MAX_PITCH = 1.35 // inclinazione massima dello sguardo (rad)
const SEARCH_STEP = 0.05 // passo della ricerca del punto libero (m)
const SNAP_ITER = 9 // iterazioni di bisezione contro un ostacolo

/**
 * Crea il simulatore di movimento in prima persona.
 * @param {object} ctx contesto condiviso
 * @returns {{ pose: {x:number,y:number,z:number,yaw:number,pitch:number}, isFree: Function, findFree: Function, advance: Function, look: Function, stop: Function }}
 */
export function createFps(ctx) {
  const { grid, registry } = ctx
  const pose = { x: 0, y: ctx.tour.settings.eyeHeight, z: 0, yaw: 0, pitch: 0 }
  const vel = { x: 0, z: 0 }
  let offsets = null // spostamenti ordinati per distanza, calcolati alla prima ricerca

  /** Vero se il cerchio di raggio RADIUS in (x, z) tocca un ingombro d'arredo. */
  function hitsCollider(x, z) {
    for (const c of registry.colliders) {
      const [x0, z0, x1, z1] = c.rect
      const dx = Math.max(x0 - x, 0, x - x1)
      const dz = Math.max(z0 - z, 0, z - z1)
      if (dx * dx + dz * dz < RADIUS * RADIUS) return true
    }
    return false
  }

  /**
   * Un punto è libero se la griglia lo permette e nessun arredo lo blocca.
   * @param {number} x
   * @param {number} z
   * @returns {boolean}
   */
  function isFree(x, z) {
    return grid.canStand(x, z, RADIUS) && !hitsCollider(x, z)
  }

  /** Spostamenti su un quadrato di 3 m, dal più vicino al più lontano. */
  function buildOffsets() {
    const n = Math.round(1.5 / SEARCH_STEP)
    const list = []
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) list.push([i * SEARCH_STEP, j * SEARCH_STEP, Math.hypot(i, j) * SEARCH_STEP])
    }
    return list.sort((a, b) => a[2] - b[2])
  }

  /**
   * Punto libero più vicino a (x, z), entro `maxR` metri.
   * @param {number} x
   * @param {number} z
   * @param {number} [maxR] raggio massimo (m)
   * @param {string|null} [spaceId] se dato, il punto deve cadere nello stesso spazio
   * @returns {{x:number,z:number}|null} `null` se non c'è
   */
  function findFree(x, z, maxR = 1.5, spaceId = null) {
    const ok = (px, pz) => isFree(px, pz) && (!spaceId || grid.spaceAt(px, pz)?.id === spaceId)
    if (ok(x, z)) return { x, z }
    offsets ??= buildOffsets()
    for (const [dx, dz, d] of offsets) {
      if (d > maxR + 1e-9) break
      if (ok(x + dx, z + dz)) return { x: x + dx, z: z + dz }
    }
    return null
  }

  /** Avvicina lungo un asse la posizione al massimo spostamento libero (bisezione). */
  function snap(axis, delta) {
    let lo = 0
    let hi = 1
    for (let i = 0; i < SNAP_ITER; i++) {
      const mid = (lo + hi) / 2
      const px = axis === 'x' ? pose.x + delta * mid : pose.x
      const pz = axis === 'z' ? pose.z + delta * mid : pose.z
      if (isFree(px, pz)) lo = mid
      else hi = mid
    }
    pose[axis] += delta * lo
  }

  /** Sposta di (dx, dz) provando i due assi separatamente; restituisce gli assi bloccati. */
  function slide(dx, dz) {
    const blocked = { x: false, z: false }
    if (isFree(pose.x + dx, pose.z + dz)) {
      pose.x += dx
      pose.z += dz
      return blocked
    }
    for (const [axis, d] of [['x', dx], ['z', dz]]) {
      if (d === 0) continue
      const px = axis === 'x' ? pose.x + d : pose.x
      const pz = axis === 'z' ? pose.z + d : pose.z
      if (isFree(px, pz)) pose[axis] += d
      else {
        snap(axis, d)
        blocked[axis] = true
      }
    }
    return blocked
  }

  /** Un passo di simulazione di `dt` secondi. */
  function stepOnce(input, dt) {
    const fwd = input.forward ?? 0
    const right = input.right ?? 0
    const len = Math.hypot(fwd, right)
    const speed = (input.run ? RUN : WALK) * Math.min(len, 1)
    const f = len ? speed / len : 0
    const sy = Math.sin(pose.yaw)
    const cy = Math.cos(pose.yaw)
    // direzione = avanti * (sin, cos) + destra * (-cos, sin)
    const tx = (fwd * sy - right * cy) * f
    const tz = (fwd * cy + right * sy) * f
    const ex = tx - vel.x
    const ez = tz - vel.z
    const dist = Math.hypot(ex, ez)
    const maxDv = ((input.run ? RUN : WALK) / EASE) * dt
    const k = dist > maxDv ? maxDv / dist : 1
    vel.x += ex * k
    vel.z += ez * k
    if (vel.x === 0 && vel.z === 0) return false
    const blocked = slide(vel.x * dt, vel.z * dt)
    if (blocked.x) vel.x = 0
    if (blocked.z) vel.z = 0
    if (blocked.x && blocked.z && !isFree(pose.x, pose.z)) {
      const f = findFree(pose.x, pose.z, 1, grid.spaceAt(pose.x, pose.z)?.id ?? null)
      if (f) Object.assign(pose, f)
    }
    return true
  }

  /**
   * Avanza il movimento di `seconds`, a passi non più lunghi di 1/60 s.
   * @param {{forward?:number,right?:number,run?:boolean}} input comandi da -1 a 1
   * @param {number} seconds durata simulata
   * @returns {boolean} vero se la posizione può essere cambiata
   */
  function advance(input, seconds) {
    if (seconds <= 0) return false
    const n = Math.max(1, Math.ceil(seconds / SUBSTEP - 1e-9))
    let moved = false
    for (let i = 0; i < n; i++) moved = stepOnce(input, seconds / n) || moved
    return moved
  }

  /**
   * Ruota lo sguardo: spostamento a destra gira a destra, in su guarda in alto.
   * @param {number} dx pixel orizzontali
   * @param {number} dy pixel verticali
   * @param {number} sens radianti per pixel
   */
  function look(dx, dy, sens) {
    pose.yaw -= dx * sens
    pose.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pose.pitch - dy * sens))
  }

  return { pose, isFree, findFree, advance, look, stop: () => { vel.x = 0; vel.z = 0 } }
}
