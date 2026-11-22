/** Librerie, vetrine e cantinetta (E2). Costruttori registrati da storage.js. */
import * as THREE from 'three'
import { edgeR, bookStrips, onionFoot, feet } from './storage-util.js'

/** Libreria a giorno: montanti scanalati (Liberty) o sottili, ripiani con libri, vuoti e soprammobili. */
export function bookcase(item, env) {
  const [w, d, h] = item.size
  const { kit, mat, style } = env
  const lib = style === 'liberty'
  const g = new THREE.Group()
  const wood = mat('wood.primary')
  const dark = mat('wood.dark')
  const rnd = kit.rng(item.id)
  const base = lib ? 0.12 : 0.1
  const cima = lib ? 0.2 : 0
  const post = lib ? 0.07 : 0.03
  const t = lib ? 0.025 : 0.02
  const bays = Math.max(1, Math.round(w / (lib ? 0.9 : 0.85)))
  const inner = h - base - cima
  g.add(kit.box(w - 0.02, base, d - 0.02, dark))
  g.add(kit.box(w - 0.04, inner, 0.015, dark, { y: base, z: -d / 2 + 0.01 }))
  const bw = (w - post) / bays
  const runs = []
  for (let k = 0; k <= bays; k++) {
    const x = -w / 2 + post / 2 + k * bw
    g.add(kit.box(post, inner, d, wood, { x, y: base }))
    if (lib) for (const dx of [-0.02, 0, 0.02]) g.add(kit.box(0.01, inner - 0.1, 0.008, dark, { x: x + dx, y: base + 0.05, z: d / 2 }))
  }
  const ns = Math.max(3, Math.round(inner / 0.36))
  const gap = (inner - t) / ns
  for (let k = 0; k < bays; k++) {
    const xa = -w / 2 + post + k * bw
    const xb = xa + bw - post
    for (let i = 0; i <= ns; i++) g.add(kit.box(xb - xa, t, d - 0.02, wood, { x: (xa + xb) / 2, y: base + i * gap, z: 0.005 }))
    for (let i = 0; i < ns; i++) {
      const y = base + i * gap + t
      const free = gap - t
      let x = xa + 0.03
      while (x < xb - 0.08) {
        const room = xb - 0.03 - x
        const take = Math.min(room, 0.2 + rnd() * 0.5)
        if (rnd() < 0.16) {
          if (lib && rnd() < 0.6) {
            const vase = kit.lathe([[0.001, 0], [0.05, 0.02], [0.06, 0.08], [0.025, 0.14], [0.03, 0.17]], mat('ceramic.pot'), { x: x + 0.07, y, z: -0.02 }, 12)
            vase.userData.noShadow = true
            g.add(vase)
          }
          x += 0.18 + rnd() * 0.12
          continue
        }
        const bh = free * (0.7 + rnd() * 0.22)
        runs.push({ x0: x, x1: x + take, y, h: bh, z: -0.03, dz: d * 0.6 })
        x += take + 0.02 + rnd() * 0.04
      }
    }
  }
  const books = bookStrips(runs, rnd, mat('books'))
  if (books) g.add(books)
  if (lib) {
    g.add(kit.box(w + 0.02, 0.03, d + 0.01, dark, { y: base + inner }))
    g.add(kit.crest(w - 0.1, 0.13, d - 0.1, wood, { y: base + inner + 0.03 }))
  } else g.add(kit.box(w, t, d, wood, { y: h - t }))
  return kit.finalize(g, item)
}

/** Vetrina con vetri e porcellane; i vetri sono davanti, la parte bassa è chiusa. */
export function displayCabinet(item, env) {
  const [w, d, h] = item.size
  const { kit, mat, style } = env
  const lib = style === 'liberty'
  const g = new THREE.Group()
  const frame = style === 'moderno' ? mat('black') : mat('wood.primary')
  const dark = mat('wood.dark')
  const glass = mat('glass.clear')
  const china = mat('ceramic.white')
  const rnd = kit.rng(item.id)
  const foot = lib ? 0.12 : 0.1
  const lowH = h * 0.36
  const cima = lib ? 0.17 : 0
  const upY = foot + lowH
  const upH = h - upY - cima
  if (lib) for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(onionFoot(env, foot, { x: sx * (w / 2 - 0.06), z: sz * (d / 2 - 0.06) }))
  else g.add(feet(env, w, d, foot, 0.05))
  g.add(kit.rbox(w, lowH, d - 0.02, edgeR(env, 0.015), frame, { y: foot }))
  for (const s of [-1, 1]) g.add(kit.panel(w / 2 - 0.05, lowH - 0.1, 0.02, frame, { x: s * (w / 4), y: foot + 0.05, z: d / 2 - 0.02 }, lib ? mat('metal.accent') : null))
  const p = 0.04
  g.add(kit.box(w - 0.04, upH, 0.012, lib ? mat('mirror') : dark, { y: upY, z: -d / 2 + 0.015 }))
  for (const sx of [-1, 1]) g.add(kit.box(p, upH, d - 0.02, frame, { x: sx * (w / 2 - p / 2 - 0.005), y: upY }))
  g.add(kit.box(w - 0.02, 0.035, d - 0.02, frame, { y: upY + upH - 0.035 }))
  g.add(kit.box(w + 0.03, 0.03, d, frame, { y: upY - 0.03 + 0.03 }))
  g.add(kit.box(w - 0.1, upH - 0.04, 0.006, glass, { y: upY + 0.02, z: d / 2 - 0.03 }))
  g.add(kit.box(0.025, upH, 0.025, frame, { y: upY, z: d / 2 - 0.03 }))
  for (const sx of [-1, 1]) g.add(kit.box(0.025, upH, 0.025, frame, { x: sx * (w / 2 - 0.05), y: upY, z: d / 2 - 0.03 }))
  const ns = 3
  for (let i = 1; i <= ns; i++) {
    const y = upY + (upH * i) / (ns + 1)
    g.add(kit.box(w - 0.1, 0.015, d - 0.08, mat('glass.frosted'), { y, z: -0.01 }))
    let x = -w / 2 + 0.17
    while (x < w / 2 - 0.12) {
      const kind = rnd()
      const z = -0.03
      if (kind < 0.4) {
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.01, 12), china)
        plate.rotation.x = Math.PI / 2 - 0.2
        plate.position.set(x, y + 0.095, z - 0.04)
        plate.userData.noShadow = true
        g.add(plate)
        x += 0.2
      } else if (kind < 0.75) {
        const cup = kit.lathe([[0.001, 0], [0.025, 0.004], [0.04, 0.05], [0.036, 0.055], [0.001, 0.05]], china, { x, y: y + 0.0075, z }, 10)
        cup.userData.noShadow = true
        g.add(cup)
        x += 0.12
      } else {
        const tur = kit.lathe([[0.001, 0], [0.05, 0.01], [0.075, 0.07], [0.05, 0.12], [0.03, 0.13], [0.012, 0.16]], china, { x, y: y + 0.0075, z }, 12)
        tur.userData.noShadow = true
        g.add(tur)
        x += 0.2
      }
    }
  }
  if (lib) g.add(kit.crest(w - 0.04, 0.12, d - 0.1, frame, { y: h - cima }))
  return kit.finalize(g, item)
}

