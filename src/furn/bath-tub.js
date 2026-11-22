/** Vasche: su piedi a zampa (Liberty) o ovale liscia senza piedi (Moderno e Scandinavo). */
import * as THREE from 'three'

/** Profilo della vasca (raggio normalizzato, quota assoluta) con bordo arrotolato di ampiezza `roll`. */
function tubProfile(y0, H, roll) {
  const T = H - y0
  const lip = 0.02 * roll
  return [
    [0.001, y0], [0.82, y0 + 0.01 * T], [0.93, y0 + 0.1 * T], [0.96, y0 + 0.45 * T], [0.97, y0 + 0.82 * T],
    [0.97 + 0.03 * roll, y0 + 0.9 * T], [0.99 + lip, y0 + 0.985 * T], [0.96, y0 + T], [0.925, y0 + 0.985 * T],
    [0.9, y0 + 0.93 * T], [0.88, y0 + 0.5 * T], [0.83, y0 + 0.2 * T], [0.7, y0 + 0.11 * T], [0.001, y0 + 0.09 * T],
  ]
}

/** Piede a zampa in ottone: pallina in basso e fusto rastremato. */
function clawFoot(env, x, z, h) {
  const { kit, mat } = env
  const g = new THREE.Group()
  g.add(kit.sphere(0.035, mat('metal.accent'), { y: 0 }))
  g.add(kit.cyl(0.032, 0.02, h - 0.05, mat('metal.accent'), { y: 0.05 }, 10))
  g.position.set(x, 0, z)
  return g
}

/**
 * @param {{size:number[]}} item @param {object} env @param {boolean} claw vero: su piedi a zampa, bordo arrotolato
 * @returns {THREE.Group}
 */
export function buildTub(item, env, claw) {
  const [w, d, H] = item.size
  const { kit, mat } = env
  const g = new THREE.Group()
  const y0 = claw ? 0.17 : 0.03
  const body = kit.lathe(tubProfile(y0, H, claw ? 1 : 0.3), mat('ceramic.white'), null, 36)
  body.scale.set(w / 2, 1, d / 2)
  g.add(body)
  const metal = mat(claw ? 'metal.accent' : 'metal.chrome')
  if (claw) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(clawFoot(env, sx * w * 0.3, sz * d * 0.28, 0.2))
  } else {
    g.add(kit.cyl(0.46 * w / 2, 0.5 * w / 2, y0, mat('black'), { y: 0 }, 24))
  }
  // rubinetteria a colonna sul lato corto (+x), con il collo a cigno sopra la vasca
  const x0 = w / 2 + 0.015
  g.add(kit.cyl(0.016, 0.02, 0.92, metal, { x: x0, y: 0 }, 10))
  const swan = [[x0, 0.9, 0], [x0, 1.0, 0], [x0 - 0.09, 1.04, 0], [x0 - 0.19, 1.0, 0], [x0 - 0.2, 0.93, 0]]
  g.add(kit.tube(swan, 0.011, metal, { radial: 6 }))
  for (const s of [-1, 1]) {
    g.add(kit.tube([[x0, 0.62, 0], [x0, 0.62, s * 0.06], [x0, 0.66, s * 0.1]], 0.007, metal, { radial: 5 }))
    g.add(kit.sphere(0.02, metal, { x: x0, y: 0.66, z: s * 0.11 }))
  }
  return g
}
