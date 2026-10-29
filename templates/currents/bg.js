/* Currents — motion background
 * Usage: <canvas data-bg></canvas> inside any positioned container, then <script src="bg.js"></script>.
 * No canvas found → a fixed full-screen one is created behind the page.
 */
(() => {
  let canvas = document.querySelector('canvas[data-bg]');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.setAttribute('data-bg', '');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block';
    document.body.prepend(canvas);
  }
  const gl = canvas.getContext('webgl', { antialias:false, alpha:false });
  if (!gl) { canvas.style.background = '#1a0d2e'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });   /* free the GPU context when the page/iframe goes away */

  const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const frag = `
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m;
// Currents — a chrome sphere ploughing through a field of op-art stripes.
// The stripes are streamlines of real potential flow around the sphere (psi = y(1 - R^2/|q|^2)), plus a
// turbulent wake that is advected downstream, so the lines bend, meander and flow. The plane is ray-cast in
// perspective; the sphere is ray-traced and reflects the actual striped plane. Red trail upstream, molten
// orange/yellow trail in the wake.
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vn(p);p=p*2.07+vec2(1.7,9.2);a*=.5;}return v;}

const float R=1.;          // sphere radius
const float SINK=.62;      // how far the sphere sits in the molten plane (centre height = R*SINK)
vec3 CAM; mat3 VIEW; vec3 SC; vec2 FLOW;
float RC;                  // radius of the waterline circle

vec3 rayDir(vec2 fc){
  vec2 uv=(fc-.5*r)/r.y;
  return normalize(VIEW*vec3(uv,1.45));
}
// plane point → flow frame (x downstream, y across), sphere at origin
vec2 frameQ(vec2 pxz){
  vec2 d=pxz-SC.xz;
  return vec2(dot(d,FLOW),dot(d,vec2(-FLOW.y,FLOW.x)));
}
// the stream function: potential flow round the waterline circle + an advected turbulent wake
float psi(vec2 q){
  float rr=max(dot(q,q),RC*RC*1.0001);
  float p=q.y*(1.-RC*RC/rr);
  // the wake: widens downstream, churns, and flows away with the current
  float x=q.x;
  float wid=RC*(1.1+.32*max(x,0.));
  float on=smoothstep(-.2,.9,x)*exp(-q.y*q.y/(wid*wid));
  vec2 a=vec2(x*.6-t*.45,q.y*.85);
  float tur=fbm(a+vec2(fbm(a*1.7+t*.12)*2.2,0.))-.5;
  float tur2=fbm(a*1.6+vec2(-t*.3,tur*2.))-.5;
  p+=on*(tur*(1.25+.3*x)+tur2*.25);
  // meanders: lines in the wake fold back on themselves like the cover
  p+=on*.16*sin(x*3.1-t*1.6+q.y*4.+tur*9.)+on*.05*sin(x*5.3-t*1.8+tur2*8.);
  // the whole field breathes, very gently
  p+=.05*sin(x*.55+q.y*.35-t*.35)+.035*sin(x*.21-q.y*.9+t*.23);
  return p;
}
// stripes + trails for a point on the plane; aa = stripe-space blur width
vec3 planeCol(vec2 pxz,float aa,float dist){
  vec2 q=frameQ(pxz);
  float s=psi(q);
  float F=10.5;                                          // stripes per unit of psi
  float v=s*F;
  float tri=abs(fract(v)-.5)*2.;
  float line=smoothstep(.5-aa,.5+aa,tri);              // 1 = light stripe
  line=mix(line,.5,clamp(aa*1.3-.3,0.,1.));            // far away: average out instead of aliasing
  // lavender stripes on near-black, deeper violet into the distance
  float far=clamp(dist/18.,0.,1.);
  vec3 lite=mix(vec3(.80,.66,.98),vec3(.42,.26,.66),far);
  lite*=.85+.15*sin(v*.31+q.x*.2);                     // slow tonal banding along the field
  vec3 dark=vec3(.045,.02,.075);
  vec3 c=mix(dark,lite,line);
  // contact shadow + glowing waterline ring around the sphere
  float d=length(q);
  c*=mix(.35,1.,smoothstep(RC*.95,RC*1.9,d));
  float ring=exp(-pow((d-RC*1.02)/(RC*.07),2.));
  c=mix(c,vec3(1.,.36,.6),ring*.85);
  // the red trail: the stagnation streamline upstream, a thin glowing seam
  float up=smoothstep(.3,-.6,q.x);
  float seam=abs(s)*F;
  c=mix(c,vec3(1.,.16,.34),up*smoothstep(.45,.15,seam));
  c+=vec3(1.,.2,.45)*up*exp(-seam*seam*.9)*.45;
  // the molten trail in the wake: follows the churned zero line, orange → yellow, fading downstream
  float dn_=smoothstep(.1,.6,q.x)*smoothstep(9.,3.,q.x);
  float melt=smoothstep(.42,.16,seam)*dn_;
  vec3 mc=mix(vec3(1.,.24,.3),vec3(1.,.78,.2),smoothstep(.5,5.,q.x));
  c=mix(c,mc,melt);
  c+=mc*exp(-seam*seam*3.)*dn_*.18;
  // fog into the dark horizon
  c=mix(c,vec3(.02,.008,.035),smoothstep(.35,.95,far));
  return c;
}
vec3 skyCol(vec3 d){
  float y=clamp(d.y,0.,1.);
  return mix(vec3(.06,.025,.09),vec3(.0),pow(y,.35));
}
vec3 shadeRay(vec3 ro,vec3 d,float pixAng){
  // plane y=0
  if(d.y<-1e-4){
    float tp=-ro.y/d.y;
    vec3 p=ro+d*tp;
    // stripe-space footprint of one pixel: |grad psi| * F * (distance*pixAng / grazing)
    vec2 q=frameQ(p.xz);
    float e=.01;
    float g=length(vec2(psi(q+vec2(e,0.))-psi(q),psi(q+vec2(0.,e))-psi(q)))/e;
    float foot=tp*pixAng/max(-d.y,.05);
    float aa=clamp(g*10.5*foot*1.2,.002,1.);
    return planeCol(p.xz,aa,tp);
  }
  return skyCol(d);
}
void main(){
  // camera: high, looking down the current, rolled for a diagonal, drifting slowly + pointer
  vec2 pm=(m-.5);
  float yaw=-.52+pm.x*.12+.04*sin(t*.07);
  float pitch=-.62+pm.y*.06+.015*sin(t*.09+1.);
  float roll=-.2;
  CAM=vec3(0.,4.4,0.);
  vec3 fw=normalize(vec3(sin(yaw)*cos(pitch),sin(pitch),cos(yaw)*cos(pitch)));
  vec3 rt=normalize(cross(vec3(0.,1.,0.),fw)),up=cross(fw,rt);
  float cr=cos(roll),sr=sin(roll);
  vec3 rt2=rt*cr+up*sr,up2=-rt*sr+up*cr;
  VIEW=mat3(rt2,up2,fw);
  // the sphere sits ahead of the camera, a little right of centre on screen; it bobs in the melt
  SC=CAM+fw*7.4+rt2*1.25; SC.y=R*SINK+.03*sin(t*.8);
  RC=sqrt(R*R-SC.y*SC.y);
  // the current runs from far-left to near-right (screen), i.e. the trail comes in from the top-left
  vec2 fwxz=normalize(fw.xz),rtxz=normalize(rt.xz);
  FLOW=normalize(-fwxz*1.+rtxz*.55);
  vec3 d=rayDir(gl_FragCoord.xy);
  float pixAng=1./(r.y*1.45);
  vec3 col=shadeRay(CAM,d,pixAng);
  // sphere
  vec3 oc=CAM-SC; float b=dot(oc,d),c=dot(oc,oc)-R*R,h=b*b-c;
  if(h>0.){
    float th=-b-sqrt(h);
    vec3 p=CAM+d*th;
    if(p.y>0.){
      vec3 n=normalize(p-SC);
      vec3 rf=reflect(d,n);
      // the reflection is the real striped world (with a wider footprint: curvature magnifies)
      vec3 env;
      if(rf.y<-1e-4){
        float tp=-p.y/rf.y; vec3 pp=p+rf*tp;
        env=planeCol(pp.xz,clamp(.22+tp*.09,.2,1.),tp+th);
      } else {
        float y=clamp(rf.y,0.,1.);
        env=mix(vec3(.55,.5,.62),vec3(.92,.92,.96),smoothstep(0.,.5,y));            // bright studio dome
        env*=.75+.25*smoothstep(-.6,.6,rf.x);                                        // one side brighter
      }
      // a broad soft key light (the window in the cover), up-left
      vec3 L=normalize(vec3(-.5,.75,-.45));
      float spec=pow(max(dot(rf,L),0.),60.);
      float soft=pow(max(dot(rf,L),0.),6.);
      float fres=.72+.28*pow(1.-max(dot(-d,n),0.),5.);
      vec3 s=env*fres*vec3(.92,.93,.97);
      s+=vec3(1.)*spec*1.6+vec3(.9,.88,.95)*soft*.35;
      // darker towards the melt line, like a sphere half sunk in a glowing pool
      s=mix(s,s*vec3(1.,.55,.7),smoothstep(.25,0.,p.y)*.6);
      // edge AA
      float edge=smoothstep(0.,1.,h*r.y*.02);
      col=mix(col,s,clamp(edge,0.,1.));
    }
  }
  // vignette + fine grain
  vec2 uv=gl_FragCoord.xy/r;
  col*=1.-.35*pow(length((uv-.5)*vec2(1.1,1.)),2.2);
  col+=(h21(gl_FragCoord.xy+fract(t*7.)*91.)-.5)*.018;
  gl_FragColor=vec4(pow(max(col,0.),vec3(.95)),1.);
}
`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.bindAttribLocation(prog, 0, 'p');
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n), ur = U('r'), ut = U('t'), um = U('m'), uo = U('o');
  const focus = (canvas.dataset.focus || '.5,.5').split(',').map(Number); // optional: <canvas data-bg data-focus="x,y">

  const SCALE = 1; // render scale vs CSS pixels — lower = faster, softer
  const resize = () => { const P = /[?&]preview/.test(location.search) ? .5 : 1; canvas.width = canvas.clientWidth * SCALE * P; canvas.height = canvas.clientHeight * SCALE * P; gl.viewport(0, 0, canvas.width, canvas.height); };
  new ResizeObserver(resize).observe(canvas); resize();

  let mx = .5, my = .5, tx = mx, ty = my, visible = true;
  addEventListener('pointermove', e => { const b = canvas.getBoundingClientRect(); tx = (e.clientX - b.left) / b.width; ty = 1 - (e.clientY - b.top) / b.height; });
  new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(canvas);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  const frame = now => {
    requestAnimationFrame(frame);
    if (!visible) return;
    mx += (tx - mx) * .04; my += (ty - my) * .04;
    gl.uniform2f(ur, canvas.width, canvas.height);
    gl.uniform1f(ut, canvas.time != null ? canvas.time : still ? 20 : (now - t0) / 1000);
    gl.uniform2f(um, mx, my);
    if (uo) gl.uniform2f(uo, focus[0], focus[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  requestAnimationFrame(frame);
})();
