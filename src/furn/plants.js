/** Piante (E3): `plant` (vaso + specie) e `planter` (fioriera lunga). Vaso e fioriera cambiano con lo stile. */
import * as THREE from 'three'
import * as kit from './kit.js'
import { Cluster, fitXZ } from './plants-parts.js'
import * as sp from './plants-species.js'

const PLANT = { kentia: sp.kentia, ficus: sp.ficus, felce: (f, r, o) => sp.felce(f, r, o), limone_in_vaso: sp.limone, agave: sp.agave }
const hashSeed = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)

/** Gruppi di foglie, fiori e frutti di una pianta. */
function foliage() {
  return { leaf: new Cluster(), dark: new Cluster(), flA: new Cluster(), flB: new Cluster(), fruit: new Cluster() }
}

/** Aggiunge a `g` le mesh dei gruppi di `f` con i materiali di pianta. */
function addFoliage(g, f, mat, hx, hz) {
  fitXZ(Object.values(f), hx, hz)
  const pairs = [[f.leaf, 'plant.leaf'], [f.dark, 'plant.leafDark'], [f.flA, 'plant.flowerA'], [f.flB, 'plant.flowerB'], [f.fruit, 'fruit.lemon']]
  for (const [cl, tok] of pairs) {
    const m = cl.mesh(mat(tok))
    if (m) g.add(m)
  }
}

/** Vaso tondo di raggio `rad` e altezza `ph`; ritorna la quota del bordo. Liberty: bombato con piede; Moderno: cilindro; Scandinavo: tronco di cono su gambe. */
function pot(g, env, rad, ph, terrace) {
  const { style, mat } = env
  const body = style === 'liberty' ? (terrace ? mat('ceramic.white') : mat('ceramic.pot')) : mat('ceramic.white')
  let y0 = 0
  let prof
  if (style === 'liberty') {
    prof = [[0, 0], [0.5, 0], [0.55, 0.05], [0.48, 0.1], [0.82, 0.35], [1, 0.68], [0.94, 0.86], [1.02, 0.92], [1.02, 1], [0.9, 1]]
  } else if (style === 'moderno') {
    prof = [[0, 0], [0.97, 0], [1, 0.03], [1, 1], [0.92, 1]]
  } else {
    const lh = Math.min(0.2, ph * 0.7)
    for (const a of [0.4, 2.5, 4.6]) g.add(kit.cyl(0.012, 0.02, lh, mat('wood.primary'), { x: Math.cos(a) * rad * 0.55, y: 0, z: Math.sin(a) * rad * 0.55 }, 8))
    y0 = lh
    ph -= lh
    prof = [[0, 0], [0.7, 0], [1, 1], [0.92, 1]]
  }
  g.add(kit.lathe(prof.map(([r, t]) => [r * rad, t * ph]), body, { y: y0 }, 18))
  g.add(kit.cyl(rad * 0.88, rad * 0.88, 0.01, mat('black'), { y: y0 + ph * 0.92 }, 16))
  return y0 + ph * 0.93
}

/** Chiude il gruppo; le piante possono sporgere fino a 25 cm per lato (T2.3), quindi non segnala il margine di 8 cm di `finalize`. */
function close(g, item) {
  kit.finalize(g, item)
  const b = g.userData.bbox
  if (b && b[3] - b[0] <= item.size[0] + 0.3 && b[5] - b[2] <= item.size[1] + 0.3) delete g.userData.warning
  return g
}

/** `plant`: vaso più pianta secondo `opts.species`. */
function buildPlant(item, env) {
  const [w, d, h] = item.size
  const species = item.opts?.species ?? 'kentia'
  const rad = Math.min(w, d) / 2
  const terrace = item.room === 'terrazza'
  const ph = Math.min(Math.max(h * 0.2, 0.2), 0.36)
  const g = new THREE.Group()
  const y0 = pot(g, env, rad * 0.92, ph, terrace)
  const f = foliage()
  const o = { g, rad, y0, h: h - y0, w, mat: env.mat }
  ;(PLANT[species] ?? sp.kentia)(f, kit.rng(hashSeed(item.id)), o)
  addFoliage(g, f, env.mat, w / 2 + 0.15, d / 2 + 0.15)
  return close(g, item)
}

