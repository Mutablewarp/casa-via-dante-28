/** Applica proprietà a un materiale già esistente (aggiornamento sul posto al cambio di stile). */

/**
 * @param {THREE.Material} m materiale standard
 * @param {{ map?: object|null, color?: string, roughness?: number, metalness?: number, opacity?: number }} p
 *   `color` è un esadecimale sRGB; se la mappa ha `userData.gain` il colore viene schiarito per compensarla.
 *   Imposta `needsUpdate` solo quando cambia la struttura dello shader (mappa sì/no, trasparenza sì/no).
 */
export function setMat(m, p) {
  if (p.map !== undefined) {
    const had = !!m.map
    m.map = p.map
    if (had !== !!p.map) m.needsUpdate = true
  }
  if (p.color !== undefined) {
    m.color.set(p.color)
    const gain = m.map?.userData?.gain ?? 1
    if (gain !== 1) {
      m.color.multiplyScalar(gain)
      m.color.r = Math.min(1, m.color.r); m.color.g = Math.min(1, m.color.g); m.color.b = Math.min(1, m.color.b)
    }
  }
  if (p.roughness !== undefined) m.roughness = p.roughness
  if (p.metalness !== undefined) m.metalness = p.metalness
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
