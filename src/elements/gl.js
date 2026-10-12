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

const glProgram = body => {
  const gl = GL.gl;
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[piixpal] shader:', gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const v = sh(gl.VERTEX_SHADER, GL_VERT), f = sh(gl.FRAGMENT_SHADER, GL_PRELUDE + body + GL_MAIN);
  if (!v || !f) return null;
  const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn('[piixpal] link:', gl.getProgramInfoLog(p)); return null; }
  return { prog: p, pos: gl.getAttribLocation(p, 'p'), u: {} };
};

/* draw a shader at w x h into the shared canvas; returns where to copy it from.
 * u: uniforms by name. tex: { owner, src, dirty } to bind an image or canvas as u_tex */
const glDraw = (body, w, h, u, tex) => {
  if (!glInit()) return null;
  const gl = GL.gl, cv = GL.cv;
  if (cv.width < w || cv.height < h) { cv.width = Math.max(cv.width, w); cv.height = Math.max(cv.height, h); }
  const P = GL.progs[body] || (GL.progs[body] = glProgram(body));
  if (!P) return null;
  gl.useProgram(P.prog);
  gl.viewport(0, 0, w, h);
  gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindBuffer(gl.ARRAY_BUFFER, GL.buf); gl.enableVertexAttribArray(P.pos); gl.vertexAttribPointer(P.pos, 2, gl.FLOAT, false, 0, 0);
  for (const k in u) {
    let loc = P.u[k];
    if (loc === undefined) loc = P.u[k] = gl.getUniformLocation(P.prog, k === 'u_pal' || (u[k] instanceof Float32Array && u[k].length > 4) ? k + '[0]' : k);
    if (!loc) continue;
    const v = u[k];
    if (k === 'u_pal') gl.uniform3fv(loc, v);
    else if (v instanceof Float32Array && v.length > 4) gl.uniform4fv(loc, v);
    else if (typeof v === 'number') gl.uniform1f(loc, v);
    else if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
    else if (v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
    else gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
  }
  if (tex && tex.src) {
    let t = GL.tex.get(tex.owner);
    const fresh = !t;
    if (!t) { t = gl.createTexture(); GL.tex.set(tex.owner, t); }
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t);
    if (fresh || tex.dirty) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex.src); } catch (_) { return null; }
    }
    if (P.u.u_tex === undefined) P.u.u_tex = gl.getUniformLocation(P.prog, 'u_tex');
    if (P.u.u_tex) gl.uniform1i(P.u.u_tex, 0);
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return { cv, sy: cv.height - h };
};

/* ---------- the stage every shader component stands on ----------
 * a small canvas in a shadow root, scaled up crisp; the pointer and hover are tracked; it only
 * draws while on screen; reduced motion gets one still frame; without WebGL it shows a gradient */
