/* LOADER: little pixel loaders drawn on the GPU.   @component loader
 *
 *   <piix-loader></piix-loader>
 *   <piix-loader kind="snake" palette="sunset" size="64"></piix-loader>
 *
 * A ring that chases its tail, pixels in orbit, a snake running round a square, equaliser bars,
 * and rings pulsing out. Screen readers hear "Loading" (or your label).
 *
 *   kind      ring | orbit | snake | bars | pulse           default: ring
 *   palette   its colours                                 default: lime
 *   size      px                                          default: 48
 *   label     what's loading                              default: Loading
 *   pixel     size of one pixel, px                       default: 3 */
const LD_KINDS = { ring: 0, orbit: 1, snake: 2, bars: 3, pulse: 4 };
const LD_SHADER = `vec4 effect(vec2 uv,vec2 cell){
  vec2 q=uv-.5;float r=length(q)*2.,a=atan(q.y,q.x)/6.2831+.5,t=u_time,k=u_k.x,v=0.;
  if(k==0.){float arc=fract(a-t*.9);v=(r>.5&&r<.9&&arc<.75)?.15+.85*arc/.75:0.;}
  else if(k==1.){for(int i=0;i<4;i++){float fi=float(i),an=-t*3.-fi*.5;vec2 c=vec2(cos(an),sin(an))*.3;v=max(v,step(length(q-c),.11-fi*.015)*(1.-fi*.2));}}
  else if(k==2.){float n=u_res.x;vec2 g=cell;if(min(min(g.x,g.y),min(n-1.-g.x,n-1.-g.y))>1.)return vec4(0.);
    float i;if(g.y<=1.)i=g.x;else if(g.x>=n-2.)i=n+g.y;else if(g.y>=n-2.)i=2.*n+n-1.-g.x;else i=3.*n+n-1.-g.y;
    float d=mod(fract(t*.4)*4.*n-i,4.*n);v=d<n*1.4?1.-d/(n*1.4):0.;}
  else if(k==3.){float b=floor(uv.x*5.),f=fract(uv.x*5.),h=.2+.7*(.5+.5*sin(t*6.+b*1.2));v=(f>.18&&f<.82&&abs(uv.y-.5)*2.<h)?.35+.65*h:0.;}
  else{float w=fract(r*1.3-t*.9);v=r<1.?smoothstep(.2,0.,abs(w-.5)-.12)*(1.-r*.8):0.;}
  if(v<.03)return vec4(0.);return vec4(dpal(.3+.7*v,cell),1.);}`;
class PiixLoaderElement extends GLStage {
  static get observedAttributes() { return [...GLStage.observedAttributes, 'size', 'label']; }
  constructor() { super(); this._defPx = 3; this._defPal = 'lime'; this._defDither = 0; }
  _hostCss() { const s = +this.getAttribute('size') || 48; return `display:inline-block;vertical-align:middle;width:${s}px;height:${s}px`; }
  _setup() { this.setAttribute('role', 'status'); this.setAttribute('aria-label', this.getAttribute('label') || 'Loading'); }
  _shader() { return LD_SHADER; }
  _uniforms() { return { u_k: [LD_KINDS[this.getAttribute('kind')] || 0, 0, 0, 0] }; }
}
define('piix-loader', PiixLoaderElement);
ELEMENTS.loader = 'piix-loader';
