/**
 * Rendu manga : aplats de couleur, ombres hachurées à l'encre, traits des muscles, contours d'épaisseur constante.
 * La lumière est fixée dans le repère de la caméra : chaque image se lit comme une case dessinée,
 * quel que soit l'angle de vue. Les épaisseurs suivent la taille du canevas (même rendu en vignette et en affiche).
 */
import * as THREE from 'three';

export const INK = '#15100e';

/** Uniformes partagés par tous les matériaux (le lecteur met à jour la taille avant chaque rendu) */
export const mangaUniforms = {
  uLightDir: { value: new THREE.Vector3(-0.5, 0.62, 0.6).normalize() },
  uRes: { value: new THREE.Vector2(600, 600) },
  uInk: { value: new THREE.Color(INK) },
};

export function setMangaViewport(renderer: THREE.WebGLRenderer) {
  renderer.getDrawingBufferSize(mangaUniforms.uRes.value);
}

export interface MangaOptions {
  color?: THREE.ColorRepresentation;
  /** couleurs à plat (texture), multipliées par color */
  albedo?: THREE.Texture | null;
  /** relief (muscles) : sculpte les ombres */
  normalMap?: THREE.Texture | null;
  normalScale?: THREE.Vector2;
  /** traits des muscles (niveaux de gris, même dépliage UV que la carte de normales) */
  ink?: THREE.Texture | null;
  /** densité des hachures dans l'ombre (0 = aplat) */
  hatch?: number;
  /** trait sur la limite ombre / lumière */
  terminator?: number;
}

