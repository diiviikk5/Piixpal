/* SCRATCH: a scratch-off card. Pixel foil over your content; scratch it away.   @component scratch
 *
 *   <piix-scratch>
 *     <h3>You won 20% off</h3>
 *     <code>PIXEL20</code>
 *   </piix-scratch>
 *
 * Whatever is inside sits under a sheet of pixel foil with a pattern and a label. Drag over it
 * (mouse, finger or pen) and the foil comes off in pixel blocks, curling off as shavings that
 * fall away. Once most of it is gone, the rest flakes off by itself and the card announces it.
 * Keyboard and screen-reader users get a real button: Enter or Space reveals it at once.
 *
 *   foil      silver | gold | holo | ink                           default: silver
 *   label     the text printed on the foil                         default: SCRATCH ME
 *   grain     the size of one foil pixel, px                        default: 6
 *   brush     how wide you scratch, px                              default: 22
 *   reveal    how much must be scratched before it all comes off   default: .55
 *   sound     make sounds even without <piix-chiptune> ("off" to stay silent)
 *
 *   methods: reveal(), reset()
 *   events: scratch (detail: { progress }), reveal */
/* light, mid, dark, shine */
const SCR_FOILS = {
  silver: ['#e8e6ee', '#c3c0cc', '#8f8b9c', '#ffffff'],
  gold: ['#ffe08a', '#f2b632', '#b97a12', '#fff6d0'],
  holo: ['#c7f0ff', '#e4c7ff', '#ffc7e8', '#ffffff'],
  ink: ['#3a3048', '#2a2236', '#17121f', '#6b5d85']
};
class PiixScratchElement extends HTMLElement {
  static get observedAttributes() { return ['foil', 'label', 'grain']; }
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._done = false; this._bits = []; this._loop = dt => this._tick(dt); }
  connectedCallback() {
    this.shadowRoot.innerHTML = `<style>
:host{position:relative;display:inline-block;vertical-align:middle;isolation:isolate;-webkit-tap-highlight-color:transparent}
:host([hidden]){display:none}
.in{position:relative}
canvas{position:absolute;left:0;top:0;width:100%;height:100%;image-rendering:pixelated;cursor:crosshair;touch-action:none}
:host([data-done]) canvas{pointer-events:none}
.fall{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;overflow:visible}
button{position:absolute;inset:0;opacity:0;border:0;background:none;pointer-events:none}
button:focus-visible{opacity:1;outline:3px dashed #17121f;outline-offset:4px;background:transparent}
:host([data-done]) button{display:none}
</style><div class="in"><slot></slot></div><canvas class="foil" aria-hidden="true"></canvas><canvas class="fall" aria-hidden="true"></canvas><button type="button" part="button"></button>`;
    const $ = s => this.shadowRoot.querySelector(s);
    this._cv = $('.foil'); this._fc = $('.fall'); this._btn = $('button');
    this._btn.setAttribute('aria-label', `Scratch card: ${this.getAttribute('label') || 'scratch me'}. Press to reveal.`);
    this._btn.addEventListener('click', e => { if (e.detail === 0) this.reveal(); });
    this._cv.addEventListener('pointerdown', this._pd = e => { if (this._done) return; this._cv.setPointerCapture(e.pointerId); this._down = true; this._last = null; this._at(e); });
    this._cv.addEventListener('pointermove', e => { if (this._down) this._at(e); });
    const up = () => { this._down = false; this._last = null; };
    this._cv.addEventListener('pointerup', up); this._cv.addEventListener('pointercancel', up);
    this._ro = new ResizeObserver(() => this._size());
    this._ro.observe(this);
    this._hide(true);
  }
  disconnectedCallback() { this._ro.disconnect(); unsub(this._loop); this._hide(false); }
  attributeChangedCallback() { if (this._cv && !this._done) { this._cells = null; this._size(); } }
  /* until it is revealed, what's under the foil can't be tabbed to or read out */
  _hide(on) { for (const c of this.children) { if (on) { c._scrWas = c.inert; c.inert = true; } else if ('_scrWas' in c) { c.inert = c._scrWas; delete c._scrWas; } } }

  _size() {
    const W = this.clientWidth, H = this.clientHeight;
    if (!W || !H) return;
    const g = this._g = clamp(+this.getAttribute('grain') || 6, 2, 16);
    const gw = Math.ceil(W / g), gh = Math.ceil(H / g);
    /* keep what was already scratched when the size stays the same */
    if (!this._cells || this._gw !== gw || this._gh !== gh) { this._cells = new Uint8Array(gw * gh).fill(1); this._left = gw * gh; }
    this._gw = gw; this._gh = gh; this._W = W; this._H = H;
    for (const c of [this._cv, this._fc]) { c.width = gw; c.height = gh; }
    this._fc.style.cssText = `width:${W}px;height:${H + 200}px`; this._fc.height = gh + Math.ceil(200 / g);
    this._paint();
  }
  /* the foil: a dithered sheen across the card, a diamond pattern, the label in pixels, a border */
  _paint() {
    const g = this._cv.getContext('2d'), gw = this._gw, gh = this._gh, P = SCR_FOILS[this.getAttribute('foil')] || SCR_FOILS.silver;
    const img = g.createImageData(gw, gh), d = img.data, cols = P.map(c => hexRGBA(c));
    const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const holo = this.getAttribute('foil') === 'holo';
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      if (!this._cells[i]) continue;
      /* a diagonal sheen band, dithered between the foil's light and mid tones */
      const t = ((x + y * 1.4) / (gw + gh * 1.4)), band = Math.abs(((t * 3) % 1) - .5) * 2, k = BAY[(y & 3) * 4 + (x & 3)] / 16;
      let c = band > k ? cols[0] : cols[1];
      if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) c = cols[2];
      if (x === 0 || y === 0 || x === gw - 1 || y === gh - 1) c = cols[2];
      if (holo) c = cols[Math.floor((t * 6 + (y & 1)) % 3)];
      d.set([c[0], c[1], c[2], 255], i * 4);
    }
    g.putImageData(img, 0, 0);
    /* the label, drawn at foil resolution so it stays pixel-crisp */
    const label = (this.getAttribute('label') || 'SCRATCH ME').toUpperCase();
    const fs = Math.max(5, Math.min(Math.floor(gh * .32), Math.floor(gw / (label.length * .75))));
    g.font = `400 ${fs}px ${KIT_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = P[2]; g.fillText(label, gw / 2 + 1, gh / 2 + 1);
    g.fillStyle = P[3]; g.fillText(label, gw / 2, gh / 2);
    /* the label was drawn over scratched spots too: punch them back out */
    for (let i = 0; i < this._cells.length; i++) if (!this._cells[i]) g.clearRect(i % gw, (i / gw) | 0, 1, 1);
  }
  _at(e) {
    const r = this.getBoundingClientRect(), x = (e.clientX - r.left) / this._g, y = (e.clientY - r.top) / this._g;
    const from = this._last || { x, y }, rad = clamp(+this.getAttribute('brush') || 22, 6, 120) / this._g / 2;
    /* fill the gap between two pointer events, so a fast stroke stays unbroken */
    const n = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / Math.max(1, rad * .5)));
    for (let s = 1; s <= n; s++) this._dig(from.x + (x - from.x) * s / n, from.y + (y - from.y) * s / n, rad);
    this._last = { x, y };
  }
  _dig(cx, cy, rad) {
    const g = this._cv.getContext('2d'), gw = this._gw, gh = this._gh;
    let n = 0;
    for (let y = Math.max(0, Math.floor(cy - rad)); y <= Math.min(gh - 1, Math.ceil(cy + rad)); y++)
      for (let x = Math.max(0, Math.floor(cx - rad)); x <= Math.min(gw - 1, Math.ceil(cx + rad)); x++) {
        const i = y * gw + x;
        /* a slightly ragged brush: foil tears unevenly at the edge */
        if (!this._cells[i] || (x - cx) ** 2 + (y - cy) ** 2 > rad * rad * (.75 + Math.random() * .5)) continue;
        this._cells[i] = 0; this._left--; n++;
        const px = g.getImageData(x, y, 1, 1).data;
        if (chance(.35)) this._bits.push({ x, y, vx: rnd(-8, 8), vy: rnd(-12, 2), c: `rgb(${px[0]},${px[1]},${px[2]})`, t: rnd(.5, 1.1) });
        g.clearRect(x, y, 1, 1);
      }
    if (!n) return;
    sfx('type', this, { pitch: rnd(.5, .8), gap: 45 });
    sub(this._loop);
    const p = 1 - this._left / this._cells.length;
    this.dispatchEvent(new CustomEvent('scratch', { detail: { progress: p } }));
    if (p >= clamp(+(this.getAttribute('reveal') || .55), .05, 1)) this.reveal();
  }
  /* the rest of the foil flakes off, pixel by pixel, in a random order */
  reveal() {
    if (this._done) return;
    this._done = true; this.toggleAttribute('data-done', true);
    this._hide(false);
    const left = [];
    for (let i = 0; i < this._cells.length; i++) if (this._cells[i]) left.push(i);
    for (let i = left.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [left[i], left[j]] = [left[j], left[i]]; }
    this._flake = left; this._flakeAt = 0;
    if (reduced()) { this._cv.getContext('2d').clearRect(0, 0, this._gw, this._gh); this._flake = []; }
    sfx('coin', this);
    this.dispatchEvent(new Event('reveal'));
    sub(this._loop);
  }
  reset() { this._done = false; this.removeAttribute('data-done'); this._cells = null; this._bits = []; this._flake = null; this._hide(true); this._size(); }
  _tick(dt) {
    const g = this._cv.getContext('2d'), gw = this._gw;
    /* flaking: about half a second for the whole sheet */
    if (this._flake && this._flakeAt < this._flake.length) {
      const k = Math.ceil(this._flake.length * dt / .5);
      for (const i of this._flake.slice(this._flakeAt, this._flakeAt += k)) {
        const x = i % gw, y = (i / gw) | 0;
        if (chance(.18)) { const px = g.getImageData(x, y, 1, 1).data; this._bits.push({ x, y, vx: rnd(-6, 6), vy: rnd(-8, 0), c: `rgb(${px[0]},${px[1]},${px[2]})`, t: rnd(.4, .9) }); }
        this._cells[i] = 0; g.clearRect(x, y, 1, 1);
      }
    }
    /* shavings fall, spin a little, and fade */
    const f = this._fc.getContext('2d');
    f.clearRect(0, 0, this._fc.width, this._fc.height);
    for (const b of this._bits) {
      b.vy += 60 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.t -= dt;
      f.globalAlpha = clamp(b.t * 2, 0, 1); f.fillStyle = b.c;
      f.fillRect(Math.round(b.x), Math.round(b.y), chance(.5) ? 1 : 2, 1);
    }
    f.globalAlpha = 1;
    this._bits = this._bits.filter(b => b.t > 0);
    if (!this._bits.length && (!this._flake || this._flakeAt >= this._flake.length)) unsub(this._loop);
  }
}
define('piix-scratch', PiixScratchElement);
ELEMENTS.scratch = 'piix-scratch';
