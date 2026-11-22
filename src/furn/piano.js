/** Pianoforte a coda (E3): cassa a forma d'ala, coperchio sollevato sull'asta, tastiera, tre gambe, pedaliera a lira, leggio. */
import * as THREE from 'three'
import * as kit from './kit.js'

const CASE_Y = 0.7
const CASE_T = 0.18
const LID_ANGLE = 0.44

/** Punti `[x, z]` del fianco curvo e della coda, dal davanti destro al fianco dritto sinistro (z negativo verso il retro). */
function tailPts(hw, d, zc) {
  return [[hw, zc - 0.3], [hw * 0.93, zc - 0.65], [hw * 0.8, zc - 1.0], [hw * 0.55, -d * 0.31], [hw * 0.25, -d * 0.43],
    [-hw * 0.1, -d * 0.49], [-hw * 0.5, -d * 0.46], [-hw * 0.85, -d * 0.35], [-hw, -d * 0.22]]
}

/** Lastra con la pianta dell'ala (davanti diritto a `zf`), estrusa verso l'alto di `depth`, con base a quota `y`. */
function wing(hw, d, zc, zf, mat, y, depth) {
  const s = new THREE.Shape()
  const pts = tailPts(hw, d, zc).filter(([, z]) => z < zf - 0.05)
  const first = zf === zc ? [] : [new THREE.Vector2(hw * 0.975, -zf)]
  s.moveTo(-hw, -zf)
  s.lineTo(zf === zc ? hw : hw * 0.975, -zf)
  s.splineThru([...first.slice(1), ...pts.map(([x, z]) => new THREE.Vector2(x, -z))])
  s.lineTo(-hw, -zf)
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, y, 0)
  return new THREE.Mesh(geo, mat)
}

/** Gamba: tornita con piede a sfera (Liberty), quadrata (Moderno), conica (Scandinavo). */
function pianoLeg(env, x, z, h) {
  const { style, mat } = env
  const m = mat('piano')
  const g = new THREE.Group()
  if (style === 'liberty') {
    g.add(kit.lathe([[0, 0.05], [0.035, 0.05], [0.028, 0.12], [0.04, 0.2], [0.03, 0.3], [0.05, 0.45], [0.06, h - 0.05], [0.07, h]].map(([r, y]) => [r, y]), m, {}, 12))
    g.add(kit.sphere(0.03, mat('metal.accent'), { y: 0 }))
  } else if (style === 'moderno') {
    g.add(kit.box(0.07, h, 0.07, m))
  } else {
    g.add(kit.cyl(0.03, 0.055, h, m, {}, 10))
  }
  g.position.set(x, 0, z)
  return g
}

/** Tastiera: 52 tasti bianchi separati e 36 neri, su un piano nero con due cheek-block laterali. */
function keyboard(env, kw, z0) {
  const { mat } = env
  const g = new THREE.Group()
  const wk = kw / 52
  const blk = mat('black')
  g.add(kit.box(kw + 0.02, 0.03, 0.17, blk, { y: CASE_Y + 0.02, z: z0 }))
  for (let i = 0; i < 52; i++) {
    const x = -kw / 2 + (i + 0.5) * wk
    g.add(kit.box(wk - 0.002, 0.02, 0.15, mat('ceramic.white'), { x, y: CASE_Y + 0.05, z: z0 + 0.01 }))
    if ([1, 0, 1, 1, 0, 1, 1][i % 7] && i < 51) g.add(kit.box(wk * 0.55, 0.014, 0.09, blk, { x: x + wk / 2, y: CASE_Y + 0.07, z: z0 - 0.02 }))
  }
  for (const s of [-1, 1]) g.add(kit.box(0.05, 0.1, 0.19, mat('piano'), { x: s * (kw / 2 + 0.035), y: CASE_Y, z: z0 }))
  return g
}

/** Pedaliera a lira: due montanti, traversa con tre pedali in ottone. */
function lyre(env, z) {
  const { mat } = env
  const g = new THREE.Group()
  const m = mat('piano')
  for (const x of [-0.1, 0.1]) g.add(kit.box(0.03, CASE_Y - 0.12, 0.05, m, { x, y: 0.12, z }))
  g.add(kit.box(0.3, 0.05, 0.12, m, { y: 0.08, z }))
  for (const x of [-0.07, 0, 0.07]) g.add(kit.box(0.04, 0.012, 0.14, mat('metal.accent'), { x, y: 0.09, z: z + 0.1 }))
  return g
}

/** Interno: tavola armonica, telaio in ottone e corde. */
function inside(env, hw, d, zc, y) {
  const { mat } = env
  const g = new THREE.Group()
  const board = wing(hw, d, zc, zc, mat('wood.primary'), y, 0.01)
  board.scale.set(0.94, 1, 0.97)
  board.position.z = -0.01
  g.add(board)
  const plate = wing(hw, d, zc, zc, mat('metal.accent'), y + 0.01, 0.006)
  plate.scale.set(0.82, 1, 0.7)
  plate.position.set(-hw * 0.03, 0, -0.1)
  g.add(plate)
  const n = 36
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1)
    const len = 0.75 + 0.55 * (1 - u) - (u > 0.7 ? 0.2 * (u - 0.7) : 0)
    g.add(kit.box(0.0035, 0.004, len * 0.75, mat('metal.chrome'), { x: -hw * 0.74 + u * hw * 1.4, y: y + 0.018, z: -0.05 - len * 0.25 + 0.05 }))
  }
  return g
}

/** `grand_piano`: pianoforte a coda; il fronte (tastiera) è verso `+z`. */
function buildPiano(item, env) {
  const [w, d] = item.size
  const { mat } = env
  const hw = w / 2
  const zc = d / 2 - 0.22
  const g = new THREE.Group()
  const body = mat('piano')
  g.add(wing(hw, d, zc, zc, body, CASE_Y, CASE_T))
  const top = CASE_Y + CASE_T
  g.add(inside(env, hw, d, zc, top))
  g.add(pianoLeg(env, hw - 0.12, zc - 0.1, CASE_Y))
  g.add(pianoLeg(env, -hw + 0.12, zc - 0.1, CASE_Y))
  g.add(pianoLeg(env, hw * 0.3, -d * 0.36, CASE_Y))
  g.add(keyboard(env, Math.min(w - 0.28, 1.22), zc + 0.07))
  g.add(lyre(env, zc - 0.28))
  const desk = kit.box(0.7, 0.26, 0.015, body, { x: 0, y: top, z: zc - 0.18 })
  desk.rotation.x = -0.28
  g.add(desk)
  g.add(kit.box(0.74, 0.02, 0.06, body, { y: top, z: zc - 0.18 }))
  const pivot = new THREE.Group()
  const hx = hw * 0.96
  const lid = wing(hw, d, zc, zc - 0.55, body, 0, 0.025)
  lid.position.x = -hx
  lid.scale.set(0.985, 1, 0.99)
  pivot.add(lid)
  pivot.position.set(hx, top + 0.012, 0)
  pivot.rotation.z = -LID_ANGLE
  g.add(pivot)
  const sx = -0.25
  const sy = (hx - sx) * Math.tan(LID_ANGLE)
  g.add(kit.cyl(0.008, 0.008, sy * 0.99, mat('metal.accent'), { x: sx, y: top, z: -0.2 }, 6))
  return kit.finalize(g, item)
}

/** @param {object} furn registro degli arredi */
export function register(furn) {
  furn.register('grand_piano', buildPiano)
}
