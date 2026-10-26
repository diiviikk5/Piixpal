/* POND: a koi pond drawn in ASCII.   @component pond  @needs aqua
 *
 *   <div style="height:420px"><piix-pond></piix-pond></div>
 *
 * The element it's in becomes a pond: dark water, shimmering, with lily pads drifting on top.
 * Koi swim under them: real koi, with spines that bend as they swim, sweeping tails, flapping
 * fins and the classic patterns (kohaku, sanke, showa, ogon, asagi, tancho, chagoi), shaded in
 * glyphs. Click and the water ripples out from your finger, a few pellets of food sink, and the
 * koi race for them and gulp them down. Keep the cursor still over the water and they gather
 * under it, mouths up, hoping. Drag across the water to draw ripples.
 *
 *   koi       how many, 1 to 12                                  default: 5
 *   pads      lily pads, 0 to 10                                 default: 4
 *   kinds     which koi, comma separated                         default: a mix
 *   theme     night | day | ink                                  default: night
 *   cell      glyph size, px                                     default: 10 */
const POND_THEMES = {
  night: { bg: [5, 18, 26], dot: [70, 150, 170], ripple: [170, 235, 245], pad: [52, 140, 78], padHi: [110, 200, 110] },
  day: { bg: [14, 64, 72], dot: [120, 205, 210], ripple: [225, 255, 250], pad: [60, 160, 80], padHi: [140, 220, 120] },
  ink: { bg: [12, 10, 16], dot: [110, 100, 140], ripple: [230, 225, 245], pad: [70, 120, 90], padHi: [140, 190, 150] }
};
/* koi patterns: colour at s (head 0 .. tail 1), v (across the back, -1 .. 1) */
const KOI = {
  kohaku: (s, v, n) => n(s * 3.2, v * 1.3) > .52 && s < .86 ? [226, 58, 38] : [244, 240, 230],
  sanke: (s, v, n) => n(s * 9, v * 3, 7) > .8 ? [72, 68, 84] : n(s * 3.2, v * 1.3) > .55 && s < .86 ? [226, 58, 38] : [244, 240, 230],
  showa: (s, v, n) => n(s * 3, v * 1.2) > .5 && s < .9 ? [222, 60, 34] : n(s * 4, v * 1.6, 3) > .62 ? [244, 240, 230] : [72, 68, 84],
  ogon: (s, v, n, t) => { const k = 30 * Math.sin(t * 2 + s * 9 + v * 2); return [236 + k * .3, 186 + k, 66 + k * .5]; },
  asagi: (s, v) => (Math.abs(v) > .62 || s < .06 ? [234, 118, 48] : [104 + 20 * Math.abs(v), 138, 172]),
  tancho: (s, v) => (s > .03 && s < .14 && Math.abs(v) < .62 ? [226, 40, 40] : [246, 244, 238]),
  chagoi: (s, v, n) => { const k = n(s * 6, v * 2) * 40; return [160 + k, 110 + k * .6, 64]; }
};
const POND_RAMP = ':;=+x%#8@';

