/** Oggetti d'appoggio da arredo: lume da tavolo, fiori in vaso, libri, mappamondo, orologio. Origine sul piano, fronte +z. */
import * as THREE from 'three'
import { blob, bouquet, pivotZ } from './props-util.js'

/** Lume da tavolo con paralume in `paper.shade`: tulipano (Liberty), cilindro (Moderno), cupola di carta (Scandinavo). */
function tableLamp(opts, env) {
  const { kit, mat, style } = env
  const g = new THREE.Group()
  const shade = mat('paper.shade')
  if (style === 'liberty') {
    g.add(kit.lathe([[0.06, 0], [0.06, 0.015], [0.03, 0.05], [0.02, 0.12], [0.034, 0.2], [0.012, 0.27]], mat('metal.accent'), null, 10))
    g.add(kit.lathe([[0.04, 0.26], [0.085, 0.32], [0.105, 0.4], [0.085, 0.47], [0.1, 0.5]], shade, null, 10))
  } else if (style === 'moderno') {
    g.add(kit.cyl(0.05, 0.05, 0.012, mat('metal.chrome'), null, 14))
    g.add(kit.cyl(0.008, 0.008, 0.3, mat('metal.chrome'), { y: 0.012 }, 8))
    g.add(kit.cyl(0.1, 0.1, 0.17, shade, { y: 0.3 }, 14))
  } else {
    g.add(kit.lathe([[0.03, 0], [0.07, 0.07], [0.04, 0.17], [0.012, 0.22]], mat('wood.primary'), null, 10))
    g.add(kit.lathe([[0.05, 0.22], [0.12, 0.3], [0.11, 0.4], [0.03, 0.43]], shade, null, 10))
  }
  return g
}

/** Vaso di vetro con mazzo: iris (Liberty), fiori bianchi (Moderno), fiori di campo (Scandinavo). */
function vaseFlowers(opts, env) {
  const { kit, mat, style } = env
  const g = new THREE.Group()
  const rand = kit.rng(`vase${opts.index ?? 0}${style}`)
  const green = mat('plant.leaf')
  const glass = mat('glass.clear')
  let o
  if (style === 'liberty') {
    g.add(kit.lathe([[0.035, 0], [0.05, 0.07], [0.03, 0.15], [0.04, 0.2], [0.036, 0.2]], glass, null, 8))
    o = { n: 7, spread: 0.05, y0: 0.05, rise: 0.3, bloomR: 0.03, blooms: [mat('plant.flowerA'), mat('plant.flowerB')], leaves: 4, bloomScale: [1, 1.2, 1] }
  } else if (style === 'moderno') {
    g.add(kit.cyl(0.045, 0.045, 0.22, glass, null, 10))
    o = { n: 5, spread: 0.035, y0: 0.05, rise: 0.28, bloomR: 0.034, blooms: [mat('plant.flowerA')], leaves: 0 }
  } else {
    g.add(kit.lathe([[0.04, 0], [0.05, 0.06], [0.02, 0.13], [0.02, 0.17], [0.026, 0.18]], glass, null, 8))
    o = { n: 8, spread: 0.06, y0: 0.05, rise: 0.17, bloomR: 0.022, blooms: [mat('plant.flowerB'), mat('plant.flowerA')], leaves: 3 }
  }
  g.add(bouquet(rand, { ...o, stemMat: green, leafMat: green }))
  return g
}

/** Pila di tre libri, ruotati a caso con seme fisso. */
function books(opts, env) {
  const { kit, mat } = env
  const g = new THREE.Group()
  const rand = kit.rng(`books${opts.index ?? 0}`)
  const covers = [mat('leather'), mat('fabric.bedAccent'), mat('wood.dark')]
  const pages = mat('fabric.linen')
  let y = 0
  ;[[0.24, 0.036, 0.17], [0.21, 0.03, 0.15], [0.18, 0.025, 0.13]].forEach(([w, h, d], i) => {
    const b = new THREE.Group()
    b.add(kit.box(w, 0.004, d, covers[i]))
    b.add(kit.box(w, 0.004, d, covers[i], { y: h - 0.004 }))
    b.add(kit.box(0.006, h, d, covers[i], { x: -w / 2 + 0.003 }))
    b.add(kit.box(w - 0.01, h - 0.008, d - 0.008, pages, { x: 0.001, y: 0.004 }))
    b.position.set((rand() - 0.5) * 0.02, y, (rand() - 0.5) * 0.02)
    b.rotation.y = (rand() - 0.5) * 0.5
    g.add(b)
    y += h
  })
  return g
}

