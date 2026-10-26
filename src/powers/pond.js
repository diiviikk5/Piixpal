/* POND: a koi pond for the background of a section, or a whole page, drawn in ASCII.   @component pond
 *
 *   <section class="hero"> <h1>…</h1> <piix-pond></piix-pond> </section>
 *
 * Black water on a faint grid. Koi glide under your content: each one a solid, sculpted body
 * of shaded colour blocks with dark glyphs cut into them, anti-aliased at the edges, the scales
 * glinting as it turns. A spine with a travelling wave, paddle fins that bank into turns, a lit
 * dorsal ridge, and a long translucent tail that ripples. The real varieties, in colour: kohaku,
 * tancho, sanke, showa, ogon, platinum, asagi with its scale net, chagoi, kumonryu. Minnows
 * school between them and dart away; lily pads and lotus float on top; every swimmer leaves
 * a cyan wake. Click to splash (the minnows bolt) and drop food the koi race for; hold the
 * cursor still and they gather under it. Lives behind the content of whatever it's put in.
 *
 *   koi       how many, 1 to 14                                 default: fits the space
 *   kinds     which varieties, comma separated                  default: a mix
 *   minnows   how many small fish, 0 to 300                     default: fits the space
 *   pads      lily pads, 0 to 12                                default: fits the space
 *   theme     dark | light                                      default: follows the page
 *   grid      0 hides the faint cell grid
 *
 * The way the bodies are drawn (supersampled cells, shaded blocks with cut glyphs, skin-anchored
 * glyphs that shimmer) follows stackedlol/ascii-sharks (MIT), which showed how good this can look. */
const PD_N = 22;
const PD_SKIN = ':;t%SX8#@';
const PD_EDGE_HI = ':;', PD_EDGE_LO = ".',`";
const PD_FIN = ".:'`;";
const PD_SUB = [.25, .3, .75, .3, .25, .72, .75, .72];
/* paddle fins: where they sit (s), how far they reach, how round (pectoral, pelvic) */
const PD_FINS = [.22, .12, .5, .56, .06, .45];
const PD_BODY = 1, PD_EDGE = 2, PD_FINF = 3, PD_RIDGE = 4, PD_EYE = 5, PD_TAIL = 6;
const pdHash = (x, y, z) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const pdNoise = (x, y, z) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = pdHash(xi, yi, z), b = pdHash(xi + 1, yi, z), c = pdHash(xi, yi + 1, z), d = pdHash(xi + 1, yi + 1, z);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const pdFbm = (x, y, z) => pdNoise(x, y, z) * .65 + pdNoise(x * 2.1, y * 2.1, z + 7) * .35;
/* squared distance from a point to spine segment j */
const pdSegD = (sp, j, px, py) => {
  const ax = sp[j * 2], ay = sp[j * 2 + 1], sx = sp[j * 2 + 2] - ax, sy = sp[j * 2 + 3] - ay, l2 = sx * sx + sy * sy || 1;
  let u = ((px - ax) * sx + (py - ay) * sy) / l2; u = u < 0 ? 0 : u > 1 ? 1 : u;
  const qx = ax + sx * u - px, qy = ay + sy * u - py;
  return qx * qx + qy * qy;
};
const pdSmooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/* a koi seen from above: blunt round head, widest a third of the way down, a slim wrist */
const pdWidth = s => {
  if (s < .12) return .112 * Math.pow(Math.sin(Math.PI / 2 * s / .12), .5);
  if (s < .3) return .112 + .023 * pdSmooth(.12, .3, s);
  /* full through the middle, then a quick taper to the wrist: a koi, not an eel */
  if (s < .86) return .03 + .105 * (1 - Math.pow((s - .3) / .56, 1.9));
  return .03 - .01 * (s - .86) / .14;
};
/* the varieties: colour at s (head 0 .. tail 1) and v (across the back, -1 .. 1) */
const PD_WHITE = [244, 238, 228], PD_RED = [222, 54, 34], PD_SUMI = [38, 34, 40];
const PD_KOI = {
  kohaku: (s, v, z) => (pdFbm(s * 3.4, v * 1.1, z) > .5 && s > .04 && s < .84 ? PD_RED : PD_WHITE),
  tancho: (s, v) => (((s - .085) / .055) ** 2 + (v / .55) ** 2 < 1 ? PD_RED : PD_WHITE),
  sanke: (s, v, z) => (Math.abs(v) < .82 && pdFbm(s * 8, v * 2.4, z + 3) > .74 ? PD_SUMI : pdFbm(s * 3.4, v * 1.1, z) > .53 && s > .04 && s < .84 ? PD_RED : PD_WHITE),
  showa: (s, v, z) => (pdFbm(s * 3, v * 1.2, z) > .5 && s < .86 ? PD_RED : pdFbm(s * 3.6, v * 1.5, z + 5) > .6 ? PD_WHITE : PD_SUMI),
  ogon: () => [238, 186, 70],
  platinum: () => [222, 226, 230],
  asagi: (s, v) => {
    if (Math.abs(v) > .72 || s < .05) return [236, 118, 46];
    /* the scale net: a darker rim round every scale */
    const a = s * 34 + v * 3, b = s * 34 - v * 3, net = Math.min(Math.abs(a - Math.round(a)), Math.abs(b - Math.round(b)));
    return net < .14 ? [62, 84, 110] : [104, 136, 166];
  },
  chagoi: (s, v, z) => { const k = pdFbm(s * 5, v * 2, z) * 30; return [150 + k, 104 + k * .6, 60]; },
  kumonryu: (s, v, z) => (pdFbm(s * 4, v * 1.6, z) > .52 ? PD_WHITE : PD_SUMI)
};
const PD_KINDS = Object.keys(PD_KOI);
/* how often a scale catches the light: metallic koi glint more */
const PD_GLINT = PD_KINDS.map(k => (k === 'ogon' || k === 'platinum' ? .16 : .05));

