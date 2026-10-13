/* HERO: a whole hero section on a GPU pixel background.   @component hero  @needs shader  @needs scene
 *
 *   <piix-hero kind="horizon">
 *     <p class="eyebrow">New · v1.0</p>
 *     <h1>Build something loud</h1>
 *     <p>One line of HTML and your landing page glows.</p>
 *     <piix-glow-button>Get started</piix-glow-button>
 *   </piix-hero>
 *
 * The background is any of the shader kinds. It dissolves in pixel by pixel when the hero scrolls
 * into view, then the content rises in after it. Scanlines and a soft vignette sit over the top;
 * the pointer bends the background. Put anything inside: it's laid out centred, and headings,
 * paragraphs and buttons get hero-sized type.
 *
 *   kind      mesh | warp | aurora | crystal | liquid | horizon | nebula | topo | dots | fire   default: mesh
 *   scene     use an illustrated scene instead: sakura | alps | lake | galaxy | rays | vortex | train | poppies | castle | vista
 *   palette   any palette name or your own colours        default: the kind's own
 *   pixel     size of one background pixel, px             default: 5
 *   align     center | left                                default: center
 *   height    any CSS length                               default: min(88vh, 780px) */
class PiixHeroElement extends HTMLElement {
  static get observedAttributes() { return ['kind', 'scene', 'palette', 'pixel', 'align', 'height', 'dither', 'speed']; }
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  connectedCallback() {
    this._build();
    this._io = new IntersectionObserver(es => { if (es[es.length - 1].isIntersecting) { this.toggleAttribute('data-in', true); this._io.disconnect(); } }, { threshold: .2 });
    this._io.observe(this);
  }
  disconnectedCallback() { if (this._io) this._io.disconnect(); }
  attributeChangedCallback(n, a, b) { if (a !== b && this.shadowRoot.firstChild) this._build(); }
  _build() {
    const at = n => this.getAttribute(n), left = at('align') === 'left';
    const sc = this.getAttribute('scene'), pass = ['kind', 'palette', 'dither', 'speed'].filter(n => this.hasAttribute(n)).map(n => ` ${n}="${String(at(n)).replace(/"/g, '&quot;')}"`).join('');
    this.shadowRoot.innerHTML = `<style>
:host{display:block;position:relative;isolation:isolate;overflow:hidden;min-height:${at('height') || 'min(88vh,780px)'};color:#fff;font-family:"Bricolage Grotesque",system-ui,sans-serif}
.bg{position:absolute;inset:0;z-index:0}
.veil{position:absolute;inset:0;z-index:1;opacity:${sc ? .55 : 1};pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 35%,rgba(5,3,10,.55) 100%),repeating-linear-gradient(0deg,rgba(0,0,0,.12) 0 2px,transparent 2px 4px)}
.in{position:relative;z-index:2;min-height:inherit;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${left ? 'flex-start' : 'center'};text-align:${left ? 'left' : 'center'};padding:clamp(48px,8vw,120px) clamp(20px,6vw,96px);gap:4px;opacity:0;transform:translateY(18px);transition:opacity .7s .9s,transform .7s .9s cubic-bezier(.2,.8,.2,1)}
:host([data-in]) .in{opacity:1;transform:none}
::slotted(h1){margin:0 0 .25em!important;font-weight:800!important;font-size:clamp(40px,7vw,104px)!important;line-height:.95!important;letter-spacing:-.04em!important;text-shadow:0 4px 0 rgba(0,0,0,.35),0 0 40px rgba(0,0,0,.35)}
::slotted(p){margin:0 0 1.3em!important;max-width:48ch;font-size:clamp(16px,1.9vw,21px)!important;line-height:1.45!important;opacity:.9;text-shadow:0 2px 12px rgba(0,0,0,.6)}
::slotted(.eyebrow){margin:0 0 1em!important;padding:6px 12px;font:400 12px/1 "Silkscreen",ui-monospace,monospace!important;letter-spacing:.08em;text-transform:uppercase;background:rgba(10,8,16,.55);border:2px solid rgba(255,255,255,.35)}
.cue{position:absolute;z-index:2;left:50%;bottom:22px;width:12px;height:12px;margin-left:-6px;border-right:4px solid #fff;border-bottom:4px solid #fff;transform:rotate(45deg);opacity:.7;animation:cue 1.6s steps(4) infinite}
@keyframes cue{50%{transform:translateY(6px) rotate(45deg)}}
@media (prefers-reduced-motion:reduce){.in{transition:none;opacity:1;transform:none}.cue{animation:none}}
</style><div class="bg">${sc ? `<piix-scene kind="${sc.replace(/"/g, '')}"${pass.replace(/ kind="[^"]*"/, '')} pixel="${at('pixel') || 4}" fill></piix-scene>` : `<piix-shader${pass} pixel="${at('pixel') || 5}" fill></piix-shader>`}</div><div class="veil"></div><div class="in" part="content"><slot></slot></div><i class="cue" aria-hidden="true"></i>`;
    const sh = this.shadowRoot.querySelector('piix-shader, piix-scene');
    sh._introLen = 1.2;
  }
}
define('piix-hero', PiixHeroElement);
ELEMENTS.hero = 'piix-hero';
