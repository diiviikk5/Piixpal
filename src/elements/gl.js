/* GL: the GPU side of Piixpal. One shared WebGL canvas that every shader component borrows,
 * so a page can have dozens of them without running out of contexts (browsers allow about 16).
 * A component renders its shader at a low "pixel grid" resolution, then copies the result into
 * its own canvas, which the browser scales up crisp. That's the pixel look, and it's also why
 * these are cheap: a 1200 x 600 hero with 4 px pixels is only 300 x 150 shader pixels.
 *
 * Every shader gets the same toolkit: noise, fbm, an 8x8 Bayer matrix, and a palette with
 * ordered dithering, so gradients fall into the theme's colours in that crunchy pixel way. */

const GL = { cv: null, gl: null, ok: null, lost: false, buf: null, progs: {}, tex: new WeakMap() };

/* the theme's palettes, dark to light. Shaders read them as up to six colours */
const GL_PALETTES = {
  lime: ['#0b0a10', '#1b3410', '#4f7d10', '#a8d81c', '#c6f432', '#f2ffd6'],
  aurora: ['#06050c', '#0d2b3a', '#127a74', '#25d6a0', '#9ef5cf', '#e4dcff'],
  sunset: ['#160925', '#4d1650', '#b0285e', '#ff5a6e', '#ff9b45', '#ffe08a'],
  ocean: ['#030b18', '#0a2c55', '#1d6fb0', '#58c8ff', '#bfeaff', '#ffffff'],
  candy: ['#1c0b2e', '#5b2bd6', '#c43bd8', '#ff6bb5', '#ffd23f', '#fffbe6'],
  violet: ['#0c0718', '#221048', '#4a2bb0', '#6b4cff', '#a996ff', '#ece6ff'],
  fire: ['#050202', '#5a0b0b', '#c22a10', '#ff6b1f', '#ffc23a', '#fff4c8'],
  gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  paper: ['#f3eee3', '#e2d9c6', '#a99d88', '#6c6477', '#17121f'],
  mono: ['#0b0a10', '#3b3448', '#8e869c', '#f3eee3']
};
const glPalette = name => {
  const list = GL_PALETTES[name] || (name && name.includes('#') ? name.split(',').map(s => s.trim()).filter(Boolean) : null) || GL_PALETTES.lime;
  const arr = new Float32Array(18);
  list.slice(0, 6).forEach((c, i) => { const [r, g, b] = hexRGBA(c); arr[i * 3] = r / 255; arr[i * 3 + 1] = g / 255; arr[i * 3 + 2] = b / 255; });
  return { arr, n: Math.min(6, list.length), list };
};

const GL_VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
/* what every fragment shader starts with */
const GL_PRELUDE = `precision highp float;
uniform vec2 u_res;uniform float u_time;uniform vec2 u_mouse;uniform float u_hover;uniform float u_intro;
uniform vec3 u_pal[6];uniform float u_n;uniform float u_dither;uniform float u_seed;uniform vec4 u_k;uniform vec4 u_j;
uniform sampler2D u_tex;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21)+u_seed*.013);p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
float bayer2(vec2 a){a=floor(a);return fract(dot(a,vec2(.5,a.y*.75)));}
float bayer4(vec2 a){return bayer2(.5*a)*.25+bayer2(a);}
float bayer8(vec2 a){return bayer4(.5*a)*.25+bayer2(a);}
vec3 pal(float v){v=clamp(v,0.,1.)*(u_n-1.);vec3 c=u_pal[0];for(int i=1;i<6;i++){if(float(i)<u_n)c=mix(c,u_pal[i],clamp(v-float(i-1),0.,1.));}return c;}
vec3 dpal(float v,vec2 cell){float n=u_n-1.;float q=clamp(v,0.,1.)*n+(bayer8(cell)-.5)*u_dither;return pal(floor(q+.5)/n);}
vec2 aspect(vec2 uv){return (uv-.5)*vec2(u_res.x/u_res.y,1.);}
`;
/* and ends with: one pixel per fragment, plus the pixel-dissolve intro every component can use */
const GL_MAIN = `
void main(){vec2 cell=floor(gl_FragCoord.xy);vec2 uv=(cell+.5)/u_res;vec4 c=effect(uv,cell);
if(u_intro<1.){float th=bayer8(cell)*.75+(1.-uv.y)*.25;if(th>u_intro)c.a=0.;}
gl_FragColor=vec4(c.rgb*c.a,c.a);}`;

const glInit = () => {
  if (GL.ok !== null) return GL.ok && !GL.lost;
  try {
    const cv = document.createElement('canvas');
    const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
    if (!gl) return (GL.ok = false);
    GL.cv = cv; GL.gl = gl;
    const setup = () => {
      GL.buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, GL.buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    };
    setup();
    /* if the GPU resets, drop everything and rebuild when it comes back */
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); GL.lost = true; GL.progs = {}; GL.tex = new WeakMap(); });
    cv.addEventListener('webglcontextrestored', () => { GL.lost = false; setup(); });
    return (GL.ok = true);
  } catch (_) { return (GL.ok = false); }
};

