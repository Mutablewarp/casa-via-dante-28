/** Parti dei serramenti: mostre, telai, ante di porte, portefinestre e finestre. */
import { box, cyl, extrude, surroundShape, leafMatrix } from './openings-geo.js'

const SHOW_W = 0.09 // larghezza mostra
const SHOW_T = 0.02 // spessore mostra
const FRAME_W = 0.05 // sezione del telaio
const LEAF_GAP = 0.015 // luce sotto e sopra l'anta

/**
 * Mostre attorno a un foro, sui lati richiesti.
 * `env.put(mat, geom)` porta la geometria dal riferimento locale al mondo.
 * @param {object} env contesto di costruzione
 * @param {number} w luce del foro
 * @param {number} y0 quota inferiore del foro (0 per le porte)
 * @param {number} y1 quota superiore del foro
 * @param {number} t spessore del muro
 * @param {number[]} sides lati: +1 (verso +z locale) e/o -1
 * @param {number} r raggio degli angoli superiori esterni
 */
export function surround(env, w, y0, y1, t, sides, r) {
  const shape = surroundShape(w, y0, y1, SHOW_W, r)
  for (const s of sides) {
    const g = extrude(shape, SHOW_T, 10)
    g.translate(0, 0, s > 0 ? t / 2 : -t / 2 - SHOW_T)
    env.put(env.mats.trim, g)
  }
}

/** Telaio di una porta nello spessore del muro: due montanti e un traverso. */
export function doorFrame(env, w, head, t) {
  const d = t - 0.004
  for (const s of [-1, 1]) env.put(env.mats.trim, box(0.04, head, d, s * (w / 2 - 0.02), head / 2, 0))
  env.put(env.mats.trim, box(w - 0.08, 0.04, d, 0, head - 0.02, 0))
}

/** Maniglia a leva su entrambe le facce, a distanza `x` dal cardine. */
function lever(lp, brass, x, y, th) {
  for (const s of [-1, 1]) {
    lp(brass, box(0.025, 0.025, 0.05, x, y, s * (th / 2 + 0.025)))
    lp(brass, box(0.13, 0.02, 0.02, x - 0.05, y, s * (th / 2 + 0.05)))
    lp(brass, box(0.05, 0.05, 0.008, x, y, s * (th / 2 + 0.004)))
  }
}

/**
 * Anta di porta piena a specchiature, da cardine a punta.
 * @param {object} env contesto di costruzione
 * @param {number[]} hinge [x, z] cardine
 * @param {number[]} tip [x, z] punta
 * @param {number} head altezza dell'anta
 * @param {boolean} entry true per il portoncino (6 cm, noce, pannelli)
 */
export function doorLeaf(env, hinge, tip, head, entry) {
  const { m, len } = leafMatrix(hinge[0], hinge[1], tip[0], tip[1])
  const th = entry ? 0.06 : 0.04
  const h = head - 2 * LEAF_GAP
  const slabMat = entry ? env.mats.wood : env.mats.door
  const panMat = entry ? env.mats.woodSec : env.mats.door
  const lp = (mat, g, cast = true) => env.putM(m, mat, g, cast)
  lp(slabMat, box(len, h, th, len / 2, LEAF_GAP + h / 2, 0))
  const rows = [[0.15, h * 0.45], [h * 0.52, h - 0.12]]
  const cols = entry ? 2 : 1
  const pw = (len - 0.2 - (cols - 1) * 0.08) / cols
  for (const [a, b] of rows) for (let c = 0; c < cols; c++) for (const s of [-1, 1]) {
    const cx = 0.1 + pw / 2 + c * (pw + 0.08)
    lp(panMat, box(pw, b - a, 0.012, cx, LEAF_GAP + (a + b) / 2, s * (th / 2 + 0.003)))
  }
  if (entry) {
    for (const s of [-1, 1]) {
      lp(env.mats.brass, cyl(0.03, 0.04, len - 0.1, 1.05, s * (th / 2 + 0.02)))
      lp(env.mats.brass, cyl(0.012, 0.02, len / 2, 1.55, s * (th / 2 + 0.01)))
    }
  } else lever(lp, env.mats.brass, len - 0.07, 1.0, th)
}

/** Anta di portafinestra: telaio sottile, due traversi, vetro. */
export function frenchLeaf(env, hinge, tip, head) {
  const { m, len } = leafMatrix(hinge[0], hinge[1], tip[0], tip[1])
  const th = 0.04
  const h = head - 2 * LEAF_GAP
  const put = (mat, g, cast = true) => env.putM(m, mat, g, cast)
  const y0 = LEAF_GAP
  for (const x of [FRAME_W / 2, len - FRAME_W / 2]) put(env.mats.trim, box(FRAME_W, h, th, x, y0 + h / 2, 0))
  put(env.mats.trim, box(len - 2 * FRAME_W, 0.1, th, len / 2, y0 + 0.05, 0))
  put(env.mats.trim, box(len - 2 * FRAME_W, 0.06, th, len / 2, y0 + h - 0.03, 0))
  for (const f of [1 / 3, 2 / 3]) put(env.mats.trim, box(len - 2 * FRAME_W, 0.035, th, len / 2, y0 + h * f, 0))
  put(env.mats.glass, box(len - 2 * FRAME_W, h - 0.16, 0.006, len / 2, y0 + h / 2, 0), false)
  for (const s of [-1, 1]) {
    put(env.mats.brass, box(0.02, 0.1, 0.02, len - 0.05, 1.0, s * (th / 2 + 0.01)))
  }
}

/** Box con la metà verso +z nel materiale interno e quella verso -z nel materiale esterno. */
function splitBox(env, w, h, d, x, y) {
  env.put(env.mats.trim, box(w, h, d / 2, x, y, d / 4))
  env.put(env.mats.ext, box(w, h, d / 2, x, y, -d / 4))
}

/** Telaio di finestra o portafinestra (montanti e traverso alto; il basso solo per le finestre). */
export function sashFrame(env, w, y0, y1, t, withSill) {
  const d = t - 0.004
  const hh = y1 - y0
  for (const s of [-1, 1]) splitBox(env, FRAME_W, hh, d, s * (w / 2 - FRAME_W / 2), y0 + hh / 2)
  splitBox(env, w - 2 * FRAME_W, FRAME_W, d, 0, y1 - FRAME_W / 2)
  if (withSill) splitBox(env, w - 2 * FRAME_W, FRAME_W, d, 0, y0 + FRAME_W / 2)
}

/**
 * Finestra: telaio in due metà, due ante chiuse a filo interno con vetro.
 * @param {boolean} frosted true per vetro satinato
 */
export function windowSashes(env, w, sill, head, t, frosted) {
  const hh = head - sill
  const zi = t / 2 - 0.03
  const yMid = sill + hh / 2
  env.put(env.mats.trim, box(0.05, hh - 2 * FRAME_W, 0.04, 0, yMid, zi))
  for (const y of [sill + FRAME_W + 0.03, head - FRAME_W - 0.03]) {
    env.put(env.mats.trim, box(w - 2 * FRAME_W, 0.06, 0.04, 0, y, zi))
  }
  env.put(frosted ? env.mats.frosted : env.mats.glass, box(w - 2 * FRAME_W, hh - 2 * FRAME_W, 0.006, 0, yMid, zi), false)
}
