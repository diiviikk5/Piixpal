/* LIQUID CARD: a card whose surface is liquid metal you can stir.   @component liquid-card  @needs liquid-button
 *
 *   <piix-liquid-card>
 *     <h3>Pro plan</h3>
 *     <p>Everything, forever.</p>
 *   </piix-liquid-card>
 *
 * The face is a glossy liquid surface on the GPU: slow currents roll across it, the pointer drags
 * a wake through it, and a click drops a ring that spreads to the edges. The outline breathes a
 * little, like a drop holding its shape. Your content sits on top.
 *
 *   look      chrome | ink | water | honey               default: ink
 *   colors    floor, horizon, sky (overrides look)
 *   tone      dark | light (text colour on top)          default: dark (white text)
 *   radius    corner radius, px                          default: 26 */
const LQ_CARD = LQ_GLSL + `
float height(vec2 p,float s){
  vec2 q=p/(s*420.);
  float h=fbm(q+vec2(u_time*.05,u_time*.035))*.9+noise(q*2.1-vec2(u_time*.08,0.))*.25;
  vec2 m=u_j.xy;float dm=length(p-m)/s;
  h+=u_j.z*.3*exp(-dm/90.)*sin(dm*.06-u_time*4.);
  if(u_j.w<3.){float r=u_j.w*420.,dc=length(p-u_k.xy)/s;h+=.35*exp(-abs(dc-r)/24.)*sin((dc-r)*.12)*(1.-u_j.w/3.);}
  return h;
}
vec4 effect(vec2 uv,vec2 cell){
  vec2 p=cell+.5,c=u_res*.5;float s=u_k.w,rad=u_k.z;
  vec2 q=p-c;float a=atan(q.y,q.x);
  float d=sdRB(q,c-vec2(5.*s),rad)+(noise(vec2(a*2.+u_time*.5,u_time*.25))-.5)*3.*s;
  if(d>2.*s)return vec4(0.);
  float e=2.*s,h=height(p,s);
  vec3 n=normalize(vec3(h-height(p+vec2(e,0.),s),h-height(p+vec2(0.,e),s),.03));
  float bev=1.-smoothstep(0.,10.*s,-d);
  n=normalize(n+vec3(normalize(q+1e-4)*bev*1.2,0.));
  vec3 r=reflect(vec3(0.,0.,-1.),n);
  float y=r.y*.9+.05;
  vec3 col=y<0.?mix(u_c0,u_c0*1.6+.03,smoothstep(-.6,0.,y)):mix(u_c0*1.3+.02,u_c2,smoothstep(0.,.7,y));
  col=mix(col,u_c1,exp(-abs(y)*30.)*.55);
  vec3 L=normalize(vec3(-.4,.6,.7));
  col+=pow(max(dot(reflect(-L,n),vec3(0.,0.,1.)),0.),60.)*.9+pow(bev,3.)*.22;
  return vec4(col,clamp(.5-d/s,0.,1.));
}`;
class PiixLiquidCardElement extends GLStage {
  static get observedAttributes() { return ['look', 'colors', 'tone', 'radius']; }
  constructor() { super(); this._defLook = 'ink'; this._defPx = 1; this._click = [0, 0, 99]; this._wake = 0; }
  _hostCss() {
    const light = this.getAttribute('tone') === 'light';
    return `display:block;color:${light ? '#17121f' : '#fff'};isolation:isolate;`;
  }
  _css() { return `canvas{z-index:-1;image-rendering:auto}.in{position:relative;padding:30px 32px}`; }
  _html() { return '<canvas aria-hidden="true"></canvas><div class="in" part="body"><slot></slot></div>'; }
  _setup() {
    this._cols = lqColors(this);
    this.addEventListener('pointerdown', e => {
      const dpr = Math.min(devicePixelRatio || 1, 2), r = this._cv.getBoundingClientRect();
      this._click = [(e.clientX - r.left) * dpr, (r.bottom - e.clientY) * dpr, now()];
    });
  }
  _shader() { return LQ_CARD; }
  _uniforms(T, dt) {
    const dpr = Math.min(devicePixelRatio || 1, 2), m = lqPointer(this._cv, dpr);
    /* the wake grows with how fast the pointer moves over the card */
    const sp = Math.min(1, Math.hypot(ptr.vx, ptr.vy) / 1400);
    this._wake = lerp(this._wake, this._hov * (.35 + sp), Math.min(1, dt * 4));
    return { ...this._cols, u_k: [this._click[0], this._click[1], (+this.getAttribute('radius') || 26) * dpr, dpr], u_j: [m[0], m[1], this._wake, (now() - this._click[2]) / 1000] };
  }
}
define('piix-liquid-card', PiixLiquidCardElement);
ELEMENTS['liquid-card'] = 'piix-liquid-card';
