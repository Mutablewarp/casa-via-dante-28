/** Piante (E3): una funzione per specie. Ogni funzione riempie i gruppi `f` (foglie, fiori, frutti) e può aggiungere tronchi a `o.g`. */
import * as THREE from 'three'
import * as kit from './kit.js'
import { leafGeo, frond, ball } from './plants-parts.js'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const UP = V(0, 1, 0)
const DOWN = V(0, -1, 0)

/** Un gruppo di foglie scelto a caso tra chiaro e scuro. */
const pick = (f, rnd) => (rnd() < 0.55 ? f.leaf : f.dark)

/** Tronco rastremato dal suolo fino a `top`, con lieve inclinazione. */
function trunk(o, top, r0, r1) {
  o.g.add(kit.cyl(r1, r0, top - o.y0, o.mat('wood.dark'), { y: o.y0 }, 7))
}

/** `kentia`: palma con fronde arcuate che escono dal centro del vaso. */
export function kentia(f, rnd, o) {
  const n = 10
  const H = o.h
  for (let i = 0; i < n; i++) {
    const hi = i % 3 === 0
    const reach = (hi ? o.rad * 0.5 : o.rad + 0.1) * (0.9 + rnd() * 0.2)
    const rise = H * (hi ? 0.85 : 0.6 + rnd() * 0.2)
    frond(pick(f, rnd), rnd, {
      base: V(0, o.y0 + 0.02, 0), az: (i / n) * Math.PI * 2 + rnd() * 0.4, reach, rise, peak: H * (hi ? 0.98 : 0.55 + rnd() * 0.15),
      drop: rise * (hi ? 0.35 : 0.9), pairs: 14, leafLen: 0.2, leafW: 0.05, droop: 0.08,
    })
  }
}

/** `ficus`: alberello con tronco sottile e chioma tonda. */
export function ficus(f, rnd, o) {
  const top = o.y0 + o.h * 0.5
  trunk(o, top, 0.025, 0.014)
  const len = Math.min(0.14, o.rad * 0.5)
  const R = Math.max(0.1, o.rad + 0.03 - len * 0.9)
  const Ry = (o.h - (top - o.y0)) * 0.5 - len * 0.5
  const c = V(0, top + Ry * 0.9, 0)
  f.leaf.blob(R * 0.8, c, Ry / R, [9, 6])
  ball(f.leaf, rnd, { c, r: R, sy: Ry / R, n: 60, len, wid: len * 0.5 })
  ball(f.dark, rnd, { c, r: R * 0.75, sy: Ry / R, n: 28, len: len * 0.9, wid: len * 0.4 })
}

/** `felce` e `felci`: ciuffi di fronde fitte che ricadono. */
export function felce(f, rnd, o, count = 1, spread = 0) {
  for (let k = 0; k < count; k++) {
    const cx = count === 1 ? 0 : -spread / 2 + (k + 0.5) * (spread / count)
    const reach = o.rad * (count === 1 ? 0.9 : 0.34)
    for (let i = 0; i < 13; i++) {
      const rise = o.h * (0.45 + rnd() * 0.3)
      frond(pick(f, rnd), rnd, {
        base: V(cx, o.y0 + 0.02, 0), az: (i / 13) * Math.PI * 2 + rnd() * 0.5, reach: reach * (0.7 + rnd() * 0.3), rise, peak: o.h * (0.6 + rnd() * 0.35),
        drop: rise * 1.1, pairs: 10, leafLen: 0.13, leafW: 0.04, bend: 0.5, droop: 0.15,
      })
    }
  }
}

/** Chioma di agrume: ellissoide di foglie con limoni gialli visibili sulla superficie. */
function citrusTree(f, rnd, o, cx, R, top, fruits, Ry = R * 0.85) {
  const c = V(cx, top + Ry * 0.85, 0)
  const len = Math.min(0.11, R * 0.7)
  f.leaf.blob(R * 0.78, c, Ry / R, [9, 6])
  ball(f.leaf, rnd, { c, r: R, sy: Ry / R, n: 44, len, wid: len * 0.5 })
  ball(f.dark, rnd, { c, r: R * 0.72, sy: Ry / R, n: 20, len: len * 0.9, wid: len * 0.4 })
  for (let i = 0; i < fruits; i++) {
    const d = V(rnd() * 2 - 1, rnd() * 1.2 - 0.5, rnd() * 2 - 1).normalize()
    f.fruit.blob(0.032, c.clone().add(V(d.x * R * 0.98, d.y * Ry * 0.98 - 0.02, d.z * R * 0.98)), 1.25)
  }
}

/** `limone_in_vaso`: alberello con tronco e chioma carica di limoni. */
export function limone(f, rnd, o) {
  const top = o.y0 + o.h * 0.38
  trunk(o, top, 0.02, 0.012)
  const R = Math.max(0.1, o.rad + 0.02)
  citrusTree(f, rnd, o, 0, R, top, 11, Math.max(R * 0.8, (o.h - (top - o.y0)) * 0.48))
}

