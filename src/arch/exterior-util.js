/** Attrezzi comuni a esterni e città: accumulo di geometrie per materiale, pareti in coordinate locali, istanze. */
import * as THREE from 'three'

const WHITE = [1, 1, 1]
const QUAD = [0, 1, 2, 0, 2, 3]
const _c = new THREE.Color()
const _v = new THREE.Vector3()

/**
 * Generatore pseudo-casuale con seme (mulberry32).
 * @param {number} seed
 * @returns {() => number} funzione che restituisce numeri in [0, 1)
 */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Colore in componenti lineari (per gli attributi di vertice); una terna già pronta passa invariata.
 * @param {string|number|number[]} hex
 * @returns {number[]} [r, g, b]
 */
export function rgb(hex) {
  if (Array.isArray(hex)) return hex
  _c.set(hex)
  return [_c.r, _c.g, _c.b]
}

/**
 * Terna lineare moltiplicata per `k` (ombre dipinte, variazioni di tono).
 * @param {number[]} c @param {number} k
 * @returns {number[]}
 */
export const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k]

/** Accumula quad e triangoli per materiale e li trasforma in una mesh indicizzata per materiale. */
export class Batch {
  constructor() {
    this.parts = new Map()
  }

  _p(mat) {
    let p = this.parts.get(mat)
    if (!p) this.parts.set(mat, (p = { pos: [], nor: [], uv: [], col: [], idx: [], n: 0 }))
    return p
  }

  /** Vertici con normale comune; `color` è una terna oppure una terna per vertice. */
  _verts(p, v, n, uvs, color) {
    const multi = Array.isArray(color[0])
    for (let i = 0; i < v.length; i++) {
      const q = v[i]
      const t = uvs[i]
      const c = multi ? color[i] : color
      p.pos.push(q[0], q[1], q[2])
      p.nor.push(n[0], n[1], n[2])
      p.uv.push(t[0], t[1])
      p.col.push(c[0], c[1], c[2])
    }
    p.n += v.length
  }

  /** Quad con quattro vertici in senso antiorario visto dal lato della normale. */
  quad(mat, v, n, uvs, color = WHITE) {
    const p = this._p(mat)
    const b = p.n
    this._verts(p, v, n, uvs, color)
    for (const i of QUAD) p.idx.push(b + i)
  }

  /**
   * Triangolo; la normale è ricavata dai vertici, con `up` la si volge verso l'alto.
   * UV: `o.uv` (tre coppie) oppure proiezione dall'alto in metri × `o.hs`.
   */
  tri(mat, a, b, c, o = {}) {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const l = Math.hypot(n[0], n[1], n[2]) || 1
    n = [n[0] / l, n[1] / l, n[2] / l]
    let t = [a, b, c]
    let uv = o.uv
    if (o.up && n[1] < 0) {
      t = [a, c, b]
      n = [-n[0], -n[1], -n[2]]
      if (uv) uv = [uv[0], uv[2], uv[1]]
    }
    const hs = o.hs ?? 0.5
    const p = this._p(mat)
    const base = p.n
    this._verts(p, t, n, uv ?? t.map((q) => [q[0] * hs, q[2] * hs]), o.color ? rgb(o.color) : WHITE)
    p.idx.push(base, base + 1, base + 2)
  }

  /** Quad libero (a, b, c, d in ordine di perimetro) come due triangoli. */
  free(mat, a, b, c, d, o = {}) {
    this.tri(mat, a, b, c, o.uv ? { ...o, uv: [o.uv[0], o.uv[1], o.uv[2]] } : o)
    this.tri(mat, a, c, d, o.uv ? { ...o, uv: [o.uv[0], o.uv[2], o.uv[3]] } : o)
  }

