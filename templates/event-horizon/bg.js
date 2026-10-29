/* Event Horizon — motion background
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
  if (!gl) { canvas.style.background = 'radial-gradient(7% 11% at 72% 50%,#000 60%,#ffb36b 75%,transparent),radial-gradient(28% 6% at 72% 50%,#ff8a3d,transparent),#000'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });   /* free the GPU context when the page/iframe goes away */

  const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const frag = `
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m;
// Black hole: photons are integrated through Schwarzschild-like gravity (a = -1.5 h^2 r/|r|^5), so the
// accretion disk behind the hole is lensed up over the top and under the bottom, with a photon ring,
// Keplerian rotation (inner disk spins faster) and Doppler beaming (the approaching side is brighter).
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}

vec3 sky(vec3 d){
  float u=atan(d.z,d.x)/6.2831853+.5, v=d.y*.5+.5;
  vec3 c=vec3(0.);
  float band=exp(-pow((d.y-.18*sin(u*6.2831853+.6))*3.2,2.));
  c+=vec3(.32,.2,.42)*fbm(vec2(u*14.,v*7.))*band*.3;
  c+=vec3(.12,.18,.36)*fbm(vec2(u*26.+3.,v*12.))*band*.22;
  for(int k=0;k<2;k++){
    float sc=k==0?150.:300.;
    vec2 g=vec2(u*sc*3.1416,v*sc), id=floor(g), f=fract(g)-.5;   // equal angular size in x and y
    float h=h21(id+float(k)*31.);
    vec2 o=(vec2(h21(id+3.),h21(id+7.))-.5)*.7;
    float s=smoothstep(.13,.0,length(f-o))*step(.94,h);
    c+=mix(vec3(1.,.85,.7),vec3(.72,.82,1.),h21(id+11.))*s*(.2+1.*(h-.94)/.06);
  }
  return c;
}
vec4 disk(vec3 p,vec3 vdir){
  float rr=length(p.xz);
  if(rr<2.2||rr>12.5)return vec4(0.);
  float a=atan(p.z,p.x);
  float ar=a-t*5./pow(rr,1.5);
  vec2 q=vec2(cos(ar),sin(ar))*rr;
  float n=fbm(q*1.1+fbm(q*.6+t*.03)*1.5)*.6+fbm(q*3.4+7.)*.4;   // domain-warped: turbulent gas
  float rings=.78+.22*sin(rr*11.+n*7.);
  float dens=smoothstep(2.2,2.9,rr)*smoothstep(12.5,5.5,rr)*pow(n,1.6)*1.9*rings;
  float temp=smoothstep(11.,2.3,rr);
  vec3 col=mix(vec3(1.,.32,.06),vec3(1.,.78,.5),temp);
  col=mix(col,vec3(.9,.94,1.),pow(temp,5.)*.7);
  vec3 vel=normalize(vec3(-p.z,0.,p.x));
  float dop=dot(vel,-vdir);
  float beam=pow(clamp(1.+.6*dop,.15,2.),3.);
  return vec4(col*dens*beam*(.6+2.4*temp),clamp(dens*1.2,0.,1.));
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
  float sa=r.x/r.y;
  uv-=sa>1.2?vec2(.36,.02):vec2(0.,.12);
  float yaw=t*.015+(m.x-.5)*.5, pitch=.1+(m.y-.5)*.12;
  vec3 ro=vec3(sin(yaw)*cos(pitch),sin(pitch),cos(yaw)*cos(pitch))*27.;
  vec3 fw=normalize(-ro), rt=normalize(cross(vec3(0.,1.,0.),fw)), up=cross(fw,rt);
  float roll=-.12;
  vec3 rt2=rt*cos(roll)+up*sin(roll), up2=up*cos(roll)-rt*sin(roll);
  vec3 rd=normalize(fw*1.7+rt2*uv.x+up2*uv.y);
  vec3 pos=ro, vel=rd;
  vec3 hc=cross(pos,vel); float h2=dot(hc,hc);
  vec3 col=vec3(0.); float alpha=0., glow=0.; bool hole=false;
  for(int i=0;i<260;i++){
    float r2=dot(pos,pos), rl=sqrt(r2);
    float dt=clamp(.07*rl,.02,.9);
    vel+=-1.5*h2*pos/pow(r2,2.5)*dt;
    vec3 np=pos+vel*dt;
    if(pos.y*np.y<0.){
      vec3 cp=mix(pos,np,pos.y/(pos.y-np.y));
      vec4 dc=disk(cp,normalize(vel));
      col+=(1.-alpha)*dc.rgb; alpha+=(1.-alpha)*dc.a;
    }
    glow+=exp(-pow((rl-1.6)*3.,2.))*dt;
    pos=np;
    if(rl<1.){hole=true;break;}
    if(rl>60.||alpha>.995)break;
  }
  if(!hole)col+=(1.-alpha)*sky(normalize(vel));
  col+=vec3(1.,.72,.48)*glow*.06*(1.-alpha*.6);
  col*=1.15;
  col=(col*(2.51*col+.03))/(col*(2.43*col+.59)+.14);   // ACES
  vec2 q=gl_FragCoord.xy/r;
  col*=1.-.25*dot(q-.5,q-.5)*2.;
  col+=(h21(gl_FragCoord.xy+fract(t))-.5)*.012;
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
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

  const SCALE = 0.6; // render scale vs CSS pixels — lower = faster, softer
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
