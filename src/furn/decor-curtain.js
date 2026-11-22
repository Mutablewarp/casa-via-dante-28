/** Tende: teli a pieghe raccolti ai lati, velo dietro, bastone e cassonetto coperto (Liberty); solo velo o cotone negli altri stili. */
import * as THREE from 'three'
import * as kit from './kit.js'
import { rodX } from './lamps-parts.js'

const PLEAT = 0.11 // passo delle pieghe, m

/**
 * Telo a pieghe verticali, a due facce. `anchor` è il bordo fisso (x) verso cui si raccoglie alla quota `cinch`.
 * @param {{x0:number,x1:number,y0:number,y1:number,z:number,amp:number,anchor:number,cinchY?:number,cinchK?:number}} p
 * @param {THREE.Material} mat @returns {THREE.Mesh}
 */
function drape(p, mat) {
  const wid = Math.abs(p.x1 - p.x0)
  const nx = Math.max(8, Math.min(18, Math.round((wid / PLEAT) * 5)))
  const ny = p.cinchY === undefined ? 2 : 9
  const pos = []
  const idx = []
  const grid = (zOff, flip) => {
    const base = pos.length / 3
    for (let j = 0; j <= ny; j++) {
      const y = p.y0 + ((p.y1 - p.y0) * j) / ny
      const f = p.cinchY === undefined ? 1 : 1 - (1 - p.cinchK) * Math.exp(-(((y - p.cinchY) / 0.2) ** 2))
      for (let i = 0; i <= nx; i++) {
        const u = i / nx
        const x0 = p.x0 + (p.x1 - p.x0) * u
        const x = p.anchor + (x0 - p.anchor) * f
        const a = p.amp / Math.sqrt(f)
        pos.push(x, y, p.z + zOff + a * Math.sin(((x0 - p.x0) / PLEAT) * Math.PI * 2))
      }
    }
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = base + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1
        if (flip) idx.push(a, c, b, b, c, d)
        else idx.push(a, b, c, b, d, c)
      }
    }
  }
  grid(0, false)
  grid(-0.008, true)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return new THREE.Mesh(geo, mat)
}

/** Tratti di muro non occupati da `clear`, ordinati, più larghi di 0,2 m. */
function freeSegments(W, clear) {
  const cuts = [...clear].map(([a, b]) => [Math.max(a, -W / 2), Math.min(b, W / 2)]).sort((p, q) => p[0] - q[0])
  const out = []
  let x = -W / 2
  for (const [a, b] of cuts) {
    if (a - x > 0.2) out.push([x, a])
    x = Math.max(x, b)
  }
  if (W / 2 - x > 0.2) out.push([x, W / 2])
  return out
}

/** Pannelli di una striscia libera `[a, b]`: uno solo se stretta, altrimenti uno per lato lasciando libera la luce. */
function panels(a, b, W) {
  const s = b - a
  const outerL = a <= -W / 2 + 0.01, outerR = b >= W / 2 - 0.01
  if (s <= 1.1) return [{ x0: a, x1: b, anchor: outerR && !outerL ? b : a }]
  const pw = Math.min(Math.max(s * 0.3, 0.35), 0.6)
  return [{ x0: a, x1: a + pw, anchor: a }, { x0: b - pw, x1: b, anchor: b }]
}

function curtain(item, env) {
  const [W, , H] = item.size
  const { mat } = env
  const mode = env.decor.curtains
  const velvet = mode === 'velluto_con_velo', cotton = mode === 'cotone_bianco'
  const g = new THREE.Group()
  const segs = freeSegments(W, item.opts?.clear ?? [])
  const brass = mat('metal.accent')
  const rodY = H - 0.1
  const cloth = mat('fabric.curtain'), sheer = mat('fabric.sheer')
  // il cassonetto (profondo 18 cm, 25 cm sopra l'architrave) resta dietro lo zoccolo di tessuto o davanti al velo
  const zRod = 0.21

  if (velvet) {
    g.add(kit.rbox(W - 0.04, 0.28, 0.05, 0.01, cloth, { x: 0, y: H - 0.28, z: zRod }))
    g.add(kit.box(W - 0.04, 0.02, 0.055, brass, { y: H - 0.28, z: zRod }))
    g.add(rodX(W - 0.04, 0.012, brass, { y: rodY, z: zRod + 0.03 }))
    for (const s of [-1, 1]) g.add(kit.sphere(0.018, brass, { x: s * (W / 2 - 0.03), y: rodY - 0.018, z: zRod + 0.03 }))
  } else {
    g.add(rodX(W - 0.06, 0.008, mat(cotton ? 'wood.primary' : 'metal.accent'), { y: rodY, z: zRod }))
  }
  const zSheer = velvet ? 0.04 : zRod
  const zCloth = velvet ? 0.11 : zRod - 0.01
  const top = velvet ? H - 0.25 : rodY - 0.02

  for (const [a, b] of segs) {
    if (!cotton) g.add(drape({ x0: a, x1: b, y0: 0.03, y1: top, z: zSheer, amp: 0.012, anchor: a }, sheer))
    if (!velvet && !cotton) continue
    for (const p of panels(a, b, W)) {
      const wide = Math.abs(p.x1 - p.x0) > 0.3
      g.add(drape({ ...p, y0: 0.01, y1: top, z: zCloth, amp: velvet ? 0.035 : 0.022, cinchY: velvet && wide ? 0.95 : undefined, cinchK: 0.5 }, cloth))
      if (!velvet || !wide) continue
      const far = p.anchor + (p.x1 + p.x0 - 2 * p.anchor) * 0.5 // estremo libero del telo, raccolto al 50 %
      g.add(kit.box(Math.abs(far - p.anchor) + 0.03, 0.03, 0.11, brass, { x: (p.anchor + far) / 2, y: 0.935, z: 0.1 }))
      g.add(kit.sphere(0.022, brass, { x: p.anchor === p.x0 ? p.x0 + 0.02 : p.x1 - 0.02, y: 0.935, z: 0.16 }))
    }
  }
  return g
}

/** @param {object} furn registro degli arredi */
export function registerCurtain(furn) {
  furn.register('curtain', (item, env) => kit.finalize(curtain(item, env), item))
}
