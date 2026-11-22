/** Disposizione dei coperti: uno davanti a ogni sedia vicina, gli altri verso la panca o sui lati lunghi. */

const SEATS = new Set(['chair_dining', 'outdoor_chair', 'outdoor_armchair'])
const NEAR = 0.8 // m: distanza massima di sedie e panche dal bordo del tavolo
const INSET = 0.22 // centro del coperto dal bordo, davanti a una sedia
const INSET_NARROW = 0.17 // idem se il piano è profondo meno di 0,8 m, o verso la panca
const HALF_COVER = 0.15 // metà dei 0,30 m del coperto lungo il bordo
const PI2 = Math.PI / 2

const clamp = (v, lim) => Math.max(-lim, Math.min(lim, v))

/** Coordinate di un punto del mondo nel sistema locale del tavolo `g`. */
function toLocal(g, wx, wz) {
  const r = g.rotation.y
  const dx = wx - g.position.x
  const dz = wz - g.position.z
  return [dx * Math.cos(r) - dz * Math.sin(r), dx * Math.sin(r) + dz * Math.cos(r)]
}

/**
 * Posti a tavola: `n` coperti, ciascuno `{ x, z, ang }` nel sistema locale del tavolo (`ang` = rotazione y, fronte verso il commensale).
 * @param {THREE.Group} g tavolo già posato
 * @param {{y: number, w: number, d: number}} top piano utile
 * @param {object} item voce del tavolo
 * @param {object[]} roomItems voci della stessa stanza
 * @param {number} n numero di coperti richiesti
 * @returns {{x: number, z: number, ang: number}[]}
 */
export function tableSettings(g, top, item, roomItems, n) {
  const [W, D] = [top.w, top.d]
  // distanza dal rettangolo del tavolo e posizione locale di una voce vicina
  const near = (it) => {
    const [lx, lz] = toLocal(g, it.at[0], it.at[1])
    const dist = Math.hypot(Math.max(Math.abs(lx) - item.size[0] / 2, 0), Math.max(Math.abs(lz) - item.size[1] / 2, 0))
    return dist < NEAR ? { lx, lz } : null
  }
  const inset = D < 0.8 ? INSET_NARROW : INSET
  const out = []
  for (const it of roomItems) {
    if (!SEATS.has(it.type) || it.id === item.id) continue
    const p = near(it)
    if (!p) continue
    const { lx, lz } = p
    if (Math.abs(lx) - W / 2 > Math.abs(lz) - D / 2) {
      const sx = Math.sign(lx)
      out.push({ x: sx * (W / 2 - inset), z: clamp(lz, D / 2 - HALF_COVER), ang: sx > 0 ? PI2 : -PI2 })
    } else {
      const sz = Math.sign(lz)
      out.push({ x: clamp(lx, W / 2 - HALF_COVER), z: sz * (D / 2 - inset), ang: sz > 0 ? 0 : Math.PI })
    }
  }
  if (out.length >= n) return out.slice(0, n)
  const missing = n - out.length
  const bench = roomItems.map((it) => (it.type === 'banquette' ? near(it) : null)).find(Boolean)
  const sides = bench ? [Math.sign(bench.lz) || 1] : [1, -1]
  sides.forEach((sz, si) => {
    const m = bench ? missing : si === 0 ? Math.ceil(missing / 2) : Math.floor(missing / 2)
    for (let k = 0; k < m; k++) {
      out.push({ x: -W / 2 + (W * (k + 1)) / (m + 1), z: sz * (D / 2 - INSET_NARROW), ang: sz > 0 ? 0 : Math.PI })
    }
  })
  return out
}
