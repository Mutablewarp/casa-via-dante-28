/** Fase 4 · Collaudo finale: T4.2 (T4.1, T4.3-T4.5 non hanno codice: vedi agenti/COLLAUDO.md). */
import { readFileSync } from 'node:fs'
import { abs } from '../lib.mjs'

const plan = JSON.parse(readFileSync(abs('spec/plan.json'), 'utf8'))
const fail = (m) => { throw new Error(m) }

export const assertions = [
  {
    id: 'T4.2',
    async run(page, ctx) {
      const doors = plan.openings.filter((o) => o.walk)
      const bad = []
      let n = 0
      for (const style of ['liberty', 'moderno', 'scandinavo']) {
        await page.evaluate((s) => window.CASA.api.setStyle(s), style)
        await page.evaluate(() => window.CASA.debug.settle?.(10))
        const res = await page.evaluate((ops) => {
          const dbg = window.CASA.debug
          const api = window.CASA.api
          const grid = dbg.ctx.grid
          const sp = (x, z) => grid.spaceAt(x, z)?.id ?? null
          const out = []
          for (const o of ops) {
            const [x0, z0, x1, z1] = o.rect
            const cx = (x0 + x1) / 2
            const cz = (z0 + z1) / 2
            const alongZ = o.wallAlong === 'x' // parete lungo x: si attraversa lungo z
            for (const sign of [1, -1]) {
              const yaw = alongZ ? (sign > 0 ? 0 : Math.PI) : (sign > 0 ? Math.PI / 2 : -Math.PI / 2)
              const half = (alongZ ? z1 - z0 : x1 - x0) / 2
              // l'ambiente d'arrivo si legge subito oltre il muro: certi disimpegni e la lavanderia sono profondi meno di 1 m
              const target = sp(alongZ ? cx : cx + sign * (half + 0.2), alongZ ? cz + sign * (half + 0.2) : cz)
              let best = { id: o.id, sign, prog: -9, end: null, target, ok: false, tried: 0 }
              // partenze a distanze e scarti laterali crescenti: se l'arredo occupa il punto, si prova il successivo
              for (const off of [0.45, 0.6, 0.8, 1.0, 1.3]) {
                for (const lat of [0, 0.08, -0.08]) {
                  const sx = alongZ ? cx + lat : cx - sign * off
                  const sz = alongZ ? cz - sign * off : cz + lat
                  if (!sp(sx, sz) || !target) continue
                  const st = api.teleport({ x: sx, z: sz, yaw, pitch: 0 })
                  if (Math.hypot(st.x - sx, st.z - sz) > 0.02) continue
                  best.tried++
                  let p = st
                  let prog = 0
                  for (let i = 0; i < 40 && prog <= 0.9; i++) {
                    p = dbg.step({ forward: 1 }, 0.1)
                    prog = alongZ ? (p.z - cz) * sign : (p.x - cx) * sign
                  }
                  const end = sp(p.x, p.z)
                  const ok = prog > half + 0.2 && end === target
                  if (ok || prog > best.prog) best = { ...best, prog: +prog.toFixed(2), end, ok }
                  if (ok) break
                }
                if (best.ok) break
              }
              out.push(best)
            }
          }
          return out
        }, doors)
        for (const r of res) {
          n++
          if (!r.ok) bad.push(`${style} ${r.id} ${r.sign > 0 ? '+' : '-'}: avanzamento ${r.prog} m, arrivo ${r.end} (atteso ${r.target})`)
        }
      }
      for (const e of ctx.session.errors) bad.push(`errore in console: ${e}`)
      if (bad.length) fail(bad.join(' | '))
      return `${n} attraversamenti (${doors.length} porte, 2 versi, 3 stili)`
    },
  },
]
