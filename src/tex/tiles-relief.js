/**
 * Rilievo e finitura dei rivestimenti di `ctx.tex.tile`: fuga incassata nella normalMap, smalto lucido,
 * fuga più ruvida nella roughnessMap. Le mappe dipendono solo dalla posa (non dal disegno né dallo stile):
 * poche, piccole, condivise e mai ricreate.
 */
import { normalMap, roughnessMap, fitRepeat, joint } from '../mat/relief.js'
import { weaveNormal, WEAVE_METERS } from '../mat/textures.js'
import { vnoise } from '../mat/noise.js'

const N = 256 // lato delle mappe: il riquadro di colore è 512, la fuga resta larga almeno un texel
const ENAMEL = 0.2 // rugosità dello smalto; la mappa la porta fino a `GROUT` nella fuga
const GROUT = 0.85
const POLISHED = 0.18 // marmo in lastra continua

/**
 * Posa di ogni rivestimento: `cols` x `rows` piastrelle nel riquadro, file sfalsate di mezza piastrella (`brick`),
 * mezza fuga `gw` in frazione del riquadro, ondulazione dello smalto `wave` in metri (maiolica fatta a mano).
 */
const LAY = {
  grid: { cols: 2, rows: 2, gw: 2 / 512, wave: 0.00014 },
  slab: { cols: 2, rows: 2, gw: 1.5 / 512, wave: 0.00004 },
  brick: { cols: 2, rows: 4, brick: true, gw: 2 / 512, wave: 0.00008 },
}
const LAYOUT = { maiolica_gialloblu: 'grid', maiolica_blu: 'grid', gres_bianco: 'grid', gres_marmo: 'slab', piastrella_bianca: 'brick' }

const built = new Map() // posa -> { normalMap, roughnessMap }

/** Mappe della posa `kind`, calcolate su un riquadro di lato `meters`. */
function build(THREE, kind, meters) {
  const L = LAY[kind]
  const hm = new Float32Array(N * N), rm = new Float32Array(N * N)
  for (let y = 0, q = 0; y < N; y++) for (let x = 0; x < N; x++, q++) {
    const u = (x + 0.5) / N, v = (y + 0.5) / N
    const row = Math.floor(v * L.rows)
    const fx = u * L.cols + (L.brick && row % 2 ? 0.5 : 0), fy = v * L.rows
    const cx = fx - Math.floor(fx), cy = fy - row
    const edge = Math.min(Math.min(cx, 1 - cx) / L.cols, Math.min(cy, 1 - cy) / L.rows) // frazione del riquadro
    const inGrout = edge < L.gw
    // fuga incassata di 1,2 mm con il bordo dello smalto arrotondato, più la lieve ondulazione della superficie
    hm[q] = joint(edge * meters, L.gw * meters, 0.0012, 0.0025) + L.wave * vnoise(u * 7, v * 7, 7, 61)
    rm[q] = inGrout ? GROUT : ENAMEL + 0.03 * (vnoise(u * 5, v * 5, 5, 62) - 0.5)
  }
  const o = { repeat: [1 / meters, 1 / meters], aniso: 4 }
  return { normalMap: normalMap(THREE, hm, N, N, meters, meters, o), roughnessMap: roughnessMap(THREE, rm, N, N, o) }
}

/**
 * Finitura del rivestimento `name`, nella forma dei parametri di un `MeshStandardMaterial`
 * (chi crea il materiale può scrivere `{ map, ...map.userData.pbr }`).
 * @param {object} THREE @param {string} name nome del rivestimento @param {number} meters lato del riquadro di colore
 * @returns {{ roughness: number, normalMap?: object, roughnessMap?: object, normalScale?: object }}
 */
export function tilePbr(THREE, name, meters) {
  const rep = { x: 1 / meters, y: 1 / meters }
  if (name === 'tessuto_floreale') {
    const n = fitRepeat(weaveNormal(THREE), { x: 1 / WEAVE_METERS, y: 1 / WEAVE_METERS })
    return { roughness: 0.85, normalMap: n, normalScale: new THREE.Vector2(n.userData.normalScale, n.userData.normalScale) }
  }
  const kind = LAYOUT[name]
  if (!kind) return { roughness: POLISHED }
  if (!built.has(kind)) built.set(kind, build(THREE, kind, meters))
  const b = built.get(kind)
  const n = fitRepeat(b.normalMap, rep)
  // roughness 1: la mappa porta il valore vero (smalto 0,2, fuga 0,85)
  return { roughness: 1, normalMap: n, roughnessMap: fitRepeat(b.roughnessMap, rep), normalScale: new THREE.Vector2(n.userData.normalScale, n.userData.normalScale) }
}
