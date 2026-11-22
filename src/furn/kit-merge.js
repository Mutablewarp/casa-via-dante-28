/** Kit arredi, materiali con disegno, fusione delle mesh e chiusura di un oggetto. Convenzione in kit.js. */
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const texMats = new Map()
const KEEP_ATTRS = new Set(['position', 'normal', 'uv'])
const OVERSIZE = 0.08

/**
 * Materiale con quella texture, uno solo per texture (cache per `map.uuid`). Non tocca `repeat` né `offset`.
 * @param {THREE.Texture} map @param {number} [roughness=0.8] usata solo alla prima creazione
 * @returns {THREE.MeshStandardMaterial}
 */
export function texMat(map, roughness = 0.8) {
  let m = texMats.get(map.uuid)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ map, roughness })
    texMats.set(map.uuid, m)
  }
  return m
}

/** Libera i materiali di `texMat` e svuota la cache (le texture sono di A2 e restano). Chiamata da F a ogni cambio di stile. */
export function disposeTexMats() {
  for (const m of texMats.values()) m.dispose()
  texMats.clear()
}

/** Copia non indicizzata con soli position, normal, uv, nel sistema del gruppo; ripristina l'ordine dei triangoli se lo specchio lo inverte. */
function bake(mesh, rel) {
  const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
  for (const name of Object.keys(g.attributes)) if (!KEEP_ATTRS.has(name)) g.deleteAttribute(name)
  if (!g.attributes.normal) g.computeVertexNormals()
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
  g.clearGroups()
  g.applyMatrix4(rel)
  if (rel.determinant() < 0) {
    for (const a of Object.values(g.attributes)) {
      const s = a.itemSize
      for (let i = 0; i + 2 < a.count; i += 3) {
        for (let k = 0; k < s; k++) {
          const t = a.array[(i + 1) * s + k]
          a.array[(i + 1) * s + k] = a.array[(i + 2) * s + k]
          a.array[(i + 2) * s + k] = t
        }
      }
    }
  }
  return g
}

/**
 * Fonde in una mesh per coppia (materiale, `castShadow`) tutte le mesh statiche del gruppo, applicando le trasformazioni.
 * Restano intatte le `InstancedMesh`, le mesh con più materiali o nascoste, e gli oggetti con `keep(obj)` vero con i loro discendenti.
 * Libera le geometrie di partenza.
 * @param {THREE.Object3D} group @param {(o: THREE.Object3D) => boolean} [keep] @returns {THREE.Object3D} `group`
 */
export function mergeByMaterial(group, keep = () => false) {
  group.updateMatrixWorld(true)
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert()
  const buckets = new Map()
  const done = []
  const walk = (o) => {
    if (o !== group && keep(o)) return
    if (o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material) && o.visible) {
      const key = `${o.material.uuid}|${o.castShadow ? 1 : 0}`
      if (!buckets.has(key)) buckets.set(key, { material: o.material, cast: o.castShadow, geos: [] })
      buckets.get(key).geos.push(bake(o, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)))
      done.push(o)
    }
    for (const c of o.children) walk(c)
  }
  walk(group)
  for (const o of done) {
    o.geometry.dispose()
    o.removeFromParent()
  }
  // gruppi rimasti vuoti
  const prune = (o) => {
    for (const c of [...o.children]) prune(c)
    if (o !== group && o.isGroup && o.children.length === 0) o.removeFromParent()
  }
  prune(group)
  for (const b of buckets.values()) {
    const geo = mergeGeometries(b.geos)
    b.geos.forEach((g) => g.dispose())
    if (!geo) continue
    const m = new THREE.Mesh(geo, b.material)
    m.castShadow = b.cast
    m.receiveShadow = true
    group.add(m)
  }
  return group
}

/**
 * Chiude un oggetto: conta le mesh (`userData.parts`), imposta le ombre, fonde per materiale lasciando i rosoni
 * (`userData.ceiling`), calcola `userData.bbox = [x0, y0, z0, x1, y1, z1]` nel sistema del gruppo e, se l'ingombro in pianta
 * supera `item.size` di oltre 8 cm, scrive `userData.warning`. Idempotente: una seconda chiamata non fa nulla
 * (il registro la richiama dopo il costruttore).
 * @param {THREE.Object3D} group @param {{id?: string, size?: number[]}|null} [item] @returns {THREE.Object3D} `group`
 */
export function finalize(group, item) {
  if (group.userData.finalized) return group
  group.userData.finalized = true
  let parts = 0
  const shade = (o, noShadow) => {
    const ns = noShadow || o.userData.noShadow === true
    if (o.isMesh) {
      parts++
      o.receiveShadow = true
      o.castShadow = !ns
    }
    for (const c of o.children) shade(c, ns)
  }
  shade(group, false)
  group.userData.parts = parts
  mergeByMaterial(group, (o) => o.userData.ceiling === true)
  group.updateMatrixWorld(true)
  const b = new THREE.Box3().setFromObject(group)
  if (!b.isEmpty()) {
    group.userData.bbox = [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z]
    const size = item?.size
    if (size && (b.max.x - b.min.x > size[0] + OVERSIZE || b.max.z - b.min.z > size[1] + OVERSIZE)) {
      const f = (n) => n.toFixed(2)
      group.userData.warning = `${item.id ?? '?'}: ingombro ${f(b.max.x - b.min.x)} x ${f(b.max.z - b.min.z)} m oltre item.size ${f(size[0])} x ${f(size[1])} m`
    }
  }
  return group
}
