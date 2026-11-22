/** Utilità condivise da sedute e tavoli (E1): scelta per stile, cilindri orizzontali, piani sagomati, guscio ad arco. */
import * as THREE from 'three'

/**
 * Sceglie un valore secondo lo stile corrente.
 * @param {{style: string}} env @param {*} lib @param {*} mod @param {*} sc valori per liberty, moderno, scandinavo
 * @returns {*}
 */
export const pick = (env, lib, mod, sc) => (env.style === 'moderno' ? mod : env.style === 'scandinavo' ? sc : lib)

/**
 * Cilindro orizzontale centrato in `at` (a differenza di kit.cyl l'origine è il centro).
 * @param {number} rTop @param {number} rBot @param {number} len lunghezza @param {THREE.Material} mat
 * @param {{x?:number,y?:number,z?:number}} [at] @param {'x'|'z'} [axis='z'] @param {number} [seg=12]
 * @returns {THREE.Mesh}
 */
export function hcyl(rTop, rBot, len, mat, at = {}, axis = 'z', seg = 12) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, len, seg)
  if (axis === 'z') geo.rotateX(Math.PI / 2)
  else geo.rotateZ(Math.PI / 2)
  const m = new THREE.Mesh(geo, mat)
  m.position.set(at.x ?? 0, at.y ?? 0, at.z ?? 0)
  return m
}

/**
 * Contorno in pianta di un rettangolo arrotondato (superellisse): n = 2 ellisse, n alto quasi rettangolare.
 * @param {number} w @param {number} d @param {number} [n=4] @param {number} [steps=40] @returns {number[][]} `[[x, z], ...]`
 */
export function superRect(w, d, n = 4, steps = 40) {
  const pts = []
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    pts.push([(w / 2) * Math.sign(c) * Math.abs(c) ** (2 / n), (d / 2) * Math.sign(s) * Math.abs(s) ** (2 / n)])
  }
  return pts
}

/**
 * Piano orizzontale sagomato: contorno `[x, z]` estruso verso l'alto, base a y = 0.
 * @param {number[][]} outline @param {number} thick spessore @param {THREE.Material} mat @param {{x?:number,y?:number,z?:number}} [at]
 * @returns {THREE.Mesh}
 */
export function flat(outline, thick, mat, at = {}) {
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z)))
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 4 })
  geo.rotateX(Math.PI / 2)
  geo.translate(0, thick, 0)
  const m = new THREE.Mesh(geo, mat)
  m.position.set(at.x ?? 0, at.y ?? 0, at.z ?? 0)
  return m
}

/**
 * Guscio avvolgente ad arco aperto verso +z (schienale a conchiglia), con bordo superiore a onda.
 * @param {{rIn:number, thick:number, y0:number, span:number, top:(a:number)=>number, mat:THREE.Material, at?:object, seg?:number}} o
 *   `span` apertura in radianti; `top(a)` quota del bordo all'angolo `a` (0 = dietro, al centro)
 * @returns {THREE.Mesh}
 */
export function arcShell(o) {
  const rOut = o.rIn + o.thick
  const seg = o.seg ?? 18
  const build = (rev) => {
    let prof = [[o.rIn, o.y0], [o.rIn, 1], [rOut, 1], [rOut, o.y0]]
    if (rev) prof = prof.reverse()
    const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg, Math.PI - o.span / 2, o.span)
    const p = geo.attributes.position
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) > 0.999) p.setY(i, o.top(Math.atan2(p.getX(i), -p.getZ(i))))
    }
    geo.computeVertexNormals()
    return geo
  }
  let geo = build(false)
  // controllo dell'orientamento: la faccia esterna deve avere la normale verso fuori
  const p = geo.attributes.position
  const n = geo.attributes.normal
  let dot = 0
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(Math.hypot(p.getX(i), p.getZ(i)) - rOut) < 1e-4) dot += n.getX(i) * p.getX(i) + n.getZ(i) * p.getZ(i)
  }
  if (dot < 0) {
    geo.dispose()
    geo = build(true)
  }
  const m = new THREE.Mesh(geo, o.mat)
  m.position.set(o.at?.x ?? 0, o.at?.y ?? 0, o.at?.z ?? 0)
  return m
}