class PiixPondElement extends HTMLElement {
  constructor() { super(); this._loop = dt => this._frame(dt); }
  connectedCallback() {
    const par = this.parentElement;
    this._page = !par || par === document.body || par === document.documentElement;
    /* behind the content of what it's in, above that element's own background */
    if (!this._page) { const cs = getComputedStyle(par); if (cs.position === 'static') par.style.position = 'relative'; if (cs.isolation !== 'isolate') par.style.isolation = 'isolate'; }
    Object.assign(this.style, { position: this._page ? 'fixed' : 'absolute', inset: '0', display: 'block', zIndex: '-1', overflow: 'hidden', pointerEvents: 'none', borderRadius: 'inherit', background: '#000' });
    this.setAttribute('aria-hidden', 'true');
    if (!this._cv) { this._cv = document.createElement('canvas'); this._cv.style.cssText = 'display:block;width:100%;height:100%'; this.appendChild(this._cv); }
    this._g = this._cv.getContext('2d', { alpha: false });
    this._bg = document.createElement('canvas');
    this._t = 0; this._acc = 0;
    this._ptr = { x: -1e4, y: -1e4, in: false, at: 0 };
    this._food = [];
    this._pm = e => this._pointer(e, false); this._pd = e => this._pointer(e, true);
    addEventListener('pointermove', this._pm, { passive: true }); addEventListener('pointerdown', this._pd, { passive: true });
    this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(this._page ? document.documentElement : par);
    this._io = new IntersectionObserver(([e]) => { if (e.isIntersecting) sub(this._loop); else unsub(this._loop); }); this._io.observe(this._page ? document.body : par);
    this._resize();
  }
  disconnectedCallback() { unsub(this._loop); this._ro && this._ro.disconnect(); this._io && this._io.disconnect(); removeEventListener('pointermove', this._pm); removeEventListener('pointerdown', this._pd); }

  /* ---------- size: the grid follows the width, like a type scale ---------- */
  _resize() {
    const r = this.getBoundingClientRect(), W = Math.max(120, this._page ? innerWidth : r.width), H = Math.max(120, this._page ? innerHeight : r.height);
    const dpr = Math.min(2, devicePixelRatio || 1);
    /* light or dark water: asked for, or whatever the page around it is */
    const want = this.getAttribute('theme');
    const light = want ? want === 'light' : (() => { let el = this.parentElement; while (el) { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(getComputedStyle(el).backgroundColor); if (m && (m[4] === undefined || +m[4] > .5)) return +m[1] * .3 + +m[2] * .59 + +m[3] * .11 > 140; el = el.parentElement; } return !matchMedia('(prefers-color-scheme: dark)').matches; })();
    this._P = light
      ? { light: true, bg: '#f4f1e9', grid: 'rgba(23,18,31,0.07)', wake: [40, 110, 210], fish: [34, 52, 64], food: [196, 128, 46], heat: [220, 96, 40], edge: .5 }
      : { light: false, bg: '#000', grid: 'rgba(255,255,255,0.05)', wake: [110, 230, 255], fish: [200, 236, 232], food: [232, 170, 96], heat: [255, 150, 70], edge: 1 };
    this.style.background = this._P.bg;
    this._W = W; this._H = H; this._dpr = dpr;
    const cw = this._cw = clamp(Math.round(W / 124), 8, 13), ch = this._ch = Math.round(cw * 1.45);
    const cols = this._cols = Math.ceil(W / cw), rows = this._rows = Math.ceil(H / ch), n = cols * rows;
    this._cv.width = Math.round(W * dpr); this._cv.height = Math.round(H * dpr);
    this._bg.width = this._cv.width; this._bg.height = this._cv.height;
    this._energy = new Float32Array(n); this._tmp = new Float32Array(n); this._heat = new Float32Array(n);
    this._flag = new Uint8Array(n); this._shade = new Float32Array(n); this._key = new Uint32Array(n); this._rgb = new Uint32Array(n);
    this._dim = new Float32Array(n); this._kindAt = new Uint8Array(n); this._shadow = new Uint8Array(n); this._fishAt = new Uint32Array(n); this._padAt = new Uint8Array(n);
    this._stamp = 0;
    /* the background: black water, a faint grid */
    const g = this._bg.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = this._P.bg; g.fillRect(0, 0, this._bg.width, this._bg.height);
    if (this.getAttribute('grid') !== '0') {
      g.strokeStyle = this._P.grid; g.lineWidth = 1; g.beginPath();
      for (let c = 0; c <= cols; c++) { const x = Math.round(c * cw * dpr) + .5; g.moveTo(x, 0); g.lineTo(x, H * dpr); }
      for (let r2 = 0; r2 <= rows; r2++) { const y = Math.round(r2 * ch * dpr) + .5; g.moveTo(0, y); g.lineTo(W * dpr, y); }
      g.stroke();
    }
    if (!this._koi) this._seed(); else for (const k of this._koi) for (let i = 0; i < PD_N; i++) { k.n[i * 2] = clamp(k.n[i * 2], 0, W); k.n[i * 2 + 1] = clamp(k.n[i * 2 + 1], 0, H); }
    if (reduced()) { for (let i = 0; i < 90; i++) this._step(1 / 60); this._draw(); }
  }

