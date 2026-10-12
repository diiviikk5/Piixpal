/* DIVIDER: a moving pixel edge between two sections.   @component divider
 *
 *   <section style="background:#17121f">…</section>
 *   <piix-divider from="#17121f" to="#f3eee3" kind="wave"></piix-divider>
 *   <section style="background:#f3eee3">…</section>
 *
 * Instead of a hard line, one section's colour flows into the next across a living pixel edge:
 * rolling waves, a mountain ridge, stepped stairs, drips, or a dithered fade. A thin line of
 * light runs along the edge, and it lifts a little under the pointer.
 *
 *   kind      wave | mountains | stairs | drip | dissolve      default: wave
 *   from      the colour above                                default: #17121f
 *   to        the colour below                                default: #f3eee3
 *   palette   the line of light along the edge                default: lime
 *   height    px or any CSS length                            default: 120px
 *   pixel     size of one pixel, px                           default: 6
 *   flip      turn it upside down */
const DV_KINDS = { wave: 0, mountains: 1, stairs: 2, drip: 3, dissolve: 4 };
const DV_SHADER = `vec4 effect(vec2 uv,vec2 cell){
  float k=u_j.w,t=u_time;if(u_k.w>0.)uv.y=1.-uv.y;
  float x=uv.x*u_res.x/u_res.y,y=uv.y,h;
  if(k==4.){return vec4(y>bayer8(cell)*.9+.05?u_j.rgb:u_k.xyz,1.);}
  if(k==1.)h=.3+.5*fbm(vec2(x*.8+t*.02,1.3))+.08*abs(sin(x*1.7));
  else if(k==2.)h=.25+.5*floor((.5+.5*sin(x*.9+t*.35))*5.+.5)/5.;
  else if(k==3.){float c=floor(cell.x/2.);h=.8-.55*max(0.,sin(t*.5+hash(vec2(c,1.))*6.28))*hash(vec2(c,2.))-.06*sin(x*2.);}
  else h=.5+.17*sin(x*1.6+t*.7)+.08*sin(x*4.1-t*1.2);
  h+=u_hover*.14*exp(-pow((uv.x-u_mouse.x)*u_res.x/u_res.y*2.5,2.));
  float e=(y-h)*u_res.y;
  if(e>0.&&e<1.6)return vec4(dpal(.85,cell),1.);
  return vec4(e>0.?u_j.rgb:u_k.xyz,1.);}`;
class PiixDividerElement extends GLStage {
  static get observedAttributes() { return [...GLStage.observedAttributes, 'from', 'to', 'flip']; }
  constructor() { super(); this._defPx = 6; this._defPal = 'lime'; this._defDither = 0; }
  _hostCss() { return (this.getAttribute('height') ? '' : 'height:120px;') + 'margin:-1px 0'; }
  _setup() { this.setAttribute('aria-hidden', 'true'); this._from = glRGB(this.getAttribute('from') || '#17121f'); this._to = glRGB(this.getAttribute('to') || '#f3eee3'); }
  _shader() { return DV_SHADER; }
  _uniforms() { return { u_j: [...this._from, DV_KINDS[this.getAttribute('kind')] || 0], u_k: [...this._to, this.hasAttribute('flip') ? 1 : 0] }; }
}
define('piix-divider', PiixDividerElement);
ELEMENTS.divider = 'piix-divider';
