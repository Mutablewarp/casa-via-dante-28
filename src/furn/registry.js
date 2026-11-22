/*
 * Registro degli arredi: `ctx.furn` e i costruttori dei file degli altri agenti.
 *
 * CONTRATTO PER I COSTRUTTORI  `register(type, (item, env) => Object3D)`
 *  - env = { ctx, style, shape, decor, mat, tex, kit }: `mat('wood.primary')` = ctx.mat.get, `tex` = ctx.tex, `kit` = furn/kit.js.
 *  - A pavimento: origine al centro dell'ingombro a y = 0, fronte verso +z, `item.size = [larghezza x, profondità z, altezza]`.
 *  - A parete: origine al centro del riquadro, sul filo del muro; sporge verso +z; `size = [larghezza, sporgenza massima, altezza]`.
 *  - Tende (`curtain`): origine a terra, al centro del tratto di muro, sul filo interno; x locale da -size[0]/2 a +size[0]/2;
 *    fronte +z verso la stanza; `size = [larghezza, 0.18, altezza]`; `item.opts.clear = [[x0, x1], ...]` tratti in x locale da lasciare liberi.
 *  - A soffitto: origine nel punto di attacco; pende verso -y per `size[2]`.
 *  - Chi può reggere oggetti d'appoggio imposta `group.userData.top = { y, w, d }` (quota e misure utili del piano).
 *  - Le parti da nascondere nella vista dall'alto (rosoni) sono un Group con `userData.ceiling = true`.
 *  - Le parti luminose usano il materiale `mat('paper.shade')`.
 *  - Oggetti d'appoggio: `registerProp(name, (opts, env) => Object3D)`, `opts = { item, top, index, count }`, origine sul piano.
 *  - Si chiude sempre con `kit.finalize(group, item)` (lo richiama comunque il registro). Ombre: `userData.noShadow = true` dove non servono.
 */
import * as kit from './kit.js'
import { createPreview } from './registry-preview.js'
import * as seating from './seating.js'
import * as tables from './tables.js'
import * as beds from './beds.js'
import * as storage from './storage.js'
import * as bath from './bath.js'
import * as kitchen from './kitchen.js'
import * as outdoor from './outdoor.js'
import * as plants from './plants.js'
import * as piano from './piano.js'
import * as lamps from './lamps.js'
import * as decor from './decor.js'
import * as props from './props.js'

const MODULES = [seating, tables, beds, storage, bath, kitchen, outdoor, plants, piano, lamps, decor, props]
const NO_SHADOW_TYPES = new Set(['painting', 'curtain', 'rug'])
const PROP_CUBE = 0.1

/** @param {object} ctx contesto condiviso */
export function init(ctx) {
  const { THREE } = ctx
  const builders = new Map()
  const propBuilders = new Map()
  const warned = new Set()
  let grey = null
  const greyMat = () => (grey ??= new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.8 }))

  const makeEnv = () => {
    const style = ctx.currentStyle()
    return { ctx, style: ctx.state.style, shape: style.shape, decor: style.decor, mat: (t) => ctx.mat.get(t), tex: ctx.tex, kit }
  }
  const noCast = (g) => g.traverse((o) => { if (o.isMesh) o.castShadow = false })
  const once = (key, fn) => { if (!warned.has(key)) { warned.add(key); fn() } }
  const asGroup = (o) => { if (o.isGroup) return o; const g = new THREE.Group(); g.add(o); return g }

  /** Costruisce con il costruttore; se manca o lancia, `fallback()`. Restituisce un Group con `placeholder` impostato. */
  const run = (kind, name, builder, args, fallback) => {
    let obj = null
    if (!builder) once(`${kind}:${name}`, () => ctx.log.debug(`furn: ${kind} "${name}" non registrato, uso il segnaposto`))
    else {
      try {
        obj = builder(...args)
        if (!obj?.isObject3D) throw new TypeError('il costruttore non ha restituito un Object3D')
      } catch (e) {
        obj = null
        ctx.log.error(`furn: ${kind} "${name}": ${e.message}`)
        ctx.debug.errors.push({ where: `furn:${name}`, message: String(e.message), stack: e.stack ?? '' })
      }
    }
    const g = asGroup(obj ?? fallback())
    g.userData.placeholder = !obj
    return g
  }

  const furn = ctx.furn
  furn.register = (type, builder) => { builders.set(type, builder) }
  furn.registerProp = (name, builder) => { propBuilders.set(name, builder) }
  furn.types = () => [...builders.keys()]
  furn.props = () => [...propBuilders.keys()]

  /** Costruisce un arredo; tipo mancante o errore: parallelepipedo grigio di `item.size`. */
  furn.create = (item) => {
    const type = ctx.furnishing.styleOverrides?.[ctx.state.style]?.retype?.[item.id] ?? item.type
    const it = type === item.type ? item : { ...item, type }
    const [w, d, h] = it.size ?? [PROP_CUBE, PROP_CUBE, PROP_CUBE]
    const g = run('tipo', type, builders.get(type), [it, makeEnv()], () => kit.box(w, h, d, greyMat()))
    kit.finalize(g, it)
    if (NO_SHADOW_TYPES.has(type)) noCast(g)
    if (g.userData.warning) ctx.log.warn(`furn: ${g.userData.warning}`)
    g.userData.itemId = it.id
    g.userData.type = type
    return g
  }

  /** Costruisce UN oggetto d'appoggio con origine sul piano; nome non registrato: cubetto grigio. */
  furn.prop = (name, opts = {}) => {
    const base = String(name).split(':')[0]
    const g = run('prop', base, propBuilders.get(base), [opts, makeEnv()], () => kit.box(PROP_CUBE, PROP_CUBE, PROP_CUBE, greyMat()))
    kit.finalize(g, null)
    noCast(g)
    g.userData.prop = base
    return g
  }

  for (const m of MODULES) m.register(furn)
  ctx.debug.kit = kit
  createPreview(ctx)
}
