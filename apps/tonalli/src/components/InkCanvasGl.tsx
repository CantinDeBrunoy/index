import { useImperativeHandle, useLayoutEffect, useRef } from 'react';
import type { Ref } from 'react';

import type { InkCanvasHandle } from '@/components/InkCanvas';
import { BLOB_SLOTS, MAX_SWIRL, RINGS } from '@/lib/ink';
import type { InkFrame, Size } from '@/lib/ink';
import { turbulenceField } from '@/lib/turbulence';

/**
 * L'encre, dessinée par le processeur graphique.
 *
 * C'est la même matière que le SVG d'`InkCanvas` — mêmes taches, même chaîne
 * turbulence → déplacement → flou → seuil — mais le SVG la faisait calculer
 * par le filtre du navigateur, sur chaque pixel de l'écran et à chaque image :
 * neuf fois plus de pixels sur un téléphone de densité 3, et le bruit de
 * Perlin recalculé à chaque fois. La validation ramait. Aucun navigateur ne
 * laisse baisser la résolution d'un filtre SVG ; ici, on la choisit.
 *
 * Quatre passes par image :
 *
 * 1. **le masque**, à demi-résolution : chaque texel lit le bruit à sa place
 *    (décalé de la dérive), se déplace d'autant, et regarde s'il tombe dans
 *    une tache. Les taches sont des rectangles arrondis calculés à la volée,
 *    sans rien dessiner ni envoyer d'image ;
 * 2. et 3. **le flou**, horizontal puis vertical, toujours à demi-résolution ;
 * 4. **le seuil et la couleur**, à la résolution de l'écran. Le seuil appliqué
 *    au masque agrandi redonne un bord net : la demi-résolution ne se voit pas.
 *
 * Le bruit, lui, ne change jamais pendant une animation — seule la dérive le
 * fait glisser. Il est calculé une fois, sur une grille lâche
 * (`turbulenceField`), et le processeur graphique l'interpole.
 */

/** Texels du masque par pixel d'écran : le flou et le seuil effacent la différence. */
const MASK_SCALE = 0.5;
/** Marge du masque autour du cadre, pour que le flou du bord voie ce qui déborde. */
const MASK_MARGIN = 24;
/** Écart entre deux échantillons du bruit, en pixels : sa plus petite volute en fait une quarantaine. */
const NOISE_STEP = 4;
/** Au-delà, l'œil ne voit plus la différence sur un bord que le seuil a déjà lissé. */
const MAX_DENSITY = 2;
/** Rayon du flou, en texels : trois écarts-types du plus fort flou demandé. */
const BLUR_RADIUS = 16;

const VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const PRECISION = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;`;

// Le haut de l'écran est en haut du masque : v_uv.y monte, les pixels descendent.
const MASK = `${PRECISION}
#define BLOBS ${BLOB_SLOTS}
#define RINGS ${RINGS.length}
uniform vec2 u_origin;
uniform vec2 u_extent;
uniform float u_texel;
uniform sampler2D u_noise;
uniform vec2 u_noiseOrigin;
uniform vec2 u_noiseExtent;
uniform vec2 u_drift;
uniform float u_swirl;
uniform vec4 u_veil;
uniform vec2 u_veilStyle;
uniform vec4 u_blobs[BLOBS];
uniform float u_blobRx[BLOBS];
uniform vec4 u_rings[RINGS];
uniform vec3 u_ringStyle[RINGS];

