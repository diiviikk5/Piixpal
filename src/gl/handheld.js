/* HANDHELD: a pocket game console, and anything you put inside plays on its screen.   @component handheld
 *
 *   <piix-handheld>
 *     <h3>Save file 1</h3>
 *     <p>Real HTML, shown in four shades of green.</p>
 *     <a href="/blog">Continue ▸</a>
 *   </piix-handheld>
 *
 * A chunky handheld with a power light, a D-pad, A and B, Select and Start. Your content is
 * live, real HTML on its screen, recoloured into four LCD shades with a dot-matrix grid on
 * top (links still work, text can still be selected). It boots with the logo sliding down
 * the first time it scrolls into view.
 *
 *   ▲ ▼       scroll the screen (hold to keep going)
 *   ◀ ▶       move the cursor between the links and buttons on the screen
 *   A         press what the cursor is on        B   back to the top
 *   SELECT    change the screen colours          START   boot it again
 *   Keyboard (while it has focus): arrows, X = A, Z = B, Enter = Start, C = Select.
 *
 * Every press fires a cancelable "press" event first (detail: { button }), so you can build
 * your own game on it: call event.preventDefault() and the console does nothing by itself.
 *
 *   screen    dmg | pocket | light | grape | color (no filter)     default: dmg
 *   color     the shell: classic | lime | grape | ink | coral     default: classic
 *   width     any CSS length                                      default: 320px
 *   brand     the name on the front                               default: Piixpal
 *   boot      off: skip the boot screen
 *   font      pixel | inherit (use the page's font)               default: pixel
 *   sound     make sounds even without <piix-chiptune> ("off" to stay silent)
 *
 *   events: press (detail: { button }), screen (detail: { screen }) */
