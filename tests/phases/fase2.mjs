/** Fase 2 · Arredo: asserzioni T2.1-T2.8 (spec/04-TEST.md). */
import { readFileSync } from 'node:fs'
import { abs } from '../lib.mjs'

const tour = JSON.parse(readFileSync(abs('spec/tour.json'), 'utf8'))
const EYE = tour.settings.eyeHeight

/** Pose di ogni sosta del tour, come in series.mjs. */
const STOPS = tour.path.filter((s) => s.stop).map((s) => {
  const [lx, ly, lz] = s.stop.lookAt
  const [x, z] = s.p
  return { room: s.stop.room, pose: { x, z, yaw: Math.atan2(lx - x, lz - z), pitch: Math.atan2(ly - EYE, Math.hypot(lx - x, lz - z)) } }
})
const PATH = tour.path.map((s) => s.p)

/** Tipi con tolleranza d'impronta di 25 cm e tipi per cui si controlla l'altezza (04-TEST.md, T2.3). */
const WIDE = ['bed_canopy', 'plant', 'planter', 'swing_bench', 'grand_piano']
const HEIGHT_TYPES = [
  'armchair', 'banquette', 'bench', 'chair_desk', 'chair_dining', 'outdoor_armchair', 'outdoor_chair', 'outdoor_sofa', 'sofa', 'pouf', 'stool_piano', 'sunbed', 'swing_bench',
  'dining_table', 'coffee_table', 'side_table', 'bistro_table', 'outdoor_table', 'console', 'desk', 'vanity_table',
  'nightstand', 'bed_double',
  'chest', 'sideboard',
]
/** Sanitari: size[2] è il corpo; cassetta, rubinetti e barre a parete stanno sopra. Limite d'altezza assoluto (04-TEST.md, T2.3). */
const SANITARI = { wc: 1.2, bidet: 1.2, bathtub_clawfoot: 1.2, bathtub_freestanding: 1.2, vanity_single: 1.2, vanity_double: 1.2, shower_walkin: 2.2 }
const STYLES = ['liberty', 'moderno', 'scandinavo']

/** Codice eseguito nella pagina: elenco atteso degli arredi per lo stile corrente. */
const EXPECTED = `
  const expectedIds = (C) => {
    const f = C.debug.ctx.furnishing, st = C.state.style
    const omit = new Set(f.styleOverrides?.[st]?.omit ?? [])
    const act = f.variants?.active ?? {}
    return f.items.filter((i) => (i.variant == null || i.variant === act[i.room]) && !omit.has(i.id))
  }
`

/** Passa a ciascun stile ed esegue `body(C, style)` nella pagina; restituisce un oggetto per stile. */
async function perStyle(page, body) {
  return page.evaluate(`(async () => {
    const C = window.CASA
    ${EXPECTED}
    const fn = async (style) => { ${body} }
    const out = {}
    for (const st of ${JSON.stringify(STYLES)}) {
      await C.api.setStyle(st)
      await C.debug.settle(5)
      out[st] = await fn(st)
    }
    await C.api.setStyle('liberty')
    return out
  })()`)
}

const fail = (m) => { throw new Error(m) }

