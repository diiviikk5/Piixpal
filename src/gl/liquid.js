/* LIQUID: your section half full of pixel water, and the things in it float.   @component liquid
 *
 *   <piix-liquid level=".55">
 *     <h2>Make a splash</h2>
 *     <piix-glow-card>I'm floating</piix-glow-card>
 *     <piix-button>So am I</piix-button>
 *   </piix-liquid>
 *
 * A tank of water drawn in pixels across your section, at the level you choose. Anything
 * whose bottom sits below the waterline floats: it rides up and down on the wave beneath it
 * and tilts with the slope, and as it bobs it pushes waves back. Move the pointer through the
 * water and it ripples; click and it splashes, throwing droplets that fall back in; scroll fast
 * and the whole tank sloshes. Parts under the surface look underwater (the water is drawn over
 * them, see-through), and everything stays real: links and buttons work, even submerged.
 *
 *   level     how full, from 0 (empty) to 1 (brim)                  default: .55
 *   palette   lagoon | ocean | slime | lava | ink                  default: lagoon
 *   pixel     size of one pixel of water, px                      default: 3
 *   calm      how fast waves die down, 0 (forever) to 1 (at once)  default: .3
 *   sound     make sounds even without <piix-chiptune> ("off" to stay silent)
 *
 *   methods: splash(x, strength) (x in px from the left)
 *   events: splash */
