/* QUAKE: one press and your page falls down. Throw the pieces, then put it all back.   @component quake
 *
 *   <piix-glow-button data-piix-quake="page">Quake</piix-glow-button>
 *   <piix-quake id="page">
 *     <h2>Everything here is a body</h2>
 *     <p>Headings, paragraphs, images and buttons tumble, stack and rest on each other.</p>
 *     <img src="cat.png" alt="">
 *   </piix-quake>
 *
 * A real rigid-body simulation (boxes that collide at their corners, stack, slide with
 * friction and come to rest) running on your actual elements. The ground shakes, every block
 * inside falls, bounces and piles up at the bottom; grab any piece and throw it. Text collides
 * by the shape of its lines, not its full-width box. Pieces are only moved, never copied, so
 * buttons and links still work while they lie on the floor. Press again and every piece flies
 * back into place.
 *
 * Anything with data-piix-quake="its id" toggles it. Mark an element data-body to make it one
 * piece (with everything inside it), or data-fixed to keep it standing.
 *
 *   trigger   click: clicking an empty spot inside also toggles it     default: none
 *   gravity   how hard things fall, 0.2 to 3                           default: 1
 *   bounce    how much things bounce, 0 to 1                           default: .15
 *   snap      pieces move on a grid this many px wide                 default: 2
 *   rest      seconds before it puts itself back, or never             default: never
 *   sound     make sounds even without <piix-chiptune> ("off" to stay silent)
 *
 *   methods: quake(), restore(), toggle()
 *   events: quake, restore (when every piece is back) */
