/* MARQUEE: a row that scrolls forever and fades out at its ends in dithered pixels.   @component marquee
 *
 *   <piix-marquee>
 *     <img src="logo-a.svg" alt="Acme"> <img src="logo-b.svg" alt="Globex"> …
 *   </piix-marquee>
 *
 * Logos, words, anything: they slide past in a loop with no seam, and instead of a soft fade the
 * edges break up into a pixel dither. Hover to pause it. For people who prefer less motion it
 * holds still. The copies it makes to loop are hidden from screen readers.
 *
 *   speed     pixels a second                              default: 40
 *   gap       px between items                             default: 48
 *   fade      px of dithered fade at each end              default: 96
 *   reverse   scroll the other way */
class PiixMarqueeElement extends HTMLElement {
  static get observedAttributes() { return ['speed', 'gap', 'fade', 'reverse']; }
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._tick = this._tick.bind(this); this._x = 0; }
  connectedCallback() {
    this._build();
    this._ro = new ResizeObserver(() => this._mask()); this._ro.observe(this);
    this.addEventListener('pointerenter', this._pe = () => { this._paused = true; });
    this.addEventListener('pointerleave', this._pl = () => { this._paused = false; });
    sub(this._tick);
  }
  disconnectedCallback() { unsub(this._tick); if (this._ro) this._ro.disconnect(); }
  attributeChangedCallback() { if (this.shadowRoot.firstChild) this._build(); }
  _build() {
    const gap = +this.getAttribute('gap') || 48;
    this.shadowRoot.innerHTML = `<style>
:host{display:block;overflow:hidden;-webkit-mask-size:100% 100%;mask-size:100% 100%}
.track{display:flex;width:max-content;will-change:transform}
.row{display:flex;align-items:center;gap:${gap}px;padding-right:${gap}px;flex:0 0 auto}
.row ::slotted(*){flex:0 0 auto}
</style><div class="track"><div class="row" part="row"><slot></slot></div><div class="row copy" aria-hidden="true"></div></div>`;
    this._track = this.shadowRoot.querySelector('.track');
    this._copy = this.shadowRoot.querySelector('.copy');
    /* the second row is a copy of the first, so the loop has no seam */
    this._copy.innerHTML = '';
    for (const n of this.childNodes) { const c = n.cloneNode(true); if (c.nodeType === 1) { c.setAttribute('aria-hidden', 'true'); c.setAttribute('tabindex', '-1'); } this._copy.appendChild(c); }
    this._mask();
  }
  /* a mask that's solid in the middle and dithered toward the ends, pixel by pixel */
  _mask() {
    const w = Math.max(1, Math.round(this.clientWidth)), f = Math.min(w / 2, +this.getAttribute('fade') || 96), px = 4;
    if (!w || w === this._mw) return;
    this._mw = w;
    const c = document.createElement('canvas'); c.width = Math.ceil(w / px); c.height = 4;
    const g = c.getContext('2d'), d = g.createImageData(c.width, 4), B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < 4; y++) for (let x = 0; x < c.width; x++) {
      const at = x * px, k = Math.min(1, at / f, (w - at) / f), i = (y * c.width + x) * 4;
      d.data[i + 3] = k > (B[(y % 4) * 4 + (x % 4)] + .5) / 16 ? 255 : 0;
    }
    g.putImageData(d, 0, 0);
    const url = `url(${c.toDataURL()})`;
    this.style.webkitMaskImage = url; this.style.maskImage = url;
    this.style.imageRendering = 'pixelated';
  }
  _tick(dt) {
    if (!this._track || reduced() || this._paused) return;
    const w = this._track.firstElementChild.offsetWidth;
    if (!w) return;
    const dir = this.hasAttribute('reverse') ? 1 : -1;
    this._x = (this._x + dir * (+this.getAttribute('speed') || 40) * dt) % w;
    if (this._x > 0) this._x -= w;
    this._track.style.transform = `translateX(${this._x.toFixed(1)}px)`;
  }
}
define('piix-marquee', PiixMarqueeElement);
ELEMENTS.marquee = 'piix-marquee';
