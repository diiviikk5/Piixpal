/* HOLO TEXT: a headline projected as a hologram.   @component holo-text  @needs holo-button
 *
 *   <piix-holo-text>Signal acquired</piix-holo-text>
 *
 * The words glow in projector light, split into cyan and magenta ghosts that drift apart and back,
 * scanlines run through them, the beam fades toward the bottom, and now
 * and then the projection stutters and slices sideways. Hover to make it glitch on purpose.
 *
 *   hue       projector colour, 0-360                    default: 190
 *   size      font size in px                            default: fits, up to 88
 *   calm      no stutters, just the glow and scanlines */
class PiixHoloTextElement extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const text = this.textContent.trim(), h = +this.getAttribute('hue') || 190, size = +this.getAttribute('size') || 0;
    const safe = text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    this.setAttribute('role', 'heading'); this.setAttribute('aria-label', text);
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>${HOLO_CSS}
:host{display:block;line-height:1}
@keyframes hsplit{0%,100%{transform:translate(0,0)}25%{transform:translate(-3px,1px)}50%{transform:translate(2px,-1px)}75%{transform:translate(-1px,0)}}
.t{position:relative;display:inline-block;padding:.3em .35em;margin:-.3em -.35em;font:800 ${size ? size + 'px' : 'clamp(40px,8vw,88px)'}/1.05 "Bricolage Grotesque",system-ui,sans-serif;letter-spacing:-.02em;
  color:hsl(${h} 100% 88%);text-shadow:0 0 18px hsl(${h} 100% 60% / .9),0 0 46px hsl(${h} 100% 50% / .5);
  -webkit-mask:repeating-linear-gradient(0deg,#000 0 2px,rgba(0,0,0,.55) 2px 3px),linear-gradient(180deg,#000 55%,rgba(0,0,0,.35));-webkit-mask-composite:source-in;
  mask:repeating-linear-gradient(0deg,#000 0 2px,rgba(0,0,0,.55) 2px 3px),linear-gradient(180deg,#000 55%,rgba(0,0,0,.35));mask-composite:intersect}
.t::before,.t::after{content:attr(data-t);position:absolute;inset:.3em .35em;pointer-events:none;mix-blend-mode:screen}
.t::before{color:rgba(255,40,200,.7);animation:hsplit 2.6s ease-in-out infinite}
.t::after{color:rgba(40,230,255,.7);animation:hsplit 3.1s ease-in-out infinite reverse}
.t.x{animation:hglitch .28s steps(2)}
:host(:hover) .t{animation:hglitch .4s steps(2) infinite}
.w{position:relative;display:inline-block;padding:.08em .04em}
</style><span class="w" aria-hidden="true"><span class="t" data-t="${safe}">${safe}</span></span>`;
    const t = this.shadowRoot.querySelector('.t');
    /* the stutter: every few seconds, at an uneven rhythm */
    if (!this.hasAttribute('calm') && !reduced()) {
      const go = () => { if (!this.isConnected) return; t.classList.remove('x'); void t.offsetWidth; t.classList.add('x'); this._tm = setTimeout(go, 2200 + Math.random() * 3800); };
      this._tm = setTimeout(go, 1200 + Math.random() * 2000);
    }
  }
  disconnectedCallback() { clearTimeout(this._tm); }
}
define('piix-holo-text', PiixHoloTextElement);
ELEMENTS['holo-text'] = 'piix-holo-text';
