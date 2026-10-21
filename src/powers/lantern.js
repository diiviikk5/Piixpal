/* LANTERN: hide-and-seek in the shadows of your own page.   @component lantern
 *
 *   <section class="hero">
 *     <h1>Welcome</h1>
 *     <p>…</p>
 *     <piix-lantern></piix-lantern>
 *   </section>
 *
 * The lights go out. Your pointer becomes a lantern, and everything on the page (headings,
 * paragraphs, cards, images, buttons) casts a real shadow away from it, worked out from the
 * layout as you move. Living in those shadows are a few glims: shy pixel creatures you can only
 * see by their blinking eyes. Shine your light on one and it flinches and scurries to the nearest
 * shadow your layout offers, so you have to corner it against the edges. Keep it lit for a moment
 * and you've caught it. Catch them all and the lights come back on.
 *
 * Put it inside any element and the game stays in that element; inside <body> it covers the
 * screen. A "Lights on" button (or Escape) ends it any time.
 *
 *   glims     how many to find                                     default: 5
 *   radius    the lantern's reach, px                              default: 190
 *   hide      CSS selector for what casts shadows                  default: headings, paragraphs, images, cards…
 *   pixel     size of one pixel of darkness, px                    default: 3
 *   start     auto: go dark when it scrolls into view; manual: wait for start()   default: auto
 *   sound     make sounds even without <piix-chiptune> ("off" to stay silent)
 *
 *   methods: start(), lights()
 *   events: found (detail: { found, total }), win */
const LANT_HIDE = 'h1,h2,h3,h4,p,li,img,figure,button,a.btn,blockquote,pre,table,.card,[data-hide],piix-button,piix-glow-button,piix-glow-card,piix-kbd';
(() => {
  /* a glim: a soft round ghost with big eyes and a wavy hem */
  const glim = ({ eyes = 'open', hem = 0, look = 0 }) => {
    const W = 11, H = 10;
    let rows = art.paint(W, H, (x, y) => {
      if (y >= 8) { const w = (x + hem) % 2 === 0; return y === 8 ? (x > 0 && x < 10 ? 'b' : null) : (w && x > 0 && x < 10 ? 'b' : null); }
      if (art.ellipse(x, y, 5.5, 5, 5, 5.2)) return y < 3 ? 'B' : 'b';
      return null;
    });
    rows = art.outline(rows);
    const ex = 2 + look, ex2 = 6 + look;
    if (eyes === 'open') rows = art.compose(rows, [ex, 3, ['ee', 'ep']], [ex2, 3, ['ee', 'ep']]);
    else if (eyes === 'wide') rows = art.compose(rows, [ex, 2, ['ee', 'ee', 'pe']], [ex2, 2, ['ee', 'ee', 'pe']]);
    else rows = art.compose(rows, [ex, 4, ['ee']], [ex2, 4, ['ee']]);
    return rows;
  };
  const frames = {
    idle: [glim({}), glim({ hem: 1 })],
    blink: [glim({ eyes: 'shut' })],
    scared: [glim({ eyes: 'wide' }), glim({ eyes: 'wide', hem: 1 })],
    run: [glim({ hem: 0, look: 1 }), glim({ hem: 1, look: 1 })]
  };
  defineSprite('_glim', { w: 11, h: 10, scale: 3, palette: { k: '#120d1c', b: '#3a2f52', B: '#5a4c7d', e: '#e9ffb0', p: '#17121f' }, frames, fps: { idle: 3, scared: 10, run: 10 } });
  /* the same glim in the dark: only its eyes show */
  defineSprite('_glimeyes', { w: 11, h: 10, scale: 3, palette: { e: '#c6f432', p: '#c6f432' }, frames, fps: { idle: 3 } });
})();

