/** Piante (E3): foglie a sagoma, gruppi di foglie fusi in una sola geometria, fronde e chiome. Convenzioni in kit.js. */
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const Y = new THREE.Vector3(0, 1, 0)
const DOWN = new THREE.Vector3(0, -1, 0)
const cache = new Map()

/**
 * Foglia a nastro lungo +y, che si piega verso +z; visibile da entrambi i lati (due serie di triangoli).
 * @param {number} len lunghezza @param {number} wid larghezza massima @param {number} [bend=0.6] angolo totale di piega in radianti
 * @param {number} [segs=2] segmenti @param {'oval'|'lance'} [profile='oval'] `lance`: larga alla base, a punta
 * @returns {THREE.BufferGeometry} non indicizzata (position, normal, uv); in cache, da non liberare
 */
export function leafGeo(len, wid, bend = 0.6, segs = 2, profile = 'oval') {
  const key = [len, wid, bend, segs, profile].join('|')
  if (cache.has(key)) return cache.get(key)
  const rows = []
  let y = 0
  let z = 0
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    if (i > 0) {
      const a = bend * t
      y += Math.cos(a) * (len / segs)
      z += Math.sin(a) * (len / segs)
    }
    const hw = (wid / 2) * (profile === 'oval' ? Math.pow(Math.sin(Math.PI * t), 0.8) : 1 - Math.pow(t, 1.6))
    rows.push([hw < 1e-4 ? 0 : hw, y, z])
  }
  const pos = []
  const tri = (a, b, c) => pos.push(...a, ...b, ...c)
  for (let i = 0; i < segs; i++) {
    const [h0, y0, z0] = rows[i]
    const [h1, y1, z1] = rows[i + 1]
    const L0 = [-h0, y0, z0], R0 = [h0, y0, z0], L1 = [-h1, y1, z1], R1 = [h1, y1, z1]
    if (h0 > 0) { tri(L0, R0, R1); tri(L0, R1, R0) }
    if (h1 > 0) { tri(L0, R1, L1); tri(L0, L1, R1) }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2))
  g.computeVertexNormals()
  cache.set(key, g)
  return g
}

/** Libera le foglie in cache (da chiamare solo allo scarico dell'intera scena). */
export function disposeLeafCache() {
  for (const g of cache.values()) g.dispose()
  cache.clear()
}

/** Quaternione che porta +y su `d` e la piega (+z locale) verso `bendDir` (proiettata perpendicolare a `d`). */
function orient(d, bendDir) {
  const z = bendDir.clone().addScaledVector(d, -bendDir.dot(d))
  if (z.lengthSq() < 1e-6) return new THREE.Quaternion().setFromUnitVectors(Y, d)
  z.normalize()
  const x = new THREE.Vector3().crossVectors(d, z)
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, d, z))
}

/** Raccolta di geometrie con la loro posa, fuse in una sola mesh. */
export class Cluster {
  constructor() { this.geos = [] }

  /** Aggiunge una geometria con posizione, direzione `dir` (+y locale), verso della piega e scala. */
  put(geo, pos, dir, bendDir = DOWN, scale = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone()
    const m = new THREE.Matrix4().compose(pos, orient(dir.clone().normalize(), bendDir), new THREE.Vector3(scale, scale, scale))
    g.applyMatrix4(m)
    this.geos.push(g)
  }

  /** Aggiunge una sfera o un ellissoide già non indicizzato nel punto `pos`. */
  blob(r, pos, sy = 1, detail = [6, 4], sz = 1) {
    const g = new THREE.SphereGeometry(r, detail[0], detail[1]).toNonIndexed()
    g.scale(1, sy, sz)
    g.translate(pos.x, pos.y, pos.z)
    this.geos.push(g)
  }

  /** Mesh fusa con il materiale dato (senza ombra), o `null` se vuota. */
  mesh(mat) {
    if (!this.geos.length) return null
    const geo = mergeGeometries(this.geos)
    this.geos.forEach((g) => g.dispose())
    this.geos = []
    const m = new THREE.Mesh(geo, mat)
    m.userData.noShadow = true
    return m
  }
}

