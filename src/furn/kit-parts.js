/** Kit arredi, parti ricorrenti: gambe, cimasa, cuscino, anta. Convenzione dell'origine in kit.js. */
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { box, cyl, sphere, extrude, place } from './kit-base.js'

const smooth = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

/** Sagoma a S della gamba cabriole: ginocchio largo e in fuori, caviglia stretta, piedino in basso. */
function cabrioleOutline(h) {
  const n = 20
  const left = []
  const right = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const c = -0.1 * h * Math.sin(2 * Math.PI * t)
    const w = 0.012 + 0.014 * smooth(0.2, 1, t) + 0.012 * Math.max(0, 1 - t / 0.07)
    left.push([c - w, t * h])
    right.push([c + w, t * h])
  }
  return [...left, ...right.reverse()]
}

/**
 * Gamba nello stile indicato.
 * @param {'cabriole'|'dritte_sottili_metallo'|'coniche_legno'} style `shape.legs`; la cabriole si incurva lungo x locale
 * @param {number} h altezza @param {THREE.Material} mat @param {object} [at]
 * @returns {THREE.Mesh}
 */
export function leg(style, h, mat, at) {
  if (style === 'cabriole') return extrude(cabrioleOutline(h), 0.045, mat, at)
  if (style === 'dritte_sottili_metallo') return cyl(0.012, 0.012, h, mat, at, 8)
  return cyl(0.022, 0.012, h, mat, at, 10)
}

/**
 * Quattro gambe agli angoli di un rettangolo; le cabriole si incurvano verso l'esterno.
 * @param {string} style come `leg` @param {number} w larghezza x @param {number} d profondità z @param {number} h altezza gamba
 * @param {THREE.Material} mat @param {number} [inset=0.05] rientro dal bordo
 * @returns {THREE.Group}
 */
export function legs4(style, w, d, h, mat, inset = 0.05) {
  const g = new THREE.Group()
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const ry = Math.atan2(-sz, sx)
      g.add(leg(style, h, mat, { x: sx * (w / 2 - inset), z: sz * (d / 2 - inset), ry }))
    }
  }
  return g
}

/**
 * Cimasa a colpo di frusta: fascia larga `w` con bordo superiore a onda asimmetrica.
 * @param {number} w larghezza @param {number} h quanto il centro sale sopra i lati @param {number} t spessore lungo z
 * @param {THREE.Material} mat @param {object} [at]
 * @returns {THREE.Mesh}
 */
export function crest(w, h, t, mat, at) {
  const edge = Math.min(0.04, h * 0.5)
  const n = 40
  const outline = [[-w / 2, 0], [w / 2, 0]]
  for (let i = n; i >= 0; i--) {
    const u = i / n
    const p = Math.pow(u, 0.76)
    const y = edge + h * (0.85 * Math.sin(Math.PI * p) + 0.15 * Math.sin(2 * Math.PI * p))
    outline.push([(u - 0.5) * w, Math.max(y, edge * 0.5)])
  }
  return extrude(outline, t, mat, at)
}

/**
 * Cuscino bombato di altezza totale `h` (80% corpo, 20% bombatura); con `tufted` aggiunge i bottoni del capitonné.
 * Le normali restano quelle del parallelepipedo arrotondato.
 * @param {number} w @param {number} d @param {number} h @param {THREE.Material} mat @param {object} [at]
 * @param {boolean} [tufted=false] @returns {THREE.Mesh|THREE.Group} Mesh se liscio, Group se capitonné
 */
export function cushion(w, d, h, mat, at, tufted = false) {
  const core = h * 0.8
  const bulge = h - core
  const hw = w / 2
  const hd = d / 2
  const lift = (x, z) => bulge * Math.max(0, 1 - (x / hw) ** 2) * Math.max(0, 1 - (z / hd) ** 2)
  const geo = new RoundedBoxGeometry(w, core, d, 2, Math.min(core * 0.45, 0.04))
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const k = Math.max(0, pos.getY(i) / (core / 2))
    pos.setY(i, pos.getY(i) + lift(pos.getX(i), pos.getZ(i)) * k)
  }
  geo.translate(0, core / 2, 0)
  const body = new THREE.Mesh(geo, mat)
  if (!tufted) return place(body, at)

  const nx = Math.max(2, Math.round(w / 0.2))
  const nz = Math.max(2, Math.round(d / 0.2))
  const buttons = new THREE.InstancedMesh(new THREE.SphereGeometry(0.012, 8, 6), mat, nx * nz)
  const m = new THREE.Matrix4()
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const x = ((i + 0.5) / nx - 0.5) * w * 0.8
      const z = ((j + 0.5) / nz - 0.5) * d * 0.8
      buttons.setMatrixAt(i * nz + j, m.makeTranslation(x, core + lift(x, z) - 0.004, z))
    }
  }
  const g = new THREE.Group()
  g.add(body, buttons)
  return place(g, at)
}

/**
 * Anta o frontale con specchiatura in rilievo sul lato +z; centrata in x e z, base a y = 0.
 * @param {number} w @param {number} h @param {number} t spessore @param {THREE.Material} mat @param {object} [at]
 * @param {THREE.Material} [knob] materiale del pomolo (nessun pomolo se manca)
 * @returns {THREE.Group}
 */
export function panel(w, h, t, mat, at, knob) {
  const g = new THREE.Group()
  const m = Math.min(Math.min(w, h) * 0.14, 0.09)
  g.add(box(w, h, t, mat))
  g.add(box(w - 2 * m, h - 2 * m, t * 0.5, mat, { y: m, z: t / 2 }))
  if (knob) g.add(sphere(0.016, knob, { x: w / 2 - m * 0.55, y: h / 2 - 0.016, z: t * 0.75 }))
  return place(g, at)
}