  /**
   * Parete verticale tra due punti in pianta; `(nx, nz)` è la normale uscente.
   * Le UV sono u = coordinata lungo la parete × su, v = (y - oy) × sv.
   */
  wall(mat, nx, nz, x0, z0, x1, z1, y0, y1, o = {}) {
    const rx = nz
    const rz = -nx
    const fwd = (x1 - x0) * rx + (z1 - z0) * rz >= 0
    const [ax, az, bx, bz] = fwd ? [x0, z0, x1, z1] : [x1, z1, x0, z0]
    const su = o.su ?? 1
    const sv = o.sv ?? su
    const oy = o.oy ?? 0
    const ou = (nz !== 0 ? o.ox : o.oz) ?? 0
    const du = o.du ?? 0
    const h = (x, z) => ((nz !== 0 ? x : z) - ou) * su + du
    const va = (y0 - oy) * sv + (o.dv ?? 0)
    const vb = (y1 - oy) * sv + (o.dv ?? 0)
    this.quad(
      mat,
      [[ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az]],
      [nx, 0, nz],
      [[h(ax, az), va], [h(bx, bz), va], [h(bx, bz), vb], [h(ax, az), vb]],
      o.vcol ?? (o.color ? rgb(o.color) : WHITE),
    )
  }

  /** Piano orizzontale a quota `y`; UV in metri (moltiplicate per `su`). */
  horiz(mat, x0, z0, x1, z1, y, up = true, o = {}) {
    const su = o.su ?? 1
    // vcol: quattro colori, uno per vertice (stesso ordine del quad), per sfumature
    const col = o.vcol ? o.vcol.map(rgb) : o.color ? rgb(o.color) : WHITE
    const v = up
      ? [[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]]
      : [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]
    const uv = v.map((q) => [(q[0] - (o.ox ?? 0)) * su, (q[2] - (o.oz ?? 0)) * su])
    this.quad(mat, v, [0, up ? 1 : -1, 0], uv, col)
  }

  /**
   * Parallelepipedo. `skip` è una stringa con le facce da omettere (per esempio '+y-y').
   * Con `o.m` (Matrix4) viene ruotato/traslato dopo la costruzione.
   */
  box(mat, x0, y0, z0, x1, y1, z1, o = {}) {
    const skip = o.skip ?? ''
    const su = o.su ?? 1
    const suz = o.suz ?? su
    const sv = o.sv ?? su
    const col = o.color ? rgb(o.color) : WHITE
    const { ox = 0, oy = 0, oz = 0, m } = o
    const T = m ? (q) => _v.set(q[0], q[1], q[2]).applyMatrix4(m).toArray() : (q) => q
    const N = m ? (q) => _v.set(q[0], q[1], q[2]).transformDirection(m).toArray() : (q) => q
    const faces = [
      ['+z', [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1]],
      ['-z', [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1]],
      ['+x', [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0]],
      ['-x', [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0]],
      ['+y', [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0]],
      ['-y', [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0]],
    ]
    for (const [f, v, n] of faces) {
      if (skip.includes(f)) continue
      const ax = f[1]
      const uv = v.map((q) =>
        ax === 'y' ? [(q[0] - ox) * su, (q[2] - oz) * su]
          : ax === 'x' ? [(q[2] - oz) * suz, (q[1] - oy) * sv]
            : [(q[0] - ox) * su, (q[1] - oy) * sv])
      this.quad(mat, v.map(T), N(n), uv, col)
    }
  }

  /** Aggiunge una BufferGeometry di Three (anche indicizzata), con matrice e colore facoltativi. */
  geo(mat, g0, o = {}) {
    const g = o.m ? g0.clone().applyMatrix4(o.m) : g0
    const pa = g.attributes.position
    const na = g.attributes.normal
    const ua = g.attributes.uv
    const ca = o.color ? null : g.attributes.color
    const p = this._p(mat)
    const col = o.color ? rgb(o.color) : WHITE
    const base = p.n
    for (let i = 0; i < pa.count; i++) {
      p.pos.push(pa.getX(i), pa.getY(i), pa.getZ(i))
      p.nor.push(na.getX(i), na.getY(i), na.getZ(i))
      p.uv.push(ua ? ua.getX(i) : 0, ua ? ua.getY(i) : 0)
      if (ca) p.col.push(ca.getX(i), ca.getY(i), ca.getZ(i))
      else p.col.push(col[0], col[1], col[2])
    }
    p.n += pa.count
    if (g.index) for (let i = 0; i < g.index.count; i++) p.idx.push(base + g.index.getX(i))
    else for (let i = 0; i < pa.count; i++) p.idx.push(base + i)
    if (o.m) g.dispose()
  }

