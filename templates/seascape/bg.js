/* Seascape — motion background
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
  if (!gl) { canvas.style.background = 'linear-gradient(180deg,#e9b8a0,#f7c99a 55%,#ffd9a8 58%,#2b4363 60%,#0c1d33)'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });   /* free the GPU context when the page/iframe goes away */

  const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const frag = `
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m;
// Raymarched ocean at golden hour: choppy octave waves (heightfield, bisection-refined), Fresnel sky
// reflection, subsurface colour on the wave crests, a sun glitter path, and a gradient sky with soft clouds.
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return -1.+2.*mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}
const mat2 OCT=mat2(1.6,1.2,-1.2,1.6);
float T;
float octave(vec2 uv,float choppy){
  uv+=n2(uv);
  vec2 wv=1.-abs(sin(uv)), swv=abs(cos(uv));
  wv=mix(wv,swv,wv);
  return pow(1.-pow(wv.x*wv.y,.65),choppy);
}
float sea(vec3 p,int iters){
  float freq=.16, amp=.6, choppy=4., h=0.;
  vec2 uv=p.xz; uv.x*=.75;
  for(int i=0;i<5;i++){
    if(i>=iters)break;
    float d=octave((uv+T)*freq,choppy)+octave((uv-T)*freq,choppy);
    h+=d*amp;
    uv*=OCT; freq*=1.9; amp*=.22; choppy=mix(choppy,1.,.2);
  }
  return p.y-h;
}
vec3 SUN;
vec3 skyc(vec3 e){
  float y=max(e.y,0.);
  vec3 c=mix(vec3(1.,.62,.36),vec3(.36,.5,.78),pow(y,.45));
  c=mix(c,vec3(.12,.2,.42),smoothstep(.25,1.,y));
  float s=max(dot(e,SUN),0.);
  c+=vec3(1.,.66,.36)*pow(s,6.)*.4+vec3(1.,.8,.55)*pow(s,120.)*.6+vec3(1.,.95,.85)*smoothstep(.99955,.9997,s)*4.;
  // soft cloud bands
  vec2 cp=e.xz/(e.y+.08);
  float cl=smoothstep(.1,.9,n2(cp*.6+vec2(t*.01,0.))*.5+n2(cp*1.4)*.3+.4)*smoothstep(.02,.18,e.y)*smoothstep(.6,.2,e.y);
  c=mix(c,mix(vec3(1.,.78,.65),vec3(.95,.55,.45),s),cl*.55);
  return c;
}
vec3 nrm(vec3 p,float eps){
  vec3 n; n.y=sea(p,5);
  n.x=sea(vec3(p.x+eps,p.y,p.z),5)-n.y;
  n.z=sea(vec3(p.x,p.y,p.z+eps),5)-n.y;
  n.y=eps;
  return normalize(n);
}
float trace(vec3 ori,vec3 dir,out vec3 p){
  float tm=0., tx=1000.;
  float hx=sea(ori+dir*tx,3);
  if(hx>0.){p=ori+dir*tx;return tx;}
  float hm=sea(ori,3), tmid=0.;
  for(int i=0;i<10;i++){
    tmid=mix(tm,tx,hm/(hm-hx));
    p=ori+dir*tmid;
    float hmid=sea(p,3);
    if(hmid<0.){tx=tmid;hx=hmid;}else{tm=tmid;hm=hmid;}
  }
  return tmid;
}
vec3 seaColor(vec3 p,vec3 n,vec3 l,vec3 eye,vec3 dist){
  float fr=clamp(1.-dot(n,-eye),0.,1.);
  fr=pow(fr,3.)*.65;
  vec3 refl=skyc(reflect(eye,n));
  vec3 base=vec3(0.,.09,.18), water=vec3(.8,.9,.6)*.6;
  vec3 refr=base+pow(dot(n,l)*.4+.6,80.)*water*.12;
  vec3 c=mix(refr,refl,fr);
  float atten=max(1.-dot(dist,dist)*.0004,.15);
  c+=water*(p.y-.6)*.18*atten;
  float spec=pow(max(dot(reflect(eye,n),l),0.),60.)*(60.+8.)/(3.14159*8.);
  c+=vec3(1.,.82,.6)*spec*.9*atten;
  return c;
}
void main(){
  T=1.+t*.8;
  vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
  SUN=normalize(vec3(.32+(m.x-.5)*.2,.045,-1.));
  float yaw=(m.x-.5)*.25, pitch=.085+(m.y-.5)*.06;
  vec3 ori=vec3(0.,3.4,-t*4.);   // sail forward (camera looks down -z)
  vec3 dir=normalize(vec3(uv,-2.));
  dir.z+=length(uv)*.14;
  dir=normalize(dir);
  float cy=cos(yaw),sy=sin(yaw),cp=cos(pitch),sp=sin(pitch);
  dir=vec3(dir.x,dir.y*cp-dir.z*sp,dir.y*sp+dir.z*cp);
  dir=vec3(dir.x*cy+dir.z*sy,dir.y,-dir.x*sy+dir.z*cy);
  vec3 p; trace(ori,dir,p);
  vec3 dist=p-ori;
  vec3 n=nrm(p,dot(dist,dist)*(.1/r.x));
  vec3 col=mix(skyc(dir),seaColor(p,n,SUN,dir,dist),pow(smoothstep(0.,-.02,dir.y),.2));
  // haze at the horizon
  col=mix(col,vec3(1.,.72,.5),exp(-abs(dir.y)*28.)*.35);
  col=pow(col,vec3(.75));
  vec2 q=gl_FragCoord.xy/r;
  col*=1.-.3*dot(q-.5,q-.5)*2.;
  col+=(h21(gl_FragCoord.xy+fract(t))-.5)*.012;
  gl_FragColor=vec4(col,1.);
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

  const SCALE = 0.7; // render scale vs CSS pixels — lower = faster, softer
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
