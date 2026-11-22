/** Baldacchino: colonne tornite, cielo con cornice, tendaggi raccolti e velo. */
import * as THREE from 'three'

/** Profilo tornito della colonna alta `H`. */
function columnProfile(H) {
  return [
    [0.06, 0], [0.06, 0.09], [0.045, 0.11], [0.05, 0.16], [0.07, 0.26], [0.045, 0.38], [0.036, 0.46],
    [0.036, H - 0.5], [0.05, H - 0.42], [0.04, H - 0.34], [0.036, H - 0.28], [0.052, H - 0.2],
    [0.06, H - 0.12], [0.04, H - 0.06], [0.03, H - 0.03], [0.001, H],
  ]
}

/** Sagoma frontale di un tendaggio raccolto: largo in alto, stretto alla fascia, svasato in basso. */
function drapeOutline(H, wTop, wMid, wLow, yLow, yMid, yTop) {
  return [
    [-wLow / 2, yLow], [wLow / 2, yLow], [wMid / 2, yMid], [wTop / 2, yTop], [-wTop / 2, yTop], [-wMid / 2, yMid],
  ]
}

/**
 * Parti del baldacchino da aggiungere al letto.
 * @param {{size:number[]}} item @param {object} env @returns {THREE.Group}
 */
export function buildCanopy(item, env) {
  const [w, d, H] = item.size
  const { kit, mat } = env
  const g = new THREE.Group()
  const wood = mat('wood.primary')
  const dark = mat('wood.dark')
  const curtain = mat('fabric.curtain')
  const cx = w / 2 - 0.06
  const cz = d / 2 - 0.06
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(kit.lathe(columnProfile(H), wood, { x: sx * cx, z: sz * cz }, 10))

  // cielo: telaio, pannello in tessuto e cornice sagomata ai quattro lati
  const yb = H - 0.16
  g.add(kit.box(w - 0.1, 0.07, 0.08, dark, { y: yb, z: -cz }))
  g.add(kit.box(w - 0.1, 0.07, 0.08, dark, { y: yb, z: cz }))
  for (const sx of [-1, 1]) g.add(kit.box(0.08, 0.07, d - 0.1, dark, { x: sx * cx, y: yb }))
  g.add(kit.box(w - 0.14, 0.03, d - 0.14, mat('fabric.bedAccent'), { y: yb + 0.04 }))
  g.add(kit.crest(w - 0.2, 0.1, 0.05, wood, { y: yb + 0.06, z: cz }))
  g.add(kit.crest(w - 0.2, 0.1, 0.05, wood, { y: yb + 0.06, z: -cz }))
  for (const sx of [-1, 1]) {
    const side = kit.crest(d - 0.2, 0.08, 0.05, wood, { x: sx * cx, y: yb + 0.06 })
    side.rotation.y = Math.PI / 2
    g.add(side)
  }
  g.add(kit.box(w - 0.08, 0.025, d - 0.08, wood, { y: yb - 0.02 }))

  // tendaggi raccolti alle colonne, aperti verso l'interno
  const yTop = H - 0.19
  const wide = Math.min(0.5, w * 0.24)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const head = sz < 0
      const out = drapeOutline(H, wide * 0.7, head ? 0.12 : 0.1, head ? wide * 0.9 : wide * 0.75, 0.04, 1.0, yTop)
      g.add(kit.extrude(out, 0.045, curtain, { x: sx * (cx - wide * 0.3), z: sz * (cz - 0.07) }, { bevel: 0.006 }))
      g.add(kit.cyl(0.03, 0.03, 0.05, mat('metal.accent'), { x: sx * (cx - 0.03), y: 0.975, z: sz * (cz - 0.07) }, 8))
    }
  }
  // velo sui due lati lunghi, dalla testa a metà letto
  for (const sx of [-1, 1]) {
    const len = d * 0.42
    g.add(kit.box(0.012, H - 0.65, len, mat('fabric.sheer'), { x: sx * (cx - 0.02), y: 0.45, z: -cz + len / 2 + 0.06 }))
  }
  return g
}
