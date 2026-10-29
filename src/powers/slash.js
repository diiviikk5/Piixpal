/* SLASH: a pixel sword that cuts your actual page in two, like paper.   @component slash
 *
 *   <piix-slash></piix-slash>
 *
 * The sword rests stuck in the corner of the page. Click it to pick it up, then drag a line
 * anywhere: it slices along your stroke and the whole page (text, images, video, WebGL)
 * comes apart in two halves along the cut, hangs there a moment over a paper backing,
 * and presses back together. Esc, a right-click or the corner puts it back.
 * The cut is a real snapshot of the page (View Transitions), so nothing is faked or cloned;
 * browsers without them still get the slash and a glowing seam.
 *
 *   rest      br | bl | none       where the sword waits                default: br
 *   trigger   "selector:event"     cut on an event, e.g. "#delete:click" (slices through that element)
 *   color     glow of the slash                                         default: #c6f432
 *   hold      ms the halves stay apart                                  default: 650
 *   sound     a sharp shing (your page needs a click first, as always)
 *
 *   el.slash(x1, y1, x2, y2)   cut along a line, viewport px (no arguments: across the middle)
 *   el.pickup()  el.drop()     events: piix:slash */
const SL_ROWS = [
  '....k....', '...kwk...',
  ...Array(20).fill('..kwsdk..'),
  'kkkkkkkkk', 'kgggggggk', 'kGGGGGGGk', 'kkkkkkkkk',
  '...kpk...', '...kPk...', '...kpk...', '...kPk...', '...kpk...', '...kPk...',
  '..kgggk..', '..kkkkk..'
];
const SL_PAL = { k: '#17121f', w: '#ffffff', s: '#d3d9e8', d: '#8a92a8', g: '#ffc93f', G: '#b8801a', p: '#6b4cff', P: '#3d2a99' };
let SL_IMG = null;
const slSword = () => SL_IMG || (SL_IMG = bake(SL_ROWS, Object.fromEntries(Object.entries(SL_PAL).map(([k, v]) => [k, hexRGBA(v)])), 9, SL_ROWS.length));
if (!SFX_BANK.slash) SFX_BANK.slash = (c, p) => { sfxNoise(c, 0, .2, 1.3, 9000); sfxTone(c, 0, 'sawtooth', 2400 * p, 300 * p, .14, .3); sfxTone(c, .02, 'square', 1900 * p, 1700 * p, .05, .25); };

/* the cut itself: rules for the View Transition pseudo-elements, written fresh for every line */
let slSheet = null;
const slCSS = css => {
  try {
    if (!slSheet) { slSheet = new CSSStyleSheet(); document.adoptedStyleSheets = [...document.adoptedStyleSheets, slSheet]; }
    slSheet.replaceSync(css); return;
  } catch (e) { /* no constructable sheets: fall back to a tag */ }
  let st = document.getElementById('piix-slash-css');
  if (!st) { st = document.createElement('style'); st.id = 'piix-slash-css'; document.head.appendChild(st); }
  st.textContent = css;
};

