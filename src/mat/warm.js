/** Pre-riscaldamento: genera a riposo, a fasce, le texture degli stili non ancora visitati. */
import { wallTexSpec, floorTexSpec } from './surfaces.js'
import { marbleG, woodGrain } from './textures.js'

/** Millisecondi di lavoro per ogni risveglio a riposo: ben sotto la soglia dei 50 ms dei compiti lunghi. */
const SLICE_MS = 12

/**
 * Accoda le texture pesanti di ogni altro stile (pareti, pavimenti, marmi). Ogni risveglio a riposo
 * avanza il generatore corrente per al più `SLICE_MS` e poi cede: nessun compito lungo. Al cambio di
 * stile la cache è già piena. Una chiave già in cache, o già generata durante l'attesa, si salta.
 * @param {object} ctx @param {object} store cache texture
 */
export function startWarm(ctx, store) {
  const { THREE } = ctx
  const ids = [...(ctx.plan.rooms ?? []), ...(ctx.plan.outdoor ?? [])].map((r) => r.id)
  const jobs = new Map() // chiave -> () => generatore che restituisce la texture
  const add = (key, gen) => { if (gen && !jobs.has(key)) jobs.set(key, gen) }
  for (const st of Object.values(ctx.styles.styles)) {
    if (st === ctx.currentStyle()) continue
    for (const id of ids) {
      const w = wallTexSpec(ctx, id, st)
      add(w.key, w.gen)
      const f = floorTexSpec(ctx, id, st)
      if (f) add(f.key, f.gen)
    }
    for (const def of Object.values(st.tokens ?? {})) {
      if (def.veins) add(`marble:${def.color}`, () => marbleG(THREE, def.color, 1 + (parseInt(def.color.slice(1), 16) % 7)))
      else if (def.grain) add('grain', function* () { return woodGrain(THREE) })
    }
  }
  const queue = [...jobs]
  const times = (ctx.debug.warmMs = [])
  let cur = null
  const idle = window.requestIdleCallback ?? ((f) => setTimeout(f, 30))
  const step = () => {
    const t0 = performance.now()
    while (performance.now() - t0 < SLICE_MS) {
      if (!cur) {
        const next = queue.shift()
        if (!next) return
        if (store.has(next[0])) continue
        cur = { key: next[0], gen: next[1](), t: 0 }
      }
      const a = performance.now()
      try {
        const r = cur.gen.next()
        if (r.done) { if (store.has(cur.key)) r.value.dispose(); else store.set(cur.key, r.value) } // già creata nel frattempo
        cur.t += performance.now() - a
        if (r.done) { times.push([cur.key, Math.round(cur.t)]); cur = null }
      } catch (e) {
        ctx.log.warn(`mat: pre-riscaldamento fallito (${cur.key}): ${e.message}`)
        cur = null
      }
    }
    idle(step, { timeout: 2000 })
  }
  idle(step, { timeout: 2000 })
}
