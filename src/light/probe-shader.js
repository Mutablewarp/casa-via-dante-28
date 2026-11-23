/**
 * Modifica gli shader standard di three (una volta, prima di qualunque disegno) perché la luce indiretta dipenda
 * dalla stanza in cui cade il frammento:
 *  - una mappa in pianta (5 cm per texel) dice a quale ambiente appartiene il punto;
 *  - l'irradianza diffusa viene dalle armoniche sferiche di quell'ambiente (probes.js), non dall'emisfero né dal cielo;
 *  - i riflessi vengono dalla sonda della stanza corrente, scalati sulla luminosità dell'ambiente del frammento;
 *  - fuori dagli ambienti (città, facciata, tetti) resta tutto com'era: emisfero e cielo;
 *  - fuori dalla mappa d'ombra della casa il sole è attenuato dall'ombra lontana (far-shadow.js).
 * In più limita l'albedo diffusa a 0,84: nessuna pittura riflette di più, e i rimbalzi restano stabili.
 */
import { ShaderChunk } from 'three'

const ALBEDO_MAX = '0.84'
// Una sola sonda al centro della stanza vede poco di ciò che illumina soffitto e pavimento: l'irradianza si
// avvicina in parte alla media dell'ambiente. E si desatura in parte, come fa il bilanciamento del bianco.
const DIRECTIONAL = '0.6'
const SATURATION = '0.55'

const PARS = /* glsl */`
#ifdef STANDARD
	#define CASA_DIRECTIONAL ${DIRECTIONAL}
	#define CASA_SATURATION ${SATURATION}
	uniform sampler2D casaRoomMap;   // r, g: ambienti A e B; b: peso di B (soglie delle aperture)
	uniform sampler2D casaSH;        // riga = ambiente, 9 colonne = coefficienti L2
	uniform samplerCube casaRoomEnv; // PMREM della stanza corrente
	uniform vec4 casaRect;           // x0, z0, 1 / larghezza, 1 / profondità della mappa (m)
	uniform vec4 casaParams;         // x: sonde attive; y: luminanza della stanza della sonda dei riflessi; z: guadagno riflessi; w: quota massima

	uniform sampler2DShadow casaFarMap; // profondità del quartiere vista dal sole (far-shadow.js)
	uniform mat4 casaFarMatrix;         // dal mondo a uv e profondità di quella mappa
	uniform vec4 casaFarParams;         // x: attiva; y: texel in uv; z: scostamento lungo la normale (m); w: tolleranza

	float casaInterior = 0.0;
	vec3 casaAmbient = vec3( 0.0 );
	float casaLum = 0.0;
	float casaFar = 1.0;

	// Ombra del sole lontano dalla casa: quattro confronti filtrati dalla GPU attorno al punto.
	void casaFarLookup( const in vec3 wp, const in vec3 wn ) {
		if ( casaFarParams.x < 0.5 ) return;
		vec3 c = ( casaFarMatrix * vec4( wp + wn * casaFarParams.z, 1.0 ) ).xyz;
		if ( any( lessThan( c, vec3( 0.0 ) ) ) || any( greaterThan( c, vec3( 1.0 ) ) ) ) return;
		float z = c.z - casaFarParams.w;
		vec2 t = vec2( casaFarParams.y ) * 0.75;
		casaFar = 0.25 * ( texture( casaFarMap, vec3( c.xy + vec2( - t.x, - t.y ), z ) ) + texture( casaFarMap, vec3( c.xy + vec2( t.x, - t.y ), z ) )
			+ texture( casaFarMap, vec3( c.xy + vec2( - t.x, t.y ), z ) ) + texture( casaFarMap, vec3( c.xy + vec2( t.x, t.y ), z ) ) );
	}

	// Dentro la mappa d'ombra della casa decide quella; fuori, l'ombra lontana.
	float casaFarOutside( in vec4 shadowCoord ) {
		shadowCoord.xyz /= shadowCoord.w;
		bool near = all( greaterThanEqual( shadowCoord.xy, vec2( 0.0 ) ) ) && all( lessThanEqual( shadowCoord.xy, vec2( 1.0 ) ) ) && shadowCoord.z <= 1.0;
		return near ? 1.0 : casaFar;
	}

	vec3 casaSHAt( const in int row, const in vec3 n, out float lum ) {
		vec3 c0 = texelFetch( casaSH, ivec2( 0, row ), 0 ).rgb;
		vec3 r = c0 * 0.886227;
		r += texelFetch( casaSH, ivec2( 1, row ), 0 ).rgb * ( 1.023328 * n.y );
		r += texelFetch( casaSH, ivec2( 2, row ), 0 ).rgb * ( 1.023328 * n.z );
		r += texelFetch( casaSH, ivec2( 3, row ), 0 ).rgb * ( 1.023328 * n.x );
		r += texelFetch( casaSH, ivec2( 4, row ), 0 ).rgb * ( 0.858086 * n.x * n.y );
		r += texelFetch( casaSH, ivec2( 5, row ), 0 ).rgb * ( 0.858086 * n.y * n.z );
		r += texelFetch( casaSH, ivec2( 6, row ), 0 ).rgb * ( 0.743125 * n.z * n.z - 0.247708 );
		r += texelFetch( casaSH, ivec2( 7, row ), 0 ).rgb * ( 0.858086 * n.x * n.z );
		r += texelFetch( casaSH, ivec2( 8, row ), 0 ).rgb * ( 0.429043 * ( n.x * n.x - n.y * n.y ) );
		lum = dot( c0, vec3( 0.2126, 0.7152, 0.0722 ) ) * 0.282095;
		r = max( mix( c0 * 0.886227, r, CASA_DIRECTIONAL ), vec3( 0.0 ) );
		return mix( vec3( dot( r, vec3( 0.2126, 0.7152, 0.0722 ) ) ), r, CASA_SATURATION );
	}

	void casaLookup( const in vec3 viewPos, const in vec3 viewNormal ) {
		vec3 wp = ( ( vec4( viewPos, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 wn = transformNormalByInverseViewMatrix( viewNormal, viewMatrix );
		casaFarLookup( wp, wn );
		if ( casaParams.x < 0.5 ) return;
		if ( wp.y < - 0.06 || wp.y > casaParams.w ) return;
		// mezzo texel lungo la normale: le facce dei muri cadono nella cella dell'ambiente, non in quella del muro
		vec2 uv = ( wp.xz + wn.xz * 0.025 - casaRect.xy ) * casaRect.zw;
		if ( any( lessThanEqual( uv, vec2( 0.0 ) ) ) || any( greaterThanEqual( uv, vec2( 1.0 ) ) ) ) return;
		vec4 t = textureLod( casaRoomMap, uv, 0.0 );
		int a = int( t.r * 255.0 + 0.5 );
		if ( a == 0 ) return;
		int b = int( t.g * 255.0 + 0.5 );
		float la;
		vec3 ea = casaSHAt( a, wn, la );
		if ( b != a && t.b > 0.004 ) {
			float lb;
			vec3 eb = casaSHAt( b, wn, lb );
			ea = mix( ea, eb, t.b );
			la = mix( la, lb, t.b );
		}
		casaInterior = 1.0;
		casaAmbient = ea;
		casaLum = la;
	}

	vec3 casaRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		vec3 outRadiance = vec3( 0.0 );
		#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
			float roomWeight = casaInterior * step( 0.0001, casaParams.z );
			if ( roomWeight < 0.999 ) outRadiance = getIBLRadiance( viewDir, normal, roughness );
			if ( roomWeight > 0.001 ) {
				vec3 r = reflect( - viewDir, normal );
				r = normalize( mix( r, normal, pow4( roughness ) ) );
				r = transformDirectionByInverseViewMatrix( r, viewMatrix );
				vec3 room = textureLod( casaRoomEnv, envMapRotation * r, roughnessToMip( roughness ) ).rgb;
				room *= casaParams.z * clamp( casaLum / max( casaParams.y, 0.0001 ), 0.0, 4.0 );
				outRadiance = mix( outRadiance, room, roomWeight );
			}
		#endif
		return outRadiance;
	}
#endif
`

