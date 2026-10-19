/* ZIPPER: a zipped-up panel over your content. Pull it open.   @component zipper
 *
 *   <piix-zipper>
 *     <h2>Something new</h2>
 *     <p>Hidden until you unzip it.</p>
 *   </piix-zipper>
 *
 * A panel of pixel fabric with a zip down the middle sits over whatever is inside. Grab the pull
 * and drag it down: the teeth come apart, and the two halves part in a V that widens above the
 * pull, the way a real zip does. Let go halfway and it stays halfway. Pull it nearly to the
 * bottom and it gives way: the halves fall aside and your content is all yours. The pull is a
 * real slider for keyboards (arrows move it, Enter opens it all).
 *
 *   fabric    denim | leather | lime | ink                         default: denim
 *   teeth     brass | silver | lime                                default: brass
 *   pixel     size of one pixel, px                                default: 3
 *   sound     make sounds even without <piix-chiptune> ("off" to stay silent)
 *
 *   methods: open(), close()
 *   events: pull (detail: { progress }), open */
/* light, mid, dark, stitching */
const ZIP_FABRIC = {
  denim: ['#4a6db3', '#3b5b9e', '#26407a', '#e8b04a'],
  leather: ['#9a5434', '#82442a', '#5a2c18', '#f0d9b5'],
  lime: ['#d4fb5c', '#c6f432', '#8fb81c', '#17121f'],
  ink: ['#342b44', '#2a2236', '#17121f', '#c6f432']
};
/* shine, metal, shade */
const ZIP_TEETH = { brass: ['#ffe9a3', '#e0b443', '#8a6416'], silver: ['#ffffff', '#c3c8d4', '#6a7184'], lime: ['#f4ffc7', '#c6f432', '#6f8f12'] };
class PiixZipperElement extends HTMLElement {
  static get observedAttributes() { return ['fabric', 'teeth', 'pixel']; }
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._p = 0; this._want = 0; this._fall = 0; this._open = false; this._loop = dt => this._tick(dt); }
  connectedCallback() {
    this.shadowRoot.innerHTML = `<style>
:host{position:relative;display:block;isolation:isolate}
canvas{position:absolute;left:0;top:0;width:100%;height:100%;image-rendering:pixelated;touch-action:none;z-index:2;cursor:grab}
:host([data-open]) canvas{display:none}
.knob{position:absolute;z-index:3;width:44px;height:64px;margin-left:-22px;border:0;padding:0;background:none;cursor:grab;touch-action:none}
.knob:active{cursor:grabbing}
.knob:focus-visible{outline:3px dashed #17121f;outline-offset:2px}
:host([data-open]) .knob{display:none}
</style><slot></slot><canvas aria-hidden="true"></canvas><button class="knob" type="button" role="slider" aria-label="Zipper" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" part="pull"></button>`;
    this._cv = this.shadowRoot.querySelector('canvas'); this._knob = this.shadowRoot.querySelector('.knob');
    const k = this._knob;
    /* grab the pull itself, or anywhere near the zip line: both start a drag */
    const grab = (el, e) => { el.setPointerCapture(e.pointerId); this._drag = el; this._dy = e.clientY - (this.getBoundingClientRect().top + this._p * this._H); };
    k.addEventListener('pointerdown', e => grab(k, e));
    this._cv.addEventListener('pointerdown', e => {
      const r = this.getBoundingClientRect();
      if (Math.abs(e.clientX - r.left - r.width / 2) < 60) { grab(this._cv, e); this._dy = 0; this._want = clamp((e.clientY - r.top) / r.height, this._p, 1); this._wake(); }
    });
    const move = e => {
      if (!this._drag) return;
      const r = this.getBoundingClientRect();
      this._want = clamp((e.clientY - this._dy - r.top) / r.height, 0, 1); this._wake();
    };
    k.addEventListener('pointermove', move); this._cv.addEventListener('pointermove', move);
    const up = () => { if (!this._drag) return; this._drag = false; if (this._want > .9) this.open(); };
    for (const el of [k, this._cv]) { el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); }
    k.addEventListener('keydown', e => {
      const d = { ArrowDown: .06, ArrowRight: .06, ArrowUp: -.06, ArrowLeft: -.06, PageDown: .25, PageUp: -.25 }[e.key];
      if (d) { e.preventDefault(); this._want = clamp(this._want + d, 0, 1); this._wake(); if (this._want > .9) this.open(); }
      else if (e.key === 'Enter' || e.key === 'End') { e.preventDefault(); this.open(); }
      else if (e.key === 'Home') { e.preventDefault(); this.close(); }
    });
    this._ro = new ResizeObserver(() => { this._size(); this._draw(); });
    this._ro.observe(this);
    this._hide(true);
  }
  disconnectedCallback() { this._ro.disconnect(); unsub(this._loop); this._hide(false); }
  attributeChangedCallback() { if (this._cv) { this._size(); this._draw(); } }
  _hide(on) { for (const c of this.children) { if (on) { if (!('_zipWas' in c)) c._zipWas = c.inert; c.inert = true; } else if ('_zipWas' in c) { c.inert = c._zipWas; delete c._zipWas; } } }
  _wake() { sub(this._loop); }
  _size() {
    const W = this.clientWidth, H = this.clientHeight;
    if (!W || !H) return;
    const g = this._g = clamp(+this.getAttribute('pixel') || 3, 1, 8);
    this._W = W; this._H = H; this._gw = Math.ceil(W / g); this._gh = Math.ceil(H / g);
    this._cv.width = this._gw; this._cv.height = this._gh;
    this._img = new ImageData(this._gw, this._gh); this._u = new Uint32Array(this._img.data.buffer);
    /* the handle sits on the pull from the start, not only once it moves */
    this._knob.style.left = W / 2 + 'px'; this._knob.style.top = this._p * H - 10 + 'px';
  }
  open() {
    if (this._open) return;
    this._want = 1; this._finishing = true; this._wake();
  }
  close() {
    if (this._open) { this._open = false; this.removeAttribute('data-open'); this._hide(true); this._fall = 0; this._p = 1; }
    this._finishing = false; this._want = 0; this._wake();
  }

  _tick(dt) {
    const before = this._p;
    /* the pull follows your hand closely, with a little weight */
    this._p += (this._want - this._p) * Math.min(1, dt * (this._drag ? 22 : this._finishing ? 6 : 10));
    if (Math.abs(this._want - this._p) < .001) this._p = this._want;
    /* a click for every tooth the pull passes */
    const th = 2 * this._g / this._H;
    if (Math.floor(before / th) !== Math.floor(this._p / th)) sfx('type', this, { pitch: .6 + this._p * .8, gap: 25 });
    /* all the way down: the halves fall aside */
    if (this._finishing && this._p > .985) {
      this._fall += dt * (reduced() ? 99 : 1);
      if (this._fall > .55 && !this._open) {
        this._open = true; this.setAttribute('data-open', ''); this._hide(false);
        sfx('success', this);
        this.dispatchEvent(new Event('open'));
      }
    }
    this._knob.style.top = this._p * this._H - 10 + 'px';
    this._knob.setAttribute('aria-valuenow', Math.round(this._p * 100));
    if (before !== this._p) this.dispatchEvent(new CustomEvent('pull', { detail: { progress: this._p } }));
    this._draw();
    if (this._p === this._want && (!this._finishing || this._open)) unsub(this._loop);
  }

  _draw() {
    if (!this._u) return;
    const u = this._u, gw = this._gw, gh = this._gh;
    const pack = h => { const [r, g, b] = hexRGBA(h); return (255 << 24 | b << 16 | g << 8 | r) >>> 0; };
    const F = (ZIP_FABRIC[this.getAttribute('fabric')] || ZIP_FABRIC.denim).map(pack);
    const T = (ZIP_TEETH[this.getAttribute('teeth')] || ZIP_TEETH.brass).map(pack);
    u.fill(0);
    const cx = gw / 2, py = this._p * gh, tw = 3, th = 2;
    /* the halves slide out and drop once it gives way */
    const fk = clamp(this._fall / .55, 0, 1), fx = fk * fk * gw * .6, fy = fk * fk * gh * .25;
    const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < gw && y >= 0 && y < gh) u[y * gw + x] = c; };
    for (let y = 0; y < gh; y++) {
      /* above the pull the zip is open: a V that widens toward the top */
      const gap = y < py ? Math.min(gw, (py - y) * .85 + (fk > 0 ? gw * fk : 0)) : 0;
      const le = cx - gap / 2, re = cx + gap / 2;
      for (let x = 0; x < gw; x++) {
        const left = x < cx;
        if (left ? x >= le : x < re) continue;
        /* twill: diagonal lines in the weave, a darker hem along the outer edge */
        const tw2 = ((x + y) % 4 === 0) ? 2 : ((x + y) % 4 === 2 ? 0 : 1);
        let c = F[tw2];
        /* the tape the teeth are sewn to, then a row of stitching beside it */
        const edge = left ? le - x : x - re + 1;
        if (edge <= tw + 1) c = F[2];
        else if (edge === tw + 4 && (y >> 1) % 2 === 0) c = F[3];
        if (x === 0 || x === gw - 1 || y === 0 || y === gh - 1) c = F[2];
        put(x + (left ? -fx : fx), y + fy, c);
      }
      /* the teeth: each side has a tooth on alternate rows; where it's closed they interlock */
      const row = Math.floor(y / th), leftTooth = row % 2 === 0;
      const shade = y % th === 0 ? T[0] : T[1];
      for (let k = 0; k < tw + (gap > 0 ? 0 : 1); k++) {
        if (leftTooth) put(le - tw + k + (gap > 0 ? 0 : 1) - fx, y + fy, k === tw ? T[2] : shade);
        else put(re + tw - 1 - k - (gap > 0 ? 0 : 1) + fx, y + fy, k === tw ? T[2] : shade);
      }
    }
    /* the slider and its tab */
    if (fk < 1) {
      const sy = Math.min(py, gh - 1);
      for (let y = -3; y <= 2; y++) for (let x = -4; x <= 3; x++) {
        const w = 4 - Math.max(0, y) ;
        if (Math.abs(x + .5) > w) continue;
        put(cx + x, sy + y, y === -3 ? T[0] : (x === -4 || x === 3 || y === 2) ? T[2] : T[1]);
      }
      for (let y = 3; y <= 12; y++) for (let x = -2; x <= 1; x++) {
        const hole = y >= 9 && y <= 10 && (x === -1 || x === 0);
        if (hole) continue;
        put(cx + x, sy + y, x === -2 ? T[0] : x === 1 || y === 12 ? T[2] : T[1]);
      }
    }
    this._cv.getContext('2d').putImageData(this._img, 0, 0);
  }
}
define('piix-zipper', PiixZipperElement);
ELEMENTS.zipper = 'piix-zipper';
