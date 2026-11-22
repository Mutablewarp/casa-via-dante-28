/** Oggetti d'appoggio da tavola: coperto, runner, centrotavola, candelabri, lanterna. Origine sul piano, fronte +z. */
import * as THREE from 'three'
import { bouquet } from './props-util.js'

const SEG = 9

/** Un singolo coperto: sottopiatto, piatti, tovagliolo, posate, due calici; sta in 0,30 x 0,24 m attorno all'origine. */
function tableSetting(opts, env) {
  const { kit, mat, style } = env
  const g = new THREE.Group()
  const china = mat('ceramic.white')
  const charger = style === 'scandinavo' ? mat('wood.primary') : mat('metal.accent')
  const steel = style === 'liberty' ? mat('metal.accent') : mat('metal.chrome')
  const nap = mat(style === 'liberty' ? 'fabric.bedAccent' : style === 'moderno' ? 'fabric.cushionA' : 'fabric.cushionB')
  const glass = mat('glass.clear')
  g.add(kit.lathe([[0.088, 0], [0.099, 0.005], [0.09, 0.007], [0, 0.007]], charger, null, SEG))
  g.add(kit.lathe([[0.066, 0], [0.085, 0.011], [0.075, 0.012], [0, 0.004]], china, { y: 0.007 }, SEG))
  g.add(kit.lathe([[0.03, 0], [0.062, 0.022], [0.055, 0.024], [0, 0.012]], china, { y: 0.011 }, SEG))
  g.add(kit.box(0.07, 0.012, 0.045, nap, { y: 0.035, ry: 0.25 }))
  // forchetta a sinistra, coltello e cucchiaio a destra del commensale (che guarda -z, la sua destra è +x)
  g.add(kit.box(0.007, 0.002, 0.09, steel, { x: -0.125, z: 0.055 }))
  g.add(kit.box(0.02, 0.002, 0.03, steel, { x: -0.125, z: -0.004 }))
  g.add(kit.box(0.01, 0.006, 0.05, steel, { x: 0.112, z: 0.077 }))
  g.add(kit.box(0.011, 0.002, 0.07, steel, { x: 0.112, z: 0.015 }))
  g.add(kit.box(0.007, 0.002, 0.08, steel, { x: 0.135, z: 0.065 }))
  g.add(kit.cyl(0.012, 0.012, 0.003, steel, { x: 0.135, z: 0.005 }, 6))
  if (style === 'scandinavo') {
    g.add(kit.lathe([[0.022, 0], [0.028, 0.08], [0.026, 0.085]], glass, { x: 0.09, z: -0.092 }, 8))
    g.add(kit.lathe([[0.02, 0], [0.025, 0.07], [0.023, 0.074]], glass, { x: 0.125, z: -0.045 }, 8))
  } else {
    g.add(kit.lathe([[0.02, 0], [0.004, 0.005], [0.004, 0.06], [0.027, 0.095], [0.022, 0.13]], glass, { x: 0.09, z: -0.092 }, 8))
    g.add(kit.lathe([[0.018, 0], [0.004, 0.004], [0.004, 0.035], [0.024, 0.075]], glass, { x: 0.125, z: -0.045 }, 8))
  }
  return g
}

/** Striscia di lino lunga quanto il tavolo meno 30 cm, larga 28 cm, con bordi a contrasto. */
function tableRunner(opts, env) {
  const { kit, mat, style } = env
  const len = Math.max(0.4, (opts.top?.w ?? 1.6) - 0.3)
  const wid = 0.28
  const g = new THREE.Group()
  const base = mat(style === 'moderno' ? 'fabric.cushionA' : 'fabric.linen')
  const trim = style === 'liberty' ? mat('fabric.bedAccent') : style === 'moderno' ? mat('metal.accent') : mat('fabric.cushionB')
  g.add(kit.box(len, 0.004, wid, base))
  for (const sz of [-1, 1]) g.add(kit.box(len, 0.0045, 0.02, trim, { z: sz * (wid / 2 - 0.02) }))
  if (style === 'liberty') for (const sx of [-1, 1]) g.add(kit.box(0.012, 0.005, wid, mat('metal.accent'), { x: sx * (len / 2 - 0.03) }))
  if (style === 'scandinavo') g.add(kit.box(len, 0.0045, 0.03, trim))
  return g
}

