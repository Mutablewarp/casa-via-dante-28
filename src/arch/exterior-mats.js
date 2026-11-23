/** Materiali di esterni e città, condivisi tra exterior.js e city.js. Le texture vengono da city-tex*.js. */
import * as THREE from 'three'
import { texOf, stucco, coppi, asphalt, paving, foliage, rail } from './city-tex.js'
import { atlas } from './city-tex-atlas.js'
import { farFacade } from './city-tex-far.js'

/** Misure del disegno delle facciate lontane (m): larghezza di una campata e altezza di un piano. */
export const CITY_BAY = 3.0
export const CITY_FLOOR = 3.4
/** Scale delle UV in metri: lato coperto da una ripetizione di intonaco, coppi, asfalto, lastre e ringhiera. */
export const UV = { stucco: 1 / 4, coppi: 1 / 3.2, asphalt: 1 / 16, paving: 1 / 1.6, rail: 1 / 1.76 }

/** Colori di città e strada. */
export const PAL = {
  lightWindow: '#ffd9a0',
  fascia: '#9b2f2a',
  ground: '#b9b2a4',
  haze: '#c9d0d9',
  sidewalk: '#b4afa6',
  curb: '#d2cec4',
  asphalt: '#8d8e94',
  mark: '#d9d8d2',
  soil: '#5b4a3a',
  trunk: '#6b5a48',
  lampPole: '#3c4046',
  iron: '#2f2b28',
  stone: '#ece6d8',
  roofFlat: '#a39c8f',
}

const cache = new WeakMap()

/**
 * Materiali condivisi di esterni e città (creati una sola volta per contesto).
 * Le finestre accese usano `emissiveMap` con `emissiveIntensity` = 0: di notte G ne alza l'intensità.
 * I palazzi vicini hanno due materiali di serramento sullo stesso atlante: `win` si accende, `winOff` no.
 * @param {object} ctx contesto condiviso
 * @returns {object} materiali
 */
export function getMats(ctx) {
  if (cache.has(ctx)) return cache.get(ctx)
  const aniso = Math.min(8, ctx.renderer.capabilities.getMaxAnisotropy())
  const st = stucco()
  const cp = coppi()
  const far = farFacade(st.map)
  const at = atlas()
  const data = { data: true }
  const T = {
    stucco: texOf(st.map, aniso), stuccoN: texOf(st.nor, aniso, data),
    coppi: texOf(cp.map, aniso), coppiN: texOf(cp.nor, aniso, data),
    far: texOf(far.map, aniso), farLit: texOf(far.lit, aniso), farN: texOf(far.nor, aniso, data),
    atlas: texOf(at.map, aniso), atlasLit: texOf(at.lit, 4), atlasRough: texOf(at.rough, 4, data),
    asphalt: texOf(asphalt(), aniso), paving: texOf(paving(), aniso), foliage: texOf(foliage(), 4),
    rail: texOf(rail(), aniso, { clampT: true }),
  }
  const std = (o) => new THREE.MeshStandardMaterial(o)
  const lit = (m) => {
    m.emissive = new THREE.Color(PAL.lightWindow)
    m.emissiveIntensity = 0
    ctx.registry.nightMaterials.push(m)
    return m
  }
  const offset = (k) => ({ polygonOffset: true, polygonOffsetFactor: -k, polygonOffsetUnits: -k })
  const M = {
    stucco: std({ map: T.stucco, normalMap: T.stuccoN, vertexColors: true, roughness: 0.95 }),
    far: lit(std({ map: T.far, emissiveMap: T.farLit, normalMap: T.farN, vertexColors: true, roughness: 0.95 })),
    tile: std({ map: T.coppi, normalMap: T.coppiN, vertexColors: true, roughness: 0.85 }),
    plain: std({ vertexColors: true, roughness: 0.9 }),
    win: lit(std({ map: T.atlas, emissiveMap: T.atlasLit, roughnessMap: T.atlasRough, vertexColors: true })),
    winOff: std({ map: T.atlas, roughnessMap: T.atlasRough, vertexColors: true }),
    rail: std({ map: T.rail, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.2 }),
    road: std({ map: T.asphalt, vertexColors: true, roughness: 0.95, ...offset(2) }),
    pave: std({ map: T.paving, vertexColors: true, roughness: 0.9 }),
    marks: std({ vertexColors: true, roughness: 0.9, ...offset(4) }),
    leaf: std({ map: T.foliage, vertexColors: true, roughness: 1 }),
    carBody: std({ color: '#ffffff', roughness: 0.35, metalness: 0.5 }),
    carDark: std({ vertexColors: true, roughness: 0.3, metalness: 0.3 }),
    lampPole: std({ color: PAL.lampPole, roughness: 0.6, metalness: 0.4 }),
    lampHead: lit(std({ color: '#f2eddc', roughness: 0.5 })),
  }
  cache.set(ctx, M)
  return M
}
