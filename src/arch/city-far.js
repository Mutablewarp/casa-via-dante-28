/** Politeama, gru del porto e fondale dei monti (anello a 900 m con Monte Cuccio). */
import * as THREE from 'three'
import { rng } from './exterior-util.js'
import { hazed } from './city-blocks.js'

const BACKDROP = { radius: 900, height: 160, baseY: -60, tex: [4096, 512] }
const EYE_Y = 1.6 // altezza dell'occhio a cui si riferiscono le quote delle creste
const HAZE = '#c9d0d9'
const NIGHT_TINT = [0.1, 0.12, 0.22] // moltiplicatore del fondale a notte piena
const DIST = 250 // distanza del Politeama dall'attico: i suoi colori sono già velati
const C = Object.fromEntries(Object.entries({ stone: '#dccfb6', light: '#efe6d2', wall: '#c7b79c', red: '#b9614a', roof: '#74837a', bronze: '#33383a' }).map(([k, v]) => [k, hazed(v, DIST * 0.55)]))
const _m = new THREE.Matrix4()

/**
 * Politeama: rotonda con colonnato a due ordini, fascia rossa pompeiana, copertura a cono ribassato;
 * davanti, in asse con la via, l'arco trionfale con la quadriga scura e i due cavalieri ai lati.
 * @param {object} S accumuli e materiali
 * @param {number[]} at [x, z] del punto dato da plan.context
 * @param {number} G quota della strada (y)
 */
export function buildPoliteama(S, at, G) {
  const { B, M } = S
  const [px, pz] = at
  const cx = px - 24
  const cyl = (r, h, y, col, seg = 28, r2 = r) => B.geo(M.plain, new THREE.CylinderGeometry(r2, r, h, seg), { m: _m.makeTranslation(cx, G + y + h / 2, pz), color: col })
  const ring = (n, rad, r, h, y) => {
    const g = new THREE.CylinderGeometry(r * 0.86, r, h, 6, 1, true)
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * Math.PI * 2
      B.geo(M.plain, g, { m: _m.makeTranslation(cx + Math.cos(a) * rad, G + y + h / 2, pz + Math.sin(a) * rad), color: C.light })
    }
  }
  cyl(20, 1.6, 0, C.stone)
  cyl(16.6, 9.4, 1.6, C.wall) // primo ordine: muro in ombra dietro le colonne
  ring(26, 18.2, 0.62, 8, 1.6)
  cyl(19, 1.4, 9.6, C.light)
  cyl(15.2, 7.6, 11, C.red) // secondo ordine: fascia rossa dietro le colonne
  ring(26, 16.8, 0.5, 6.4, 11)
  cyl(17.6, 1.2, 17.4, C.light)
  cyl(14.6, 2.4, 18.6, C.stone)
  cyl(15, 5.2, 21, C.roof, 28, 1.6)
  cyl(1.6, 2, 26.2, C.light, 8)
  // arco trionfale: lastra con fornice ad arco, estrusa lungo x
  const [w, h, d] = [22, 21, 7]
  const sh = new THREE.Shape([[-w / 2, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]].map((p) => new THREE.Vector2(...p)))
  const hole = new THREE.Path()
  hole.moveTo(-4.6, 0)
  hole.lineTo(-4.6, 10.5)
  hole.absarc(0, 10.5, 4.6, Math.PI, 0, true)
  hole.lineTo(4.6, 0)
  sh.holes.push(hole)
  const arch = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 7 })
  B.geo(M.plain, arch, { m: _m.makeRotationY(Math.PI / 2).setPosition(px - d / 2, G, pz), color: C.stone })
  B.box(M.plain, px - d / 2 - 0.5, G + h, pz - w / 2 - 0.6, px + d / 2 + 0.5, G + h + 1.2, pz + w / 2 + 0.6, { color: C.light })
  B.box(M.plain, px - d / 2 + 0.4, G + h + 1.2, pz - 6.5, px + d / 2 - 0.4, G + h + 3.4, pz + 6.5, { color: C.stone })
  for (const dz of [-9.6, -6.4, 6.4, 9.6]) B.geo(M.plain, new THREE.CylinderGeometry(0.7, 0.8, 15, 8, 1, true), { m: _m.makeTranslation(px + d / 2 + 0.5, G + 9, pz + dz), color: C.light })
  // quadriga: carro e figura al centro, quattro cavalli a ventaglio; due cavalieri sui piedritti
  const y = G + h + 3.4
  const dark = { color: C.bronze }
  B.box(M.plain, px - 1.6, y, pz - 1.3, px + 0.6, y + 2.2, pz + 1.3, dark)
  B.box(M.plain, px - 1, y + 2.2, pz - 0.5, px - 0.2, y + 5.2, pz + 0.5, dark)
  for (const dz of [-3.9, -1.5, 1.5, 3.9]) {
    B.box(M.plain, px + 0.4, y + 1.1, pz + dz - 0.5, px + 3.2, y + 2.7, pz + dz + 0.5, dark)
    B.box(M.plain, px + 2.6, y + 2.5, pz + dz - 0.35, px + 3.5, y + 4.1 + (Math.abs(dz) < 2 ? 0.5 : 0), pz + dz + 0.35, dark)
    for (const dx of [0.6, 2.7]) B.box(M.plain, px + dx, y, pz + dz - 0.2, px + dx + 0.35, y + 1.1, pz + dz + 0.2, dark)
  }
  for (const dz of [-9.4, 9.4]) {
    B.box(M.plain, px - 1.4, G + h + 1.2, pz + dz - 0.5, px + 1.6, G + h + 3, pz + dz + 0.5, dark)
    B.box(M.plain, px - 0.3, G + h + 3, pz + dz - 0.35, px + 0.5, G + h + 4.6, pz + dz + 0.35, dark)
  }
}

