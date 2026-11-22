/** Doccia a filo pavimento senza porta: piatto, pareti in piastrella, lastra di vetro parziale, soffione. */
import * as THREE from 'three'

/** Pannello di piastrelle con UV in metri; `side` ruota il pannello verso +x. */
function tilePanel(env, tex, w, h, at, side) {
  const geo = new THREE.PlaneGeometry(w, h)
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) + w / 2, pos.getY(i) + h / 2)
  if (side) geo.rotateY(Math.PI / 2)
  geo.translate(at.x, at.y + h / 2, at.z)
  return new THREE.Mesh(geo, env.kit.texMat(tex))
}

/**
 * @param {{size:number[], room?:string}} item @param {object} env @returns {THREE.Group}
 */
export function buildShower(item, env) {
  const [w, d, h] = item.size
  const { kit, mat, style } = env
  const lib = style === 'liberty'
  const g = new THREE.Group()
  const profile = mat(lib ? 'metal.accent' : style === 'moderno' ? 'black' : 'metal.chrome')
  const fix = mat(lib ? 'metal.accent' : 'metal.chrome')
  const tileName = env.ctx.currentStyle().wainscot?.[item.room]
  if (tileName) {
    const tex = env.tex.tile(tileName)
    g.add(tilePanel(env, tex, w, h, { x: 0, y: 0, z: -d / 2 + 0.006 }, false))
    g.add(tilePanel(env, tex, d, h, { x: -w / 2 + 0.006, y: 0, z: 0 }, true))
  }
  g.add(kit.box(w - 0.02, 0.02, d - 0.02, mat('ceramic.white')))
  g.add(kit.cyl(0.045, 0.045, 0.004, fix, { y: 0.02, x: 0.1 }, 16))
  // lastra fissa sul fronte, dal lato +x per il 55% della larghezza; il resto del fronte resta aperto
  const sw = w * 0.55
  const gx = w / 2 - sw / 2 - 0.01
  const gz = d / 2 - 0.02
  const gh = Math.min(h - 0.15, 2.0)
  g.add(kit.box(sw, gh, 0.008, mat('glass.clear'), { x: gx, y: 0.03, z: gz }))
  g.add(kit.box(sw + 0.02, 0.018, 0.022, profile, { x: gx, y: 0.02, z: gz }))
  g.add(kit.box(sw + 0.02, 0.018, 0.022, profile, { x: gx, y: 0.03 + gh, z: gz }))
  g.add(kit.box(0.016, gh, 0.022, profile, { x: gx - sw / 2, y: 0.03, z: gz }))
  g.add(kit.box(0.016, gh, 0.022, profile, { x: gx + sw / 2, y: 0.03, z: gz }))
  // colonna con miscelatore e soffione tondo a parete
  const cx = -w * 0.18
  const cz = -d / 2 + 0.03
  g.add(kit.cyl(0.009, 0.009, 1.0, fix, { x: cx, y: 1.05, z: cz }, 8))
  g.add(kit.tube([[cx, 2.05, cz], [cx, 2.12, cz + 0.05], [cx, 2.12, cz + 0.22]], 0.009, fix, { radial: 6 }))
  g.add(kit.cyl(0.11, 0.11, 0.018, fix, { x: cx, y: 2.09, z: cz + 0.24 }, 20))
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12), fix)
  knob.rotation.x = Math.PI / 2
  knob.position.set(cx, 1.1, cz + 0.02)
  g.add(knob)
  return g
}