class PiixSlashElement extends HTMLElement {
  connectedCallback() {
    if (!this._root) {
      this._root = this.attachShadow({ mode: 'open' });
      this._root.innerHTML = `<style>
:host{position:fixed;bottom:8px;right:18px;z-index:2147482400;display:block;width:44px;height:112px}
:host([rest=bl]){right:auto;left:18px}
:host([rest=none]){display:none}
:host(.held){pointer-events:none}
button{all:unset;position:relative;display:block;width:100%;height:100%;cursor:pointer;-webkit-tap-highlight-color:transparent}
button:focus-visible{outline:2px solid #c6f432;outline-offset:2px;border-radius:6px}
canvas{position:absolute;left:50%;bottom:-8px;width:27px;height:102px;margin-left:-13px;image-rendering:pixelated;transform-origin:50% 50%;transform:rotate(172deg);transition:transform .35s cubic-bezier(.34,1.56,.64,1),opacity .2s}
button:hover canvas{animation:wig .5s steps(4)}
@keyframes wig{25%{transform:rotate(165deg)}75%{transform:rotate(179deg)}}
:host(.held) canvas{opacity:0;transform:rotate(172deg) scale(.5)}
i{position:absolute;left:50%;bottom:0;z-index:1;width:30px;height:8px;margin-left:-15px;background:
  linear-gradient(#17121f,#17121f) 6px 3px/18px 2px no-repeat,linear-gradient(#17121f,#17121f) 2px 5px/6px 2px no-repeat,linear-gradient(#17121f,#17121f) 22px 1px/6px 2px no-repeat;opacity:.55}
@media (prefers-reduced-motion:reduce){canvas{transition:none}button:hover canvas{animation:none}}
</style><button type="button" aria-label="Pick up the sword" title="Pick me up, then drag to slash the page"><i></i><canvas width="9" height="${SL_ROWS.length}"></canvas></button>`;
      this._root.querySelector('canvas').getContext('2d').drawImage(slSword(), 0, 0);
      this._root.querySelector('button').addEventListener('click', e => { e.stopPropagation(); this._held ? this.drop() : this.pickup(); });
    }
    this._key = e => { if (e.key === 'Escape' && this._held) this.drop(); };
    addEventListener('keydown', this._key);
    this._wire();
  }
  disconnectedCallback() {
    removeEventListener('keydown', this._key);
    (this._offs || []).forEach(f => f()); this._offs = [];
    this.drop();
    if (this._fx) { this._fx.remove(); this._fx = null; }
  }
  _wire() {
    (this._offs || []).forEach(f => f()); this._offs = [];
    const tr = this.getAttribute('trigger');
    if (!tr || !tr.includes(':')) return;
    const i = tr.lastIndexOf(':'), sel = tr.slice(0, i), ev = tr.slice(i + 1);
    const fn = e => {
      const el = e.target.closest && e.target.closest(sel);
      if (!el) return;
      /* slice straight through the element that fired, at a jaunty angle */
      const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, a = -.32;
      this.slash(cx - Math.cos(a) * 200, cy - Math.sin(a) * 200, cx + Math.cos(a) * 200, cy + Math.sin(a) * 200);
    };
    document.addEventListener(ev, fn, true);
    this._offs.push(() => document.removeEventListener(ev, fn, true));
  }
  get color() { return this.getAttribute('color') || '#c6f432'; }