/** Centrotavola basso, largo al massimo 0,30 m. */
function centerpiece(opts, env) {
  const { kit, mat, style } = env
  const rand = kit.rng(`cp${opts.index ?? 0}${style}`)
  const g = new THREE.Group()
  const leaf = mat('plant.leaf')
  let y0
  let o
  if (style === 'liberty') {
    g.add(kit.lathe([[0.04, 0], [0.05, 0.03], [0.1, 0.07], [0.095, 0.075]], mat('metal.accent'), null, 10))
    y0 = 0.07
    o = { n: 8, spread: 0.085, rise: 0.07, bloomR: 0.032, blooms: [mat('plant.flowerA'), mat('plant.flowerB')], leaves: 5, leafLen: 0.1 }
  } else if (style === 'moderno') {
    g.add(kit.cyl(0.055, 0.06, 0.2, mat('ceramic.white'), null, 12))
    y0 = 0.19
    o = { n: 5, spread: 0.05, rise: 0.1, bloomR: 0.03, blooms: [mat('plant.flowerA')], leaves: 0 }
  } else {
    g.add(kit.lathe([[0.05, 0], [0.065, 0.06], [0.045, 0.12], [0.04, 0.135]], mat('ceramic.pot'), null, 10))
    y0 = 0.125
    o = { n: 7, spread: 0.08, rise: 0.09, bloomR: 0.02, blooms: [mat('plant.flowerB'), mat('plant.flowerA')], leaves: 4, leafLen: 0.1 }
  }
  g.add(bouquet(rand, { ...o, y0, stemMat: leaf, leafMat: leaf }))
  return g
}

/** Un candelabro (tre candele), largo al massimo 0,30 m; il numero di candelabri lo decide F con le chiamate. */
function candelabra(opts, env) {
  const { kit, mat, style } = env
  const wax = mat('fabric.linen')
  const flame = mat('paper.shade')
  const g = new THREE.Group()
  const candle = (x, y, h) => {
    g.add(kit.cyl(0.011, 0.011, h, wax, { x, y }, 6))
    g.add(kit.cyl(0.0005, 0.006, 0.022, flame, { x, y: y + h }, 5))
  }
  if (style === 'liberty') {
    const brass = mat('metal.accent')
    g.add(kit.lathe([[0.06, 0], [0.06, 0.012], [0.028, 0.03], [0.012, 0.06], [0.012, 0.2]], brass, null, 8))
    for (const sx of [-1, 1]) {
      const arm = new THREE.Group()
      arm.position.set(0, 0.2, 0)
      arm.rotation.z = sx > 0 ? 0.3 : Math.PI - 0.3
      arm.add(kit.box(0.13, 0.008, 0.008, brass, { x: 0.065 }))
      g.add(arm)
      const x = sx * 0.124
      g.add(kit.cyl(0.01, 0.016, 0.016, brass, { x, y: 0.238 }, 6))
      candle(x, 0.254, 0.1)
    }
    g.add(kit.cyl(0.01, 0.016, 0.016, brass, { y: 0.2 }, 6))
    candle(0, 0.216, 0.12)
  } else if (style === 'moderno') {
    g.add(kit.box(0.26, 0.03, 0.05, mat('metal.accent')))
    ;[[-0.09, 0.2], [0, 0.12], [0.09, 0.16]].forEach(([x, h]) => candle(x, 0.03, h))
  } else {
    const wood = mat('wood.primary')
    ;[[-0.09, 0.045], [0, 0.075], [0.09, 0.105]].forEach(([x, h]) => {
      g.add(kit.cyl(0.03, 0.033, h, wood, { x }, 10))
      candle(x, h, 0.11)
    })
  }
  return g
}

/** Lanterna con candela per il tavolo della terrazza. */
function lanternCandle(opts, env) {
  const { kit, mat, style } = env
  const g = new THREE.Group()
  const frame = style === 'liberty' ? mat('metal.iron') : style === 'moderno' ? mat('metal.accent') : mat('wood.primary')
  const wax = mat('fabric.linen')
  g.add(kit.box(0.12, 0.012, 0.12, frame))
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(kit.cyl(0.004, 0.004, 0.17, frame, { x: sx * 0.054, y: 0.012, z: sz * 0.054 }, 4))
  g.add(kit.box(0.104, 0.17, 0.104, mat('glass.clear'), { y: 0.012 }))
  if (style === 'liberty') g.add(kit.cyl(0.006, 0.085, 0.05, frame, { y: 0.182 }, 4))
  else g.add(kit.box(0.12, 0.012, 0.12, frame, { y: 0.182 }))
  if (style !== 'moderno') {
    g.add(kit.tube([[-0.045, 0.2, 0], [0, 0.26, 0], [0.045, 0.2, 0]], 0.003, frame, { radial: 4, segments: 6 }))
  }
  g.add(kit.cyl(0.02, 0.02, 0.09, wax, { y: 0.012 }, 8))
  g.add(kit.cyl(0.0005, 0.008, 0.03, mat('paper.shade'), { y: 0.102 }, 5))
  return g
}

/** @param {object} furn registro degli arredi */
export function registerTable(furn) {
  furn.registerProp('table_setting', tableSetting)
  furn.registerProp('table_runner', tableRunner)
  furn.registerProp('centerpiece_flowers', centerpiece)
  furn.registerProp('candelabra', candelabra)
  furn.registerProp('lantern_candle', lanternCandle)
}
