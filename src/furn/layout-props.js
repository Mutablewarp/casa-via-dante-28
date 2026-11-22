/** Oggetti d'appoggio: li costruisce con `ctx.furn.prop` e li dispone sul piano del mobile (coordinate locali del mobile). */
import { tableSettings } from './layout-table.js'

const MIRRORS = new Set(['bath_mirror', 'bath_mirror_double', 'mirror_triptych'])
const CENTER = new Set(['table_runner', 'centerpiece_flowers'])
const SMALL_TOP = 0.7 // sotto questa lunghezza un solo oggetto sta al centro
const POTS_HEIGHT = 1.4
const POTS_BACK = 0.04
const POTS_FROM_LEFT = 0.3

/** @param {string} s "nome" oppure "nome:N" @returns {{ name: string, n: number }} */
function parse(s) {
  const [name, n] = String(s).split(':')
  return { name, n: n ? Number(n) : 1 }
}

/** Posizioni lungo la lunghezza `L` del piano per `m` oggetti: uno solo a un terzo, altrimenti passo regolare. */
function spread(m, L, k, alone) {
  if (m === 1) return alone || L < SMALL_TOP ? 0 : -L / 2 + L / 3
  return -L / 2 + (L * (k + 1)) / (m + 1)
}

/**
 * Costruisce e posiziona gli oggetti d'appoggio di un mobile già posato nel suo gruppo.
 * Gli oggetti diventano figli di `g`: le coordinate sono locali al mobile.
 * @param {object} ctx contesto condiviso
 * @param {object} item voce di `furnishing.items`
 * @param {THREE.Group} g mobile costruito, con posizione e rotazione già impostate
 * @param {object[]} roomItems tutte le voci della stessa stanza (per le sedie dei coperti)
 * @returns {{ records: {name: string, count: number, placeholder: boolean}[], lamps: {x: number, z: number}[] }}
 *   `lamps`: posizione in pianta, nel mondo, di ogni lampada da tavolo
 */
export function placeProps(ctx, item, g, roomItems) {
  const [w0, d0, h0] = item.size
  const top = g.userData.top ?? { y: h0, w: w0 * 0.8, d: d0 * 0.8 }
  const records = []
  const pool = []
  const lampObjs = []
  let endLamps = false
  const dining = item.props.some((p) => parse(p).name === 'table_setting') // i coperti occupano i lati: il resto va al centro
  const put = (obj, lx, lz, ang = 0, y = top.y) => {
    obj.position.set(lx, y, lz)
    obj.rotation.y = ang
    g.add(obj)
  }
  for (const { name, n } of item.props.map(parse)) {
    const objs = Array.from({ length: n }, (_, i) => ctx.furn.prop(name, { item, top, index: i, count: n }))
    records.push({ name, count: n, placeholder: objs.some((o) => o.userData.placeholder === true) })
    if (name === 'table_setting') {
      const spots = tableSettings(g, top, item, roomItems, n)
      objs.forEach((o, i) => spots[i] && put(o, spots[i].x, spots[i].z, spots[i].ang))
    } else if (CENTER.has(name)) {
      objs.forEach((o) => put(o, 0, 0))
    } else if (name === 'candelabra') {
      const off = Math.min(0.4, top.w * 0.2)
      objs.forEach((o, i) => put(o, n === 1 ? 0 : (i - (n - 1) / 2) * 2 * off, 0))
    } else if (MIRRORS.has(name)) {
      objs.forEach((o) => put(o, 0, 0)) // il costruttore si appoggia già al bordo posteriore
    } else if (name === 'copper_pots') {
      objs.forEach((o) => put(o, -top.w / 2 + POTS_FROM_LEFT, -d0 / 2 + POTS_BACK, 0, POTS_HEIGHT))
    } else if (name === 'table_lamp' && n >= 2) {
      endLamps = true
      objs.forEach((o, i) => {
        put(o, (i - (n - 1) / 2) * 2 * Math.max(0.1, top.w / 2 - 0.2), -top.d * 0.2)
        lampObjs.push(o)
      })
    } else {
      for (const o of objs) {
        pool.push(o)
        if (name === 'table_lamp') lampObjs.push(o)
      }
    }
  }
  const m = pool.length
  pool.forEach((o, k) => {
    const back = top.d >= 0.6 && !dining ? -top.d * 0.22 : 0
    put(o, spread(m, top.w, k, endLamps || dining), m >= 3 && k % 2 ? top.d * 0.12 : back)
  })
  const c = Math.cos(g.rotation.y)
  const s = Math.sin(g.rotation.y)
  const lamps = lampObjs.map((o) => ({
    x: g.position.x + o.position.x * c + o.position.z * s,
    z: g.position.z - o.position.x * s + o.position.z * c,
  }))
  return { records, lamps }
}