class GLStage extends HTMLElement {
  static get observedAttributes() { return ['kind', 'effect', 'palette', 'pixel', 'dither', 'speed', 'fill', 'height', 'src', 'tone']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._tick = this._tick.bind(this);
    this._vis = true; this._t0 = now(); this._m = [.5, .5]; this._hov = 0; this._seed = Math.random() * 100;
  }
  connectedCallback() {
    this._build();
    this._io = new IntersectionObserver(es => { const v = es[es.length - 1].isIntersecting; if (v && !this._seen) { this._seen = now(); } this._vis = v; }, { rootMargin: '60px' });
    this._io.observe(this);
    this._ro = new ResizeObserver(() => this._fit()); this._ro.observe(this);
    sub(this._tick);
  }
  disconnectedCallback() { unsub(this._tick); if (this._io) this._io.disconnect(); if (this._ro) this._ro.disconnect(); }
  attributeChangedCallback(n, a, b) { if (a !== b && this._cv) this._build(); }
  _css() { return ''; }
  _html() { return '<canvas part="canvas" aria-hidden="true"></canvas><slot></slot>'; }
  _build() {
    const fill = this.hasAttribute('fill');
    if (fill && this.parentElement) {
      const p = this.parentElement;
      if (getComputedStyle(p).position === 'static') p.style.position = 'relative';
      p.style.isolation = 'isolate';
    }
    this._pal = glPalette(this.getAttribute('palette') || this._defPal);
    const hgt = this.getAttribute('height');
    this.shadowRoot.innerHTML = `<style>
:host{display:block;position:${fill ? 'absolute' : 'relative'};${fill ? 'inset:0;z-index:-1;pointer-events:none;' : ''}${!fill && hgt ? `height:${/^\d+$/.test(hgt) ? hgt + 'px' : hgt};` : ''}${this._hostCss ? this._hostCss() : ''}}
:host([hidden]){display:none}
canvas{position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:none}
${this._css()}</style>${this._html()}`;
    this._cv = this.shadowRoot.querySelector('canvas');
    this._g = this._cv.getContext('2d');
    if (!glInit()) {
      /* no WebGL: a still gradient in the same colours */
      const l = this._pal.list;
      this._cv.style.background = `linear-gradient(135deg,${l[0]},${l[Math.floor(l.length / 2)]},${l[l.length - 1]})`;
    }
    if (this._setup) this._setup();
    this._fit();
  }
  _fit() {
    if (!this._cv) return;
    const r = (this._box ? this._box() : this).getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    const px = Math.max(1, (+this.getAttribute('pixel') || this._defPx || 4) * dpr);
    this._px = px;
    this._W = Math.max(2, Math.ceil(r.width * dpr / px)); this._H = Math.max(2, Math.ceil(r.height * dpr / px));
    if (this._cv.width !== this._W || this._cv.height !== this._H) { this._cv.width = this._W; this._cv.height = this._H; }
    this._still = false;
    if (this._resized) this._resized();
  }
  _tick(dt) {
    if (!this._vis || !this._W || !GL.ok) return;
    const R = reduced();
    if (R && this._still && !this._dirty) return;
    /* nothing to show (an idle cursor trail, a finished reveal): clear once and rest */
    if (this._skip && this._skip()) { if (!this._cleared) { this._g.clearRect(0, 0, this._W, this._H); this._cleared = true; } return; }
    this._cleared = false;
    const r = this.getBoundingClientRect();
    const over = ptr.seen && ptr.cx >= r.left - 40 && ptr.cx <= r.right + 40 && ptr.cy >= r.top - 40 && ptr.cy <= r.bottom + 40;
    if (over) { const mx = (ptr.cx - r.left) / r.width, my = 1 - (ptr.cy - r.top) / r.height; this._m[0] = lerp(this._m[0], mx, Math.min(1, dt * 10)); this._m[1] = lerp(this._m[1], my, Math.min(1, dt * 10)); }
    this._hov = lerp(this._hov, over && ptr.cx >= r.left && ptr.cx <= r.right && ptr.cy >= r.top && ptr.cy <= r.bottom ? 1 : 0, Math.min(1, dt * 5));
    const speed = this.hasAttribute('speed') ? +this.getAttribute('speed') : 1;
    const T = R ? 12 : (now() - this._t0) / 1000 * speed;
    const intro = R || !this._introLen ? 1 : clamp((now() - (this._seen || now())) / 1000 / this._introLen, 0, 1);
    const u = Object.assign({
      u_res: [this._W, this._H], u_time: T, u_mouse: this._m, u_hover: this._hov, u_intro: intro, u_pal: this._pal.arr, u_n: this._pal.n,
      u_dither: this.hasAttribute('dither') ? +this.getAttribute('dither') : this._defDither ?? 1, u_seed: this._seed, u_k: [0, 0, 0, 0], u_j: [0, 0, 0, 0]
    }, this._uniforms ? this._uniforms(T, dt) : {});
    const out = glDraw(this._shader(), this._W, this._H, u, this._texture ? this._texture() : null);
    if (!out) return;
    this._g.clearRect(0, 0, this._W, this._H);
    this._g.drawImage(out.cv, 0, out.sy, this._W, this._H, 0, 0, this._W, this._H);
    this._dirty = false;
    this._still = R;
  }
}
Piixpal.gl = { palettes: GL_PALETTES, draw: glDraw, supported: () => glInit() };

/* the frame shader buttons and cards share: a pixel border with light running round it, a dark
 * face with a little grain, a spotlight that follows the pointer, and a ring where you click.
 * u_k = (click x, click y, seconds since the click, border width in pixels), u_j.x = face lift */
const GL_FRAME = `vec4 effect(vec2 uv,vec2 cell){
  vec2 sz=u_res,d=min(cell,sz-1.-cell);float b=u_k.w,e=min(d.x,d.y);
  if(d.x+d.y<b*1.5)return vec4(0.);
  vec2 q=aspect(uv),m=aspect(u_mouse);
  if(e<b){float a=atan(uv.y-.5,(uv.x-.5)*sz.x/sz.y)/6.2831+.5;
    float v=.5+.5*sin((a-u_time*.22)*6.2831*2.);v=mix(v*.9+.1,1.,u_hover*.35);return vec4(dpal(v,cell),1.);}
  float v=.05+u_j.x+.05*hash(cell)+.3*exp(-length(q-m)*2.8)*u_hover;
  if(u_k.z<1.2){vec2 c=aspect(u_k.xy);float r=u_k.z*1.5,ring=smoothstep(.07,0.,abs(length(q-c)-r))*(1.-u_k.z/1.2);v+=ring*.75;}
  return vec4(dpal(v,cell),1.);}`;

/* any CSS colour, as 0..1 rgb for a shader */
const glRGB = c => {
  const x = document.createElement('canvas').getContext('2d'); x.fillStyle = '#000'; x.fillStyle = c;
  const s = x.fillStyle;
  if (s[0] === '#') return hexRGBA(s).slice(0, 3).map(v => v / 255);
  return (s.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(v => +v / 255);
};