/** Gru del porto: pochi segmenti sottili, appena accennati dietro il Politeama. */
export function buildCranes(S, at, G) {
  const [px, pz] = at
  const o = { color: hazed('#3a3d42', 380) }
  for (const [dx, dz, h] of [[-70, -24, 62], [-86, 4, 54], [-104, 30, 66]]) {
    const x = px + dx
    const z = pz + dz
    S.F.box(S.M.plain, x - 0.5, G, z - 0.5, x + 0.5, G + h, z + 0.5, o)
    S.F.box(S.M.plain, x - 22, G + h - 2.5, z - 0.4, x + 12, G + h - 1.8, z + 0.4, o)
    S.F.box(S.M.plain, x - 0.4, G + h - 2.5, z - 0.4, x + 0.4, G + h + 6, z + 0.4, o)
  }
}

/** Creste in metri sopra l'occhio, in funzione dell'angolo (rad da +z verso +x); `layer` 0 = le più lontane. */
function skyline(th, layer) {
  const deg = ((th * 180) / Math.PI + 360) % 360
  const toX = Math.min(Math.abs(deg - 90), 360 - Math.abs(deg - 90)) // distanza angolare dal verso +x
  // creste alte tra +x e -z, basse verso -x e +z (dove ci sono il Politeama e la foschia)
  const f = 0.22 + 0.78 * (0.5 + 0.5 * Math.cos(((deg - 135) * Math.PI) / 180))
  const k = layer + 1
  let h = f * ([44, 33, 22][layer] + [12, 10, 8][layer] * Math.sin(th * (3 + k * 2) + k * 1.7) + 5 * Math.sin(th * (11 + k * 6) + k) + 2.2 * Math.sin(th * (37 + k * 9) + k * 3) + 1.1 * Math.sin(th * 97 + k))
  if (layer === 2) {
    h += 62 * Math.exp(-((toX / 2.1) ** 1.25)) // Monte Cuccio: cima a punta in asse con +x
    h += 38 * Math.exp(-((Math.abs(deg - 85.6) / 2) ** 1.5)) // seconda gobba accanto
    h += 20 * Math.exp(-toX / 10)
  }
  return Math.max(h, 1.5)
}

