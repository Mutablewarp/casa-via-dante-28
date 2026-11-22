/** Aiuti condivisi dai mobili di E2: raggio dei bordi, maniglie, listelli di libri. */
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * Raggio degli spigoli secondo `shape.edges`.
 * @param {object} env ambiente del costruttore @param {number} [big=0.03] raggio per gli spigoli "arrotondati"
 * @returns {number}
 */
export function edgeR(env, big = 0.03) {
  const e = env.shape.edges
  return e === 'arrotondati' ? big : e === 'raggiati' ? big * 0.7 : 0.004
}

/**
 * Maniglia secondo `shape.handles`: pomolo in ottone, pomolo in legno o gola (barretta scura a filo).
 * @param {object} env @param {number} x @param {number} y centro @param {number} z filo anteriore
 * @param {number} [len=0.1] lunghezza della gola
 * @param {boolean} [vertical=false] orientamento della gola
 * @returns {THREE.Object3D}
 */
export function handle(env, x, y, z, len = 0.1, vertical = false) {
  const { kit, mat, shape } = env
  if (shape.handles === 'gola') {
    return vertical
      ? kit.box(0.012, len, 0.01, mat('black'), { x, y: y - len / 2, z })
      : kit.box(len, 0.012, 0.01, mat('black'), { x, y: y - 0.006, z })
  }
  const r = shape.handles === 'ottone' ? 0.017 : 0.02
  const m = shape.handles === 'ottone' ? mat('metal.accent') : mat('wood.secondary')
  return kit.sphere(r, m, { x, y: y - r, z: z + r * 0.6 })
}

/**
 * Piede a cipolla tornito per armadi e librerie Liberty.
 * @param {object} env @param {number} h altezza @param {object} at posa
 * @returns {THREE.Mesh}
 */
export function onionFoot(env, h, at) {
  const s = h / 0.12
  const prof = [[0.001, 0], [0.032, 0.008], [0.042, 0.04], [0.046, 0.07], [0.03, 0.1], [0.04, 0.112], [0.001, 0.12]]
  return env.kit.lathe(prof.map(([r, y]) => [r, y * s]), env.mat('wood.dark'), at, 14)
}

/**
 * Quattro piedini secondo lo stile: cabriole (Liberty), metallo sottile (Moderno), conici (Scandinavo).
 * @param {object} env @param {number} w @param {number} d @param {number} h @param {number} [inset=0.05]
 * @returns {THREE.Group}
 */
export function feet(env, w, d, h, inset = 0.05) {
  const m = env.shape.legs === 'dritte_sottili_metallo' ? env.mat('black') : env.mat('wood.primary')
  return env.kit.legs4(env.shape.legs, w, d, h, m, inset)
}

/**
 * Libri come listelli in una sola geometria, con il materiale `books` (UV in metri lungo il ripiano).
 * @param {{x0:number,x1:number,y:number,h:number,z:number,dz:number}[]} runs tratti: `y` base, `h` altezza, `z` centro, `dz` profondità
 * @param {() => number} rnd generatore a seme
 * @param {THREE.Material} bookMat materiale `books`
 * @returns {THREE.Mesh|null}
 */
export function bookStrips(runs, rnd, bookMat) {
  const geos = runs.filter((r) => r.x1 - r.x0 > 0.03).map((r) => {
    const w = r.x1 - r.x0
    const g = new THREE.BoxGeometry(w, r.h, r.dz)
    const uv = g.attributes.uv
    const u0 = rnd() * 8
    for (let i = 0; i < uv.count; i++) {
      if (i >= 16 && i < 20) uv.setXY(i, u0 + (i % 2 ? w : 0), i < 18 ? 1 : 0)
      else uv.setXY(i, u0 + w * 0.5, 0.5)
    }
    g.translate((r.x0 + r.x1) / 2, r.y + r.h / 2, r.z)
    return g
  })
  if (!geos.length) return null
  const m = new THREE.Mesh(mergeGeometries(geos), bookMat)
  geos.forEach((g) => g.dispose())
  m.userData.noShadow = true
  return m
}
