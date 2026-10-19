/* RECEIPT: a little thermal printer that prints your content, line by line.   @component receipt
 *
 *   <piix-receipt>
 *     <h3>Piixpal Store</h3>
 *     <p data-price="$12.00">Pixel pal (kitty)</p>
 *     <p data-price="$4.00">Extra pats</p>
 *     <hr>
 *     <p data-price="$16.00" data-total>Total</p>
 *     <p>Thanks for shopping!</p>
 *   </piix-receipt>
 *
 * When it scrolls into view the printer wakes up, its light blinks, and the paper feeds out one
 * line at a time, each one swept on by the print head. Headings print as big pixel titles, <hr>
 * as a dashed rule, and anything with data-price gets a dotted leader out to its price. When it's
 * done, TEAR rips it off along a zigzag. Order confirmations, changelogs, end-of-year stats.
 * It's your real markup the whole time: readable, selectable and searchable.
 *
 *   width     the paper's width                                    default: 320px
 *   speed     lines a second                                       default: 7
 *   start     view: print when it scrolls into view; manual: wait for print()   default: view
 *   sound     make sounds even without <piix-chiptune> ("off" to stay silent)
 *
 *   methods: print(), reset(), tear()
 *   events: printed, tear */
let RCP_CSS = false;
const rcpCss = () => {
  if (RCP_CSS) return;
  RCP_CSS = true;
  const st = document.createElement('style');
  /* the receipt's own typography for the content inside it */
  st.textContent = `piix-receipt>*{margin:0}
piix-receipt :is(h1,h2,h3,h4){margin:.15em 0 .55em;font:400 1.15em/1.25 ${KIT_FONT};text-align:center;text-transform:uppercase;letter-spacing:.06em}
piix-receipt hr{margin:.65em 0;border:0;border-top:2px dashed currentColor;opacity:.45}
piix-receipt [data-price]{display:flex;gap:.6ch;align-items:baseline}
piix-receipt [data-price]::before{content:'';order:1;flex:1;min-width:2ch;border-bottom:2px dotted currentColor;opacity:.4;transform:translateY(-.3em)}
piix-receipt [data-price]::after{content:attr(data-price);order:2;white-space:nowrap}
piix-receipt [data-total]{font-weight:700;font-size:1.15em}
piix-receipt [data-center]{text-align:center}`;
  document.head.appendChild(st);
};
class PiixReceiptElement extends HTMLElement {
  static get observedAttributes() { return ['width']; }
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._state = 'idle'; }
  connectedCallback() {
    rcpCss();
    const paper = '#fbf8f1';
    this.shadowRoot.innerHTML = `<style>
:host{display:inline-block;vertical-align:top;--w:${this.getAttribute('width') || '320px'};color:#2a2433;font:400 14px/1.55 "JetBrains Mono",ui-monospace,Menlo,Consolas,monospace}
.wrap{position:relative;width:calc(var(--w) + 28px)}
.printer{position:relative;z-index:2;height:46px;background:#17121f;clip-path:${kitCorners(4)};display:flex;align-items:center;gap:10px;padding:0 16px}
.printer::after{content:'';position:absolute;left:12px;right:12px;bottom:8px;height:4px;background:#000;box-shadow:0 -1px 0 #3a3048}
.led{width:8px;height:8px;background:#2f4a1a;box-shadow:inset 0 0 0 2px rgba(0,0,0,.3)}
:host([data-printing]) .led{background:#c6f432;box-shadow:0 0 8px #c6f432;animation:piixled .25s steps(2) infinite}
@keyframes piixled{50%{background:#5d7a14;box-shadow:none}}
.brand{font:400 11px/1 ${KIT_FONT};color:#8b7cff;letter-spacing:.12em;margin-top:-6px}
.feed{position:relative;z-index:1;margin:-10px auto 0;width:var(--w);height:0;overflow:hidden}
.paper{position:relative;padding:22px 20px 10px;background:${paper};box-shadow:inset 0 10px 8px -6px rgba(0,0,0,.25)}
.paper::before{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.025) 0 1px,transparent 1px 3px)}
.zig{height:10px;background:linear-gradient(135deg,${paper} 25%,transparent 25%) -5px 0/10px 10px,linear-gradient(225deg,${paper} 25%,transparent 25%) -5px 0/10px 10px}
:host([data-torn]) .feed{animation:piixtear .5s steps(5) forwards}
:host([data-torn]) .paper{-webkit-mask:linear-gradient(#000,#000) 0 10px/100% 100% no-repeat,linear-gradient(135deg,#000 25%,transparent 25%) -5px 0/10px 10px,linear-gradient(225deg,#000 25%,transparent 25%) -5px 0/10px 10px;mask:linear-gradient(#000,#000) 0 10px/100% 100% no-repeat,linear-gradient(135deg,#000 25%,transparent 25%) -5px 0/10px 10px,linear-gradient(225deg,#000 25%,transparent 25%) -5px 0/10px 10px}
@keyframes piixtear{to{translate:0 26px;rotate:-2.5deg}}
.tear{all:unset;display:block;margin:10px auto 0;padding:8px 14px 7px;background:#17121f;color:#c6f432;clip-path:${kitCorners(2)};font:400 11px/1 ${KIT_FONT};letter-spacing:.1em;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .2s steps(2)}
.tear:focus-visible{outline:2px dashed #17121f;outline-offset:3px}
:host([data-done]:not([data-torn])) .tear{opacity:1;pointer-events:auto}
@media (prefers-reduced-motion:reduce){:host([data-printing]) .led{animation:none}}
</style><div class="wrap"><div class="printer" aria-hidden="true"><span class="led"></span><span class="brand">PIIX-80</span></div><div class="feed" part="paper"><div class="paper"><slot></slot></div><div class="zig"></div></div><button class="tear" type="button" part="tear">- - TEAR HERE - -</button></div>`;
    this._feed = this.shadowRoot.querySelector('.feed');
    this._paper = this.shadowRoot.querySelector('.paper');
    this.shadowRoot.querySelector('.tear').addEventListener('click', () => this.tear());
    if ((this.getAttribute('start') || 'view') === 'view') {
      this._io = new IntersectionObserver(([en]) => { if (en.isIntersecting && this._state === 'idle') { this._io.disconnect(); this.print(); } }, { threshold: .4 });
      this._io.observe(this);
    }
  }
  disconnectedCallback() { if (this._io) this._io.disconnect(); clearTimeout(this._t); }
  attributeChangedCallback() { if (this.shadowRoot.firstChild) this.style.setProperty('--w', this.getAttribute('width') || '320px'); }

  /* feed the paper out to a height, in a few quick steps, the way a stepper motor moves */
  _feedTo(h, ms) {
    const from = this._feed.offsetHeight;
    this._feed.style.height = h + 'px';
    if (!reduced() && ms) this._feed.animate([{ height: from + 'px' }, { height: h + 'px' }], { duration: ms, easing: 'steps(4)' });
  }
  print() {
    if (this._state === 'printing') return;
    this.reset();
    this._state = 'printing';
    this.toggleAttribute('data-printing', true);
    const lines = [...this.children].filter(c => !['SCRIPT', 'STYLE', 'TEMPLATE'].includes(c.tagName));
    const per = 1000 / clamp(+this.getAttribute('speed') || 7, 1, 40);
    const padTop = 22, padBottom = 10;
    if (reduced()) { this._feedTo(this._paper.offsetHeight + 10, 0); return this._done(); }
    this._feedTo(padTop, per * .6);
    let i = 0;
    const next = () => {
      if (i >= lines.length) { this._feedTo(this._paper.offsetHeight + 10, per); this._t = setTimeout(() => this._done(), per); return; }
      const el = lines[i++];
      /* the line's bottom, measured on the paper, is how far the paper has to come out */
      const bottom = el.offsetTop + el.offsetHeight + (i === lines.length ? padBottom : 0);
      this._feedTo(bottom + 4, per * .55);
      /* the print head sweeps across it */
      el.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: per * .8, easing: 'steps(10)' });
      for (let k = 0; k < 3; k++) setTimeout(() => sfx('type', this, { pitch: rnd(.35, .5), gap: 0 }), k * per * .22);
      this._t = setTimeout(next, el.tagName === 'HR' ? per * .6 : per);
    };
    this._t = setTimeout(next, per * .6);
  }
  _done() {
    this._state = 'done';
    this.removeAttribute('data-printing'); this.toggleAttribute('data-done', true);
    sfx('success', this);
    this.dispatchEvent(new Event('printed'));
  }
  /* rip it off along the zigzag */
  tear() {
    if (this._state !== 'done' || this.hasAttribute('data-torn')) return;
    this.toggleAttribute('data-torn', true);
    sfx('break', this, { pitch: 1.4 });
    this.dispatchEvent(new Event('tear'));
  }
  reset() {
    clearTimeout(this._t);
    this._state = 'idle';
    for (const a of ['data-printing', 'data-done', 'data-torn']) this.removeAttribute(a);
    if (this._feed) { this._feed.getAnimations().forEach(a => a.cancel()); this._feed.style.height = '0px'; }
  }
}
define('piix-receipt', PiixReceiptElement);
ELEMENTS.receipt = 'piix-receipt';
