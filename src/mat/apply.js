/** Applica proprietà a un materiale già esistente (aggiornamento sul posto al cambio di stile). */

const MAPS = ['map', 'normalMap', 'roughnessMap']
const ALBEDO_MAX = 0.85 // lineare: nessuna superficie diffonde più di così
const ALBEDO_MIN = 0.03

/** Albedo plausibile: tetto ai bianchi (non per i metalli, dove il colore è la riflettanza) e fondo ai neri. */
function plausible(c, metalness) {
  const hi = Math.max(c.r, c.g, c.b)
  if (metalness < 0.9 && hi > ALBEDO_MAX) c.multiplyScalar(ALBEDO_MAX / hi)
  const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
  if (l < ALBEDO_MIN) {
    if (l > 1e-4) c.multiplyScalar(ALBEDO_MIN / l)
    else c.setScalar(ALBEDO_MIN)
  }
}

/**
 * @param {THREE.Material} m materiale standard
 * @param {{ map?: object|null, normalMap?: object|null, roughnessMap?: object|null, relief?: number, color?: string,
 *   roughness?: number, metalness?: number, opacity?: number }} p
 *   `color` è un esadecimale sRGB, riportato a un albedo plausibile; se la mappa ha `userData.gain` (mappa che
 *   modula il colore) viene schiarito per compensarla; una mappa senza `gain` porta già il colore e resta com'è.
 *   `relief` scala la normalMap (1 = pendenze vere, da `userData.normalScale` della mappa).
 *   Imposta `needsUpdate` solo quando cambia la struttura dello shader (mappa sì/no, trasparenza sì/no).
 */
export function setMat(m, p) {
  for (const k of MAPS) {
    if (p[k] === undefined) continue
    if (!!m[k] !== !!p[k]) m.needsUpdate = true
    m[k] = p[k]
  }
  if (p.normalMap) {
    const s = (p.normalMap.userData?.normalScale ?? 1) * (p.relief ?? 1)
    m.normalScale.set(s, s)
  }
  if (p.metalness !== undefined) m.metalness = p.metalness
  if (p.color !== undefined) {
    m.color.set(p.color)
    const gain = m.map?.userData?.gain ?? (m.map ? 1 : 0)
    if (gain !== 1) plausible(m.color, m.metalness)
    if (gain > 0 && gain !== 1) {
      m.color.multiplyScalar(gain)
      m.color.r = Math.min(1, m.color.r); m.color.g = Math.min(1, m.color.g); m.color.b = Math.min(1, m.color.b)
    }
  }
  if (p.roughness !== undefined) m.roughness = p.roughness
  if (p.opacity !== undefined) {
    const tr = p.opacity < 1
    if (m.transparent !== tr) m.needsUpdate = true
    m.opacity = p.opacity
    m.transparent = tr
    m.depthWrite = !tr
  }
}

/** Rende una mappa ripetibile se non lo è già (le texture di A2 arrivano di solito già pronte). */
export function ensureRepeat(THREE, tex) {
  if (tex && (tex.wrapS !== THREE.RepeatWrapping || tex.wrapT !== THREE.RepeatWrapping)) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.needsUpdate = true
  }
  return tex
}
