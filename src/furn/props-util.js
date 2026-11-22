/** Utilità condivise dagli oggetti d'appoggio (props-*.js): pose, ellissoidi a facce, steli, mazzi. */
import * as THREE from 'three'

/**
 * Posa un oggetto (posizione e rotazione Euler in radianti).
 * @param {THREE.Object3D} obj @param {number} [x] @param {number} [y] @param {number} [z]
 * @param {number} [rx] @param {number} [ry] @param {number} [rz]
 * @returns {THREE.Object3D} lo stesso oggetto
 */
export function at(obj, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  obj.position.set(x, y, z)
  obj.rotation.set(rx, ry, rz)
  return obj
}

/**
 * Ellissoide a facce (icosaedro, 20 triangoli) centrato in (x, y, z).
 * @param {number} r raggio @param {THREE.Material} mat @param {number} x @param {number} y @param {number} z
 * @param {number[]} [s] scala [sx, sy, sz] @param {number} [ry] rotazione attorno a y
 * @returns {THREE.Mesh}
 */
export function blob(r, mat, x, y, z, s = [1, 1, 1], ry = 0) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat)
  m.scale.set(s[0], s[1], s[2])
  return at(m, x, y, z, 0, ry, 0)
}

/**
 * Ellissoide liscio a pochi segmenti, centrato in (x, y, z).
 * @param {number} r @param {THREE.Material} mat @param {number} x @param {number} y @param {number} z
 * @param {number[]} [s] scala @param {number} [w] segmenti orizzontali @param {number} [h] segmenti verticali
 * @returns {THREE.Mesh}
 */
export function ball(r, mat, x, y, z, s = [1, 1, 1], w = 6, h = 4) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), mat)
  m.scale.set(s[0], s[1], s[2])
  return at(m, x, y, z)
}

/**
 * Stelo a sezione quadra da `a` a `b` (tubo aperto di 8 triangoli).
 * @param {THREE.Material} mat @param {number} r raggio @param {THREE.Vector3} a @param {THREE.Vector3} b
 * @returns {THREE.Mesh}
 */
export function stemTo(mat, r, a, b) {
  const v = new THREE.Vector3().subVectors(b, a)
  const len = Math.max(v.length(), 1e-4)
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 4, 1, true), mat)
  m.position.copy(a).addScaledVector(v, 0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize())
  return m
}

/**
 * Mazzo di fiori su steli che partono da (0, y0, 0): corolle su una cupola, foglie lunghe alla base.
 * @param {() => number} rand generatore con seme (kit.rng)
 * @param {{n:number, spread:number, y0:number, rise:number, bloomR:number, blooms:THREE.Material[],
 *   stemMat:THREE.Material, leafMat:THREE.Material, leaves?:number, leafLen?:number, bloomScale?:number[]}} o
 * @returns {THREE.Group}
 */
export function bouquet(rand, o) {
  const g = new THREE.Group()
  const base = new THREE.Vector3(0, o.y0, 0)
  for (let i = 0; i < o.n; i++) {
    const a = rand() * Math.PI * 2 + i * 2.4
    const k = Math.sqrt((i + 0.5) / o.n)
    const p = new THREE.Vector3(
      Math.cos(a) * o.spread * k,
      o.y0 + o.rise * (1 - 0.55 * k * k) + rand() * o.rise * 0.2,
      Math.sin(a) * o.spread * k,
    )
    g.add(stemTo(o.stemMat, 0.0025, base, p))
    g.add(blob(o.bloomR * (0.8 + rand() * 0.4), o.blooms[i % o.blooms.length], p.x, p.y, p.z, o.bloomScale ?? [1, 0.8, 1], a))
  }
  for (let i = 0; i < (o.leaves ?? 0); i++) {
    const a = (i / o.leaves) * Math.PI * 2 + 0.6
    const tip = new THREE.Vector3(Math.cos(a) * o.spread * 1.5, o.y0 + (o.leafLen ?? o.rise * 0.7) * (0.7 + rand() * 0.3), Math.sin(a) * o.spread * 1.5)
    g.add(stemTo(o.leafMat, 0.006, base, tip))
  }
  return g
}

/**
 * Sagoma di una lancetta o di un dettaglio piatto nel piano xy, con base nell'origine, ruotata di `rz` attorno a z.
 * @param {THREE.Mesh} mesh @param {number} rz @returns {THREE.Group}
 */
export function pivotZ(mesh, rz) {
  const g = new THREE.Group()
  g.add(mesh)
  g.rotation.z = rz
  return g
}
