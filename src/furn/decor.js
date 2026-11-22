/** Quadri, specchi a parete, tappeti (E4); le tende stanno in decor-curtain.js. */
import * as THREE from 'three'
import * as kit from './kit.js'
import { registerCurtain } from './decor-curtain.js'

const clamp = (v, a, b) => Math.min(Math.max(v, a), b)

/** Piano con UV 0..1 rivolto verso +z, centrato in x e y, a profondità `z`. */
function canvasPlane(w, h, mat, z, y = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
  m.position.set(0, y, z)
  m.userData.noShadow = true
  return m
}

/** Quattro barre di cornice attorno a un vano `iw` x `ih` (centro in y = 0), larghezza barra `f`, profondità `t`, fronte a `z0`. */
function frameBars(iw, ih, f, t, mat, z0 = 0) {
  const g = new THREE.Group()
  const ow = iw + 2 * f, oh = ih + 2 * f
  const zc = z0 + t / 2
  g.add(kit.box(ow, f, t, mat, { y: ih / 2, z: zc }))
  g.add(kit.box(ow, f, t, mat, { y: -ih / 2 - f, z: zc }))
  g.add(kit.box(f, ih, t, mat, { x: -(iw + f) / 2, y: -ih / 2, z: zc }))
  g.add(kit.box(f, ih, t, mat, { x: (iw + f) / 2, y: -ih / 2, z: zc }))
  return g
}

function painting(item, env) {
  const [w, , h] = item.size
  const { mat, tex } = env
  const g = new THREE.Group()
  const lib = env.style === 'liberty'
  const f = lib ? clamp(Math.min(w, h) * 0.08, 0.04, 0.08) : env.style === 'moderno' ? 0.02 : 0.025
  const frame = lib ? mat('metal.accent') : env.style === 'moderno' ? mat('black') : mat('wood.primary')
  const iw = w - 2 * f, ih = h - 2 * f
  g.add(frameBars(iw, ih, f, 0.04, frame))
  if (lib) { // cornice a due gradini con rosette ai cantoni
    g.add(frameBars(iw, ih, f * 0.4, 0.052, frame))
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) g.add(kit.sphere(f * 0.4, frame, { x: sx * (iw / 2 + f * 0.5), y: sy * (ih / 2 + f * 0.5) - f * 0.4, z: 0.045 }))
  }
  g.add(canvasPlane(iw, ih, kit.texMat(tex.art(item.opts?.art, iw / ih)), 0.012))
  g.add(kit.box(iw, ih, 0.01, frame, { y: -ih / 2, z: 0.003 }))
  return g
}

/** Contorno di cornice a colpo di frusta: base dritta, lati dritti, cimasa asimmetrica. */
function whiplash(w, h) {
  const pts = [[-w / 2, 0], [w / 2, 0]]
  const n = 26
  for (let i = 0; i <= n; i++) {
    const u = 1 - i / n
    const p = Math.pow(u, 0.76)
    pts.push([(u - 0.5) * w, h * (0.8 + 0.2 * (0.85 * Math.sin(Math.PI * p) + 0.15 * Math.sin(2 * Math.PI * p)))])
  }
  return pts
}

function mirror(item, env) {
  const [w, , h] = item.size
  const { mat } = env
  const g = new THREE.Group()
  const glass = mat('mirror')
  if (env.style === 'liberty') {
    const f = clamp(w * 0.09, 0.05, 0.09)
    const out = whiplash(w, h)
    const sx = (w - 2 * f) / w, sy = (h - 2.4 * f) / h
    const inn = out.map(([x, y]) => [x * sx, h * 0.5 + (y - h * 0.5) * sy + f * 0.2])
    g.add(kit.extrude(out, 0.04, mat('metal.accent'), { y: -h / 2, z: 0.03 }, { bevel: 0.004 }))
    g.add(kit.extrude(inn, 0.01, glass, { y: -h / 2, z: 0.0535 }))
  } else if (env.style === 'moderno') {
    g.add(kit.rbox(w, h, 0.03, 0.005, mat('black'), { y: -h / 2, z: 0.015 }))
    g.add(kit.box(w - 0.05, h - 0.05, 0.005, glass, { y: -h / 2 + 0.025, z: 0.0325 }))
  } else {
    const R = w / 2, k = h / w
    const frame = kit.cyl(R, R, 0.035, mat('wood.primary'), {}, 32)
    const face = kit.cyl(R - 0.02, R - 0.02, 0.04, glass, {}, 32)
    for (const m of [frame, face]) { m.rotation.x = Math.PI / 2; m.scale.set(1, 1, k) }
    g.add(frame, face)
  }
  g.userData.noShadow = true
  return g
}

function rug(item, env) {
  const [w, d] = item.size
  const g = new THREE.Group()
  const geo = new THREE.PlaneGeometry(w, d)
  geo.rotateX(-Math.PI / 2)
  const top = new THREE.Mesh(geo, kit.texMat(env.tex.rug(item.opts?.pattern, w / d), 0.95))
  top.position.y = 0.0145
  top.userData.noShadow = true
  g.add(top)
  g.add(kit.box(w, 0.014, d, env.mat('wood.dark')))
  return g
}

/** @param {object} furn registro degli arredi */
export function register(furn) {
  const add = (type, fn) => furn.register(type, (item, env) => kit.finalize(fn(item, env), item))
  add('painting', painting)
  add('mirror_wall', mirror)
  add('rug', rug)
  registerCurtain(furn)
}