/** Mappamondo su sostegno: sfera, meridiano inclinato e qualche continente. */
function globe(opts, env) {
  const { kit, mat, style } = env
  const g = new THREE.Group()
  const sea = mat(style === 'moderno' ? 'fabric.cushionA' : 'fabric.cushionB')
  const land = mat(style === 'moderno' ? 'wood.secondary' : 'plant.leaf')
  const metal = style === 'scandinavo' ? mat('wood.primary') : mat('metal.accent')
  const r = 0.1
  const cy = 0.2
  g.add(kit.lathe([[0.07, 0], [0.07, 0.01], [0.025, 0.03], [0.012, 0.06]], metal, null, 8))
  const tilt = new THREE.Group()
  tilt.position.y = cy
  tilt.rotation.z = -0.41
  const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 6), sea)
  tilt.add(ball)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.012, 0.003, 4, 14), metal)
  tilt.add(ring)
  ;[[0.5, 0.6, 0.6], [-0.7, 0.2, 0.7], [0.1, -0.5, 0.85], [0.8, -0.2, -0.55], [-0.4, 0.55, -0.7]].forEach((v) => {
    const dir = new THREE.Vector3(...v).normalize()
    const m = blob(0.04, land, dir.x * r * 0.97, dir.y * r * 0.97, dir.z * r * 0.97, [1.2, 0.3, 0.9])
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    tilt.add(m)
  })
  g.add(tilt)
  g.add(kit.cyl(0.004, 0.004, 0.12, metal, { y: 0.06 }, 4))
  return g
}

/** Orologio da mensola: cassa ad arco (Liberty), cubo nero (Moderno), disco in legno (Scandinavo). */
function clock(opts, env) {
  const { kit, mat, style } = env
  const g = new THREE.Group()
  const dark = mat('black')
  let cy
  let fz
  let rim
  if (style === 'liberty') {
    const arch = [[-0.08, 0], [0.08, 0], [0.08, 0.2], [0.05, 0.24], [0, 0.26], [-0.05, 0.24], [-0.08, 0.2]]
    g.add(kit.extrude(arch, 0.09, mat('wood.dark'), { y: 0.02 }))
    g.add(kit.box(0.2, 0.02, 0.11, mat('metal.accent')))
    cy = 0.14
    fz = 0.045
    rim = mat('metal.accent')
  } else if (style === 'moderno') {
    g.add(kit.box(0.17, 0.17, 0.05, dark))
    cy = 0.085
    fz = 0.025
    rim = mat('metal.chrome')
  } else {
    const disc = new THREE.Group()
    disc.position.set(0, 0.095, 0)
    disc.rotation.x = Math.PI / 2
    disc.add(kit.cyl(0.088, 0.088, 0.04, mat('wood.primary'), null, 16))
    g.add(disc)
    for (const sx of [-1, 1]) g.add(kit.box(0.012, 0.012, 0.03, mat('wood.primary'), { x: sx * 0.05, z: 0.02 }))
    cy = 0.095
    fz = 0.04
    rim = mat('wood.secondary')
  }
  const face = new THREE.Group()
  face.position.set(0, cy, 0)
  face.rotation.x = Math.PI / 2
  face.add(kit.cyl(0.072, 0.072, fz + 0.006, rim, null, 14))
  face.add(kit.cyl(0.062, 0.062, fz + 0.01, mat('ceramic.white'), null, 14))
  g.add(face)
  const hand = (len, w, rz) => {
    const hnd = kit.box(w, len, 0.002, dark, { z: fz + 0.011 })
    const p = pivotZ(hnd, rz)
    p.position.y = cy
    return p
  }
  g.add(hand(0.04, 0.006, -0.9), hand(0.054, 0.004, 0.5))
  return g
}

/** @param {object} furn registro degli arredi */
export function registerMisc(furn) {
  furn.registerProp('table_lamp', tableLamp)
  furn.registerProp('vase_flowers', vaseFlowers)
  furn.registerProp('books', books)
  furn.registerProp('globe', globe)
  furn.registerProp('clock', clock)
}