  /**
   * Una BufferGeometry per materiale (per le mesh istanziate fatte di più pezzi).
   * @returns {Map<THREE.Material, THREE.BufferGeometry>}
   */
  geometries() {
    const out = new Map()
    for (const [mat, p] of this.parts) {
      if (!p.n) continue
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3))
      g.setAttribute('normal', new THREE.Float32BufferAttribute(p.nor, 3))
      g.setAttribute('uv', new THREE.Float32BufferAttribute(p.uv, 2))
      g.setAttribute('color', new THREE.Float32BufferAttribute(p.col, 3))
      g.setIndex(p.n > 65535 ? new THREE.Uint32BufferAttribute(p.idx, 1) : new THREE.Uint16BufferAttribute(p.idx, 1))
      g.computeBoundingSphere()
      out.set(mat, g)
    }
    return out
  }

  /**
   * Crea una mesh per materiale e le aggiunge a `group`.
   * @param {THREE.Object3D} group
   * @param {{cast?: boolean, receive?: boolean, name?: string, order?: number}} o
   * @returns {THREE.Mesh[]}
   */
  build(group, o = {}) {
    const out = []
    for (const [mat, g] of this.geometries()) {
      const mesh = new THREE.Mesh(g, mat)
      mesh.name = o.name ?? 'batch'
      mesh.castShadow = !!o.cast && !mat.transparent
      mesh.receiveShadow = o.receive ?? true
      if (o.order != null) mesh.renderOrder = o.order
      group.add(mesh)
      out.push(mesh)
    }
    return out
  }
}

/**
 * Parete in coordinate locali: `u` lungo la parete (verso destra per chi la guarda da fuori), `y` in alto,
 * `d` verso l'esterno. Serve a costruire lo stesso dettaglio su pareti rivolte a ±x o ±z.
 */
export class Frame {
  /**
   * @param {Batch} B @param {number} ox @param {number} oz origine (spigolo sinistro, visto da fuori)
   * @param {number} nx @param {number} nz normale uscente (asse)
   * @param {number} [su] scala delle UV in metri @param {number} [uo] sfasamento delle UV lungo la parete
   */
  constructor(B, ox, oz, nx, nz, su = 0.25, uo = 0) {
    Object.assign(this, { B, ox, oz, nx, nz, rx: nz, rz: -nx, su, uo, N: [nx, 0, nz], R: [nz, 0, -nx], L: [-nz, 0, nx] })
  }

  /** Punto del mondo dalle coordinate locali. */
  p(u, y, d) {
    return [this.ox + this.rx * u + this.nx * d, y, this.oz + this.rz * u + this.nz * d]
  }

  /** Quad rivolto all'esterno a profondità `d`; `uv` = [u0, v0, u1, v1] (cella di un atlante) oppure metri × su. */
  face(mat, u0, y0, u1, y1, d, col, uv) {
    const s = this.su
    const t = uv ?? [(u0 + this.uo) * s, y0 * s, (u1 + this.uo) * s, y1 * s]
    this.B.quad(mat, [this.p(u0, y0, d), this.p(u1, y0, d), this.p(u1, y1, d), this.p(u0, y1, d)], this.N,
      [[t[0], t[1]], [t[2], t[1]], [t[2], t[3]], [t[0], t[3]]], col)
  }