  _seed() {
    const W = this._W, H = this._H, minSide = Math.min(W, H);
    const kinds = (this.getAttribute('kinds') || '').split(',').map(s => s.trim()).filter(k => PD_KOI[k]);
    const mix = kinds.length ? kinds : ['kohaku', 'ogon', 'showa', 'asagi', 'tancho', 'sanke', 'platinum', 'kumonryu', 'chagoi'];
    const nk = clamp(+this.getAttribute('koi') || Math.round(W * H / 300000) + 2, 1, 14);
    const base = clamp(minSide * .5, 170, 420);
    this._koi = Array.from({ length: nk }, (_, i) => {
      const size = rnd(.62, 1), L = base * size, x = rnd(W * .1, W * .9), y = rnd(H * .1, H * .9), hd = rnd(0, 6.28), seg = L / (PD_N - 1);
      const n = new Float32Array(PD_N * 2);
      for (let j = 0; j < PD_N; j++) { n[j * 2] = x - Math.cos(hd) * seg * j; n[j * 2 + 1] = y - Math.sin(hd) * seg * j; }
      const kind = mix[i % mix.length];
      return { id: i + 1, kind, ki: PD_KINDS.indexOf(kind), L, n, heading: hd, speed: 26, phase: rnd(0, 6.28), turn: 0, depth: size, wander: rnd(0, 6.28), cruise: rnd(24, 36), seed: i * 31 + 7 };
    });
    this._koi.sort((a, b) => a.depth - b.depth);
    const nm = clamp(+(this.getAttribute('minnows') ?? Math.round(W * H / 9000)), 0, 300);
    this._fish = [];
    while (this._fish.length < nm) {
      const cx = rnd(W * .08, W * .92), cy = rnd(H * .08, H * .92), dir = (chance(.5) ? 0 : Math.PI) + rnd(-.5, .5), size = Math.min(nm - this._fish.length, 10 + (Math.random() * 14 | 0));
      for (let k = 0; k < size; k++) this._fish.push({ x: cx + rnd(-30, 30), y: cy + rnd(-18, 18), vx: Math.cos(dir) * 40, vy: Math.sin(dir) * 40, alarm: 0, turn: 0, depth: rnd(.55, 1) });
    }
    const np = clamp(+(this.getAttribute('pads') ?? Math.round(W * H / 600000) + 1), 0, 12);
    this._pads = Array.from({ length: np }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(.026, .042) * Math.max(W, H * 1.4), rot: rnd(0, 6.28), vx: rnd(-2, 2), vy: rnd(-1.2, 1.2), lotus: chance(.4) }));
  }

  /* ---------- the pointer: anywhere over the section (it sits behind the content) ---------- */
  _pointer(e, down) {
    const r = this.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
    const moved = Math.hypot(x - this._ptr.x, y - this._ptr.y) > 4;
    this._ptr = { x, y, in: inside, at: moved || !this._ptr.in ? performance.now() : this._ptr.at };
    if (!down || !inside || (e.target.closest && e.target.closest('a,button,input,textarea,select,label,[contenteditable]'))) return;
    this._splash(x, y);
    for (let i = 0; i < 4 + (Math.random() * 3 | 0); i++) this._food.push({ x: x + rnd(-26, 26), y: y + rnd(-16, 16), age: 0 });
  }
  _splash(x, y) {
    this._stampAt(this._energy, x, y, 6, 1.4);
    for (const f of this._fish) { const dx = f.x - x, dy = f.y - y, d = Math.hypot(dx, dy); if (d < 240 && d > .1) { const k = (1 - d / 240) * 260; f.vx += dx / d * k; f.vy += dy / d * k; f.alarm = 1; } }
  }
  _stampAt(field, x, y, rad, amt) {
    const c0 = Math.floor(x / this._cw), r0 = Math.floor(y / this._ch), cols = this._cols, rows = this._rows;
    for (let r = r0 - rad; r <= r0 + rad; r++) for (let c = c0 - rad; c <= c0 + rad; c++) {
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const d = Math.hypot(c - c0, (r - r0) * 1.4);
      if (d > rad + .5) continue;
      const i = r * cols + c; field[i] = Math.min(1.6, field[i] + amt * (1 - d / (rad + 1)));
    }
  }
  _cell(x, y) { const c = Math.floor(x / this._cw), r = Math.floor(y / this._ch); return c < 0 || r < 0 || c >= this._cols || r >= this._rows ? -1 : r * this._cols + c; }

  _frame(dt) {
    if (reduced()) return;
    this._acc = Math.min(this._acc + dt, 4 / 60);
    while (this._acc >= 1 / 60) { this._step(1 / 60); this._acc -= 1 / 60; }
    this._draw();
  }

  /* ---------- the world ---------- */
  _step(dt) {
    this._t += dt;
    const W = this._W, H = this._H, ptr = this._ptr, t = this._t;
    const begging = ptr.in && performance.now() - ptr.at > 1000;
    /* koi: wander, gather, feed, keep apart, keep in */
    const near = begging ? this._koi.slice().sort((a, b) => Math.hypot(a.n[0] - ptr.x, a.n[1] - ptr.y) - Math.hypot(b.n[0] - ptr.x, b.n[1] - ptr.y)).slice(0, 3) : [];
    for (const k of this._koi) {
      const hx = k.n[0], hy = k.n[1];
      let tx, ty, want = k.cruise;
      let food = null, fd = 1e9;
      for (const f of this._food) { const d = Math.hypot(f.x - hx, f.y - hy); if (d < fd) { fd = d; food = f; } }
      if (food) { tx = food.x; ty = food.y; want = 92; if (fd < k.L * .07) { this._food.splice(this._food.indexOf(food), 1); this._stampAt(this._heat, hx, hy, 2, 1); this._stampAt(this._energy, hx, hy, 3, .9); } }
      else if (near.includes(k)) { const a = near.indexOf(k) * 2.1 + t * .25; tx = ptr.x + Math.cos(a) * 46; ty = ptr.y + Math.sin(a) * 30; want = 30; }
      else {
        /* Reynolds wander: a point on a circle ahead, drifting */
        k.wander += rnd(-1, 1) * dt * 1.6;
        tx = hx + Math.cos(k.heading) * k.L * .6 + Math.cos(k.wander) * k.L * .35;
        ty = hy + Math.sin(k.heading) * k.L * .6 + Math.sin(k.wander) * k.L * .35;
      }
      /* soft walls: turn back toward the middle */
      const m = k.L * .3;
      if (hx < m) tx += (m - hx) * 6; if (hx > W - m) tx -= (hx - (W - m)) * 6;
      if (hy < m) ty += (m - hy) * 6; if (hy > H - m) ty -= (hy - (H - m)) * 6;
      /* room: from every other koi's body */
      for (const o of this._koi) if (o !== k) for (let j = 0; j < PD_N; j += 3) {
        const dx = hx - o.n[j * 2], dy = hy - o.n[j * 2 + 1], d = Math.hypot(dx, dy), R = (k.L + o.L) * .22;
        if (d < R && d > .1) { const f = (1 - d / R) * k.L * 1.4; tx += dx / d * f; ty += dy / d * f; }
      }
      let d = Math.atan2(ty - hy, tx - hx) - k.heading;
      while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283;
      const turn = clamp(d * 2.2, -1.6, 1.6) * (food ? 1.8 : 1);
      k.turn += (turn - k.turn) * Math.min(1, dt * 4);
      k.heading += k.turn * dt;
      k.speed += (want - k.speed) * Math.min(1, dt * (food ? 2.5 : 1));
      k.phase += dt * (2.4 + k.speed * .06);
      k.n[0] += Math.cos(k.heading) * k.speed * dt; k.n[1] += Math.sin(k.heading) * k.speed * dt;
      const seg = k.L / (PD_N - 1);
      for (let j = 1; j < PD_N; j++) { const ax = k.n[j * 2 - 2], ay = k.n[j * 2 - 1], dx = k.n[j * 2] - ax, dy = k.n[j * 2 + 1] - ay, dl = Math.hypot(dx, dy) || 1; k.n[j * 2] = ax + dx / dl * seg; k.n[j * 2 + 1] = ay + dy / dl * seg; }
    }
    /* minnows: a little school logic, wary of koi and of you */
    const F = this._fish, R2 = 55 * 55;
    for (const f of F) {
      let ax = 0, ay = 0, n = 0, cx = 0, cy = 0, vx = 0, vy = 0, al = 0;
      const sp = Math.hypot(f.vx, f.vy) || 1, hx = f.vx / sp, hy = f.vy / sp;
      for (const o of F) {
        if (o === f) continue;
        const dx = o.x - f.x, dy = o.y - f.y, d2 = dx * dx + dy * dy;
        if (d2 > R2 || d2 < 1e-4) continue;
        const d = Math.sqrt(d2);
        if ((dx * hx + dy * hy) / d < -.6) continue; /* the blind spot behind */
        const qx = dx / (this._cw * 1.8 * (1 + f.alarm)), qy = dy / (this._ch * 1.1 * (1 + f.alarm)), q2 = qx * qx + qy * qy;
        if (q2 < 1) { const q = Math.sqrt(q2) || .001; ax -= qx / q * (1 - q) * 420; ay -= qy / q * (1 - q) * 420; }
        n++; cx += dx; cy += dy; vx += o.vx; vy += o.vy; al = Math.max(al, o.alarm);
      }
      if (n) { ax += (vx / n - f.vx) * 1.4 + cx / n * 1; ay += (vy / n - f.vy) * 1.4 + cy / n * 1; f.alarm = Math.max(f.alarm, al * .8); }
      /* koi heads are trouble; so is the cursor */
      for (const k of this._koi) { const dx = f.x - k.n[0], dy = f.y - k.n[1], d = Math.hypot(dx, dy), R = k.L * .32; if (d < R && d > .1) { const s = (1 - d / R) * 1100; ax += dx / d * s; ay += dy / d * s; f.alarm = Math.max(f.alarm, .6); } }
      if (ptr.in) { const dx = f.x - ptr.x, dy = f.y - ptr.y, d = Math.hypot(dx, dy); if (d < 110 && d > .1) { const s = (1 - d / 110) * 900; ax += dx / d * s; ay += dy / d * s; f.alarm = Math.max(f.alarm, .5); } }
      const m = 30;
      if (f.x < m) ax += (m - f.x) * 30; if (f.x > W - m) ax -= (f.x - W + m) * 30; if (f.y < m) ay += (m - f.y) * 30; if (f.y > H - m) ay -= (f.y - H + m) * 30;
      ax += (Math.random() - .5) * 60; ay += (Math.random() - .5) * 40;
      const pa = Math.atan2(f.vy, f.vx);
      f.vx += ax * dt; f.vy += ay * dt; f.vy *= Math.pow(.5, dt);
      const s2 = Math.hypot(f.vx, f.vy) || 1, v2 = clamp(s2, 24, 40 + f.alarm * 90);
      f.vx = f.vx / s2 * v2; f.vy = f.vy / s2 * v2;
      let da = Math.atan2(f.vy, f.vx) - pa; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
      f.turn += (da / dt - f.turn) * Math.min(1, dt * 8);
      f.alarm *= Math.exp(-dt * .7);
      f.x += f.vx * dt; f.y += f.vy * dt;
    }
    /* food sinks away; pads drift and the wake pushes them */
    for (const f of this._food) f.age += dt;
    this._food = this._food.filter(f => f.age < 10);
    const E = this._energy, cols = this._cols, rows = this._rows;
    for (const p of this._pads) {
      const i = this._cell(p.x, p.y);
      if (i > cols && i < E.length - cols - 1) { p.vx += (E[i - 1] - E[i + 1]) * 40 * dt; p.vy += (E[i - cols] - E[i + cols]) * 40 * dt; }
      p.vx *= Math.pow(.6, dt); p.vy *= Math.pow(.6, dt); p.rot += p.vx * .002;
      p.x += (p.vx + Math.sin(t * .1 + p.r) * 2) * dt; p.y += p.vy * dt;
      if (p.x < -p.r) p.x = W + p.r; if (p.x > W + p.r) p.x = -p.r; if (p.y < -p.r) p.y = H + p.r; if (p.y > H + p.r) p.y = -p.r;
    }
    /* the wake: where things swim, the water stirs; it spreads and fades */
    for (const f of F) { const i = this._cell(f.x, f.y); if (i >= 0) E[i] = Math.min(1.6, E[i] + .012 + f.alarm * .03); }
    for (const k of this._koi) for (let j = PD_N - 7; j < PD_N; j++) { const i = this._cell(k.n[j * 2], k.n[j * 2 + 1]); if (i >= 0) E[i] = Math.min(1.6, E[i] + .045 + k.speed * .0012); }
    if (ptr.in) this._stampAt(E, ptr.x, ptr.y, 1, .06);
    const T = this._tmp, decay = Math.exp(-dt * 1.5);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      T[i] = (E[i] * 4 + (c > 0 ? E[i - 1] : E[i]) + (c < cols - 1 ? E[i + 1] : E[i]) + (r > 0 ? E[i - cols] : E[i]) + (r < rows - 1 ? E[i + cols] : E[i])) * .125 * decay;
    }
    this._energy = T; this._tmp = E;
    const hd = Math.exp(-dt * 2.2), Ht = this._heat;
    for (let i = 0; i < Ht.length; i++) Ht[i] *= hd;
  }

  /* ---------- one koi, sampled at a point ---------- */
  /* the nearest spine segment: a full search, or (given a hint from the cell next door) a walk
     downhill from the hint, which finds the same answer in a handful of steps */
  _sample(k, px, py, sp, arc, out, j0 = -1) {
    const L = k.L, last = PD_N - 2;
    let bj = 0, best = 1e18;
    if (j0 < 0) { for (let j = 0; j <= last; j++) { const d = pdSegD(sp, j, px, py); if (d < best) { best = d; bj = j; } } }
    else {
      bj = clamp(j0, 0, last); best = pdSegD(sp, bj, px, py);
      for (let dir = -1; dir <= 1; dir += 2) for (let j = bj + dir; j >= 0 && j <= last; j += dir) { const d = pdSegD(sp, j, px, py); if (d < best) { best = d; bj = j; } else break; }
    }
    let bs, sign, nx, ny;
    {
      const j = bj, ax = sp[j * 2], ay = sp[j * 2 + 1], sx = sp[j * 2 + 2] - ax, sy = sp[j * 2 + 3] - ay, l2 = sx * sx + sy * sy || 1, ln = Math.sqrt(l2);
      const u = clamp(((px - ax) * sx + (py - ay) * sy) / l2, 0, 1);
      bs = (arc[j] + u * ln) / arc[PD_N - 1]; sign = sx * (py - ay) - sy * (px - ax) >= 0 ? 1 : -1; nx = -sy / ln * sign; ny = sx / ln * sign;
    }
    const a = Math.sqrt(best), s = bs, w = pdWidth(s) * L;
    out.s = s; out.v = a * sign; out.d = a; out.j = bj; out.in = a < w * .62 && s > .02 && s < .9;
    /* nothing on a koi (fins, tail) reaches further than this from its spine */
    if (a > L * .27) return false;
    if (a <= w && s < .985) {
      const across = a / (w || 1);
      const facing = (nx * -.6 + ny * -.8) * across;
      let shade = .62 - across * across * .44 + facing * .24, flag = PD_BODY;
      if (s > .24 && s < .6 && across < .16) { flag = PD_RIDGE; shade = Math.max(shade, .9); }
      else if (s > .072 && s < .092 && across > .58 && across < .8) { flag = PD_EYE; shade = 0; }
      else if (s < .03) shade = Math.max(shade, .66);
      out.flag = flag; out.shade = clamp(shade, 0, 1); out.vn = across * sign;
      return true;
    }
    /* paddle fins: rounded, a pair behind the head and a smaller pair mid-body, banking into turns */
    const u = s * L, bank = clamp(k.turn * .35, -.3, .3), flex = 1 + .12 * Math.sin(k.phase * .9);
    for (let fi = 0; fi < 6; fi += 3) {
      const s0 = PD_FINS[fi], reach = PD_FINS[fi + 1], rr = PD_FINS[fi + 2];
      const len = L * reach * flex * (1 - bank * sign), root = pdWidth(s0) * L;
      const cu = s0 * L + len * .42, cv = root + len * .42, eu = (u - cu) / (len * .55), ev = (a - cv) / (len * rr);
      if (a > root * .6 && eu * eu + ev * ev < 1) { out.flag = PD_FINF; out.shade = .3 + .3 * (1 - (a - root) / len); out.vn = 0; return true; }
    }
    /* the tail: a long forked veil past the wrist, rippling */
    const T = k.tail, bx = T[0], by = T[1], ux = T[2], uy = T[3];
    const qx = px - bx, qy = py - by, along = qx * ux + qy * uy, cross = -qx * uy + qy * ux, F = L * .22;
    if (along > 0 && along < F) {
      const t = along / F, spread = (L * .02 + along * .55) * (1 + .1 * Math.sin(k.phase * 2 - t * 6)), fork = t > .62 && Math.abs(cross) < (t - .62) * F * .9;
      if (Math.abs(cross) < spread && !fork) { out.flag = PD_TAIL; out.shade = .45 * (1 - t) + .15; out.s = .95; out.vn = cross / spread; return true; }
    }
    return false;
  }

  /* ---------- drawing ---------- */
  _draw() {
    const g = this._g, cw = this._cw, ch = this._ch, cols = this._cols, rows = this._rows, dpr = this._dpr, t = this._t, P = this._P;
    const flag = this._flag, shade = this._shade, key = this._key, rgb = this._rgb, dim = this._dim, kindAt = this._kindAt, shadow = this._shadow, padAt = this._padAt;
    flag.fill(0); shadow.fill(0); padAt.fill(0);
    const out = {}, sp = new Float32Array(PD_N * 2), arc = new Float32Array(PD_N);
    /* koi, far ones first so the near ones swim over them */
    for (const k of this._koi) {
      const L = k.L, n = k.n, swim = clamp(k.speed / 40, .4, 1.4);
      /* the travelling body wave, growing toward the tail */
      for (let j = 0; j < PD_N; j++) {
        const s = j / (PD_N - 1), a = Math.max(0, j - 1), b = Math.min(PD_N - 1, j + 1);
        let tx = n[a * 2] - n[b * 2], ty = n[a * 2 + 1] - n[b * 2 + 1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const off = L * .055 * (.1 + .9 * Math.pow(s, 1.7)) * swim * Math.sin(k.phase - s * 5);
        sp[j * 2] = n[j * 2] - ty * off; sp[j * 2 + 1] = n[j * 2 + 1] + tx * off;
      }
      arc[0] = 0;
      for (let j = 1; j < PD_N; j++) arc[j] = arc[j - 1] + Math.hypot(sp[j * 2] - sp[j * 2 - 2], sp[j * 2 + 1] - sp[j * 2 - 1]);
      /* the tail's root and direction, once per frame */
      { const tj = Math.round((PD_N - 1) * .86), bx = sp[tj * 2], by = sp[tj * 2 + 1], dx = sp[(PD_N - 1) * 2] - bx, dy = sp[(PD_N - 1) * 2 + 1] - by, dl = Math.hypot(dx, dy) || 1; k.tail = [bx, by, dx / dl, dy / dl]; }
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let j = 0; j < PD_N; j++) { x0 = Math.min(x0, sp[j * 2]); x1 = Math.max(x1, sp[j * 2]); y0 = Math.min(y0, sp[j * 2 + 1]); y1 = Math.max(y1, sp[j * 2 + 1]); }
      const reach = L * .3, c0 = Math.max(0, Math.floor((x0 - reach) / cw)), c1 = Math.min(cols - 1, Math.floor((x1 + reach) / cw)), r0 = Math.max(0, Math.floor((y0 - reach) / ch)), r1 = Math.min(rows - 1, Math.floor((y1 + reach) / ch));
      const pat = PD_KOI[k.kind] || PD_KOI.kohaku, kdim = .8 + .2 * k.depth, skip = L * .3 + Math.hypot(cw, ch);
      const sdc = Math.round(L * .04 / cw) + 1, sdr = Math.round(L * .025 / ch) + 1;
      /* only the cells that could be on this koi: a band round the spine, as wide as what is there
         (the body, plus the fins where they are, plus the tail fan at the end) */
      const cand = this._candOf && this._candOf.length === cols * rows ? this._candOf : (this._candOf = new Uint32Array(cols * rows)), list = this._list || (this._list = []), id = this._candId = (this._candId || 0) + 1;
      list.length = 0;
      const diag = Math.hypot(cw, ch);
      for (let j = 0; j < PD_N; j++) {
        const s = j / (PD_N - 1), R = pdWidth(s) * L + (s > .12 && s < .38 ? .14 * L : s > .46 && s < .66 ? .08 * L : 0) + (s > .78 ? .27 * L : 0) + diag;
        const px = sp[j * 2], py = sp[j * 2 + 1];
        const ca = Math.max(c0, Math.floor((px - R) / cw)), cb = Math.min(c1, Math.floor((px + R) / cw)), ra = Math.max(r0, Math.floor((py - R) / ch)), rb = Math.min(r1, Math.floor((py + R) / ch));
        for (let r = ra; r <= rb; r++) for (let c = ca; c <= cb; c++) { const i = r * cols + c; if (cand[i] !== id) { cand[i] = id; list.push(i); } }
      }
      let hint = -1;
      for (const ci of list) {
        const c = ci % cols, r = (ci / cols) | 0, x = c * cw, y = r * ch;
        const hit = this._sample(k, x + cw / 2, y + ch / 2, sp, arc, out, hint);
        hint = out.j;
        if (!hit && out.d > skip) continue;
        const f0 = out.flag, s0 = out.shade, ss = out.s, vn = out.vn || 0, vv = out.v, j0 = out.j;
        let hits = hit ? 1 : 0;
        /* deep inside the body the cell is surely covered; only the rim needs supersampling */
        if (hit && out.in) hits = 5;
        else for (let q = 0; q < PD_SUB.length; q += 2) if (this._sample(k, x + PD_SUB[q] * cw, y + PD_SUB[q + 1] * ch, sp, arc, out, j0)) hits++;
        if (!hits) continue;
        const i = r * cols + c, cov = hits / 5;
        /* glyph keys anchored to the skin, so the texture rides along with the koi */
        key[i] = (pdHash(Math.round(ss * 60), Math.round(vv / (cw * .9)), k.id) * 4294967295) >>> 0;
        const col = pat(ss, clamp(vn, -1, 1), k.seed);
        rgb[i] = (col[0] << 16) | (col[1] << 8) | col[2];
        dim[i] = kdim; kindAt[i] = k.ki;
        if (hit && cov >= .6) {
          flag[i] = f0; shade[i] = clamp(s0 + (pdHash(c, r, Math.floor(t * 6)) - .5) * .06, 0, 1);
          if (f0 !== PD_FINF && f0 !== PD_TAIL) { const sc = c + sdc, sr = r + sdr; if (sc < cols && sr < rows) shadow[sr * cols + sc] = 1; }
        } else { flag[i] = PD_EDGE; shade[i] = cov; }
      }
    }
    /* lily pads and lotus, floating on top */
    for (const p of this._pads) {
      const c0 = Math.max(0, Math.floor((p.x - p.r) / cw)), c1 = Math.min(cols - 1, Math.ceil((p.x + p.r) / cw)), r0 = Math.max(0, Math.floor((p.y - p.r) / ch)), r1 = Math.min(rows - 1, Math.ceil((p.y + p.r) / ch));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        let hits = 0, cd = 0, ca = 0;
        for (let q = -2; q < PD_SUB.length; q += 2) {
          const sx = q < 0 ? .5 : PD_SUB[q], sy = q < 0 ? .5 : PD_SUB[q + 1], x = (c + sx) * cw - p.x, y = (r + sy) * ch - p.y, d = Math.hypot(x, y) / p.r;
          let a = Math.atan2(y, x) - p.rot; a = Math.atan2(Math.sin(a), Math.cos(a));
          if (d <= 1 && !(Math.abs(a) < .28 * (1 - d * .3) && d > .1)) { hits++; if (q < 0) { cd = d; ca = a; } }
        }
        if (!hits) continue;
        const i = r * cols + c;
        padAt[i] = hits >= 3 ? (Math.abs(Math.sin(ca * 4)) < .1 && cd > .18 ? 3 : 1) : 2;
        shade[i] = .5 + .5 * (1 - cd) - (ca > 0 ? .08 : 0);
        key[i] = (pdHash(c, r, 91) * 4294967295) >>> 0;
        /* the lotus: pink petals round a gold heart */
        if (p.lotus && cd < .3 && hits >= 3) padAt[i] = cd < .1 ? 5 : 4;
      }
    }
    /* minnows into cells: near ones first, a fish per cell */
    const stamp = ++this._stamp, fishAt = this._fishAt, buckets = [[], [], [], [], []];
    for (let pass = 0; pass < 2; pass++) for (const f of this._fish) {
      if ((f.depth > .78 ? 0 : 1) !== pass) continue;
      const i = this._cell(f.x, f.y);
      if (i < 0 || fishAt[i] === stamp || flag[i] || padAt[i]) continue;
      fishAt[i] = stamp;
      const glint = clamp(Math.abs(f.turn) / 3.5, 0, 1), v = .3 + .4 * (f.depth - .55) / .45 + .3 * Math.max(glint, f.alarm);
      buckets[clamp(Math.floor(v * 5), 0, 4)].push(i);
    }
    /* ---------- paint ---------- */
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(this._bg, 0, 0); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* the wake: small cyan squares, low in each cell */
    const E = this._energy, sm = Math.max(2, Math.round(cw * .19)), lg = sm + 1, levels = [[], [], [], [], [], []];
    for (let i = 0; i < E.length; i++) { const e = E[i]; if (e < .45 || flag[i] || padAt[i] || shadow[i] || fishAt[i] === stamp) continue; levels[clamp(Math.floor((e - .45) * 5), 0, 5)].push(i); }
    levels.forEach((lv, l) => { if (!lv.length) return; g.fillStyle = `rgba(${P.wake},${((l + 1) / 6 * (P.light ? .8 : 1)).toFixed(3)})`; for (const i of lv) g.fillRect(Math.round((i % cols) * cw + cw * .66 - lg / 2), Math.round(((i / cols) | 0) * ch + ch * .64 - lg / 2), lg, lg); });
    /* food, sinking: warm specks */
    for (const f of this._food) { const i = this._cell(f.x, f.y); if (i < 0 || flag[i] || padAt[i]) continue; g.fillStyle = `rgba(${P.food},${(1 - f.age / 10).toFixed(2)})`; g.fillRect(Math.round((i % cols) * cw + cw * .5 - sm), Math.round(((i / cols) | 0) * ch + ch * .5 - sm), sm * 2, sm * 2); }
    g.font = `600 ${Math.round(ch * .74)}px ui-monospace,"SF Mono","Cascadia Mono",Menlo,Consolas,monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    /* where something was eaten, a warm flare */
    const Ht = this._heat;
    for (let i = 0; i < Ht.length; i++) { const h = Ht[i]; if (h < .08 || flag[i] || padAt[i]) continue; g.fillStyle = `rgba(${P.heat},${Math.min(1, h * 1.6).toFixed(2)})`; g.fillText(h > .6 ? '*' : '·', (i % cols) * cw + cw / 2, ((i / cols) | 0) * ch + ch / 2 + 1); }
    /* minnows: a dash each, brighter when near or turning */
    const FA = [.28, .42, .58, .74, .9];
    buckets.forEach((b, l) => { if (!b.length) return; g.fillStyle = `rgba(${P.fish},${FA[l]})`; for (const i of b) g.fillText('-', (i % cols) * cw + cw / 2, ((i / cols) | 0) * ch + ch / 2 + 1); });
    /* koi */
    for (let i = 0; i < flag.length; i++) {
      const fl = flag[i];
      if (!fl || padAt[i]) continue;
      const x = (i % cols) * cw, y = ((i / cols) | 0) * ch, kk = key[i], sh = shade[i], dm = dim[i];
      const R = rgb[i] >> 16 & 255, G = rgb[i] >> 8 & 255, B = rgb[i] & 255;
      const roll = pdHash(kk, Math.floor(t * 2.4 + (kk % 997) / 97), 7);
      if (fl === PD_EDGE) {
        /* the silhouette, anti-aliased: a light glyph, no block */
        const set = sh >= .5 ? PD_EDGE_HI : PD_EDGE_LO, l = (P.light ? .45 + sh * .2 : .35 + sh * .45) * dm;
        g.fillStyle = `rgb(${R * l | 0},${G * l | 0},${B * l | 0})`;
        g.fillText(set[(kk >>> 8) % set.length], x + cw / 2, y + ch / 2 + 1);
        continue;
      }
      if (fl === PD_FINF || fl === PD_TAIL) {
        /* fins: a veil of the koi's colour over the water */
        const l = (P.light ? .55 : .5 + sh * .45) * dm;
        g.fillStyle = `rgba(${Math.min(255, R * l) | 0},${Math.min(255, G * l) | 0},${Math.min(255, B * l) | 0},${P.light ? .8 : .7})`;
        g.fillText(PD_FIN[(kk >>> 8) % PD_FIN.length], x + cw / 2, y + ch / 2 + 1);
        continue;
      }
      let l, glyph;
      if (fl === PD_EYE) { l = .07; glyph = 'o'; }
      else if (fl === PD_RIDGE) { l = .95; glyph = '@8%'[(kk >>> 8) % 3]; }
      else { l = .3 + sh * .72; glyph = PD_SKIN[clamp(Math.floor((1 - sh) * 8.99) + ((kk >>> 4) % 3) - 1, 0, 8)]; }
      l *= dm;
      g.fillStyle = `rgb(${Math.min(255, R * l) | 0},${Math.min(255, G * l) | 0},${Math.min(255, B * l) | 0})`;
      g.fillRect(x + 1, y + 1, cw - 1, ch - 1);
      /* the glyph cut into the block: darker, now and then a scale catching the light */
      const gl = PD_GLINT[kindAt[i]] || .05;
      g.fillStyle = fl === PD_EYE ? '#9aa0ad' : roll < gl ? '#ffffff' : roll < gl + .04 ? `rgb(${Math.min(255, R * 1.2) | 0},${Math.min(255, G * 1.2) | 0},${Math.min(255, B * 1.2) | 0})` : `rgb(${R * l * .38 | 0},${G * l * .38 | 0},${B * l * .38 | 0})`;
      g.fillText(glyph, x + cw / 2, y + ch / 2 + 1);
    }
    /* pads and lotus over everything */
    for (let i = 0; i < padAt.length; i++) {
      const p = padAt[i];
      if (!p) continue;
      const x = (i % cols) * cw, y = ((i / cols) | 0) * ch, sh = shade[i], kk = key[i];
      if (p === 2) { g.fillStyle = `rgb(${46 * sh | 0},${118 * sh | 0},${62 * sh | 0})`; g.fillText(PD_EDGE_HI[kk % 2], x + cw / 2, y + ch / 2 + 1); continue; }
      if (p >= 4) {
        const l = .7 + sh * .3;
        g.fillStyle = p === 5 ? '#f2c14e' : `rgb(${236 * l | 0},${132 * l | 0},${168 * l | 0})`; g.fillRect(x + 1, y + 1, cw - 1, ch - 1);
        g.fillStyle = p === 5 ? '#7a4a12' : '#fff1f6'; g.fillText(p === 5 ? '*' : '%@*'[kk % 3], x + cw / 2, y + ch / 2 + 1);
        continue;
      }
      const l = .55 + sh * .5;
      g.fillStyle = `rgb(${38 * l | 0},${112 * l | 0},${58 * l | 0})`; g.fillRect(x + 1, y + 1, cw - 1, ch - 1);
      g.fillStyle = p === 3 ? `rgb(${120 * l | 0},${200 * l | 0},${120 * l | 0})` : `rgb(${14 * l | 0},${44 * l | 0},${22 * l | 0})`;
      g.fillText(p === 3 ? '-' : PD_SKIN[clamp(Math.floor((1 - sh) * 6) + 2 + (kk % 2), 0, 8)], x + cw / 2, y + ch / 2 + 1);
    }
  }
}
define('piix-pond', PiixPondElement);
ELEMENTS.pond = 'piix-pond';