  /* one full-viewport canvas for the sword in hand, the streak and the sparks. It has its own
     view-transition-name, so it stays whole and on top while the page underneath is split. */
  _canvas() {
    if (this._fx) return this._fx;
    const c = this._fx = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:2147482500;pointer-events:none;view-transition-name:piix-slash-fx;touch-action:none';
    document.body.appendChild(c);
    c.addEventListener('pointerdown', e => this._down(e));
    c.addEventListener('pointermove', e => this._move(e));
    c.addEventListener('pointerup', e => this._up(e));
    c.addEventListener('contextmenu', e => { e.preventDefault(); this.drop(); });
    this._parts = []; this._streaks = []; this._seams = [];
    this._loop = (dt) => this._frame(dt);
    sub(this._loop);
    return c;
  }
  pickup() {
    this._canvas();
    this._held = true; this.classList.add('held');
    const r = this.getBoundingClientRect();
    this._hand = { x: r.left + r.width / 2, y: r.top + 10, a: -.6, vx: 0, vy: 0, tx: r.left, ty: r.top };
    this._fx.style.pointerEvents = 'auto'; this._fx.style.cursor = 'none';
    this._hint = true; this._hintT = 0;
  }
  drop() {
    this._held = false; this.classList.remove('held'); this._press = null;
    if (this._fx) { this._fx.style.pointerEvents = 'none'; this._fx.style.cursor = ''; }
  }
  _down(e) { if (e.button > 0) return; this._fx.setPointerCapture(e.pointerId); this._press = { x: e.clientX, y: e.clientY }; this._hint = false; }
  _move(e) { if (this._hand) { this._hand.tx = e.clientX; this._hand.ty = e.clientY; } if (this._press) this._press.cx = e.clientX, this._press.cy = e.clientY; }
  _up(e) {
    const p = this._press; this._press = null;
    if (!p) return;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 60) this.slash(p.x, p.y, e.clientX, e.clientY);
  }

  slash(x1, y1, x2, y2) {
    const W = innerWidth, H = innerHeight;
    if (x1 == null) { x1 = W * .08; y1 = H * .7; x2 = W * .92; y2 = H * .3; }
    let dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    /* the line runs edge to edge, whatever length you drew */
    const L = W + H, ax = x1 - dx * L, ay = y1 - dy * L, bx = x1 + dx * L, by = y1 + dy * L;
    this._canvas();
    this._streaks.push({ ax, ay, bx, by, x1, y1, dx, dy, t: 0 });
    for (let i = 0; i < 46; i++) {
      const u = Math.random(), px = x1 + dx * (u - .5) * len * 1.6, py = y1 + dy * (u - .5) * len * 1.6, sp = 80 + Math.random() * 380, ang = Math.atan2(dy, dx) + (Math.random() < .5 ? 1 : -1) * Math.PI / 2 + (Math.random() - .5);
      this._parts.push({ x: px, y: py, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 120, life: .45 + Math.random() * .4, t: 0, c: Math.random() < .35 ? this.color : '#ffffff' });
    }
    if (this.hasAttribute('sound')) sfx('slash', this, { force: true });
    this.dispatchEvent(new CustomEvent('piix:slash', { bubbles: true, detail: { x1, y1, x2, y2 } }));
    /* the streak leads; the page parts a beat later */
    setTimeout(() => this._cut(x1, y1, dx, dy), 110);
  }
  _cut(x1, y1, dx, dy) {
    const nx = -dy, ny = dx, W = innerWidth, H = innerHeight;
    const seam = () => this._seams.push({ x1, y1, dx, dy, t: 0 });
    if (reduced() || !document.startViewTransition || this._busy) { seam(); return; }
    this._busy = true;
    const L = (W + H) * 2, P = (x, y) => `${Math.round(x)}px ${Math.round(y)}px`;
    const ax = x1 - dx * L, ay = y1 - dy * L, bx = x1 + dx * L, by = y1 + dy * L;
    const half = s => `polygon(${P(ax, ay)},${P(bx, by)},${P(bx + nx * L * s, by + ny * L * s)},${P(ax + nx * L * s, ay + ny * L * s)})`;
    /* the halves part along the normal and slide a little along the cut, like torn paper */
    const gap = Math.min(26, Math.max(14, Math.min(W, H) * .025)), slide = gap * .7, rot = .7;
    const A = [nx * gap + dx * slide, ny * gap + dy * slide], B = [-nx * gap - dx * slide, -ny * gap - dy * slide];
    const hold = +this.getAttribute('hold') || 650, total = 260 + hold + 420;
    const k1 = (260 / total * 100).toFixed(1), k2 = ((260 + hold) / total * 100).toFixed(1), k3 = ((260 + hold + 260) / total * 100).toFixed(1);
    const frames = (name, [tx, ty], r) => `@keyframes ${name}{0%{transform:none;animation-timing-function:cubic-bezier(.12,.9,.25,1)}
${k1}%{transform:translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${r}deg);animation-timing-function:ease-in-out}
${k2}%{transform:translate(${(tx * 1.06).toFixed(1)}px,${(ty * 1.06).toFixed(1)}px) rotate(${r}deg);animation-timing-function:cubic-bezier(.5,0,.75,0)}
${k3}%{transform:translate(${(-tx * .05).toFixed(1)}px,${(-ty * .05).toFixed(1)}px) rotate(0deg);animation-timing-function:ease-out}100%{transform:none}}`;
    slCSS(`${frames('piix-cut-a', A, rot)}${frames('piix-cut-b', B, -rot)}
html.piix-cutting::view-transition{background:#f6f1e4 radial-gradient(rgba(23,18,31,.07) 1px,transparent 1.3px) 0 0/9px 9px}
html.piix-cutting::view-transition-group(root){animation:none}
html.piix-cutting::view-transition-image-pair(root){isolation:auto}
html.piix-cutting::view-transition-old(root),html.piix-cutting::view-transition-new(root){mix-blend-mode:normal;opacity:1;transform-origin:${P(x1, y1)};filter:drop-shadow(0 10px 14px rgba(10,6,20,.28))}
html.piix-cutting::view-transition-old(root){clip-path:${half(1)};animation:piix-cut-a ${total}ms both}
html.piix-cutting::view-transition-new(root){clip-path:${half(-1)};animation:piix-cut-b ${total}ms both}
html.piix-cutting::view-transition-old(piix-slash-fx){display:none}
html.piix-cutting::view-transition-new(piix-slash-fx),html.piix-cutting::view-transition-group(piix-slash-fx){animation:none;opacity:1}`);
    document.documentElement.classList.add('piix-cutting');
    let vt;
    try { vt = document.startViewTransition(() => {}); } catch (e) { this._busy = false; document.documentElement.classList.remove('piix-cutting'); seam(); return; }
    vt.finished.finally(() => { document.documentElement.classList.remove('piix-cutting'); this._busy = false; seam(); });
  }

  _frame(dt) {
    const c = this._fx;
    if (!c) return;
    const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const col = this.color;
    /* seams: a thin bright line where the halves met, healing */
    this._seams = this._seams.filter(s => (s.t += dt) < .9);
    for (const s of this._seams) {
      const u = s.t / .9, L = W + H;
      g.save(); g.globalAlpha = (1 - u) * .9; g.strokeStyle = col; g.lineWidth = 2 + 4 * (1 - u); g.shadowColor = col; g.shadowBlur = 16 * (1 - u);
      g.beginPath(); g.moveTo(s.x1 - s.dx * L, s.y1 - s.dy * L); g.lineTo(s.x1 + s.dx * L, s.y1 + s.dy * L); g.stroke(); g.restore();
    }
    /* streaks: a crescent of light that races along the cut and thins out */
    this._streaks = this._streaks.filter(s => (s.t += dt) < .42);
    for (const s of this._streaks) {
      const head = Math.min(1, s.t / .11), fade = s.t < .11 ? 1 : 1 - (s.t - .11) / .31;
      const hx = s.ax + (s.bx - s.ax) * head, hy = s.ay + (s.by - s.ay) * head;
      const tail = Math.max(0, head - .5), tx = s.ax + (s.bx - s.ax) * tail, ty = s.ay + (s.by - s.ay) * tail;
      const grad = g.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(.75, col); grad.addColorStop(1, '#ffffff');
      g.save(); g.globalAlpha = Math.max(0, fade); g.shadowColor = col; g.shadowBlur = 24;
      g.strokeStyle = grad; g.lineCap = 'round';
      g.lineWidth = 9 * Math.max(.2, fade); g.beginPath(); g.moveTo(tx, ty); g.lineTo(hx, hy); g.stroke();
      g.lineWidth = 2.5; g.strokeStyle = '#ffffff'; g.shadowBlur = 0; g.beginPath(); g.moveTo(tx, ty); g.lineTo(hx, hy); g.stroke();
      g.restore();
      /* the blade itself rides the head of the streak */
      if (s.t < .16) this._blade(g, hx, hy, Math.atan2(s.dy, s.dx) + Math.PI / 2, 5);
    }
    /* sparks: square, pixel ones */
    this._parts = this._parts.filter(p => (p.t += dt) < p.life);
    for (const p of this._parts) {
      p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.c;
      const s = p.t < .15 ? 7 : 5; g.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
    g.globalAlpha = 1;
    /* the sword in your hand: it leans into the direction you move */
    const h = this._hand;
    if (this._held && h) {
      const k = Math.min(1, dt * 20);
      const vx = (h.tx - h.x) / Math.max(dt, .001), vy = (h.ty - h.y) / Math.max(dt, .001);
      h.x += (h.tx - h.x) * k; h.y += (h.ty - h.y) * k;
      const sp = Math.hypot(vx, vy), want = sp > 200 ? Math.atan2(vy, vx) + Math.PI / 2 : -.55;
      let da = want - h.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      h.a += da * Math.min(1, dt * (sp > 200 ? 18 : 6));
      if (this._press && this._press.cx != null) {
        g.save(); g.setLineDash([6, 7]); g.strokeStyle = col; g.globalAlpha = .7; g.lineWidth = 2;
        g.beginPath(); g.moveTo(this._press.x, this._press.y); g.lineTo(this._press.cx, this._press.cy); g.stroke(); g.restore();
      }
      this._blade(g, h.x, h.y, h.a, 4, true);
      if (this._hint) {
        this._hintT += dt;
        const msg = 'Drag to slash  ·  Esc to put it back';
        g.save(); g.globalAlpha = Math.min(1, this._hintT * 3); g.font = '600 13px ui-sans-serif,system-ui,sans-serif';
        const w = g.measureText(msg).width + 24, x = Math.round(W / 2 - w / 2), y = H - 56;
        g.fillStyle = '#17121f'; g.fillRect(x, y, w, 32); g.fillStyle = '#ffffff'; g.fillText(msg, x + 12, y + 21); g.restore();
      }
    }
    if (!this._held && !this._streaks.length && !this._parts.length && !this._seams.length && !this._busy) {
      g.clearRect(0, 0, W, H);
    }
  }
  /* draw the sprite rotated about its grip (atGrip) or its middle */
  _blade(g, x, y, a, s, atGrip) {
    const img = slSword(), w = img.width * s, hh = img.height * s;
    g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(a);
    g.imageSmoothingEnabled = false;
    g.shadowColor = 'rgba(10,6,20,.35)'; g.shadowOffsetY = 6; g.shadowBlur = 8;
    g.drawImage(img, -w / 2, atGrip ? -hh * .82 : -hh / 2, w, hh);
    g.restore();
  }
}
define('piix-slash', PiixSlashElement);
ELEMENTS.slash = 'piix-slash';
