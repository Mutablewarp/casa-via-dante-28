/** Parti comuni delle lampade: paralumi a guscio, tulipani, cupole, baldacchino. Solo geometria, nessuna luce. */
import * as THREE from 'three'
import * as kit from './kit.js'

const SEG = 14

/**
 * Profilo chiuso di un guscio sottile (le facce guardano fuori e dentro).
 * @param {number[][]} outer `[[raggio, quota], ...]` dal basso verso l'alto @param {number} t spessore radiale
 * @returns {number[][]} profilo per `kit.lathe`
 */
export function shellProfile(outer, t) {
  const inner = outer.map(([r, y]) => [Math.max(r - t, 0.004), y]).reverse()
  return [...outer, ...inner]
}

/**
 * Paralume a tulipano aperto in basso (svasato al bordo), origine al bordo inferiore.
 * @param {number} R raggio al bordo @param {number} h altezza @param {THREE.Material} mat @param {object} [at] @param {number} [seg]
 */
export function tulip(R, h, mat, at, seg = SEG) {
  const o = [[R, 0], [R * 0.92, h * 0.14], [R * 0.72, h * 0.38], [R * 0.5, h * 0.62], [R * 0.3, h * 0.86], [0.016, h]]
  return kit.lathe(shellProfile(o, 0.004), mat, at, seg)
}

/**
 * Cupola aperta in basso, origine al bordo inferiore.
 * @param {number} R @param {number} h @param {THREE.Material} mat @param {object} [at]
 */
export function dome(R, h, mat, at) {
  const o = [[R, 0], [R * 0.96, h * 0.3], [R * 0.78, h * 0.65], [R * 0.42, h * 0.9], [0.02, h]]
  return kit.lathe(shellProfile(o, 0.004), mat, at, 16)
}

/**
 * Coppa aperta in alto (paralume rivolto in su), origine al fondo.
 * @param {number} R raggio al bordo @param {number} h @param {THREE.Material} mat @param {object} [at]
 */
export function cup(R, h, mat, at) {
  const o = [[0.012, 0], [R * 0.3, h * 0.15], [R * 0.55, h * 0.4], [R * 0.78, h * 0.7], [R, h]]
  return kit.lathe(shellProfile(o, 0.004), mat, at, 12)
}

/**
 * Cilindro cavo (tamburo) di raggio `R` e altezza `h`, aperto alle due estremità.
 * @param {number} R @param {number} h @param {THREE.Material} mat @param {object} [at] @param {number} [seg]
 */
export function drum(R, h, mat, at, seg = 18) {
  return kit.lathe(shellProfile([[R, 0], [R, h]], 0.004), mat, at, seg)
}

/** Lampadina emissiva (materiale `paper.shade`) centrata a quota `y`. @param {THREE.Material} shade @param {number} y @param {number} [r=0.03] */
export function bulb(shade, y, r = 0.03, x = 0, z = 0) {
  const pr = [[0.001, 0], [r * 0.7, r * 0.3], [r, r], [r * 0.7, r * 1.7], [0.001, 2 * r]]
  const b = kit.lathe(pr, shade, { x, y: y - r, z }, 8) // bulbo a 8 spicchi: ripetuto molte volte
  b.userData.noShadow = true
  return b
}

/** Baldacchino a soffitto: disco sottile con base a `y = -t`. @param {THREE.Material} mat @param {number} r @param {number} [t=0.03] */
export function canopy(mat, r, t = 0.03) {
  return kit.cyl(r * 0.8, r, t, mat, { y: -t })
}

/** Fune, catena o asta verticale dal soffitto fino a quota `-yBottom`, partendo da `-yTop`. */
export function line(mat, yTop, yBottom, r = 0.006) {
  const len = Math.max(yBottom - yTop, 0.01)
  return kit.cyl(r, r, len, mat, { y: -yBottom })
}

/** Cilindro orizzontale lungo x. @param {number} len @param {number} r @param {THREE.Material} mat @param {object} at posa del centro */
export function rodX(len, r, mat, at) {
  const m = kit.cyl(r, r, len, mat, {}, 10)
  m.geometry.translate(0, -len / 2, 0)
  m.rotation.z = Math.PI / 2
  m.position.set(at.x ?? 0, at.y ?? 0, at.z ?? 0)
  return m
}

/** Oggetto ripetuto in cerchio: chiama `make(angolo)` per `n` angoli e aggiunge i risultati a `g`. */
export function ring(g, n, make, phase = 0) {
  for (let i = 0; i < n; i++) g.add(make(phase + (i / n) * Math.PI * 2, i))
  return g
}
