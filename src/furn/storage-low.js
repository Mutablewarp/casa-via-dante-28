/** Credenza e cassettone: fronte bombato in Liberty, sospesi in Moderno, su gambe coniche in Scandinavo (E2). */
import * as THREE from 'three'
import { edgeR, handle, feet } from './storage-util.js'

/**
 * Corpo con fronte bombato: sagoma in pianta estrusa in verticale. Il punto più avanzato è al centro.
 * @param {object} kit @param {number} w @param {number} d profondità totale @param {number} bulge sporgenza @param {number} hgt altezza
 * @param {THREE.Material} m @param {number} y0 quota della base @param {number} zf quota z del punto più avanzato
 * @returns {THREE.Mesh}
 */
function bombe(kit, w, d, bulge, hgt, m, y0, zf) {
  const pts = []
  const n = 16
  const hw = w / 2
  for (let i = 0; i <= n; i++) {
    const x = -hw + (2 * hw * i) / n
    pts.push([x, bulge * (x / hw) ** 2])
  }
  pts.push([hw, d], [-hw, d])
  const mesh = kit.extrude(pts, hgt, m)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, y0 + hgt / 2, zf)
  return mesh
}

/** Quota z del fronte del corpo a distanza x dal centro. */
const frontZ = (d, bulge, x, hw) => d / 2 - 0.015 - bulge * (x / hw) ** 2

/** Credenza: tre ante (Liberty bombata con piano in marmo, Moderno sospesa, Scandinavo su gambe). */
export function sideboard(item, env) {
  const [w, d, h0] = item.size
  const { kit, mat, style } = env
  const lib = style === 'liberty'
  const h = h0 > 1.2 ? 0.95 : h0 // retype di sal_vetrina
  const g = new THREE.Group()
  const wood = mat('wood.primary')
  const front = style === 'scandinavo' ? mat('wood.painted') : wood
  const leg = style === 'moderno' ? 0.2 : lib ? 0.14 : 0.2
  const bulge = lib ? 0.035 : 0
  const bodyH = h - leg - (lib ? 0.03 : 0)
  if (lib) {
    g.add(feet(env, w, d, leg, 0.06))
    g.add(bombe(kit, w - 0.03, d - 0.03, bulge, bodyH, wood, leg, d / 2 - 0.015))
    g.add(bombe(kit, w, d, bulge, 0.03, mat('stone.top'), h - 0.03, d / 2))
  } else {
    if (style === 'scandinavo') g.add(feet(env, w, d, leg, 0.07))
    g.add(kit.rbox(w, bodyH, d, edgeR(env, 0.02), wood, { y: leg }))
  }
  const n = Math.max(3, Math.round(w / 0.62))
  const dw = (w - 0.06) / n
  const hw = w / 2
  for (let i = 0; i < n; i++) {
    const x = -hw + 0.03 + dw * (i + 0.5)
    const z = lib ? frontZ(d, bulge, x, hw) - 0.002 : d / 2 - 0.01
    const fh = bodyH - 0.1
    if (lib) g.add(kit.panel(dw - 0.015, fh, 0.02, wood, { x, y: leg + 0.05, z }))
    else g.add(kit.rbox(dw - 0.008, fh, 0.02, edgeR(env, 0.012), front, { x, y: leg + 0.05, z }))
    const hx = x + (i % 2 ? -1 : 1) * (dw / 2 - 0.05)
    g.add(handle(env, hx, leg + bodyH * 0.6, z + (lib ? 0.0155 : 0.01), 0.14, false))
  }
  g.userData.top = { y: h, w: w - 0.04, d: d - 0.04 }
  return kit.finalize(g, item)
}

/** Cassettone a quattro cassetti. */
export function chest(item, env) {
  const [w, d, h] = item.size
  const { kit, mat, style } = env
  const lib = style === 'liberty'
  const g = new THREE.Group()
  const wood = mat('wood.primary')
  const front = style === 'scandinavo' ? mat('wood.painted') : wood
  const leg = style === 'moderno' ? 0.15 : lib ? 0.12 : 0.18
  const bulge = lib ? 0.03 : 0
  const topT = lib ? 0.03 : 0
  const bodyH = h - leg - topT
  if (lib) {
    g.add(feet(env, w, d, leg, 0.06))
    g.add(bombe(kit, w - 0.03, d - 0.03, bulge, bodyH, wood, leg, d / 2 - 0.015))
    g.add(bombe(kit, w, d, bulge, topT, mat('stone.top'), h - topT, d / 2))
  } else {
    if (style === 'scandinavo') g.add(feet(env, w, d, leg, 0.07))
    g.add(kit.rbox(w, bodyH, d, edgeR(env, 0.02), wood, { y: leg }))
  }
  const rows = 4
  const hw = w / 2
  const dh = (bodyH - 0.06) / rows
  for (let i = 0; i < rows; i++) {
    const y = leg + 0.03 + dh * i
    const z = lib ? frontZ(d, bulge, 0, hw) - 0.002 : d / 2 - 0.01
    if (lib) g.add(kit.panel(w - 0.07, dh - 0.012, 0.02, wood, { y, z }))
    else g.add(kit.rbox(w - 0.03, dh - 0.01, 0.02, edgeR(env, 0.012), front, { y, z }))
    const two = lib || style === 'scandinavo'
    for (const sx of two ? [-1, 1] : [0]) g.add(handle(env, sx * w * 0.28, y + dh * (two ? 0.5 : 0.8), z + (lib ? 0.0155 : 0.01), 0.3, false))
  }
  g.userData.top = { y: h, w: w - 0.04, d: d - 0.04 }
  return kit.finalize(g, item)
}
