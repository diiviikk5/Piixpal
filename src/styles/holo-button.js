/* HOLO BUTTON: a button projected as a hologram.   @component holo-button
 *
 *   <piix-holo-button>Engage</piix-holo-button>
 *   <piix-holo-button hue="300">Connect</piix-holo-button>
 *
 * A translucent pane in a foil frame whose rainbow follows the pointer, scanlines drifting through
 * it, targeting brackets that close in on hover, and a glitch through the label when you press it.
 * Flickers on when it first scrolls into view. A real button: focus, keyboard, forms.
 *
 *   hue       the projection colour, 0-360              default: 190 (cyan)
 *   size      sm | md | lg                              default: md
 *   type      button | submit | reset
 *   href      makes it a link
 *   disabled */

/* the hologram toolkit the Holo family shares */
const HOLO_FOIL = 'linear-gradient(115deg,#ff5ec4,#ffd23f 18%,#5cffb0 36%,#3fd0ff 54%,#a26bff 72%,#ff5ec4 90%)';
const HOLO_SCAN = (a = .14) => `repeating-linear-gradient(0deg,rgba(255,255,255,${a}) 0 1px,transparent 1px 3px)`;
const holoTrack = (el, box) => {
  /* the pointer as --mx/--my (0..1) over the element, and --tilt for anyone who wants it */
  const move = e => { const r = box.getBoundingClientRect(); el.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3)); el.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3)); };
  box.addEventListener('pointermove', move);
  box.addEventListener('pointerleave', () => { el.style.setProperty('--mx', .5); el.style.setProperty('--my', .5); });
};
const holoOnView = (el, fn) => { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { threshold: .3 }); io.observe(el); };
const HOLO_CSS = `@keyframes hscan{to{background-position:0 60px}}
@keyframes hon{0%{opacity:0}10%{opacity:.8}14%{opacity:.1}22%{opacity:.9}26%{opacity:.3}40%,100%{opacity:1}}
@keyframes hglitch{0%,100%{clip-path:inset(0 0 0 0);transform:none}20%{clip-path:inset(10% 0 60% 0);transform:translateX(-6px)}40%{clip-path:inset(55% 0 20% 0);transform:translateX(5px)}60%{clip-path:inset(30% 0 45% 0);transform:translateX(-3px)}80%{clip-path:inset(75% 0 5% 0);transform:translateX(4px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

class PiixHoloButtonElement extends HTMLElement {
  static get formAssociated() { return true; }
  constructor() { super(); this._int = this.attachInternals ? this.attachInternals() : null; }
  connectedCallback() {
    if (this.shadowRoot) return;
    const h = +this.getAttribute('hue') || 190, href = this.getAttribute('href');
    const [pad, fs] = { sm: ['11px 20px', 12], lg: ['20px 36px', 17] }[this.getAttribute('size')] || ['15px 28px', 14];
    const tag = href ? `a href="${href.replace(/"/g, '&quot;')}"` : `button type="button"${this.hasAttribute('disabled') ? ' disabled' : ''}`;
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>${HOLO_CSS}
:host{display:inline-block;vertical-align:middle;--mx:.5;--my:.5;--c:hsl(${h} 100% 66%);--c2:hsl(${h} 100% 50% / .14)}
:host([disabled]){opacity:.4;pointer-events:none}
.b{all:unset;position:relative;display:block;box-sizing:border-box;padding:${pad};cursor:pointer;opacity:0;
  font:600 ${fs}px/1 "JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:#eafcff;
  text-shadow:0 0 10px var(--c),-1px 0 0 rgba(255,60,200,.55),1px 0 0 rgba(60,220,255,.55);
  background:linear-gradient(180deg,var(--c2),hsl(${h} 100% 40% / .06)),rgba(6,14,26,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
  clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);transition:transform .15s,filter .2s}
.b.on{animation:hon .7s steps(1) forwards}
/* the foil frame: a rainbow border lit where the pointer is */
.b::before{content:"";position:absolute;inset:0;padding:1.5px;background:${HOLO_FOIL};background-size:300% 300%;background-position:calc(var(--mx) * 100%) calc(var(--my) * 100%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;clip-path:inherit;opacity:.85;pointer-events:none}
.b::after{content:"";position:absolute;inset:0;background:${HOLO_SCAN()},radial-gradient(120px 60px at calc(var(--mx) * 100%) calc(var(--my) * 100%),hsl(${h} 100% 80% / .35),transparent);animation:hscan 3s linear infinite;pointer-events:none;mix-blend-mode:screen}
.br{position:absolute;width:10px;height:10px;border:1.5px solid var(--c);transition:transform .25s cubic-bezier(.3,1.6,.5,1);pointer-events:none;filter:drop-shadow(0 0 4px var(--c))}
.br.a{left:-7px;top:-7px;border-right:0;border-bottom:0}.br.b2{right:-7px;top:-7px;border-left:0;border-bottom:0}.br.c{left:-7px;bottom:-7px;border-right:0;border-top:0}.br.d{right:-7px;bottom:-7px;border-left:0;border-top:0}
:host(:hover) .br.a{transform:translate(4px,4px)}:host(:hover) .br.b2{transform:translate(-4px,4px)}:host(:hover) .br.c{transform:translate(4px,-4px)}:host(:hover) .br.d{transform:translate(-4px,-4px)}
:host(:hover) .b{filter:brightness(1.25)}
.l{position:relative;display:inline-block}
.b.g .l{animation:hglitch .32s steps(2)}
.b:active{transform:scale(.97)}
.b:focus-visible{outline:1.5px dashed var(--c);outline-offset:6px}
.w{position:relative;display:inline-block}
</style><span class="w"><${tag} class="b" part="button"><span class="l"><slot></slot></span></${href ? 'a' : 'button'}><i class="br a"></i><i class="br b2"></i><i class="br c"></i><i class="br d"></i></span>`;
    const b = this.shadowRoot.querySelector('.b');
    holoTrack(this, b);
    holoOnView(this, () => b.classList.add('on'));
    if (reduced()) b.style.opacity = 1;
    b.addEventListener('click', () => {
      b.classList.remove('g'); void b.offsetWidth; b.classList.add('g');
      const form = this._int && this._int.form, t = this.getAttribute('type');
      if (form && t === 'submit') form.requestSubmit ? form.requestSubmit() : form.submit();
      if (form && t === 'reset') form.reset();
    });
  }
}
define('piix-holo-button', PiixHoloButtonElement);
ELEMENTS['holo-button'] = 'piix-holo-button';