const PARS = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uLightDir;
uniform vec2 uRes;
uniform vec3 uInk;
uniform float uHatch;
uniform float uTerm;
#ifdef MANGA_ALBEDO
uniform sampler2D uAlbedo;
#endif
#ifdef MANGA_INK
uniform sampler2D uInkMap;
#endif
// bandes parallèles anticrénelées : 1 sur le trait, 0 entre deux traits (largeurs en pixels)
float mangaLines( float coord, float spacing, float width ) {
	float d = abs( fract( coord / spacing + 0.5 ) - 0.5 ) * spacing;
	return 1.0 - smoothstep( width * 0.5 - 0.55, width * 0.5 + 0.55, d );
}
void main() {`;

const SHADE = /* glsl */ `
	vec3 n = normalize( normal );
	float ndl = dot( n, normalize( uLightDir ) );
	vec3 base = uBase;
	#ifdef MANGA_ALBEDO
		base *= texture2D( uAlbedo, vNormalMapUv ).rgb;
	#endif
	float px = uRes.y / 600.0;
	float aa = fwidth( ndl ) * 0.75 + 0.002;
	// deux paliers nets : lumière / ombre, plus une ombre profonde
	float lit = smoothstep( 0.1 - aa, 0.1 + aa, ndl );
	float deep = 1.0 - smoothstep( -0.34 - aa, -0.34 + aa, ndl );
	float lum = dot( base, vec3( 0.2126, 0.7152, 0.0722 ) );
	float dark = 1.0 - smoothstep( 0.015, 0.08, lum );
	vec3 col = mix( base * vec3( 0.74, 0.70, 0.76 ), base, lit );
	// hachures diagonales à l'encre dans l'ombre, contre-hachures dans l'ombre profonde
	vec2 fc = gl_FragCoord.xy;
	float sp = max( 3.2, 4.6 * px );
	float h1 = mangaLines( ( fc.x - fc.y ) * 0.70711, sp, max( 0.85, mix( 0.75, 1.45, deep ) * px ) );
	float h2 = mangaLines( ( fc.x + fc.y ) * 0.70711, sp, max( 0.85, 1.0 * px ) );
	float hatch = ( ( 1.0 - lit ) * h1 + deep * h2 ) * uHatch * ( 1.0 - dark );
	col = mix( col, uInk, clamp( hatch, 0.0, 1.0 ) * 0.88 );
	// matières noires : reflets en traits blancs côté lumière
	float hi = smoothstep( 0.66 - aa, 0.66 + aa, ndl );
	col = mix( col, vec3( 0.32 ), hi * mangaLines( ( fc.x - fc.y ) * 0.70711, sp * 1.15, max( 0.7, 0.7 * px ) ) * dark );
	// trait de séparation ombre / lumière (suit le relief des muscles)
	float term = 1.0 - smoothstep( 0.0, aa * 1.5, abs( ndl - 0.1 ) );
	col = mix( col, uInk, term * uTerm * ( 1.0 - dark ) );
	#ifdef MANGA_INK
		// traits des muscles : plus fins dans la lumière, plus gras dans l'ombre
		float k = texture2D( uInkMap, vNormalMapUv ).r;
		float thr = mix( 0.58, 0.34, 1.0 - lit );
		float ka = fwidth( k ) * 0.9 + 0.025;
		col = mix( col, uInk, smoothstep( thr - ka, thr + ka, k ) * 0.92 * ( 1.0 - dark ) );
	#endif
	gl_FragColor = vec4( col, 1.0 );
	#include <colorspace_fragment>
`;

/** Matériau manga (fonctionne aussi sur les maillages riggés) */
export function mangaMaterial(o: MangaOptions = {}) {
  const m = new THREE.MeshNormalMaterial();
  if (o.normalMap) {
    m.normalMap = o.normalMap;
    if (o.normalScale) m.normalScale.copy(o.normalScale);
  }
  const defines: Record<string, string> = {};
  if (o.normalMap && o.albedo) defines.MANGA_ALBEDO = '';
  if (o.normalMap && o.ink) defines.MANGA_INK = '';
  m.defines = defines;
  const uniforms = {
    uBase: { value: new THREE.Color(o.color ?? '#ffffff') },
    uHatch: { value: o.hatch ?? 1 },
    uTerm: { value: o.terminator ?? 0.45 },
    uAlbedo: { value: o.albedo ?? null },
    uInkMap: { value: o.ink ?? null },
  };
  m.userData.manga = uniforms;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, { uLightDir: mangaUniforms.uLightDir, uRes: mangaUniforms.uRes, uInk: mangaUniforms.uInk });
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', PARS)
      .replace('gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );', SHADE);
  };
  m.customProgramCacheKey = () => 'manga-v1';
  return m;
}

/** Couleur de base d'un matériau manga */
export function mangaColor(m: THREE.Material): THREE.Color | null {
  return (m.userData.manga?.uBase.value as THREE.Color | undefined) ?? null;
}

/* ───────── contours ───────── */

const OUTLINE_VERT = /* glsl */ `#include <project_vertex>
	#if defined( USE_SKINNING ) || defined( USE_ENVMAP )
		vec3 oN = objectNormal;
	#elif defined( OUTLINE_NORMAL )
		vec3 oN = outlineNormal;
	#else
		vec3 oN = normal;
	#endif
	vec4 cN = projectionMatrix * vec4( normalMatrix * oN, 0.0 );
	float cl = length( cN.xy );
	if ( cl > 1e-6 ) gl_Position.xy += cN.xy / cl * max( 1.1, uOutline * uRes.y / 600.0 ) * 2.0 / uRes * gl_Position.w;
`;

function outlineMaterial(width: number, smoothNormals: boolean) {
  const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  if (smoothNormals) m.defines = { OUTLINE_NORMAL: '' };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRes = mangaUniforms.uRes;
    shader.uniforms.uOutline = { value: width };
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'uniform vec2 uRes;\nuniform float uOutline;\n#ifdef OUTLINE_NORMAL\nattribute vec3 outlineNormal;\n#endif\nvoid main() {')
      .replace('#include <project_vertex>', OUTLINE_VERT);
  };
  m.customProgramCacheKey = () => `outline-${width}`;
  return m;
}

const STATIC_OUTLINE = outlineMaterial(2, true);
const SKINNED_OUTLINE = outlineMaterial(2.3, false);

/** Normales moyennées par position : le contour reste fermé sur les arêtes vives (boîtes, cylindres) */
function smoothOutlineNormals(geo: THREE.BufferGeometry) {
  if (geo.getAttribute('outlineNormal')) return;
  if (!geo.getAttribute('normal')) geo.computeVertexNormals();
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const sums = new Map<string, THREE.Vector3>();
  const keys: string[] = [];
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    keys.push(k);
    const s = sums.get(k) ?? new THREE.Vector3();
    s.add(n.fromBufferAttribute(nor, i));
    sums.set(k, s);
  }
  const out = new Float32Array(pos.count * 3);
  keys.forEach((k, i) => {
    const s = sums.get(k)!.clone().normalize();
    out.set([s.x, s.y, s.z], i * 3);
  });
  geo.setAttribute('outlineNormal', new THREE.BufferAttribute(out, 3));
}

/** Contour d'un maillage fixe (à ajouter comme enfant) */
export function outlineFor(geo: THREE.BufferGeometry) {
  smoothOutlineNormals(geo);
  const o = new THREE.Mesh(geo, STATIC_OUTLINE);
  o.userData.outline = true;
  o.raycast = () => {};
  return o;
}

/** Contours des maillages riggés d'un modèle (suivent le squelette) */
export function addSkinnedOutlines(root: THREE.Object3D) {
  const meshes: THREE.SkinnedMesh[] = [];
  root.traverse((o) => {
    const s = o as THREE.SkinnedMesh;
    if (s.isSkinnedMesh && !s.userData.outline) meshes.push(s);
  });
  for (const s of meshes) {
    const o = new THREE.SkinnedMesh(s.geometry, SKINNED_OUTLINE);
    o.bind(s.skeleton, s.bindMatrix);
    o.position.copy(s.position);
    o.quaternion.copy(s.quaternion);
    o.scale.copy(s.scale);
    o.frustumCulled = false;
    o.userData.outline = true;
    o.raycast = () => {};
    s.parent?.add(o);
  }
}

/* ───────── ombre au sol en trame ───────── */

/** Ombre portée en points de trame (screentone) */
export function halftoneShadowMaterial(opacity = 0.55) {
  const m = new THREE.ShadowMaterial({ color: INK, opacity });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRes = mangaUniforms.uRes;
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'uniform vec2 uRes;\nvoid main() {').replace(
      'gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );',
      /* glsl */ `float sh = 1.0 - getShadowMask();
	float sp = max( 3.6, 5.2 * uRes.y / 600.0 );
	vec2 p = mat2( 0.70711, -0.70711, 0.70711, 0.70711 ) * gl_FragCoord.xy / sp;
	float r = 0.64 * sqrt( sh );
	float d = length( fract( p ) - 0.5 );
	float aa = 0.8 / sp;
	gl_FragColor = vec4( color, opacity * ( 1.0 - smoothstep( r - aa, r + aa, d ) ) );`,
    );
  };
  return m;
}