float rounded(vec2 p, vec4 box, float rx) {
  vec2 side = box.zw * 0.5;
  float r = min(rx, min(side.x, side.y));
  vec2 q = abs(p - box.xy - side) - side + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float fill(vec2 p, vec4 box, float rx) {
  if (box.z <= 0.0 || box.w <= 0.0) return 0.0;
  return clamp(0.5 - rounded(p, box, rx) / u_texel, 0.0, 1.0);
}

float over(float a, float b) { return a + b * (1.0 - a); }

void main() {
  vec2 p = u_origin + vec2(v_uv.x, 1.0 - v_uv.y) * u_extent;
  // feOffset puis feDisplacementMap : le bruit est lu à la place du pixel,
  // décalé de la dérive, et c'est la source qui est lue ailleurs.
  vec2 flow = texture2D(u_noise, (p - u_drift - u_noiseOrigin) / u_noiseExtent).rg;
  vec2 s = p + u_swirl * (flow - 0.5);
  float a = u_veilStyle.y * fill(s, u_veil, u_veilStyle.x);
  for (int i = 0; i < BLOBS; i++) a = over(a, fill(s, u_blobs[i], u_blobRx[i]));
  for (int i = 0; i < RINGS; i++) {
    vec4 box = u_rings[i];
    vec3 style = u_ringStyle[i];
    if (box.z > 0.0 && box.w > 0.0 && style.y > 0.0) {
      float edge = abs(rounded(s, box, style.x)) - style.y * 0.5;
      a = over(a, style.z * clamp(0.5 - edge / u_texel, 0.0, 1.0));
    }
  }
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`;

// Un flou gaussien séparable. Les poids arrivent calculés, et la boucle
// s'arrête à trois écarts-types : un flou léger ne paie pas le prix du fort.
const BLUR = `${PRECISION}
#define RADIUS ${BLUR_RADIUS}
uniform sampler2D u_source;
uniform vec2 u_step;
uniform float u_weights[RADIUS + 1];
uniform float u_taps;
void main() {
  float sum = u_weights[0] * texture2D(u_source, v_uv).a;
  for (int i = 1; i <= RADIUS; i++) {
    if (float(i) > u_taps) break;
    vec2 offset = float(i) * u_step;
    sum += u_weights[i] * (texture2D(u_source, v_uv + offset).a + texture2D(u_source, v_uv - offset).a);
  }
  gl_FragColor = vec4(0.0, 0.0, 0.0, sum);
}`;

// Le seuil de feComponentTransfer (3a − 1), puis l'encre ou son négatif :
// l'eau claire est une nappe de couleur moins les taches.
const FINAL = `${PRECISION}
uniform sampler2D u_mask;
uniform vec2 u_frame;
uniform vec2 u_origin;
uniform vec2 u_extent;
uniform vec3 u_color;
uniform float u_opacity;
uniform float u_clear;
void main() {
  vec2 p = vec2(v_uv.x, 1.0 - v_uv.y) * u_frame;
  vec2 uv = vec2((p.x - u_origin.x) / u_extent.x, 1.0 - (p.y - u_origin.y) / u_extent.y);
  float a = clamp(3.0 * texture2D(u_mask, uv).a - 1.0, 0.0, 1.0);
  float k = mix(a, 1.0 - a, u_clear) * u_opacity;
  gl_FragColor = vec4(u_color * k, k);
}`;

type Program = { program: WebGLProgram; uniform: (name: string) => WebGLUniformLocation | null };
type Target = { texture: WebGLTexture; framebuffer: WebGLFramebuffer };

type Gpu = {
  gl: WebGLRenderingContext;
  mask: Program;
  blur: Program;
  final: Program;
  noise: WebGLTexture;
  targets: [Target, Target];
  maskSize: { width: number; height: number };
  canvasSize: { width: number; height: number };
};

export function InkCanvasGl({
  color,
  frame,
  covered = false,
  className,
  onFail,
  ref,
}: {
  color: string;
  frame: Size;
  covered?: boolean;
  className?: string;
  /** Appelé si le processeur graphique refuse : `InkCanvas` repasse au SVG. */
  onFail: () => void;
  ref?: Ref<InkCanvasHandle>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const gpu = useRef<Gpu | null>(null);
  const rgb = hexToRgb(color);

  // Avant le premier `paint` : l'horloge de l'animation part dans un effet du
  // parent, qui passe après les effets de mise en page de ses enfants.
  useLayoutEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const density = Math.min(window.devicePixelRatio || 1, MAX_DENSITY);
    element.width = Math.max(1, Math.round(frame.width * density));
    element.height = Math.max(1, Math.round(frame.height * density));
    const gl = element.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    });
    const ready = gl ? setUp(gl, frame, element) : null;
    if (!ready) {
      onFail();
      return;
    }
    gpu.current = ready;
    const lost = (event: Event) => {
      event.preventDefault();
      gpu.current = null;
      onFail();
    };
    element.addEventListener('webglcontextlost', lost);
    // Le dévoilement prend la suite d'une carte déjà couverte : la nappe doit
    // être là dès la première image, comme `covered` le fait pour le SVG.
    if (covered) draw(ready, rgb, null);
    return () => {
      element.removeEventListener('webglcontextlost', lost);
      gpu.current = null;
      // Les navigateurs limitent le nombre de contextes vivants : on rend le
      // sien au lieu d'attendre le ramasse-miettes.
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // Le cadre est figé au départ de l'animation, et `covered` ne sert qu'à
    // la première image : ni l'un ni l'autre ne relance le contexte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    paint(image) {
      if (gpu.current) draw(gpu.current, rgb, image);
    },
  }));

  return <canvas ref={canvas} className={className} aria-hidden />;
}

function setUp(gl: WebGLRenderingContext, frame: Size, element: HTMLCanvasElement): Gpu | null {
  const mask = program(gl, MASK);
  const blur = program(gl, BLUR);
  const final = program(gl, FINAL);
  if (!mask || !blur || !final) return null;

  // Un seul triangle qui déborde de l'écran : moins de sommets qu'un carré, et
  // pas de couture en diagonale.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  // `a_position` est lié à l'emplacement 0 dans les trois programmes.
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const extent = { width: frame.width + 2 * MASK_MARGIN, height: frame.height + 2 * MASK_MARGIN };
  const maskSize = {
    width: Math.max(1, Math.ceil(extent.width * MASK_SCALE)),
    height: Math.max(1, Math.ceil(extent.height * MASK_SCALE)),
  };
  const first = target(gl, maskSize);
  const second = target(gl, maskSize);
  if (!first || !second) return null;

  // Le bruit couvre le cadre, plus ce que la dérive peut aller chercher :
  // elle part vers le haut et un peu vers la gauche, donc le bruit lu est en
  // bas et à droite (`ink.ts`, `drift`). Au-delà, le bord de la texture se
  // prolonge, sans trou.
  const grid = {
    x: -MASK_MARGIN,
    y: -MASK_MARGIN,
    step: NOISE_STEP,
    columns: Math.ceil((extent.width + 0.5 * MAX_SWIRL) / NOISE_STEP),
    rows: Math.ceil((extent.height + MAX_SWIRL) / NOISE_STEP),
  };
  const noise = gl.createTexture();
  if (!noise) return null;
  gl.bindTexture(gl.TEXTURE_2D, noise);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  // Le motif change à chaque fois : deux journées ne font pas la même tache.
  const seed = Math.floor(Math.random() * 1000);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA, grid.columns, grid.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    turbulenceField(seed, [0.012, 0.008], 2, grid),
  );
  smooth(gl);

  gl.useProgram(mask.program);
  gl.uniform2f(mask.uniform('u_origin'), -MASK_MARGIN, -MASK_MARGIN);
  gl.uniform2f(mask.uniform('u_extent'), extent.width, extent.height);
  gl.uniform1f(mask.uniform('u_texel'), extent.width / maskSize.width);
  gl.uniform2f(mask.uniform('u_noiseOrigin'), grid.x, grid.y);
  gl.uniform2f(mask.uniform('u_noiseExtent'), grid.columns * grid.step, grid.rows * grid.step);
  gl.uniform1i(mask.uniform('u_noise'), 0);

  gl.useProgram(blur.program);
  gl.uniform1i(blur.uniform('u_source'), 0);

  gl.useProgram(final.program);
  gl.uniform1i(final.uniform('u_mask'), 0);
  gl.uniform2f(final.uniform('u_frame'), frame.width, frame.height);
  gl.uniform2f(final.uniform('u_origin'), -MASK_MARGIN, -MASK_MARGIN);
  gl.uniform2f(final.uniform('u_extent'), extent.width, extent.height);

  gl.disable(gl.BLEND);
  gl.activeTexture(gl.TEXTURE0);

  return {
    gl, mask, blur, final, noise,
    targets: [first, second],
    maskSize,
    canvasSize: { width: element.width, height: element.height },
  };
}

// Un tableau réutilisé d'une image à l'autre : pas d'allocation par frame.
const blobs = new Float32Array(BLOB_SLOTS * 4);
const blobRx = new Float32Array(BLOB_SLOTS);
const rings = new Float32Array(RINGS.length * 4);
const ringStyle = new Float32Array(RINGS.length * 3);
const weights = new Float32Array(BLUR_RADIUS + 1);

/**
 * Les poids du flou pour un écart-type en texels (le flou est donné en pixels
 * d'écran, le masque en a deux fois moins), normalisés pour que le masque ne
 * pâlisse pas. Rend le nombre de prélèvements de chaque côté.
 */
function gaussian(sigma: number): number {
  const taps = sigma < 0.3 ? 0 : Math.min(BLUR_RADIUS, Math.ceil(3 * sigma));
  weights.fill(0);
  weights[0] = 1;
  let total = 1;
  for (let i = 1; i <= taps; i++) {
    weights[i] = Math.exp((-i * i) / (2 * sigma * sigma));
    total += 2 * weights[i];
  }
  for (let i = 0; i <= taps; i++) weights[i] /= total;
  return taps;
}

/** Une image. Sans `image`, la nappe pleine : un masque vide, retourné. */
function draw(state: Gpu, color: [number, number, number], image: InkFrame | null) {
  const { gl, mask, blur, final, noise, targets, maskSize, canvasSize } = state;
  const [first, second] = targets;

  gl.bindFramebuffer(gl.FRAMEBUFFER, first.framebuffer);
  gl.viewport(0, 0, maskSize.width, maskSize.height);
  if (!image) {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  } else {
    gl.useProgram(mask.program);
    gl.bindTexture(gl.TEXTURE_2D, noise);
    gl.uniform2f(mask.uniform('u_drift'), image.drift.x, image.drift.y);
    gl.uniform1f(mask.uniform('u_swirl'), image.swirl);
    const veil = image.veil;
    gl.uniform4f(mask.uniform('u_veil'), veil.x, veil.y, veil.width, veil.height);
    gl.uniform2f(mask.uniform('u_veilStyle'), veil.rx, image.veilOpacity);
    image.blobs.forEach((blob, index) => {
      blobs.set([blob.x, blob.y, blob.width, blob.height], index * 4);
      blobRx[index] = blob.rx;
    });
    image.rings.forEach((ring, index) => {
      rings.set([ring.blob.x, ring.blob.y, ring.blob.width, ring.blob.height], index * 4);
      ringStyle.set([ring.blob.rx, ring.stroke, ring.opacity], index * 3);
    });
    gl.uniform4fv(mask.uniform('u_blobs'), blobs);
    gl.uniform1fv(mask.uniform('u_blobRx'), blobRx);
    gl.uniform4fv(mask.uniform('u_rings'), rings);
    gl.uniform3fv(mask.uniform('u_ringStyle'), ringStyle);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.useProgram(blur.program);
    gl.uniform1f(blur.uniform('u_taps'), gaussian(image.blur * MASK_SCALE));
    gl.uniform1fv(blur.uniform('u_weights'), weights);
    gl.bindFramebuffer(gl.FRAMEBUFFER, second.framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, first.texture);
    gl.uniform2f(blur.uniform('u_step'), 1 / maskSize.width, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, first.framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, second.texture);
    gl.uniform2f(blur.uniform('u_step'), 0, 1 / maskSize.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvasSize.width, canvasSize.height);
  gl.useProgram(final.program);
  gl.bindTexture(gl.TEXTURE_2D, first.texture);
  gl.uniform3f(final.uniform('u_color'), color[0], color[1], color[2]);
  gl.uniform1f(final.uniform('u_opacity'), image ? image.opacity : 1);
  gl.uniform1f(final.uniform('u_clear'), !image || image.phase === 'clear' ? 1 : 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function program(gl: WebGLRenderingContext, fragment: string): Program | null {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const pixels = compile(gl.FRAGMENT_SHADER, fragment);
  const result = gl.createProgram();
  if (!vertex || !pixels || !result) return null;
  gl.attachShader(result, vertex);
  gl.attachShader(result, pixels);
  gl.bindAttribLocation(result, 0, 'a_position');
  gl.linkProgram(result);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) return null;
  const cache = new Map<string, WebGLUniformLocation | null>();
  return {
    program: result,
    uniform: (name) => {
      if (!cache.has(name)) cache.set(name, gl.getUniformLocation(result, name));
      return cache.get(name) ?? null;
    },
  };
}

function target(gl: WebGLRenderingContext, size: { width: number; height: number }): Target | null {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) return null;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size.width, size.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  smooth(gl);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return complete ? { texture, framebuffer } : null;
}

/** Interpolé, et prolongé au bord plutôt que répété : les tailles ne sont pas des puissances de deux. */
function smooth(gl: WebGLRenderingContext) {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function hexToRgb(color: string): [number, number, number] {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  const value = Number.parseInt(full.slice(0, 6), 16) || 0;
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
