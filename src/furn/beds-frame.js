/** Telaio del letto: giroletto, testiera e pediera nei tre stili. */
import * as THREE from 'three'
import { rboxLo } from './beds-util.js'

export const FRAME_Y = 0.32 // piano del telaio (cima del giroletto)
const HEAD_T = 0.07 // spessore della testiera
const FOOT_T = 0.05

/** Bordo superiore a colpo di frusta: quota in funzione di x in [-w/2, w/2]. */
function whip(w, base, rise, x) {
  const u = (x + w / 2) / w
  const p = Math.pow(u, 0.8)
  return base + rise * (0.82 * Math.sin(Math.PI * p) + 0.18 * Math.sin(2 * Math.PI * p))
}

function whipOutline(w, y0, base, rise, inset = 0) {
  const pts = [[-w / 2 + inset, y0], [w / 2 - inset, y0]]
  const n = 20
  const x0 = w / 2 - inset
  for (let i = 0; i <= n; i++) {
    const x = x0 - (i / n) * 2 * x0
    pts.push([x, whip(w, base, rise, x)])
  }
  return pts
}

/**
 * Giroletto, piedini, testiera e pediera.
 * @param {object} env @param {number} w larghezza @param {number} d profondità @param {number} hh altezza della testiera
 * @returns {THREE.Group}
 */
export function bedFrame(env, w, d, hh) {
  const { kit, mat, shape, style } = env
  const g = new THREE.Group()
  const wood = mat('wood.primary')
  const dark = mat('wood.dark')
  const accent = mat('fabric.bedAccent')
  const zh = -d / 2 + HEAD_T / 2
  const zf = d / 2 - FOOT_T / 2
  const legMat = shape.legs === 'dritte_sottili_metallo' ? mat('black') : wood
  g.add(kit.legs4(shape.legs, w, d, 0.12, legMat, 0.07))
  g.add(rboxLo(w, FRAME_Y - 0.12, d - 0.01, style === 'liberty' ? 0.02 : 0.006, wood, { y: 0.12 }))

  if (shape.bedHead === 'sagomata_con_intaglio') {
    g.add(kit.extrude(whipOutline(w, 0.1, hh - 0.34, 0.34), HEAD_T, wood, { y: 0, z: zh }, { bevel: 0.006 }))
    g.add(kit.extrude(whipOutline(w, 0.5, hh - 0.46, 0.3, 0.1), 0.05, accent, { y: 0, z: zh + 0.035 }))
    g.add(kit.cyl(0.04, 0.04, 0.1, dark, { x: -w / 2 + 0.05, y: hh - 0.34, z: zh }, 12))
    g.add(kit.cyl(0.04, 0.04, 0.1, dark, { x: w / 2 - 0.05, y: hh - 0.34, z: zh }, 12))
    g.add(kit.extrude(whipOutline(w, 0.12, 0.28, 0.22), FOOT_T, wood, { y: 0, z: zf }, { bevel: 0.005 }))
    g.add(kit.extrude(whipOutline(w, 0.16, 0.22, 0.14, 0.08), 0.03, accent, { y: 0, z: zf - 0.03 }))
  } else if (shape.bedHead === 'pannello_imbottito') {
    g.add(kit.rbox(w, hh - 0.12, HEAD_T + 0.03, 0.025, accent, { y: 0.12, z: zh + 0.015 }))
    g.add(kit.box(w, 0.1, FOOT_T, mat('black'), { y: 0.1, z: zf }))
    g.add(kit.rbox(w - 0.02, 0.18, FOOT_T, 0.01, wood, { y: 0.28, z: zf }))
  } else {
    const slats = Math.round(w / 0.12)
    g.add(kit.box(w, 0.07, HEAD_T, wood, { y: hh - 0.07, z: zh }))
    g.add(kit.box(w, 0.07, HEAD_T, wood, { y: 0.3, z: zh }))
    for (let i = 0; i < slats; i++) {
      const x = ((i + 0.5) / slats - 0.5) * (w - 0.1)
      g.add(kit.cyl(0.018, 0.018, hh - 0.37, wood, { x, y: 0.37, z: zh }, 8))
    }
    for (const s of [-1, 1]) g.add(kit.rbox(0.06, hh, HEAD_T, 0.02, wood, { x: s * (w / 2 - 0.03), y: 0.1, z: zh }))
    g.add(kit.rbox(w - 0.02, 0.2, FOOT_T, 0.02, wood, { y: 0.28, z: zf }))
  }
  return g
}

/** Misure del materasso dentro l'ingombro: `[larghezza, lunghezza]` e inizio in z. */
export function mattressBox(item, d) {
  const [mw0, ml0] = item.opts?.mattress ?? [item.size[0] - 0.1, item.size[1] - 0.05]
  const z0 = -d / 2 + HEAD_T
  const len = Math.min(ml0, d - HEAD_T - 0.02)
  return { mw: Math.min(mw0, item.size[0] - 0.06), z0, len }
}
