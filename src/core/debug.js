/** Voci di ctx.debug comuni: stats, settle. Gli altri moduli ne aggiungono altre. */

/**
 * Aggiunge `stats` e `settle` a ctx.debug e registra il misuratore di fotogrammi.
 * @param {object} ctx contesto condiviso
 */
export function initDebug(ctx) {
  const { renderer, scene, registry, debug } = ctx
  let last = performance.now()
  let fps = 0
  const waiters = []

  registry.updaters.push(() => {
    const now = performance.now()
    const inst = 1000 / Math.max(now - last, 1)
    fps = fps ? fps * 0.9 + inst * 0.1 : inst
    last = now
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (--waiters[i].left <= 0) waiters.splice(i, 1)[0].resolve()
    }
  })

  /** @returns {{fps:number, calls:number, triangles:number, geometries:number, textures:number, pointLights:number}} */
  debug.stats = () => {
    let pointLights = 0
    scene.traverse((o) => { if (o.isPointLight && o.visible && o.intensity > 0) pointLights++ })
    const { render, memory } = renderer.info
    return {
      fps: Math.round(fps * 10) / 10,
      calls: render.calls,
      triangles: render.triangles,
      geometries: memory.geometries,
      textures: memory.textures,
      pointLights,
    }
  }

  /** Promise risolta dopo `frames` fotogrammi. */
  debug.settle = (frames = 30) => new Promise((resolve) => waiters.push({ left: frames, resolve }))
}