/* deep, mid, shallow, surface, foam */
const LQ_PALS = {
  lagoon: ['#0b5f73', '#128a9b', '#2fc1c4', '#8ff0e0', '#ffffff'],
  ocean: ['#0d1b4a', '#1c3d8f', '#2f6fd0', '#7fb6ff', '#e8f3ff'],
  slime: ['#2c5a12', '#4f9a17', '#8bd630', '#c6f432', '#f4ffd0'],
  lava: ['#5a0f12', '#a3231a', '#e8521f', '#ffab3d', '#fff0b8'],
  ink: ['#17121f', '#2a2236', '#4a3d63', '#8b7cff', '#f2eef8']
};
/* 4 x 4 ordered dither: smooth depth bands, in pixels */
const LQ_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
class PiixLiquidElement extends HTMLElement {
  static get observedAttributes() { return ['level', 'palette', 'pixel']; }
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this._drops = []; this._floats = [];
    this._loop = dt => this._tick(dt);
  }
  connectedCallback() {
    this.shadowRoot.innerHTML = `<style>
:host{display:block;position:relative;isolation:isolate}
canvas{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;z-index:2}
</style><slot></slot><canvas aria-hidden="true"></canvas>`;
    this._cv = this.shadowRoot.querySelector('canvas');
    this._ro = new ResizeObserver(() => this._size());
    this._ro.observe(this);
    this._mo = new MutationObserver(() => { clearTimeout(this._mt); this._mt = setTimeout(() => this._findFloats(), 80); });
    this._mo.observe(this, { childList: true });
    this._io = new IntersectionObserver(([en]) => { en.isIntersecting ? sub(this._loop) : unsub(this._loop); });
    this._io.observe(this);
    this.addEventListener('pointermove', this._pm = e => {
      const r = this.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (this._lx != null && this._N) {
        /* the pointer drags the water along as it passes through, hardest right at the surface */
        const i = Math.floor(x / this._px), surf = this._lvl + this._h[clamp(i, 0, this._N - 1)];
        const depth = y - surf, near = depth > -10 && depth < this._px * 40;
        if (near) {
          const push = clamp((y - this._ly) * 5 + Math.abs(x - this._lx) * 1.6, -120, 120) * (depth < 0 ? .5 : 1);
          for (let k = -2; k <= 2; k++) { const j = i + k; if (j >= 0 && j < this._N) this._v[j] += push * (1 - Math.abs(k) / 3); }
        }
      }
      this._lx = x; this._ly = y;
    });
    this.addEventListener('pointerleave', this._pl = () => { this._lx = null; });
    this.addEventListener('click', this._ck = e => {
      if (e.target.closest('a,button,input,select,textarea,label,piix-button,piix-glow-button')) return;
      const r = this.getBoundingClientRect(), y = e.clientY - r.top;
      if (y > this._lvl - 40) this.splash(e.clientX - r.left, 1);
    });
    addEventListener('scroll', this._sc = () => {
      /* scrolling fast tips the tank: water runs to one side and slops back */
      const d = scrollY - (this._sy == null ? scrollY : this._sy); this._sy = scrollY;
      if (!this._N || reduced()) return;
      const k = clamp(d, -60, 60) * .25;
      for (let i = 0; i < this._N; i++) this._v[i] += k * (i / this._N - .5) * 2;
    }, { passive: true });
  }
  disconnectedCallback() {
    unsub(this._loop);
    this._ro.disconnect(); this._mo.disconnect(); this._io.disconnect();
    this.removeEventListener('pointermove', this._pm); this.removeEventListener('pointerleave', this._pl); this.removeEventListener('click', this._ck);
    removeEventListener('scroll', this._sc);
    for (const f of this._floats) [f.el.style.translate, f.el.style.rotate] = f.keep;
  }
  attributeChangedCallback() { if (this._cv) this._size(); }

  _size() {
    const W = this.clientWidth, H = this.clientHeight;
    if (!W || !H) return;
    const px = this._px = clamp(+this.getAttribute('pixel') || 3, 1, 8);
    const N = Math.ceil(W / px) + 1;
    if (N !== this._N) { this._N = N; this._h = new Float32Array(N); this._v = new Float32Array(N); }
    this._W = W; this._H = H;
    const lv = this.getAttribute('level');
    this._lvl = Math.round(H * (1 - clamp(lv === null ? .55 : +lv, 0, 1)));
    this._gw = Math.ceil(W / px); this._gh = Math.ceil(H / px);
    this._small = this._small || document.createElement('canvas');
    this._small.width = this._gw; this._small.height = this._gh;
    this._img = new ImageData(this._gw, this._gh); this._u32 = new Uint32Array(this._img.data.buffer);
    const dpr = Math.min(2, devicePixelRatio || 1);
    this._cv.width = Math.round(W * dpr); this._cv.height = Math.round(H * dpr);
    const P = LQ_PALS[this.getAttribute('palette')] || LQ_PALS.lagoon;
    /* packed for ImageData: alpha, blue, green, red; the water is see-through, the foam is not */
    this._cols = P.map((c, i) => { const [r, g, b] = hexRGBA(c); const a = [150, 120, 95, 215, 240][i]; return (a << 24 | b << 16 | g << 8 | r) >>> 0; });
    this._findFloats();
  }
  /* what floats: anything whose bottom is under the waterline */
  _findFloats() {
    if (!this._W) return;
    for (const f of this._floats) [f.el.style.translate, f.el.style.rotate] = f.keep;
    const host = this.getBoundingClientRect();
    /* look inside layout boxes (a row of cards), so each card floats on its own wave */
    const pieces = [], dig = p => {
      for (const el of p.children) {
        if (['SCRIPT', 'STYLE', 'TEMPLATE'].includes(el.tagName) || el.hasAttribute('data-anchored')) continue;
        const own = [...el.childNodes].some(k => k.nodeType === 3 && k.data.trim());
        if (!own && el.children.length && !el.tagName.includes('-') && !el.hasAttribute('data-float')) dig(el); else pieces.push(el);
      }
    };
    dig(this);
    this._floats = pieces.map(el => {
      const r = el.getBoundingClientRect();
      return { el, keep: [el.style.translate, el.style.rotate], x0: r.left - host.left, x1: r.right - host.left, bottom: r.bottom - host.top, hgt: r.height, y: 0, vy: 0, a: 0 };
    }).filter(f => f.bottom > this._lvl && f.x1 > f.x0);
    for (const f of this._floats) { f.el.style.willChange = 'transform'; f.el.style.transformOrigin = '50% 100%'; }
  }

  /* drop something big in at x: a crater in the water, and droplets thrown up */
  splash(x, strength = 1) {
    if (!this._N) return;
    const i = clamp(Math.floor(x / this._px), 0, this._N - 1);
    for (let k = -6; k <= 6; k++) { const j = i + k; if (j >= 0 && j < this._N) this._v[j] += 900 * strength * (1 - Math.abs(k) / 7); }
    if (!reduced()) for (let n = 0; n < 26 * strength; n++) this._drops.push({ x: x + rnd(-14, 14), y: this._lvl + this._h[i] - 2, vx: rnd(-140, 140), vy: rnd(-420, -160) * strength, c: chance(.25) ? 4 : 3 });
    sfx('bounce', this, { pitch: .55 }); sfx('hit', this, { pitch: .5, gap: 0 });
    this.dispatchEvent(new CustomEvent('splash', { detail: { x } }));
  }

  _tick(dt) {
    if (!this._N) return;
    const N = this._N, h = this._h, v = this._v, px = this._px;
    dt = Math.min(dt, 1 / 30);
    if (reduced()) { h.fill(0); v.fill(0); }
    else {
      /* a breath of wind, so the water is never dead still */
      this._t = (this._t || 0) + dt;
      if (chance(dt * 3)) v[(Math.random() * N) | 0] += rnd(-14, 14);
      /* the wave equation, in small steps so it stays stable: each column is pulled toward its
         neighbours (that is what carries a wave across) and gently back to the rest level */
      const calmA = this.getAttribute('calm'), damp = .8 + 8 * clamp(calmA === null ? .3 : +calmA, 0, 1);
      const c2 = 5200, sub = 5, sdt = dt / sub;
      for (let s = 0; s < sub; s++) {
        for (let i = 0; i < N; i++) {
          const l = i > 0 ? h[i - 1] : h[i], r = i < N - 1 ? h[i + 1] : h[i];
          v[i] += (c2 * (l + r - 2 * h[i]) - 30 * h[i] - damp * v[i]) * sdt;
        }
        for (let i = 0; i < N; i++) h[i] += v[i] * sdt;
      }
      for (let i = 0; i < N; i++) h[i] = clamp(h[i], -this._lvl + 4, this._H - this._lvl - 4);
    }
    /* the droplets: they fly, and when they land they make a ripple of their own */
    for (const d of this._drops) {
      d.vy += 1100 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      const i = clamp(Math.floor(d.x / px), 0, N - 1);
      if (d.vy > 0 && d.y >= this._lvl + h[i]) { v[i] += d.vy * .05; d.dead = true; }
      if (d.x < 0 || d.x > this._W) d.dead = true;
    }
    this._drops = this._drops.filter(d => !d.dead);
    this._float(dt);
    this._draw();
  }
  /* floating things ride the wave beneath them and tilt with its slope; bobbing pushes back */
  _float(dt) {
    const px = this._px, h = this._h, N = this._N;
    const at = x => h[clamp(Math.round(x / px), 0, N - 1)];
    for (const f of this._floats) {
      const l = at(f.x0 + 4), r = at(f.x1 - 4), mid = at((f.x0 + f.x1) / 2);
      /* it rides the surface with about a quarter of itself under water */
      const want = this._lvl + (l + r + mid * 2) / 4 + f.hgt * .26 - f.bottom, slope = Math.atan2(r - l, Math.max(20, f.x1 - f.x0 - 8));
      const ay = (want - f.y) * 45 - f.vy * 11;
      f.vy += ay * dt; f.y += f.vy * dt;
      f.a += (clamp(slope, -.35, .35) * .8 - f.a) * Math.min(1, dt * 7);
      /* a heavy thing moving through water pushes it aside */
      const push = clamp(f.vy * .02, -2, 2), i0 = Math.round(f.x0 / px), i1 = Math.round(f.x1 / px);
      for (let i = Math.max(0, i0); i <= Math.min(N - 1, i1); i += 3) this._v[i] += push;
      const y = Math.round(f.y / px) * px, a = Math.round(f.a * 200) / 200;
      /* translate and rotate, not transform: they stack with any transform the element sets for itself */
      const t = y + '|' + a;
      if (t !== f.t) { f.t = t; f.el.style.translate = `0 ${y}px`; f.el.style.rotate = `${a}rad`; }
    }
  }
  _draw() {
    const u = this._u32, gw = this._gw, gh = this._gh, px = this._px, C = this._cols, h = this._h, lvl = this._lvl;
    u.fill(0);
    for (let x = 0; x < gw; x++) {
      const i = Math.min(this._N - 1, x), surf = (lvl + h[i]) / px, top = Math.max(0, Math.ceil(surf));
      const steep = Math.abs((h[Math.min(this._N - 1, i + 1)] - h[Math.max(0, i - 1)])) > px * 1.4;
      const depthAll = Math.max(1, gh - top);
      for (let y = top; y < gh; y++) {
        const d = y - surf, k = LQ_BAYER[(y & 3) * 4 + (x & 3)];
        let c;
        /* a bright lip on the surface, foam where the wave is steep, then bands that darken with depth */
        if (d < 1) c = steep ? C[4] : C[3];
        else if (d < 2 && steep && k > .4) c = C[4];
        else {
          const t = (y - top) / depthAll;
          c = t < .18 ? (k < (.18 - t) / .18 * .8 ? C[3] : C[2]) : t < .55 ? (k < (t - .18) / .37 ? C[1] : C[2]) : (k < (t - .55) / .45 ? C[0] : C[1]);
        }
        u[y * gw + x] = c;
      }
    }
    /* droplets on top */
    for (const d of this._drops) {
      const x = Math.round(d.x / px), y = Math.round(d.y / px);
      if (x >= 0 && x < gw && y >= 0 && y < gh) { u[y * gw + x] = C[4]; if (d.c > 3 && y + 1 < gh) u[(y + 1) * gw + x] = C[3]; }
    }
    this._small.getContext('2d').putImageData(this._img, 0, 0);
    const g = this._cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, this._cv.width, this._cv.height);
    g.drawImage(this._small, 0, 0, gw * px * this._cv.width / this._W, gh * px * this._cv.height / this._H);
  }
}
define('piix-liquid', PiixLiquidElement);
ELEMENTS.liquid = 'piix-liquid';
