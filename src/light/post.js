/**
 * Pipeline di rendering: la scena va in un bersaglio HDR con MSAA e profondità, poi occlusione ambientale
 * (GTAO, normali ricostruite dalla profondità: nessun secondo disegno della scena), bloom leggero e, in uscita,
 * mappatura tonale AgX con un po' di contrasto e di saturazione in più, conversione in sRGB e retinatura. Un solo percorso per tutti i livelli di qualità: cambiano solo le passate.
 */
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'

// Per livello: campioni MSAA, scala di risoluzione dell'occlusione (0 = spenta), campioni dell'occlusione, bloom
const LEVELS = {
  high: { samples: 4, ao: 1, aoSamples: 24, bloom: true },
  medium: { samples: 4, ao: 0.5, aoSamples: 16, bloom: true },
  low: { samples: 0, ao: 0, aoSamples: 0, bloom: false },
}
// Occlusione: raggio in metri (angoli tra muri, sotto i mobili), spessore e decadimento con la distanza
const AO = { radius: 0.5, distanceExponent: 1.5, thickness: 0.35, distanceFallOff: 1, scale: 1.1, screenSpaceRadius: false }
// Raggio piccolo e campioni fitti: un raggio largo sparpaglia in puntini le righe scure degli spigoli stretti
const AO_DENOISE = { lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 16 }
const AO_INTENSITY = 0.9
// Bloom: solo ciò che dopo l'esposizione supera il bianco (finestre in controluce, disco del sole, paralumi)
// Con un tetto: una finestra in controluce vale decine di volte il bianco e senza tetto il suo alone vela mezza stanza
const BLOOM = { strength: 0.09, radius: 0.5, threshold: 1.2, cap: 2.5 }
const BLOOM_MARKER = 'gl_FragColor = mix( outputColor, texel, alpha );'
// Esposimetro: il fotogramma HDR ridotto a 32 × 18 valori di log2 della luminanza, riletti senza fermare la GPU
const METER = { w: 32, h: 18, every: 3, logMin: -12, logRange: 18, clampLow: -9, clampHigh: 2.5, highQuantile: 0.9 }
// Resa: AgX da sola è piatta; un esponente sopra 1 dà contrasto, la saturazione compensa lo sbiadimento delle alte luci
const LOOK = { power: 1.16, saturation: 1.14 }

const OUTPUT_VERTEX = /* glsl */`
precision highp float;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }`

const OUTPUT_FRAGMENT = /* glsl */`
precision highp float;
uniform sampler2D tDiffuse;
uniform vec2 look; // esponente, saturazione
#include <tonemapping_pars_fragment>
#include <colorspace_pars_fragment>
varying vec2 vUv;
void main() {
	vec3 c = AgXToneMapping( texture2D( tDiffuse, vUv ).rgb );
	c = pow( c, vec3( look.x ) );
	c = max( mix( vec3( dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ) ), c, look.y ), 0.0 );
	gl_FragColor = sRGBTransferOETF( vec4( c, 1.0 ) );
	// retinatura di mezzo livello: toglie le bande dai gradienti lenti (cielo, soffitti)
	float n = fract( sin( dot( gl_FragCoord.xy, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
	gl_FragColor.rgb += ( n - 0.5 ) / 255.0;
}`

const METER_FRAGMENT = /* glsl */`
uniform sampler2D tScene;
uniform vec2 cell; // dimensione di una cella dell'esposimetro in coordinate uv
void main() {
	vec2 base = gl_FragCoord.xy * cell;
	float sum = 0.0;
	for ( int j = 0; j < 4; j ++ ) for ( int i = 0; i < 4; i ++ ) {
		vec2 uv = base + ( vec2( float( i ), float( j ) ) - 1.5 ) * cell * 0.25;
		float lum = dot( textureLod( tScene, uv, 0.0 ).rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
		sum += clamp( log2( max( lum, 1e-5 ) ), float( CLAMP_LOW ), float( CLAMP_HIGH ) );
	}
	float e = clamp( ( sum / 16.0 - float( LOG_MIN ) ) / float( LOG_RANGE ), 0.0, 1.0 ) * 255.0;
	gl_FragColor = vec4( floor( e ) / 255.0, fract( e ), 0.0, 1.0 );
}`

/**
 * @param {object} ctx contesto condiviso
 * @param {() => string} level funzione che restituisce il livello di qualità effettivo
 * @returns {{ render: () => void, refresh: () => void, info: () => object }}
 */
