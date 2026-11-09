/* LIQUID BUTTON: a button made of liquid that reaches for your cursor.   @component liquid-button
 *
 *   <piix-liquid-button>Get started</piix-liquid-button>
 *   <piix-liquid-button look="ink">Launch</piix-liquid-button>
 *
 * Drawn on the GPU as a signed distance field, smooth and full resolution. Its edge breathes;
 * bring the pointer near and a bead of liquid stretches out of it toward you and joins back when
 * you leave; click and droplets splash out and fall back in. It is shaded as a real material
 * (chrome, ink, water or honey) mirroring a studio with a hard horizon line, not a gradient.
 * A real button: focus, keyboard, forms.
 *
 *   look      chrome | ink | water | honey               default: chrome
 *   colors    floor, horizon, sky (overrides look)
 *   text      label colour                               default: the look's
 *   size      sm | md | lg                                default: md
 *   type      button | submit | reset
 *   href      makes it a link
 *   disabled */

/* the liquid toolkit every Liquid component shares: a rounded box, a smooth union, and the shading */
const LQ_GLSL = `
uniform vec3 u_c0;uniform vec3 u_c1;uniform vec3 u_c2;
float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
/* p in device pixels, d the field there, g its unit gradient, s the device-pixel scale.
 * Shaded like a real reflective liquid: the surface mirrors a studio, dark floor below a bright
 * horizon and a softer sky above, so it reads as chrome, ink, water or honey, never as a gradient. */
vec4 lqShade(vec2 p,float d,vec2 g,float s,float bevelPx,float t){
  float bev=1.-smoothstep(0.,bevelPx*s,-d);
  vec3 n=normalize(vec3(g*bev*1.7,1.));
  vec3 r=reflect(vec3(0.,0.,-1.),n);
  float y=r.y*.9+.18+.06*sin(p.x/(s*60.)+t*.6)*bev+(noise(p/(s*80.)+t*.15)-.5)*.08;
  vec3 col=y<0.?mix(u_c0,u_c0*1.6+.03,smoothstep(-.6,0.,y)):mix(u_c1,u_c2,smoothstep(0.,.55,y));
  col=mix(col,u_c1*1.08+.06,exp(-abs(y)*28.)*.85);
  vec3 L=normalize(vec3(-.45,.65,.75));
  col+=pow(max(dot(reflect(-L,n),vec3(0.,0.,1.)),0.),70.)*1.1;
  col*=1.-.25*pow(bev,4.);
  return vec4(clamp(col,0.,1.),clamp(.5-d/s,0.,1.));
}`;
/* finishes: floor (shadow side), horizon (the bright line), sky (the upper reflection), and the label colour */
const LQ_LOOKS = {
  chrome: ['#16181d,#f4f6f9,#9aa3b2', '#111318'],
  ink: ['#020203,#aeb4bf,#1a1c21', '#f4f6f9'],
  water: ['#0b3a47,#effcff,#6fc3d6', '#05252e'],
  honey: ['#3b1a02,#ffe9b0,#d1861a', '#2a1300']
};
const lqLook = el => LQ_LOOKS[el.getAttribute('look')] || LQ_LOOKS[el._defLook || 'chrome'];
const lqColors = el => {
  const l = (el.getAttribute('colors') || lqLook(el)[0]).split(',').map(s => s.trim());
  return { u_c0: glRGB(l[0]), u_c1: glRGB(l[1] || l[0]), u_c2: glRGB(l[2] || l[1] || l[0]) };
};
/* the pointer in a canvas's own device pixels, y up, as the shader sees it */
const lqPointer = (cv, dpr) => {
  const r = cv.getBoundingClientRect();
  return [(ptr.cx - r.left) * dpr, (r.bottom - ptr.cy) * dpr];
};
const LQ_M = 30;   /* the margin round a liquid control, in css px, so splashes have room */

const LQ_BUTTON = LQ_GLSL + `
uniform vec4 u_dr[6];
float field(vec2 p){
  vec2 c=u_res*.5,q=p-c,B=u_k.xy*vec2(1.+.05*u_j.w,1.-.1*u_j.w);float s=u_k.w;
  float a=atan(q.y,q.x);
  float d=sdRB(q,B,u_k.z)+(noise(vec2(a*1.7+u_time*.7,u_time*.35))-.5)*s*(2.5+5.*u_j.z);
  float near=u_j.z;
  d=smin(d,length(p-u_j.xy)-s*(15.*near-5.),s*(2.+24.*near));
  for(int i=0;i<6;i++){if(u_dr[i].z>0.)d=smin(d,length(p-u_dr[i].xy)-u_dr[i].z,s*14.);}
  return d;
}
vec4 effect(vec2 uv,vec2 cell){
  vec2 p=cell+.5;float s=u_k.w,e=1.5*s;
  float d=field(p);
  vec2 g=normalize(vec2(field(p+vec2(e,0.))-d,field(p+vec2(0.,e))-d)+1e-5);
  vec4 c=lqShade(p,d,g,s,11.,u_time);
  float sh=exp(-max(field(p+vec2(0.,7.*s)),0.)/(7.*s))*.28*(1.-c.a);
  return vec4(mix(vec3(.05,.03,.1),c.rgb,c.a/max(c.a+sh,1e-4)),max(c.a,sh));
}`;

