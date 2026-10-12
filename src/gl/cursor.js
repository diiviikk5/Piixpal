/* CURSOR: a pixel trail, or a glow, that follows the pointer across the whole page.   @component cursor
 *
 *   <piix-cursor></piix-cursor>
 *   <piix-cursor kind="glow" palette="candy"></piix-cursor>
 *
 * One tag anywhere on the page. "trail" leaves a comet of dithered pixels behind the pointer
 * that fade as they fall away; "glow" is a soft pixel halo round it. It never gets in the way
 * of clicks, rests the GPU when the pointer is still, and stays off on touch screens and for
 * people who prefer less motion.
 *
 *   kind      trail | glow                                default: trail
 *   palette   its colours                                 default: lime
 *   size      how big, 0.5 to 3                           default: 1
 *   pixel     size of one pixel, px                       default: 4 */
const CR_N = 40;
const CR_SHADER = `uniform vec4 u_tr[${CR_N}];
vec4 effect(vec2 uv,vec2 cell){
  vec2 q=aspect(uv);float v=0.,sz=u_k.y;
  if(u_k.x==1.){vec4 p=u_tr[0];if(p.w<=0.)return vec4(0.);float d=length(q-aspect(p.xy));v=p.w*smoothstep(.16*sz,0.,d);}
  else for(int i=0;i<${CR_N};i++){vec4 p=u_tr[i];if(p.w<=0.)continue;float d=length(q-aspect(p.xy));v=max(v,p.w*smoothstep(.028*sz*(.4+.6*p.w),0.,d));}
  if(v<.04)return vec4(0.);
  return vec4(dpal(.35+.65*v,cell),step(bayer8(cell)*.95,v*1.4));}`;
class PiixCursorElement extends GLStage {
  constructor() { super(); this._defPx = 4; this._defPal = 'lime'; this._defDither = .6; this._tr = new Float32Array(CR_N * 4); this._pts = []; this._last = [-1, -1]; }
  _hostCss() { return 'position:fixed;inset:0;z-index:2147483000;pointer-events:none'; }
  _setup() { this.setAttribute('aria-hidden', 'true'); this._off = !matchMedia('(pointer:fine)').matches; }
  _skip() {
    if (this._off || reduced() || !ptr.seen) return true;
    /* record where the pointer is now; age everything */
    const t = now(), x = ptr.cx / innerWidth, y = 1 - ptr.cy / innerHeight;
    const gap = Math.hypot(x - this._last[0], y - this._last[1]);
    if (gap > .002) {
      /* a fast flick leaves gaps: fill them in so the trail stays one line */
      const n = this._last[0] < 0 ? 1 : Math.min(6, Math.ceil(gap / .012));
      for (let k = n; k >= 1; k--) this._pts.unshift([lerp(this._last[0], x, k / n), lerp(this._last[1], y, k / n), t - (n - k) * 4]);
      this._last = [x, y];
    }
    const life = this.getAttribute('kind') === 'glow' ? 1600 : 520;
    this._pts = this._pts.filter(p => t - p[2] < life).slice(0, CR_N);
    if (this.getAttribute('kind') === 'glow' && !this._pts.length && x >= 0) this._pts = [[x, y, t - life * .5]];
    return !this._pts.length;
  }
  _shader() { return CR_SHADER; }
  _uniforms() {
    const t = now(), life = this.getAttribute('kind') === 'glow' ? 1600 : 520;
    this._tr.fill(0);
    this._pts.forEach((p, i) => { this._tr[i * 4] = p[0]; this._tr[i * 4 + 1] = p[1]; this._tr[i * 4 + 3] = 1 - (t - p[2]) / life; });
    if (this.getAttribute('kind') === 'glow' && this._tr[3] > 0) { this._tr[0] = ptr.cx / innerWidth; this._tr[1] = 1 - ptr.cy / innerHeight; this._tr[3] = Math.max(.6, this._tr[3]); }
    return { u_tr: this._tr, u_k: [this.getAttribute('kind') === 'glow' ? 1 : 0, clamp(+this.getAttribute('size') || 1, .5, 3), 0, 0] };
  }
}
define('piix-cursor', PiixCursorElement);
ELEMENTS.cursor = 'piix-cursor';