/** `agrumi`: tre piccoli alberelli di agrume in una fioriera. */
export function agrumi(f, rnd, o) {
  const n = Math.max(2, Math.round(o.w / 0.4))
  for (let i = 0; i < n; i++) {
    const cx = -o.w / 2 + (i + 0.5) * (o.w / n)
    const top = o.y0 + o.h * 0.38
    o.g.add(kit.cyl(0.011, 0.017, top - o.y0, o.mat('wood.dark'), { x: cx, y: o.y0 }, 6))
    const R = Math.min(o.w / n * 0.5, o.rad * 0.9, 0.25)
    citrusTree(f, rnd, o, cx, R, top, 6, Math.max(R, (o.h - o.h * 0.38) * 0.5))
  }
}

/** `agave`: rosetta di foglie rigide a punta, dalle interne dritte alle esterne aperte. */
export function agave(f, rnd, o) {
  const rows = [[0.12, 1.15, 6], [0.4, 0.9, 8], [0.7, 0.62, 8], [1.05, 0.42, 6]]
  rows.forEach(([tilt, lenF, n], r) => {
    for (let i = 0; i < n; i++) {
      const az = (i / n) * Math.PI * 2 + r * 0.7 + rnd() * 0.2
      const out = V(Math.cos(az), 0, Math.sin(az))
      const len = Math.min(o.h * lenF, o.rad / Math.max(0.1, Math.sin(tilt)))
      const d = UP.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(out, Math.sin(tilt))
      const g = leafGeo(len, 0.08, 0.35, 3, 'lance')
      ;(r % 2 ? f.dark : f.leaf).put(g, V(out.x * 0.015, o.y0, out.z * 0.015), d, out.clone().multiplyScalar(-1).addScaledVector(UP, -0.3))
    }
  })
}

/** Masse rampicanti su graticcio: foglie e fiorellini (brattee fucsia o fiori bianchi) in un riquadro `w x h` a z = `z0`. */
export function climber(f, rnd, o, bloom, bloomMat) {
  const { w, h, z0, y0 } = o
  const nLeaf = Math.round(w * h * 110)
  const nBloom = Math.round(w * h * (bloom === 'bract' ? 260 : 160))
  const env = (u) => 0.72 + 0.28 * Math.sin(u * Math.PI * 3 + 0.8)
  const spot = () => {
    const u = rnd()
    const top = h * env(u)
    return V((u - 0.5) * (w - 0.1), y0 + 0.1 + rnd() * top, z0 + rnd() * 0.22)
  }
  for (let i = 0; i < Math.round(w * h * 7); i++) {
    const p = spot()
    ;(bloom === 'bract' && i % 2 ? bloomMat : f.dark).blob(0.05 + rnd() * 0.04, p, 0.8, [7, 5], 0.6)
  }
  for (let i = 0; i < nLeaf; i++) {
    const d = V(rnd() - 0.5, rnd() - 0.3, 1).normalize()
    pick(f, rnd).put(leafGeo(0.12, 0.06, 0.6, 2), spot(), d, DOWN, 0.8 + rnd() * 0.5)
  }
  for (let i = 0; i < nBloom; i++) {
    const d = V(rnd() - 0.5, rnd() - 0.2, 0.7 + rnd()).normalize()
    const [len, wid] = bloom === 'bract' ? [0.075, 0.06] : [0.035, 0.03]
    bloomMat.put(leafGeo(len, wid, 0.5, 1, 'lance'), spot().add(V(0, 0, 0.03)), d, DOWN, 0.8 + rnd() * 0.5)
  }
}

/** `aromatiche`: cespugli bassi a cupola lungo la fioriera, con qualche fiorellino. */
export function aromatiche(f, rnd, o) {
  const n = Math.max(3, Math.round(o.w / 0.28))
  for (let k = 0; k < n; k++) {
    const cx = -o.w / 2 + (k + 0.5) * (o.w / n)
    const R = Math.min(o.w / n * 0.5, o.rad * 0.95)
    f.dark.blob(R * 0.85, V(cx, o.y0 + 0.02, 0), (o.h * 0.65) / (R * 0.85), [8, 5])
    for (let i = 0; i < 42; i++) {
      const d = V(rnd() * 2 - 1, rnd() * 0.9, rnd() * 2 - 1).normalize()
      const p = V(cx + d.x * R * (0.6 + rnd() * 0.4), o.y0 + 0.02 + d.y * o.h * (0.7 + rnd() * 0.3), d.z * R * (0.6 + rnd() * 0.4))
      pick(f, rnd).put(leafGeo(0.07, 0.03, 0.5, 2), p, d, DOWN, 0.9 + rnd() * 0.5)
      if (i % 6 === 0) f.flB.put(leafGeo(0.025, 0.02, 0.4, 2), p, d, DOWN)
    }
  }
}
