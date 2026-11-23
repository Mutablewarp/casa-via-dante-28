/** Pezzi ripetuti della via: alberi a più masse, auto con abitacolo e ruote, lampioni a braccio, scooter, cassonetti. */
import * as THREE from 'three'
import { Batch, rng, rgb, shade } from './exterior-util.js'
import { hash } from './city-tex.js'

const BARK = rgb('#6b5a48')
const LEAF_UV = 3 // ripetizioni del fogliame attorno a una massa
const CAR = { len: 4.2, width: 1.72, wheelR: 0.32, wheelW: 0.22 }
const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)

/** Cilindro tra due punti (tronco, rami, braccio del lampione). */
function limb(B, mat, p, q, r0, r1, col, seg = 5) {
  _a.set(...p)
  _b.set(...q)
  const len = _a.distanceTo(_b)
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, true)
  _q.setFromUnitVectors(UP, _b.clone().sub(_a).normalize())
  _m.compose(_a.add(_b).multiplyScalar(0.5), _q, new THREE.Vector3(1, 1, 1))
  B.geo(mat, g, { m: _m, color: col })
}

/**
 * Massa di foglie: icosaedro deformato, normali morbide, verde più scuro sotto (ombra propria).
 * @param {THREE.BufferGeometry} out @param {number[]} c centro @param {number[]} r raggi @param {number} seed @param {number} detail
 */
