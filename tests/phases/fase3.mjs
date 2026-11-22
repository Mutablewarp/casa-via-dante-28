/** Fase 3 · Esperienza: asserzioni T3.1-T3.14 (spec/04-TEST.md). */
import { readFileSync } from 'node:fs'
import { abs, foreignRequests, imageStats } from '../lib.mjs'

const readJson = (p) => JSON.parse(readFileSync(abs(p), 'utf8'))
const tour = readJson('spec/tour.json')
const lighting = readJson('spec/lighting.json')
const EYE = tour.settings.eyeHeight

/** Pose di ogni sosta del tour, come in series.mjs. */
const STOPS = tour.path.filter((s) => s.stop).map((s) => {
  const [lx, ly, lz] = s.stop.lookAt
  const [x, z] = s.p
  return { room: s.stop.room, pose: { x, z, yaw: Math.atan2(lx - x, lz - z), pitch: Math.atan2(ly - EYE, Math.hypot(lx - x, lz - z)) }, stop: s.stop }
})
const stopOf = (room) => STOPS.find((s) => s.room === room)

const fail = (m) => { throw new Error(m) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Chiude la schermata iniziale con «Esplora liberamente» (così i clic raggiungono la scena e la barra). */
const enter = async (page) => {
  if (await page.locator('[data-testid=splash-enter]').isVisible()) await page.click('[data-testid=splash-enter]')
  await page.waitForFunction(() => document.querySelector('[data-testid=splash]')?.hidden === true, null, { timeout: 3000 })
}

/** Ogni asserzione fallisce anche se la sessione ha raccolto errori di console. */
function make(id, fn, extra = {}) {
  return {
    id,
    ...extra,
    async run(page, ctx) {
      const res = await fn(page, ctx)
      const errs = []
      for (const s of [ctx.session, ...(ctx.sessions ?? [])]) if (s) errs.push(...s.errors)
      if (errs.length) fail(`errori in console: ${errs.join(' | ')}`)
      return res
    },
  }
}

/** Apre una sessione aggiuntiva tenendola nell'elenco controllato dagli errori. */
async function open(ctx, o) {
  const s = await ctx.open(o)
  ;(ctx.sessions ??= []).push(s)
  return s
}

/** Interpolazione lineare di `night` tra i fotogrammi (come lighting.interpolation). */
function expectedNight(h) {
  const k = lighting.keyframes
  if (h <= k[0].hour) return k[0].night
  if (h >= k[k.length - 1].hour) return k[k.length - 1].night
  let i = 0
  while (k[i + 1].hour < h) i++
  const t = (h - k[i].hour) / (k[i + 1].hour - k[i].hour)
  return k[i].night + (k[i + 1].night - k[i].night) * t
}

/** Porta la scena a stile, ora e posa; poi fa riposare 60 fotogrammi, nasconde la UI e scatta. */
async function snap(page, { hour, pose, style = 'liberty' }) {
  await page.evaluate(async ({ hour, pose, style }) => {
    const C = window.CASA
    await C.api.setStyle(style)
    C.api.setTime(hour, { immediate: true })
    C.api.teleport(pose)
    await C.debug.settle(60)
    const ui = document.getElementById('ui')
    if (ui) ui.style.display = 'none'
  }, { hour, pose, style })
  const png = await page.screenshot()
  await page.evaluate(() => { const ui = document.getElementById('ui'); if (ui) ui.style.display = '' })
  return imageStats(page, png)
}

export const assertions = [
  make('T3.1', async (page) => {
    const r = await page.evaluate(async () => {
      const C = window.CASA
      const rows = []
      for (let h = 6; h <= 23; h += 0.5) {
        C.api.setTime(h, { immediate: true })
        await C.debug.settle(2)
        rows.push({ h, night: C.state.night, hour: C.state.hour })
      }
      return { rows, errors: C.debug.errors.map((e) => e.message) }
    })
    if (r.errors.length) fail(`CASA.debug.errors: ${r.errors.join(' | ')}`)
    const bad = []
    for (const x of r.rows) {
      const e = expectedNight(x.h)
      if (Math.abs(x.night - e) > 0.02) bad.push(`ore ${x.h}: night ${x.night.toFixed(3)} atteso ${e.toFixed(3)}`)
      if (Math.abs(x.hour - x.h) > 1e-6) bad.push(`ore ${x.h}: state.hour ${x.hour}`)
    }
    if (bad.length) fail(bad.join(' | '))
    return `${r.rows.length} ore, night entro 0,02 dai fotogrammi`
  }),

  make('T3.2', async (page) => {
    const r = await page.evaluate(async () => {
      const C = window.CASA
      const grab = async (h) => {
        C.api.setTime(h, { immediate: true })
        await C.debug.settle(30)
        return { lights: C.debug.lights(), point: C.debug.stats().pointLights }
      }
      return { noon: await grab(12), night: await grab(22) }
    })
    const bad = []
    if (r.noon.lights.lampOn !== 0) bad.push(`ore 12: lampOn ${r.noon.lights.lampOn}`)
    if (r.noon.lights.realLights !== 0 || r.noon.point !== 0) bad.push(`ore 12: luci reali ${r.noon.lights.realLights}, pointLights ${r.noon.point}`)
    if (!(r.night.lights.lampOn >= 0.999)) bad.push(`ore 22: lampOn ${r.night.lights.lampOn} (atteso 1)`)
    if (!(r.night.lights.realLights >= 3 && r.night.lights.realLights <= 12)) bad.push(`ore 22: luci reali ${r.night.lights.realLights} (atteso 3-12)`)
    if (!(r.night.lights.shadeEmissive > 1)) bad.push(`ore 22: shadeEmissive ${r.night.lights.shadeEmissive} (atteso > 1)`)
    if (bad.length) fail(bad.join(' | '))
    return `notte: ${r.night.lights.realLights} luci reali, shadeEmissive ${r.night.lights.shadeEmissive.toFixed(2)}`
  }),

  make('T3.3', async (page) => {
    await page.evaluate(() => { window.CASA.api.setTime(10, { immediate: true }) })
    await sleep(200)
    await page.evaluate(() => window.CASA.api.setTime(19))
    const t0 = Date.now()
    await sleep(Math.max(0, 200 - (Date.now() - t0)))
    const early = await page.evaluate(() => window.CASA.state.hour)
    await sleep(Math.max(0, 4000 - (Date.now() - t0)))
    const late = await page.evaluate(() => window.CASA.state.hour)
    if (!(early < 14)) fail(`dopo 0,2 s l'ora è ${early.toFixed(2)} (atteso sotto 14)`)
    if (!(late >= 18.9 && late <= 19.1)) fail(`dopo 4 s l'ora è ${late.toFixed(3)} (atteso 18,9-19,1)`)
    return `0,2 s: ${early.toFixed(2)}; 4 s: ${late.toFixed(3)}`
  }, { note: 'Misura in tempo reale: i tempi di attesa partono dalla chiamata a setTime(19).' }),

  make('T3.4', async (page) => {
    const sal = stopOf('salotto').pose
    const cuc = stopOf('cucina').pose
    const noon = await snap(page, { hour: 12, pose: sal })
    const dusk = await snap(page, { hour: 18.6, pose: sal })
    const night = await snap(page, { hour: 22, pose: sal })
    const kit = await snap(page, { hour: 10, pose: cuc })
    const bad = []
    if (!(noon.mean >= 70 && noon.mean <= 190)) bad.push(`salotto 12: ${noon.mean.toFixed(1)} (70-190)`)
    if (!(dusk.mean >= 60 && dusk.mean <= 170)) bad.push(`salotto 18,6: ${dusk.mean.toFixed(1)} (60-170)`)
    if (!(dusk.rb > 1.15)) bad.push(`salotto 18,6: rosso/blu ${dusk.rb.toFixed(2)} (atteso > 1,15)`)
    if (!(night.mean >= 25 && night.mean <= 110)) bad.push(`salotto 22: ${night.mean.toFixed(1)} (25-110)`)
    if (!(kit.mean >= 90 && kit.mean <= 210)) bad.push(`cucina 10: ${kit.mean.toFixed(1)} (90-210)`)
    // zona di sole diretto sul pavimento della camera da letto alle 8: raggi dai punti del pavimento verso il sole.
    // Contano solo le mesh che proiettano ombra: i vetri (castShadow falso) lasciano passare il sole anche nella mappa d'ombra.
    const sun = await page.evaluate(async () => {
      const C = window.CASA, cx = C.debug.ctx, T = cx.THREE
      C.api.setTime(8, { immediate: true })
      await C.debug.settle(10)
      let L
      cx.scene.traverse((o) => { if (o.isDirectionalLight) L = o })
      const toSun = L.position.clone().sub(L.target.position).normalize()
      const g = cx.groups
      const targets = [g.architecture, g.openings, g.exterior, g.ceilings, g.city]
      const rc = new T.Raycaster()
      rc.far = 400
      const STEP = 0.15
      let lit = 0, n = 0
      for (const [x0, z0, x1, z1] of cx.plan.rooms.find((r) => r.id === 'camera2').rects) {
        for (let x = x0 + STEP / 2; x < x1; x += STEP) for (let z = z0 + STEP / 2; z < z1; z += STEP) {
          n++
          rc.set(new T.Vector3(x, 0.05, z), toSun)
          if (!rc.intersectObjects(targets, true).some((i) => i.object.visible && i.object.castShadow)) lit++
        }
      }
      return { lit, n, area: lit * STEP * STEP }
    })
    if (!(sun.area >= 0.25)) bad.push(`camera2 8: sole diretto su ${sun.area.toFixed(2)} m² di pavimento (${sun.lit}/${sun.n} punti), atteso una zona di almeno 0,25 m²`)
    if (bad.length) fail(bad.join(' | '))
    return `salotto 12/18,6/22: ${noon.mean.toFixed(0)}/${dusk.mean.toFixed(0)} (r/b ${dusk.rb.toFixed(2)})/${night.mean.toFixed(0)}; cucina 10: ${kit.mean.toFixed(0)}; camera2 8: sole su ${sun.area.toFixed(2)} m²`
  }, { note: 'Mezzogiorno = ore 12,0. «Zona di sole diretto» misurata con raggi dal pavimento di camera2 alle 8 verso il sole, contando solo le mesh con castShadow, (griglia da 15 cm, nessun solido di architettura, serramenti, soffitti, esterni e città davanti); soglia 0,25 m², scelta dal collaudatore perché 04-TEST.md non fissa un numero.' }),

  make('T3.5', async (page) => {
    const r = await page.evaluate(async () => {
      const C = window.CASA
      const ctx = C.debug.ctx
      const T = ctx.THREE
      await C.api.setStyle('liberty')
      C.api.setTime(10, { immediate: true })
      await C.debug.settle(20)
      const floors = ['ingresso', 'corridoio', 'bagno_baronale'].map((id) => {
        const m = ctx.mat.room(id).floor
        return { id, roughness: m.roughness, env: !!m.envMap }
      })
      return {
        cast: C.debug.lights().sun.castShadow,
        enabled: ctx.renderer.shadowMap.enabled,
        type: ctx.renderer.shadowMap.type,
        pcf: T.PCFShadowMap,
        vsm: T.VSMShadowMap,
        floors,
        glass: ctx.registry.glass.map((m) => !!m.envMap),
      }
    })
    const bad = []
    if (r.cast !== true) bad.push('sun.castShadow non è vero di giorno')
    if (r.enabled !== true) bad.push('renderer.shadowMap.enabled non è vero')
    if (r.type !== r.pcf && r.type !== r.vsm) bad.push(`shadowMap.type ${r.type} (atteso PCFShadowMap ${r.pcf} o VSMShadowMap ${r.vsm})`)
    for (const f of r.floors) {
      if (!(f.roughness <= 0.3)) bad.push(`pavimento ${f.id}: roughness ${f.roughness} (atteso <= 0,3)`)
      if (!f.env) bad.push(`pavimento ${f.id}: envMap nulla`)
    }
    if (!r.glass.length) bad.push('registry.glass è vuoto')
    const noEnv = r.glass.filter((e) => !e).length
    if (noEnv) bad.push(`${noEnv} vetri su ${r.glass.length} senza envMap`)
    if (bad.length) fail(bad.join(' | '))
    return `ombre ok (tipo ${r.type}); pavimenti ${r.floors.map((f) => f.roughness.toFixed(2)).join('/')}; ${r.glass.length} vetri con envMap`
  }),

  make('T3.6', async (page) => {
    const r = await page.evaluate(async () => {
      const C = window.CASA
      const ctx = C.debug.ctx
      C.state.timeScale = 8
      const evs = []
      const samples = []
      let cur = null // sosta corrente: { room } oppure 'finale'
      ctx.events.on('tour:state', (e) => {
        if (e.state === 'finale') cur = 'finale'
        else if (e.stop) cur = { room: e.stop.room }
        else cur = null
        evs.push({ state: e.state, idx: e.stopIndex, room: e.stop?.room ?? null, hourTarget: C.state.hourTarget, finale: e.state === 'finale' })
      })
      const timer = setInterval(() => {
        const p = C.api.getPose()
        samples.push({ x: p.x, z: p.z, ok: ctx.grid.isWalkable(p.x, p.z), walking: C.state.tour === 'running' && C.state.view === 'fps', hourTarget: C.state.hourTarget, cur })
      }, 100)
      await C.api.startTour()
      const t0 = performance.now()
      while (performance.now() - t0 < 150000) {
        await new Promise((res) => setTimeout(res, 200))
        if (C.state.tour === 'idle' && evs.some((e) => e.finale)) break
      }
      clearInterval(timer)
      C.state.timeScale = 1
      return { evs, samples, view: C.state.view, tourState: C.state.tour, secs: (performance.now() - t0) / 1000 }
    })
    const bad = []
    const wantRooms = STOPS.map((s) => s.room)
    const gotRooms = r.evs.filter((e) => e.state === 'running' && e.room).map((e) => e.room)
    const dedup = gotRooms.filter((x, i) => i === 0 || x !== gotRooms[i - 1])
    if (JSON.stringify(dedup) !== JSON.stringify(wantRooms)) bad.push(`soste ${dedup.join(',')} invece di ${wantRooms.join(',')}`)
    if (!r.evs.some((e) => e.finale)) bad.push('nessun evento finale')
    const off = r.samples.filter((s) => s.walking && !s.ok)
    if (off.length) bad.push(`${off.length} campioni su ${r.samples.length} non calpestabili, il primo a (${off[0].x.toFixed(2)}, ${off[0].z.toFixed(2)})`)
    if (r.view !== 'dollhouse') bad.push(`alla fine state.view = ${r.view}`)
    if (r.tourState !== 'idle') bad.push(`alla fine state.tour = ${r.tourState}`)
    // luce: ora delle soste
    const hourOf = new Map(STOPS.map((s) => [s.room, s.stop.hour]))
    for (const e of r.evs.filter((x) => x.state === 'running' && x.room)) {
      const h = hourOf.get(e.room)
      if (h != null && Math.abs(e.hourTarget - h) > 0.01) bad.push(`sosta ${e.room}: hourTarget ${e.hourTarget} all'arrivo, atteso ${h}`)
    }
    const during = new Map()
    for (const s of r.samples) {
      if (s.cur && s.cur !== 'finale') {
        const h = hourOf.get(s.cur.room)
        if (h != null) {
          during.set(s.cur.room, (during.get(s.cur.room) ?? 0) + 1)
          if (Math.abs(s.hourTarget - h) > 0.01) bad.push(`durante la sosta ${s.cur.room}: hourTarget ${s.hourTarget} (atteso ${h})`)
        }
      } else if (s.cur === 'finale' && Math.abs(s.hourTarget - tour.finale.hour) > 0.01) {
        bad.push(`nel finale: hourTarget ${s.hourTarget} (atteso ${tour.finale.hour})`)
      }
    }
    const fin = r.evs.find((e) => e.finale)
    if (fin && Math.abs(fin.hourTarget - tour.finale.hour) > 0.01) bad.push(`evento finale: hourTarget ${fin.hourTarget} (atteso ${tour.finale.hour})`)
    const terr = r.evs.find((e) => e.state === 'running' && e.room === 'terrazza')
    if (!terr || Math.abs(terr.hourTarget - 18.6) > 0.01) bad.push(`terrazza: hourTarget ${terr?.hourTarget} (atteso 18,6)`)
    const uniq = [...new Set(bad)]
    if (uniq.length) fail(uniq.slice(0, 8).join(' | '))
    return `${dedup.length} soste in ordine, ${r.samples.filter((s) => s.walking).length} campioni a piedi calpestabili, ${r.secs.toFixed(0)} s reali`
  }, { note: 'La calpestabilità si controlla finché il tour cammina in prima persona (state.tour running, view fps): nel finale la camera è quella della vista dall\'alto e getPose non è una posizione a terra.' }),

  make('T3.7', async (page, ctx) => {
    await enter(page)
    const r = await page.evaluate(async () => {
      const C = window.CASA
      const cx = C.debug.ctx
      C.state.timeScale = 8
      const waitStop = () => new Promise((res) => {
        const off = cx.events.on('tour:state', (e) => { if (e.stop && e.state === 'running') { off(); res(e.stop.room) } })
      })
      const out = []
      const first = waitStop()
      await C.api.startTour()
      const spaces = [...cx.plan.rooms, ...cx.plan.outdoor]
      const count = cx.tour.path.filter((s) => s.stop).length
      let room = await first
      for (let i = 0; i < count; i++) {
        C.api.pauseTour()
        await C.debug.settle(4)
        const card = document.querySelector('[data-testid=tour-card]')
        const rect = card.getBoundingClientRect()
        const cs = getComputedStyle(card)
        const sp = spaces.find((s) => s.id === room)
        const def = cx.tour.path.find((s) => s.stop?.room === room).stop
        out.push({
          room, area: sp ? sp.area : null, title: def.title, highlight: def.highlight,
          visible: !card.hidden && cs.display !== 'none' && cs.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
          text: card.textContent,
        })
        const next = i < count - 1 ? waitStop() : null
        C.api.resumeTour()
        if (!next) break
        room = await next
      }
      C.api.stopTour()
      C.state.timeScale = 1
      return out
    })
    const bad = []
    for (const s of r) {
      if (!s.visible) bad.push(`${s.room}: scheda non visibile`)
      if (!s.text.includes(s.title)) bad.push(`${s.room}: manca il titolo «${s.title}»`)
      if (!s.text.includes(s.highlight)) bad.push(`${s.room}: manca la frase`)
      if (s.area == null) { bad.push(`${s.room}: nessuna superficie in plan`); continue }
      const want = `${s.area.toFixed(1).replace('.', ',')} m²`
      if (!/\d+,\d m²/.test(s.text)) bad.push(`${s.room}: superficie senza virgola e una cifra decimale`)
      if (!s.text.includes(want)) bad.push(`${s.room}: manca «${want}»`)
    }
    if (r.length !== STOPS.length) bad.push(`verificate ${r.length} soste su ${STOPS.length}`)
    if (bad.length) fail(bad.slice(0, 8).join(' | '))
    return `${r.length} soste: titolo, superficie e frase presenti`
  }),

  make('T3.8', async (page) => {
    await enter(page)
    const click = (id) => page.click(`[data-testid=${id}]`)
    const r = await page.evaluate(async () => {
      const C = window.CASA
      C.state.timeScale = 8
      await C.api.startTour()
      await C.debug.settle(5)
      return { tour: C.state.tour }
    })
    if (r.tour !== 'running') fail(`dopo startTour state.tour = ${r.tour}`)
    // pausa: il tempo si ferma
    await click('tour-pause')
    const p0 = await page.evaluate(() => ({ s: window.CASA.state.tour, pose: window.CASA.api.getPose(), log: window.CASA.debug.tourLog().length }))
    await sleep(700)
    const p1 = await page.evaluate(() => ({ s: window.CASA.state.tour, pose: window.CASA.api.getPose(), log: window.CASA.debug.tourLog().length }))
    if (p0.s !== 'paused') fail(`dopo tour-pause state.tour = ${p0.s}`)
    if (JSON.stringify(p0.pose) !== JSON.stringify(p1.pose) || p0.log !== p1.log) fail('in pausa la camera si muove ancora')
    await click('tour-pause')
    const resumed = await page.evaluate(() => window.CASA.state.tour)
    if (resumed !== 'running') fail(`secondo clic su tour-pause: state.tour = ${resumed}`)
    // avanti: passa alla sosta successiva
    const idx0 = await page.evaluate(() => window.CASA.state.tourStop)
    await click('tour-skip')
    await page.waitForFunction((i) => window.CASA.debug.tourLog().length > i + 1 || window.CASA.state.tourStop > i, idx0, { timeout: 20000 }).catch(() => fail('tour-skip non porta alla sosta successiva entro 20 s'))
    const log = await page.evaluate(() => window.CASA.debug.tourLog().map((e) => e.room))
    if (log.length < 2 || log[1] !== STOPS[1].room) fail(`dopo tour-skip soste raggiunte: ${log.join(',')}`)
    // esci
    await click('tour-exit')
    const e1 = await page.evaluate(() => ({ s: window.CASA.state.tour, locked: window.CASA.debug.nav().locked }))
    if (e1.s !== 'idle') fail(`dopo tour-exit state.tour = ${e1.s}`)
    if (e1.locked) fail('dopo tour-exit i comandi restano bloccati')
    // i comandi rispondono: un passo con W dal salotto
    await page.evaluate(() => window.CASA.api.teleport({ x: 18.6, z: 10.28, yaw: 0, pitch: 0 }))
    const a = await page.evaluate(() => window.CASA.api.getPose())
    await page.keyboard.down('KeyD')
    await sleep(600)
    await page.keyboard.up('KeyD')
    const b = await page.evaluate(() => window.CASA.api.getPose())
    if (Math.hypot(b.x - a.x, b.z - a.z) < 0.1) fail('dopo tour-exit i tasti di movimento non muovono la camera')
    // qualunque tasto di movimento ferma il tour
    for (const key of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      await page.evaluate(async () => { window.CASA.state.timeScale = 8; await window.CASA.api.startTour() })
      if ((await page.evaluate(() => window.CASA.state.tour)) !== 'running') fail('il tour non riparte')
      await page.keyboard.press(key)
      await sleep(150)
      const s = await page.evaluate(() => ({ s: window.CASA.state.tour, locked: window.CASA.debug.nav().locked }))
      if (s.s !== 'idle' || s.locked) fail(`il tasto ${key} non riporta a idle con i comandi liberi (${s.s}, bloccati ${s.locked})`)
    }
    return 'pausa, avanti, esci e tasti di movimento rispondono'
  }),

  make('T3.9', async (page) => {
    await page.mouse.click(8, 8) // gesto dell'utente; fuori dai pulsanti
    const idle = await page.evaluate(() => window.CASA.debug.audio())
    if (idle.state !== 'none' && idle.state !== 'suspended') fail(`prima dell'accensione audio().state = ${idle.state}`)
    await page.evaluate(() => window.CASA.api.setMusic(true))
    await page.waitForFunction(() => {
      const a = window.CASA.debug.audio()
      return a.state === 'running' && a.gain > 0.05
    }, null, { timeout: 4000 }).catch(async () => {
      const a = await page.evaluate(() => window.CASA.debug.audio())
      fail(`entro 4 s audio() = ${JSON.stringify(a)} (atteso running e gain > 0,05)`)
    })
    const on = await page.evaluate(() => window.CASA.debug.audio())
    await page.evaluate(() => window.CASA.api.setMusic(false))
    await page.waitForFunction(() => window.CASA.debug.audio().gain < 0.005, null, { timeout: 1500 }).catch(async () => {
      const a = await page.evaluate(() => window.CASA.debug.audio())
      fail(`entro 1,5 s dallo spegnimento audio() = ${JSON.stringify(a)} (atteso gain < 0,005)`)
    })
    return `acceso: ${on.state}, gain ${on.gain.toFixed(3)}, ${on.voices} voci`
  }),

  make('T3.10', async (page, ctx) => {
    const bad = []
    const ids = ['btn-tour', 'btn-view', 'style-liberty', 'style-moderno', 'style-scandinavo', 'slider-time', 'btn-music', 'btn-help', 'splash-tour', 'splash-enter', 'minimap']
    for (const id of ids) if ((await page.locator(`[data-testid=${id}]`).count()) !== 1) bad.push(`manca [data-testid=${id}]`)
    if (bad.length) fail(bad.join(' | '))
    const st = () => page.evaluate(() => ({ ...window.CASA.state }))
    const waitFor = (fn, arg, what) => page.waitForFunction(fn, arg, { timeout: 8000 }).catch(() => bad.push(`${what}: stato non cambiato come previsto`))
    // splash-enter
    await page.click('[data-testid=splash-enter]')
    let s = await st()
    if (s.music !== true) bad.push('dopo splash-enter state.music non è vero')
    if (!(await page.locator('[data-testid=splash]').evaluate((e) => e.hidden))) bad.push('splash-enter non chiude la schermata')
    // stili
    for (const id of ['moderno', 'scandinavo', 'liberty']) {
      await page.click(`[data-testid=style-${id}]`)
      await waitFor((x) => window.CASA.state.style === x, id, `style-${id}`)
    }
    // ora del giorno
    await page.locator('[data-testid=slider-time]').fill('19')
    await waitFor(() => Math.abs(window.CASA.state.hourTarget - 19) < 0.05, null, 'slider-time')
    await page.locator('[data-testid=slider-time]').fill('10')
    // musica
    const m0 = (await st()).music
    await page.click('[data-testid=btn-music]')
    await waitFor((v) => window.CASA.state.music !== v, m0, 'btn-music')
    // comandi
    await page.click('[data-testid=btn-help]')
    if (await page.locator('[data-testid=help]').evaluate((e) => e.hidden)) bad.push('btn-help non apre i comandi')
    await page.keyboard.press('Escape')
    // minimappa: un clic su camera2
    const mm = await page.evaluate(() => {
      const c = window.CASA.debug.ctx.plan.rooms.find((r) => r.id === 'camera2').spawn
      return window.CASA.debug.minimapPx(c[0], c[1])
    })
    await page.mouse.click(mm.x, mm.y)
    await waitFor(() => window.CASA.debug.ctx.grid.spaceAt(window.CASA.api.getPose().x, window.CASA.api.getPose().z)?.id === 'camera2', null, 'minimap')
    // vista
    await page.click('[data-testid=btn-view]')
    await waitFor(() => window.CASA.state.view === 'dollhouse', null, 'btn-view (alto)')
    await page.click('[data-testid=btn-view]')
    await waitFor(() => window.CASA.state.view === 'fps', null, 'btn-view (prima persona)')
    // tour
    await page.click('[data-testid=btn-tour]')
    await waitFor(() => window.CASA.state.tour === 'running', null, 'btn-tour (avvio)')
    await page.click('[data-testid=btn-tour]')
    await waitFor(() => window.CASA.state.tour === 'idle', null, 'btn-tour (arresto)')
    // splash-tour in una sessione nuova, senza preferenza salvata
    const s2 = await open(ctx)
    await s2.page.click('[data-testid=splash-tour]')
    await s2.page.waitForFunction(() => window.CASA.state.tour === 'running', null, { timeout: 8000 }).catch(() => bad.push('splash-tour non avvia il tour'))
    const m2 = await s2.page.evaluate(() => window.CASA.state.music)
    if (m2 !== true) bad.push('dopo splash-tour state.music non è vero')
    if (bad.length) fail(bad.join(' | '))
    return 'tutti gli 11 elementi presenti e funzionanti'
  }),

  make('T3.11', async (page) => {
    const bad = []
    const key = (k) => page.keyboard.press(k)
    const until = async (fn, arg, what) => { try { await page.waitForFunction(fn, arg, { timeout: 8000 }) } catch { bad.push(`${what}: non è accaduto`) } }
    await key('m')
    await until(() => window.CASA.state.view === 'dollhouse', null, 'M -> vista dall\'alto')
    await key('m')
    await until(() => window.CASA.state.view === 'fps', null, 'M -> prima persona')
    await key('t')
    await until(() => window.CASA.state.tour === 'running', null, 'T avvia il tour')
    await key('t')
    await until(() => window.CASA.state.tour === 'idle', null, 'T ferma il tour')
    for (const [k, id] of [['2', 'moderno'], ['3', 'scandinavo'], ['1', 'liberty']]) {
      await key(k)
      await until((x) => window.CASA.state.style === x, id, `tasto ${k} -> ${id}`)
      // il cambio di stile ignora i tasti finché il velo è acceso: si aspetta che torni libero
      await until(() => !document.querySelector('.k-veil.on') && !document.querySelector('[data-testid=style-liberty]').disabled, null, `fine del cambio di stile (${id})`)
    }
    const m0 = await page.evaluate(() => window.CASA.state.music)
    await key('n')
    await until((v) => window.CASA.state.music !== v, m0, 'N cambia la musica')
    await key('n')
    await until((v) => window.CASA.state.music === v, m0, 'N ripristina la musica')
    await key('h')
    await until(() => document.querySelector('[data-testid=help]')?.hidden === false, null, 'H apre i comandi')
    await key('Escape')
    await until(() => document.querySelector('[data-testid=help]')?.hidden === true, null, 'Esc chiude i comandi')
    if (bad.length) fail(bad.join(' | '))
    return 'M, T, 1 2 3, N, H, Esc rispondono'
  }, { note: 'Tra un tasto di stile e il successivo si attende la fine del velo (la barra ignora le richieste durante un cambio: comportamento previsto).' }),

  make('T3.12', async (page, ctx) => {
    const bad = []
    await enter(page)
    await page.evaluate(() => window.CASA.api.teleport({ x: 18.6, z: 10.28, yaw: 0, pitch: 0 }))
    const y0 = await page.evaluate(() => window.CASA.api.getPose().yaw)
    await page.mouse.move(500, 300)
    await page.mouse.down()
    await page.mouse.move(700, 300, { steps: 12 })
    await page.mouse.up()
    const y1 = await page.evaluate(() => window.CASA.api.getPose().yaw)
    if (!(Math.abs(y1 - y0) >= 0.3)) bad.push(`trascinando 200 px yaw cambia di ${Math.abs(y1 - y0).toFixed(3)} rad (atteso almeno 0,3)`)
    // telefono
    const s = await open(ctx, { size: '390x844', touch: true })
    await s.page.tap('[data-testid=splash-enter]')
    await s.page.waitForFunction(() => document.querySelector('[data-testid=splash]')?.hidden === true, null, { timeout: 3000 })
    const joy = await s.page.locator('[data-testid=joystick]').isVisible()
    if (!joy) bad.push('joystick non visibile a 390 x 844 con touch')
    for (const id of ['btn-tour', 'btn-view', 'btn-music']) {
      const loc = s.page.locator(`[data-testid=${id}]`)
      if (!(await loc.isVisible())) { bad.push(`${id} non visibile`); continue }
      const box = await loc.boundingBox()
      if (!(box.height >= 44)) bad.push(`${id} alto ${box.height.toFixed(1)} px (atteso almeno 44)`)
    }
    const sw = await s.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }))
    if (sw.sw > sw.cw || sw.bw > sw.cw) bad.push(`barra di scorrimento orizzontale: scrollWidth ${sw.sw}/${sw.bw} contro ${sw.cw}`)
    if (bad.length) fail(bad.join(' | '))
    return `yaw ${Math.abs(y1 - y0).toFixed(2)} rad; telefono: joystick e pulsanti ok, nessuna barra`
  }),

  make('T3.13', async (page) => {
    const r = await page.evaluate(async () => {
      const C = window.CASA
      const ctx = C.debug.ctx
      C.api.setTime(22, { immediate: true })
      C.api.setQuality('low')
      await C.debug.settle(40)
      const low = {
        shadows: ctx.renderer.shadowMap.enabled,
        mapSize: ctx.groups.lights.children.find((o) => o.isDirectionalLight)?.shadow.mapSize.x ?? null,
        real: C.debug.lights().realLights,
        point: C.debug.stats().pointLights,
        pr: ctx.renderer.getPixelRatio(),
        level: C.state.quality,
      }
      C.api.setQuality('auto')
      await C.debug.settle(5)
      const auto = C.debug.quality()
      C.api.setQuality('high')
      await C.debug.settle(20)
      const high = { pr: ctx.renderer.getPixelRatio(), shadows: ctx.renderer.shadowMap.enabled }
      return { low, auto, high }
    })
    const bad = []
    const shadowOk = r.low.shadows === false || (r.low.mapSize != null && r.low.mapSize <= 1024)
    if (!shadowOk) bad.push(`low: ombre accese con mappa ${r.low.mapSize}`)
    if (!(r.low.real <= 3 && r.low.point <= 3)) bad.push(`low: luci reali ${r.low.real}, pointLights ${r.low.point} (atteso al massimo 3)`)
    if (r.low.pr !== 1) bad.push(`low: rapporto pixel ${r.low.pr} (atteso 1)`)
    if (r.low.level !== 'low') bad.push(`low: state.quality ${r.low.level}`)
    if (r.auto.auto !== true) bad.push('auto: debug.quality().auto non è vero')
    if (bad.length) fail(bad.join(' | '))
    return `low: ombre ${r.low.shadows ? `mappa ${r.low.mapSize}` : 'spente'}, luci ${r.low.real}, pixel ${r.low.pr}; auto attivo`
  }),

  make('T3.14', async (page) => {
    await enter(page)
    const bad = []
    const spawn = await page.evaluate(() => window.CASA.debug.ctx.plan.rooms.find((r) => r.id === 'cucina').spawn)
    await page.evaluate(async () => { await window.CASA.api.setView('dollhouse', { animate: false }); await window.CASA.debug.settle(10) })
    const px = await page.evaluate((sp) => {
      const ctx = window.CASA.debug.ctx
      const cam = ctx.camera
      cam.updateMatrixWorld(true)
      const v = new ctx.THREE.Vector3(sp[0], 0, sp[1]).project(cam)
      const r = ctx.canvas.getBoundingClientRect()
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }
    }, spawn)
    await page.mouse.dblclick(px.x, px.y)
    await page.waitForFunction(() => window.CASA.state.view === 'fps', null, { timeout: 8000 }).catch(() => bad.push('doppio clic: la vista non torna in prima persona'))
    const a = await page.evaluate(() => { const p = window.CASA.api.getPose(); return window.CASA.debug.ctx.grid.spaceAt(p.x, p.z)?.id })
    if (a !== 'cucina') bad.push(`doppio clic in vista dall'alto: si arriva in ${a} (atteso cucina)`)
    await page.evaluate(() => window.CASA.api.teleport('salotto'))
    const mid = await page.evaluate(() => { const p = window.CASA.api.getPose(); return window.CASA.debug.ctx.grid.spaceAt(p.x, p.z)?.id })
    if (mid !== 'salotto') bad.push(`teleport salotto: ${mid}`)
    const mm = await page.evaluate((sp) => window.CASA.debug.minimapPx(sp[0], sp[1]), spawn)
    await page.mouse.click(mm.x, mm.y)
    await page.waitForFunction(() => { const p = window.CASA.api.getPose(); return window.CASA.debug.ctx.grid.spaceAt(p.x, p.z)?.id === 'cucina' }, null, { timeout: 8000 }).catch(() => bad.push('clic sulla minimappa non porta in cucina'))
    const st = await page.evaluate(() => window.CASA.state.view)
    if (st !== 'fps') bad.push(`dopo il clic sulla minimappa state.view = ${st}`)
    if (bad.length) fail(bad.join(' | '))
    return 'doppio clic e minimappa portano in cucina'
  }),
]

// T3.9 verifica anche l'assenza di richieste di rete: lo fa il wrapper qui sotto, sulla stessa sessione.
const t39 = assertions.find((a) => a.id === 'T3.9')
const inner39 = t39.run
t39.run = async (page, ctx) => {
  const res = await inner39(page, ctx)
  const extra = foreignRequests(ctx.session)
  if (extra.length) fail(`richieste di rete oltre al documento: ${extra.join(', ')}`)
  return `${res}; nessuna richiesta di rete`
}
