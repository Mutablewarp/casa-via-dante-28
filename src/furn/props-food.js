/** Oggetti d'appoggio di cucina e sala: frutta, tagliere, erbe aromatiche, moka. Origine sul piano, fronte +z. */
import * as THREE from 'three'
import { at, blob, ball } from './props-util.js'

/** Coppa: su piede in ottone (Liberty), nera (Moderno) o in legno (Scandinavo). Restituisce la quota del bordo. */
function bowl(kit, mat, style, g, r) {
  if (style === 'liberty') {
    g.add(kit.lathe([[0.05, 0], [0.02, 0.015], [0.02, 0.05]], mat('metal.accent'), null, 10))
    g.add(kit.lathe([[0.03, 0], [r * 0.9, 0.05], [r, 0.075], [r - 0.006, 0.075]], mat('ceramic.white'), { y: 0.05 }, 10))
    return 0.125
  }
  const m = style === 'moderno' ? mat('black') : mat('wood.primary')
  g.add(kit.lathe([[0.04, 0], [r * 0.9, 0.05], [r, 0.075], [r - 0.006, 0.075]], m, null, 10))
  return 0.075
}

/** Coppa di frutta mista: limoni e pere verdi. */
function fruitBowl(opts, env) {
  const { kit, mat, style } = env
  const g = new THREE.Group()
  const top = bowl(kit, mat, style, g, 0.12)
  const lemon = mat('fruit.lemon')
  const pear = mat('plant.leaf')
  const y = top - 0.035
  ;[[0.06, 0], [0, 0.06], [-0.06, 0], [0, -0.06]].forEach(([x, z], i) => {
    g.add(ball(0.03, i % 2 ? pear : lemon, x, y, z, [1.1, 0.95, 1], 6, 4))
  })
  g.add(ball(0.029, lemon, 0.02, y + 0.04, 0.01, [1.2, 0.9, 1], 6, 4))
  g.add(ball(0.03, pear, -0.02, y + 0.035, -0.02, [1, 1.1, 1], 6, 4))
  return g
}

/** Coppa con otto limoni e due foglie. */
function fruitBowlLemons(opts, env) {
  const { kit, mat, style } = env
  const g = new THREE.Group()
  const top = bowl(kit, mat, style, g, 0.12)
  const lemon = mat('fruit.lemon')
  const y = top - 0.035
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    g.add(ball(0.028, lemon, Math.cos(a) * 0.065, y, Math.sin(a) * 0.065, [1.25, 0.95, 1], 5, 4).rotateY(-a))
  }
  ;[[0.025, 0.01], [-0.02, 0.02], [0, -0.025]].forEach(([x, z]) => g.add(ball(0.028, lemon, x, y + 0.04, z, [1.25, 0.95, 1], 5, 4)))
  g.add(blob(0.03, mat('plant.leaf'), 0.03, y + 0.065, 0.02, [1.6, 0.15, 0.8], 0.6))
  return g
}

/** Tagliere con pagnotta, baguette e coltello. */
function breadBoard(opts, env) {
  const { kit, mat } = env
  const g = new THREE.Group()
  const crust = mat('wicker')
  const steel = mat('metal.chrome')
  g.add(kit.box(0.4, 0.022, 0.22, mat('wood.primary')))
  g.add(kit.cyl(0.01, 0.01, 0.002, mat('wood.dark'), { x: 0.17, y: 0.022, z: -0.075 }, 8))
  g.add(ball(0.065, crust, -0.08, 0.022 + 0.03, 0.01, [1.2, 0.7, 0.85], 8, 5))
  const baguette = kit.cyl(0.026, 0.026, 0.3, crust, null, 8)
  g.add(at(baguette, 0.03, 0.022 + 0.026, -0.065, 0, 0, Math.PI / 2 - 0.12))
  g.add(kit.box(0.1, 0.002, 0.016, steel, { x: 0.1, y: 0.022, z: 0.075, ry: 0.15 }))
  g.add(kit.box(0.07, 0.014, 0.016, mat('wood.dark'), { x: 0.18, y: 0.022, z: 0.065, ry: 0.15 }))
  return g
}

/** Vasetto di basilico in terracotta. */
function herbsPot(opts, env) {
  const { kit, mat, style } = env
  const g = new THREE.Group()
  g.add(kit.lathe([[0.045, 0], [0.06, 0.01], [0.07, 0.1], [0.075, 0.11], [0.07, 0.115]], mat('ceramic.pot'), null, 10))
  g.add(kit.cyl(0.066, 0.066, 0.003, mat(style === 'scandinavo' ? 'wood.dark' : 'black'), { y: 0.108 }, 10))
  const rand = kit.rng(`herbs${opts.index ?? 0}`)
  const leaf = [mat('plant.leaf'), mat('plant.leafDark')]
  for (let i = 0; i < 10; i++) {
    const a = rand() * Math.PI * 2
    const rr = 0.045 * Math.sqrt(rand())
    const h = 0.12 + rand() * 0.08 + (1 - rr / 0.045) * 0.02
    g.add(blob(0.028, leaf[i % 2], Math.cos(a) * rr, h, Math.sin(a) * rr, [1.3, 0.35, 1], a))
  }
  g.add(kit.box(0.02, 0.07, 0.002, mat('wood.secondary'), { x: 0.045, y: 0.11, z: 0.05, ry: 0.4 }))
  return g
}

/** Moka e due tazzine con piattino. */
function mokaCups(opts, env) {
  const { kit, mat } = env
  const g = new THREE.Group()
  const alu = mat('metal.chrome')
  const black = mat('black')
  const china = mat('ceramic.white')
  const mx = -0.1
  g.add(kit.cyl(0.036, 0.05, 0.07, alu, { x: mx }, 8))
  g.add(kit.cyl(0.046, 0.034, 0.09, alu, { x: mx, y: 0.07 }, 8))
  g.add(kit.cyl(0.03, 0.044, 0.012, alu, { x: mx, y: 0.16 }, 8))
  g.add(kit.cyl(0.006, 0.01, 0.014, black, { x: mx, y: 0.172 }, 6))
  g.add(kit.box(0.055, 0.016, 0.012, black, { x: mx + 0.07, y: 0.11 }))
  g.add(kit.box(0.012, 0.075, 0.012, black, { x: mx + 0.092, y: 0.085 }))
  for (const [x, z] of [[0.04, 0.03], [0.14, -0.03]]) {
    g.add(kit.lathe([[0.03, 0], [0.05, 0.008], [0.04, 0.01], [0, 0.006]], china, { x, z }, 8))
    g.add(kit.lathe([[0.016, 0.006], [0.03, 0.05], [0.027, 0.05], [0.0, 0.012]], china, { x, z }, 8))
    g.add(kit.box(0.014, 0.022, 0.006, china, { x: x + 0.034, y: 0.024, z }))
  }
  return g
}

/** @param {object} furn registro degli arredi */
export function registerFood(furn) {
  furn.registerProp('fruit_bowl', fruitBowl)
  furn.registerProp('fruit_bowl_lemons', fruitBowlLemons)
  furn.registerProp('bread_board', breadBoard)
  furn.registerProp('herbs_pot', herbsPot)
  furn.registerProp('moka_cups', mokaCups)
}
