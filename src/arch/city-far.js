/** Politeama, gru del porto e fondale dei monti (anello a 900 m con Monte Cuccio). */
import * as THREE from 'three'
import { rng } from './exterior-util.js'

const BACKDROP = { radius: 900, height: 160, baseY: -60, tex: [4096, 512] }
const EYE_Y = 1.6 // altezza dell'occhio a cui si riferiscono le quote delle creste
const HAZE = '#c9d0d9'
const STONE = '#ddd2bd'
const DARK = '#3a3d42'
const NIGHT_TINT = [0.1, 0.12, 0.22] // moltiplicatore del fondale a notte piena

/**
 * Politeama: rotonda con due ordini di colonne, arco con gruppo scuro in cima. Solo sagoma.
 * @param {object} B batch della città
 * @param {object} M materiali
 * @param {number[]} at [x, z] del punto dato da plan.context
 * @param {number} G quota della strada (y)
 */
export function buildPoliteama(B, M, at, G) {
  const [px, pz] = at
  const cx = px - 22
  const add = (geo, x, y, z, color) => B.geo(M.plain, geo, { m: new THREE.Matrix4().makeTranslation(x, y, z), color })
  const cyl = (r, h, seg = 24) => new THREE.CylinderGeometry(r, r, h, seg)
  add(cyl(17, 8), cx, G + 4, pz, STONE) // basamento
  for (const [yBase, r, h] of [[G + 8, 17, 8], [G + 17, 13, 7]]) {
    add(cyl(r + 0.6, 1), cx, yBase + 0.5, pz, '#efe7d6') // trabeazione
    const n = 22
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      add(cyl(0.55, h - 1, 6), cx + Math.cos(a) * r, yBase + 1 + (h - 1) / 2, pz + Math.sin(a) * r, '#f1ead9')
    }
    add(cyl(r - 0.6, h), cx, yBase + h / 2, pz, '#b9ad98') // muro retrostante, più scuro tra le colonne
  }
  add(cyl(14, 1.2), cx, G + 24.6, pz, '#efe7d6')
  add(new THREE.ConeGeometry(13.5, 3.2, 24), cx, G + 26.8, pz, '#6f7a70') // copertura in rame
  // arco di trionfo in asse con la via, con il gruppo scuro in cima
  const w = 22
  B.box(M.plain, px - 3, G, pz - w / 2, px + 3, G + 20, pz - w / 2 + 6, { color: STONE })
  B.box(M.plain, px - 3, G, pz + w / 2 - 6, px + 3, G + 20, pz + w / 2, { color: STONE })
  B.box(M.plain, px - 3, G + 14, pz - w / 2 + 6, px + 3, G + 20, pz + w / 2 - 6, { color: STONE })
  B.box(M.plain, px - 3.4, G + 20, pz - w / 2 - 0.4, px + 3.4, G + 22.5, pz + w / 2 + 0.4, { color: '#efe7d6' })
  for (const [dz, h] of [[-4, 3.2], [0, 4.4], [4, 3.2]]) B.box(M.plain, px - 1.2, G + 22.5, pz + dz - 1.2, px + 1.2, G + 22.5 + h, pz + dz + 1.2, { color: DARK })
  B.box(M.plain, px - 2, G + 22.5, pz - 6, px + 2, G + 23.4, pz + 6, { color: DARK })
}

/** Gru del porto: pochi segmenti sottili, appena accennati dietro il Politeama. */
export function buildCranes(B, M, at, G) {
  const [px, pz] = at
  for (const [dx, dz, h] of [[-70, -24, 62], [-86, 4, 54], [-104, 30, 66]]) {
    const x = px + dx
    const z = pz + dz
    B.box(M.plain, x - 0.5, G, z - 0.5, x + 0.5, G + h, z + 0.5, { color: DARK })
    B.box(M.plain, x - 22, G + h - 2.5, z - 0.4, x + 12, G + h - 1.8, z + 0.4, { color: DARK })
    B.box(M.plain, x - 0.4, G + h - 2.5, z - 0.4, x + 0.4, G + h + 6, z + 0.4, { color: DARK })
  }
}

/** Profilo delle creste in metri sopra l'occhio, in funzione dell'angolo (rad dal verso +z verso +x). */
function skyline(th, rand, layer) {
  const deg = ((th * 180) / Math.PI + 360) % 360
  const toX = Math.min(Math.abs(deg - 90), 360 - Math.abs(deg - 90)) // distanza dal verso +x
  // creste alte tra +x e -z, basse verso -x e +z (dove c'è il Politeama e la foschia)
  const f = 0.25 + 0.75 * (0.5 + 0.5 * Math.cos(((deg - 135) * Math.PI) / 180))
  let h = f * (layer === 0 ? 34 + 14 * Math.sin(th * 5 + 0.7) : 20 + 9 * Math.sin(th * 7 + 2.1))
  h += f * (layer === 0 ? 6 : 4) * Math.sin(th * 23 + layer) + (rand() - 0.5) * 0.8
  if (layer === 1) {
    h += 66 * Math.exp(-toX / 1.4) // Monte Cuccio: cima a punta in asse con +x
    h += 40 * Math.exp(-Math.abs(deg - 86.2) / 1.6) // seconda gobba accanto
    h += 18 * Math.exp(-toX / 9)
  }
  return Math.max(h, 2)
}

/** Texture 4096 × 512 dei monti: azzurro-violetti, foschia chiara sotto l'orizzonte, trasparente sopra. */
function backdropTexture() {
  const [W, H] = BACKDROP.tex
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')
  const yOf = (h) => H * (1 - (EYE_Y + h - BACKDROP.baseY) / BACKDROP.height)
  const layers = [['#aab5d9', 0], ['#8896c6', 1]]
  const rand = rng(900)
  for (const [col, layer] of layers) {
    g.fillStyle = col
    g.beginPath()
    g.moveTo(0, H)
    for (let x = 0; x <= W; x += 2) g.lineTo(x, yOf(skyline((x / W) * Math.PI * 2, rand, layer)))
    g.lineTo(W, H)
    g.closePath()
    g.fill()
  }
  const grad = g.createLinearGradient(0, yOf(24), 0, yOf(-4))
  grad.addColorStop(0, 'rgba(201,208,217,0)')
  grad.addColorStop(1, 'rgba(201,208,217,0.8)')
  g.fillStyle = grad
  g.fillRect(0, yOf(24), W, yOf(-4) - yOf(24))
  g.fillStyle = HAZE // sotto l'orizzonte il fondale si fonde con il terreno
  g.fillRect(0, yOf(-4), W, H - yOf(-4))
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
