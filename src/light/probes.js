/**
 * Luce indiretta per ambiente. Per ogni stanza e spazio esterno una piccola cattura a cubo dal centro,
 * proiettata sulla GPU in armoniche sferiche L2 (una riga di texture per ambiente): lo shader standard
 * (probe-shader.js) la usa come irradianza diffusa. Ogni nuova cattura vede la stanza già illuminata dalla
 * precedente: i rimbalzi si accumulano un passaggio alla volta. Per la stanza in cui si trova la camera si
 * genera anche una mappa PMREM dei riflessi.
 */
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'
import { K } from '../core/grid.js'
import { installProbeShader } from './probe-shader.js'

const CELL = 0.05 // m per texel della mappa degli ambienti: il passo della pianta
const DILATE = 4 // texel (20 cm) di margine degli ambienti dentro i muri
const PROBE_Y = 1.5 // quota di cattura (m)
const CUBE_SIZE = { high: 16, medium: 16, low: 8 }
const NEAR = 0.08
const FAR = 1500 // la cupola del cielo sta a 1200 m: è la luce che entra dalle finestre
const PASSES = 4 // rimbalzi dopo un cambiamento
const SYNC_PASSES = { high: 1, medium: 1, low: 1 } // subito, nello stesso fotogramma, dopo un salto
const PER_FRAME = { high: 2, medium: 1, low: 1 }
const ENV_MIN_MS = { high: 350, medium: 700, low: 1e9 } // intervallo minimo tra due mappe dei riflessi della stessa stanza
const ENV_SIZE = 256
const LUM_LOG_MIN = -16 // la luminanza viaggia in 16 bit come log2 tra -16 e +8
const LUM_LOG_RANGE = 24

const SH_FRAGMENT = /* glsl */`
#include <common>
uniform samplerCube envMap;
void main() {
	int coefIndex = int( gl_FragCoord.x );
	vec3 acc[ 9 ];
	for ( int k = 0; k < 9; k ++ ) acc[ k ] = vec3( 0.0 );
	float totalWeight = 0.0;
	float pixelSize = 2.0 / float( CUBEMAP_SIZE );
	for ( int face = 0; face < 6; face ++ ) {
		for ( int iy = 0; iy < CUBEMAP_SIZE; iy ++ ) {
			for ( int ix = 0; ix < CUBEMAP_SIZE; ix ++ ) {
				float col = ( float( ix ) + 0.5 ) * pixelSize - 1.0;
				float row = 1.0 - ( float( iy ) + 0.5 ) * pixelSize;
				vec3 coord;
				if ( face == 0 ) coord = vec3( 1.0, row, - col );
				else if ( face == 1 ) coord = vec3( - 1.0, row, col );
				else if ( face == 2 ) coord = vec3( col, 1.0, - row );
				else if ( face == 3 ) coord = vec3( col, - 1.0, row );
				else if ( face == 4 ) coord = vec3( col, row, 1.0 );
				else coord = vec3( - col, row, - 1.0 );
				float lengthSq = dot( coord, coord );
				float weight = 4.0 / ( sqrt( lengthSq ) * lengthSq );
				totalWeight += weight;
				vec3 dir = normalize( coord );
				// tetto alla radianza: un riflesso speculare del sole in un texel non deve accendere la stanza
				vec3 cw = min( textureCube( envMap, coord ).rgb, vec3( RADIANCE_MAX ) ) * weight;
				acc[ 0 ] += cw * 0.282095;
				acc[ 1 ] += cw * ( 0.488603 * dir.y );
				acc[ 2 ] += cw * ( 0.488603 * dir.z );
				acc[ 3 ] += cw * ( 0.488603 * dir.x );
				acc[ 4 ] += cw * ( 1.092548 * dir.x * dir.y );
				acc[ 5 ] += cw * ( 1.092548 * dir.y * dir.z );
				acc[ 6 ] += cw * ( 0.315392 * ( 3.0 * dir.z * dir.z - 1.0 ) );
				acc[ 7 ] += cw * ( 1.092548 * dir.x * dir.z );
				acc[ 8 ] += cw * ( 0.546274 * ( dir.x * dir.x - dir.y * dir.y ) );
			}
		}
	}
	gl_FragColor = vec4( acc[ coefIndex ] * ( 4.0 * PI / totalWeight ), 1.0 );
}`

