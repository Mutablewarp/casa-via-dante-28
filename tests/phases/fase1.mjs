/** Fase 1 · Involucro: asserzioni T1.1 e T1.3 (le altre le completa il collaudatore). */
import { execFileSync } from 'node:child_process'
import { existsSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, abs, foreignRequests, launch, fileStats } from '../lib.mjs'

const MAX_BYTES = 2.0 * 1024 * 1024

export const assertions = [
  {
    id: 'T1.1',
    raw: true,
    async run(_page, ctx) {
      if (!ctx.htmlGiven) execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'pipe' })
      const file = abs(ctx.html)
      if (!existsSync(file)) throw new Error(`manca ${ctx.html}`)
      const size = statSync(file).size
      if (size >= MAX_BYTES) throw new Error(`${ctx.html} pesa ${(size / 1048576).toFixed(2)} MB (limite 2,0)`)
      const s = await ctx.open()
      const extra = foreignRequests(s)
      if (extra.length) throw new Error(`richieste di rete oltre al documento: ${extra.join(', ')}`)
      return `${(size / 1024).toFixed(0)} KB`
    },
  },
  {
    id: 'T1.2',
    raw: true,
    async run() {
      let out = ''
      try {
        out = execFileSync('npm', ['run', 'test:unit'], { cwd: ROOT, stdio: 'pipe' }).toString()
      } catch (e) {
        throw new Error(`test:unit fallito: ${String(e.stdout || e.message).split('\n').filter((l) => /FALLITO/.test(l)).join(' | ')}`)
      }
      if (/FALLITO/.test(out)) throw new Error('test:unit riporta FALLITO')
      return `${(out.match(/ OK/g) || []).length} controlli unitari OK`
    },
  },
  {
    id: 'T1.3',
    async run(page, ctx) {
      const s = ctx.session
      if (s.readyMs === null || s.readyMs > 15000) throw new Error(`ready non raggiunto entro 15 s (${s.readyMs} ms)`)
      const dbg = await page.evaluate(() => window.CASA.debug.errors.map((e) => e.message))
      if (dbg.length) throw new Error(`CASA.debug.errors: ${dbg.join(' | ')}`)
      if (s.errors.length) throw new Error(`errori in console: ${s.errors.join(' | ')}`)
      const bad = s.warnings.filter((w) => /Clock|PCFSoftShadowMap/.test(w))
      if (bad.length) throw new Error(`avvisi di Three.js: ${bad.join(' | ')}`)
      return `ready in ${s.readyMs} ms`
    },
  },
  {
    id: 'T1.4',
    async run(page) {
      const r = await page.evaluate(async () => {
        const C = window.CASA
        const p0 = C.api.getPose()
        const sp0 = C.debug.ctx.grid.spaceAt(p0.x, p0.z)
        C.api.teleport('salotto')
        const p1 = C.api.getPose()
        return { p0, sp0: sp0 && sp0.id, sp1: C.debug.ctx.grid.spaceAt(p1.x, p1.z)?.id }
      })
      const { p0 } = r
      if (r.sp0 !== 'pianerottolo') throw new Error(`posa iniziale in ${r.sp0}`)
      if (Math.abs(p0.y - 1.62) > 0.01) throw new Error(`y iniziale ${p0.y}`)
      if (Math.abs(p0.yaw) > 0.01) throw new Error(`yaw iniziale ${p0.yaw}`)
      if (r.sp1 !== 'salotto') throw new Error(`dopo teleport('salotto') spaceAt dà ${r.sp1}`)
      return `start (${p0.x.toFixed(2)}, ${p0.z.toFixed(2)}) y ${p0.y.toFixed(2)}`
    },
  },
  {
    id: 'T1.5',
    async run(page) {
      const r = await page.evaluate(() => {
        const C = window.CASA
        C.api.teleport({ x: 12.6, z: 10.6, yaw: Math.PI })
        const a = C.debug.step({ forward: 1 }, 8)
        C.api.teleport({ x: 17.6, z: 7.6, yaw: 0 })
        const b = C.debug.step({ forward: 1 }, 3)
        return { a, b, sp: C.debug.ctx.grid.spaceAt(b.x, b.z)?.id }
      })
      if (!(r.a.z >= 8.75 && r.a.z <= 8.95)) throw new Error(`arresto contro la nicchia a z = ${r.a.z.toFixed(3)} (atteso 8,75-8,95)`)
      if (r.sp !== 'salotto') throw new Error(`dall'arco si finisce in ${r.sp} (${r.b.x.toFixed(2)}, ${r.b.z.toFixed(2)}), atteso salotto`)
      return `z ${r.a.z.toFixed(3)}; arco -> salotto`
    },
  },
  {
    id: 'T1.6',
    async run(page) {
      const r = await page.evaluate(async () => {
        const C = window.CASA
        const ctx = C.debug.ctx
        const start = C.api.getPose()
        await C.api.setView('dollhouse', { animate: false })
        const up = { ceil: ctx.groups.ceilings.visible, camY: ctx.camera.position.y, view: C.state.view }
        await C.api.setView('fps', { animate: false })
        return { start, up, back: { ceil: ctx.groups.ceilings.visible, pose: C.api.getPose(), view: C.state.view } }
      })
      if (r.up.ceil !== false) throw new Error('in dollhouse groups.ceilings.visible non è falso')
      if (!(r.up.camY > 8)) throw new Error(`camera a y = ${r.up.camY.toFixed(2)}, deve stare sopra 8`)
      if (r.back.ceil !== true) throw new Error('tornando a fps i soffitti non sono visibili')
      for (const k of ['x', 'y', 'z', 'yaw', 'pitch']) {
        if (Math.abs(r.back.pose[k] - r.start[k]) > 0.01) throw new Error(`posa diversa da quella di partenza: ${k} ${r.back.pose[k]} contro ${r.start[k]}`)
      }
      return `camera y ${r.up.camY.toFixed(1)}`
    },
  },
  {
    id: 'T1.7',
    note: 'Collaudo fase 2: misura con groups.furniture nascosto, come prescrive 04-TEST.md («senza arredi»); con gli arredi i limiti sono quelli di T2.7.',
    async run(page) {
      const r = await page.evaluate(async () => {
        const C = window.CASA
        const furn = C.debug.ctx.groups.furniture
        const nFurn = furn.children.length
        furn.visible = false
        await C.debug.settle(40)
        const fps = C.debug.stats()
        await C.api.setView('top', { animate: false })
        await C.debug.settle(40)
        const top = C.debug.stats()
        furn.visible = true
        return { fps, top, nFurn }
      })
      for (const [n, st] of [['pianerottolo', r.fps], ['vista dall\'alto', r.top]]) {
        if (st.calls > 400) throw new Error(`${n}: ${st.calls} chiamate di disegno (limite 400)`)
        if (st.triangles > 400000) throw new Error(`${n}: ${st.triangles} triangoli (limite 400000)`)
      }
      return `senza arredi: fps ${r.fps.calls} chiamate/${r.fps.triangles} tri; alto ${r.top.calls}/${r.top.triangles}; gruppo arredi: ${r.nFurn} figli`
    },
  },
  {
    id: 'T1.8',
    raw: true,
    async run(_page, ctx) {
      const args = ['tests/shots.mjs', 'fase1']
      if (ctx.htmlGiven) args.push('--html', ctx.html)
      try {
        execFileSync('node', args, { cwd: ROOT, stdio: 'pipe' })
      } catch (e) {
        throw new Error(`shots fase1 fallito: ${String(e.stdout || e.message).slice(-400)}`)
      }
      const dir = abs('out/shots/fase1')
      const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort()
      if (files.length !== 16) throw new Error(`${files.length} immagini invece di 16`)
      const browser = await launch()
      const flat = []
      try {
        for (const f of files) {
          const st = await fileStats(browser, join(dir, f))
          if (!(st.std > 12)) flat.push(`${f} (std ${st.std.toFixed(1)})`)
        }
      } finally {
        await browser.close()
      }
      if (flat.length) throw new Error(`immagini uniformi: ${flat.join(', ')}`)
      return `${files.length} immagini, tutte con std > 12`
    },
  },
]
