/* SHOAL: schools of ASCII fish that swim around your page.   @component shoal  @needs aqua
 *
 *   <section class="hero"> … <piix-shoal></piix-shoal></section>      or anywhere in <body>
 *
 * Little fish, one glyph each, schooling the way real fish do: polarised ribbons, loose swarms,
 * a slowly turning bait ball. Your layout is the reef: they read where your headings,
 * paragraphs, buttons and images are and swim between them, never over your words. Your cursor
 * is a predator; schools burst apart around it and close up behind, leaving a glowing wake.
 * Add predator="manta" and a manta ray glides through now and then, parting the schools.
 * Inside an element it stays in that element; anywhere else it swims over the whole screen.
 *
 *   fish       how many, 10 to 240                                 default: 90
 *   schools    how many schools, 1 to 6                            default: 3
 *   kinds      sardine | anchovy | goby | neon, comma separated    default: a mix
 *   predator   none | manta                                        default: none
 *   cell       glyph size, px                                      default: 14 */
const SHOAL_REEF = 'h1,h2,h3,h4,h5,h6,p,li,dt,dd,blockquote,pre,button,a,label,small,img,video,svg,canvas:not(piix-shoal canvas),input,textarea,select,table,figure,footer,nav,.btn,[class*=card]';

class PiixShoalElement extends HTMLElement {
  constructor() { super(); this._loop = (dt, t) => this._tick(dt, t / 1000); }
  connectedCallback() {
    const par = this.parentElement;
    this._page = !par || par === document.body || par === document.documentElement;
    this._box = this._page ? document.body : par;
    if (!this._page && getComputedStyle(par).position === 'static') par.style.position = 'relative';
    Object.assign(this.style, { position: this._page ? 'fixed' : 'absolute', inset: '0', display: 'block', pointerEvents: 'none', zIndex: this._page ? '2147481000' : '3', overflow: 'hidden' });
    this.setAttribute('aria-hidden', 'true');
    if (!this._cv) { this._cv = document.createElement('canvas'); this._cv.style.display = 'block'; this.appendChild(this._cv); }
    this._grid = new AQGrid(this._cv, +this.getAttribute('cell') || 14);
    this._wake = new AQField();
    this._ptr = { x: -1e4, y: -1e4, v: 0 };
    this._rocks = []; this._rockAt = 0;
    this._pm = e => { const r = this._origin(); const x = e.clientX - r.x, y = e.clientY - r.y; this._ptr.v = Math.hypot(x - this._ptr.x, y - this._ptr.y); this._ptr.x = x; this._ptr.y = y; };
    this._pl = () => { this._ptr.x = this._ptr.y = -1e4; };
    addEventListener('pointermove', this._pm, { passive: true }); document.documentElement.addEventListener('pointerleave', this._pl);
    this._sc = () => { this._rockAt = 0; };
    addEventListener('scroll', this._sc, { passive: true });
    this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(this._page ? document.documentElement : par);
    this._io = new IntersectionObserver(([e]) => { if (e.isIntersecting) sub(this._loop); else unsub(this._loop); }); this._io.observe(this);
    this._resize();
  }
  disconnectedCallback() {
    unsub(this._loop); this._ro && this._ro.disconnect(); this._io && this._io.disconnect();
    removeEventListener('pointermove', this._pm); document.documentElement.removeEventListener('pointerleave', this._pl); removeEventListener('scroll', this._sc);
  }
  _origin() { if (this._page) return { x: 0, y: 0 }; const r = this.getBoundingClientRect(); return { x: r.left, y: r.top }; }
  _resize() {
    const r = this.getBoundingClientRect(), w = Math.max(80, this._page ? innerWidth : r.width), h = Math.max(80, this._page ? innerHeight : r.height);
    this._w = w; this._h = h;
    this._grid.resize(w, h); this._wake.resize(this._grid.cols, this._grid.rows);
    this._rockAt = 0;
    /* on a light page the fish go darker, so they show */
    this._light = (() => { let el = this._box; while (el) { const c = getComputedStyle(el).backgroundColor, m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c); if (m && (m[4] === undefined || +m[4] > .5)) return (+m[1] * .3 + +m[2] * .59 + +m[3] * .11) > 140; el = el.parentElement; } return true; })();
    if (!this._schools) this._spawn();
    if (reduced()) this._tick(0, 0);
  }
  /* the reef: where your content is, in this element's coordinates */
  _reef() {
    const o = this._origin(), w = this._w, h = this._h, out = [];
    const scope = this._page ? document.body : this._box;
    for (const el of scope.querySelectorAll(SHOAL_REEF)) {
      if (el === this || this.contains(el) || el.closest('piix-shoal,piix-pal,[data-piixpal],[data-piixpal-ui],[data-piixpal-visit-ui]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const x0 = r.left - o.x, y0 = r.top - o.y, x1 = r.right - o.x, y1 = r.bottom - o.y;
      if (x1 < -40 || y1 < -40 || x0 > w + 40 || y0 > h + 40) continue;
      /* wrappers as big as the whole space aren't rocks */
      if ((x1 - x0) * (y1 - y0) > w * h * .45) continue;
      out.push([x0, y0, x1, y1]);
      if (out.length > 160) break;
    }
    return out;
  }
  _free() {
    /* somewhere not inside a rock */
    for (let i = 0; i < 40; i++) { const x = rnd(this._w * .05, this._w * .95), y = rnd(this._h * .05, this._h * .95); if (!this._rocks.some(r => x > r[0] - 10 && x < r[2] + 10 && y > r[1] - 10 && y < r[3] + 10)) return [x, y]; }
    return [rnd(0, this._w), rnd(0, this._h)];
  }
  _spawn() {
    this._rocks = this._reef();
    const total = clamp(+this.getAttribute('fish') || 90, 10, 240), ns = clamp(+this.getAttribute('schools') || 3, 1, 6);
    const kinds = (this.getAttribute('kinds') || 'sardine,neon,anchovy,goby').split(',').map(s => s.trim()).filter(Boolean);
    this._schools = Array.from({ length: ns }, (_, i) => { const [x, y] = this._free(); return new AQSchool(Math.round(total / ns), { x, y, w: this._w * .3, h: this._h * .3, kind: kinds[i % kinds.length] }); });
    if (this.getAttribute('predator') === 'manta') {
      const L = clamp(Math.min(this._w, this._h) * .42, 110, 300);
      this._manta = new AQSpine({ x: -L, y: this._h * .5, len: L, nodes: 12, heading: 0, speed: 46, fins: 'manta', width: s => (s < .62 ? .52 * Math.sin(Math.PI * Math.pow(s / .62, .8)) * (1 - s * .3) + .04 : .03 * (1 - s)) });
      this._manta.target = { x: this._w * .5, y: this._h * .5 };
    }
  }
  _tick(dt, t) {
    const g = this._grid, W = this._wake, w = this._w, h = this._h, still = reduced() ? 0 : dt;
    if (!g.cols) return;
    if ((this._rockAt -= dt) <= 0) { this._rocks = this._reef(); this._rockAt = .3; }
    const rocks = this._rocks, ptr = this._ptr, manta = this._manta;
    /* where to keep away from: the edges, the reef, the cursor, the manta */
    const push = [0, 0];
    const avoid = (x, y) => {
      push[0] = 0; push[1] = 0;
      let scare = 0;
      const m = 36;
      if (x < m) push[0] += (m - x) * 18; if (x > w - m) push[0] -= (x - (w - m)) * 18;
      if (y < m) push[1] += (m - y) * 18; if (y > h - m) push[1] -= (y - (h - m)) * 18;
      for (const rc of rocks) aqRectPush(x, y, rc, 30, 1400, push);
      const pd = Math.hypot(x - ptr.x, y - ptr.y);
      if (pd < 150) { const f = (1 - pd / 150) * 3600; push[0] += (x - ptr.x) / (pd || 1) * f; push[1] += (y - ptr.y) / (pd || 1) * f; scare = 1; }
      if (manta) { const hd = manta.pts[3], md = Math.hypot(x - hd.x, y - hd.y), R = manta.len * .55; if (md < R) { const f = (1 - md / R) * 3000; push[0] += (x - hd.x) / (md || 1) * f; push[1] += (y - hd.y) / (md || 1) * f; scare = 1; } }
      return [push[0], push[1], scare];
    };
    if (still) for (const s of this._schools) s.step(Math.min(dt, .033), avoid, t);
    /* the manta glides across, turns, glides back */
    if (manta && still) {
      const hd = manta.head;
      if (Math.hypot(manta.target.x - hd.x, manta.target.y - hd.y) < manta.len * .5) manta.target = { x: hd.x < w / 2 ? w + manta.len * .6 : -manta.len * .6, y: rnd(h * .2, h * .8) };
      manta.steer(manta.target.x, manta.target.y, dt, manta.speed, .7);
    }
    /* wake: fish stir it, it spreads and fades */
    const cw = g.cw, ch = g.ch;
    for (const s of this._schools) for (const f of s.fish) W.add(f.x / cw, f.y / ch, .18);
    if (still) W.spread(.9);
    /* ---------- draw ---------- */
    const L = this._light;
    const wk = L ? [40, 90, 200] : [110, 230, 255];
    const cols = g.cols, rows = g.rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const v = W.a[r * cols + c];
      if (v > .1) g.put(c, r, '·', aqColor(wk[0], wk[1], wk[2], Math.min(.4, v * .6)));
    }
    if (manta) {
      const base = L ? [70, 80, 105] : [58, 70, 96], RAMP = '.:-=+*#%@';
      /* it glides beneath your content: no glyph where the page has something */
      const under = (c, r) => { const x = (c + .5) * cw, y = (r + .5) * ch; for (const rc of rocks) if (x > rc[0] && x < rc[2] && y > rc[1] && y < rc[3]) return true; return false; };
      manta.draw(g, (c, r, s, v, part) => {
        if (under(c, r)) return;
        const shade = clamp(.3 + .7 * (1 - v * v), 0, 1), k = .6 + .4 * shade + Math.sin(t * 2 + s * 6) * .05;
        g.put(c, r, part === 1 ? RAMP[Math.min(8, (shade * 9) | 0)] : '.', aqColor(base[0] * k, base[1] * k, base[2] * k + 20 * shade, part === 1 ? .82 : .5));
      });
    }
    for (const s of this._schools) {
      const [r0, g0, b0] = s.k.rgb, k = L ? .5 : 1;
      for (const f of s.fish) {
        const c = (f.x / cw) | 0, r = (f.y / ch) | 0;
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        const gl = f.glint > .5, col = gl ? (L ? aqColor(20, 40, 90, 1) : aqColor(240, 252, 255, 1)) : aqColor(r0 * k, g0 * k, b0 * k, .92);
        /* swimming sideways: a tail and a head, ->  <- ; up or down: one stroke */
        if (Math.abs(f.vx) > Math.abs(f.vy) * 1.2) {
          const dir = f.vx > 0 ? 1 : -1, tc = c - dir;
          if (tc >= 0 && tc < cols) g.put(tc, r, gl ? '=' : '-', aqColor(r0 * k, g0 * k, b0 * k, .6));
          g.put(c, r, dir > 0 ? '>' : '<', col);
        } else g.put(c, r, gl ? '=' : aqFishGlyph(f.vx, f.vy), col);
      }
    }
    g.flush(null);
  }
}
define('piix-shoal', PiixShoalElement);
ELEMENTS.shoal = 'piix-shoal';
