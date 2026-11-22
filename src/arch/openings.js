/** Serramenti: porte, portefinestre, finestre, archi, cassonetti e termosifoni. */
import * as THREE from 'three'
import { K } from '../core/grid.js'
import { box, frameMatrix, createBucket, clearGroup, setWorldUV } from './openings-geo.js'
import { surround, doorFrame, doorLeaf, frenchLeaf, sashFrame, windowSashes } from './openings-parts.js'
import { buildArch } from './openings-arch.js'

const SHOW_R = 0.09 // raccordo degli angoli della mostra in Liberty
const BOX_H = 0.25 // cassonetto: altezza
const BOX_D = 0.18 // cassonetto: profondità
const BOX_SIDE = 0.1 // cassonetto: sporgenza laterale oltre il foro
const RAD = { w: 0.8, h: 0.6, d: 0.12, gap: 0.04, lift: 0.1, cols: 10 }
const FROSTED = ['f_bagno2', 'f_bagno_baronale', 'f_toilette']
const DOORS = ['door', 'service', 'entry']

/** Normale (nx, nz) che dal centro del muro guarda verso lo spazio `id`, oppure null. */
function normalToward(ctx, o, id) {
  const [x0, z0, x1, z1] = o.rect
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const t = o.wallAlong === 'x' ? z1 - z0 : x1 - x0
  const d = t / 2 + 0.12
  for (const s of [1, -1]) {
    const [nx, nz] = o.wallAlong === 'x' ? [0, s] : [s, 0]
    const x = cx + nx * d
    const z = cz + nz * d
    const kind = ctx.grid.kindAt(x, z)
    const sp = ctx.grid.spaceAt(x, z)
    const hit = sp ? sp.id === id
      : id === '_rampe' ? kind === K.STAIRS
        : id === '_cortile' ? kind === K.OUTSIDE || kind === K.CONTEXT : false
    if (hit) return [nx, nz]
  }
  return null
}

/**
 * Ante di una porta che, nei dati, aprono su uno spazio non interno (balcone): il contratto vuole
 * che aprano verso la stanza interna, quindi si specchiano rispetto all'asse del muro.
 */
function doorLeaves(ctx, o) {
  const list = o.leaves?.list ?? []
  const room = ctx.plan.rooms.find((r) => r.id === o.leaves?.room)
  if (!list.length || room?.kind === 'interior') return list
  const [x0, z0, x1, z1] = o.rect
  const c = o.wallAlong === 'x' ? z0 + z1 : x0 + x1 // doppio dell'asse del muro
  const mir = ([x, z]) => (o.wallAlong === 'x' ? [x, c - z] : [c - x, z])
  return list.map((l) => ({ ...l, hinge: mir(l.hinge), tip: mir(l.tip) }))
}

/** Materiali propri del modulo (vetrata colorata, telaio esterno), creati una volta. */
function ownMaterials(ctx) {
  const { THREE: T } = ctx
  const ext = new T.MeshStandardMaterial({ color: ctx.styles.exterior.frames, roughness: 0.6 })
  const stained = new T.MeshStandardMaterial({
    map: ctx.tex.stainedGlass(), transparent: true, opacity: 0.9, depthWrite: false, side: T.DoubleSide, roughness: 0.25,
  })
  ext.name = 'frameExterior'
  stained.name = 'stainedGlass'
  return { ext, stained }
}

/** Materiali condivisi correnti. */
function sharedMats(ctx, own) {
  const m = ctx.mat
  return {
    trim: m.fixed('trim'), door: m.fixed('door'), glass: m.fixed('glass'), frosted: m.fixed('glassFrosted'),
    wood: m.get('wood.primary'), woodSec: m.get('wood.secondary'), brass: m.get('metal.accent'),
    painted: m.get('wood.painted'), ext: own.ext,
  }
}

/** Cassonetto bianco sopra il foro, sul lato interno (+z locale). */
function shutterBox(env, o, t) {
  env.put(env.mats.trim, box(o.width + 2 * BOX_SIDE, BOX_H, BOX_D, 0, o.head + BOX_H / 2, t / 2 + BOX_D / 2))
}

