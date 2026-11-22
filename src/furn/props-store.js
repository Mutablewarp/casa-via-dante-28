/** Oggetti d'appoggio per ripiani e toeletta: scatole, valigie, set di profumi. Origine sul piano, fronte +z. */
import * as THREE from 'three'

/** Misure utili di un ripiano: larghezza e profondità disponibili e fattore di scala rispetto a un ripiano di riferimento. */
function room(opts, refW, refD) {
  const w = Math.max((opts.top?.w ?? refW) - 0.04, 0.2)
  const d = Math.max((opts.top?.d ?? refD) - 0.02, 0.1)
  return { w: Math.min(w, refW), d: Math.min(d, refD), s: Math.min(1, w / refW, d / refD) }
}

/** Tre contenitori: due scatole da cappelli e un cesto di vimini, in fila sul ripiano. */
function boxes(opts, env) {
  const { kit, mat, style } = env
  const g = new THREE.Group()
  const { w, d } = room(opts, 0.8, 0.34)
  const r = Math.min(d / 2, 0.15)
  const body = [mat('wood.painted'), mat(style === 'liberty' ? 'fabric.bedAccent' : 'fabric.cushionB')]
  const lid = mat(style === 'liberty' ? 'metal.accent' : 'wood.primary')
  const x0 = -w / 2 + r
  g.add(kit.cyl(r, r, 0.2, body[0], { x: x0 }, 12))
  g.add(kit.cyl(r + 0.006, r + 0.006, 0.025, lid, { x: x0, y: 0.2 }, 12))
  const w2 = Math.min(0.26, w * 0.4)
  g.add(kit.box(w2, 0.14, Math.min(d, 0.26), body[1], { x: x0 + r + w2 / 2 + 0.02 }))
  g.add(kit.box(w2 + 0.01, 0.02, Math.min(d, 0.26) + 0.01, lid, { x: x0 + r + w2 / 2 + 0.02, y: 0.14 }))
  const rb = Math.min(0.11, d / 2)
  g.add(kit.cyl(rb * 1.05, rb * 0.85, 0.16, mat('wicker'), { x: w / 2 - rb }, 10))
  return g
}

/** Due valigie di cuoio sovrapposte, con angoli e cinghie. Si riduce per stare sul ripiano. */
function luggage(opts, env) {
  const { kit, mat, style } = env
  const { s } = room(opts, 0.72, 0.4)
  const g = new THREE.Group()
  const hide = mat(style === 'scandinavo' ? 'fabric.cushionB' : 'leather')
  const metal = mat(style === 'liberty' ? 'metal.accent' : 'metal.chrome')
  const case1 = (w, h, d, y, ry) => {
    const c = new THREE.Group()
    c.add(kit.box(w, h, d, hide))
    for (const sx of [-1, 1]) {
      c.add(kit.box(0.02, h + 0.004, d + 0.004, metal, { x: sx * (w / 2 - 0.1) }))
      for (const sz of [-1, 1]) c.add(kit.box(0.03, 0.03, 0.03, metal, { x: sx * (w / 2 - 0.012), y: 0, z: sz * (d / 2 - 0.012) }))
    }
    c.add(kit.box(0.05, 0.012, 0.016, metal, { y: h * 0.55, z: d / 2 }))
    c.add(kit.box(0.1, 0.012, 0.03, mat('black'), { y: h, z: 0 }))
    c.position.set(0, y, 0)
    c.rotation.y = ry
    return c
  }
  g.add(case1(0.64, 0.2, 0.4, 0, 0))
  g.add(case1(0.46, 0.15, 0.3, 0.2, 0.12))
  g.scale.setScalar(s)
  return g
}

/** Vassoio con tre flaconi: tondo, a base quadrata e con la pompetta. */
function perfumeSet(opts, env) {
  const { kit, mat, style } = env
  const g = new THREE.Group()
  const glass = mat('glass.clear')
  const metal = mat(style === 'liberty' ? 'metal.accent' : 'metal.chrome')
  const tray = style === 'liberty' ? metal : style === 'moderno' ? mat('mirror') : mat('wood.primary')
  g.add(kit.box(0.26, 0.012, 0.16, tray))
  const y = 0.012
  g.add(kit.lathe([[0.025, 0], [0.03, 0.02], [0.03, 0.06], [0.012, 0.07], [0.01, 0.085]], glass, { x: -0.08, y }, 8))
  g.add(kit.cyl(0.011, 0.011, 0.018, metal, { x: -0.08, y: y + 0.085 }, 6))
  g.add(kit.box(0.035, 0.09, 0.035, glass, { x: 0.01, y, z: 0.01 }))
  g.add(kit.cyl(0.012, 0.012, 0.025, metal, { x: 0.01, y: y + 0.09, z: 0.01 }, 6))
  g.add(kit.cyl(0.026, 0.026, 0.05, glass, { x: 0.085, y, z: -0.01 }, 8))
  g.add(kit.cyl(0.008, 0.008, 0.03, metal, { x: 0.085, y: y + 0.05, z: -0.01 }, 6))
  g.add(kit.cyl(0.014, 0.014, 0.012, mat('fabric.bedAccent'), { x: 0.085, y: y + 0.08, z: -0.01 }, 6))
  return g
}

/** @param {object} furn registro degli arredi */
export function registerStore(furn) {
  furn.registerProp('boxes', boxes)
  furn.registerProp('luggage', luggage)
  furn.registerProp('perfume_set', perfumeSet)
}
