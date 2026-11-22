/** Battiscopa e cornici del soffitto, lungo il perimetro delle stanze. */
import * as THREE from 'three'
import { box, cyl, frameMatrix, createBucket, clearGroup } from './openings-geo.js'

const SKIRT_T = 0.015 // spessore battiscopa
const SKIRT_Y = 0.05 // quota di lettura dei bordi per il battiscopa
const CORNICE_Y = 2.95 // quota di lettura dei bordi per la cornice
// gola 12 x 12 cm: gradini dall'alto: [sporgenza, altezza]
const COVE = [[0.12, 0.03], [0.08, 0.04], [0.04, 0.05]]

/** Aggiunge al bucket una scatola lungo il segmento `e`, sporgente `prot` dal muro, da y0 a y1. */
function addAlong(bucket, mat, e, prot, y0, y1, cast) {
  const len = Math.hypot(e.x1 - e.x0, e.z1 - e.z0)
  const g = box(len, y1 - y0, prot, 0, (y0 + y1) / 2, prot / 2)
  g.applyMatrix4(frameMatrix((e.x0 + e.x1) / 2, (e.z0 + e.z1) / 2, e.nx, e.nz))
  bucket.add(mat, g, cast)
}

/** Battiscopa di ogni stanza, salvo quelle con zoccolatura. */
function buildSkirting(ctx, group) {
  const h = ctx.currentStyle().trim.skirtingHeight
  const bucket = createBucket()
  for (const r of ctx.plan.rooms) {
    const m = ctx.mat.room(r.id)
    if (m.wainscot || !m.skirting) continue
    for (const e of ctx.grid.roomEdges(r.id, SKIRT_Y)) addAlong(bucket, m.skirting, e, SKIRT_T, 0, h, false)
  }
  bucket.flush(group, 'skirting', ctx.log)
}

/** Cornice a gola di tre listelli sfalsati, lungo i bordi alla quota `CORNICE_Y`. */
function buildCornice(ctx, group) {
  const top = ctx.plan.meta.ceilingHeight
  const bucket = createBucket()
  for (const r of ctx.plan.rooms) {
    if (r.kind !== 'interior') continue
    const mat = ctx.mat.room(r.id).ceiling
    for (const e of ctx.grid.roomEdges(r.id, CORNICE_Y)) {
      let y = top
      for (const [prot, hh] of COVE) {
        addAlong(bucket, mat, e, prot, y - hh, y, false)
        y -= hh
      }
    }
  }
  bucket.flush(group, 'cornice', ctx.log)
}

/** Armadi a muro: montanti e traverse in legno sulle ante in tessuto, con pomoli (le facce sono in `shell`). */
function buildBuiltins(ctx, group) {
  const H = ctx.plan.meta.ceilingHeight
  const frame = ctx.mat.fixed('builtinFrame')
  const knobMat = ctx.mat.get('metal.accent')
  const bucket = createBucket()
  for (const b of ctx.plan.builtins ?? []) {
    const [x0, z0, x1, z1] = b.rect
    const front = b.front === '-x' ? { nx: -1, nz: 0, x: x0, c: (z0 + z1) / 2, w: z1 - z0 }
      : b.front === '+x' ? { nx: 1, nz: 0, x: x1, c: (z0 + z1) / 2, w: z1 - z0 }
      : b.front === '-z' ? { nx: 0, nz: -1, x: z0, c: (x0 + x1) / 2, w: x1 - x0 }
      : { nx: 0, nz: 1, x: z1, c: (x0 + x1) / 2, w: x1 - x0 }
    const n = Math.max(2, Math.round(front.w / 0.6))
    const leaf = front.w / n
    const M = front.nx !== 0 ? frameMatrix(front.x, front.c, front.nx, 0) : frameMatrix(front.c, front.x, 0, front.nz)
    const put = (mat, g, cast) => { g.applyMatrix4(M); bucket.add(mat, g, cast) }
    const top = H - 0.35
    for (let i = 0; i <= n; i++) put(frame, box(0.05, top - 0.05, 0.025, -front.w / 2 + i * leaf, (top + 0.05) / 2, 0.0125), false)
    for (const [y0, y1] of [[0.05, 0.15], [top - 0.1, top], [1.0, 1.06]]) put(frame, box(front.w, y1 - y0, 0.02, 0, (y0 + y1) / 2, 0.01), false)
    // specchiature: cornice in rilievo dentro ogni anta, sopra e sotto la traversa di mezzo, così le ante si leggono
    for (let i = 0; i < n; i++) {
      const cx = -front.w / 2 + (i + 0.5) * leaf
      const iw = leaf - 0.2
      for (const [y0, y1] of [[0.25, 0.93], [1.14, top - 0.18]]) {
        const ih = y1 - y0
        const ym = (y0 + y1) / 2
        for (const dy of [-1, 1]) put(frame, box(iw, 0.025, 0.018, cx, ym + dy * (ih / 2 - 0.0125), 0.009), false)
        for (const dx of [-1, 1]) put(frame, box(0.025, ih, 0.018, cx + dx * (iw / 2 - 0.0125), ym, 0.009), false)
      }
    }
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? 1 : -1 // i pomoli stanno ai lati del montante centrale tra due ante
      put(knobMat, cyl(0.022, 0.06, -front.w / 2 + (i + 0.5 + side * 0.4) * leaf, 1.05, 0.04), false)
    }
  }
  bucket.flush(group, 'builtins', ctx.log)
}

/** @param {object} ctx contesto condiviso */
export function init(ctx) {
  const skirting = new THREE.Group()
  skirting.name = 'battiscopa'
  ctx.groups.architecture.add(skirting)
  const cornice = new THREE.Group()
  cornice.name = 'cornici'
  ctx.groups.ceilings.add(cornice)
  buildCornice(ctx, cornice)
  const builtins = new THREE.Group()
  builtins.name = 'armadi-a-muro'
  ctx.groups.architecture.add(builtins)
  const apply = () => {
    clearGroup(skirting)
    buildSkirting(ctx, skirting)
    clearGroup(builtins)
    buildBuiltins(ctx, builtins)
    cornice.visible = !!ctx.currentStyle().ceiling.cornice
  }
  apply()
  ctx.events.on('style:changed', apply)
  ctx.debug.details = () => ({ skirting: skirting.children.length, cornice: cornice.children.length, corniceVisible: cornice.visible })
}
