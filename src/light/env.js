/** Riflessi: mappa PMREM del cielo per `scene.environment` e `envMap` propria di pavimenti lucidi e vetri. */
import { createSkyMaterial, setSkyUniforms } from './sky.js'

// lighting.environment.method: rigenerazione se l'ora cambia di più di 0,25 h, al massimo ogni 500 ms
const REGEN_HOURS = 0.25
const REGEN_MIN_MS = 500
const SETTLE_HOURS = 0.01 // a ora ferma si rigenera comunque, per non restare sulla mappa vecchia
const ENV_SPHERE_RADIUS = 50 // PMREM taglia a far = 100: la cupola da 1200 m darebbe riflessi neri
const PMREM_NEAR = 0.1
const PMREM_FAR = 100

/**
 * @param {object} ctx contesto condiviso
 * @param {{ envGain: number, floorGain: number, glassGain: number }} gains fattori di scala delle intensità
 */
export function createEnv(ctx, gains) {
  const { THREE, renderer, scene, lighting } = ctx
  const cfg = lighting.environment
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  const material = createSkyMaterial(THREE, false)
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(ENV_SPHERE_RADIUS, 24, 16), material)
  envScene.add(sphere)

  let target = null
  let texture = null
  let lastHour = Infinity
  let lastMs = -Infinity

  /** Ritorna i materiali dei pavimenti di tutti gli spazi (stanze ed esterni). */
  function floorMaterials() {
    const out = new Set()
    const ids = [...(ctx.plan.rooms ?? []), ...(ctx.plan.outdoor ?? [])].map((r) => r.id)
    for (const id of ids) {
      try {
        const f = ctx.mat.room(id)?.floor
        if (f) out.add(f)
      } catch (e) {
        ctx.log.warn(`env: pavimento di ${id} non disponibile:`, e?.message)
      }
    }
    return out
  }

  /** Assegna la mappa ai pavimenti lucidi e ai vetri; la toglie dai pavimenti diventati opachi. */
  function applyReflections() {
    if (!texture) return
    for (const f of floorMaterials()) {
      const want = f.roughness <= cfg.glossyFloorMaxRoughness ? texture : null
      if ((f.envMap === null) !== (want === null)) f.needsUpdate = true
      f.envMap = want
      f.envMapIntensity = cfg.floorEnvIntensity * gains.floorGain
    }
    for (const g of ctx.registry.glass) {
      if (g.envMap === null) g.needsUpdate = true
      g.envMap = texture
      g.envMapIntensity = cfg.glassEnvIntensity * gains.glassGain
    }
  }

  /** Genera la mappa dal campione `st` e sostituisce la precedente. */
  function regenerate(st, hour) {
    setSkyUniforms(material, st)
    const next = pmrem.fromScene(envScene, 0, PMREM_NEAR, PMREM_FAR)
    const old = target
    target = next
    texture = next.texture
    scene.environment = texture
    scene.environmentIntensity = cfg.sceneIntensity * gains.envGain
    applyReflections()
    old?.dispose()
    lastHour = hour
    lastMs = performance.now()
  }

  return {
    regenerate,
    applyReflections,
    /** Rigenera se l'ora si è spostata abbastanza (o si è fermata lontano dalla mappa), con il limite di frequenza. */
    maybeRegenerate(getSample, hour, moving) {
      const diff = Math.abs(hour - lastHour)
      if (performance.now() - lastMs < REGEN_MIN_MS) return
      if (diff > REGEN_HOURS || (!moving && diff > SETTLE_HOURS)) regenerate(getSample(), hour)
    },
    dispose() {
      target?.dispose()
      pmrem.dispose()
      sphere.geometry.dispose()
      material.dispose()
    },
  }
}