const LUM_FRAGMENT = /* glsl */`
uniform sampler2D tSH;
void main() {
	vec3 c0 = texelFetch( tSH, ivec2( 0, int( gl_FragCoord.y ) ), 0 ).rgb;
	float lum = dot( c0, vec3( 0.2126, 0.7152, 0.0722 ) ) * 0.282095;
	float e = clamp( ( log2( max( lum, 1e-6 ) ) - float( LOG_MIN ) ) / float( LOG_RANGE ), 0.0, 1.0 ) * 255.0;
	gl_FragColor = vec4( floor( e ) / 255.0, fract( e ), 0.0, 1.0 );
}`

const QUAD_VERTEX = 'void main() { gl_Position = vec4( position.xy, 0.0, 1.0 ); }'

/**
 * Estende ogni ambiente di DILATE texel dentro muri, pilastri e armadi a muro. Con l'MSAA i pixel di bordo
 * valutano la posizione appena oltre lo spigolo della faccia, dentro il muro: senza questo margine prenderebbero
 * la luce dell'esterno e ogni spigolo avrebbe una riga chiara.
 */
function dilate(data, solid, w, h) {
  for (let pass = 0; pass < DILATE; pass++) {
    const src = data.slice()
    for (let j = 1; j < h - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        const c = j * w + i
        if (!solid[c] || src[c * 4] !== 0) continue
        const n = src[(c - 1) * 4] || src[(c + 1) * 4] || src[(c - w) * 4] || src[(c + w) * 4]
        if (n) data[c * 4] = data[c * 4 + 1] = n
      }
    }
  }
}

/** Mappa in pianta degli ambienti: indice A, indice B e peso di B (le soglie sfumano tra le due stanze). */
function buildRoomMap(ctx, indexOf) {
  const { THREE, grid, plan } = ctx
  const x0 = grid.xs[0]
  const z0 = grid.zs[0]
  const w = Math.round((grid.xs[grid.xs.length - 1] - x0) / CELL)
  const h = Math.round((grid.zs[grid.zs.length - 1] - z0) / CELL)
  const data = new Uint8Array(w * h * 4)
  const solid = new Uint8Array(w * h)
  const landing = indexOf.get('pianerottolo') ?? 0
  const at = (x, z) => indexOf.get(grid.spaceAt(x, z)?.id) ?? 0
  for (let j = 0; j < h; j++) {
    const z = z0 + (j + 0.5) * CELL
    for (let i = 0; i < w; i++) {
      const x = x0 + (i + 0.5) * CELL
      const kind = grid.kindAt(x, z)
      let a = 0
      let b = 0
      let t = 0
      if (kind === K.ROOM || kind === K.OUTDOOR) a = b = at(x, z)
      else if (kind === K.STAIRS) a = b = landing
      else if (kind === K.OPENING) {
        const o = grid.openingAt(x, z)
        const [rx0, rz0, rx1, rz1] = o.rect
        const alongX = o.wallAlong === 'x' // muro lungo x: lo spessore corre lungo z
        a = alongX ? at((rx0 + rx1) / 2, rz0 - 0.03) : at(rx0 - 0.03, (rz0 + rz1) / 2)
        b = alongX ? at((rx0 + rx1) / 2, rz1 + 0.03) : at(rx1 + 0.03, (rz0 + rz1) / 2)
        t = alongX ? (z - rz0) / (rz1 - rz0) : (x - rx0) / (rx1 - rx0)
        if (a === 0) a = b
        if (b === 0) b = a
      }
      const p = (j * w + i) * 4
      if (kind === K.WALL || kind === K.SOLID || kind === K.BUILTIN) solid[j * w + i] = 1
      data[p] = a
      data[p + 1] = b
      data[p + 2] = Math.round(Math.min(Math.max(t, 0), 1) * 255)
      data[p + 3] = 255
    }
  }
  dilate(data, solid, w, h)
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType)
  tex.minFilter = tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return { tex, rect: [x0, z0, 1 / (w * CELL), 1 / (h * CELL)], height: plan.meta.ceilingHeight + 0.06 }
}

