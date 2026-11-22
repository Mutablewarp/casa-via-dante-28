/** Cucina (E3): `kitchen_base_run` e registrazione degli altri mobili di cucina e lavanderia. */
import * as THREE from 'three'
import * as kit from './kit.js'
import { styleCtx, baseModule, rangeModule, sinkModule, hood, wallCabinet, backsplash } from './kitchen-parts.js'
import { buildIsland, buildPlateRack, buildFridge } from './kitchen-misc.js'
import { buildWasher, buildLaundrySink } from './kitchen-laundry.js'

const FIXED = { range: 0.9, sink: 0.8 }
const DEFAULT_TILE = 'piastrella_bianca'

/** Posizione e larghezza di ogni modulo, da sinistra, in proporzione a `W`. */
function layout(modules, W) {
  const nBase = modules.filter((t) => t === 'base').length
  const used = modules.reduce((s, t) => s + (FIXED[t] ?? 0), 0)
  const wb = nBase ? Math.max((W - used) / nBase, 0.3) : 0
  const widths = modules.map((t) => FIXED[t] ?? wb)
  const k = W / widths.reduce((a, b) => a + b, 0)
  let x = -W / 2
  return modules.map((type, i) => {
    const w = widths[i] * k
    const m = { type, w, x: x + w / 2 }
    x += w
    return m
  })
}

/** Costruttore di `kitchen_base_run`: basi, piano, alzata, cappa e pensili. */
function buildRun(item, env) {
  const [W, D, H] = item.size
  const o = item.opts ?? {}
  const c = styleCtx(env)
  const g = new THREE.Group()
  const mods = layout(o.modules ?? ['base'], W)
  g.add(kit.box(W, H - 0.04 - 0.1, D - 0.02, c.body, { y: 0.1, z: -0.01 }))
  g.add(kit.box(W - 0.02, 0.1, D - 0.05, c.plinth, { z: -0.025 }))
  for (const m of mods) {
    if (m.type === 'range') rangeModule(c, g, m, H, D)
    else if (m.type === 'sink') sinkModule(c, g, m, H, D)
    else baseModule(c, g, m, H, D)
  }
  const tile = env.ctx.currentStyle().wainscot?.[item.room]
  g.add(backsplash(c, W, D, H, tile ?? DEFAULT_TILE))
  for (const m of mods) {
    if (m.type === 'range' && o.hood) hood(c, g, m, H, D)
    else if (o.wallCabinets) wallCabinet(c, g, m, D)
  }
  g.userData.top = { y: H, w: W - 0.04, d: D - 0.04 }
  return kit.finalize(g, item)
}

/** @param {object} furn registro degli arredi */
export function register(furn) {
  furn.register('kitchen_base_run', buildRun)
  furn.register('kitchen_island', buildIsland)
  furn.register('plate_rack', buildPlateRack)
  furn.register('fridge_column', buildFridge)
  furn.register('washer_stack', buildWasher)
  furn.register('laundry_sink', buildLaundrySink)
}
