/* STAT: a big number that counts up in pixel type when it scrolls into view.   @component stat
 *
 *   <piix-stat value="12480" suffix="+">teams use it</piix-stat>
 *
 * The number rolls up from zero the first time it's on screen, in chunky pixel digits with a hard
 * shadow, and each digit flickers as it changes. Whatever you put inside is the label under it.
 * Screen readers get the final number straight away.
 *
 *   value     the number
 *   prefix    before it, like $
 *   suffix    after it, like + or %
 *   decimals  digits after the point                       default: 0
 *   duration  seconds to count                             default: 1.6
 *   tone      lime | coral | violet | sky | sun | mint | ink | paper   default: lime */
class PiixStatElement extends HTMLElement {
  static get observedAttributes() { return ['value', 'prefix', 'suffix', 'decimals', 'tone']; }
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._tick = this._tick.bind(this); }
  connectedCallback() {
    this._build();
    this._io = new IntersectionObserver(es => { if (es[es.length - 1].isIntersecting && !this._t0) { this._t0 = now(); sub(this._tick); this._io.disconnect(); } }, { threshold: .4 });
    this._io.observe(this);
  }
  disconnectedCallback() { unsub(this._tick); if (this._io) this._io.disconnect(); }
  attributeChangedCallback() { if (this.shadowRoot.firstChild) { this._build(); if (this._t0) { this._t0 = now(); sub(this._tick); } } }
  _fmt(n) { const d = +this.getAttribute('decimals') || 0; return (this.getAttribute('prefix') || '') + n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) + (this.getAttribute('suffix') || ''); }
  _build() {
    const [c] = kitTone(this), v = +this.getAttribute('value') || 0;
    this.shadowRoot.innerHTML = `<style>
:host{display:inline-block;color:inherit}
.n{font:400 clamp(40px,6vw,72px)/1 ${KIT_FONT};color:${c};letter-spacing:.02em;text-shadow:4px 4px 0 #17121f;white-space:nowrap;font-variant-numeric:tabular-nums}
.n i{font-style:normal;display:inline-block}
.n i.f{animation:fl .12s steps(2)}
@keyframes fl{50%{opacity:.35;transform:translateY(-2px)}}
.l{margin-top:10px;font:600 14px/1.3 "Bricolage Grotesque",system-ui,sans-serif;opacity:.75}
@media (prefers-reduced-motion:reduce){.n i.f{animation:none}}
</style><div class="n" part="number" aria-hidden="true"></div><div class="l" part="label"><slot></slot></div>`;
    this._n = this.shadowRoot.querySelector('.n');
    this.setAttribute('role', 'figure');
    this.setAttribute('aria-label', `${this._fmt(v)} ${this.textContent.trim()}`.trim());
    this._show(this._t0 && !reduced() ? 0 : (this._t0 || reduced() ? v : 0));
  }
  /* draw the number, flickering any digit that changed */
  _show(n) {
    const s = this._fmt(n), old = this._s || '';
    this._n.innerHTML = [...s].map((ch, i) => `<i${ch !== old[i] && old ? ' class="f"' : ''}>${ch.replace(/[<>&]/g, '')}</i>`).join('');
    this._s = s;
  }
  _tick() {
    const v = +this.getAttribute('value') || 0, dur = (+this.getAttribute('duration') || 1.6) * 1000, k = reduced() ? 1 : clamp((now() - this._t0) / dur, 0, 1);
    const e = 1 - Math.pow(1 - k, 3), d = +this.getAttribute('decimals') || 0, n = Math.round(v * e * 10 ** d) / 10 ** d;
    if (this._fmt(n) !== this._s) this._show(n);
    if (k >= 1) unsub(this._tick);
  }
}
define('piix-stat', PiixStatElement);
ELEMENTS.stat = 'piix-stat';
