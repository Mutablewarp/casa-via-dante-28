/** Attrezzi comuni a esterni e città: accumulo di geometrie per materiale, istanze, generatore con seme. */
import * as THREE from 'three'

const WHITE = [1, 1, 1]
const _c = new THREE.Color()

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
 * Colore esadecimale in componenti lineari (per gli attributi di vertice).
 * @param {string|number} hex
 * @returns {number[]} [r, g, b]
 */
export function rgb(hex) {
  _c.set(hex)
  return [_c.r, _c.g, _c.b]
}

/** Accumula quad e triangoli per materiale e li trasforma in una mesh per materiale. */
export class Batch {
  constructor() {
    this.parts = new Map()
  }

  _p(mat) {
    let p = this.parts.get(mat)
    if (!p) this.parts.set(mat, (p = { pos: [], nor: [], uv: [], col: [] }))
    return p
  }

  /** Quad con quattro vertici in senso antiorario visto dal lato della normale. */
  quad(mat, v, n, uvs, color = WHITE) {
    const p = this._p(mat)
    for (const i of [0, 1, 2, 0, 2, 3]) {
      p.pos.push(...v[i])
      p.nor.push(...n)
      p.uv.push(...uvs[i])
      p.col.push(...color)
    }
  }

  /** Triangolo; la normale è ricavata dai vertici, con `up` la si volge verso l'alto. */
  tri(mat, a, b, c, o = {}) {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const l = Math.hypot(...n) || 1
    n = n.map((k) => k / l)
    let tri = [a, b, c]
    if (o.up && n[1] < 0) {
      tri = [a, c, b]
      n = n.map((k) => -k)
    }
    const hs = o.hs ?? 0.5
    const p = this._p(mat)
    const col = o.color ? rgb(o.color) : WHITE
    for (const q of tri) {
      p.pos.push(...q)
      p.nor.push(...n)
      p.uv.push(q[0] * hs, q[2] * hs)
      p.col.push(...col)
    }
  }

  /** Quad libero (a, b, c, d in ordine di perimetro) come due triangoli. */
  free(mat, a, b, c, d, o = {}) {
    this.tri(mat, a, b, c, o)
    this.tri(mat, a, c, d, o)
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
    const h = (x, z) => ((nz !== 0 ? x : z) - ou) * su
    const col = o.color ? rgb(o.color) : WHITE
    this.quad(
      mat,
      [[ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az]],
      [nx, 0, nz],
      [[h(ax, az), (y0 - oy) * sv], [h(bx, bz), (y0 - oy) * sv], [h(bx, bz), (y1 - oy) * sv], [h(ax, az), (y1 - oy) * sv]],
      col,
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
    const p = this._p(mat)
    for (const i of [0, 1, 2, 0, 2, 3]) {
      p.pos.push(...v[i])
      p.nor.push(0, up ? 1 : -1, 0)
      p.uv.push(...uv[i])
      p.col.push(...(Array.isArray(col[0]) ? col[i] : col))
    }
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
    const T = m ? (q) => new THREE.Vector3(...q).applyMatrix4(m).toArray() : (q) => q
    const N = m ? (q) => new THREE.Vector3(...q).transformDirection(m).toArray() : (q) => q
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
    const g = g0.index ? g0.toNonIndexed() : g0.clone()
    if (o.m) g.applyMatrix4(o.m)
    const pa = g.attributes.position
    const na = g.attributes.normal
    const ua = g.attributes.uv
    const p = this._p(mat)
    const col = o.color ? rgb(o.color) : WHITE
    for (let i = 0; i < pa.count; i++) {
      p.pos.push(pa.getX(i), pa.getY(i), pa.getZ(i))
      p.nor.push(na.getX(i), na.getY(i), na.getZ(i))
      p.uv.push(ua ? ua.getX(i) : 0, ua ? ua.getY(i) : 0)
      p.col.push(...col)
    }
    g.dispose()
  }

  /**
   * Crea una mesh per materiale e le aggiunge a `group`.
   * @param {THREE.Object3D} group
   * @param {{cast?: boolean, receive?: boolean, name?: string}} o
   * @returns {THREE.Mesh[]}
   */
  build(group, o = {}) {
    const out = []
    for (const [mat, p] of this.parts) {
      if (!p.pos.length) continue
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3))
      g.setAttribute('normal', new THREE.Float32BufferAttribute(p.nor, 3))
      g.setAttribute('uv', new THREE.Float32BufferAttribute(p.uv, 2))
      g.setAttribute('color', new THREE.Float32BufferAttribute(p.col, 3))
      g.computeBoundingSphere()
      const mesh = new THREE.Mesh(g, mat)
      mesh.name = o.name ?? 'batch'
      mesh.castShadow = !!o.cast
      mesh.receiveShadow = o.receive ?? true
      group.add(mesh)
      out.push(mesh)
    }
    return out
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
