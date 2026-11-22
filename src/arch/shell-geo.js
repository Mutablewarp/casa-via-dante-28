/** Utilità geometriche per muri, pavimenti e scale: accumulo di quad in una geometria sola. */

/** Accumulatore di quadrilateri con UV in metri; produce una BufferGeometry. */
export class Batch {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.idx = [] }

  /** True se non contiene facce. */
  get empty() { return this.idx.length === 0 }

  /**
   * Aggiunge un quad (4 vertici in senso antiorario visti dalla normale).
   * @param {number[][]} p quattro punti [x, y, z]
   * @param {number[]} n normale [x, y, z]
   * @param {number[][]} t quattro coppie [u, v]
   */
  quad(p, n, t) {
    const b = this.pos.length / 3
    for (let i = 0; i < 4; i++) {
      this.pos.push(p[i][0], p[i][1], p[i][2])
      this.nor.push(n[0], n[1], n[2])
      this.uv.push(t[i][0], t[i][1])
    }
    this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
  }

  /**
   * Faccia verticale tra due punti in pianta, con normale (nx, nz) data.
   * UV: u = coordinata lungo il muro, v = y.
   */
  wall(x0, z0, x1, z1, y0, y1, nx, nz) {
    const rx = nz, rz = -nx
    const fwd = (x1 - x0) * rx + (z1 - z0) * rz >= 0
    const [ax, az, bx, bz] = fwd ? [x0, z0, x1, z1] : [x1, z1, x0, z0]
    const alongX = Math.abs(z1 - z0) < 1e-9
    const ua = alongX ? ax : az, ub = alongX ? bx : bz
    this.quad([[ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az]], [nx, 0, nz],
      [[ua, y0], [ub, y0], [ub, y1], [ua, y1]])
  }

  /** Faccia orizzontale su rect [x0, z0, x1, z1] alla quota y; UV u = x, v = z. */
  flat(rect, y, up) {
    const [x0, z0, x1, z1] = rect
    const p = [[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]]
    const t = [[x0, z0], [x0, z1], [x1, z1], [x1, z0]]
    if (up) this.quad(p, [0, 1, 0], t)
    else this.quad([p[3], p[2], p[1], p[0]], [0, -1, 0], [t[3], t[2], t[1], t[0]])
  }

  /**
   * Parallelepipedo allineato agli assi.
   * @param {number[]} b [x0, y0, z0, x1, y1, z1]
   * @param {string} skip facce da omettere, tra 'e' (+x), 'w' (-x), 'n' (+z), 's' (-z), 't' (su), 'b' (giù)
   */
  box(b, skip = '') {
    const [x0, y0, z0, x1, y1, z1] = b
    if (!skip.includes('e')) this.wall(x1, z0, x1, z1, y0, y1, 1, 0)
    if (!skip.includes('w')) this.wall(x0, z0, x0, z1, y0, y1, -1, 0)
    if (!skip.includes('n')) this.wall(x0, z1, x1, z1, y0, y1, 0, 1)
    if (!skip.includes('s')) this.wall(x0, z0, x1, z0, y0, y1, 0, -1)
    if (!skip.includes('t')) this.flat([x0, z0, x1, z1], y1, true)
    if (!skip.includes('b')) this.flat([x0, z0, x1, z1], y0, false)
  }

  /** Costruisce la BufferGeometry. */
  build(THREE) {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2))
    g.setIndex(this.idx)
    g.computeBoundingSphere()
    return g
  }
}

/**
 * Crea una mesh da un accumulatore (null se vuoto).
 * @param {object} THREE namespace three
 * @param {Batch} batch geometria accumulata
 * @param {object} material materiale condiviso
 * @param {{cast?: boolean, room?: string, name?: string}} opt opzioni
 */
export function meshOf(THREE, batch, material, opt = {}) {
  if (!batch || batch.empty) return null
  const m = new THREE.Mesh(batch.build(THREE), material)
  m.receiveShadow = true
  m.castShadow = !!opt.cast
  if (opt.name) m.name = opt.name
  if (opt.room) m.userData.room = opt.room
  return m
}

/** Restituisce (creandolo) l'accumulatore di una chiave. */
export function slot(map, key) {
  let b = map.get(key)
  if (!b) map.set(key, (b = new Batch()))
  return b
}
