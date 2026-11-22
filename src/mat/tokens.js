/** Materiali degli arredi: un materiale condiviso per token di `styles.<stile>.tokens`. */
import { setMat, ensureRepeat } from './apply.js'
import { woodGrain, marble } from './textures.js'

/**
 * Proprietà di un token da applicare con `setMat`: colore, finitura e mappe.
 * Non chiama `ctx.tex` se il token non ha `texture`.
 * @param {object} ctx @param {object} store cache texture @param {object} def voce di `tokens`
 */
export function tokenProps(ctx, store, def) {
  const { THREE } = ctx
  // senza envMap un metallo pieno rende nero: tetto a 0,6 (shortcut: da togliere se G assegna envMap)
  const p = { color: def.color, roughness: def.roughness ?? 0.8, metalness: Math.min(def.metalness ?? 0, 0.6), map: null }
  if (def.texture === 'dorsi_libri') {
    p.map = ensureRepeat(THREE, ctx.tex.bookSpines())
    p.color = '#ffffff'
  } else if (def.veins) {
    p.map = store.get(`marble:${def.color}`, () => marble(THREE, def.color, 1 + (parseInt(def.color.slice(1), 16) % 7)))
    p.color = '#ffffff'
  } else if (def.grain) {
    p.map = store.get('grain', () => woodGrain(THREE))
  }
  if (def.opacity !== undefined) p.opacity = def.opacity
  return p
}

/**
 * @param {object} ctx @param {object} store
 * @returns {{ get: (token: string) => THREE.Material, reset: () => void, materials: () => THREE.Material[] }}
 */
export function createTokens(ctx, store) {
  const { THREE } = ctx
  const cache = new Map()
  const warned = new Set()
  let unknown = null

  const build = (def, token) => {
    const velvet = def.sheen === 'velluto'
    const m = velvet ? new THREE.MeshPhysicalMaterial() : new THREE.MeshStandardMaterial()
    const p = tokenProps(ctx, store, def)
    if (token === 'mirror') p.metalness = 0.1 // specchio: grigio chiaro leggibile finché non c'è l'envMap
    setMat(m, p)
    if (velvet) {
      m.sheen = 0.5
      m.sheenRoughness = 0.8
      m.sheenColor = new THREE.Color(def.color).lerp(new THREE.Color(1, 1, 1), 0.25)
    }
    if (def.emissive) { m.emissive = new THREE.Color(def.emissive); m.emissiveIntensity = 0 }
    return m
  }

  return {
    /** Materiale del token nello stile corrente; token ignoto: grigio e un solo avviso. */
    get(token) {
      let m = cache.get(token)
      if (m) return m
      const def = ctx.currentStyle().tokens?.[token]
      if (!def) {
        if (!warned.has(token)) { warned.add(token); ctx.log.warn(`mat: token sconosciuto "${token}"`) }
        unknown ??= new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.8 })
        return unknown
      }
      m = build(def, token)
      cache.set(token, m)
      return m
    },
    /** Svuota la cache e libera i materiali (le texture di `ctx.tex` non si toccano). */
    reset() {
      for (const m of cache.values()) m.dispose()
      cache.clear()
    },
    materials: () => [...cache.values()],
  }
}
