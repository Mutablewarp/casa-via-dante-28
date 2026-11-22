/*
 * Allestimento: crea gli arredi dello stile corrente, li posa, li fonde per stanza e riempie i registri.
 * Al cambio di stile smonta tutto e ricostruisce una stanza per fotogramma; `furnished` esce una sola volta, per l'ultimo stile.
 */
import * as kit from './kit.js'
import { curtainSpec } from './layout-curtains.js'
import { placeProps } from './layout-props.js'
import { lampEntries } from './layout-lamps.js'

const NO_SHADOW_TYPES = new Set(['painting', 'curtain', 'rug'])
const FALLBACK_MS = 100 // se la scheda è nascosta i fotogrammi non arrivano: si prosegue con un timer
const RAD = Math.PI / 180

/** Libera le geometrie di un albero (non i materiali né le texture, che sono di A1 e A2). */
function disposeTree(root) {
  root.traverse((o) => {
    if (o.isInstancedMesh) o.dispose()
    o.geometry?.dispose()
  })
}

/** Esegue `fn` al prossimo fotogramma, oppure dopo `FALLBACK_MS` se i fotogrammi non arrivano. */
function nextFrame(fn) {
  let done = false
  const run = () => {
    if (done) return
    done = true
    clearTimeout(timer)
    fn()
  }
  const timer = setTimeout(run, FALLBACK_MS)
  requestAnimationFrame(run)
}

/** @param {object} ctx contesto condiviso */
export function init(ctx) {
  const { THREE } = ctx
  const H = ctx.plan.meta.ceilingHeight
  let records = []
  let roomGroups = []
  let ceilingParts = []
  let current = null

  /** Voci dello stile corrente: variante attiva e senza `omit`. */
  const selectItems = () => {
    const omit = new Set(ctx.furnishing.styleOverrides?.[ctx.state.style]?.omit ?? [])
    const active = ctx.furnishing.variants?.active ?? {}
    return ctx.furnishing.items.filter((i) => (i.variant == null || i.variant === active[i.room]) && !omit.has(i.id))
  }

  /** Ingombro in coordinate mondo del solo mobile (rosoni esclusi). */
  const worldBox = (root) => {
    root.updateMatrixWorld(true)
    const box = new THREE.Box3()
    const tmp = new THREE.Box3()
    const walk = (o) => {
      if (o.userData.ceiling === true) return
      if (o.isInstancedMesh) {
        o.computeBoundingBox()
        box.union(tmp.copy(o.boundingBox).applyMatrix4(o.matrixWorld))
      } else if (o.isMesh) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
        box.union(tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld))
      }
      o.children.forEach(walk)
    }
    walk(root)
    return box
  }

  /** Crea l'arredo e lo posa secondo `mount`; null se non si può posare. */
  const makeItem = (item) => {
    let spec = item
    let pos = [item.at?.[0], 0, item.at?.[1]]
    let rot = item.rot ?? 0
    if (item.mount === 'opening') {
      const c = curtainSpec(ctx, item)
      if (!c) {
        ctx.log.warn(`layout: ${item.id}: aperture non trovate`)
        return null
      }
      spec = c.spec
      pos = [c.x, 0, c.z]
      rot = c.rot
    } else if (item.mount === 'wall') pos[1] = item.y
    else if (item.mount === 'ceiling') pos[1] = H
    const g = ctx.furn.create(spec)
    g.position.set(...pos)
    g.rotation.y = rot * RAD
    return g
  }

  /** Costruisce una stanza: mobili, oggetti d'appoggio, registri, rosoni e fusione. */
  const buildRoom = (room, items) => {
    const rg = new THREE.Group()
    rg.userData.room = room
    ctx.groups.furniture.add(rg)
    roomGroups.push(rg)
    for (const item of items) {
      const g = makeItem(item)
      if (!g) continue
      rg.add(g)
      const box = worldBox(g)
      const type = g.userData.type ?? item.type
      const rec = {
        id: item.id,
        type,
        room,
        placeholder: g.userData.placeholder === true,
        bbox: [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z],
        parts: g.userData.parts ?? 0,
        props: [],
      }
      let tableLamps = []
      if (item.props?.length) {
        const res = placeProps(ctx, item, g, items)
        rec.props = res.records
        tableLamps = res.lamps
      }
      if (item.mount === 'floor' && item.collide) ctx.registry.colliders.push({ id: item.id, rect: item.rect })
      ctx.registry.lamps.push(...lampEntries(item, tableLamps))
      if (NO_SHADOW_TYPES.has(type)) g.traverse((o) => { if (o.isMesh) o.castShadow = false })
      records.push(rec)
    }
    rg.updateMatrixWorld(true)
    // rosoni: nel gruppo dei soffitti, così la vista dall'alto li nasconde
    const rosettes = []
    const find = (o) => (o.userData.ceiling === true ? rosettes.push(o) : o.children.forEach(find))
    find(rg)
    for (const r of rosettes) {
      ctx.groups.ceilings.attach(r)
      ceilingParts.push(r)
    }
    kit.mergeByMaterial(rg)
  }

  /** Smonta ciò che è stato costruito e svuota i registri (gli array restano gli stessi oggetti). */
  const teardown = () => {
    for (const rg of roomGroups) {
      rg.removeFromParent()
      disposeTree(rg)
    }
    for (const r of ceilingParts) {
      r.removeFromParent()
      disposeTree(r)
    }
    roomGroups = []
    ceilingParts = []
    records = []
    ctx.registry.colliders.length = 0
    ctx.registry.lamps.length = 0
    kit.disposeTexMats()
  }

  const finish = (job) => {
    current = null
    ctx.log.info(`layout: ${records.length} arredi, stile ${job.style}`)
    ctx.events.emit('furnished', { style: job.style, count: records.length })
  }

  /** Costruisce la stanza successiva del lavoro; restituisce vero se ne restano. */
  const advance = (job) => {
    try {
      const [room, items] = job.rooms[job.next]
      buildRoom(room, items)
    } catch (e) {
      ctx.log.error(`layout: ${e.message}`)
      ctx.debug.errors.push({ where: 'furn/layout', message: String(e.message), stack: e.stack ?? '' })
    }
    return ++job.next < job.rooms.length
  }

  const step = (job) => {
    if (job !== current) return // un nuovo cambio di stile ha preso il posto di questo
    if (advance(job)) nextFrame(() => step(job))
    else finish(job)
  }

  /** Avvia l'allestimento dello stile corrente; `sync` costruisce tutto subito. */
  const start = (sync) => {
    teardown()
    const items = selectItems()
    const byRoom = new Map()
    for (const i of items) {
      if (!byRoom.has(i.room)) byRoom.set(i.room, [])
      byRoom.get(i.room).push(i)
    }
    const rooms = [...byRoom]
    const here = rooms.findIndex(([r]) => r === ctx.state.room)
    if (here > 0) rooms.unshift(...rooms.splice(here, 1)) // prima la stanza in cui si trova il visitatore
    const job = { style: ctx.state.style, rooms, next: 0 }
    current = job
    if (!rooms.length) return finish(job)
    if (sync) {
      while (advance(job));
      finish(job)
    } else nextFrame(() => step(job))
  }

  ctx.debug.furniture = () => records
  ctx.events.on('style:changed', () => start(false))
  start(true)
}
