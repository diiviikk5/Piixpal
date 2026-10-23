/* WYRM: a long pixel dragon that swims through your page.   @component wyrm
 *
 *   <piix-pal pal="wyrm"></piix-pal>          or   <piix-wyrm></piix-wyrm>
 *
 * A serpent dragon three hundred pixels long, every one of its segments following the one in
 * front, so it moves like it has a spine: scales, a rippling mane, little paddling legs, horns,
 * glowing eyes and whiskers that stream behind it. It swims lazy loops round your cursor. Now and
 * then it coils itself around one of your headings. Click and it turns and breathes fire at the
 * spot; poke its body and it flinches and darts off. Leave it alone and it curls up and sleeps
 * until you come close.
 *
 * Inside an element it stays in that element; anywhere else it has the whole screen.
 *
 *   color     jade | ember | void | frost | gold                  default: jade
 *   size      0.5 to 2                                             default: 1
 *   pixel     size of one pixel, px                                default: 3
 *   wrap      CSS selector for what it likes to coil around        default: h1, h2
 *   fire      off: no fire on click
 *   sound     make sounds even without <piix-chiptune> ("off" to stay silent)
 *
 *   events: breathe, sleep, wake */
/* ink, body dark, body, body light, belly/highlight, mane, mane tip, horn, eye */
const WYRM_SKINS = {
  jade: ['#0b1a14', '#10664a', '#1fae78', '#5fe0a6', '#c8ffe2', '#ff4f8b', '#ffc0d6', '#f2e6c4', '#fff6a0'],
  ember: ['#1a0806', '#7a1a0e', '#c8361c', '#ff7a3a', '#ffd38a', '#ffd23f', '#fff4c0', '#2a1a14', '#ffffff'],
  void: ['#07040f', '#2a1260', '#4f2bb5', '#8b6bff', '#d9ccff', '#c6f432', '#efffc0', '#e6e0ff', '#c6f432'],
  frost: ['#06121c', '#1d5f8f', '#3fa3d9', '#8fdcff', '#eafaff', '#ffffff', '#c9f2ff', '#cfe8ff', '#7ff6ff'],
  gold: ['#1a1204', '#8a5a0c', '#d9a21b', '#ffd65a', '#fff3c4', '#ff4f4f', '#ffd0d0', '#fffbe8', '#ff4f4f']
};
class PiixWyrmElement extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._loop = dt => this._tick(dt); }
  connectedCallback() {
    const par = this.parentElement;
    this._box = par && par !== document.body && par !== document.documentElement ? par : null;
    if (this._box && getComputedStyle(this._box).position === 'static') this._box.style.position = 'relative';
    this.setAttribute('aria-hidden', 'true');
    this.shadowRoot.innerHTML = `<style>:host{position:${this._box ? 'absolute' : 'fixed'};inset:0;pointer-events:none;z-index:2147482000;display:block}canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}</style><canvas></canvas>`;
    this._cv = this.shadowRoot.querySelector('canvas'); this._g = this._cv.getContext('2d');
    this._size();
    this._ro = new ResizeObserver(() => this._size()); this._ro.observe(this._box || document.documentElement);
    this._build();
    const at = e => { const a = this._area(); this._P = { x: e.clientX - a.left, y: e.clientY - a.top, t: now() }; };
    addEventListener('pointermove', this._pm = e => at(e), { passive: true, capture: true });
    addEventListener('pointerdown', this._pd = e => { at(e); this._click(); }, { passive: true, capture: true });
    this._io = new IntersectionObserver(([en]) => { en.isIntersecting ? sub(this._loop) : unsub(this._loop); });
    this._io.observe(this._box || document.body);
  }
  disconnectedCallback() {
    unsub(this._loop); this._ro.disconnect(); this._io.disconnect();
    removeEventListener('pointermove', this._pm, true); removeEventListener('pointerdown', this._pd, true);
  }
  _area() { return this._box ? this._box.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight }; }
  _size() {
    const a = this._area(), px = this._px = clamp(+this.getAttribute('pixel') || 3, 1, 8);
    this._W = a.width; this._H = a.height;
    this._cv.width = Math.ceil(a.width / px); this._cv.height = Math.ceil(a.height / px);
  }

  /* ---------- the body: a chain of segments, each keeping its distance from the one in front ---------- */
  _build() {
    const k = clamp(+this.getAttribute('size') || 1, .4, 2), N = 40;
    this._k = k; this._gap = 10.5 * k;
    const x0 = this._W * .3, y0 = this._H * .5;
    this._seg = Array.from({ length: N }, (_, i) => ({ x: x0 - i * this._gap, y: y0, r: (i === 0 ? 25 : 20 * (1 - .84 * Math.pow(i / (N - 1), 1.2)) + (i < 4 ? -2.5 + i * .6 : 0)) * k }));
    this._ang = 0; this._speed = 120; this._mode = 'wander'; this._modeT = 0; this._fire = []; this._zs = [];
    this._jaw = 0; this._blink = 2; this._born = now(); this._sleep = 0; this._flinch = 0;
    /* whiskers: two little chains trailing from the snout */
    this._wh = [0, 1].map(() => Array.from({ length: 8 }, () => ({ x: x0, y: y0, px: x0, py: y0 })));
    this._hair = [0, 1, 2].map(() => Array.from({ length: 11 }, () => ({ x: x0, y: y0, px: x0, py: y0 })));
  }
  get skin() { return WYRM_SKINS[this.getAttribute('color')] || WYRM_SKINS.jade; }

  /* where the head wants to go, by mood */
  _target(dt) {
    const P = this._P, h = this._seg[0], t = now() / 1000, W = this._W, H = this._H, idle = (now() - Math.max(P ? P.t : 0, this._born)) / 1000;
    const inside = P && P.x > 0 && P.y > 0 && P.x < W && P.y < H;
    if (this._mode === 'sleep') return null;
    if (this._flinch > 0) return { x: h.x + Math.cos(this._ang) * 200, y: h.y + Math.sin(this._ang) * 200, sp: 360 };
    if (this._mode === 'breathe') return { x: P.x, y: P.y, sp: 40 };
    if (this._mode === 'coil') {
      /* a spiral in toward where it decided to rest */
      const c = this._coil, k = clamp((t - c.t0) / 3.2, 0, 1), r = lerp(90, 24, k) * this._k;
      if (k >= 1) { this._mode = 'sleep'; this.dispatchEvent(new Event('sleep')); }
      return { x: c.x + Math.cos(t * 2.4) * r, y: c.y + Math.sin(t * 2.4) * r, sp: 120 };
    }
    if (this._mode === 'wrap') {
      const w = this._wrap, r = w.el.getBoundingClientRect(), a = this._area(), k = (t - w.t0) * 1.4;
      if (k > 6.2832 * 2.2) this._mode = 'wander';
      const cx = r.left - a.left + r.width / 2, cy = r.top - a.top + r.height / 2;
      return { x: cx + Math.cos(k) * (r.width / 2 + 34 * this._k), y: cy + Math.sin(k) * (r.height / 2 + 30 * this._k), sp: 210 };
    }
    if (inside && idle < 4) {
      /* round and round your cursor */
      return { x: P.x + Math.cos(t * 1.3) * 80 * this._k, y: P.y + Math.sin(t * 1.3) * 64 * this._k, sp: 200 + Math.min(220, Math.hypot(P.x - h.x, P.y - h.y) * .6) };
    }
    /* drifting about in long loops */
    return { x: W * (.5 + .38 * Math.sin(t * .23)), y: H * (.5 + .34 * Math.sin(t * .37 + 1)), sp: 110 };
  }
  _click() {
    const P = this._P;
    if (!P || P.x < 0 || P.y < 0 || P.x > this._W || P.y > this._H) return;
    if (this._mode === 'sleep' || this._mode === 'coil') { this._wake(); return; }
    /* poked on the body: it flinches and darts off */
    if (this._seg.some(s => Math.hypot(s.x - P.x, s.y - P.y) < s.r + 6)) {
      this._flinch = .8; this._ang += Math.PI * (chance(.5) ? .7 : -.7);
      sfx('hit', this, { pitch: 1.4 });
      return;
    }
    if (this.getAttribute('fire') === 'off') return;
    this._mode = 'breathe'; this._modeT = .9; this._jaw = 1;
    sfx('launch', this, { pitch: .45 }); sfx('break', this, { pitch: .6, gap: 0 });
    this.dispatchEvent(new Event('breathe'));
  }
  _wake() { if (this._mode === 'sleep' || this._mode === 'coil') { this._mode = 'wander'; this._zs = []; sfx('jump', this, { pitch: .7 }); this.dispatchEvent(new Event('wake')); } }

  _tick(dt) {
    dt = Math.min(dt, 1 / 30);
    const S = this._seg, h = S[0], t = now() / 1000, P = this._P;
    const idle = (now() - Math.max(P ? P.t : 0, this._born)) / 1000;
    /* moods: nap when ignored, wake when you come close, coil round a heading now and then */
    if ((this._mode === 'sleep' || this._mode === 'coil') && P && idle < .3 && Math.hypot(P.x - h.x, P.y - h.y) < 220) this._wake();
    if (this._mode === 'wander' && idle > 9 && !reduced()) { this._mode = 'coil'; this._coil = { x: h.x, y: h.y, t0: t }; }
    if (this._mode === 'wander' && (this._modeT -= dt) < 0) {
      this._modeT = rnd(9, 15);
      const root = this._box || document.body, sel = this.getAttribute('wrap') || 'h1,h2';
      let els = []; try { els = [...root.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 20 && r.bottom > 0 && r.top < innerHeight; }); } catch (_) { /* bad selector */ }
      if (els.length && idle > 1.5) { this._mode = 'wrap'; this._wrap = { el: pick(els), t0: t }; }
    }
    if (this._mode === 'breathe' && (this._modeT -= dt) < 0) this._mode = 'wander';
    this._flinch = Math.max(0, this._flinch - dt);
    if (reduced()) { if (this._mode !== 'sleep') { this._mode = 'sleep'; this._coil = { x: this._W / 2, y: this._H / 2 }; this._curl(); } this._draw(t); return; }

    /* steer the head: turn toward the target at a limited rate, and swim in an S */
    const T = this._target(dt);
    if (T) {
      const want = Math.atan2(T.y - h.y, T.x - h.x);
      let d = want - this._ang; d = Math.atan2(Math.sin(d), Math.cos(d));
      const turn = (this._mode === 'breathe' ? 9 : 3.4) * dt;
      this._ang += clamp(d, -turn, turn);
      this._speed = lerp(this._speed, T.sp, Math.min(1, dt * 2));
      const wig = this._mode === 'breathe' ? 0 : Math.sin(t * 5.5) * .55;
      const dir = this._ang + wig;
      h.x += Math.cos(dir) * this._speed * dt; h.y += Math.sin(dir) * this._speed * dt;
      /* the walls are soft: it turns back instead of leaving */
      const m = 30 * this._k;
      if (h.x < m) this._ang = lerp(this._ang, 0, dt * 3); if (h.x > this._W - m) this._ang = lerp(this._ang, Math.PI * (this._ang > 0 ? 1 : -1), dt * 3);
      if (h.y < m) this._ang = lerp(this._ang, Math.PI / 2, dt * 3); if (h.y > this._H - m) this._ang = lerp(this._ang, -Math.PI / 2, dt * 3);
      h.x = clamp(h.x, 4, this._W - 4); h.y = clamp(h.y, 4, this._H - 4);
    }
    /* the spine: every segment keeps its distance from the one in front */
    for (let i = 1; i < S.length; i++) {
      const a = S[i - 1], b = S[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      const gap = this._gap * (this._mode === 'sleep' ? .82 : 1);
      b.x = a.x + dx / d * gap; b.y = a.y + dy / d * gap;
    }
    /* whiskers trail from the snout with a little lag */
    const hd = Math.atan2(h.y - S[1].y, h.x - S[1].x), nx = -Math.sin(hd), ny = Math.cos(hd);
    this._wh.forEach((w, side) => {
      const sx = side ? 1 : -1, ax = h.x + Math.cos(hd) * S[0].r * 1.1 + nx * sx * S[0].r * .5, ay = h.y + Math.sin(hd) * S[0].r * 1.1 + ny * sx * S[0].r * .5;
      w[0].x = ax; w[0].y = ay;
      for (let i = 1; i < w.length; i++) {
        const p = w[i], vx = (p.x - p.px) * .9, vy = (p.y - p.py) * .9;
        p.px = p.x; p.py = p.y; p.x += vx + nx * sx * Math.sin(t * 6 + i) * .6; p.y += vy + ny * sx * Math.sin(t * 6 + i) * .6;
        const q = w[i - 1], dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1, L = 7 * this._k;
        p.x = q.x + dx / d * L; p.y = q.y + dy / d * L;
      }
    });
    /* hair: anchored behind the horns, flowing back with drag and a slow wave */
    this._hair.forEach((w, k) => {
      const sx = k - 1, ax = h.x - Math.cos(hd) * S[0].r * .7 + nx * sx * S[0].r * .45, ay = h.y - Math.sin(hd) * S[0].r * .7 + ny * sx * S[0].r * .45;
      w[0].x = ax; w[0].y = ay;
      for (let i = 1; i < w.length; i++) {
        const p = w[i], vx = (p.x - p.px) * .86, vy = (p.y - p.py) * .86;
        p.px = p.x; p.py = p.y;
        p.x += vx - Math.cos(hd) * 2.2 + nx * Math.sin(t * 4 - i * .7 + k * 2) * .7; p.y += vy - Math.sin(hd) * 2.2 + ny * Math.sin(t * 4 - i * .7 + k * 2) * .7;
        const q = w[i - 1], dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1, L = 6.5 * this._k;
        p.x = q.x + dx / d * L; p.y = q.y + dy / d * L;
      }
    });
    /* fire */
    this._jaw = lerp(this._jaw, this._mode === 'breathe' ? 1 : 0, Math.min(1, dt * 12));
    if (this._mode === 'breathe') for (let i = 0; i < 9; i++) {
      const a = hd + rnd(-.26, .26), sp = rnd(280, 480);
      this._fire.push({ x: h.x + Math.cos(hd) * S[0].r * 2.15, y: h.y + Math.sin(hd) * S[0].r * 2.15, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: rnd(.35, .8), sz: rnd(.8, 1.9) });
    }
    for (const f of this._fire) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .96; f.vy = f.vy * .96 - 30 * dt; }
    this._fire = this._fire.filter(f => f.t < f.life);
    if (this._mode === 'sleep' && chance(dt * 1.2)) this._zs.push({ x: h.x + 6, y: h.y - S[0].r - 4, t: 0 });
    for (const z of this._zs) { z.t += dt; z.y -= 18 * dt; z.x += Math.sin(z.t * 3) * 10 * dt; }
    this._zs = this._zs.filter(z => z.t < 2.2);
    if ((this._blink -= dt) < -.15) this._blink = rnd(2, 5);
    this._draw(t);
  }
  /* reduced motion: one still curl */
  _curl() {
    const c = this._coil, S = this._seg;
    S.forEach((s, i) => { const a = i * .42, r = (18 + i * 2.1) * this._k; s.x = c.x + Math.cos(a) * r; s.y = c.y + Math.sin(a) * r; });
  }

  /* ---------- drawing, on a crisp pixel grid ---------- */
  _draw(t) {
    const g = this._g, px = this._px, S = this._seg, C = this.skin, W = this._cv.width, H = this._cv.height;
    g.clearRect(0, 0, W, H);
    const disc = (x, y, r, c) => {
      x = Math.round(x / px); y = Math.round(y / px); r = Math.max(.5, r / px);
      g.fillStyle = c;
      for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy) + .25); g.fillRect(x - w, y + dy, w * 2 + 1, 1); }
    };
    const line = (x0, y0, x1, y1, c) => {
      g.fillStyle = c; x0 = Math.round(x0 / px); y0 = Math.round(y0 / px); x1 = Math.round(x1 / px); y1 = Math.round(y1 / px);
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1);
    };
    const dirAt = i => { const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)]; return Math.atan2(a.y - b.y, a.x - b.x); };
    /* the mane: spikes along the back, rippling */
    for (let i = 2; i < S.length - 3; i += 2) {
      const s = S[i], a = dirAt(i), nx = -Math.sin(a), ny = Math.cos(a), len = s.r * (1.3 + .45 * Math.sin(t * 6 - i * .55));
      const bx = s.x - nx * s.r * .4, by = s.y - ny * s.r * .4, tx = s.x - nx * (s.r + len) - Math.cos(a) * len * .7, ty = s.y - ny * (s.r + len) - Math.sin(a) * len * .7;
      for (const o of [-1.4, 0, 1.4]) line(bx + Math.cos(a) * o * px, by + Math.sin(a) * o * px, tx, ty, o ? C[5] : C[6]);
    }
    /* legs: two pairs, solid and outlined, paddling as it swims, three claws each */
    for (const i of [8, 22]) {
      const s = S[i], a = dirAt(i), nx = -Math.sin(a), ny = Math.cos(a);
      for (const side of [1, -1]) {
        const sw = Math.sin(t * 9 + i + (side > 0 ? 0 : Math.PI)) * .55, la = a + side * (Math.PI / 2) + sw - .55, L = s.r * 1.55;
        const hx = s.x + nx * side * s.r * .6, hy = s.y + ny * side * s.r * .6, fx = hx + Math.cos(la) * L, fy = hy + Math.sin(la) * L;
        const thick = Math.max(2, s.r * .3);
        for (let k = 0; k <= 8; k++) { const q = k / 8; disc(lerp(hx, fx, q), lerp(hy, fy, q), lerp(thick, thick * .7, q) + px, C[0]); }
        for (let k = 0; k <= 8; k++) { const q = k / 8; disc(lerp(hx, fx, q), lerp(hy, fy, q), lerp(thick, thick * .7, q), C[1]); }
        for (const c of [-.55, 0, .55]) { const cx = fx + Math.cos(la + c) * s.r * .55, cy = fy + Math.sin(la + c) * s.r * .55; line(fx, fy, cx, cy, C[0]); line(fx + px * .5, fy, cx, cy, C[7]); }
      }
    }
    /* the body: outline, then flesh, then a lit ridge and a row of scales */
    for (let i = S.length - 1; i >= 0; i--) disc(S[i].x, S[i].y, S[i].r + px, C[0]);
    for (let i = S.length - 1; i >= 0; i--) disc(S[i].x, S[i].y, S[i].r, C[1]);
    for (let i = S.length - 1; i >= 0; i--) { const s = S[i], a = dirAt(i), nx = -Math.sin(a), ny = Math.cos(a); disc(s.x - nx * s.r * .15, s.y - ny * s.r * .15, s.r * .78, C[2]); }
    for (let i = S.length - 1; i >= 0; i--) { const s = S[i], a = dirAt(i), nx = -Math.sin(a), ny = Math.cos(a); disc(s.x - nx * s.r * .42, s.y - ny * s.r * .42, s.r * .34, C[3]); }
    for (let i = 1; i < S.length; i++) { const s = S[i], a = dirAt(i), nx = -Math.sin(a), ny = Math.cos(a); disc(s.x + nx * s.r * .45, s.y + ny * s.r * .45, Math.max(px * .6, s.r * .22), C[4]); if (i % 2) disc(s.x, s.y, Math.max(px * .5, s.r * .14), C[1]); }
    /* the tail ends in a flame-like tuft */
    const tl = S[S.length - 1], ta = dirAt(S.length - 1);
    for (let k = 0; k < 3; k++) line(tl.x, tl.y, tl.x - Math.cos(ta + (k - 1) * .5) * 16 * this._k, tl.y - Math.sin(ta + (k - 1) * .5) * 16 * this._k + Math.sin(t * 8 + k) * 3, k === 1 ? C[6] : C[5]);
    /* the head */
    const h = S[0], a = Math.atan2(h.y - S[1].y, h.x - S[1].x), fx = Math.cos(a), fy = Math.sin(a), nx = -Math.sin(a), ny = Math.cos(a), r = h.r;
    /* the hair streams back first, under everything on the head */
    for (const w of this._hair) for (let i = 1; i < w.length; i++) { const c = i < 4 ? C[5] : i < 8 ? C[6] : C[5]; line(w[i - 1].x, w[i - 1].y, w[i].x, w[i].y, C[0]); line(w[i - 1].x + px, w[i - 1].y, w[i].x + px, w[i].y, c); line(w[i - 1].x, w[i - 1].y + px, w[i].x, w[i].y + px, c); }
    /* horns sweep back, thick */
    for (const side of [1, -1]) for (const o of [0, px, -px]) line(h.x - fx * r * .15 + nx * side * r * .5 + o, h.y - fy * r * .15 + ny * side * r * .5, h.x - fx * r * 1.85 + nx * side * r * 1.25, h.y - fy * r * 1.85 + ny * side * r * 1.25, o ? C[7] : C[0]);
    const jaw = this._jaw * r * .6;
    /* the muzzle: a chain of shrinking circles out in front of the skull */
    const muz = (off, rad, c, lift) => disc(h.x + fx * r * off + nx * lift, h.y + fy * r * off + ny * lift, rad, c);
    const M = [[.55, .86], [1.05, .74], [1.5, .62], [1.85, .5]];
    for (const [o, k] of M) muz(o, r * k + px, C[0], -jaw * .5);
    for (const [o, k] of M) muz(o, r * k + px, C[0], jaw * .5);
    disc(h.x, h.y, r + px, C[0]);
    /* the lower jaw, and the mouth inside when it opens */
    for (const [o, k] of M) muz(o, r * k * .92, C[1], jaw * .5);
    if (jaw > 1) for (const [o, k] of M) muz(o + .05, Math.max(1, jaw * .55 * k), '#5a0f14', 0);
    /* the upper skull and muzzle */
    disc(h.x, h.y, r, C[2]);
    for (const [o, k] of M) muz(o, r * k, C[2], -jaw * .5);
    for (const [o, k] of M) muz(o - .05, r * k * .5, C[3], -jaw * .5 - r * k * .3);
    disc(h.x - nx * r * .25, h.y - ny * r * .25, r * .55, C[3]);
    /* teeth along the gums when the mouth is open */
    if (jaw > 2) for (const o of [.9, 1.3, 1.7]) for (const sd of [-1, 1]) { const tx = h.x + fx * r * o + nx * sd * (jaw * .5 - px), ty = h.y + fy * r * o + ny * sd * (jaw * .5 - px); disc(tx, ty, px * .6, '#fffbe6'); }
    /* nostrils at the tip */
    for (const sd of [-1, 1]) disc(h.x + fx * r * 2.05 + nx * sd * r * .22 - nx * jaw * .5, h.y + fy * r * 2.05 + ny * sd * r * .22 - ny * jaw * .5, px * .7, C[0]);
    /* eyes: slanted, glowing, a slit that turns toward the pointer; shut asleep or mid-blink; a heavy brow over each */
    const P = this._P, shut = this._mode === 'sleep' || this._blink < 0;
    for (const side of [1, -1]) {
      const ex = h.x + fx * r * .32 + nx * side * r * .5, ey = h.y + fy * r * .32 + ny * side * r * .5;
      line(ex - fx * r * .55 + nx * side * r * .32, ey - fy * r * .55 + ny * side * r * .32, ex + fx * r * .35 + nx * side * r * .05, ey + fy * r * .35 + ny * side * r * .05, C[0]);
      if (shut) { line(ex - fx * r * .28, ey - fy * r * .28, ex + fx * r * .28, ey + fy * r * .28, C[0]); continue; }
      disc(ex, ey, r * .3 + px * .6, C[0]); disc(ex, ey, r * .3, C[8]);
      const la = P ? Math.atan2(P.y - ey, P.x - ex) : a, cx = ex + Math.cos(la) * r * .1, cy = ey + Math.sin(la) * r * .1;
      line(cx - fx * r * .18, cy - fy * r * .18, cx + fx * r * .18, cy + fy * r * .18, C[0]);
    }
    /* whiskers */
    for (const w of this._wh) for (let i = 1; i < w.length; i++) line(w[i - 1].x, w[i - 1].y, w[i].x, w[i].y, i < 3 ? C[7] : C[6]);
    /* fire: white at the mouth, then yellow, orange, red, and smoke */
    for (const f of this._fire) {
      const k = f.t / f.life, c = k < .12 ? '#fffbe6' : k < .3 ? '#ffe36b' : k < .5 ? '#ffab3a' : k < .7 ? '#ff6a2a' : k < .85 ? '#c92a1c' : 'rgba(70,60,72,.55)';
      const s = Math.max(1, Math.round(f.sz * (1 + k * 1.6) * (chance(.15) ? .5 : 1)));
      g.fillStyle = c; g.fillRect(Math.round(f.x / px - s / 2), Math.round(f.y / px - s / 2), s, s);
    }
    /* Zz */
    g.font = `400 ${Math.max(5, Math.round(8 * this._k))}px ${KIT_FONT}`;
    for (const z of this._zs) { g.globalAlpha = clamp(2.2 - z.t, 0, 1); g.fillStyle = C[8]; g.fillText('z', Math.round(z.x / px), Math.round(z.y / px)); }
    g.globalAlpha = 1;
  }
}
define('piix-wyrm', PiixWyrmElement);
ELEMENTS.wyrm = 'piix-wyrm';
