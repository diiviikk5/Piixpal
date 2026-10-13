/* TOOLTIP: a little pixel speech bubble that types its words out.   @component tooltip
 *
 *   <piix-tooltip tip="Copy link"><button>…</button></piix-tooltip>
 *
 * Hover or focus what's inside and a bubble pops up next to it, with a stepped pixel tail, and
 * the text types itself in behind a blinking block cursor. It flips to the other side when
 * there isn't room, sits above everything (no clipping by overflow), and Escape hides it.
 * Screen readers get the tip as a description of the thing inside.
 *
 *   tip       the words
 *   side      top | bottom                                 default: top
 *   theme     dark | light                                 default: dark
 *   delay     ms before it shows                           default: 150 */
let TIP_N = 0;
class PiixTooltipElement extends HTMLElement {
  static get observedAttributes() { return ['tip', 'theme']; }
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  connectedCallback() {
    const light = this.getAttribute('theme') === 'light', bg = light ? '#fbf8f2' : '#17121f', fg = light ? '#17121f' : '#f2eef8', ring = light ? '#17121f' : '#3a3049';
    this.shadowRoot.innerHTML = `<style>
:host{display:inline-block;position:relative}
.tip{position:fixed;z-index:2147483001;left:0;top:0;box-sizing:border-box;width:max-content;padding:7px 11px 8px;max-width:260px;background:${bg};color:${fg};font:500 13px/1.35 "Bricolage Grotesque",system-ui,sans-serif;
  box-shadow:inset 0 0 0 2px ${ring};clip-path:${kitCorners(2)};pointer-events:none;visibility:hidden;white-space:pre-wrap}
.wrap{position:fixed;z-index:2147483001;left:0;top:0;pointer-events:none;filter:drop-shadow(0 6px 12px rgba(0,0,0,.25))}
.wrap.on .tip{visibility:visible;animation:tpop .16s steps(2)}
@keyframes tpop{from{transform:translateY(4px) scale(.94)}}
.tail{position:fixed;width:12px;height:6px;visibility:hidden;display:block}
.tail svg{display:block;width:12px;height:6px}
.wrap.on .tail{visibility:visible}
.wrap.below .tail{transform:scaleY(-1)}
.cur{display:inline-block;width:.5em;height:1em;margin-left:1px;vertical-align:-2px;background:currentColor;animation:blink .8s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){.wrap.on .tip{animation:none}.cur{display:none}}
</style><slot></slot><div class="wrap" aria-hidden="true"><div class="tip" part="tip"></div><i class="tail"><svg viewBox="0 0 6 3" shape-rendering="crispEdges"><path fill="${ring}" d="M0 0h6v1H5v1H4v1H2V2H1V1H0z"/><path fill="${bg}" d="M1 0h4v1H4v1H2V1H1z"/></svg></i></div>`;
    this._wrap = this.shadowRoot.querySelector('.wrap'); this._tip = this.shadowRoot.querySelector('.tip'); this._tail = this.shadowRoot.querySelector('.tail');
    /* screen readers: describe the thing inside with a hidden copy of the tip */
    this._desc = document.createElement('span');
    this._desc.id = 'piix-tip-' + (++TIP_N);
    this._desc.hidden = true;
    this.appendChild(this._desc);
    this._label();
    const show = () => { clearTimeout(this._t); this._t = setTimeout(() => this.show(), +this.getAttribute('delay') || 150); };
    const hide = () => { clearTimeout(this._t); this.hide(); };
    this.addEventListener('pointerenter', show); this.addEventListener('pointerleave', hide);
    this.addEventListener('focusin', show); this.addEventListener('focusout', hide);
    this.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
    addEventListener('scroll', this._sh = () => this.hide(), { passive: true, capture: true });
  }
  disconnectedCallback() { removeEventListener('scroll', this._sh, { capture: true }); clearInterval(this._ty); }
  attributeChangedCallback() { if (this._desc) { this._label(); if (this._wrap.classList.contains('on')) this.show(); } }
  _label() {
    this._desc.textContent = this.getAttribute('tip') || '';
    const t = [...this.children].find(c => c !== this._desc);
    if (t) t.setAttribute('aria-describedby', this._desc.id);
  }
  show() {
    const text = this.getAttribute('tip') || '';
    if (!text) return;
    const tip = this._tip, w = this._wrap, r = this.getBoundingClientRect();
    tip.style.width = ''; tip.textContent = text;
    w.classList.add('on');
    /* place it, flipping below if there's no room above */
    const tr0 = tip.getBoundingClientRect(), tr = { width: tr0.width + 12, height: tr0.height }, gap = 10;
    let below = this.getAttribute('side') === 'bottom' || r.top - tr.height - gap < 4;
    if (below && r.bottom + tr.height + gap > innerHeight - 4) below = false;
    const x = Math.round(Math.min(innerWidth - tr.width - 6, Math.max(6, r.left + r.width / 2 - tr.width / 2)));
    const y = Math.round(below ? r.bottom + gap : r.top - tr.height - gap);
    tip.style.width = Math.ceil(tr.width + 12) + 'px'; tip.style.left = x + 'px'; tip.style.top = y + 'px';
    const tx = Math.round(r.left + r.width / 2 - 6);
    this._tail.style.left = tx + 'px'; this._tail.style.top = (below ? y - 4 : y + tr.height - 2) + 'px';
    w.classList.toggle('below', below);
    /* type it in */
    clearInterval(this._ty);
    if (reduced()) return;
    let i = 0;
    tip.innerHTML = '<span></span><i class="cur"></i>';
    const out = tip.firstChild;
    this._ty = setInterval(() => { out.textContent = text.slice(0, ++i); if (i >= text.length) { clearInterval(this._ty); setTimeout(() => { const c = tip.querySelector('.cur'); if (c) c.remove(); }, 900); } }, 22);
  }
  hide() { clearInterval(this._ty); this._wrap.classList.remove('on'); }
}
define('piix-tooltip', PiixTooltipElement);
ELEMENTS.tooltip = 'piix-tooltip';