/** Direzione unitaria uniforme sul semi-ellissoide con `n` punti spirale (Fibonacci), `i` da 0 a `n - 1`. */
export function fib(i, n, upOnly = false) {
  const k = upOnly ? (i + 0.5) / n : (i + 0.5) / n * 2 - 1
  const r = Math.sqrt(Math.max(0, 1 - k * k))
  const a = i * 2.399963
  return new THREE.Vector3(Math.cos(a) * r, upOnly ? 1 - k * 1.2 : k, Math.sin(a) * r).normalize()
}

/**
 * Fronda arcuata: nervatura e coppie di foglioline lungo un arco che sale e ricade.
 * @param {Cluster} cl @param {() => number} rnd generatore con seme
 * @param {{base: THREE.Vector3, az: number, reach: number, rise: number, drop: number, peak?: number, droop?: number, pairs: number, leafLen: number, leafW: number, bend?: number}} o
 */
export function frond(cl, rnd, o) {
  const out = new THREE.Vector3(Math.cos(o.az), 0, Math.sin(o.az))
  const side = new THREE.Vector3(-out.z, 0, out.x)
  const raw = (t) => o.rise * (1 - (1 - t) ** 2) - o.drop * t ** 3
  let top = 1e-3
  for (let i = 0; i <= 20; i++) top = Math.max(top, raw(i / 20))
  const k = o.peak ? o.peak / top : 1
  const P = (t) => o.base.clone().addScaledVector(out, o.reach * t).add(new THREE.Vector3(0, raw(t) * k, 0))
  const T = (t) => P(Math.min(1, t + 0.02)).sub(P(Math.max(0, t - 0.02))).normalize()
  for (let i = 0; i < 6; i++) cl.put(leafGeo(P(i / 6).distanceTo(P((i + 1) / 6)) * 1.05, 0.02, 0, 1, 'lance'), P(i / 6), T((i + 0.5) / 6), DOWN)
  for (let j = 0; j < o.pairs; j++) {
    const t = 0.18 + (0.82 * j) / Math.max(1, o.pairs - 1)
    const L = o.leafLen * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)))
    const tan = T(t)
    for (const s of [-1, 1]) {
      const phi = 1.05 + (rnd() - 0.5) * 0.3
      const d = tan.clone().multiplyScalar(Math.cos(phi)).addScaledVector(side, s * Math.sin(phi)).addScaledVector(DOWN, (o.droop ?? 0.3) + rnd() * 0.15).normalize()
      cl.put(leafGeo(L, o.leafW, o.bend ?? 0.7, 1, 'lance'), P(t), d, DOWN)
    }
  }
}

/**
 * Riduce in x e z (mai in y) tutte le geometrie dei gruppi di `list` perché stiano in `hx` e `hz` dall'asse.
 * @param {Cluster[]} list @param {number} hx @param {number} hz semiampiezze consentite
 */
export function fitXZ(list, hx, hz, cx = 0) {
  const box = new THREE.Box3()
  for (const cl of list) for (const g of cl.geos) { g.computeBoundingBox(); box.union(g.boundingBox) }
  if (box.isEmpty()) return
  const sx = Math.min(1, hx / Math.max(box.max.x - cx, cx - box.min.x, 1e-3))
  const sz = Math.min(1, hz / Math.max(box.max.z, -box.min.z, 1e-3))
  if (sx === 1 && sz === 1) return
  for (const cl of list) for (const g of cl.geos) { g.translate(-cx, 0, 0); g.scale(sx, 1, sz); g.translate(cx, 0, 0) }
}

/**
 * Chioma tonda di foglie su un ellissoide.
 * @param {Cluster} cl @param {() => number} rnd @param {{c: THREE.Vector3, r: number, sy?: number, n: number, len: number, wid: number}} o
 */
export function ball(cl, rnd, o) {
  for (let i = 0; i < o.n; i++) {
    const d = fib(i, o.n)
    const p = o.c.clone().add(new THREE.Vector3(d.x * o.r, d.y * o.r * (o.sy ?? 1), d.z * o.r).multiplyScalar(0.8 + rnd() * 0.2))
    const s = 0.85 + rnd() * 0.3
    cl.put(leafGeo(o.len, o.wid, 0.7, 2), p, d, DOWN, s)
  }
}
