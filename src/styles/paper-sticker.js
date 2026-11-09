/* PAPER STICKER: a die-cut sticker badge that peels when you touch it.   @component paper-sticker  @needs paper-button
 *
 *   <piix-paper-sticker>New</piix-paper-sticker>
 *   <piix-paper-sticker color="#5cffb0" shape="circle">50% off</piix-paper-sticker>
 *
 * A vinyl sticker with a thick white die-cut border, stuck on at a jaunty angle. Hover and its
 * corner lifts and curls back, showing the shiny backing; click and it slaps back down flat.
 *
 *   color     sticker colour                             default: #ffd23f
 *   ink       text colour                                default: #1d1a2b
 *   shape     pill | circle | star                       default: pill
 *   tilt      degrees                                    default: -6 */
class PiixPaperStickerElement extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const c = this.getAttribute('color') || '#ffd23f', ink = this.getAttribute('ink') || '#1d1a2b', shape = this.getAttribute('shape') || 'pill';
    const tilt = this.hasAttribute('tilt') ? +this.getAttribute('tilt') : -6;
    const clip = shape === 'star' ? 'polygon(50% 0,61% 22%,85% 15%,78% 39%,100% 50%,78% 61%,85% 85%,61% 78%,50% 100%,39% 78%,15% 85%,22% 61%,0 50%,22% 39%,15% 15%,39% 22%)' : 'none';
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
:host{display:inline-block;vertical-align:middle;--peel:0}
.s{position:relative;display:inline-grid;place-items:center;transform:rotate(${tilt}deg);transition:transform .25s cubic-bezier(.3,1.6,.5,1);filter:drop-shadow(0 2px 1px rgba(0,0,0,.18)) drop-shadow(0 6px 10px rgba(0,0,0,.12));cursor:default}
.f{position:relative;display:grid;box-sizing:border-box;background:#fff;padding:6px;border-radius:${shape === 'pill' ? '999px' : '50%'};
  clip-path:${shape === 'star' ? clip : 'polygon(0 0,100% 0,100% calc(100% - var(--peel) * 30px),calc(100% - var(--peel) * 30px) 100%,0 100%)'};transition:clip-path .3s cubic-bezier(.3,1.4,.5,1)}
.i{display:grid;place-items:center;box-sizing:border-box;${shape === 'circle' || shape === 'star' ? 'width:var(--d,104px);height:var(--d,104px);border-radius:50%;text-align:center;' : 'padding:10px 20px;border-radius:999px;'}
  background:linear-gradient(135deg,rgba(255,255,255,.35),transparent 40%),${c} ${PAPER_GRAIN};color:${ink};
  font:800 ${shape === 'pill' ? 15 : 17}px/1.05 "Bricolage Grotesque",system-ui,sans-serif;letter-spacing:.02em;text-transform:uppercase;${shape === 'star' ? `clip-path:${clip};` : ''}}
/* the curl: a triangle of shiny backing where the corner lifted */
.k{position:absolute;right:0;bottom:0;width:calc(var(--peel) * 30px);height:calc(var(--peel) * 30px);
  background:linear-gradient(135deg,transparent 49%,#eceff3 50%,#ffffff 62%,#c9ced6 100%);border-radius:0 0 40% 0;box-shadow:-3px -3px 6px rgba(0,0,0,.18);transition:width .3s cubic-bezier(.3,1.4,.5,1),height .3s cubic-bezier(.3,1.4,.5,1);pointer-events:none}
:host(:hover){--peel:1}
:host(:hover) .s{transform:rotate(${tilt + 3}deg) translateY(-2px)}
.s.slap{animation:slap .3s cubic-bezier(.3,1.6,.5,1)}
@keyframes slap{0%{transform:rotate(${tilt}deg) scale(1.15)}100%{transform:rotate(${tilt}deg) scale(1)}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style><span class="s" part="sticker"><span class="f"><span class="i"><slot></slot></span></span>${shape === 'star' ? '' : '<i class="k"></i>'}</span>`;
    const s = this.shadowRoot.querySelector('.s');
    s.addEventListener('click', () => { this.style.setProperty('--peel', 0); s.classList.remove('slap'); void s.offsetWidth; s.classList.add('slap'); setTimeout(() => this.style.removeProperty('--peel'), 900); });
  }
}
define('piix-paper-sticker', PiixPaperStickerElement);
ELEMENTS['paper-sticker'] = 'piix-paper-sticker';