/** Texture 4096 × 512 dei monti: tre piani con prospettiva aerea, solchi sui versanti, foschia chiara all'orizzonte. */
function backdropTexture() {
  const [W, H] = BACKDROP.tex
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')
  const yOf = (h) => H * (1 - (EYE_Y + h - BACKDROP.baseY) / BACKDROP.height)
  const rand = rng(900)
  const base = yOf(-2)
  // dal più lontano (chiaro e azzurro) al più vicino (più scuro, appena violaceo)
  const layers = [['#bcc8de', '#cdd6e4'], ['#a2aecb', '#c2ccde'], ['#8590b2', '#b7c1d6']]
  layers.forEach(([top, low], layer) => {
    const crest = []
    for (let x = 0; x <= W; x += 2) crest.push(yOf(skyline((x / W) * Math.PI * 2, layer)))
    const path = () => {
      g.beginPath()
      g.moveTo(0, base)
      crest.forEach((y, i) => g.lineTo(i * 2, y))
      g.lineTo(W, base)
      g.closePath()
    }
    const grad = g.createLinearGradient(0, yOf(60), 0, base)
    grad.addColorStop(0, top)
    grad.addColorStop(1, low)
    g.fillStyle = grad
    path()
    g.fill()
    g.save()
    path()
    g.clip()
    // solchi e versanti in ombra: tratti che scendono dalla cresta, più marcati sul piano vicino
    for (let k = 0; k < 900; k++) {
      const i = Math.floor(rand() * crest.length)
      const len = 6 + rand() * (14 + layer * 16)
      g.strokeStyle = rand() < 0.5 ? `rgba(40,48,84,${0.05 + layer * 0.035})` : `rgba(255,244,226,${0.05 + layer * 0.03})`
      g.lineWidth = 1 + rand() * (1 + layer)
      g.beginPath()
      g.moveTo(i * 2, crest[i] + rand() * 4)
      g.lineTo(i * 2 + (rand() - 0.35) * len * 0.9, crest[i] + len)
      g.stroke()
    }
    g.restore()
  })
  const haze = g.createLinearGradient(0, yOf(26), 0, base)
  haze.addColorStop(0, 'rgba(201,208,217,0)')
  haze.addColorStop(1, 'rgba(201,208,217,0.92)')
  g.fillStyle = haze
  g.fillRect(0, yOf(26), W, base - yOf(26))
  g.fillStyle = HAZE // sotto l'orizzonte il fondale si fonde con il terreno
  g.fillRect(0, base, W, H - base)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  return t
}

/**
 * Fondale: cilindro di 900 m visto da dentro. Il Monte Cuccio sta in direzione +x (u = 0,25);
 * verso -x l'orizzonte è basso e velato. Di notte si scurisce seguendo `state.night`.
 * @param {object} ctx contesto condiviso
 * @param {THREE.Object3D} group gruppo della città
 */
export function buildBackdrop(ctx, group) {
  const mat = new THREE.MeshBasicMaterial({ map: backdropTexture(), side: THREE.BackSide, transparent: true, fog: false, depthWrite: false })
  const geo = new THREE.CylinderGeometry(BACKDROP.radius, BACKDROP.radius, BACKDROP.height, 128, 1, true)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = BACKDROP.baseY + BACKDROP.height / 2
  mesh.name = 'backdrop'
  mesh.renderOrder = -1
  mesh.frustumCulled = false
  group.add(mesh)
  ctx.registry.updaters.push(() => {
    const n = ctx.state.night
    mat.color.setRGB(1 + (NIGHT_TINT[0] - 1) * n, 1 + (NIGHT_TINT[1] - 1) * n, 1 + (NIGHT_TINT[2] - 1) * n)
  })
}
