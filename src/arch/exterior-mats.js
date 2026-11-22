/** Materiali e texture da canvas di esterni e città (finestre, coppi), condivisi tra exterior.js e city.js. */
import * as THREE from 'three'

/** Misure del disegno delle facciate (m): larghezza di una campata e altezza di un piano della città. */
export const OURS_BAY = 2.6
export const CITY_BAY = 3.0
export const CITY_FLOOR = 3.4

/** Colori di città e strada (stilizzati, chiari e desaturati). */
export const PAL = {
  windowGlass: '#27313a',
  lightWindow: '#ffd9a0',
  shopGlass: '#2c353d',
  fascia: '#9b2f2a',
  ground: '#c4bdae',
  haze: '#c9d0d9',
  sidewalk: '#bdb8ae',
  asphalt: '#77777c',
  mark: '#ecebe6',
  trunk: '#6b5a48',
  lampPole: '#3c4046',
  roofTile: '#c9694a',
  roofFlat: '#9a9488',
}

const cache = new WeakMap()

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function texOf(cv, aniso) {
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = aniso
  return t
}

/** Disegno di una campata del nostro edificio: pannelli in klinker ai lati della finestra. */
function drawOurs(g, W, H, ex) {
  g.fillStyle = ex.facade
  g.fillRect(0, 0, W, H)
  g.fillStyle = 'rgba(0,0,0,0.10)'
  g.fillRect(0, H * 0.923, W, H * 0.077) // spessore del solaio in fondo al piano
  const panels = [[0, 0.16], [0.84, 0.16]]
  for (const [u, w] of panels) {
    g.fillStyle = ex.klinker.color
    g.fillRect(u * W, H * 0.12, w * W, H * 0.76)
    g.fillStyle = 'rgba(0,0,0,0.18)'
    for (let x = u * W; x < (u + w) * W; x += 6) g.fillRect(x, H * 0.12, 1.5, H * 0.76)
  }
  const wx = W * 0.24
  const ww = W * 0.52
  const wy = H * 0.2
  const wh = H * 0.52
  g.fillStyle = PAL.windowGlass
  g.fillRect(wx, wy, ww, wh)
  g.fillStyle = 'rgba(255,255,255,0.12)'
  g.fillRect(wx, wy, ww, wh * 0.35)
  g.strokeStyle = ex.pillars
  g.lineWidth = 6
  g.strokeRect(wx, wy, ww, wh)
  g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh)
  g.fillStyle = ex.pillars
  g.fillRect(wx - 5, wy + wh, ww + 10, 6)
}

/** Disegno di una finestra lit: stessa geometria, bianco su nero. */
function drawOursLit(g, W, H) {
  g.fillStyle = '#000'
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#fff'
  g.fillRect(W * 0.24 + 4, H * 0.2 + 4, W * 0.52 - 8, H * 0.52 - 8)
}

/** Campata generica della città: intonaco quasi bianco (si tinge con i colori di vertice). */
function drawCity(g, W, H) {
  g.fillStyle = '#ebebeb'
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#d8d8d8'
  g.fillRect(0, H * 0.94, W, H * 0.06)
  const wx = W * 0.3
  const ww = W * 0.4
  const wy = H * 0.2
  const wh = H * 0.55
  g.fillStyle = '#fafafa'
  g.fillRect(wx - 9, wy - 9, ww + 18, wh + 18) // cornice chiara
  g.fillStyle = PAL.windowGlass
  g.fillRect(wx, wy, ww, wh)
  g.fillStyle = 'rgba(255,255,255,0.1)'
  g.fillRect(wx, wy, ww, wh * 0.3)
  g.fillStyle = '#fafafa'
  g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh)
  g.fillRect(wx - 12, wy + wh + 9, ww + 24, 6)
}

function drawCityLit(g, W, H) {
  g.fillStyle = '#000'
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#fff'
  g.fillRect(W * 0.3 + 3, H * 0.2 + 3, W * 0.4 - 6, H * 0.55 - 6)
}

/** Coppi: file di archetti in grigio chiaro, da tingere con i colori di vertice. */
function drawCoppi(g, W, H) {
  g.fillStyle = '#d4d4d4'
  g.fillRect(0, 0, W, H)
  const r = 16
  for (let row = 0; row < H / r + 1; row++) {
    for (let x = -r; x < W + r; x += r * 1.0) {
      const off = row % 2 ? r / 2 : 0
      const shade = 150 + ((row * 7 + (x / r) * 13) % 5) * 12
      g.fillStyle = `rgb(${shade},${shade},${shade})`
      g.beginPath()
      g.arc(x + off, row * r, r * 0.55, 0, Math.PI)
      g.fill()
      g.strokeStyle = '#a8a8a8'
      g.lineWidth = 2
      g.stroke()
    }
  }
}

/**
 * Materiali condivisi di esterni e città (creati una sola volta per contesto).
 * Le finestre usano `map` + `emissiveMap` (finestre bianche su nero) con `emissiveIntensity` = 0:
 * di notte G ne fa salire l'intensità e si accendono solo i vetri.
 * @param {object} ctx contesto condiviso
 * @returns {object} materiali
 */
export function getMats(ctx) {
  if (cache.has(ctx)) return cache.get(ctx)
  const ex = ctx.styles.exterior
  const aniso = Math.min(8, ctx.renderer.capabilities.getMaxAnisotropy())
  const mk = (draw, lit, w = 256, h = 256) => {
    const a = canvas(w, h)
    draw(a.getContext('2d'), w, h)
    const b = canvas(w, h)
    lit(b.getContext('2d'), w, h)
    return [texOf(a, aniso), texOf(b, aniso)]
  }
  const [oursMap, oursLit] = mk((g, w, h) => drawOurs(g, w, h, ex), drawOursLit)
  const [cityMap, cityLit] = mk(drawCity, drawCityLit)
  const coppiCv = canvas(256, 256)
  drawCoppi(coppiCv.getContext('2d'), 256, 256)
  const lit = (m) => {
    m.emissive = new THREE.Color(PAL.lightWindow)
    m.emissiveIntensity = 0
    ctx.registry.nightMaterials.push(m)
    return m
  }
  const M = {
    ours: lit(new THREE.MeshStandardMaterial({ map: oursMap, emissiveMap: oursLit, roughness: 0.9 })),
    cityWall: lit(new THREE.MeshStandardMaterial({ map: cityMap, emissiveMap: cityLit, vertexColors: true, roughness: 0.95 })),
    roofTile: new THREE.MeshStandardMaterial({ map: texOf(coppiCv, aniso), vertexColors: true, roughness: 0.9 }),
    plain: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }),
    road: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    marks: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    shopGlass: new THREE.MeshStandardMaterial({ color: PAL.shopGlass, roughness: 0.25, metalness: 0.2 }),
    fascia: new THREE.MeshStandardMaterial({ color: PAL.fascia, roughness: 0.7 }),
    trunk: new THREE.MeshStandardMaterial({ color: PAL.trunk, roughness: 1 }),
    crown: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }),
    lampPole: new THREE.MeshStandardMaterial({ color: PAL.lampPole, roughness: 0.6, metalness: 0.4 }),
    lampHead: lit(new THREE.MeshStandardMaterial({ color: '#f2eddc', roughness: 0.5 })),
    carBody: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45, metalness: 0.3 }),
    carGlass: new THREE.MeshStandardMaterial({ color: '#2a3038', roughness: 0.2, metalness: 0.3 }),
  }
  cache.set(ctx, M)
  return M
}