const QK_ATOM = 'img,svg,canvas,video,iframe,button,input,select,textarea,hr,table,pre,figure,[data-body]';
/* ---------- a tiny 2D rigid-body engine for boxes (after Box2D-Lite) ---------- */
const qkRot = a => { const c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c]; };  /* columns: (c, s) and (-s, c) */
const qkMul = (m, x, y) => [m[0] * x + m[2] * y, m[1] * x + m[3] * y];
const qkMulT = (m, x, y) => [m[0] * x + m[1] * y, m[2] * x + m[3] * y];
/* the edge of box b (centre p, half size h, rotation m) that faces most against normal n */
const qkIncident = (h, p, m, nx, ny) => {
  const [lx, ly] = qkMulT(m, -nx, -ny);
  let a, b, fa, fb;
  if (Math.abs(lx) > Math.abs(ly)) {
    if (lx > 0) { a = [h[0], -h[1]]; b = [h[0], h[1]]; fa = 34; fb = 41; }
    else { a = [-h[0], h[1]]; b = [-h[0], -h[1]]; fa = 12; fb = 23; }
  } else if (ly > 0) { a = [h[0], h[1]]; b = [-h[0], h[1]]; fa = 41; fb = 12; }
  else { a = [-h[0], -h[1]]; b = [h[0], -h[1]]; fa = 23; fb = 34; }
  const pa = qkMul(m, a[0], a[1]), pb = qkMul(m, b[0], b[1]);
  return [{ x: p[0] + pa[0], y: p[1] + pa[1], f: fa }, { x: p[0] + pb[0], y: p[1] + pb[1], f: fb }];
};
const qkClip = (pts, nx, ny, off, edge) => {
  const d0 = nx * pts[0].x + ny * pts[0].y - off, d1 = nx * pts[1].x + ny * pts[1].y - off, out = [];
  if (d0 <= 0) out.push(pts[0]);
  if (d1 <= 0) out.push(pts[1]);
  if (d0 * d1 < 0) { const t = d0 / (d0 - d1); out.push({ x: pts[0].x + t * (pts[1].x - pts[0].x), y: pts[0].y + t * (pts[1].y - pts[0].y), f: (d0 > 0 ? pts[0].f : pts[1].f) * 100 + edge }); }
  return out;
};
/* where do two boxes touch? up to two contact points, each with a normal from a to b and a depth */
const qkCollide = (A, B) => {
  const hA = [A.w / 2, A.h / 2], hB = [B.w / 2, B.h / 2], pA = [A.x, A.y], pB = [B.x, B.y];
  const mA = qkRot(A.a), mB = qkRot(B.a);
  const dp = [pB[0] - pA[0], pB[1] - pA[1]], dA = qkMulT(mA, dp[0], dp[1]), dB = qkMulT(mB, dp[0], dp[1]);
  /* C = mA^T mB, and its absolute value */
  const C = [mA[0] * mB[0] + mA[1] * mB[1], mA[2] * mB[0] + mA[3] * mB[1], mA[0] * mB[2] + mA[1] * mB[3], mA[2] * mB[2] + mA[3] * mB[3]].map(Math.abs);
  const fAx = Math.abs(dA[0]) - hA[0] - (C[0] * hB[0] + C[2] * hB[1]), fAy = Math.abs(dA[1]) - hA[1] - (C[1] * hB[0] + C[3] * hB[1]);
  if (fAx > 0 || fAy > 0) return null;
  const fBx = Math.abs(dB[0]) - (C[0] * hA[0] + C[1] * hA[1]) - hB[0], fBy = Math.abs(dB[1]) - (C[2] * hA[0] + C[3] * hA[1]) - hB[1];
  if (fBx > 0 || fBy > 0) return null;
  let axis = 0, sep = fAx, n = dA[0] > 0 ? [mA[0], mA[1]] : [-mA[0], -mA[1]];
  if (fAy > .95 * sep + .01 * hA[1]) { axis = 1; sep = fAy; n = dA[1] > 0 ? [mA[2], mA[3]] : [-mA[2], -mA[3]]; }
  if (fBx > .95 * sep + .01 * hB[0]) { axis = 2; sep = fBx; n = dB[0] > 0 ? [mB[0], mB[1]] : [-mB[0], -mB[1]]; }
  if (fBy > .95 * sep + .01 * hB[1]) { axis = 3; sep = fBy; n = dB[1] > 0 ? [mB[2], mB[3]] : [-mB[2], -mB[3]]; }
  let fn, front, sn, side, neg, pos, ne, pe, inc;
  const dot = (p, v) => p[0] * v[0] + p[1] * v[1];
  if (axis === 0) { fn = n; front = dot(pA, fn) + hA[0]; sn = [mA[2], mA[3]]; side = dot(pA, sn); neg = -side + hA[1]; pos = side + hA[1]; ne = 3; pe = 1; inc = qkIncident(hB, pB, mB, fn[0], fn[1]); }
  else if (axis === 1) { fn = n; front = dot(pA, fn) + hA[1]; sn = [mA[0], mA[1]]; side = dot(pA, sn); neg = -side + hA[0]; pos = side + hA[0]; ne = 2; pe = 4; inc = qkIncident(hB, pB, mB, fn[0], fn[1]); }
  else if (axis === 2) { fn = [-n[0], -n[1]]; front = dot(pB, fn) + hB[0]; sn = [mB[2], mB[3]]; side = dot(pB, sn); neg = -side + hB[1]; pos = side + hB[1]; ne = 3; pe = 1; inc = qkIncident(hA, pA, mA, fn[0], fn[1]); }
  else { fn = [-n[0], -n[1]]; front = dot(pB, fn) + hB[1]; sn = [mB[0], mB[1]]; side = dot(pB, sn); neg = -side + hB[0]; pos = side + hB[0]; ne = 2; pe = 4; inc = qkIncident(hA, pA, mA, fn[0], fn[1]); }
  const c1 = qkClip(inc, -sn[0], -sn[1], neg, ne);
  if (c1.length < 2) return null;
  const c2 = qkClip(c1, sn[0], sn[1], pos, pe);
  if (c2.length < 2) return null;
  const out = [];
  for (const p of c2.slice(0, 2)) {
    const s = fn[0] * p.x + fn[1] * p.y - front;
    if (s <= 0) out.push({ x: p.x - s * fn[0], y: p.y - s * fn[1], nx: n[0], ny: n[1], sep: s, key: axis * 1e7 + p.f, pn: 0, pt: 0 });
  }
  return out.length ? out : null;
};
class PiixQuakeElement extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this._on = false; this._bodies = []; this._arb = new Map(); this._dust = [];
    this._loop = dt => this._tick(dt);
  }
  connectedCallback() {
    this.shadowRoot.innerHTML = `<style>
:host{display:block;position:relative}
:host([data-quaking]){user-select:none;-webkit-user-select:none}
canvas{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:5;image-rendering:pixelated}
</style><slot></slot><canvas aria-hidden="true"></canvas><div style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)" aria-live="polite"></div>`;
    this._cv = this.shadowRoot.querySelector('canvas');
    this._sr = this.shadowRoot.querySelector('[aria-live]');
    document.addEventListener('click', this._opener = e => {
      const t = e.target.closest && e.target.closest('[data-piix-quake]');
      if (t && this.id && t.getAttribute('data-piix-quake') === this.id && !this.contains(t)) this.toggle();
      else if (t && t.getAttribute('data-piix-quake') === '' && this.contains(t)) this.toggle();
    });
    this.addEventListener('click', this._ck = e => {
      if (this.getAttribute('trigger') !== 'click' || this._dragged) return;
      if (e.target === this || !e.target.closest(QK_ATOM + ',a,label')) this.toggle();
    });
    this.addEventListener('pointerdown', this._pd = e => this._grab(e));
    addEventListener('pointermove', this._pm = e => { if (this._drag) { const r = this.getBoundingClientRect(); this._drag.tx = e.clientX - r.left; this._drag.ty = e.clientY - r.top; } });
    addEventListener('pointerup', this._pu = () => { if (this._drag) { this._drag.b.held = false; this._drag = null; setTimeout(() => { this._dragged = false; }, 0); } });
  }
  disconnectedCallback() {
    unsub(this._loop);
    document.removeEventListener('click', this._opener);
    this.removeEventListener('click', this._ck); this.removeEventListener('pointerdown', this._pd);
    removeEventListener('pointermove', this._pm); removeEventListener('pointerup', this._pu);
    this._reset();
  }
  toggle() { this._on ? this.restore() : this.quake(); }

  /* ---------- which elements are pieces ---------- */
  _collect() {
    const out = [];
    const inline = el => getComputedStyle(el).display.startsWith('inline') && !getComputedStyle(el).display.startsWith('inline-');
    const walk = el => {
      for (const c of el.children) {
        if (['SCRIPT', 'STYLE', 'TEMPLATE', 'BR'].includes(c.tagName) || c.hasAttribute('data-fixed')) continue;
        const cs = getComputedStyle(c);
        if (cs.display === 'none' || cs.position === 'fixed' || cs.position === 'sticky') continue;
        if (c.matches(QK_ATOM) || c.tagName.includes('-')) { out.push(c); continue; }
        /* a block made only of text and inline bits is one piece; anything else, look inside */
        const blocky = [...c.children].some(k => !inline(k) && !['BR', 'SCRIPT', 'STYLE'].includes(k.tagName));
        const ownText = [...c.childNodes].some(k => k.nodeType === 3 && k.data.trim());
        const seen = c.textContent.trim() || c.children.length || cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || parseFloat(cs.borderTopWidth) > 0;
        if (blocky && !ownText) walk(c); else if (seen && c.offsetWidth && c.offsetHeight) out.push(c);
      }
    };
    walk(this);
    return out;
  }
  /* the box a piece collides with: its lines of text, not its full-width block */
  _box(el, host) {
    const r = el.getBoundingClientRect();
    let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom;
    if (!el.matches(QK_ATOM) && !el.tagName.includes('-') && getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(el).borderTopWidth === '0px') {
      const rg = document.createRange(); rg.selectNodeContents(el);
      const rs = [...rg.getClientRects()].filter(q => q.width && q.height);
      if (rs.length) { x0 = Math.min(...rs.map(q => q.left)); x1 = Math.max(...rs.map(q => q.right)); y0 = Math.min(...rs.map(q => q.top)); y1 = Math.max(...rs.map(q => q.bottom)); }
    }
    return { x: (x0 + x1) / 2 - host.left, y: (y0 + y1) / 2 - host.top, w: Math.max(4, x1 - x0), h: Math.max(4, y1 - y0), ox: (x0 + x1) / 2 - r.left, oy: (y0 + y1) / 2 - r.top };
  }

  quake() {
    if (this._on) return;
    const host = this.getBoundingClientRect();
    this._on = true;
    this.setAttribute('data-quaking', '');
    this._touch = this.style.touchAction; this.style.touchAction = 'none';
    this.dispatchEvent(new Event('quake'));
    sfx('hit', this); sfx('break', this, { pitch: .6 });
    this._sr.textContent = 'Everything fell down. Press again to put it back.';
    /* the ground shakes first */
    if (!reduced()) this.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-6px,3px)' }, { transform: 'translate(5px,-4px)' }, { transform: 'translate(-3px,2px)' }, { transform: 'translate(0,0)' }], { duration: 260, easing: 'steps(4)' });
    if (reduced()) return;
    /* the element keeps its height, so the floor stays where it was */
    this._oldH = this.style.height; this.style.height = host.height + 'px';
    this._W = host.width; this._H = host.height;
    this._bodies = this._collect().map(el => {
      const b = this._box(el, host);
      /* nothing wider than the room it falls in, or it would wedge between the walls forever */
      b.w = Math.min(b.w, host.width * .96); b.h = Math.min(b.h, host.height * .9);
      const m = b.w * b.h;
      const keep = [el.style.transform, el.style.transformOrigin, el.style.willChange, el.style.position, el.style.zIndex];
      el.style.transformOrigin = `${b.ox}px ${b.oy}px`; el.style.willChange = 'transform';
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      /* the colour its dust takes */
      const cs = getComputedStyle(el), bg = cs.backgroundColor;
      return Object.assign(b, { el, keep, x0: b.x, y0: b.y, a: 0, vx: rnd(-60, 60), vy: rnd(-260, -60), w0: 0, av: rnd(-1.5, 1.5), im: 1 / m, iI: 12 / (m * (b.w * b.w + b.h * b.h)), dust: bg !== 'rgba(0, 0, 0, 0)' ? bg : cs.color, held: false });
    });
    /* the floor and the walls don't move */
    const W = this._W, H = this._H;
    this._walls = [{ x: W / 2, y: H + 200, w: W * 4, h: 400 }, { x: -200, y: H / 2 - 2000, w: 400, h: H + 4000 }, { x: W + 200, y: H / 2 - 2000, w: 400, h: H + 4000 }]
      .map(w => Object.assign(w, { a: 0, vx: 0, vy: 0, av: 0, im: 0, iI: 0, wall: true }));
    this._arb.clear(); this._acc = 0; this._back = null;
    const dpr = Math.min(2, devicePixelRatio || 1);
    this._cv.width = Math.round(W * dpr); this._cv.height = Math.round(H * dpr);
    this._cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    clearTimeout(this._restT);
    const rest = this.getAttribute('rest');
    if (rest && rest !== 'never') this._restT = setTimeout(() => this.restore(), (+rest || 4) * 1000);
    sub(this._loop);
  }
  restore() {
    if (!this._on) return;
    clearTimeout(this._restT);
    if (!this._bodies.length) { this._finish(); return; }
    /* every piece flies home: the far ones first wait a beat, so it rebuilds like a rewind */
    this._back = { t: 0 };
    this._bodies.forEach((b, i) => { b.fx = b.x; b.fy = b.y; b.fa = ((b.a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; b.delay = i * .035; });
    this._drag = null;
    sfx('powerup', this);
  }
  _finish() {
    this._reset();
    this._on = false; this._back = null;
    this.removeAttribute('data-quaking');
    this.style.touchAction = this._touch || '';
    this.style.height = this._oldH || '';
    unsub(this._loop);
    const g = this._cv.getContext('2d'); g.clearRect(0, 0, this._W || 0, this._H || 0);
    this._sr.textContent = 'Everything is back in place.';
    this.dispatchEvent(new Event('restore'));
  }
  _reset() {
    for (const b of this._bodies) [b.el.style.transform, b.el.style.transformOrigin, b.el.style.willChange, b.el.style.position, b.el.style.zIndex] = b.keep;
    this._bodies = [];
  }

  /* ---------- grab and throw ---------- */
  _grab(e) {
    if (!this._on || this._back || e.button) return;
    const r = this.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    /* the topmost piece under the pointer, tested against its rotated box */
    for (let i = this._bodies.length - 1; i >= 0; i--) {
      const b = this._bodies[i], [lx, ly] = qkMulT(qkRot(b.a), x - b.x, y - b.y);
      if (Math.abs(lx) <= b.w / 2 && Math.abs(ly) <= b.h / 2) {
        if (e.target.closest('a,button,input,select,textarea,label') && !b.el.matches('[data-body]')) return;
        e.preventDefault();
        b.held = true; b.sleep = false; b.still = 0; b.el.style.zIndex = '3';
        /* whatever leans on it wakes too */
        for (const q of this._bodies) q.sleep = false;
        this._drag = { b, lx, ly, tx: x, ty: y };
        this._dragged = true;
        sfx('blip', this);
        return;
      }
    }
  }

  /* ---------- one step of the world ---------- */
  _step(dt) {
    const g = 2200 * clamp(+this.getAttribute('gravity') || 1, .2, 3), all = [...this._bodies, ...this._walls], bo = this.getAttribute('bounce'), e = clamp(bo === null ? .15 : +bo || 0, 0, 1);
    /* contacts: keep last step's impulses where the same corners still touch (that is what lets things stack) */
    const seen = new Set();
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const A = all[i], B = all[j];
      if (!A.im && !B.im) continue;
      const k = i * 1000 + j, cs = qkCollide(A, B);
      if (!cs) { this._arb.delete(k); continue; }
      seen.add(k);
      const old = this._arb.get(k);
      /* a corner that was already touching is resting, not landing: it gets last step's impulse and never bounces */
      for (const c of cs) { const o = old && old.cs.find(q => q.key === c.key); if (o) { c.pn = o.pn; c.pt = o.pt; } else c.fresh = !old; }
      this._arb.set(k, { A, B, cs });
    }
    for (const k of this._arb.keys()) if (!seen.has(k)) this._arb.delete(k);
    /* gravity, and a held piece pulled to the pointer; sleeping pieces stay put */
    for (const b of this._bodies) {
      if (b.sleep && !b.held) { b.vx = b.vy = b.av = 0; continue; }
      if (b.held && this._drag && this._drag.b === b) {
        const [ox, oy] = qkMul(qkRot(b.a), this._drag.lx, this._drag.ly);
        b.vx = (this._drag.tx - (b.x + ox)) * 18; b.vy = (this._drag.ty - (b.y + oy)) * 18; b.av *= .85;
        continue;
      }
      b.vy += g * dt;
    }
    const inv = 1 / dt, cross = (ax, ay, bx, by) => ax * by - ay * bx;
    for (const { A, B, cs } of this._arb.values()) {
      for (const c of cs) {
        const r1x = c.x - A.x, r1y = c.y - A.y, r2x = c.x - B.x, r2y = c.y - B.y;
        const rn1 = r1x * c.nx + r1y * c.ny, rn2 = r2x * c.nx + r2y * c.ny;
        c.mn = 1 / (A.im + B.im + A.iI * (r1x * r1x + r1y * r1y - rn1 * rn1) + B.iI * (r2x * r2x + r2y * r2y - rn2 * rn2));
        const tx = c.ny, ty = -c.nx, rt1 = r1x * tx + r1y * ty, rt2 = r2x * tx + r2y * ty;
        c.mt = 1 / (A.im + B.im + A.iI * (r1x * r1x + r1y * r1y - rt1 * rt1) + B.iI * (r2x * r2x + r2y * r2y - rt2 * rt2));
        c.bias = -.2 * inv * Math.min(0, c.sep + 1);
        /* bounce: only on the first touch of a real impact, so resting things stay at rest */
        const vn = (B.vx - B.av * r2y - A.vx + A.av * r1y) * c.nx + (B.vy + B.av * r2x - A.vy - A.av * r1x) * c.ny;
        if (c.fresh && vn < -120) { c.bias = Math.max(c.bias, -e * vn); if (vn < -500 && !c.loud) { c.loud = true; this._impact(c, -vn); } }
        const px = c.pn * c.nx + c.pt * tx, py = c.pn * c.ny + c.pt * ty;
        A.vx -= A.im * px; A.vy -= A.im * py; A.av -= A.iI * cross(r1x, r1y, px, py);
        B.vx += B.im * px; B.vy += B.im * py; B.av += B.iI * cross(r2x, r2y, px, py);
        c.r1x = r1x; c.r1y = r1y; c.r2x = r2x; c.r2y = r2y;
      }
    }
    for (let it = 0; it < 10; it++) for (const { A, B, cs } of this._arb.values()) for (const c of cs) {
      const { r1x, r1y, r2x, r2y } = c;
      let dvx = B.vx - B.av * r2y - A.vx + A.av * r1y, dvy = B.vy + B.av * r2x - A.vy - A.av * r1x;
      let dPn = c.mn * (-(dvx * c.nx + dvy * c.ny) + c.bias);
      const pn0 = c.pn; c.pn = Math.max(pn0 + dPn, 0); dPn = c.pn - pn0;
      let px = dPn * c.nx, py = dPn * c.ny;
      A.vx -= A.im * px; A.vy -= A.im * py; A.av -= A.iI * cross(r1x, r1y, px, py);
      B.vx += B.im * px; B.vy += B.im * py; B.av += B.iI * cross(r2x, r2y, px, py);
      dvx = B.vx - B.av * r2y - A.vx + A.av * r1y; dvy = B.vy + B.av * r2x - A.vy - A.av * r1x;
      const tx = c.ny, ty = -c.nx, max = .85 * c.pn, pt0 = c.pt;
      c.pt = clamp(pt0 + c.mt * -(dvx * tx + dvy * ty), -max, max);
      const dPt = c.pt - pt0;
      px = dPt * tx; py = dPt * ty;
      A.vx -= A.im * px; A.vy -= A.im * py; A.av -= A.iI * cross(r1x, r1y, px, py);
      B.vx += B.im * px; B.vy += B.im * py; B.av += B.iI * cross(r2x, r2y, px, py);
    }
    /* a piece hit hard by a moving one wakes up */
    for (const { A, B } of this._arb.values()) {
      if (A.sleep && !B.wall && !B.sleep && Math.hypot(B.vx, B.vy) > 90) A.sleep = false, A.still = 0;
      if (B.sleep && !A.wall && !A.sleep && Math.hypot(A.vx, A.vy) > 90) B.sleep = false, B.still = 0;
    }
    for (const b of this._bodies) {
      if (b.sleep && !b.held) { b.vx = b.vy = b.av = 0; continue; }
      /* slow things lose energy fast: piles settle, while falls and throws are untouched */
      if (!b.held && Math.hypot(b.vx, b.vy) < 90) { const k = Math.exp(-7 * dt); b.vx *= k; b.vy *= k; b.av *= k; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.av * dt;
      /* still for a moment: fall asleep, so a pile is perfectly at rest */
      if (!b.held && Math.hypot(b.vx, b.vy) < 22 && Math.abs(b.av) < .3) { if ((b.still = (b.still || 0) + dt) > .4) b.sleep = true; } else b.still = 0;
    }
  }
  /* a hard landing throws up pixel dust in the piece's own colour */
  _impact(c, speed) {
    if (reduced()) return;
    const k = Math.min(18, speed / 60) | 0;
    const b = this._bodies.find(q => Math.abs(q.x - c.x) < q.w && Math.abs(q.y - c.y) < q.h);
    for (let i = 0; i < k; i++) this._dust.push({ x: c.x, y: c.y, vx: rnd(-140, 140), vy: rnd(-220, -40), t: rnd(.3, .7), c: b ? b.dust : '#17121f' });
    sfx('hit', this, { pitch: rnd(.8, 1.3), gap: 70 });
  }
  _tick(dt) {
    /* the whole pile sleeps together once every piece is calm, so a leaning chain can't keep waking itself */
    if (!this._back && this._bodies.length && !this._drag) {
      const calm = this._bodies.every(b => b.sleep || (Math.hypot(b.vx, b.vy) < 30 && Math.abs(b.av) < .4));
      if (calm && (this._calm = (this._calm || 0) + dt) > .6) this._bodies.forEach(b => { b.sleep = true; b.vx = b.vy = b.av = 0; });
      else if (!calm) this._calm = 0;
    }
    if (this._back) {
      /* rewind: each piece eases home from wherever it lies */
      const T = this._back.t += dt;
      let done = true;
      for (const b of this._bodies) {
        const k = clamp((T - b.delay) / .7, 0, 1), e = 1 - Math.pow(1 - k, 3);
        if (k < 1) done = false;
        b.x = lerp(b.fx, b.x0, e); b.y = lerp(b.fy, b.y0, e) - Math.sin(Math.PI * k) * 40; b.a = lerp(b.fa, 0, e);
      }
      this._paint();
      if (done) this._finish();
      return;
    }
    /* fixed small steps: stable stacks at any frame rate */
    this._acc = Math.min(this._acc + dt, .05);
    while (this._acc >= 1 / 120) { this._step(1 / 120); this._acc -= 1 / 120; }
    for (const d of this._dust) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 900 * dt; d.t -= dt; }
    this._dust = this._dust.filter(d => d.t > 0);
    this._paint();
  }
  _paint() {
    const s = Math.max(1, +this.getAttribute('snap') || 2);
    for (const b of this._bodies) {
      const tx = Math.round((b.x - b.x0) / s) * s, ty = Math.round((b.y - b.y0) / s) * s, a = Math.round(b.a * 1000) / 1000;
      const t = `translate(${tx}px,${ty}px) rotate(${a}rad)`;
      if (t !== b.t) { b.t = t; b.el.style.transform = t; }
    }
    const g = this._cv.getContext('2d');
    g.clearRect(0, 0, this._W, this._H);
    for (const d of this._dust) { g.globalAlpha = clamp(d.t * 3, 0, 1); g.fillStyle = d.c; g.fillRect(Math.round(d.x), Math.round(d.y), 3, 3); }
    g.globalAlpha = 1;
  }
}
define('piix-quake', PiixQuakeElement);
ELEMENTS.quake = 'piix-quake';
