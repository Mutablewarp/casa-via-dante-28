/** Build: unisce src/main.js in un solo index.html. Uso: build.mjs [--out file] | --check file... */
import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MAX_BYTES = 2.0 * 1024 * 1024
const COMMON = {
  bundle: true, format: 'iife', target: 'es2020', legalComments: 'none',
  loader: { '.json': 'json', '.css': 'text' }, absWorkingDir: ROOT, logLevel: 'silent',
}

const args = process.argv.slice(2)

async function check(files) {
  let failed = false
  for (const f of files) {
    try {
      await build({ ...COMMON, entryPoints: [f], write: false })
      console.log(`OK ${f}`)
    } catch (e) {
      failed = true
      console.error(`ERRORE ${f}`)
      for (const m of e.errors ?? []) {
        const loc = m.location ? `${m.location.file}:${m.location.line}:${m.location.column}` : ''
        console.error(`  ${loc} ${m.text}`)
      }
      if (!e.errors?.length) console.error(`  ${e.message}`)
    }
  }
  process.exit(failed ? 1 : 0)
}

async function main() {
  if (args[0] === '--check') return check(args.slice(1))
  const oi = args.indexOf('--out')
  const out = resolve(ROOT, oi >= 0 ? args[oi + 1] : 'index.html')
  const t0 = Date.now()
  const res = await build({ ...COMMON, entryPoints: ['src/main.js'], minify: true, write: false })
  const code = res.outputFiles[0].text.split('</script').join('<\\/script')
  const tpl = readFileSync(resolve(ROOT, 'src/index.template.html'), 'utf8')
  const html = tpl.split('<!--BUNDLE-->').join(code)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, html)
  const size = statSync(out).size
  console.log(`scritto ${out.replace(ROOT + '/', '')}: ${(size / 1024).toFixed(1)} KB in ${Date.now() - t0} ms`)
  if (size > MAX_BYTES) {
    console.error(`ERRORE: ${(size / 1048576).toFixed(2)} MB supera il limite di 2,0 MB`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e.errors?.map((m) => `${m.location?.file}:${m.location?.line} ${m.text}`).join('\n') ?? e.message)
  process.exit(1)
})
