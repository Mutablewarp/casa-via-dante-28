/** Crea il contesto condiviso `ctx` (sezione 5 del contratto) e l'API di base. */
import * as THREE from 'three'
import { buildGrid } from './grid.js'
import { createEvents } from './events.js'
import { createLog } from './log.js'

const GROUPS = ['architecture', 'ceilings', 'openings', 'exterior', 'city', 'furniture', 'lights', 'sky']
const FURNISHED_TIMEOUT_MS = 10000
const FOV_V = 70 // campo verticale base (gradi)
const FOV_V_MAX = 105 // limite in formato verticale, per non deformare
const RAD = Math.PI / 180

/** In formato verticale alza il campo verticale per tenere ~70 gradi in orizzontale, fino a FOV_V_MAX. */
function fovFor(aspect) {
  if (aspect >= 1) return FOV_V
  const v = 2 * Math.atan(Math.tan((FOV_V * RAD) / 2) / aspect) / RAD
  return Math.min(v, FOV_V_MAX)
}

/** Congela un oggetto JSON in profondità. */
function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o)
    for (const v of Object.values(o)) deepFreeze(v)
  }
  return o
}

/**
 * Costruisce renderer, scena, camera, gruppi, registri, stato e griglia.
 * @param {{ canvas: HTMLCanvasElement, data: {plan:object, furnishing:object, tour:object, styles:object, lighting:object}, debugOn: boolean }} opts
 * @returns {object} ctx
 */
export function createContext({ canvas, data, debugOn }) {
  const log = createLog(debugOn)
  const events = createEvents(log)
  const { plan, furnishing, tour, styles, lighting } = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, deepFreeze(structuredClone(v))]),
  )

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.AgXToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 1500)
  camera.rotation.order = 'YXZ'
  scene.add(camera)

  const groups = {}
  for (const name of GROUPS) {
    groups[name] = new THREE.Group()
    groups[name].name = name
    scene.add(groups[name])
  }

  const ctx = {
    THREE, renderer, scene, camera, canvas,
    plan, furnishing, tour, styles, lighting,
    events, log,
    grid: buildGrid(plan),
    state: {
      ready: false, style: styles.default, hour: lighting.default, hourTarget: lighting.default, night: 0,
      view: 'fps', tour: 'idle', tourStop: -1, music: false, quality: 'high', room: null, timeScale: 1,
    },
    groups,
    registry: { colliders: [], lamps: [], nightMaterials: [], glass: [], updaters: [] },
    api: {},
    debug: { errors: [] },
    nav: {}, mat: {}, tex: {}, furn: {},
  }
  ctx.currentStyle = () => ctx.styles.styles[ctx.state.style]

  /** Adatta renderer e camera alla finestra. */
  ctx.resize = () => {
    const w = Math.max(window.innerWidth, 1)
    const h = Math.max(window.innerHeight, 1)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.fov = fovFor(camera.aspect)
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', ctx.resize)
  ctx.resize()

  ctx.api.setStyle = (id) => setStyle(ctx, id)
  return ctx
}

/**
 * Cambia stile: valida, aggiorna lo stato, emette `style:changed` e attende `furnished`.
 * @param {object} ctx contesto
 * @param {string} id uno tra styles.order
 * @returns {Promise<void>} risolta al successivo `furnished`
 */
function setStyle(ctx, id) {
  if (!ctx.styles.order.includes(id)) return Promise.reject(new Error(`stile sconosciuto: ${id}`))
  if (id === ctx.state.style) return Promise.resolve()
  return new Promise((resolve) => {
    let off = () => {}
    const timer = setTimeout(() => {
      off()
      ctx.log.warn('setStyle: nessun "furnished" entro 10 s')
      resolve()
    }, FURNISHED_TIMEOUT_MS)
    off = ctx.events.on('furnished', () => {
      off()
      clearTimeout(timer)
      resolve()
    })
    ctx.state.style = id
    ctx.events.emit('style:changed', { style: id })
  })
}
