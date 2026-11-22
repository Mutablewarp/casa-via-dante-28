/** Biancheria del letto rifatto: materasso, lenzuolo risvoltato, copriletto, guanciali, cuscini, plaid. */
import * as THREE from 'three'
import { rboxLo } from './beds-util.js'

const MATT_H = 0.24

/**
 * Cilindro orizzontale lungo x (per risvolti e pieghe).
 * @param {number} r @param {number} len @param {THREE.Material} m @param {number} y centro @param {number} z
 * @returns {THREE.Mesh}
 */
function rollX(r, len, m, y, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), m)
  mesh.rotation.z = Math.PI / 2
  mesh.position.set(0, y, z)
  return mesh
}

/**
 * Letto rifatto sopra il telaio.
 * @param {object} env @param {number} yBase quota del piano del telaio @param {number} mw larghezza materasso
 * @param {number} z0 inizio materasso (testa) @param {number} len lunghezza materasso
 * @returns {THREE.Group} otto pezzi di biancheria
 */
export function makeLinen(env, yBase, mw, z0, len) {
  const { kit, mat } = env
  const g = new THREE.Group()
  const z1 = z0 + len
  const top = yBase + MATT_H
  const linen = mat('fabric.linen')
  const cover = mat('fabric.bed')
  const soft = env.style === 'liberty' ? 0.05 : 0.03

  g.add(rboxLo(mw, MATT_H, len, soft, linen, { y: yBase }))
  // copriletto: piano + cadute sui lati e ai piedi
  const cz0 = z0 + 0.5
  const cl = z1 - cz0 + 0.005
  const cx = mw / 2 + 0.02
  g.add(rboxLo(mw + 0.03, 0.05, cl, 0.015, cover, { y: top - 0.005, z: (cz0 + z1) / 2 }))
  for (const s of [-1, 1]) g.add(kit.box(0.035, 0.34, cl, cover, { x: s * cx, y: top - 0.33, z: (cz0 + z1) / 2 }))
  g.add(kit.box(mw + 0.07, 0.3, 0.035, cover, { y: top - 0.29, z: z1 - 0.01 }))
  // lenzuolo risvoltato con piega arrotolata
  g.add(rboxLo(mw + 0.01, 0.03, 0.3, 0.012, linen, { y: top + 0.04, z: cz0 + 0.1 }))
  g.add(rollX(0.026, mw + 0.01, cover, top + 0.055, cz0 + 0.27))
  // due guanciali appoggiati alla testiera
  const pw = Math.min(0.66, (mw - 0.14) / 2)
  for (const s of [-1, 1]) {
    const p = kit.cushion(pw, 0.4, 0.16, linen, { x: s * (pw / 2 + 0.03), y: top + 0.02, z: z0 + 0.26 })
    p.rotation.x = -0.18
    g.add(p)
  }
  // due cuscini decorativi davanti ai guanciali
  const cs = Math.min(0.46, mw * 0.27)
  const decor = [mat('fabric.cushionA'), mat('fabric.cushionB')]
  ;[-1, 1].forEach((s, i) => {
    const c = kit.cushion(cs, cs * 0.9, 0.13, decor[i], { x: s * mw * 0.2, y: top + 0.05, z: z0 + 0.66 })
    c.rotation.x = -1.0
    g.add(c)
  })
  // plaid piegato in due ai piedi
  const plaid = mat('fabric.bedAccent')
  g.add(rboxLo(mw * 0.8, 0.045, 0.4, 0.015, plaid, { y: top + 0.04, z: z1 - 0.28 }))
  g.add(rboxLo(mw * 0.8 - 0.02, 0.03, 0.38, 0.012, plaid, { y: top + 0.085, z: z1 - 0.28 }))
  return g
}