export function createPost(ctx, level) {
  const { THREE, renderer, scene, camera } = ctx
  const size = new THREE.Vector2()
  let sceneRT = null
  let compRT = null
  let gtao = null
  let bloom = null
  let current = null
  let cfg = LEVELS.high
  const outputMat = new THREE.RawShaderMaterial({
    uniforms: { tDiffuse: { value: null }, toneMappingExposure: { value: 1 }, look: { value: new THREE.Vector2(LOOK.power, LOOK.saturation) } },
    vertexShader: OUTPUT_VERTEX, fragmentShader: OUTPUT_FRAGMENT, depthTest: false, depthWrite: false,
  })
  const outputQuad = new FullScreenQuad(outputMat)
  const meterRT = new THREE.WebGLRenderTarget(METER.w, METER.h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false })
  const meterMat = new THREE.ShaderMaterial({
    defines: { LOG_MIN: METER.logMin, LOG_RANGE: METER.logRange, CLAMP_LOW: METER.clampLow.toFixed(1), CLAMP_HIGH: METER.clampHigh.toFixed(1) },
    uniforms: { tScene: { value: null }, cell: { value: new THREE.Vector2(1 / METER.w, 1 / METER.h) } },
    vertexShader: 'void main() { gl_Position = vec4( position.xy, 0.0, 1.0 ); }', fragmentShader: METER_FRAGMENT, depthTest: false, depthWrite: false,
  })
  const meterQuad = new FullScreenQuad(meterMat)
  const meterBytes = new Uint8Array(METER.w * METER.h * 4)
  // peso al centro: ciò che si guarda conta più dei bordi
  const meterWeights = Float32Array.from({ length: METER.w * METER.h }, (_, k) => {
    const x = ((k % METER.w) + 0.5) / METER.w - 0.5
    const y = (Math.floor(k / METER.w) + 0.5) / METER.h - 0.5
    return Math.exp(-(x * x + y * y) * 3)
  })
  const meterLogs = new Float32Array(METER.w * METER.h)
  let metered = 0.12
  let meteredHigh = 0.12
  let meterReads = 0
  let reading = false
  let frame = 0

  /** Misura la luminanza media (logaritmica) del fotogramma appena disegnato. */
  function meter() {
    if (reading || frame++ % METER.every !== 0) return
    meterMat.uniforms.tScene.value = sceneRT.texture
    renderer.setRenderTarget(meterRT)
    meterQuad.render(renderer)
    reading = true
    renderer.readRenderTargetPixelsAsync(meterRT, 0, 0, METER.w, METER.h, meterBytes).then(() => {
      let sum = 0
      let wsum = 0
      for (let k = 0; k < meterWeights.length; k++) {
        const e = (meterBytes[k * 4] + meterBytes[k * 4 + 1] / 255) / 255
        meterLogs[k] = e * METER.logRange + METER.logMin
        sum += meterLogs[k] * meterWeights[k]
        wsum += meterWeights[k]
      }
      metered = 2 ** (sum / wsum)
      meterLogs.sort()
      meteredHigh = 2 ** meterLogs[Math.floor(meterLogs.length * METER.highQuantile)]
      meterReads++
    }).catch((e) => ctx.log.warn('post: esposimetro non leggibile:', e?.message)).finally(() => { reading = false })
  }

  /** Libera i bersagli e le passate del livello precedente. */
  function dispose() {
    sceneRT?.depthTexture?.dispose()
    sceneRT?.dispose()
    compRT?.dispose()
    gtao?.dispose()
    bloom?.dispose()
    sceneRT = compRT = gtao = bloom = null
  }

  /** Crea bersagli e passate per il livello e la dimensione correnti. */
  function build() {
    dispose()
    current = level()
    cfg = LEVELS[current] ?? LEVELS.high
    renderer.getDrawingBufferSize(size)
    const w = Math.max(size.x, 1)
    const h = Math.max(size.y, 1)
    const depthTexture = new THREE.DepthTexture(w, h)
    sceneRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: cfg.samples, depthTexture })
    sceneRT.texture.name = 'post.scene'
    if (cfg.ao > 0) {
      compRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false })
      compRT.texture.name = 'post.composite'
      const aw = Math.max(Math.round(w * cfg.ao), 1)
      const ah = Math.max(Math.round(h * cfg.ao), 1)
      gtao = new GTAOPass(scene, camera, aw, ah, { depthTexture }, { ...AO, samples: cfg.aoSamples }, AO_DENOISE)
      gtao.blendIntensity = AO_INTENSITY
    }
    if (cfg.bloom) {
      bloom = new UnrealBloomPass(new THREE.Vector2(w, h), BLOOM.strength, BLOOM.radius, BLOOM.threshold)
      const high = bloom.materialHighPassFilter
      if (!high.fragmentShader.includes(BLOOM_MARKER)) throw new Error('post: il passa-alto del bloom di three è cambiato')
      high.uniforms.cap = { value: BLOOM.cap }
      high.fragmentShader = high.fragmentShader
        .replace('uniform float smoothWidth;', 'uniform float smoothWidth;\nuniform float cap;')
        .replace(BLOOM_MARKER, `texel.rgb *= min( 1.0, cap / max( v, 1e-4 ) );\n${BLOOM_MARKER}`)
    }
  }

  /** Ricostruisce se sono cambiati il livello di qualità o la dimensione del disegno. */
  function sync() {
    renderer.getDrawingBufferSize(size)
    if (!sceneRT || current !== level() || sceneRT.width !== size.x || sceneRT.height !== size.y) build()
  }

  /** Disegna un fotogramma completo sullo schermo. */
  function render() {
    sync()
    renderer.setRenderTarget(sceneRT)
    renderer.render(scene, camera)
    meter()
    let src = sceneRT
    if (gtao) {
      gtao.render(renderer, compRT, sceneRT)
      src = compRT
    }
    if (bloom) {
      // la soglia è in luminanza di scena: si riporta a «sopra il bianco dopo l'esposizione»
      const exposure = Math.max(renderer.toneMappingExposure, 0.05)
      bloom.threshold = BLOOM.threshold / exposure
      bloom.highPassUniforms.cap.value = BLOOM.cap / exposure
      bloom.render(renderer, null, src)
    }
    outputMat.uniforms.tDiffuse.value = src.texture
    outputMat.uniforms.toneMappingExposure.value = renderer.toneMappingExposure
    renderer.setRenderTarget(null)
    outputQuad.render(renderer)
  }

  build()
  return {
    render,
    refresh: build,
    /** Luminanza media del fotogramma (logaritmica, pesata al centro), luminanza delle zone chiare (90° percentile) e letture fatte. */
    metered: () => ({ luminance: metered, high: meteredHigh, reads: meterReads }),
    info: () => ({ metered: Math.round(metered * 1000) / 1000, high: Math.round(meteredHigh * 1000) / 1000, level: current, samples: cfg.samples, ao: cfg.ao, bloom: cfg.bloom, width: sceneRT.width, height: sceneRT.height }),
  }
}