/** Fioriera lunga con feritoia di graticcio dietro, secondo lo stile. Ritorna la quota del terriccio. */
function trough(g, env, w, d, th) {
  const { style, mat } = env
  const body = style === 'scandinavo' ? mat('wood.primary') : style === 'moderno' ? mat('ceramic.white') : mat('ceramic.pot')
  g.add(kit.rbox(w, th, d, 0.015, body, { y: style === 'scandinavo' ? 0.08 : 0 }))
  if (style === 'liberty') {
    g.add(kit.box(w + 0.02, 0.04, d + 0.02, mat('ceramic.pot'), { y: th - 0.04 }))
    const n = Math.max(2, Math.round(w / 0.4))
    for (let i = 0; i < n; i++) g.add(kit.box(w / n * 0.7, th * 0.45, 0.012, mat('wood.dark'), { x: -w / 2 + (i + 0.5) * (w / n), y: th * 0.22, z: d / 2 + 0.004 }))
  }
  if (style === 'scandinavo') for (const sx of [-1, 1]) g.add(kit.cyl(0.015, 0.025, 0.08, mat('wood.primary'), { x: sx * (w / 2 - 0.08), z: 0 }, 8))
  const ty = th + (style === 'scandinavo' ? 0.08 : 0)
  g.add(kit.box(w - 0.04, 0.012, d - 0.04, mat('black'), { y: ty - 0.03 }))
  return ty
}

/** Graticcio di listelli in legno scuro (Liberty/Moderno in ferro). */
function trellis(g, env, w, h, y0, z0) {
  const m = env.style === 'scandinavo' ? env.mat('wood.primary') : env.mat('metal.iron')
  const cols = Math.max(3, Math.round(w / 0.2))
  for (let i = 0; i <= cols; i++) g.add(kit.box(0.012, h, 0.012, m, { x: -w / 2 + 0.03 + i * ((w - 0.06) / cols), y: y0, z: z0 }))
  for (let y = y0 + 0.15; y < y0 + h; y += 0.22) g.add(kit.box(w - 0.04, 0.01, 0.012, m, { y, z: z0 }))
}

const CLIMB = { bouganville: 'bract', gelsomino: 'jasmine' }
const LOW = { aromatiche: sp.aromatiche, felci: (f, r, o) => sp.felce(f, r, o, Math.max(2, Math.round(o.w / 0.4)), o.w - 0.1), agrumi: sp.agrumi }

/** `planter`: fioriera con `bouganville`, `gelsomino` (rampicanti su graticcio), `agrumi`, `aromatiche` o `felci`. */
function buildPlanter(item, env) {
  const [w, d, h] = item.size
  const species = item.opts?.species ?? 'aromatiche'
  const g = new THREE.Group()
  const th = Math.min(0.4, h * 0.3)
  const y0 = trough(g, env, w - 0.02, d - 0.02, th)
  const f = foliage()
  const rnd = kit.rng(hashSeed(item.id))
  const o = { g, rad: d / 2 - 0.02, y0, h: h - y0, w: w - 0.1, mat: env.mat }
  if (CLIMB[species]) {
    const z0 = -d / 2 + 0.05
    trellis(g, env, w - 0.08, h - y0, y0, z0)
    sp.climber(f, rnd, { w: w - 0.1, h: h - y0 - 0.2, z0: z0 + 0.02, y0 }, CLIMB[species] === 'bract' ? 'bract' : 'jasmine', CLIMB[species] === 'bract' ? f.flA : f.flB)
  } else (LOW[species] ?? sp.aromatiche)(f, rnd, o)
  addFoliage(g, f, env.mat, w / 2 + 0.04, d / 2 + 0.04)
  return close(g, item)
}

/** @param {object} furn registro degli arredi */
export function register(furn) {
  furn.register('plant', buildPlant)
  furn.register('planter', buildPlanter)
}
