/** Kit arredi, forme di base. Convenzione: origine al centro della base, `at.y` = quota della base. Vedi kit.js. */
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

/**
 * Posiziona un oggetto con `at = { x, y, z, ry }` (metri; `ry` in radianti, tutti facoltativi).
 * @param {THREE.Object3D} obj @param {{x?:number,y?:number,z?:number,ry?:number}} [at]
 * @returns {THREE.Object3D} lo stesso oggetto
 */
export function place(obj, at) {
  obj.position.set(at?.x ?? 0, at?.y ?? 0, at?.z ?? 0)
  obj.rotation.y = at?.ry ?? 0
  return obj
}

/** Mesh da geometria con la base portata a y = 0. @param {THREE.BufferGeometry} geo @param {number} h altezza */
function onBase(geo, h, mat, at) {
  geo.translate(0, h / 2, 0)
  return place(new THREE.Mesh(geo, mat), at)
}

/**
 * Parallelepipedo.
 * @param {number} w larghezza x @param {number} h altezza @param {number} d profondità z
 * @param {THREE.Material} mat @param {object} [at] posa
 * @returns {THREE.Mesh}
 */
export function box(w, h, d, mat, at) {
  return onBase(new THREE.BoxGeometry(w, h, d), h, mat, at)
}

/**
 * Parallelepipedo con spigoli arrotondati di raggio `r` (RoundedBoxGeometry, 2 segmenti per angolo).
 * @param {number} w @param {number} h @param {number} d @param {number} r raggio, limitato a metà del lato minore
 * @param {THREE.Material} mat @param {object} [at]
 * @returns {THREE.Mesh}
 */
export function rbox(w, h, d, r, mat, at) {
  const rr = Math.max(Math.min(r, Math.min(w, h, d) / 2 - 1e-4), 1e-4)
  return onBase(new RoundedBoxGeometry(w, h, d, 2, rr), h, mat, at)
}

/**
 * Cilindro o tronco di cono.
 * @param {number} rTop @param {number} rBottom @param {number} h
 * @param {THREE.Material} mat @param {object} [at] @param {number} [segments=16]
 * @returns {THREE.Mesh}
 */
export function cyl(rTop, rBottom, h, mat, at, segments = 16) {
  return onBase(new THREE.CylinderGeometry(rTop, rBottom, h, segments), h, mat, at)
}

/**
 * Sfera appoggiata sulla base (il centro sta a `at.y + r`).
 * @param {number} r @param {THREE.Material} mat @param {object} [at]
 * @returns {THREE.Mesh}
 */
export function sphere(r, mat, at) {
  return onBase(new THREE.SphereGeometry(r, 16, 12), 2 * r, mat, at)
}

/**
 * Solido di rotazione attorno all'asse y.
 * @param {number[][]} profile `[[raggio, quota], ...]`, quote dalla base (non viene ricentrato)
 * @param {THREE.Material} mat @param {object} [at] @param {number} [segments=20]
 * @returns {THREE.Mesh}
 */
export function lathe(profile, mat, at, segments = 20) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y))
  return place(new THREE.Mesh(new THREE.LatheGeometry(pts, segments), mat), at)
}

/**
 * Sagoma 2D estrusa lungo z, centrata in x e z, con il minimo di y a 0.
 * @param {number[][]} outline `[[x, y], ...]`
 * @param {number} depth spessore lungo z @param {THREE.Material} mat @param {object} [at]
 * @param {{curve?: boolean, bevel?: number}} [opts] `curve`: punti come curva morbida chiusa; `bevel`: smusso in metri
 * @returns {THREE.Mesh}
 */
export function extrude(outline, depth, mat, at, opts = {}) {
  const shape = new THREE.Shape()
  const [first, ...rest] = outline.map(([x, y]) => new THREE.Vector2(x, y))
  shape.moveTo(first.x, first.y)
  if (opts.curve) shape.splineThru([...rest, first])
  else rest.forEach((p) => shape.lineTo(p.x, p.y))
  const b = opts.bevel ?? 0
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: 12,
  })
  geo.computeBoundingBox()
  const bb = geo.boundingBox
  geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2)
  return place(new THREE.Mesh(geo, mat), at)
}

/**
 * Tubo lungo una curva 3D morbida (Catmull-Rom) per volute, bracci, ferro battuto.
 * I punti sono già nello spazio dell'oggetto.
 * @param {number[][]} points `[[x, y, z], ...]` (almeno 2)
 * @param {number} radius @param {THREE.Material} mat
 * @param {{segments?: number, radial?: number, closed?: boolean}} [opts]
 * @returns {THREE.Mesh}
 */
export function tube(points, radius, mat, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), opts.closed ?? false)
  const seg = opts.segments ?? Math.max(points.length * 8, 12)
  return new THREE.Mesh(new THREE.TubeGeometry(curve, seg, radius, opts.radial ?? 8, opts.closed ?? false), mat)
}

/**
 * Generatore pseudo-casuale con seme (mulberry32).
 * @param {number|string} seed
 * @returns {() => number} restituisce numeri in [0, 1)
 */
export function rng(seed) {
  let h = 1779033703
  const s = String(seed)
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
