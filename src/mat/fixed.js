/** Materiali che non dipendono dalla stanza: parti condominiali (fisse) e finiture che seguono lo stile. */
import { setMat, ensureRepeat } from './apply.js'
import { fineNoise, contextFacade } from './textures.js'
import { klinker } from './klinker.js'
import { wallProps, plaster, reliefOf } from './surfaces.js'
import { tokenProps } from './tokens.js'

/**
 * @param {object} ctx @param {object} store cache texture
 * @param {{ room: (id: string) => {floor: THREE.Material} }} link superfici delle stanze (per `outdoorFloor:<id>`)
 * @param {{ get: (token: string) => THREE.Material }} tokens
 */
export function createFixed(ctx, store, link) {
  const { THREE } = ctx
  const ex = ctx.styles.exterior
  const fx = ctx.styles.fixed
  const fine = () => store.get('fine', () => fineNoise(THREE))
  const tok = (name) => tokenProps(ctx, store, name)
  const stucco = (relief) => ({ normalMap: plaster(ctx, store), relief }) // intonaco esterno: grana più viva di quello interno

  /** Nome -> proprietà. `dyn` = segue lo stile corrente. */
  const SPEC = {
    facade: { f: () => ({ color: ex.facade, roughness: 0.95, map: fine(), ...stucco(3) }) },
    klinker: {
      f: () => {
        const map = store.get('klinker', () => klinker(THREE, ex.klinker.color, ex.klinker))
        return { color: '#ffffff', roughness: ex.klinker.roughness, map, ...reliefOf(map) }
      },
    },
    pillar: { f: () => ({ color: ex.pillars, roughness: 0.85, ...stucco(2) }) },
    soffit: { f: () => ({ color: ex.soffit, roughness: 0.9, ...stucco(2) }) },
    railing: { f: () => ({ color: ex.railing.color, roughness: 0.5, metalness: 0.35 }) },
    handrail: { f: () => ({ color: ex.railing.handrail, roughness: 0.45 }) },
    verandaFrame: { f: () => ({ color: ex.verandaFrame, roughness: 0.45, metalness: 0.3 }) },
    wallcap: { dyn: true, f: () => ({ color: fx.wallcap.color, roughness: fx.wallcap.roughness }) },
    context: { dyn: true, f: () => ({ color: fx.context.color, roughness: fx.context.roughness }) },
    // tetto piano dell'edificio confinante: grigio dei lastrici della città (PAL.roofFlat), con grana
    contextRoof: { f: () => ({ color: '#a39c8f', roughness: 0.95, map: fine(), ...stucco(3) }) },
    // pareti dell'edificio confinante: finestre neutre (i tetti hanno `contextRoof`)
    contextWall: { dyn: true, f: () => ({ color: fx.context.color, roughness: fx.context.roughness, map: store.get('contextFacade', () => contextFacade(THREE, ctx.plan.meta.ceilingHeight)) }) },
    common: { dyn: true, f: () => wallProps(ctx, store, 'pianerottolo') },
    trim: { dyn: true, f: () => ({ color: ctx.currentStyle().trim.frames, roughness: 0.5 }) },
    door: { dyn: true, f: () => ({ color: ctx.currentStyle().trim.doors, roughness: 0.5 }) },
    // ante degli armadi a muro: pannello in tessuto; il telaio in legno è `builtinFrame`
    builtin: {
      dyn: true, tiles: true,
      f: () => {
        const map = ensureRepeat(THREE, ctx.tex.tile('tessuto_floreale'))
        return { color: '#ffffff', roughness: 0.85, map, ...map.userData.pbr }
      },
    },
    builtinFrame: { dyn: true, f: () => tok('wood.secondary') },
    sill: { dyn: true, f: () => tok('stone.bath') },
    glass: { dyn: true, f: () => tok('glass.clear') },
    glassFrosted: { dyn: true, f: () => tok('glass.frosted') },
  }

  const cache = new Map()
  let unknown = null
  const warned = new Set()

  const apply = (name) => setMat(cache.get(name), SPEC[name].f())

  return {
    /** Materiale fisso per `name`; `outdoorFloor:<id>` restituisce il pavimento dello spazio esterno. */
    get(name) {
      if (name.startsWith('outdoorFloor:')) return link.room(name.slice(13)).floor
      let m = cache.get(name)
      if (m) return m
      if (!SPEC[name]) {
        if (!warned.has(name)) { warned.add(name); ctx.log.warn(`mat: materiale fisso sconosciuto "${name}"`) }
        unknown ??= new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.8 })
        return unknown
      }
      m = new THREE.MeshStandardMaterial()
      cache.set(name, m)
      apply(name)
      return m
    },
    /** Al cambio di stile: aggiorna sul posto ciò che segue lo stile. */
    refresh() {
      for (const name of cache.keys()) if (SPEC[name].dyn && !SPEC[name].tiles) apply(name)
    },
    /** Rilegge le texture di A2 dopo che ha aggiornato la sua cache. */
    refreshTiles() {
      for (const name of cache.keys()) if (SPEC[name].tiles) apply(name)
    },
    materials: () => [...cache.values()],
  }
}