class PiixPondElement extends HTMLElement {
  constructor() { super(); this._loop = (dt, t) => this._tick(dt, t / 1000); }
  connectedCallback() {
    const box = this._box = this.parentElement || document.body;
    if (box !== document.body && getComputedStyle(box).position === 'static') box.style.position = 'relative';
    Object.assign(this.style, { position: box === document.body ? 'fixed' : 'absolute', inset: '0', display: 'block', overflow: 'hidden', borderRadius: 'inherit', touchAction: 'none', cursor: 'crosshair' });
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', 'A koi pond: click to feed the koi');
    if (!this._cv) { this._cv = document.createElement('canvas'); this._cv.style.display = 'block'; this.appendChild(this._cv); }
    this._grid = new AQGrid(this._cv, +this.getAttribute('cell') || 10);
    this._ripple = new AQField();
    this._food = []; this._bubbles = []; this._ptr = null; this._still = 0;
    this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(box);
    this._io = new IntersectionObserver(([e]) => { this._vis = e.isIntersecting; if (this._vis) sub(this._loop); else unsub(this._loop); });
    this._io.observe(this);
    this._down = e => this._poke(e, true); this._move = e => this._poke(e, false); this._leave = () => { this._ptr = null; };
    this.addEventListener('pointerdown', this._down); this.addEventListener('pointermove', this._move); this.addEventListener('pointerleave', this._leave);
    this._resize();
  }
  disconnectedCallback() { unsub(this._loop); this._ro && this._ro.disconnect(); this._io && this._io.disconnect(); }
  _resize() {
    const r = this.getBoundingClientRect(), w = Math.max(60, r.width), h = Math.max(60, r.height);
    this._grid.resize(w, h);
    this._ripple.resize(this._grid.cols, this._grid.rows);
    this._w = w; this._h = h;
    if (!this._koi) this._spawn();
    else for (const k of this._koi) { k.head.x = clamp(k.head.x, 20, w - 20); k.head.y = clamp(k.head.y, 20, h - 20); k.follow(); }
    if (!this._vis || reduced()) this._tick(0, performance.now() / 1000);
  }
  _spawn() {
    const w = this._w, h = this._h, n = clamp(+this.getAttribute('koi') || 5, 1, 12);
    const kinds = (this.getAttribute('kinds') || '').split(',').map(s => s.trim()).filter(k => KOI[k]);
    const mix = kinds.length ? kinds : ['kohaku', 'ogon', 'showa', 'asagi', 'sanke', 'tancho', 'chagoi'];
    const L = clamp(Math.min(w, h) * .4, 90, 230);
    this._koi = Array.from({ length: n }, (_, i) => {
      const len = L * rnd(.8, 1.15), kind = mix[i % mix.length];
      /* koi are chunky: widest a third of the way down, a slim wrist before the tail */
      const k = new AQSpine({ x: rnd(len, w - len), y: rnd(len * .6, h - len * .6), len, nodes: 16, heading: rnd(0, 6.28), speed: rnd(34, 52), seed: i * 97 + 13, width: s => (s < .3 ? .04 + .075 * Math.sin(Math.PI / 2 * Math.pow(s / .3, .55)) : .115 * Math.pow(1 - (s - .3) / .7, 1.2) + .014) });
      k.kind = kind; k.target = null; k.wake = 0;
      return k;
    });
    const np = clamp(+(this.getAttribute('pads') ?? 4), 0, 10);
    this._pads = Array.from({ length: np }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(20, 38) * clamp(Math.min(w, h) / 420, .7, 1.4), rot: rnd(0, 6.28), vx: rnd(-3, 3), vy: rnd(-2, 2), flower: chance(.35) }));
  }
  /* the pointer in the water: a click feeds and splashes, a drag draws ripples, stillness invites */
  _poke(e, down) {
    const r = this.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, g = this._grid;
    const moved = !this._ptr || Math.hypot(x - this._ptr.x, y - this._ptr.y) > 3;
    this._ptr = { x, y, at: moved ? performance.now() : this._ptr.at };
    if (down) {
      e.preventDefault();
      this._ripple.add(x / g.cw, y / g.ch, 14);
      for (let i = 0; i < 3 + (Math.random() * 3 | 0); i++) this._food.push({ x: x + rnd(-22, 22), y: y + rnd(-14, 14), age: 0 });
      sfx('blip', this, { pitch: .55, gap: 80 });
    } else if (e.buttons) this._ripple.add(x / g.cw, y / g.ch, 4);
  }
  _tick(dt, t) {
    const g = this._grid, R = this._ripple, w = this._w, h = this._h, T = POND_THEMES[this.getAttribute('theme')] || POND_THEMES.night;
    if (!g.cols) return;
    const still = reduced() ? 0 : dt;
    /* ---------- the koi decide where to go ---------- */
    const ptr = this._ptr, begging = ptr && performance.now() - ptr.at > 900;
    const order = begging ? this._koi.slice().sort((a, b) => Math.hypot(a.head.x - ptr.x, a.head.y - ptr.y) - Math.hypot(b.head.x - ptr.x, b.head.y - ptr.y)) : [];
    for (const k of this._koi) {
      const hd = k.head;
      let tx, ty, sp = k.speed;
      /* food first: the nearest pellet */
      let food = null, fd = 1e9;
      for (const f of this._food) { const d = Math.hypot(f.x - hd.x, f.y - hd.y); if (d < fd) { fd = d; food = f; } }
      if (food && fd < Math.max(w, h)) { tx = food.x; ty = food.y; sp = k.speed * 2.6; if (fd < k.len * .12) { this._food.splice(this._food.indexOf(food), 1); k.gulp = 1; R.add(hd.x / g.cw, hd.y / g.ch, 6); for (let i = 0; i < 3; i++) this._bubbles.push({ x: hd.x + rnd(-6, 6), y: hd.y + rnd(-6, 6), age: -i * .15 }); } }
      else if (begging && order.indexOf(k) < 3) {
        const i = order.indexOf(k), a = i * 2.1 + t * .3;
        tx = ptr.x + Math.cos(a) * 28; ty = ptr.y + Math.sin(a) * 18; sp = k.speed * .9;
        if (Math.hypot(tx - hd.x, ty - hd.y) < 30 && chance(dt * .8)) this._bubbles.push({ x: hd.x, y: hd.y, age: 0 });
      } else {
        if (!k.target || Math.hypot(k.target.x - hd.x, k.target.y - hd.y) < k.len * .4) k.target = { x: rnd(w * .1, w * .9), y: rnd(h * .12, h * .88) };
        tx = k.target.x; ty = k.target.y;
      }
      /* keep out of each other's way */
      /* koi keep their distance: from every other koi's body, not just its head */
      for (const o of this._koi) if (o !== k) for (let j = 0; j < o.n; j += 3) { const p = o.pts[j], dx = hd.x - p.x, dy = hd.y - p.y, d = Math.hypot(dx, dy); if (d < k.len * .55 && d > 0) { const f = (1 - d / (k.len * .55)) * 160; tx += dx / d * f; ty += dy / d * f; } }
      /* the walls */
      const m = k.len * .35;
      if (hd.x < m) tx = Math.max(tx, w * .5); if (hd.x > w - m) tx = Math.min(tx, w * .5);
      if (hd.y < m * .7) ty = Math.max(ty, h * .5); if (hd.y > h - m * .7) ty = Math.min(ty, h * .5);
      if (still) k.steer(tx, ty, dt, sp, food ? 3.4 : 2);
      k.gulp = Math.max(0, k.gulp - dt * 2);
      /* a koi near the surface stirs it */
      if (still && (k.wake -= dt) <= 0) { k.wake = .35; R.add(hd.x / g.cw, hd.y / g.ch, .55); }
    }
    /* food sinks and fades; bubbles rise and pop */
    for (const f of this._food) f.age += dt;
    this._food = this._food.filter(f => f.age < 9);
    for (const b of this._bubbles) b.age += dt;
    this._bubbles = this._bubbles.filter(b => b.age < 1.1);
    /* pads drift, and ripples push them */
    for (const p of this._pads) {
      const c = p.x / g.cw, r = p.y / g.ch, gx = R.get(c + 2, r) - R.get(c - 2, r), gy = R.get(c, r + 2) - R.get(c, r - 2);
      p.vx += (-gx * 30 - p.vx * .3) * dt; p.vy += (-gy * 30 - p.vy * .3) * dt; p.rot += (p.vx * .01) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < -p.r) p.x = w + p.r; if (p.x > w + p.r) p.x = -p.r; if (p.y < -p.r) p.y = h + p.r; if (p.y > h + p.r) p.y = -p.r;
    }
    if (still) R.wave(.975);

    /* ---------- drawing, layer by layer into a cell buffer ---------- */
    const cols = g.cols, rows = g.rows, N = cols * rows;
    if (!this._G || this._G.length !== N) { this._G = new Array(N); this._C = new Array(N); }
    const G = this._G, C = this._C;
    const [br, bg, bb] = T.bg, [dr, dg, db] = T.dot, [rr, rg, rb] = T.ripple;
    /* water: a dotted grid that shimmers with caustics, lit up by the ripples */
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, u = R.a[i] || 0, au = Math.abs(u);
      if (au > .22) {
        const k = Math.min(1, au / 3);
        G[i] = '.,:;=+*'[Math.min(6, (k * 7) | 0)];
        C[i] = aqColor(rr, rg, rb, .25 + k * .7);
      } else if ((c + r) % 2 === 0) {
        const ca = aqNoise(c * .16 + t * .35, r * .3 - t * .22, 1) * aqNoise(c * .09 - t * .2, r * .17 + t * .15, 2);
        G[i] = ca > .42 ? '·' : '.';
        C[i] = aqColor(dr, dg, db, .1 + ca * .55);
      } else G[i] = null;
    }
    /* koi */
    const nz = (x, y, z = 0) => aqNoise(x, y, z);
    for (const k of this._koi) {
      const pat = KOI[k.kind] || KOI.kohaku, seed = k.seed;
      k.draw(g, (c, r, s, v, part) => {
        const i = r * cols + c;
        if (part === 1) {
          const rgb = pat(s, v, (x, y, z = 0) => nz(x + seed, y + seed * .7, z), t);
          /* round body: lit along the spine, darker at the flanks, light from the top-left */
          const shade = clamp(.35 + .65 * (1 - v * v) - v * .12, 0, 1), lit = .5 + .5 * shade;
          G[i] = POND_RAMP[Math.min(POND_RAMP.length - 1, (shade * POND_RAMP.length) | 0)];
          C[i] = aqColor(rgb[0] * lit, rgb[1] * lit, rgb[2] * lit, 1);
        } else {
          /* fins: see-through, the koi's colour over the water */
          const rgb = pat(part === 2 ? .95 : .3, 0, (x, y, z = 0) => nz(x + seed, y + seed * .7, z), t);
          G[i] = part === 2 ? (Math.abs(v) > .6 ? '\'' : ':') : '.';
          C[i] = aqColor(rgb[0], rgb[1], rgb[2], .55);
        }
      });
      /* eyes, and a mouth that opens to gulp */
      const p0 = k.pts[0], p1 = k.pts[1], dx = p0.x - p1.x, dy = p0.y - p1.y, dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl, ew = k.width(.08) * k.len * .7;
      for (const sg of [-1, 1]) { const ex = ((p0.x - dx / dl * 4 + nx * ew * sg) / g.cw) | 0, ey = ((p0.y - dy / dl * 4 + ny * ew * sg) / g.ch) | 0; if (ex >= 0 && ey >= 0 && ex < cols && ey < rows) { G[ey * cols + ex] = '•'; C[ey * cols + ex] = aqColor(14, 12, 18, 1); } }
      if (k.gulp > 0) { const mx = ((p0.x + dx / dl * 5) / g.cw) | 0, my = ((p0.y + dy / dl * 5) / g.ch) | 0; if (mx >= 0 && my >= 0 && mx < cols && my < rows) { G[my * cols + mx] = 'O'; C[my * cols + mx] = aqColor(40, 20, 30, 1); } }
    }
    /* food, sinking */
    for (const f of this._food) { const c = (f.x / g.cw) | 0, r = (f.y / g.ch) | 0; if (c >= 0 && r >= 0 && c < cols && r < rows) { G[r * cols + c] = '•'; C[r * cols + c] = aqColor(214, 170, 104, 1 - f.age / 9); } }
    /* lily pads, on top: koi swim under them */
    const [pr, pg, pb] = T.pad, [hr, hg, hb] = T.padHi;
    for (const p of this._pads) {
      const c0 = Math.floor((p.x - p.r) / g.cw), c1 = Math.ceil((p.x + p.r) / g.cw), r0 = Math.floor((p.y - p.r) / g.ch), r1 = Math.ceil((p.y + p.r) / g.ch);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        const x = (c + .5) * g.cw - p.x, y = (r + .5) * g.ch - p.y, d = Math.hypot(x, y) / p.r;
        if (d > 1) continue;
        let a = Math.atan2(y, x) - p.rot; a = Math.atan2(Math.sin(a), Math.cos(a));
        if (Math.abs(a) < .3 && d > .12) continue; /* the notch */
        const i = r * cols + c, edge = d > .78, vein = Math.abs(Math.sin(a * 4)) < .12 && d > .2;
        G[i] = edge ? '%' : vein ? '-' : '@';
        C[i] = edge ? aqColor(pr * .8, pg * .8, pb * .8, 1) : aqColor(vein ? hr : pr + (hr - pr) * (1 - d) * .5, vein ? hg : pg + (hg - pg) * (1 - d) * .5, vein ? hb : pb + (hb - pb) * (1 - d) * .5, 1);
      }
      if (p.flower) {
        const c = (p.x / g.cw) | 0, r = (p.y / g.ch) | 0;
        for (const [dc, dr2, ch2, col] of [[0, 0, '*', [255, 220, 90]], [-1, 0, '(', [255, 150, 190]], [1, 0, ')', [255, 150, 190]], [0, -1, '^', [255, 190, 215]]]) {
          const cc = c + dc, rr2 = r + dr2;
          if (cc >= 0 && rr2 >= 0 && cc < cols && rr2 < rows) { G[rr2 * cols + cc] = ch2; C[rr2 * cols + cc] = aqColor(col[0], col[1], col[2], 1); }
        }
      }
    }
    /* bubbles, on top of everything */
    for (const b of this._bubbles) { if (b.age < 0) continue; const c = (b.x / g.cw) | 0, r = ((b.y - b.age * 10) / g.ch) | 0; if (c >= 0 && r >= 0 && c < cols && r < rows) { G[r * cols + c] = b.age < .5 ? 'o' : b.age < .85 ? '°' : '·'; C[r * cols + c] = aqColor(220, 245, 250, 1 - b.age * .7); } }
    for (let i = 0; i < N; i++) if (G[i]) g.put(i % cols, (i / cols) | 0, G[i], C[i]);
    g.flush(`rgb(${br},${bg},${bb})`);
  }
}
define('piix-pond', PiixPondElement);
ELEMENTS.pond = 'piix-pond';
