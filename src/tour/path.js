/** Geometria del percorso del tour: tratti, raccordi, lunghezze cumulate. */

const HARD_TURN = (150 * Math.PI) / 180 // oltre questo angolo il percorso torna indietro: niente raccordo
const MAX_R = 0.12 // raggio massimo del raccordo (m)
const MAX_CUT = 0.05 // quanto il raccordo può avvicinarsi al vertice (m)
const FILLET_STEPS = 8

/** Angolo di sterzata (rad) in un vertice, tra la direzione in arrivo e quella in uscita. */
function turnAngle(a, b, c) {
  const x1 = b[0] - a[0]
  const z1 = b[1] - a[1]
  const x2 = c[0] - b[0]
  const z2 = c[1] - b[1]
  const l = Math.hypot(x1, z1) * Math.hypot(x2, z2)
  if (!l) return 0
  return Math.acos(Math.max(-1, Math.min(1, (x1 * x2 + z1 * z2) / l)))
}

/** Raccorda un vertice morbido con una curva di Bézier quadratica; restituisce i punti sostitutivi. */
function fillet(a, b, c) {
  const th = turnAngle(a, b, c)
  if (th < 0.02) return [b]
  const l1 = Math.hypot(b[0] - a[0], b[1] - a[1])
  const l2 = Math.hypot(c[0] - b[0], c[1] - b[1])
  const half = Math.sin(th / 2)
  // lo scostamento massimo della curva dal vertice vale 0,5 * t * sin(th/2)
  const t = Math.min(0.5 * Math.min(l1, l2), (2 * MAX_CUT) / half, MAX_R * Math.tan(th / 2), 0.35)
  const p0 = [b[0] + ((a[0] - b[0]) / l1) * t, b[1] + ((a[1] - b[1]) / l1) * t]
  const p1 = [b[0] + ((c[0] - b[0]) / l2) * t, b[1] + ((c[1] - b[1]) / l2) * t]
  const out = []
  for (let i = 0; i <= FILLET_STEPS; i++) {
    const u = i / FILLET_STEPS
    const w0 = (1 - u) * (1 - u)
    const w1 = 2 * u * (1 - u)
    const w2 = u * u
    out.push([w0 * p0[0] + w1 * b[0] + w2 * p1[0], w0 * p0[1] + w1 * b[1] + w2 * p1[1]])
  }
  return out
}

/** Tratto continuo di percorso, con posizione e direzione a una data distanza. */
function makeLeg(pts) {
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const length = cum[cum.length - 1]
  /** Indice del segmento che contiene la distanza `s`. */
  const seg = (s) => {
    let i = 1
    while (i < pts.length - 1 && cum[i] < s) i++
    return i
  }
  return {
    pts,
    length,
    /** Posizione a `s` metri dall'inizio del tratto. */
    at(s) {
      const c = Math.min(Math.max(s, 0), length)
      const i = seg(c)
      const d = cum[i] - cum[i - 1]
      const u = d > 0 ? (c - cum[i - 1]) / d : 0
      return { x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, z: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u }
    },
    /** Direzione di marcia (vettore unitario) a `s` metri. */
    tangent(s) {
      const i = seg(Math.min(Math.max(s, 0), length))
      const dx = pts[i][0] - pts[i - 1][0]
      const dz = pts[i][1] - pts[i - 1][1]
      const l = Math.hypot(dx, dz) || 1
      return { x: dx / l, z: dz / l }
    },
  }
}

/**
 * Costruisce le sezioni del percorso: una per ogni coppia di soste consecutive.
 * Ogni sezione è divisa in tratti ai punti dove la camera si ferma (inversioni di marcia).
 * @param {ReadonlyArray<{p:ReadonlyArray<number>, stop?: object}>} path punti di `tour.path`
 * @returns {{ stops: Array<{index:number, pathIndex:number, p:number[], stop:object}>, sections: Array<{legs: ReturnType<typeof makeLeg>[], length:number}> }}
 */
export function buildPath(path) {
  const stops = []
  path.forEach((pt, i) => {
    if (pt.stop) stops.push({ index: stops.length, pathIndex: i, p: [...pt.p], stop: pt.stop })
  })
  const sections = []
  for (let k = 1; k < stops.length; k++) {
    const raw = path.slice(stops[k - 1].pathIndex, stops[k].pathIndex + 1).map((q) => q.p)
    const legs = []
    let cur = [raw[0]]
    for (let i = 1; i < raw.length; i++) {
      if (i === raw.length - 1) {
        cur.push(raw[i])
        break
      }
      if (turnAngle(raw[i - 1], raw[i], raw[i + 1]) > HARD_TURN) {
        cur.push(raw[i]) // inversione: la camera si ferma qui
        legs.push(makeLeg(cur))
        cur = [raw[i]]
      } else {
        cur.push(...fillet(raw[i - 1], raw[i], raw[i + 1]))
      }
    }
    legs.push(makeLeg(cur))
    sections.push({ legs, length: legs.reduce((s, l) => s + l.length, 0) })
  }
  return { stops, sections }
}
