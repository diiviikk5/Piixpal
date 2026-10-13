/* SHADER: GPU pixel backgrounds.   @component shader
 *
 *   <section>
 *     <piix-shader kind="mesh" fill></piix-shader>
 *     <h2>Your content sits on top</h2>
 *   </section>
 *
 * Ten shaders running on the GPU, drawn on a pixel grid and dithered into the theme's colours:
 * a drifting mesh gradient, domain-warped marble, an aurora, glowing crystal cells, liquid metal,
 * a synthwave horizon, a nebula, topographic contour lines, a dot matrix that ripples from your
 * pointer, and fire. The pointer bends each of them. With "fill" it sits behind the content of
 * the element it's in.
 *
 *   kind      mesh | warp | aurora | crystal | liquid | horizon | nebula | topo | dots | fire
 *   palette   lime | aurora | sunset | ocean | candy | violet | fire | gameboy | paper | mono,
 *             or your own colours, dark to light: "#000,#6b4cff,#fff"
 *   pixel     size of one pixel, in px                     default: 4
 *   dither    0 for smooth bands, 1 for full dither         default: 1
 *   speed     1 is normal, 0 holds still                    default: 1
 *   height    when not filling: px or any CSS length       default: 360px
 *   fill      sit behind the content of the parent element */
const SH_KINDS = {
  mesh: ['candy', `vec4 effect(vec2 uv,vec2 cell){
    vec2 q=aspect(uv),m=aspect(u_mouse);float t=u_time*.22,v=0.,w=0.;
    for(int i=0;i<5;i++){float fi=float(i);vec2 c=vec2(sin(t*(.7+fi*.13)+fi*1.7),cos(t*(.9+fi*.11)+fi*2.3))*vec2(.62,.4);
      if(i==4)c=mix(c,m,u_hover*.85);float d=length(q-c),k=1./(d*d*7.+.3);v+=k*fi/4.;w+=k;}
    v=v/w+(fbm(q*3.+t)-.5)*.14;return vec4(dpal(v,cell),1.);}`],
  warp: ['aurora', `vec4 effect(vec2 uv,vec2 cell){
    vec2 q=aspect(uv),m=aspect(u_mouse),p=q*2.2;float t=u_time*.1;
    p+=normalize(q-m+.0001)*.35*exp(-length(q-m)*3.5)*u_hover;
    vec2 a=vec2(fbm(p+vec2(0,t)),fbm(p+vec2(5.2,1.3)-t));
    vec2 b=vec2(fbm(p+4.*a+vec2(1.7,9.2)+t*.7),fbm(p+4.*a+vec2(8.3,2.8)-t*.5));
    float v=fbm(p+4.*b)*1.3-.12+length(b)*.12;return vec4(dpal(v,cell),1.);}`],
  aurora: ['aurora', `vec4 effect(vec2 uv,vec2 cell){
    vec2 q=aspect(uv),m=aspect(u_mouse);float t=u_time*.3,v=.06*(1.-uv.y);
    for(int i=0;i<3;i++){float fi=float(i),x=q.x*1.3+fi*.7;
      float yc=.64-fi*.13+.08*sin(x*2.+t+fi)+.06*fbm(vec2(x*2.,t*.5+fi))+.06*exp(-length(q-m)*4.)*u_hover;
      float d=uv.y-yc,band=exp(-d*d*(d>0.?22.:220.));band*=.72+.28*sin(x*14.+t*1.5+fbm(vec2(x*5.,t))*5.);v+=band*(.8-fi*.2);}
    float s=hash(cell);if(s>.994)v+=.55*(.5+.5*sin(u_time*3.+s*40.));return vec4(dpal(v,cell),1.);}`],
  crystal: ['violet', `vec4 effect(vec2 uv,vec2 cell){
    vec2 q=aspect(uv),m=aspect(u_mouse),p=q*4.,i=floor(p),f=fract(p),id=vec2(0.);float d1=8.,d2=8.;
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y)),o=vec2(hash(i+g),hash(i+g+19.));
      o=.5+.45*sin(u_time*.5+6.2831*o);float d=length(g+o-f);if(d<d1){d2=d1;d1=d;id=i+g;}else if(d<d2)d2=d;}
    float e=d2-d1,v=.15+.45*hash(id)*(.6+.4*sin(u_time+hash(id)*9.));v=mix(v,1.,smoothstep(.09,.0,e));
    v+=.45*exp(-length(q-m)*4.)*u_hover*(1.-smoothstep(.0,.3,e));return vec4(dpal(v,cell),1.);}`],
  liquid: ['mono', `vec4 effect(vec2 uv,vec2 cell){
    vec2 q=aspect(uv),m=aspect(u_mouse);float f=0.;
    for(int i=0;i<6;i++){float fi=float(i);vec2 c=vec2(sin(u_time*.45*(1.+fi*.17)+fi*2.1)*.6,cos(u_time*.4*(1.+fi*.13)+fi*1.3)*.33);f+=.03/dot(q-c,q-c);}
    f+=.05/dot(q-m,q-m)*u_hover;
    float v=f>1.?.3+.62*(.5+.5*sin(uv.y*8.+q.x*1.2+clamp(f,1.,3.)*1.1-u_time*.5))*(.75+.25*smoothstep(1.,2.,f)):.05+.08*uv.y+.12*smoothstep(.55,1.,f);return vec4(dpal(v,cell),1.);}`],
  horizon: ['sunset', `vec4 effect(vec2 uv,vec2 cell){
    vec2 q=aspect(uv),m=aspect(u_mouse);float hz=.42,v;
    if(uv.y>hz){v=.12+.45*(1.-(uv.y-hz)/(1.-hz));vec2 s=vec2(q.x-m.x*.15*u_hover,uv.y-(hz+.21));
      if(length(s)<.22&&!(s.y<0.&&fract(s.y*16.+u_time*.35)<(-s.y/.22)*.7))v=.75+s.y*1.1;
      float st=hash(cell);if(st>.993&&uv.y>.7)v=.7;}
    else{float z=.11/(hz-uv.y+.003),gx=q.x*z;
      float line=max(step(.9,fract(z*.9-u_time*.8)),step(.88,1.-abs(fract(gx*1.4)-.5)*2.));
      v=line*.8*smoothstep(0.,.04,hz-uv.y)+.05+.45*exp(-(hz-uv.y)*22.);}
    return vec4(dpal(v,cell),1.);}`],
  nebula: ['candy', `vec4 effect(vec2 uv,vec2 cell){
    vec2 q=aspect(uv),m=aspect(u_mouse),p=q*1.7+vec2(u_time*.02,0.);
    float n=fbm(p*1.4+fbm(p*2.2+u_time*.04)*1.6),v=pow(n,2.2)*1.5+.02+.3*exp(-length(q-m)*5.)*u_hover;
    float s=hash(cell);if(s>.992)v=max(v,.6+.4*sin(u_time*3.+s*50.));return vec4(dpal(v,cell),1.);}`],
  topo: ['paper', `vec4 effect(vec2 uv,vec2 cell){
    vec2 q=aspect(uv),m=aspect(u_mouse);float h=fbm(q*2.+vec2(0.,u_time*.06))+.35*exp(-length(q-m)*3.)*u_hover;
    float l=abs(fract(h*7.)-.5),major=abs(fract(h*1.75)-.5);
    float v=.04+h*.1+smoothstep(.13,.02,l)*.55+smoothstep(.06,.0,major)*.4;return vec4(dpal(v,cell),1.);}`],
  dots: ['lime', `vec4 effect(vec2 uv,vec2 cell){
    vec2 g=floor(cell/4.),c=(g*4.+2.)/u_res,cq=aspect(c),m=aspect(u_mouse);float d=length(cq-m);
    float v=.1+.32*fbm(g*.12+u_time*.15)+u_hover*(.5+.5*sin(d*28.-u_time*5.))*exp(-d*2.5)*.75;
    vec2 f=mod(cell,4.);float on=step(f.x,2.)*step(f.y,2.)*step(.5,f.x)*step(.5,f.y);
    return vec4(dpal(v*on,cell),1.);}`],
  fire: ['fire', `vec4 effect(vec2 uv,vec2 cell){
    vec2 q=aspect(uv),m=aspect(u_mouse),p=vec2(q.x*3.,uv.y*2.2-u_time*1.1);
    float v=(1.-uv.y)*1.3-fbm(p)*.65+.2*fbm(p*2.3)+.4*exp(-length(q-m)*5.)*u_hover;
    return vec4(dpal(pow(clamp(v,0.,1.),1.5),cell),1.);}`]
};
class PiixShaderElement extends GLStage {
  get kind() { const k = this.getAttribute('kind'); return SH_KINDS[k] ? k : 'mesh'; }
  get _defPal() { return SH_KINDS[this.kind][0]; }
  _hostCss() { return (this.hasAttribute('fill') ? '' : 'width:100%;') + (this.hasAttribute('fill') || this.getAttribute('height') ? '' : 'height:360px;'); }
  _setup() { if (!this.hasAttribute('aria-label') && !this.hasAttribute('fill')) { this.setAttribute('role', 'img'); this.setAttribute('aria-label', `An animated ${this.kind} background`); } if (this.hasAttribute('fill')) this.setAttribute('aria-hidden', 'true'); }
  _shader() { return SH_KINDS[this.kind][1]; }
}
define('piix-shader', PiixShaderElement);
ELEMENTS.shader = 'piix-shader';