/** Distanza di un punto dal rettangolo [-w/2,w/2] x [0,h] lungo la retta: segmento ritagliato `[a,b]` o null. */
function clipLine(p0, dir, w, h) {
  let a = -1e9
  let b = 1e9
  const lim = [[p0[0], dir[0], -w / 2, w / 2], [p0[1], dir[1], 0, h]]
  for (const [p, dd, lo, hi] of lim) {
    if (Math.abs(dd) < 1e-9) { if (p < lo || p > hi) return null; continue }
    const t0 = (lo - p) / dd
    const t1 = (hi - p) / dd
    a = Math.max(a, Math.min(t0, t1))
    b = Math.min(b, Math.max(t0, t1))
  }
  return b > a ? [a, b] : null
}

/** Cantinetta a losanghe con bottiglie coricate in istanze. */
export function wineRack(item, env) {
  const [w, d, h] = item.size
  const { kit, mat } = env
  const g = new THREE.Group()
  const wood = mat('wood.primary')
  const s = 0.3
  const fr = 0.04
  g.add(kit.box(w, 0.08, d, mat('wood.dark')))
  g.add(kit.box(w - 0.02, h - 0.08, 0.012, mat('wood.dark'), { y: 0.08, z: -d / 2 + 0.008 }))
  for (const sx of [-1, 1]) g.add(kit.box(fr, h - 0.08, d, wood, { x: sx * (w / 2 - fr / 2), y: 0.08 }))
  g.add(kit.box(w, fr, d, wood, { y: h - fr }))
  const x0 = w / 2 - fr
  const y0 = 0.08
  const hh = h - 0.08 - fr
  const slat = (c, sign) => {
    // retta y = sign*x + c nel riquadro interno
    const seg = clipLine([0, c], [1, sign], 2 * x0, hh)
    if (!seg) return
    const len = Math.hypot(seg[1] - seg[0], (seg[1] - seg[0]) * sign)
    if (len < 0.05) return
    const tm = (seg[0] + seg[1]) / 2
    const m = kit.box(len, 0.018, d * 0.9, wood, { x: tm, y: y0 + c + sign * tm - 0.009, z: 0 })
    m.rotation.z = Math.atan(sign)
    g.add(m)
  }
  for (let c = -x0 - s; c < hh + x0; c += s) { slat(c, 1); slat(c + 0.0, -1) }
  // bottiglie nelle losanghe (u = y-x, v = y+x), una cella su tre vuota
  const prof = [[0.001, 0], [0.04, 0.005], [0.04, 0.18], [0.014, 0.25], [0.014, 0.3]].map(([r, y]) => new THREE.Vector2(r, y - 0.15))
  const geo = new THREE.LatheGeometry(prof, 6)
  geo.rotateX(Math.PI / 2)
  const cells = []
  for (let k = -8; k < 12; k++) {
    for (let m = -8; m < 12; m++) {
      const x = ((m - k) / 2) * s
      const y = ((m + k + 1) / 2) * s
      if (Math.abs(x) > x0 - 0.1 || y < 0.09 || y > hh - 0.07 || (k + m) % 3 === 0) continue
      cells.push([x, y0 + y])
    }
  }
  const inst = new THREE.InstancedMesh(geo, mat('black'), cells.length)
  const mt = new THREE.Matrix4()
  cells.forEach(([x, y], i) => inst.setMatrixAt(i, mt.makeTranslation(x, y, 0)))
  inst.userData.noShadow = true
  g.add(inst)
  g.userData.top = { y: h, w, d }
  return kit.finalize(g, item)
}