/** Termosifone in ghisa a colonne sotto la finestra, sul lato interno (+z locale). */
function radiator(env, t) {
  const { w, h, d, gap, lift, cols } = RAD
  const zc = t / 2 + gap + d / 2
  const pitch = w / cols
  const m = env.mats.painted
  for (let i = 0; i < cols; i++) env.put(m, box(pitch * 0.62, h - 0.1, d, -w / 2 + pitch * (i + 0.5), lift + h / 2, zc))
  for (const y of [lift + 0.05, lift + h - 0.05]) env.put(m, box(w, 0.07, d * 0.7, 0, y, zc))
}

/** Costruisce tutti i serramenti nel gruppo `group` secondo lo stile corrente. */
function buildAll(ctx, group, own) {
  const { plan } = ctx
  const style = ctx.currentStyle()
  const mats = sharedMats(ctx, own)
  const bucket = createBucket()
  const rooms = new Set(plan.rooms.map((r) => r.id))
  const round = ctx.state.style === 'liberty' ? SHOW_R : 0
  const stats = {}
  for (const o of plan.openings) {
    const [x0, z0, x1, z1] = o.rect
    const along = o.wallAlong
    const t = along === 'x' ? z1 - z0 : x1 - x0
    const cx = (x0 + x1) / 2
    const cz = (z0 + z1) / 2
    const fromN = normalToward(ctx, o, o.from)
    const toN = normalToward(ctx, o, o.to) ?? (fromN ? fromN.map((v) => -v) : [along === 'x' ? 0 : 1, along === 'x' ? 1 : 0])
    const toInterior = rooms.has(o.to) || o.to === '_rampe'
    const nIn = toInterior ? toN : toN.map((v) => -v)
    const make = (n) => {
      const M = frameMatrix(cx, cz, n[0], n[1])
      return {
        mats, stained: own.stained,
        put: (mat, g, cast = true) => bucket.add(mat, g.applyMatrix4(M), cast),
        putUV: (mat, g) => { g.applyMatrix4(M); setWorldUV(g, along); bucket.add(mat, g, true) },
        putM: (Mx, mat, g, cast = true) => bucket.add(mat, g.applyMatrix4(Mx), cast),
      }
    }
    if (o.shape === 'arco') {
      const env = make(toN)
      const k = { to: ctx.mat.room(o.to).wall, from: ctx.mat.room(o.from).wall, glass: o.type === 'double_door' && !!style.decor?.stainedGlass }
      buildArch(env, o, t, k)
    } else if (DOORS.includes(o.type)) {
      const env = make(toN)
      surround(env, o.width, 0, o.head, t, [1, -1], round)
      doorFrame(env, o.width, o.head, t)
      for (const l of doorLeaves(ctx, o)) doorLeaf(env, l.hinge, l.tip, o.head, o.type === 'entry')
    } else if (o.type === 'french') {
      const env = make(nIn)
      surround(env, o.width, 0, o.head, t, [1], round)
      sashFrame(env, o.width, 0, o.head, t, false)
      shutterBox(env, o, t)
      for (const l of o.leaves?.list ?? []) frenchLeaf(env, l.hinge, l.tip, o.head)
    } else if (o.type === 'window') {
      const env = make(nIn)
      surround(env, o.width, o.sill, o.head, t, [1], round)
      sashFrame(env, o.width, o.sill, o.head, t, true)
      windowSashes(env, o.width, o.sill, o.head, t, FROSTED.includes(o.id))
      shutterBox(env, o, t)
      if (o.from === 'terrazza' || o.to === 'terrazza') radiator(env, t)
    } else ctx.log.warn(`openings: tipo non gestito ${o.type} (${o.id})`)
    stats[o.type] = (stats[o.type] || 0) + 1
  }
  bucket.flush(group, 'openings', ctx.log)
  return stats
}

/** @param {object} ctx contesto condiviso */
export function init(ctx) {
  const group = new THREE.Group()
  group.name = 'serramenti'
  ctx.groups.openings.add(group)
  const own = ownMaterials(ctx)
  for (const m of [ctx.mat.fixed('glass'), ctx.mat.fixed('glassFrosted'), own.stained]) {
    if (!ctx.registry.glass.includes(m)) ctx.registry.glass.push(m)
  }
  const info = { stats: {}, calls: 0 }
  const rebuild = () => {
    clearGroup(group)
    own.stained.map = ctx.tex.stainedGlass()
    own.stained.needsUpdate = true
    info.stats = buildAll(ctx, group, own)
    info.calls = group.children.length
  }
  rebuild()
  ctx.events.on('style:changed', rebuild)
  ctx.debug.openings = () => ({ ...info, meshes: group.children.length })
}
