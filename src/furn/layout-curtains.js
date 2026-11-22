/** Tende: da una voce `mount: 'opening'` ricava la voce sintetica, la posizione e la rotazione sul filo interno del muro. */

const SIDE = 0.25 // m di muro coperti oltre il foro, per lato
const ABOVE = 0.25 // m sopra l'architrave
const DEPTH = 0.18
const PROBE = 0.1 // m oltre il muro per capire da che parte sta la stanza

/**
 * Calcola la tenda di una voce che copre una o più aperture dello stesso muro.
 * @param {object} ctx contesto condiviso
 * @param {object} item voce di `furnishing.items` con `mount: 'opening'`
 * @returns {{ spec: object, x: number, z: number, rot: number } | null} null se le aperture non esistono
 */
export function curtainSpec(ctx, item) {
  const ops = (item.openings ?? []).map((id) => ctx.plan.openings.find((o) => o.id === id)).filter(Boolean)
  if (!ops.length) return null
  const alongX = ops[0].wallAlong !== 'z'
  const [a0, a1, p0, p1] = alongX ? [0, 2, 1, 3] : [1, 3, 0, 2] // indici in rect: lungo il muro, attraverso il muro
  const lo = Math.min(...ops.map((o) => o.rect[a0])) - SIDE
  const hi = Math.max(...ops.map((o) => o.rect[a1])) + SIDE
  const c = (lo + hi) / 2
  const wallLo = Math.min(...ops.map((o) => o.rect[p0]))
  const wallHi = Math.max(...ops.map((o) => o.rect[p1]))
  const at = (along, across) => (alongX ? [along, across] : [across, along])
  const spaceAt = (across) => ctx.grid.spaceAt(...at(c, across))?.id
  // la stanza sta dal lato dove, appena oltre il muro, la griglia dice che c'è lei
  let low = spaceAt(wallLo - PROBE) === item.room
  if (!low && spaceAt(wallHi + PROBE) !== item.room) {
    ctx.log.warn(`layout: ${item.id}: stanza non trovata ai lati del muro, uso il lato basso`)
    low = true
  }
  const inner = low ? wallLo : wallHi
  const rot = alongX ? (low ? 180 : 0) : low ? 270 : 90
  const flip = rot === 90 || rot === 180 // x locale corre contro l'asse del muro
  const clear = ops
    .filter((o) => o.type === 'french')
    .map((o) => (flip ? [c - o.rect[a1], c - o.rect[a0]] : [o.rect[a0] - c, o.rect[a1] - c]))
  const head = Math.max(...ops.map((o) => o.head))
  const spec = { ...item, type: 'curtain', size: [hi - lo, DEPTH, head + ABOVE], opts: { ...item.opts, clear } }
  const [x, z] = at(c, inner)
  return { spec, x, z, rot }
}