  /** Quad verticale perpendicolare alla parete, a coordinata `u`, da profondità `d0` a `d1` (fianchi di ringhiera). */
  flank(mat, u, y0, y1, d0, d1, col, uv) {
    this.B.quad(mat, [this.p(u, y0, d1), this.p(u, y0, d0), this.p(u, y1, d0), this.p(u, y1, d1)], this.R,
      [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]], col)
  }

  /** Facce laterali e orizzontali di un volume locale: 'l' sinistra, 'r' destra, 't' sopra, 'b' sotto. */
  sides(mat, u0, y0, d0, u1, y1, d1, col, which = 'lrtb') {
    const s = this.su
    const B = this.B
    const yv = [[d1 * s, y0 * s], [d0 * s, y0 * s], [d0 * s, y1 * s], [d1 * s, y1 * s]]
    const hv = [[u0 * s, d1 * s], [u1 * s, d1 * s], [u1 * s, d0 * s], [u0 * s, d0 * s]]
    if (which.includes('r')) B.quad(mat, [this.p(u1, y0, d1), this.p(u1, y0, d0), this.p(u1, y1, d0), this.p(u1, y1, d1)], this.R, yv, col)
    if (which.includes('l')) B.quad(mat, [this.p(u0, y0, d0), this.p(u0, y0, d1), this.p(u0, y1, d1), this.p(u0, y1, d0)], this.L, yv, col)
    if (which.includes('t')) B.quad(mat, [this.p(u0, y1, d1), this.p(u1, y1, d1), this.p(u1, y1, d0), this.p(u0, y1, d0)], [0, 1, 0], hv, col)
    if (which.includes('b')) B.quad(mat, [this.p(u0, y0, d0), this.p(u1, y0, d0), this.p(u1, y0, d1), this.p(u0, y0, d1)], [0, -1, 0], hv, col)
  }

  /** Volume sporgente dalla parete (senza la faccia contro il muro); `skip` toglie facce tra 'f', 'l', 'r', 't', 'b'. */
  box(mat, u0, y0, d0, u1, y1, d1, col, skip = '') {
    if (!skip.includes('f')) this.face(mat, u0, y0, u1, y1, d1, col)
    this.sides(mat, u0, y0, d0, u1, y1, d1, col, 'lrtb'.replace(new RegExp(`[${skip}f]`, 'g'), ''))
  }

  /** Imbotte di un'apertura profonda `r`: quattro facce interne, quella alta più scura (ombra dipinta). */
  reveal(mat, u0, y0, u1, y1, r, col, dark = 0.62) {
    const s = this.su
    const B = this.B
    const top = shade(col, dark)
    const uv = [[0, y0 * s], [r * s, y0 * s], [r * s, y1 * s], [0, y1 * s]]
    const hv = [[u0 * s, 0], [u1 * s, 0], [u1 * s, r * s], [u0 * s, r * s]]
    B.quad(mat, [this.p(u0, y0, 0), this.p(u0, y0, -r), this.p(u0, y1, -r), this.p(u0, y1, 0)], this.R, uv, [col, shade(col, 0.8), top, shade(col, 0.85)])
    B.quad(mat, [this.p(u1, y0, -r), this.p(u1, y0, 0), this.p(u1, y1, 0), this.p(u1, y1, -r)], this.L, uv, [shade(col, 0.8), col, shade(col, 0.85), top])
    B.quad(mat, [this.p(u0, y1, -r), this.p(u1, y1, -r), this.p(u1, y1, 0), this.p(u0, y1, 0)], [0, -1, 0], hv, top)
    B.quad(mat, [this.p(u0, y0, 0), this.p(u1, y0, 0), this.p(u1, y0, -r), this.p(u0, y0, -r)], [0, 1, 0], hv, col)
  }
}

/**
 * Mesh istanziata da una lista di `{ p: [x,y,z], s?: [sx,sy,sz], ry?: rad, color? }`.
 * @returns {THREE.InstancedMesh}
 */
export function instanced(geo, mat, items, o = {}) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(items.length, 1))
  const d = new THREE.Object3D()
  items.forEach((it, i) => {
    d.position.set(...it.p)
    d.rotation.set(0, it.ry ?? 0, 0)
    d.scale.set(...(it.s ?? [1, 1, 1]))
    d.updateMatrix()
    m.setMatrixAt(i, d.matrix)
    if (it.color) m.setColorAt(i, _c.set(it.color))
  })
  m.count = items.length
  m.instanceMatrix.needsUpdate = true
  if (m.instanceColor) m.instanceColor.needsUpdate = true
  m.castShadow = !!o.cast
  m.receiveShadow = o.receive ?? true
  m.name = o.name ?? 'instanced'
  m.computeBoundingSphere()
  return m
}
