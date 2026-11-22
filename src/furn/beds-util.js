/** Utilità leggere per i letti: parallelepipedo smussato a un solo segmento per angolo. */
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

/**
 * Come `kit.rbox` ma con 1 segmento per angolo (108 triangoli invece di 300).
 * @param {number} w @param {number} h @param {number} d @param {number} r raggio
 * @param {THREE.Material} mat @param {{x?:number,y?:number,z?:number}} [at] `y` = quota della base
 * @returns {THREE.Mesh}
 */
export function rboxLo(w, h, d, r, mat, at) {
  const rr = Math.max(Math.min(r, Math.min(w, h, d) / 2 - 1e-4), 1e-4)
  const geo = new RoundedBoxGeometry(w, h, d, 1, rr)
  geo.translate(0, h / 2, 0)
  const m = new THREE.Mesh(geo, mat)
  m.position.set(at?.x ?? 0, at?.y ?? 0, at?.z ?? 0)
  return m
}

/**
 * Sfera leggera (8x6 segmenti) appoggiata sulla base: pomelli e terminali piccoli.
 * @param {number} r @param {THREE.Material} mat @param {{x?:number,y?:number,z?:number}} [at]
 * @returns {THREE.Mesh}
 */
export function ball(r, mat, at) {
  const geo = new THREE.SphereGeometry(r, 8, 6)
  geo.translate(0, r, 0)
  const m = new THREE.Mesh(geo, mat)
  m.position.set(at?.x ?? 0, at?.y ?? 0, at?.z ?? 0)
  return m
}
