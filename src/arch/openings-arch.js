/** Archi ribassati: riempimento, mostra in legno, intradosso e vetrata Liberty. */
import * as THREE from 'three'
import { box, extrude, polyShape, ellipsePts } from './openings-geo.js'

const SHOW_W = 0.09
const SHOW_T = 0.02
const OPEN_DEG = 80 // apertura delle ante della vetrata
const SEGS = 28

/** Riempimento: i due triangoli curvi tra profilo e rettangolo del foro (sagome a e b). */
function fillShapes(a, spring, head, b) {
  const left = polyShape([[-a, spring], [-a, head], [0, head], ...ellipsePts(0, spring, a, b, Math.PI / 2, Math.PI, SEGS).slice(1, -1)])
  const right = polyShape([[a, spring], ...ellipsePts(0, spring, a, b, 0, Math.PI / 2, SEGS).slice(1), [a, head]])
  return [left, right]
}

/** Mostra in legno: piedritti dritti fino all'imposta e curva esterna/interna a mezza ellisse. */
function showShape(a, spring, b) {
  const w = SHOW_W
  return polyShape([
    [a, 0], [a + w, 0], [a + w, spring],
    ...ellipsePts(0, spring, a + w, b + w, 0, Math.PI, SEGS).slice(1, -1),
    [-a - w, spring], [-a - w, 0], [-a, 0], [-a, spring],
    ...ellipsePts(0, spring, a, b, Math.PI, 0, SEGS).slice(1, -1),
    [a, spring],
  ])
}

/** Intradosso: fascia di spessore `t` lungo la mezza ellisse, rivolta verso l'interno dell'arco. */
function soffit(a, spring, b, t) {
  const pts = ellipsePts(0, spring, a - 0.001, b - 0.001, 0, Math.PI, SEGS)
  const pos = []
  const quad = (p0, p1) => {
    const v = (p, z) => [p[0], p[1], z]
    const a0 = v(p0, -t / 2), a1 = v(p1, -t / 2), b0 = v(p0, t / 2), b1 = v(p1, t / 2)
    pos.push(...a0, ...b0, ...a1, ...a1, ...b0, ...b1)
  }
  for (let i = 0; i < pts.length - 1; i++) quad(pts[i], pts[i + 1])
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2))
  return g
}

/** Anta della vetrata (cerniera sul montante, aperta verso +z) con telaio in `trim` e vetro colorato. */
function glassLeaf(env, a, spring, t, side) {
  const len = a - 0.02
  const th = 0.04
  const h = spring - 0.02
  const g = [
    box(0.06, h, th, 0.03, h / 2, 0), box(0.06, h, th, len - 0.03, h / 2, 0),
    box(len - 0.12, 0.1, th, len / 2, 0.05, 0), box(len - 0.12, 0.08, th, len / 2, h - 0.04, 0),
  ]
  const glass = box(len - 0.12, h - 0.18, 0.006, len / 2, h / 2, 0)
  const open = (OPEN_DEG * Math.PI) / 180
  // sinistra: x -> (cos, sin) in (x, z): rotazione -open; destra: specchiata con mezzo giro
  const rot = side < 0 ? -open : Math.PI + open
  const m = new THREE.Matrix4().makeRotationY(rot).setPosition(side * (a - 0.02), 0.01, t / 2 - 0.02)
  for (const x of g) env.put(env.mats.trim, x.applyMatrix4(m))
  env.put(env.stained, glass.applyMatrix4(m), false)
}

/** Lunetta fissa: mezza ellisse con la stessa vetrata, ritagliata nella parte alta, più traverso e montante. */
function lunette(env, a, spring, b) {
  const half = (sx) => {
    const pts = sx < 0
      ? [[-a, spring], [0, spring], ...ellipsePts(0, spring, a, b, Math.PI / 2, Math.PI, SEGS).slice(1)]
      : [[0, spring], [a, spring], ...ellipsePts(0, spring, a, b, 0, Math.PI / 2, SEGS)]
    const g = new THREE.ShapeGeometry(polyShape(pts)).toNonIndexed()
    const p = g.attributes.position
    const uv = new Float32Array(p.count * 2)
    for (let i = 0; i < p.count; i++) {
      uv[i * 2] = Math.abs(p.getX(i)) / a
      uv[i * 2 + 1] = 0.72 + 0.28 * ((p.getY(i) - spring) / b)
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    return g
  }
  env.put(env.stained, half(-1), false)
  env.put(env.stained, half(1), false)
  env.put(env.mats.trim, box(2 * a, 0.05, 0.04, 0, spring + 0.025, 0))
  env.put(env.mats.trim, box(0.04, b, 0.04, 0, spring + b / 2, 0))
}

/**
 * Costruisce un'apertura ad arco (muro di spessore `t`, +z locale verso la stanza `to`).
 * @param {object} env contesto di costruzione
 * @param {object} o voce di plan.openings
 * @param {number} t spessore del muro
 * @param {{ from: object, to: object, glass: boolean }} k materiali delle due stanze e vetrata
 */
export function buildArch(env, o, t, k) {
  const a = o.width / 2
  const b = o.head - o.spring
  const [l, r] = fillShapes(a, o.spring, o.head, b)
  for (const sh of [l, r]) {
    const front = extrude(sh, t / 2, 16) // metà verso +z
    const back = extrude(sh, t / 2, 16).translate(0, 0, -t / 2)
    env.putUV(k.to, front)
    env.putUV(k.from, back)
  }
  const ms = showShape(a, o.spring, b)
  env.put(env.mats.wood, extrude(ms, SHOW_T, 10).translate(0, 0, t / 2))
  env.put(env.mats.wood, extrude(ms, SHOW_T, 10).translate(0, 0, -t / 2 - SHOW_T))
  env.put(env.mats.trim, soffit(a, o.spring, b, t))
  if (k.glass) {
    glassLeaf(env, a, o.spring, t, -1)
    glassLeaf(env, a, o.spring, t, 1)
    lunette(env, a, o.spring, b)
  }
}