/**
 * @param {object} ctx contesto condiviso
 * @param {() => string} level livello di qualità effettivo
 * @returns {object} sonde: update, markDirty, converge, luminance, currentIndex, info
 */
export function createProbes(ctx, level) {
  const { THREE, renderer, scene, plan, grid, camera } = ctx
  const spaces = [...plan.rooms, ...plan.outdoor]
  const indexOf = new Map(spaces.map((s, i) => [s.id, i + 1]))
  const rows = spaces.length + 1
  const map = buildRoomMap(ctx, indexOf)

  const shTarget = new THREE.WebGLRenderTarget(9, rows, {
    type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, generateMipmaps: false,
  })
  shTarget.scissorTest = true
  const lumTarget = new THREE.WebGLRenderTarget(1, rows, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false })
  const lumBytes = new Uint8Array(rows * 4)
  const lum = new Float32Array(rows).fill(0.05)
  const uniforms = {
    casaRoomMap: { value: map.tex },
    casaSH: { value: shTarget.texture },
    casaRoomEnv: { value: null },
    casaRect: { value: new THREE.Vector4(...map.rect) },
    casaParams: { value: new THREE.Vector4(1, 0.05, 0, map.height) },
  }
  installProbeShader(THREE, uniforms)

  const lumMat = new THREE.ShaderMaterial({
    defines: { LOG_MIN: LUM_LOG_MIN, LOG_RANGE: LUM_LOG_RANGE },
    uniforms: { tSH: { value: shTarget.texture } }, vertexShader: QUAD_VERTEX, fragmentShader: LUM_FRAGMENT, depthTest: false, depthWrite: false,
  })
  const quad = new FullScreenQuad(lumMat)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const need = new Int8Array(rows)
  const pos = new THREE.Vector3()
  let cube = null
  let cubeCam = null
  let shMat = null
  let cubeSize = 0
  let cursor = 1
  let frame = 0
  let reading = false
  let envTarget = null
  let envRoom = 0
  let envStale = true
  let envMs = -Infinity
  let captures = 0

  /** Bersaglio a cubo e materiale di proiezione per la dimensione del livello corrente. */
  function ensureCube() {
    const size = CUBE_SIZE[level()] ?? CUBE_SIZE.high
    if (size === cubeSize) return
    cube?.dispose()
    shMat?.dispose()
    cubeSize = size
    cube = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false, minFilter: THREE.LinearFilter })
    cubeCam = new THREE.CubeCamera(NEAR, FAR, cube)
    shMat = new THREE.ShaderMaterial({
      precision: 'highp', defines: { CUBEMAP_SIZE: size, RADIANCE_MAX: '4.0' },
      uniforms: { envMap: { value: cube.texture } }, vertexShader: QUAD_VERTEX, fragmentShader: SH_FRAGMENT, depthTest: false, depthWrite: false,
    })
  }

  /** Cattura l'ambiente `i` e ne riscrive la riga di armoniche. */
  function capture(i) {
    const s = spaces[i - 1]
    const [x, z] = s.spawn ?? s.label
    cubeCam.position.set(x, PROBE_Y, z)
    const autoClear = renderer.autoClear
    renderer.autoClear = true
    cubeCam.update(renderer, scene)
    renderer.autoClear = false
    shTarget.viewport.set(0, i, 9, 1)
    shTarget.scissor.set(0, i, 9, 1)
    renderer.setRenderTarget(shTarget)
    quad.material = shMat
    quad.render(renderer)
    renderer.autoClear = autoClear
    renderer.setRenderTarget(null)
    need[i] = Math.max(0, need[i] - 1)
    if (i === envRoom) envStale = true
    captures++
  }

  /** Rilegge le luminanze medie (una per ambiente), senza fermare la GPU. */
  function readLuminance() {
    renderer.setRenderTarget(lumTarget)
    quad.material = lumMat
    quad.render(renderer)
    renderer.setRenderTarget(null)
    if (reading) return
    reading = true
    renderer.readRenderTargetPixelsAsync(lumTarget, 0, 0, 1, rows, lumBytes).then(() => {
      for (let r = 1; r < rows; r++) {
        const e = (lumBytes[r * 4] + lumBytes[r * 4 + 1] / 255) / 255
        lum[r] = 2 ** (e * LUM_LOG_RANGE + LUM_LOG_MIN)
      }
    }).catch((e) => ctx.log.warn('probes: lettura delle luminanze fallita:', e?.message)).finally(() => { reading = false })
  }

  /** Indice dell'ambiente in cui si trova la camera (0 nella vista dall'alto o fuori casa). */
  function currentIndex() {
    if (ctx.state.view !== 'fps') return 0
    return indexOf.get(ctx.state.room) ?? indexOf.get(grid.spaceAt(camera.position.x, camera.position.z)?.id) ?? 0
  }

  /** Mappa dei riflessi della stanza `i`, catturata dal suo centro. */
  function regenerateEnv(i, now) {
    const s = spaces[i - 1]
    const [x, z] = s.spawn ?? s.label
    const next = pmrem.fromScene(scene, 0, NEAR, FAR, { size: ENV_SIZE, position: pos.set(x, PROBE_Y, z) })
    envTarget?.dispose()
    envTarget = next
    uniforms.casaRoomEnv.value = next.texture
    uniforms.casaParams.value.y = Math.max(lum[i], 1e-4)
    envRoom = i
    envStale = false
    envMs = now
  }

  return {
    uniforms,
    currentIndex,
    /** Tutti gli ambienti vanno ricatturati per `passes` rimbalzi. */
    markDirty(passes = PASSES) { for (let i = 1; i < rows; i++) need[i] = Math.max(need[i], passes) },
    /** Cattura subito tutti gli ambienti (dopo un salto d'ora, di stile o di vista) e lascia il resto ai fotogrammi. */
    converge() {
      ensureCube()
      const n = SYNC_PASSES[level()] ?? 1
      this.markDirty(PASSES)
      for (let p = 0; p < n; p++) for (let i = 1; i < rows; i++) capture(i)
      readLuminance()
      envStale = true
      envMs = -Infinity
    },
    /** Lavoro del fotogramma: qualche cattura tra gli ambienti da aggiornare, poi la mappa dei riflessi. */
    update() {
      ensureCube()
      frame++
      const cur = currentIndex()
      let budget = PER_FRAME[level()] ?? 1
      if (level() === 'low' && frame % 3 !== 0) budget = 0
      let done = 0
      if (budget > 0 && cur > 0 && need[cur] > 0 && frame % 2 === 0) { capture(cur); budget--; done++ }
      for (let k = 1; k < rows && budget > 0; k++) {
        cursor = cursor % (rows - 1) + 1
        if (need[cursor] > 0) { capture(cursor); budget--; done++ }
      }
      if (done) readLuminance()
      const now = performance.now()
      const pending = need.some((v) => v > 0)
      if (cur === 0) uniforms.casaParams.value.z = 0 // dall'alto, senza soffitti, i pavimenti riflettono il cielo
      else if (cur !== envRoom || (envStale && !pending) || (envStale && now - envMs > (ENV_MIN_MS[level()] ?? 500))) {
        regenerateEnv(cur, now)
        uniforms.casaParams.value.z = 1
      } else uniforms.casaParams.value.z = 1
    },
    /** Luminanza media vista dalla sonda dell'ambiente `i`; con 0 la media di tutti gli ambienti. */
    luminance(i) {
      if (i > 0) return lum[i]
      let sum = 0
      for (let r = 1; r < rows; r++) sum += lum[r]
      return sum / (rows - 1)
    },
    info: () => ({ rooms: rows - 1, cubeSize, captures, pending: need.reduce((a, v) => a + (v > 0 ? 1 : 0), 0), envRoom: spaces[envRoom - 1]?.id ?? null, lum: Array.from(lum, (v) => Math.round(v * 1000) / 1000) }),
  }
}