class PiixLiquidButtonElement extends GLStage {
  static get formAssociated() { return true; }
  static get observedAttributes() { return ['colors', 'look', 'size', 'disabled', 'text']; }
  constructor() { super(); this._defPx = .5; this._drops = []; this._press = 0; this._near = 0; this._int = this.attachInternals ? this.attachInternals() : null; }
  _box() { return this._cv; }
  _hostCss() { return 'display:inline-block;vertical-align:middle;cursor:pointer;-webkit-tap-highlight-color:transparent;'; }
  _css() {
    const [pad, fs] = { sm: ['12px 22px', 14], lg: ['22px 40px', 19] }[this.getAttribute('size')] || ['17px 30px', 16];
    return `canvas{inset:-${LQ_M}px;width:calc(100% + ${LQ_M * 2}px);height:calc(100% + ${LQ_M * 2}px);image-rendering:auto}
.b{all:unset;position:relative;display:block;box-sizing:border-box;padding:${pad};font:700 ${fs}px/1 "Bricolage Grotesque",system-ui,sans-serif;letter-spacing:.01em;
  color:${this.getAttribute('text') || lqLook(this)[1]};text-shadow:0 1px 0 rgba(255,255,255,.25);transition:transform .2s cubic-bezier(.3,1.6,.5,1);cursor:inherit}
.b:focus-visible{outline:2px solid currentColor;outline-offset:6px;border-radius:999px}
:host(:active) .b{transform:scale(.97)}
:host([disabled]){opacity:.45;cursor:not-allowed;filter:grayscale(.8)}`;
  }
  _html() {
    const href = this.getAttribute('href');
    return `<canvas aria-hidden="true"></canvas>${href ? `<a class="b" part="button" href="${href.replace(/"/g, '&quot;')}"><slot></slot></a>` : `<button class="b" part="button" type="button"${this.hasAttribute('disabled') ? ' disabled' : ''}><slot></slot></button>`}`;
  }
  _setup() {
    this._cols = lqColors(this);
    const b = this.shadowRoot.querySelector('.b');
    b.addEventListener('pointerdown', () => { this._down = true; });
    addEventListener('pointerup', () => { this._down = false; });
    b.addEventListener('click', e => {
      if (this.hasAttribute('disabled')) return;
      const dpr = Math.min(devicePixelRatio || 1, 2), r = this._cv.getBoundingClientRect();
      const x = ((e.clientX || r.left + r.width / 2) - r.left) * dpr, y = (r.bottom - (e.clientY || r.top + r.height / 2)) * dpr;
      for (let i = 0; i < 5; i++) { const a = Math.random() * Math.PI * 2, v = (120 + Math.random() * 160) * dpr; this._drops.push({ x, y, vx: Math.cos(a) * v, vy: Math.abs(Math.sin(a)) * v * .8 + 60 * dpr, r: (5 + Math.random() * 5) * dpr }); }
      this._drops = this._drops.slice(-6);
      const form = this._int && this._int.form, t = this.getAttribute('type');
      if (form && t === 'submit') form.requestSubmit ? form.requestSubmit() : form.submit();
      if (form && t === 'reset') form.reset();
    });
  }
  _shader() { return LQ_BUTTON; }
  _uniforms(T, dt) {
    const dpr = Math.min(devicePixelRatio || 1, 2), m = lqPointer(this._cv, dpr), W = this._W, H = this._H, M = LQ_M * dpr;
    const hw = W / 2 - M, hh = H / 2 - M;
    /* how near the pointer is to the edge: within 70 px the liquid reaches for it */
    const qx = Math.max(Math.abs(m[0] - W / 2) - hw, 0), qy = Math.max(Math.abs(m[1] - H / 2) - hh, 0), dist = Math.hypot(qx, qy) / dpr;
    this._near = lerp(this._near, ptr.seen && dist < 70 && !this.hasAttribute('disabled') ? 1 - dist / 70 : 0, Math.min(1, dt * 8));
    this._press = lerp(this._press, this._down && this._hov > .5 ? 1 : 0, Math.min(1, dt * 14));
    /* the bead sits where the pointer is, but never further out than the margin */
    const bx = clamp(m[0], 8 * dpr, W - 8 * dpr), by = clamp(m[1], 8 * dpr, H - 8 * dpr);
    const dr = new Float32Array(24);
    this._drops.forEach(d => { d.vy -= 520 * dpr * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= .97; d.r -= 9 * dpr * dt; });
    this._drops = this._drops.filter(d => d.r > .5);
    this._drops.forEach((d, i) => dr.set([d.x, d.y, d.r, 0], i * 4));
    return { ...this._cols, u_k: [hw, hh, Math.min(hh, 999), dpr], u_j: [bx, by, this._near, this._press], u_dr: dr };
  }
}
define('piix-liquid-button', PiixLiquidButtonElement);
ELEMENTS['liquid-button'] = 'piix-liquid-button';
