/** Attrezzi geometrici per i serramenti: scatole, matrici locali, mostre, accumulo per materiale. */
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const UP = new THREE.Vector3(0, 1, 0)

/**
 * Scatola non indicizzata centrata in (cx, cy, cz).
 * @param {number} w larghezza (x)
 * @param {number} h altezza (y)
 * @param {number} d profondità (z)
 * @returns {THREE.BufferGeometry}
 */
export function box(w, h, d, cx = 0, cy = 0, cz = 0) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed()
  g.translate(cx, cy, cz)
  return g
}

/** Cilindro con asse lungo z, centrato in (cx, cy, cz). */
export function cyl(r, len, cx = 0, cy = 0, cz = 0) {
  const g = new THREE.CylinderGeometry(r, r, len, 14).toNonIndexed()
  g.rotateX(Math.PI / 2)
  g.translate(cx, cy, cz)
  return g
}

/**
 * Matrice locale→mondo di un foro: x lungo il muro, y in alto, z lungo la normale (nx, nz).
 * @param {number} cx centro del foro in x
 * @param {number} cz centro del foro in z
 * @param {number} nx componente x della normale
 * @param {number} nz componente z della normale
 * @returns {THREE.Matrix4}
 */
export function frameMatrix(cx, cz, nx, nz) {
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(nz, 0, -nx), UP, new THREE.Vector3(nx, 0, nz))
  return m.setPosition(cx, 0, cz)
}

/**
 * Matrice locale→mondo di un'anta: x dal cardine alla punta, z di fianco, origine sul cardine.
 * @returns {{ m: THREE.Matrix4, len: number }}
 */
export function leafMatrix(hx, hz, tx, tz) {
  const len = Math.hypot(tx - hx, tz - hz)
  const ax = (tx - hx) / len
  const az = (tz - hz) / len
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(ax, 0, az), UP, new THREE.Vector3(-az, 0, ax))
  return { m: m.setPosition(hx, 0, hz), len }
}

/** Punti di un arco di ellisse (centro, semiassi, angoli in radianti), estremi inclusi. */
export function ellipsePts(cx, cy, a, b, a0, a1, n = 28) {
  const out = []
  for (let i = 0; i <= n; i++) {
    const t = a0 + ((a1 - a0) * i) / n
    out.push([cx + a * Math.cos(t), cy + b * Math.sin(t)])
  }
  return out
}

/** Sagoma estrusa lungo +z di `depth`, senza smusso. */
export function extrude(shape, depth, segs = 24) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: segs })
}

/** Sagoma poligonale da un elenco di punti [x, y]. */
export function polyShape(pts) {
  const s = new THREE.Shape()
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
  return s
}

/**
 * Mostra: anello attorno a un foro larghezza `w`, da y0 a y1, larga `bw`.
 * Con y0 = 0 è aperta in basso (porte). Gli angoli superiori esterni hanno raggio `r`.
 * @returns {THREE.Shape}
 */
export function surroundShape(w, y0, y1, bw, r) {
  const wi = w / 2
  const wo = wi + bw
  const yo = y1 + bw
  const s = new THREE.Shape()
  const top = () => {
    s.lineTo(wo, yo - r)
    if (r > 0) s.quadraticCurveTo(wo, yo, wo - r, yo)
    else s.lineTo(wo, yo)
    s.lineTo(-wo + r, yo)
    if (r > 0) s.quadraticCurveTo(-wo, yo, -wo, yo - r)
    else s.lineTo(-wo, yo)
  }
  if (y0 <= 0) {
    s.moveTo(-wo, 0)
    s.lineTo(-wi, 0)
    s.lineTo(-wi, y1)
    s.lineTo(wi, y1)
    s.lineTo(wi, 0)
    s.lineTo(wo, 0)
    top()
  } else {
    s.moveTo(-wo, y0 - bw)
    s.lineTo(wo, y0 - bw)
    top()
    const hole = new THREE.Path()
    hole.moveTo(-wi, y0)
    hole.lineTo(-wi, y1)
    hole.lineTo(wi, y1)
    hole.lineTo(wi, y0)
    hole.closePath()
    s.holes.push(hole)
  }
  s.closePath()
  return s
}

/** Riscrive le UV in metri mondo: u = coordinata lungo il muro, v = quota. */
export function setWorldUV(g, along) {
  const p = g.attributes.position
  const uv = new Float32Array(p.count * 2)
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = along === 'x' ? p.getX(i) : p.getZ(i)
    uv[i * 2 + 1] = p.getY(i)
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
}

/** Accumulatore: una mesh fusa per materiale. */
export function createBucket() {
  const map = new Map()
  return {
    /** Aggiunge una geometria già in coordinate mondo. */
    add(mat, g, cast = true) {
      let e = map.get(mat)
      if (!e) map.set(mat, (e = { geoms: [], cast }))
      e.geoms.push(g)
    },
    /** Fonde e aggiunge le mesh a `group`; svuota l'accumulatore. */
    flush(group, name, log) {
      for (const [mat, e] of map) {
        const g = mergeGeometries(e.geoms, false)
        e.geoms.forEach((x) => x.dispose())
        if (!g) { log.error(`openings: unione fallita per ${name}`); continue }
        const mesh = new THREE.Mesh(g, mat)
        mesh.name = name
        mesh.castShadow = e.cast
        // tutto ciò che è opaco riceve ombra: senza, il sole illumina battiscopa e cornici attraverso i muri
        mesh.receiveShadow = e.cast || !mat.transparent
        group.add(mesh)
      }
      map.clear()
    },
  }
}

/** Toglie dal gruppo le mesh figlie e ne libera le geometrie. */
export function clearGroup(group) {
  for (const c of [...group.children]) {
    group.remove(c)
    c.geometry?.dispose()
  }
}
