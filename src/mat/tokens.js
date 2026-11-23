/** Materiali degli arredi: un materiale condiviso per token di `styles.<stile>.tokens`. */
import { setMat, ensureRepeat } from './apply.js'
import { woodGrain, marble, weaveNormal } from './textures.js'
import { fitRepeat } from './relief.js'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
/** Ripetizioni della trama su una faccia (le UV dei mobili coprono la faccia intera): filo di 1-3 mm su sedute e cuscini. */
const WEAVE_REPEAT = 9
const MIRROR_COLOR = '#F2F5F5' // argento: quasi bianco
// Vetro: quasi nessun contributo proprio (niente velo chiaro sull'interno visto da fuori), resta il riflesso netto ad angolo radente
const GLASS = { color: '#303030', opacity: 0.07, roughness: 0.03 }
const DARK = 0.05 // sotto questa luminanza un «metallo» è verniciato di nero, non è metallo a vista

/**
 * Finitura fisicamente plausibile per famiglia di token: i colori restano quelli di `styles.json`,
 * cambiano lucido, metallicità e rilievo.
 * @returns {{ roughness: number, metalness: number, color?: string, opacity?: number, relief?: number, weave?: boolean }}
 */
function finish(THREE, token, def) {
  const r = def.roughness ?? 0.8
  const f = { roughness: r, metalness: 0 }
  if (token === 'mirror') return { roughness: clamp(r, 0.03, 0.06), metalness: 1, color: MIRROR_COLOR }
  if (token === 'piano') f.roughness = clamp(r, 0.08, 0.12) // laccato lucido
  else if (token.startsWith('wood.') && def.grain) { f.roughness = clamp(r, 0.35, 0.5); f.relief = 2 } // satinato
  else if (token.startsWith('stone.')) f.roughness = clamp(r, 0.15, 0.25) // pietra lucidata
  else if (token === 'glass.clear') return { ...GLASS, metalness: 0 }
  else if (token.startsWith('fabric.')) { f.weave = true; f.relief = def.sheen === 'velluto' ? 0.6 : def.opacity !== undefined ? 0.5 : 1 }
  else if (token === 'metal.iron') f.roughness = Math.max(r, 0.6) // ferro battuto: scuro e opaco
  else if (token.startsWith('metal.')) {
    // ottone, rame, cromo: metallo pieno, satinato quanto basta a riflettere la stanza senza fare da specchio
    const c = new THREE.Color(def.color)
    const bare = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b >= DARK
    f.metalness = bare ? 1 : 0
    f.roughness = bare ? clamp(r, 0.22, 0.38) : clamp(r, 0.4, 0.55)
  }
  return f
}

/**
 * Proprietà del token `token` da applicare con `setMat`: colore, finitura e mappe.
 * Non chiama `ctx.tex` se il token non ha `texture`.
 * @param {object} ctx @param {object} store cache texture @param {string} token
 * @param {object} [def] voce di `tokens` (di default quella dello stile corrente)
 */
export function tokenProps(ctx, store, token, def = ctx.currentStyle().tokens[token]) {
  const { THREE } = ctx
  const f = finish(THREE, token, def)
  const p = { color: f.color ?? def.color, roughness: f.roughness, metalness: f.metalness, map: null, normalMap: null }
  if (def.texture === 'dorsi_libri') {
    p.map = ensureRepeat(THREE, ctx.tex.bookSpines())
    p.color = '#ffffff'
  } else if (def.veins) {
    p.map = store.get(`marble:${def.color}`, () => marble(THREE, def.color, 1 + (parseInt(def.color.slice(1), 16) % 7)))
    p.color = '#ffffff'
  } else if (def.grain) {
    p.map = store.get('grain', () => woodGrain(THREE))
    p.normalMap = p.map.userData.normalMap
  } else if (f.weave) {
    p.normalMap = fitRepeat(weaveNormal(THREE), { x: WEAVE_REPEAT, y: WEAVE_REPEAT })
  }
  if (f.relief !== undefined) p.relief = f.relief
  const opacity = f.opacity ?? def.opacity
  if (opacity !== undefined) p.opacity = opacity
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
    setMat(m, tokenProps(ctx, store, token, def))
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
