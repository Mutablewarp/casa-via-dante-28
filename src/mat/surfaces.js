/**
 * Superfici delle stanze: pareti, pavimenti, soffitto, battiscopa, zoccolatura.
 *
 * CONVENZIONE UV (valida per B, C, D e per chiunque generi geometria):
 *   1 unità di UV = 1 metro reale.
 *   - muro: u = distanza lungo il muro, v = altezza da terra;
 *   - pavimento: u = x, v = z.
 * Ogni texture ha già `repeat = 1 / L` con L = metri coperti dal canvas: non va cambiato.
 * Le texture sono condivise tra materiali, quindi tutte le pareti usano la stessa scala.
 */
import { setMat, ensureRepeat } from './apply.js'
import { hashStr } from './noise.js'
import { wallCloud, wallCloudG, fineNoise, plasterNormal } from './textures.js'
import { floorTexture, floorTextureG } from './floors.js'

/** Forza della normalMap di intonaco: stucco tirato a mano, pittura liscia, soffitto. */
const PLASTER = { terre_fiorentine: 3, pittura_liscia: 1.2, ceiling: 1.2 }
/** Marmo lucidato (scacchiera e lastre venate): la rugosità resta in questo intervallo. */
const POLISHED = [0.12, 0.22]

/** L'intonaco è uno solo per tutte le pareti, i soffitti e la facciata. */
export const plaster = (ctx, store) => store.get('plaster', () => plasterNormal(ctx.THREE))

/** Rilievo agganciato a una mappa di colore (`null` dove manca, così il cambio di stile toglie quello vecchio). */
export const reliefOf = (map) => ({ normalMap: map?.userData.normalMap ?? null, roughnessMap: map?.userData.roughnessMap ?? null })

/**
 * Texture della parete di `id` per lo stile `st`: chiave di cache, `make` sincrono e, se la texture è
 * pesante, `gen` (generatore a fasce, per il pre-riscaldamento).
 */
export function wallTexSpec(ctx, id, st = ctx.currentStyle()) {
  const fin = st.wallFinish ?? {}
  if (fin.type === 'terre_fiorentine') {
    const contrast = fin.contrast ?? 0.1
    return {
      key: `cloud:${contrast}`,
      make: () => wallCloud(ctx.THREE, contrast),
      gen: () => wallCloudG(ctx.THREE, contrast),
    }
  }
  return { key: 'fine', make: () => fineNoise(ctx.THREE), gen: null }
}

/** Texture del pavimento di `id` per lo stile `st`, come `wallTexSpec`; null se la definizione manca o è ignota. */
export function floorTexSpec(ctx, id, st = ctx.currentStyle()) {
  const name = st.floors?.[id] ?? st.floorDefault
  const def = st.floorDefs?.[name]
  if (!def || !floorTextureG(ctx.THREE, def)) return null
  return {
    name, def,
    key: `floor:${JSON.stringify(def)}`,
    make: () => floorTexture(ctx.THREE, def),
    gen: () => floorTextureG(ctx.THREE, def),
  }
}

/** Texture e proprietà di una parete interna per la stanza `id` nello stile corrente. */
export function wallProps(ctx, store, id, st = ctx.currentStyle()) {
  const fin = st.wallFinish ?? {}
  const color = st.walls?.[id] ?? st.wallDefault
  const spec = wallTexSpec(ctx, id, st)
  const liberty = fin.type === 'terre_fiorentine'
  return {
    color, roughness: fin.roughness ?? (liberty ? 0.92 : 0.9), map: store.get(spec.key, spec.make),
    normalMap: plaster(ctx, store), relief: PLASTER[fin.type] ?? 1,
  }
}

/** Proprietà del pavimento dello spazio `id`; senza definizione valida restituisce un grigio e avvisa una volta. */
export function floorProps(ctx, store, id, warn, st = ctx.currentStyle()) {
  const spec = floorTexSpec(ctx, id, st)
  if (!spec) {
    const name = st.floors?.[id] ?? st.floorDefault
    warn(`${st.name}:${id}:${name}`, `mat: pavimento "${name}" (spazio ${id}) non definito, uso un grigio`)
    return { color: '#9a9a9a', roughness: 0.8, map: null, ...reliefOf(null) }
  }
  const { def } = spec
  const map = store.get(spec.key, spec.make)
  let roughness = def.roughness ?? 0.6
  if (def.veins && (def.kind === 'checker' || def.kind === 'slab')) roughness = Math.min(POLISHED[1], Math.max(POLISHED[0], roughness))
  return { color: '#ffffff', roughness, map, ...reliefOf(map) }
}

