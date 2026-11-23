/** Cupola del cielo: gradiente, nuvole, alone e disco del sole, luna e stelle. Lo stesso materiale serve per la mappa dei riflessi. */

const DOME_RADIUS = 1200 // m: oltre il fondale dei monti (900 m), dentro camera.far (1500 m)
const STAR_RADIUS = 1100
const STAR_COUNT = 700
const SUN_DISK_RADIUS = 0.03 // rad
const MOON_DISK_RADIUS = 0.018 // rad
const SUN_DISK_GAIN = 9 // luminosità del disco prima del tone mapping
// Nuvole: rumore frattale su uno strato piano visto in prospettiva
const CLOUD_COVER = 0.56 // soglia del rumore: più bassa = cielo più coperto
const CLOUD_SCALE = 1.5
const CLOUD_DRIFT = 0.22 // spostamento per ora del giorno: le nuvole scorrono quando si muove il cursore dell'ora
const DEG = Math.PI / 180

const VERT = `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const FRAG = `
uniform vec3 uTop, uHorizon, uSunDir, uSunColor, uMoonDir;
uniform float uSunVis, uMoonVis, uDisk, uSunR, uMoonR, uDiskGain;
uniform vec3 uCloud; // soglia di copertura, scala, spostamento
varying vec3 vDir;
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.7; a *= 0.5; }
  return s;
}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.8, h), 0.75));
  col = mix(col, uHorizon * 0.55, smoothstep(0.0, -0.35, h));
  float sd = max(dot(d, uSunDir), 0.0);
  float glow = pow(sd, 5.0) * 0.28 + pow(sd, 40.0) * 0.8;
  col += uSunColor * glow * uSunVis;
  if (h > 0.0) {
    // più fitte e schiacciate verso l'orizzonte, dove sfumano nella foschia; di notte quasi spariscono
    vec2 cp = d.xz / (h + 0.18) * uCloud.y + vec2(uCloud.z, uCloud.z * 0.37);
    float n = fbm(cp);
    float cover = smoothstep(uCloud.x, uCloud.x + 0.22, n) * smoothstep(0.015, 0.16, h) * mix(0.3, 1.0, uSunVis);
    // il lato verso il sole è più chiaro: differenza con il rumore un passo più in là
    float lit = clamp(0.55 + (n - fbm(cp + normalize(uSunDir.xz + 1e-4) * 0.25)) * 2.2, 0.0, 1.0);
    vec3 shade = mix(uTop, uHorizon, 0.65) * 0.8;
    vec3 bright = uHorizon * 0.7 + uSunColor * (1.5 * uSunVis);
    col = mix(col, mix(shade, bright, lit) + uSunColor * pow(sd, 12.0) * 0.6 * uSunVis, cover * 0.92);
  }
  float above = smoothstep(-0.01, 0.02, h);
  float aSun = acos(clamp(dot(d, uSunDir), -1.0, 1.0));
  float sunDisk = (1.0 - smoothstep(uSunR * 0.75, uSunR, aSun)) * uSunVis * above * uDisk;
  col = mix(col, uSunColor * uDiskGain, sunDisk);
  float aMoon = acos(clamp(dot(d, uMoonDir), -1.0, 1.0));
  float moonDisk = (1.0 - smoothstep(uMoonR * 0.8, uMoonR, aMoon)) * uMoonVis * above * uDisk;
  col = mix(col, vec3(0.78, 0.84, 1.0) * 2.2, moonDisk);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

const STAR_VERT = `
attribute float aSize;
uniform float uPixel;
varying float vUp;
void main() {
  vUp = normalize(position).y;
  gl_PointSize = aSize * uPixel;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const STAR_FRAG = `
uniform float uOpacity;
varying float vUp;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = (1.0 - smoothstep(0.2, 0.5, length(c))) * uOpacity * smoothstep(0.03, 0.3, vUp);
  gl_FragColor = vec4(0.92, 0.95, 1.0, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

/**
 * Materiale del cielo (vista dall'interno).
 * @param {object} THREE namespace three
 * @param {boolean} disk vero per cupola visibile (disco di sole e luna), falso per la mappa dei riflessi
 */
export function createSkyMaterial(THREE, disk) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunVis: { value: 1 },
      uMoonVis: { value: 0 },
      uDisk: { value: disk ? 1 : 0 },
      uSunR: { value: SUN_DISK_RADIUS },
      uMoonR: { value: MOON_DISK_RADIUS },
      uDiskGain: { value: SUN_DISK_GAIN },
      uCloud: { value: new THREE.Vector3(CLOUD_COVER, CLOUD_SCALE, 0) },
    },
  })
}

/** Direzione VERSO il sole o la luna da azimut ed elevazione in gradi (lighting.conventions). */
function toward(out, az, el) {
  const a = az * DEG
  const e = el * DEG
  return out.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e))
}

/** Scrive nel materiale i colori e le direzioni del campione `st`. */
export function setSkyUniforms(mat, st) {
  const u = mat.uniforms
  u.uTop.value.copy(st.skyTop)
  u.uHorizon.value.copy(st.skyHorizon)
  u.uSunColor.value.copy(st.sun.color)
  toward(u.uSunDir.value, st.sun.az, st.sun.el)
  toward(u.uMoonDir.value, st.moon.az, st.moon.el)
  u.uSunVis.value = st.sunVis
  u.uMoonVis.value = st.moonVis
  u.uCloud.value.z = (st.hour ?? 12) * CLOUD_DRIFT
}

/** Punti delle stelle sulla calotta alta, con posizioni fisse (generatore deterministico). */
function createStars(THREE) {
  let seed = 20240717
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const pos = new Float32Array(STAR_COUNT * 3)
  const size = new Float32Array(STAR_COUNT)
  for (let i = 0; i < STAR_COUNT; i++) {
    const y = 0.03 + rnd() * 0.97
    const r = Math.sqrt(1 - y * y)
    const phi = rnd() * Math.PI * 2
    pos.set([Math.cos(phi) * r * STAR_RADIUS, y * STAR_RADIUS, Math.sin(phi) * r * STAR_RADIUS], i * 3)
    size[i] = 1.2 + rnd() * rnd() * 2.4
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  const mat = new THREE.ShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: { uOpacity: { value: 0 }, uPixel: { value: 1 } },
  })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  points.renderOrder = -999
  return points
}

/**
 * Crea la cupola e le stelle in `ctx.groups.sky`; la cupola segue la camera.
 * @param {object} ctx contesto condiviso
 * @returns {{ material: object, apply: (st: object) => void }}
 */
export function createSky(ctx) {
  const { THREE, renderer, camera } = ctx
  const material = createSkyMaterial(THREE, true)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 32, 20), material)
  dome.name = 'sky-dome'
  dome.frustumCulled = false
  dome.renderOrder = -1000
  const stars = createStars(THREE)
  stars.name = 'sky-stars'
  const group = new THREE.Group()
  group.name = 'cielo'
  group.add(dome, stars)
  ctx.groups.sky.add(group)

  ctx.registry.updaters.push(() => {
    group.position.copy(camera.position)
    stars.material.uniforms.uPixel.value = renderer.getPixelRatio()
  })

  return {
    material,
    /** @param {object} st campione di keys.js */
    apply(st) {
      setSkyUniforms(material, st)
      stars.material.uniforms.uOpacity.value = st.stars
      stars.visible = st.stars > 0.001
    },
  }
}