function blob(B, mat, c, r, seed, detail, tone) {
  const g = new THREE.IcosahedronGeometry(1, detail)
  const pa = g.attributes.position
  const na = g.attributes.normal
  const ua = g.attributes.uv
  const col = new Float32Array(pa.count * 3)
  for (let i = 0; i < pa.count; i++) {
    const [x, y, z] = [pa.getX(i), pa.getY(i), pa.getZ(i)]
    // la stessa deformazione per i vertici coincidenti: la massa resta chiusa
    const k = 0.78 + 0.44 * hash(Math.round(x * 50) + seed * 131, Math.round(y * 50) * 7 + Math.round(z * 50) * 13, 61)
    pa.setXYZ(i, c[0] + x * r[0] * k, c[1] + y * r[1] * k, c[2] + z * r[2] * k)
    na.setXYZ(i, x, y, z)
    ua.setXY(i, ua.getX(i) * LEAF_UV, ua.getY(i) * LEAF_UV)
    const light = (0.5 + 0.5 * Math.min(1, Math.max(0, y * 0.8 + 0.55))) * tone
    col.set([light, light, light], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  B.geo(mat, g)
}

/**
 * Geometria di un albero alto circa 7 m: tronco, rami principali e chioma di più masse irregolari.
 * I colori di vertice sono grigi (ombra propria) per le foglie e bruni per il legno: la tinta la dà l'istanza.
 * @param {number} seed variante @param {boolean} low versione leggera per gli alberi lontani
 * @returns {THREE.BufferGeometry}
 */
export function treeGeometry(seed, low) {
  const r = rng(seed)
  const B = new Batch()
  const top = [(r() - 0.5) * 0.5, 3.1, (r() - 0.5) * 0.5]
  // il legno è scurito: il colore dell'istanza (verde) lo moltiplica
  const bark = shade(BARK, 1.6)
  limb(B, 0, [0, 0, 0], top, 0.19, 0.13, bark, low ? 4 : 6)
  const n = low ? 3 : 6
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r() * 0.9
    const d = k === 0 ? 0 : 1.1 + r() * 0.9
    const c = [top[0] + Math.cos(a) * d, 4.3 + r() * 1.5 + (k === 0 ? 1 : 0), top[2] + Math.sin(a) * d]
    if (!low && k > 0 && k < 4) limb(B, 0, top, [c[0], c[1] - 0.4, c[2]], 0.09, 0.05, bark, 4)
    const s = k === 0 ? 1.9 : 1.2 + r() * 0.7
    blob(B, 0, c, [s * (1 + r() * 0.3), s * (0.72 + r() * 0.2), s * (1 + r() * 0.3)], seed * 10 + k, low ? 0 : 1, 0.85 + r() * 0.3)
  }
  return B.geometries().get(0)
}

/** Prisma: poligono convesso nel piano x-y estruso lungo z, con facce piane. */
function prism(B, mat, pts, z0, z1, col) {
  const n = pts.length
  for (let i = 1; i < n - 1; i++) {
    B.tri(mat, [pts[0][0], pts[0][1], z1], [pts[i][0], pts[i][1], z1], [pts[i + 1][0], pts[i + 1][1], z1], { color: col, uv: [[0, 0], [0, 0], [0, 0]] })
    B.tri(mat, [pts[0][0], pts[0][1], z0], [pts[i + 1][0], pts[i + 1][1], z0], [pts[i][0], pts[i][1], z0], { color: col, uv: [[0, 0], [0, 0], [0, 0]] })
  }
  for (let i = 0; i < n; i++) {
    const [a, b] = [pts[i], pts[(i + 1) % n]]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    B.quad(mat, [[a[0], a[1], z1], [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1]], [(b[1] - a[1]) / l, -(b[0] - a[0]) / l, 0], [[0, 0], [0, 0], [0, 0], [0, 0]], col)
  }
}

/**
 * Geometrie di un'auto lunga 4,2 m con il muso verso +x: scocca e tetto (da tingere per istanza),
 * e parti scure con colori di vertice (vetri, ruote, fari).
 * @returns {{ body: THREE.BufferGeometry, dark: THREE.BufferGeometry }}
 */
export function carGeometry() {
  const B = new Batch()
  const w = CAR.width / 2
  const white = [1, 1, 1]
  // profilo della scocca fino alla linea di cintura (poligono convesso, in senso antiorario)
  prism(B, 'body', [[-2.05, 0.3], [2.02, 0.3], [2.1, 0.52], [2.02, 0.78], [1.15, 0.9], [-1.55, 0.93], [-2.04, 0.86], [-2.1, 0.58]], -w, w, white)
  B.box('body', -0.95, 1.36, -w + 0.16, 0.5, 1.42, w - 0.16, { color: white }) // tetto
  const glass = rgb('#1b2128')
  prism(B, 'dark', [[-1.58, 0.92], [1.16, 0.9], [0.55, 1.37], [-0.98, 1.37]], -w + 0.1, w - 0.1, glass)
  const tyre = rgb('#17181a')
  const wheel = new THREE.CylinderGeometry(CAR.wheelR, CAR.wheelR, CAR.wheelW, 8, 1, false)
  for (const x of [-1.32, 1.3]) for (const s of [-1, 1]) {
    _m.makeRotationX(Math.PI / 2).setPosition(x, CAR.wheelR, s * (w - CAR.wheelW / 2 + 0.02))
    B.geo('dark', wheel, { m: _m, color: tyre })
  }
  for (const s of [-1, 1]) { // fari bianchi davanti, rossi dietro
    const z = s * (w - 0.36)
    B.quad('dark', [[2.105, 0.56, z + 0.2], [2.105, 0.56, z - 0.2], [2.105, 0.72, z - 0.2], [2.105, 0.72, z + 0.2]], [1, 0, 0], [[0, 0], [0, 0], [0, 0], [0, 0]], rgb('#e9eef2'))
    B.quad('dark', [[-2.105, 0.62, z - 0.2], [-2.105, 0.62, z + 0.2], [-2.105, 0.8, z + 0.2], [-2.105, 0.8, z - 0.2]], [-1, 0, 0], [[0, 0], [0, 0], [0, 0], [0, 0]], rgb('#8d1f1a'))
  }
  const g = B.geometries()
  return { body: g.get('body'), dark: g.get('dark') }
}

/**
 * Lampione: palo, braccio curvo verso +z e corpo della lanterna; la parte luminosa è una geometria a sé.
 * @param {number} h altezza del palo (m)
 * @returns {{ pole: THREE.BufferGeometry, head: THREE.BufferGeometry }}
 */
export function lampGeometry(h) {
  const B = new Batch()
  const c = [1, 1, 1]
  limb(B, 'pole', [0, 0, 0], [0, h, 0], 0.1, 0.065, c, 6)
  const arc = [[0, h, 0], [0, h + 0.45, 0.5], [0, h + 0.62, 1.2], [0, h + 0.6, 1.9]]
  for (let i = 0; i < 3; i++) limb(B, 'pole', arc[i], arc[i + 1], 0.05, 0.045, c, 5)
  B.box('pole', -0.16, h + 0.5, 1.6, 0.16, h + 0.64, 2.3, { color: c })
  B.box('head', -0.13, h + 0.44, 1.68, 0.13, h + 0.5, 2.22, { color: c })
  const g = B.geometries()
  return { pole: g.get('pole'), head: g.get('head') }
}

/** Scooter fermo sul cavalletto (pochi volumi), con il muso verso +x se `ry` = 0. */
export function scooter(S, x, y, z, ry, color) {
  _m.makeRotationY(ry).setPosition(x, y, z)
  const o = { m: _m.clone() }
  const B = S.F
  const M = S.M.plain
  B.box(M, -0.55, 0.3, -0.16, 0.45, 0.6, 0.16, { ...o, color })
  B.box(M, 0.38, 0.3, -0.19, 0.6, 1.0, 0.19, { ...o, color })
  B.box(M, -0.6, 0.6, -0.15, 0.1, 0.78, 0.15, { ...o, color: '#1c1c1e' })
  B.box(M, 0.42, 1.0, -0.3, 0.52, 1.06, 0.3, { ...o, color: '#2a2a2c' })
  for (const wx of [-0.58, 0.66]) B.box(M, wx - 0.2, 0, -0.06, wx + 0.2, 0.4, 0.06, { ...o, color: '#151517' })
}

/** Cassonetto con coperchio inclinato. */
export function dumpster(S, x, y, z, color) {
  const B = S.B
  B.box(S.M.plain, x - 0.75, y + 0.12, z - 0.5, x + 0.75, y + 1.05, z + 0.5, { color })
  B.box(S.M.plain, x - 0.8, y + 1.05, z - 0.55, x + 0.8, y + 1.2, z + 0.55, { color: shade(rgb(color), 0.7) })
}
