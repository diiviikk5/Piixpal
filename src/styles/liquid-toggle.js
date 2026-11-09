/* LIQUID TOGGLE: a switch whose knob is a drop of liquid.   @component liquid-toggle  @needs liquid-button
 *
 *   <piix-liquid-toggle></piix-liquid-toggle>
 *   <piix-liquid-toggle checked name="dark" label="Dark mode"></piix-liquid-toggle>
 *
 * Flip it and the drop stretches across the track, a tail of liquid trailing behind it before it
 * snaps back into a bead; the track fills with colour as it lands. A real switch: Space and
 * Enter flip it, it reports to forms, and it fires "change".
 *
 *   checked   on
 *   name      form field name (sends "on")
 *   label     accessible name                            default: Toggle
 *   look      chrome | ink | water | honey               default: chrome
 *   colors    floor, horizon, sky (overrides look) */
const LQ_TOGGLE = LQ_GLSL + `
vec4 effect(vec2 uv,vec2 cell){
  vec2 p=cell+.5,c=u_res*.5;float s=u_k.w,R=u_k.y;
  float trk=sdRB(p-c,vec2(u_k.x,R),R);
  vec2 k=vec2(c.x-u_k.x+R+(u_k.x-R)*2.*u_j.x,c.y),tl=vec2(c.x-u_k.x+R+(u_k.x-R)*2.*u_j.y,c.y);
  float r=R-3.*s;
  float kn=smin(length(p-k)-r*(1.+.08*u_j.z),length(p-tl)-r*.55,r*1.3);
  /* the track: frosted when off, liquid colour when on */
  vec4 col=vec4(0.);
  if(trk<1.5*s){
    vec3 off=vec3(.86,.87,.89),on=mix(u_c0*1.5+.04,u_c0*2.4+.08,uv.y);
    vec3 tc=mix(off,on*.85,u_j.w);
    float inner=smoothstep(0.,6.*s,-trk);
    tc*=.88+.12*inner;
    col=vec4(tc,clamp(.5-trk/s,0.,1.));
  }
  float e=1.5*s;
  vec2 g=normalize(vec2(smin(length(p+vec2(e,0.)-k)-r,length(p+vec2(e,0.)-tl)-r*.55,r*1.3)-kn,smin(length(p+vec2(0.,e)-k)-r,length(p+vec2(0.,e)-tl)-r*.55,r*1.3)-kn)+1e-5);
  vec4 b=lqShade(p,kn,g,s,9.,u_time);
  float sh=exp(-max(length(p+vec2(0.,3.*s)-k)-r,0.)/(4.*s))*.25*(1.-b.a);
  vec3 under=mix(col.rgb,vec3(.1,.05,.2),sh/(col.a+sh+1e-4));
  float ua=max(col.a,sh);
  return vec4(mix(under,b.rgb,b.a),max(ua,b.a));
}`;
class PiixLiquidToggleElement extends GLStage {
  static get formAssociated() { return true; }
  static get observedAttributes() { return ['look', 'colors', 'checked']; }
  constructor() { super(); this._defPx = .5; this._x = 0; this._tail = 0; this._v = 0; this._fill = 0; this._int = this.attachInternals ? this.attachInternals() : null; }
  get checked() { return this.hasAttribute('checked'); }
  set checked(v) { this.toggleAttribute('checked', !!v); }
  attributeChangedCallback(n, a, b) { if (n === 'checked') { this._sync(); return; } super.attributeChangedCallback(n, a, b); }
  _hostCss() { return 'display:inline-block;vertical-align:middle;width:68px;height:38px;cursor:pointer;-webkit-tap-highlight-color:transparent;'; }
  _css() { return 'canvas{image-rendering:auto}.b{all:unset;position:absolute;inset:0;border-radius:999px;cursor:inherit}.b:focus-visible{outline:2px solid currentColor;outline-offset:3px}'; }
  _html() { return `<canvas aria-hidden="true"></canvas><button class="b" part="switch" type="button" role="switch" aria-label="${(this.getAttribute('label') || 'Toggle').replace(/"/g, '&quot;')}"></button>`; }
  _setup() {
    this._cols = lqColors(this);
    this._x = this._tail = this._fill = this.checked ? 1 : 0;
    this.shadowRoot.querySelector('.b').addEventListener('click', () => { this.checked = !this.checked; this.dispatchEvent(new Event('change', { bubbles: true })); });
    this._sync();
  }
  _sync() {
    const b = this.shadowRoot && this.shadowRoot.querySelector('.b'); if (b) b.setAttribute('aria-checked', String(this.checked));
    if (this._int) this._int.setFormValue(this.checked ? 'on' : null);
  }
  _shader() { return LQ_TOGGLE; }
  _uniforms(T, dt) {
    const dpr = Math.min(devicePixelRatio || 1, 2), to = this.checked ? 1 : 0, R = reduced();
    /* a springy knob, and a tail that follows it lazily: the gap between them is the stretch */
    if (R) this._x = this._tail = to;
    else { this._v += (to - this._x) * 260 * dt; this._v *= Math.pow(.0009, dt); this._x += this._v * dt; this._tail = lerp(this._tail, this._x, Math.min(1, dt * 9)); }
    this._fill = lerp(this._fill, to, Math.min(1, dt * 6));
    return { ...this._cols, u_k: [this._W / 2 - 1 * dpr, this._H / 2 - 1 * dpr, 0, dpr], u_j: [clamp(this._x, -.05, 1.05), this._tail, this._hov, this._fill] };
  }
}
define('piix-liquid-toggle', PiixLiquidToggleElement);
ELEMENTS['liquid-toggle'] = 'piix-liquid-toggle';