const HH_SCREENS = {
  dmg: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  pocket: ['#1f1f1f', '#4d4d4d', '#8c8c85', '#c5c7bd'],
  light: ['#00303a', '#0a6b6b', '#2fb0a0', '#8ef0d4'],
  grape: ['#17121f', '#4a2f8f', '#9d7bff', '#e9e2ff'],
  color: null
};
/* shell, bezel, A/B, D-pad, lettering */
const HH_SHELLS = {
  classic: ['#cbc7bf', '#605d70', '#a3245a', '#2d2b35', '#2f2a7c'],
  lime: ['#c6f432', '#17121f', '#6b4cff', '#17121f', '#17121f'],
  grape: ['#7b5cff', '#221a3a', '#c6f432', '#17121f', '#f2eef8'],
  ink: ['#251f2f', '#0d0a12', '#ff6b4a', '#0d0a12', '#c6f432'],
  coral: ['#ff7a5c', '#2b1a24', '#ffd23f', '#2b1a24', '#2b1a24']
};
const HH_KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', x: 'a', X: 'a', k: 'a', z: 'b', Z: 'b', j: 'b', Enter: 'start', c: 'select', C: 'select' };
const HH_FOCUS = 'a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"]),piix-button,piix-glow-button';
const hhHex = h => hexRGBA(h).slice(0, 3).map(v => (v / 255).toFixed(3));
/* luminance, then cut into four steps, each step painted one shade */
const hhFilter = (id, shades) => {
  const c = shades.map(hhHex);
  return `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".3 .59 .11 0 0 .3 .59 .11 0 0 .3 .59 .11 0 0 0 0 0 1 0"/><feComponentTransfer>${['R', 'G', 'B'].map((ch, k) => `<feFunc${ch} type="discrete" tableValues="${c.map(v => v[k]).join(' ')}"/>`).join('')}</feComponentTransfer></filter>`;
};
let HH_N = 0;
class PiixHandheldElement extends HTMLElement {
  static get observedAttributes() { return ['screen', 'color', 'width', 'brand', 'font']; }
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._id = 'piix-hh-' + (++HH_N); this._sel = null; }
  connectedCallback() {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'group');
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Handheld console');
    this._build();
    this.addEventListener('keydown', this._kd = e => {
      const b = HH_KEYS[e.key], t = e.composedPath()[0];
      if (!b || e.altKey || e.ctrlKey || e.metaKey || (t && t.closest && t.closest('input,textarea,select,[contenteditable]'))) return;
      /* Enter on a link inside the screen still opens the link */
      if (b === 'start' && t !== this && t !== this._view) return;
      e.preventDefault();
      this._down(b, true);
      if (!e.repeat || /up|down|left|right/.test(b)) this.press(b);
    });
    this.addEventListener('keyup', this._ku = e => { const b = HH_KEYS[e.key]; if (b) this._down(b, false); });
    this._io = new IntersectionObserver(([en]) => { if (en.isIntersecting && !this._booted) this._boot(); });
    this._io.observe(this);
  }
  disconnectedCallback() { if (this._io) this._io.disconnect(); clearInterval(this._rep); clearTimeout(this._rep0); this.removeEventListener('keydown', this._kd); this.removeEventListener('keyup', this._ku); }
  attributeChangedCallback() { if (this.shadowRoot.firstChild) { this._build(); if (this._booted) this.toggleAttribute('data-on', true); } }
  get screen() { const s = this.getAttribute('screen'); return s in HH_SCREENS ? s : 'dmg'; }

  _build() {
    const [shell, bezel, ab, pad, ink] = HH_SHELLS[this.getAttribute('color')] || HH_SHELLS.classic;
    const shades = HH_SCREENS[this.screen];
    const lcd = shades ? shades[3] : '#f4f1ea', dark = shades ? shades[0] : '#17121f';
    const font = this.getAttribute('font') === 'inherit' ? 'inherit' : `400 13px/1.5 ${KIT_FONT}`;
    const brand = (this.getAttribute('brand') || 'Piixpal').replace(/[<&]/g, '');
    const w = this.getAttribute('width') || '320px';
    const btn = (cls, label, txt = '') => `<button type="button" class="btn ${cls}" data-b="${cls}" aria-label="${label}" part="button ${cls}">${txt}</button>`;
    this.shadowRoot.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${shades ? hhFilter(this._id, shades) : ''}</svg><style>
:host{display:inline-block;vertical-align:top;--w:${w};-webkit-tap-highlight-color:transparent}
.dev{position:relative;box-sizing:border-box;width:var(--w);max-width:100%;font-size:calc(var(--w) / 20);padding:1.1em 1.15em 1.6em;background:${shell};border-radius:.55em .55em 2.8em .55em;
  box-shadow:inset -.22em -.28em 0 rgba(0,0,0,.14),inset .18em .18em 0 rgba(255,255,255,.35),0 .55em 1.1em -.3em rgba(23,18,31,.45);color:${ink};user-select:none;-webkit-user-select:none}
.dev::before{content:'';position:absolute;left:.6em;right:.6em;top:.45em;height:.12em;border-top:.06em solid rgba(0,0,0,.18);border-bottom:.06em solid rgba(0,0,0,.18)}
.bez{position:relative;padding:1.05em 1.7em .9em;background:${bezel};border-radius:.45em .45em 1.6em .45em;margin-top:.35em}
.tag{position:absolute;left:1.2em;right:1.2em;top:.36em;display:flex;align-items:center;gap:.35em;font:400 .34em/1 ${KIT_FONT};letter-spacing:.06em;color:rgba(255,255,255,.62);white-space:nowrap;overflow:hidden}
.tag::before,.tag::after{content:'';flex:1;height:.4em;border-top:.18em solid #a3245a;border-bottom:.18em solid #3f3c9a}
.led{position:absolute;left:.55em;top:42%;width:.5em;height:.5em;border-radius:50%;background:#3a1717;box-shadow:inset 0 0 0 .06em rgba(0,0,0,.4)}
:host([data-on]) .led{background:#ff3b3b;box-shadow:0 0 .35em #ff3b3b,inset 0 0 0 .06em rgba(0,0,0,.3)}
.bat{position:absolute;left:.25em;top:calc(42% + .75em);font:400 .26em/1 ${KIT_FONT};color:rgba(255,255,255,.55);letter-spacing:.04em}
.scr{position:relative;aspect-ratio:10/9;overflow:hidden;background:${lcd};box-shadow:inset .12em .12em 0 rgba(0,0,0,.35)}
.lcd{position:absolute;inset:0;${shades ? `filter:url(#${this._id})` : ''}}
.view{position:absolute;inset:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:none;padding:.7em .8em;box-sizing:border-box;font:${font};color:${dark};background:${lcd};outline:none;user-select:text;-webkit-user-select:text}
.view::-webkit-scrollbar{display:none}
::slotted(*){max-width:100%}
::slotted(:first-child){margin-top:0!important}
::slotted(img){image-rendering:pixelated}
.boot{position:absolute;inset:0;display:none;place-items:center;background:${lcd};color:${dark};pointer-events:none}
.boot b{font:400 1.25em/1 ${KIT_FONT};letter-spacing:.04em;transform:translateY(-4.5em)}
:host([data-booting]) .boot{display:grid}
:host([data-booting]) .boot b{animation:piixboot 1.5s steps(15) forwards}
:host([data-booting][data-fade]) .boot{animation:piixfade .4s steps(4) forwards}
@keyframes piixboot{to{transform:none}}
@keyframes piixfade{to{opacity:0}}
.dots{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(0,0,0,.075) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.075) 1px,transparent 1px);background-size:3px 3px;box-shadow:inset .1em .1em .25em rgba(0,0,0,.25)}
.bar{position:absolute;right:2px;top:4px;bottom:4px;width:3px;pointer-events:none;opacity:0;transition:opacity .3s steps(2)}
.bar i{position:absolute;left:0;width:3px;background:${dark};opacity:.6}
:host([data-scrolls]) .bar{opacity:1}
.cur{position:absolute;width:6px;height:10px;background:${dark};clip-path:polygon(0 0,33% 0,33% 20%,66% 20%,66% 40%,100% 40%,100% 60%,66% 60%,66% 80%,33% 80%,33% 100%,0 100%);pointer-events:none;display:none;animation:piixnudge .6s steps(2) infinite}
@keyframes piixnudge{50%{transform:translateX(2px)}}
.brand{margin:.55em 0 0 .1em;font:italic 700 .95em/1 "Bricolage Grotesque",system-ui,sans-serif;letter-spacing:-.02em}
.brand span{font:400 .62em/1 ${KIT_FONT};font-style:normal;letter-spacing:.08em;margin-left:.35em;opacity:.8}
.ctl{position:relative;height:8.4em;margin-top:.7em}
.btn{all:unset;box-sizing:border-box;position:absolute;cursor:pointer;touch-action:manipulation}
.btn:focus-visible{outline:.12em dashed ${ink};outline-offset:.15em}
.dpad{position:absolute;left:.4em;top:.8em;width:4.2em;height:4.2em}
.dpad::before,.dpad::after{content:'';position:absolute;background:${pad};border-radius:.18em;box-shadow:inset -.1em -.12em 0 rgba(0,0,0,.35),0 .12em 0 rgba(0,0,0,.25)}
.dpad::before{left:1.4em;top:0;width:1.4em;height:4.2em}
.dpad::after{left:0;top:1.4em;width:4.2em;height:1.4em}
.dpad .btn{z-index:1;width:1.4em;height:1.4em;display:grid;place-items:center}
.dpad .btn::after{content:'';width:.42em;height:.42em;background:rgba(255,255,255,.18);clip-path:polygon(50% 0,100% 100%,0 100%)}
.up{left:1.4em;top:0}.down{left:1.4em;top:2.8em}.left{left:0;top:1.4em}.right{left:2.8em;top:1.4em}
.down::after{transform:rotate(180deg)}.left::after{transform:rotate(-90deg)}.right::after{transform:rotate(90deg)}
.dpad .btn[data-down],.dpad .btn:active{background:rgba(0,0,0,.35)}
.ab{position:absolute;right:.2em;top:.5em;width:6.2em;height:3.6em;transform:rotate(-25deg)}
.ab .btn{width:2.3em;height:2.3em;border-radius:50%;background:${ab};box-shadow:inset -.12em -.16em 0 rgba(0,0,0,.3),0 .14em 0 rgba(0,0,0,.28);transition:transform 40ms steps(1)}
.ab .btn[data-down],.ab .btn:active{transform:translateY(.12em);box-shadow:inset .08em .1em 0 rgba(0,0,0,.3)}
.ab .b{left:0;top:1em}.ab .a{right:0;top:0}
.ab small{position:absolute;font:400 .55em/1 ${KIT_FONT};letter-spacing:.08em}
.ab .lb{left:1.6em;top:6.1em}.ab .la{right:1.4em;top:4.3em}
.ss{position:absolute;left:42%;bottom:.5em;display:flex;gap:1.1em;transform:translateX(-50%)}
.ss div{display:flex;flex-direction:column;align-items:center;gap:.35em;transform:rotate(-25deg)}
.ss .btn{position:relative;width:2.3em;height:.6em;border-radius:.3em;background:${pad};opacity:.85;box-shadow:inset -.06em -.08em 0 rgba(0,0,0,.4)}
.ss .btn[data-down],.ss .btn:active{transform:translateY(.08em)}
.ss small{font:400 .38em/1 ${KIT_FONT};letter-spacing:.08em}
.spk{position:absolute;right:1.5em;bottom:1.5em;display:flex;gap:.32em;transform:rotate(-25deg)}
.spk i{width:.26em;height:2.3em;border-radius:.13em;background:rgba(0,0,0,.2);box-shadow:inset .05em .05em 0 rgba(0,0,0,.25)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion:reduce){.cur{animation:none}}
</style><div class="dev" part="device">
<div class="bez"><span class="tag">pixel matrix with chiptune sound</span><span class="led" aria-hidden="true"></span><span class="bat" aria-hidden="true">BATTERY</span>
<div class="scr" part="screen"><div class="lcd"><div class="view" tabindex="0" role="region" aria-label="Screen"><slot></slot></div><div class="boot" aria-hidden="true"><b>${brand}</b></div></div><div class="dots"></div><div class="bar"><i></i></div><span class="cur" aria-hidden="true"></span></div></div>
<p class="brand">${brand}<span>BOY</span></p>
<div class="ctl"><div class="dpad">${btn('up', 'Up')}${btn('down', 'Down')}${btn('left', 'Previous link')}${btn('right', 'Next link')}</div>
<div class="ab">${btn('b', 'B: back to top')}${btn('a', 'A: press')}<small class="lb">B</small><small class="la">A</small></div>
<div class="ss"><div>${btn('select', 'Select: change screen colours')}<small>SELECT</small></div><div>${btn('start', 'Start')}<small>START</small></div></div></div>
<div class="spk" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
</div><div class="sr" aria-live="polite"></div>`;
    const $ = s => this.shadowRoot.querySelector(s);
    this._view = $('.view'); this._bar = $('.bar i'); this._cur = $('.cur'); this._scr = $('.scr'); this._sr = $('.sr');
    /* buttons: press on pointer down (and keep going while held, for the arrows) */
    this.shadowRoot.querySelectorAll('.btn').forEach(b => {
      const name = b.dataset.b;
      b.addEventListener('pointerdown', e => {
        e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId);
        this._down(name, true); this.press(name);
        if (/up|down/.test(name)) { clearTimeout(this._rep0); this._rep0 = setTimeout(() => { this._rep = setInterval(() => this.press(name), 90); }, 320); }
      });
      const up = () => { this._down(name, false); clearTimeout(this._rep0); clearInterval(this._rep); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      /* keyboard users tab to a button and press Enter or Space */
      b.addEventListener('click', e => { if (e.detail === 0) this.press(name); });
    });
    this._view.addEventListener('scroll', () => { this._bars(); this._place(); }, { passive: true });
    new ResizeObserver(() => { this._bars(); this._place(); }).observe(this._view);
    this._bars();
  }
  _down(name, on) { const b = this.shadowRoot.querySelector(`[data-b="${name}"]`); if (b) b.toggleAttribute('data-down', on); }

  /* one press: tell the page first, then do the console's own thing unless it said no */
  press(name) {
    const ev = new CustomEvent('press', { detail: { button: name }, bubbles: true, composed: true, cancelable: true });
    this.dispatchEvent(ev);
    if (ev.defaultPrevented) return;
    const v = this._view, smooth = reduced() ? 'auto' : 'smooth';
    if (name === 'up' || name === 'down') { v.scrollBy({ top: (name === 'up' ? -1 : 1) * v.clientHeight * .3, behavior: smooth }); sfx('blip', this, { pitch: name === 'up' ? 1.1 : .9 }); }
    else if (name === 'left' || name === 'right') this._move(name === 'right' ? 1 : -1);
    else if (name === 'a') { if (this._sel && this._sel.isConnected) { sfx('select', this); this._sel.click(); } else sfx('error', this); }
    else if (name === 'b') { this._select(null); v.scrollTo({ top: 0, behavior: smooth }); sfx('close', this); }
    else if (name === 'select') this._cycle();
    else if (name === 'start') this._boot(true);
  }
  /* the cursor hops between the links and buttons on the screen */
  _move(d) {
    const all = [...this.querySelectorAll(HH_FOCUS)].filter(el => el.getClientRects().length);
    if (!all.length) { this._view.scrollBy({ top: d * this._view.clientHeight * .9, behavior: reduced() ? 'auto' : 'smooth' }); sfx('blip', this); return; }
    const i = all.indexOf(this._sel);
    this._select(all[i < 0 ? (d > 0 ? 0 : all.length - 1) : (i + d + all.length) % all.length]);
    sfx('blip', this);
  }
  _select(el) {
    this._sel = el;
    if (el) {
      const v = this._view, r = el.getBoundingClientRect(), vr = v.getBoundingClientRect();
      if (r.top < vr.top + 8 || r.bottom > vr.bottom - 8) v.scrollBy({ top: r.top - vr.top - vr.height / 3, behavior: reduced() ? 'auto' : 'smooth' });
      if (el.focus) el.focus({ preventScroll: true });
      this._sr.textContent = (el.textContent || el.getAttribute('aria-label') || '').trim();
    }
    this._place();
  }
  _place() {
    const c = this._cur, el = this._sel;
    if (!c) return;
    if (!el || !el.isConnected) { c.style.display = 'none'; return; }
    const r = el.getBoundingClientRect(), s = this._scr.getBoundingClientRect();
    const y = r.top - s.top + Math.min(r.height, 22) / 2 - 5;
    c.style.display = y < -10 || y > s.height ? 'none' : 'block';
    c.style.left = Math.max(1, r.left - s.left - 10) + 'px'; c.style.top = y + 'px';
  }
  _bars() {
    const v = this._view;
    if (!v) return;
    const over = v.scrollHeight > v.clientHeight + 2;
    this.toggleAttribute('data-scrolls', over);
    if (!over) return;
    const h = v.clientHeight / v.scrollHeight;
    this._bar.style.height = h * 100 + '%';
    this._bar.style.top = (v.scrollTop / (v.scrollHeight - v.clientHeight)) * (1 - h) * 100 + '%';
  }
  _cycle() {
    const list = Object.keys(HH_SCREENS), next = list[(list.indexOf(this.screen) + 1) % list.length];
    this.setAttribute('screen', next);
    sfx('blip', this, { pitch: 1.3 });
    this._sr.textContent = `Screen: ${next}`;
    this.dispatchEvent(new CustomEvent('screen', { detail: { screen: next } }));
  }
  /* the logo slides down, the console dings, the game appears */
  _boot(again) {
    this._booted = true;
    clearTimeout(this._b1); clearTimeout(this._b2);
    this.removeAttribute('data-fade');
    this.toggleAttribute('data-on', true);
    if (this.getAttribute('boot') === 'off' || reduced()) { this.removeAttribute('data-booting'); if (again) sfx('boot', this); return; }
    /* restart the slide even if it ran before */
    this.removeAttribute('data-booting'); void this.offsetWidth; this.toggleAttribute('data-booting', true);
    this._b1 = setTimeout(() => sfx('boot', this), 1500);
    this._b2 = setTimeout(() => { this.toggleAttribute('data-fade', true); setTimeout(() => { this.removeAttribute('data-booting'); this.removeAttribute('data-fade'); }, 420); }, 2300);
  }
}
define('piix-handheld', PiixHandheldElement);
ELEMENTS.handheld = 'piix-handheld';