/** Sostituisce `from` con `to` nel pezzo di shader `name`; lancia un errore se three è cambiato e l'aggancio non c'è più. */
function patch(name, from, to) {
  const src = ShaderChunk[name]
  if (!src || !src.includes(from)) throw new Error(`probe-shader: aggancio non trovato in ${name}`)
  ShaderChunk[name] = src.replace(from, to)
}

let installed = false

/**
 * Installa le modifiche e aggancia le uniform condivise a tutti i materiali standard e fisici.
 * @param {object} THREE namespace three
 * @param {Record<string, {value: unknown}>} uniforms uniform condivise (gli stessi oggetti per tutti i materiali)
 */
export function installProbeShader(THREE, uniforms) {
  if (installed) return
  installed = true
  ShaderChunk.envmap_physical_pars_fragment += PARS
  patch('lights_physical_fragment',
    'material.diffuseColor = diffuseColor.rgb;\nmaterial.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );',
    `vec3 casaAlbedo = diffuseColor.rgb * min( 1.0, ${ALBEDO_MAX} / max( max( diffuseColor.r, diffuseColor.g ), max( diffuseColor.b, ${ALBEDO_MAX} ) ) );
material.diffuseColor = casaAlbedo;
material.diffuseContribution = casaAlbedo * ( 1.0 - metalnessFactor );`)
  patch('lights_fragment_begin',
    'vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );',
    `vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
#ifdef STANDARD
	casaLookup( geometryPosition, geometryNormal );
#endif`)
  patch('lights_fragment_begin',
    '\t#if NUM_LIGHT_PROBE_GRIDS > 0',
    `\t#ifdef STANDARD
		irradiance = irradiance * ( 1.0 - casaInterior ) + casaAmbient;
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0`)
  patch('lights_fragment_begin',
    'vDirectionalShadowCoord[ i ] ) : 1.0;\n\t\t#endif',
    `vDirectionalShadowCoord[ i ] ) : 1.0;
		#ifdef STANDARD
		directLight.color *= casaFarOutside( vDirectionalShadowCoord[ i ] );
		#endif
		#endif`)
  patch('lights_fragment_maps',
    'iblIrradiance += getIBLIrradiance( geometryNormal );',
    `#ifdef STANDARD
				iblIrradiance += getIBLIrradiance( geometryNormal ) * ( 1.0 - casaInterior );
			#else
				iblIrradiance += getIBLIrradiance( geometryNormal );
			#endif`)
  patch('lights_fragment_maps',
    'vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );',
    `#ifdef STANDARD
			vec3 iblRadiance = casaRadiance( geometryViewDir, geometryNormal, material.roughness );
		#else
			vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif`)
  const proto = THREE.MeshStandardMaterial.prototype
  proto.onBeforeCompile = function onBeforeCompile(shader) {
    Object.assign(shader.uniforms, uniforms)
  }
  proto.customProgramCacheKey = () => 'casa-probes-2'
}
