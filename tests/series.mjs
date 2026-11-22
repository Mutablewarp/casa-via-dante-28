/**
 * Elenco degli scatti di ogni serie (spec/04-TEST.md, «Serie di screenshot»).
 * Ogni voce: { name, style, hour, pose?: {x,z,yaw,pitch} in radianti, view?: 'top'|'dollhouse',
 *              ui?, size?, touch?, fresh?, quality? }.
 * `fresh` apre una pagina nuova per lo scatto (schermata iniziale, vista da telefono).
 */
import { readFileSync } from 'node:fs'
import { abs } from './lib.mjs'

const readJson = (p) => JSON.parse(readFileSync(abs(p), 'utf8'))
const tour = readJson('spec/tour.json')
const EYE = tour.settings.eyeHeight
const DEG = Math.PI / 180

const STOPS = tour.path.filter((s) => s.stop).map((s) => {
  const [lx, ly, lz] = s.stop.lookAt
  const [x, z] = s.p
  const dist = Math.hypot(lx - x, lz - z)
  return { room: s.stop.room, pose: { x, z, yaw: Math.atan2(lx - x, lz - z), pitch: Math.atan2(ly - EYE, dist) } }
})
const stop = (room) => {
  const s = STOPS.find((e) => e.room === room)
  if (!s) throw new Error(`sosta assente nel tour: ${room}`)
  return s
}

const STYLES = ['liberty', 'moderno', 'scandinavo']
const OTHER_STYLES = STYLES.slice(1)
const entry = (name, style, hour, extra) => ({ name, style, hour, ...extra })

/** Pose degli scatti aggiuntivi dalla terrazza e dal balcone della cucina. */
const EXTRA = {
  'terrazza-verso-x': { x: 17.2, z: 12.95, yaw: 90 * DEG, pitch: 0 },
  'terrazza-verso-meno-x': { x: 17.2, z: 12.95, yaw: 270 * DEG, pitch: 0 },
  'terrazza-verso-z': { x: 17.2, z: 12.95, yaw: 0, pitch: 0 },
  'terrazza-in-basso': { x: 17.2, z: 14.2, yaw: 0, pitch: -55 * DEG },
  'balcone-cucina-verso-meno-z': { x: 22.0, z: 1.8, yaw: 180 * DEG, pitch: 0 },
}

function fase1() {
  const rooms = ['ingresso', 'salotto', 'sala_pranzo', 'cucina', 'camera_baronale', 'bagno_baronale', 'terrazza', 'gran_salone', 'studio']
  return [
    entry('alto-zenitale', 'liberty', 10, { view: 'top' }),
    ...rooms.map((r) => entry(r, 'liberty', 10, { pose: stop(r).pose })),
    ...Object.entries(EXTRA).map(([n, pose]) => entry(n, 'liberty', 10, { pose })),
    entry('alto-obliqua', 'liberty', 10, { view: 'dollhouse' }),
  ]
}

function fase2() {
  const rooms = ['salotto', 'sala_pranzo', 'camera_baronale', 'cucina', 'gran_salone']
  return [
    ...STOPS.map((s) => entry(`liberty-${s.room}`, 'liberty', 10, { pose: s.pose })),
    ...OTHER_STYLES.flatMap((st) => rooms.map((r) => entry(`${st}-${r}`, st, 10, { pose: stop(r).pose }))),
    ...STYLES.map((st) => entry(`alto-${st}`, st, 10, { view: 'top' })),
  ]
}

function fase3() {
  const rooms = ['salotto', 'gran_salone', 'cucina', 'camera2', 'camera_baronale', 'terrazza']
  const hours = [8, 12.5, 18.6, 22]
  return [
    ...rooms.flatMap((r) => hours.map((h) => entry(`${r}-${String(h).replace('.', '_')}`, 'liberty', h, { pose: stop(r).pose }))),
    entry('sosta-con-interfaccia', 'liberty', 10, { pose: stop('salotto').pose, ui: true }),
    entry('schermata-iniziale', 'liberty', 10, { ui: true, fresh: true }),
    entry('telefono-390x844', 'liberty', 10, { pose: stop('salotto').pose, ui: true, size: '390x844', touch: true, fresh: true, eval: "document.querySelector('[data-testid=\"splash-enter\"]')?.click(); return !!document.querySelector('[data-testid=\"splash\"]')?.hidden" }),
  ]
}

function finale() {
  return [
    ...STYLES.flatMap((st) => STOPS.map((s) => entry(`${st}-10-${s.room}`, st, 10, { pose: s.pose }))),
    ...[18.6, 22].flatMap((h) => STOPS.map((s) => entry(`liberty-${String(h).replace('.', '_')}-${s.room}`, 'liberty', h, { pose: s.pose }))),
    ...STYLES.flatMap((st) => [10, 22].map((h) => entry(`alto-${st}-${h}`, st, h, { view: 'top' }))),
  ]
}

const BUILDERS = { fase1, fase2, fase3, finale }

/** Nomi delle serie disponibili. */
export const SERIES_NAMES = Object.keys(BUILDERS)

/**
 * Elenco degli scatti di una serie.
 * @param {string} name uno tra SERIES_NAMES
 * @returns {Array<object>}
 */
export function getSeries(name) {
  if (!BUILDERS[name]) throw new Error(`serie sconosciuta: ${name} (disponibili: ${SERIES_NAMES.join(', ')})`)
  return BUILDERS[name]()
}