export const assertions = [
  {
    id: 'T2.1',
    async run(page) {
      const r = await perStyle(page, `
        const exp = expectedIds(C).map((i) => i.id).sort()
        const got = C.debug.furniture().map((r) => r.id).sort()
        const set = new Set(got)
        return { exp: exp.length, got: got.length, missing: exp.filter((i) => !set.has(i)), extra: got.filter((i) => !new Set(exp).has(i)), dup: got.length - set.size }
      `)
      const bad = []
      for (const st of STYLES) {
        const x = r[st]
        if (x.missing.length || x.extra.length || x.dup) bad.push(`${st}: mancano [${x.missing}] in più [${x.extra}] duplicati ${x.dup}`)
      }
      if (bad.length) fail(bad.join(' | '))
      return STYLES.map((s) => `${s} ${r[s].got}/${r[s].exp}`).join(', ')
    },
  },
  {
    id: 'T2.2',
    async run(page) {
      const r = await perStyle(page, `
        const bad = []
        for (const f of C.debug.furniture()) {
          if (f.placeholder) bad.push(f.id)
          for (const p of f.props) if (p.placeholder) bad.push(f.id + ':' + p.name)
        }
        return bad
      `)
      const bad = STYLES.filter((s) => r[s].length).map((s) => `${s}: ${r[s].join(', ')}`)
      if (bad.length) fail(`segnaposto: ${bad.join(' | ')}`)
      return 'nessun segnaposto nei tre stili'
    },
  },
  {
    id: 'T2.3',
    async run(page) {
      const r = await perStyle(page, `
        const H = C.debug.ctx.plan.meta.ceilingHeight
        const items = new Map(C.debug.ctx.furnishing.items.map((i) => [i.id, i]))
        const WIDE = new Set(${JSON.stringify(WIDE)}), HT = new Set(${JSON.stringify(HEIGHT_TYPES)}), SAN = ${JSON.stringify(SANITARI)}
        const bad = []
        for (const f of C.debug.furniture()) {
          const it = items.get(f.id)
          const [x0, y0, z0, x1, y1, z1] = f.bbox
          if (it.mount === 'floor') {
            const m = WIDE.has(it.type) || WIDE.has(f.type) ? 0.25 : 0.08
            const [a, b, c, d] = it.rect
            const over = Math.max(a - m - x0, b - m - z0, x1 - (c + m), z1 - (d + m))
            if (over > 1e-4) bad.push(f.id + ' (' + f.type + ') impronta fuori di ' + (over * 100).toFixed(1) + ' cm oltre la tolleranza di ' + m * 100 + ' cm')
          }
          if (y1 > H + 1e-3) bad.push(f.id + ' supera il soffitto: y ' + y1.toFixed(3))
          if ((HT.has(f.type) || HT.has(it.type)) && it.mount === 'floor' && y1 > it.size[2] + 0.10 + 1e-4) bad.push(f.id + ' (' + f.type + ') alto ' + y1.toFixed(3) + ' contro ' + it.size[2] + ' + 0,10')
          const lim = SAN[f.type] ?? SAN[it.type]
          if (lim !== undefined && it.mount === 'floor' && y1 > lim + 1e-4) bad.push(f.id + ' (' + f.type + ') alto ' + y1.toFixed(3) + ' oltre ' + lim + ' m')
        }
        return bad
      `)
      const bad = STYLES.filter((s) => r[s].length).map((s) => `${s}: ${r[s].join('; ')}`)
      if (bad.length) fail(bad.join(' || '))
      return 'impronte, altezze e soffitto rispettati nei tre stili'
    },
  },
  {
    id: 'T2.4',
    async run(page) {
      const r = await perStyle(page, `
        const exp = expectedIds(C).filter((i) => i.collide).map((i) => i.id).sort()
        const got = C.debug.ctx.registry.colliders.map((c) => c.id).sort()
        const gs = new Set(got), es = new Set(exp)
        const path = ${JSON.stringify(PATH)}
        const rects = new Map(C.debug.ctx.registry.colliders.map((c) => [c.id, c.rect]))
        let min = Infinity, who = null
        for (let k = 0; k + 1 < path.length; k++) {
          const [ax, az] = path[k], [bx, bz] = path[k + 1]
          const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / 0.05))
          for (let s = 0; s <= n; s++) {
            const x = ax + (bx - ax) * s / n, z = az + (bz - az) * s / n
            for (const [id, [x0, z0, x1, z1]] of rects) {
              const d = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1))
              if (d < min) { min = d; who = id + ' presso ' + x.toFixed(2) + ',' + z.toFixed(2) }
            }
          }
        }
        return { exp: exp.length, got: got.length, missing: exp.filter((i) => !gs.has(i)), extra: got.filter((i) => !es.has(i)), min, who }
      `)
      const bad = []
      for (const st of STYLES) {
        const x = r[st]
        if (x.missing.length || x.extra.length || x.exp !== x.got) bad.push(`${st}: collider mancanti [${x.missing}] in più [${x.extra}]`)
        if (x.min < 0.25) bad.push(`${st}: il percorso passa a ${(x.min * 100).toFixed(1)} cm da ${x.who} (minimo 25)`)
      }
      if (bad.length) fail(bad.join(' | '))
      return STYLES.map((s) => `${s} ${r[s].got} collider, distanza minima ${(r[s].min * 100).toFixed(0)} cm`).join('; ')
    },
  },
  {
    id: 'T2.5',
    async run(page, ctx) {
      const r = await page.evaluate(async () => {
        const C = window.CASA
        const ctx = C.debug.ctx
        const f = ctx.furnishing
        const out = {}
        const err0 = C.debug.errors.length
        for (const st of ['liberty', 'moderno', 'scandinavo']) {
          await C.api.setStyle(st)
          await C.debug.settle(5)
          const omit = new Set(f.styleOverrides?.[st]?.omit ?? [])
          const act = f.variants?.active ?? {}
          const exp = f.items.filter((i) => (i.variant == null || i.variant === act[i.room]) && !omit.has(i.id)).length
          const w = ctx.mat.room('salotto').wall
          out[st] = { hex: w.color.getHexString(), count: C.debug.furniture().length, exp, style: C.state.style, omit: omit.size }
        }
        out.errs = C.debug.errors.slice(err0).map((e) => e.message)
        return out
      })
      const bad = []
      const hexes = STYLES.map((s) => r[s].hex)
      if (new Set(hexes).size !== 3) bad.push(`colore della parete del salotto non distinto: ${hexes.join(', ')}`)
      for (const s of STYLES) {
        if (r[s].count !== r[s].exp) bad.push(`${s}: ${r[s].count} oggetti, attesi ${r[s].exp} (omit ${r[s].omit})`)
        if (r[s].style !== s) bad.push(`state.style = ${r[s].style} dopo setStyle(${s})`)
      }
      if (r.errs.length) bad.push(`debug.errors: ${r.errs.join(' | ')}`)
      if (ctx.session.errors.length) bad.push(`console: ${ctx.session.errors.join(' | ')}`)
      if (bad.length) fail(bad.join(' | '))
      return STYLES.map((s) => `${s} #${r[s].hex} ${r[s].count} oggetti`).join('; ')
    },
  },
  {
    id: 'T2.6',
    async run(page) {
      const r = await page.evaluate(async () => {
        const C = window.CASA
        const mem = () => { const m = C.debug.ctx.renderer.info.memory; return { g: m.geometries, t: m.textures } }
        for (const st of ['moderno', 'scandinavo', 'liberty']) { await C.api.setStyle(st); await C.debug.settle(5) }
        const base = mem()
        const trace = []
        for (const st of ['moderno', 'scandinavo', 'liberty', 'moderno', 'scandinavo', 'liberty']) {
          await C.api.setStyle(st)
          await C.debug.settle(5)
          trace.push(mem())
        }
        return { base, trace }
      })
      const end = r.trace[r.trace.length - 1]
      const gMax = Math.max(...r.trace.map((m) => m.g)), tMax = Math.max(...r.trace.map((m) => m.t))
      const bad = []
      if (end.g > r.base.g * 1.05) bad.push(`geometrie ${r.base.g} -> ${end.g} (+${(((end.g / r.base.g) - 1) * 100).toFixed(1)} %)`)
      if (end.t > r.base.t * 1.05) bad.push(`texture ${r.base.t} -> ${end.t} (+${(((end.t / r.base.t) - 1) * 100).toFixed(1)} %)`)
      if (bad.length) fail(bad.join(' | '))
      return `geometrie ${r.base.g} -> ${end.g} (max ${gMax}), texture ${r.base.t} -> ${end.t} (max ${tMax})`
    },
  },
  {
    id: 'T2.7',
    async run(page) {
      const r = await page.evaluate(async (stops) => {
        const C = window.CASA
        const rows = []
        for (const s of stops) {
          C.api.teleport(s.pose)
          await C.debug.settle(10)
          const st = C.debug.stats()
          rows.push({ room: s.room, calls: st.calls, triangles: st.triangles })
        }
        await C.api.setView('top', { animate: false })
        await C.debug.settle(10)
        const top = C.debug.stats()
        return { rows, top: { calls: top.calls, triangles: top.triangles } }
      }, STOPS)
      const bad = []
      for (const x of r.rows) {
        if (x.calls > 650) bad.push(`${x.room}: ${x.calls} chiamate (limite 650)`)
        if (x.triangles > 800000) bad.push(`${x.room}: ${x.triangles} triangoli (limite 800000)`)
      }
      if (r.top.calls > 900) bad.push(`vista dall'alto: ${r.top.calls} chiamate (limite 900)`)
      if (r.top.triangles > 800000) bad.push(`vista dall'alto: ${r.top.triangles} triangoli (limite 800000)`)
      if (bad.length) fail(bad.join(' | '))
      const maxC = Math.max(...r.rows.map((x) => x.calls)), maxT = Math.max(...r.rows.map((x) => x.triangles))
      return `${r.rows.length} soste: max ${maxC} chiamate, ${maxT} triangoli; alto ${r.top.calls}/${r.top.triangles}`
    },
  },
  {
    id: 'T2.8',
    async run(page) {
      const r = await page.evaluate(async () => {
        const C = window.CASA
        await C.api.setStyle('liberty')
        await C.debug.settle(5)
        const f = C.debug.furniture()
        const by = (id) => f.find((x) => x.id === id)
        const prop = (rec, n) => rec?.props.find((p) => p.name === n)
        const cuc = new Set(f.filter((x) => x.room === 'cucina').flatMap((x) => x.props.map((p) => p.name)))
        return {
          pra: prop(by('pra_tavolo'), 'table_setting')?.count ?? null,
          ter: prop(by('ter_tavolo'), 'table_setting')?.count ?? null,
          c2: by('c2_letto')?.parts ?? null,
          cb: by('cb_letto')?.parts ?? null,
          cuc: ['copper_pots', 'fruit_bowl_lemons', 'moka_cups'].filter((n) => !cuc.has(n)),
        }
      })
      const bad = []
      if (r.pra !== 8) bad.push(`pra_tavolo table_setting count ${r.pra} (atteso 8)`)
      if (r.ter !== 4) bad.push(`ter_tavolo table_setting count ${r.ter} (atteso 4)`)
      if (!(r.c2 >= 12)) bad.push(`c2_letto parts ${r.c2} (minimo 12)`)
      if (!(r.cb >= 12)) bad.push(`cb_letto parts ${r.cb} (minimo 12)`)
      if (r.cuc.length) bad.push(`props mancanti in cucina: ${r.cuc.join(', ')}`)
      if (bad.length) fail(bad.join(' | '))
      return `coperti ${r.pra}/${r.ter}, parts letti ${r.c2}/${r.cb}, props cucina presenti`
    },
  },
]