class PiixLanternElement extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._on = false; this._loop = dt => this._tick(dt); }
  connectedCallback() {
    const par = this.parentElement;
    this._box = par && par !== document.body && par !== document.documentElement ? par : null;
    if (this._box && getComputedStyle(this._box).position === 'static') this._box.style.position = 'relative';
    this.shadowRoot.innerHTML = `<style>
:host{position:${this._box ? 'absolute' : 'fixed'};inset:0;z-index:2147483000;pointer-events:none;display:block}
:host(:not([data-on])) canvas,:host(:not([data-on])) .hud{display:none}
canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;opacity:1;transition:opacity 1.1s steps(6)}
:host([data-win]) canvas{opacity:0}
.hud{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:8px;align-items:center;pointer-events:auto;white-space:nowrap;font:400 11px/1 ${KIT_FONT};letter-spacing:.08em;text-transform:uppercase;color:#e9ffb0}
.hud span{padding:8px 11px 7px;background:#120d1c;clip-path:${kitCorners(2)}}
.hud button{all:unset;cursor:pointer;padding:8px 11px 7px;background:#c6f432;color:#17121f;clip-path:${kitCorners(2)}}
.hud button:focus-visible{outline:2px dashed #c6f432;outline-offset:3px}
:host([data-win]) .hud span{background:#c6f432;color:#17121f}
</style><canvas aria-hidden="true"></canvas><div class="hud"><span class="count" role="status">Find the glims</span><button type="button" class="off">Lights on</button></div>`;
    this._cv = this.shadowRoot.querySelector('canvas'); this._g = this._cv.getContext('2d');
    this._count = this.shadowRoot.querySelector('.count');
    this.shadowRoot.querySelector('.off').addEventListener('click', () => this.lights());
    addEventListener('keydown', this._kd = e => { if (e.key === 'Escape' && this._on) this.lights(); });
    /* the lantern: wherever the pointer is; on touch, wherever the finger is */
    this._L = null;
    /* listened for on the way down, so nothing on the page can swallow the pointer first */
    const at = e => { if (this._on) this._L = this._local(e.clientX, e.clientY); };
    addEventListener('pointermove', this._pm = at, { passive: true, capture: true });
    addEventListener('pointerdown', this._pd = at, { passive: true, capture: true });
    addEventListener('mousemove', this._mm = at, { passive: true, capture: true });
    if ((this.getAttribute('start') || 'auto') === 'auto') {
      this._io = new IntersectionObserver(([en]) => { if (en.isIntersecting && !this._started) { this._io.disconnect(); this.start(); } }, { threshold: .35 });
      this._io.observe(this._box || document.body);
    }
  }
  disconnectedCallback() {
    unsub(this._loop); if (this._io) this._io.disconnect();
    removeEventListener('pointermove', this._pm, true); removeEventListener('pointerdown', this._pd, true); removeEventListener('mousemove', this._mm, true); removeEventListener('keydown', this._kd);
  }
  _area() { return this._box ? this._box.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight }; }
  _local(x, y) { const a = this._area(); return { x: x - a.left, y: y - a.top }; }

  /* ---------- the game ---------- */
  start() {
    this._started = true; this._on = true;
    this.removeAttribute('data-win'); this.toggleAttribute('data-on', true);
    this._size();
    const n = clamp(+this.getAttribute('glims') || 5, 1, 12);
    this._walls = this._findWalls();
    this._found = 0; this._total = n; this._sparks = [];
    /* everyone starts hidden behind something */
    const spots = this._spots().sort(() => Math.random() - .5);
    this._glims = Array.from({ length: n }, (_, i) => {
      const s = spots[i % spots.length] || { x: rnd(20, this._W - 20), y: rnd(20, this._H - 20) };
      return { x: s.x, y: s.y, tx: s.x, ty: s.y, fear: 0, lit: false, state: 'hide', clip: 'idle', fi: 0, ft: 0, blink: rnd(1, 4), face: 1, caught: false, peek: rnd(2, 6) };
    });
    this._paintCount();
    /* the lantern starts wherever the pointer already is */
    if (ptr.seen && ptr.cx > -1e4) this._L = this._local(ptr.cx, ptr.cy);
    sfx('close', this, { pitch: .6 });
    sub(this._loop);
  }
  /* lights back on: the game ends (won or not) */
  lights(won) {
    if (!this._on) return;
    this.toggleAttribute('data-win', true);
    setTimeout(() => { this._on = false; this.removeAttribute('data-on'); this.removeAttribute('data-win'); unsub(this._loop); }, reduced() ? 0 : 1150);
    if (!won) sfx('open', this);
  }
  _paintCount() { this._count.textContent = this._found >= this._total ? 'You found them all!' : `${this._found} / ${this._total} glims found`; }
  _size() {
    const a = this._area(), px = this._px = clamp(+this.getAttribute('pixel') || 3, 1, 8);
    this._W = a.width; this._H = a.height;
    this._cv.width = Math.ceil(a.width / px); this._cv.height = Math.ceil(a.height / px);
  }
  /* everything that casts a shadow, as rectangles in the game's own coordinates */
  _findWalls() {
    const a = this._area(), root = this._box || document.body, sel = this.getAttribute('hide') || LANT_HIDE, out = [];
    let els = [];
    try { els = [...root.querySelectorAll(sel)]; } catch (_) { /* a bad selector: no walls */ }
    for (const el of els) {
      if (el === this || el.closest('piix-lantern')) continue;
      /* the innermost thing only: a card casts one shadow, not one per line inside it */
      if (els.some(o => o !== el && o.contains(el) && o.matches('.card,figure,[data-hide],piix-glow-card,button,piix-button,piix-glow-button'))) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 6) continue;
      out.push({ el, l: r.left - a.left, t: r.top - a.top, r: r.right - a.left, b: r.bottom - a.top });
    }
    return out;
  }
  _rewall() { for (const w of this._walls) { const r = w.el.getBoundingClientRect(), a = this._area(); w.l = r.left - a.left; w.t = r.top - a.top; w.r = r.right - a.left; w.b = r.bottom - a.top; } }
  /* can the light at L see the point P? (a segment against every wall) */
  _sees(L, P) {
    if (!L) return false;
    for (const w of this._walls) {
      /* the lantern hovers over the page: an element under it doesn't block its own light */
      if (L.x > w.l && L.x < w.r && L.y > w.t && L.y < w.b) continue;
      if (P.x > w.l && P.x < w.r && P.y > w.t && P.y < w.b) return false;
      let t0 = 0, t1 = 1;
      const dx = P.x - L.x, dy = P.y - L.y;
      const clip = (p, q) => { if (p === 0) return q >= 0; const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } return true; };
      if (clip(-dx, L.x - w.l) && clip(dx, w.r - L.x) && clip(-dy, L.y - w.t) && clip(dy, w.b - L.y) && t0 < t1 && t1 > .02 && t0 < .98) return false;
    }
    return true;
  }
  /* places to hide: just off the corners and sides of every wall, inside the area */
  _spots() {
    const out = [], m = 16;
    for (const w of this._walls) {
      const cx = (w.l + w.r) / 2, cy = (w.t + w.b) / 2;
      for (const [x, y] of [[w.l - m, w.t - m], [w.r + m, w.t - m], [w.l - m, w.b + m], [w.r + m, w.b + m], [cx, w.t - m], [cx, w.b + m], [w.l - m, cy], [w.r + m, cy]])
        if (x > 14 && y > 14 && x < this._W - 14 && y < this._H - 14 && !this._walls.some(o => x > o.l - 6 && x < o.r + 6 && y > o.t - 6 && y < o.b + 6)) out.push({ x, y });
    }
    for (const [x, y] of [[20, 20], [this._W - 20, 20], [20, this._H - 20], [this._W - 20, this._H - 20]]) out.push({ x, y });
    return out;
  }
  _flee(gl) {
    const L = this._L, R = +this.getAttribute('radius') || 190, others = this._glims.filter(o => o !== gl && !o.caught);
    let best = null, bs = Infinity;
    for (const s of this._spots()) {
      const d = Math.hypot(s.x - gl.x, s.y - gl.y);
      let score = d;
      if (L && this._sees(L, s) && Math.hypot(s.x - L.x, s.y - L.y) < R * 1.25) score += 5000;
      if (L) score -= Math.min(Math.hypot(s.x - L.x, s.y - L.y), 400) * .6;
      if (others.some(o => Math.hypot(o.tx - s.x, o.ty - s.y) < 26)) score += 800;
      if (score < bs) { bs = score; best = s; }
    }
    if (best) { gl.tx = best.x; gl.ty = best.y; gl.state = 'run'; }
  }

  _tick(dt) {
    if (!this._on) return;
    if (this._cv.width !== Math.ceil(this._area().width / this._px)) this._size();
    this._rewall();
    const L = this._L, R = +this.getAttribute('radius') || 190;
    for (const gl of this._glims) {
      if (gl.caught) continue;
      const lit = !!L && Math.hypot(gl.x - L.x, gl.y - L.y) < R * .82 && this._sees(L, gl);
      /* caught in the light it freezes, eyes wide, for a heartbeat; then it runs */
      if (lit && !gl.lit) { sfx('blip', this, { pitch: 2.2, gap: 60 }); gl.frozen = reduced() ? 0 : .45; }
      if (gl.frozen > 0 && (gl.frozen -= dt) <= 0) this._flee(gl);
      gl.lit = lit;
      /* keep it lit for long enough and it's caught */
      gl.fear = lit ? gl.fear + dt : Math.max(0, gl.fear - dt * .3);
      if (gl.fear > .8) { this._catch(gl); continue; }
      /* a hiding place that has just come into the light isn't a hiding place any more */
      if (!(gl.frozen > 0) && gl.state === 'hide' && L && this._sees(L, { x: gl.tx, y: gl.ty }) && Math.hypot(gl.tx - L.x, gl.ty - L.y) < R) this._flee(gl);
      const dx = gl.tx - gl.x, dy = gl.ty - gl.y, d = Math.hypot(dx, dy), sp = (lit ? 210 : 160) * dt;
      if (gl.frozen > 0) { /* frozen to the spot */ }
      else if (gl.state === 'run') {
        if (d <= sp || reduced()) { gl.x = gl.tx; gl.y = gl.ty; gl.state = 'hide'; }
        else { gl.x += dx / d * sp; gl.y += dy / d * sp; gl.face = dx < 0 ? -1 : 1; }
      } else if ((gl.peek -= dt) < 0) {
        /* now and then it edges out for a look, then back */
        gl.peek = rnd(3, 7);
        const s = this._spots().filter(p => Math.hypot(p.x - gl.x, p.y - gl.y) < 90 && (!L || !this._sees(L, p)));
        if (s.length) { const p = pick(s); gl.tx = p.x; gl.ty = p.y; gl.state = 'run'; }
      }
      const clip = lit || gl.frozen > 0 ? 'scared' : gl.state === 'run' ? 'run' : (gl.blink -= dt) < 0 ? 'blink' : 'idle';
      if (gl.blink < -.14) gl.blink = rnd(1.5, 5);
      if (clip !== gl.clip) { gl.clip = clip; gl.fi = 0; }
      const sp2 = SPRITES._glim, fps = (sp2.fps && sp2.fps[clip]) || 6;
      if ((gl.ft += dt) > 1 / fps) { gl.ft = 0; gl.fi = (gl.fi + 1) % sp2.frames[clip].length; }
    }
    for (const s of this._sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 260 * dt; s.t -= dt; }
    this._sparks = this._sparks.filter(s => s.t > 0);
    this._draw(L, R);
  }
  _catch(gl) {
    gl.caught = true; this._found++;
    for (let i = 0; i < 26; i++) this._sparks.push({ x: gl.x, y: gl.y - 12, vx: rnd(-120, 120), vy: rnd(-220, -40), t: rnd(.4, .9), c: pick(['#c6f432', '#e9ffb0', '#ffffff', '#8b7cff']) });
    sfx('coin', this);
    this._paintCount();
    this.dispatchEvent(new CustomEvent('found', { detail: { found: this._found, total: this._total } }));
    if (this._found >= this._total) {
      sfx('win', this);
      this.dispatchEvent(new Event('win'));
      setTimeout(() => this.lights(true), 900);
    }
  }

  /* ---------- drawing: darkness, the lantern's light, every wall's shadow, the glims ---------- */
  _draw(L, R) {
    const g = this._g, px = this._px, W = this._cv.width, H = this._cv.height;
    const DARK = 'rgba(8,6,14,.93)';
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H); g.fillStyle = DARK; g.fillRect(0, 0, W, H);
    if (L) {
      const lx = L.x / px, ly = L.y / px, r = R / px;
      /* the light: stepped rings, so the falloff is in pixels too */
      g.globalCompositeOperation = 'destination-out';
      for (const [k, al] of [[1, .3], [.86, .35], [.72, .45], [.58, 1]]) { g.fillStyle = `rgba(0,0,0,${al})`; g.beginPath(); g.arc(lx, ly, r * k, 0, 6.2832); g.fill(); }
      /* each wall throws a shadow away from the light, from its two outermost corners */
      /* a faint warm glow, so the light reads as lamplight even on a dark page */
      g.globalCompositeOperation = 'source-over';
      for (const [k, al] of [[1, .05], [.72, .06], [.45, .06]]) { g.fillStyle = `rgba(255,214,140,${al})`; g.beginPath(); g.arc(lx, ly, r * k, 0, 6.2832); g.fill(); }
      /* shadows only exist where there's light to block: clip them to the lantern's reach */
      g.globalCompositeOperation = 'source-over'; g.fillStyle = DARK;
      g.save(); g.beginPath(); g.arc(lx, ly, r + 1, 0, 6.2832); g.clip();
      for (const w of this._walls) {
        if (L.x > w.l && L.x < w.r && L.y > w.t && L.y < w.b) continue;
        const cs = [[w.l, w.t], [w.r, w.t], [w.r, w.b], [w.l, w.b]], base = Math.atan2((w.t + w.b) / 2 - L.y, (w.l + w.r) / 2 - L.x);
        let lo = null, hi = null, a0 = Infinity, a1 = -Infinity;
        for (const c of cs) { let a = Math.atan2(c[1] - L.y, c[0] - L.x) - base; a = Math.atan2(Math.sin(a), Math.cos(a)); if (a < a0) { a0 = a; lo = c; } if (a > a1) { a1 = a; hi = c; } }
        const far = (p) => { const dx = p[0] - L.x, dy = p[1] - L.y, d = Math.hypot(dx, dy) || 1; return [p[0] + dx / d * 4000, p[1] + dy / d * 4000]; };
        const f0 = far(lo), f1 = far(hi);
        g.beginPath(); g.moveTo(lo[0] / px, lo[1] / px); g.lineTo(hi[0] / px, hi[1] / px); g.lineTo(f1[0] / px, f1[1] / px); g.lineTo(f0[0] / px, f0[1] / px); g.closePath();
        g.globalCompositeOperation = 'source-over'; g.fillStyle = '#08060e'; g.globalAlpha = .93; g.fill(); g.globalAlpha = 1;
      }
      g.restore();
      /* the walls themselves stay lit on the side that faces the light */
      g.globalCompositeOperation = 'destination-out';
      for (const w of this._walls) {
        const cx = clamp(L.x, w.l, w.r), cy = clamp(L.y, w.t, w.b), d = Math.hypot(cx - L.x, cy - L.y);
        if (d > R) continue;
        g.fillStyle = `rgba(0,0,0,${clamp(1 - d / R, 0, 1) * .95})`;
        g.fillRect(w.l / px, w.t / px, (w.r - w.l) / px, (w.b - w.t) / px);
      }
      g.globalCompositeOperation = 'source-over';
    }
    /* the glims: whole when lit, just a pair of eyes in the dark */
    for (const gl of this._glims) {
      if (gl.caught) continue;
      const name = gl.lit ? '_glim' : '_glimeyes', sp = SPRITES[name];
      const fr = baked(sp)[gl.clip] || baked(sp).idle, img = fr[gl.fi % fr.length];
      const x = Math.round(gl.x / px - sp.w / 2), y = Math.round(gl.y / px - sp.h);
      g.save();
      if (gl.face < 0) { g.translate(x * 2 + sp.w, 0); g.scale(-1, 1); }
      g.drawImage(img, x, y);
      g.restore();
    }
    for (const s of this._sparks) { g.globalAlpha = clamp(s.t * 2, 0, 1); g.fillStyle = s.c; g.fillRect(Math.round(s.x / px), Math.round(s.y / px), 1, 1); }
    g.globalAlpha = 1;
  }
}
define('piix-lantern', PiixLanternElement);
ELEMENTS.lantern = 'piix-lantern';
