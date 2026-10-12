/* REVEAL: content that dissolves in, pixel by pixel, when it scrolls into view.   @component reveal
 *
 *   <piix-reveal pattern="rain">
 *     <img src="screenshot.png" alt="The dashboard">
 *   </piix-reveal>
 *
 * Wrap anything. Until it's on screen it hides under a layer the colour of the page; then that
 * layer breaks up into pixels and falls away, with a glowing edge where it's dissolving. Once
 * it's done the layer is gone and the GPU rests. People who prefer less motion just see it.
 *
 *   pattern   dither | rain | scan | spiral                default: dither
 *   color     what it dissolves out of                     default: the background behind it
 *   palette   the glowing edge                             default: lime
 *   duration  seconds                                      default: 1.1
 *   delay     seconds to wait once it's on screen          default: 0
 *   pixel     size of one pixel, px                        default: 6 */
const RV_PAT = { dither: 0, rain: 1, scan: 2, spiral: 3 };
const RV_SHADER = `vec4 effect(vec2 uv,vec2 cell){
  float p=u_k.y,pat=u_k.x,th;
  if(pat==1.)th=hash(vec2(cell.x,3.))*.5+(1.-uv.y)*.5;
  else if(pat==2.)th=uv.x*.82+bayer8(cell)*.18;
  else if(pat==3.){vec2 q=aspect(uv);th=fract(atan(q.y,q.x)/6.2831+.5+length(q)*1.3)*.72+bayer8(cell)*.28;}
  else th=bayer8(cell)*.75+hash(cell)*.25;
  float e=th-p*1.2+.1;
  if(e<0.)return vec4(0.);
  if(e<.1)return vec4(dpal(1.-e/.1*.6,cell),1.);
  return vec4(u_j.rgb,1.);}`;
class PiixRevealElement extends GLStage {
  static get observedAttributes() { return [...GLStage.observedAttributes, 'pattern', 'color']; }
  constructor() { super(); this._defPx = 6; this._defPal = 'lime'; this._defDither = 0; this._start = null; }
  _hostCss() { return 'display:block;position:relative'; }
  _html() { return '<slot></slot><canvas aria-hidden="true"></canvas>'; }
  _css() { return 'canvas{z-index:2}'; }
  /* the colour behind it: the first ancestor with a background */
  _bg() { let el = this.parentElement; while (el) { const b = getComputedStyle(el).backgroundColor; if (b && b !== 'transparent' && !/rgba\(0, 0, 0, 0\)/.test(b)) return b; el = el.parentElement; } return '#ffffff'; }
  _setup() {
    const css = this.getAttribute('color') || this._bg();
    this._col = glRGB(css);
    this._done = reduced() || !glInit();
    this._cv.style.display = this._done ? 'none' : '';
    this._cv.style.background = this._done ? '' : css;
    if (this._rio) this._rio.disconnect();
    this._rio = new IntersectionObserver(es => { if (es[es.length - 1].isIntersecting && this._start == null) { this._start = now() + (+this.getAttribute('delay') || 0) * 1000; this._rio.disconnect(); } }, { threshold: .25 });
    this._rio.observe(this);
  }
  _skip() { return this._done; }
  _shader() { return RV_SHADER; }
  _uniforms() {
    const p = this._start == null ? 0 : clamp((now() - this._start) / ((+this.getAttribute('duration') || 1.1) * 1000), 0, 1);
    if (this._cv.style.background) requestAnimationFrame(() => { this._cv.style.background = ''; });
    if (p >= 1) { this._done = true; this._cv.style.display = 'none'; this.dispatchEvent(new CustomEvent('piix:revealed', { bubbles: true })); }
    return { u_k: [RV_PAT[this.getAttribute('pattern')] || 0, p, 0, 0], u_j: [this._col[0], this._col[1], this._col[2], 0] };
  }
}
define('piix-reveal', PiixRevealElement);
ELEMENTS.reveal = 'piix-reveal';