/**
 * Crea le superfici delle stanze.
 * @param {object} ctx @param {object} store cache texture
 * @param {{ fixed: (name: string) => THREE.Material }} link usato per le pareti e i soffitti degli spazi esterni
 */
export function createSurfaces(ctx, store, link) {
  const { THREE } = ctx
  const rooms = new Map()
  const outdoor = new Set((ctx.plan.outdoor ?? []).map((o) => o.id))
  const known = new Set([...(ctx.plan.rooms ?? []).map((r) => r.id), ...outdoor])
  const warned = new Set()
  const warn = (key, msg) => { if (!warned.has(key)) { warned.add(key); ctx.log.warn(msg) } }
  const std = () => new THREE.MeshStandardMaterial()
  const shared = { ceiling: std(), skirting: std() }

  const wainscotName = (id) => {
    const w = ctx.currentStyle().wainscot
    return id !== 'height' && w && typeof w[id] === 'string' ? w[id] : null
  }

  /** Piastrella decorata della zoccolatura: la repeat arriva da A2 (1 / tileMeters). */
  const wainscotMap = (name) => {
    const tex = ensureRepeat(THREE, ctx.tex.tile(name))
    if (tex && !(tex.userData?.tileMeters > 0)) tex.repeat.set(1 / 0.4, 1 / 0.4)
    return tex
  }

  /** Il rivestimento porta con sé rilievo e finitura (`userData.pbr`, da A2): smalto lucido, fuga incassata e ruvida. */
  const wainscotProps = (name) => {
    const map = wainscotMap(name)
    return { color: '#ffffff', roughness: 0.35, map, normalMap: null, roughnessMap: null, ...map?.userData.pbr }
  }

  const applyAll = (id, r) => {
    const out = outdoor.has(id)
    if (!out) setMat(r.wall, wallProps(ctx, store, id))
    setMat(r.floor, floorProps(ctx, store, id, warn))
    const name = out ? null : wainscotName(id)
    if (name) {
      r.wainscotMat ??= std()
      setMat(r.wainscotMat, wainscotProps(name))
    }
    r.wainscot = name ? r.wainscotMat : null
  }

  const applyShared = () => {
    const st = ctx.currentStyle()
    setMat(shared.ceiling, { color: st.ceiling.color, roughness: 0.95, normalMap: plaster(ctx, store), relief: PLASTER.ceiling })
    setMat(shared.skirting, { color: st.trim.skirting, roughness: 0.5 })
  }

  return {
    /** Materiali di una stanza o spazio esterno; creati una volta, poi aggiornati sul posto. */
    room(id) {
      let r = rooms.get(id)
      if (r) return r
      if (!known.has(id)) warn(`id:${id}`, `mat: spazio sconosciuto "${id}"`)
      const out = outdoor.has(id)
      if (!rooms.size) applyShared()
      r = {
        wall: out ? link.fixed('facade') : std(),
        floor: std(),
        ceiling: out ? link.fixed('soffit') : shared.ceiling,
        skirting: shared.skirting,
        wainscot: null,
        wainscotMat: null,
      }
      rooms.set(id, r)
      applyAll(id, r)
      return r
    },
    /** Al cambio di stile: colori, mappe e roughness senza creare materiali nuovi. */
    refresh() {
      if (rooms.size) applyShared()
      for (const [id, r] of rooms) applyAll(id, r)
    },
    /** Rilegge le piastrelle di A2 (dopo che il suo modulo ha aggiornato la cache). */
    refreshTiles() {
      for (const [id, r] of rooms) {
        const name = outdoor.has(id) ? null : wainscotName(id)
        if (name) setMat(r.wainscotMat, wainscotProps(name))
      }
    },
    materials() {
      const list = [shared.ceiling, shared.skirting]
      for (const r of rooms.values()) list.push(r.wall, r.floor, r.wainscotMat)
      return list.filter(Boolean)
    },
  }
}
