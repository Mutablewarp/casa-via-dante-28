/** Specchi sopra mobili (bagno, toeletta) e barra di pentole di rame. Origine sul piano (specchi) o sulla barra (pentole). */
import * as THREE from 'three'
import { at } from './props-util.js'

const FRAME = 0.03
const FRAME_DEPTH = 0.02
const LIFT = 0.2

/** Pannello rettangolare: specchio incassato in una cornice. Base a y = 0, centrato in x e z. */
function framed(kit, mirror, frame, w, h) {
  const g = new THREE.Group()
  g.add(kit.box(w - 2 * FRAME, h - 2 * FRAME, 0.006, mirror, { y: FRAME }))
  g.add(kit.box(w, FRAME, FRAME_DEPTH, frame))
  g.add(kit.box(w, FRAME, FRAME_DEPTH, frame, { y: h - FRAME }))
  for (const sx of [-1, 1]) g.add(kit.box(FRAME, h - 2 * FRAME, FRAME_DEPTH, frame, { x: sx * (w / 2 - FRAME / 2), y: FRAME }))
  return g
}

/** Specchio tondo con anello: disco sottile davanti a un anello più spesso. */
function round(kit, mirror, frame, r) {
  const g = new THREE.Group()
  const d = new THREE.Group()
  d.position.set(0, r, 0)
  d.rotation.x = Math.PI / 2
  d.add(kit.cyl(r + 0.025, r + 0.025, FRAME_DEPTH, frame, null, 20))
  d.add(kit.cyl(r, r, FRAME_DEPTH + 0.004, mirror, null, 20))
  g.add(d)
  return g
}

/** Specchio con uno o due pannelli, largo quanto il piano (`opts.top.w`), appoggiato al fondo del mobile. */
function bathMirror(panels) {
  return (opts, env) => {
    const { kit, mat, style } = env
    const top = opts.top ?? { w: 0.9, d: 0.45 }
    const W = top.w
    const h = 0.85
    const mirror = mat('mirror')
    const g = new THREE.Group()
    if (style === 'scandinavo') {
      const r = Math.min(W / (2 * panels) - 0.04, 0.38)
      for (let i = 0; i < panels; i++) {
        const m = round(kit, mirror, mat('wood.primary'), r)
        m.position.x = (i - (panels - 1) / 2) * (W / panels)
        g.add(m)
      }
    } else {
      const frame = style === 'liberty' ? mat('metal.accent') : mat('black')
      const pw = W / panels - (panels > 1 ? 0.02 : 0)
      for (let i = 0; i < panels; i++) {
        const x = (i - (panels - 1) / 2) * (W / panels)
        const p = framed(kit, mirror, frame, pw, h)
        p.position.x = x
        g.add(p)
      }
      // una sola cimasa sull'insieme dei pannelli: tiene il doppio sotto i 400 triangoli
      if (style === 'liberty') g.add(kit.crest(W - (panels > 1 ? 0.02 : 0), 0.1, 0.018, frame, { y: h }))
    }
    g.position.set(0, LIFT, -top.d / 2 + FRAME_DEPTH / 2 + 0.005)
    const out = new THREE.Group()
    out.add(g)
    return out
  }
}

/** Specchio a tre ante per la toeletta: pannello centrale e due ali richiamate in avanti. */
function triptych(opts, env) {
  const { kit, mat, style } = env
  const top = opts.top ?? { w: 1.2, d: 0.5 }
  const W = top.w
  const wc = W * 0.46
  const ww = W * 0.27
  const ang = (25 * Math.PI) / 180
  const mirror = mat('mirror')
  const frame = style === 'liberty' ? mat('wood.dark') : style === 'moderno' ? mat('black') : mat('wood.primary')
  const g = new THREE.Group()
  const center = framed(kit, mirror, frame, wc, 0.7)
  g.add(center)
  if (style === 'liberty') g.add(kit.crest(wc, 0.12, 0.018, frame, { y: 0.7 }))
  for (const sx of [-1, 1]) {
    const wing = new THREE.Group()
    wing.position.x = sx * (wc / 2 - FRAME / 2)
    wing.rotation.y = -sx * ang
    const p = framed(kit, mirror, frame, ww, 0.56)
    p.position.x = sx * ww / 2
    wing.add(p)
    g.add(wing)
  }
  g.position.set(0, 0, -top.d / 2 + 0.06)
  const out = new THREE.Group()
  out.add(g)
  return out
}

/** Barra a parete (0,5 m) con tre pentole e due mestoli di rame; scende al massimo di 0,35 m. */
function copperPots(opts, env) {
  const { kit, mat } = env
  const g = new THREE.Group()
  const cu = mat('metal.copper')
  const iron = mat('metal.iron')
  const len = 0.5
  const bz = 0.05
  g.add(at(kit.cyl(0.008, 0.008, len, iron, null, 8), 0, 0, bz, 0, 0, Math.PI / 2))
  g.children[0].position.x = len / 2
  g.children[0].position.y = 0
  for (const sx of [-1, 1]) g.add(kit.box(0.014, 0.014, bz, iron, { x: sx * (len / 2 - 0.03), y: -0.007, z: bz / 2 }))
  const hook = (x, drop) => g.add(kit.cyl(0.002, 0.002, drop, iron, { x, y: -drop, z: bz }, 4))
  ;[[-0.135, 0.05, 0.075], [-0.015, 0.056, 0.09], [0.105, 0.05, 0.07]].forEach(([x, r, h]) => {
    hook(x, 0.04)
    const top = -0.15
    g.add(kit.cyl(r, r * 0.92, h, cu, { x, y: top - h, z: bz }, 8))
    g.add(kit.box(0.012, 0.11, 0.008, cu, { x, y: top - 0.01, z: bz }))
  })
  for (const x of [-0.22, 0.2]) {
    hook(x, 0.02)
    g.add(kit.box(0.008, 0.2, 0.006, cu, { x, y: -0.22, z: bz }))
    g.add(kit.cyl(0.026, 0.02, 0.03, cu, { x, y: -0.25, z: bz }, 8))
  }
  return g
}

/** @param {object} furn registro degli arredi */
export function registerWall(furn) {
  furn.registerProp('bath_mirror', bathMirror(1))
  furn.registerProp('bath_mirror_double', bathMirror(2))
  furn.registerProp('mirror_triptych', triptych)
  furn.registerProp('copper_pots', copperPots)
}
