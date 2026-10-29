/* Afterglow — motion background (a lighter's flame, through the fire, out of a pixel sun)
 * Usage: <canvas data-bg></canvas> inside any positioned container, then <script src="bg.js"></script>.
 * Keep lighter.webp + sunset.webp next to this file. Serve over http(s).
 * Drive it with window.AFTER = { p: 0..1 } (the hero maps scroll to it). Without that it plays
 * the whole journey by itself, on a loop.
 */
(() => {
  const base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]*$/, '');
  let canvas = document.querySelector('canvas[data-bg]');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.setAttribute('data-bg', '');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block';
    document.body.prepend(canvas);
  }
  canvas.style.background = `#0d1518 url(${base}lighter.webp) center/cover`;
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) return;
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const vert = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const frag = `#version 300 es
precision highp float;
uniform sampler2D A;   // the lighter
uniform sampler2D B;   // the sunset
uniform vec2 r; uniform float t; uniform float P; uniform vec2 m;
uniform float AA; uniform float BA;   // image aspects (w/h)
uniform vec2 BS;                      // sunset size in texels
out vec4 o;
const vec2 F=vec2(.727,.372);   // the flame, in the lighter (y down)
const vec2 S=vec2(.499,.417);   // the sun, in the sunset
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.02+vec2(11.7,3.1);a*=.5;}return s;}
vec3 ramp(float v){v=clamp(v,0.,1.);
  vec3 c=mix(vec3(.25,.03,0.),vec3(1.,.3,.03),smoothstep(0.,.4,v));
  c=mix(c,vec3(1.,.72,.25),smoothstep(.4,.75,v));return mix(c,vec3(1.,.97,.86),smoothstep(.78,1.,v));}
// screen uv -> image uv (y down), covering the screen, zoomed around c
vec2 fit(vec2 uv,float ia,vec2 c,float z){
  float sa=r.x/r.y; vec2 sz=sa>ia?vec2(1.,ia/sa):vec2(sa/ia,1.);
  vec2 cc=clamp(c,sz*.5/z,1.-sz*.5/z);
  return cc+vec2(uv.x-.5,.5-uv.y)*sz/z;
}
float eIn(float x){return x*x*x;} float eOut(float x){return 1.-pow(1.-x,3.);}

vec3 lighter(vec2 uv,float pa){
  float z=exp(log(90.)*pow(pa,2.15));
  vec2 c=mix(vec2(.56,F.y+.1),F,smoothstep(0.,.35,pa));
  vec2 iu=fit(uv,AA,c,z);
  // the flame lives: it licks upward and sways
  vec2 d=(iu-F)*vec2(AA,1.);
  float fm=exp(-dot(d,d)*900.);
  float lick=fbm(vec2(iu.x*60.,iu.y*40.+t*5.));
  iu+=vec2((lick-.5)*.006+sin(t*7.+iu.y*120.)*.0012,-.004*lick)*fm*smoothstep(.02,.0,length(d*vec2(1.,.6))-.012);
  vec3 col=texture(A,iu).rgb;
  float glow=exp(-dot(d,d)*300.);
  col+=vec3(1.,.62,.25)*glow*(.18+.08*sin(t*11.)+.06*sin(t*17.3));
  // a few sparks climbing out of it
  for(int i=0;i<5;i++){
    float fi=float(i),ph=fract(t*.45+fi*.21);
    vec2 sp=F+vec2((hash(vec2(fi,floor(t*.45+fi*.21)))-.5)*.03+sin(ph*9.+fi)*.006,-ph*.16);
    vec2 sd=(iu-sp)*vec2(AA,1.);
    col+=vec3(1.,.75,.35)*smoothstep(.0035,0.,length(sd))*(1.-ph)*1.5;
  }
  // deep inside: the flame becomes the whole world
  float inside=smoothstep(.22,.66,pa);
  vec2 q=(uv-.5)*vec2(r.x/r.y,1.);
  float n=fbm(vec2(q.x*3.,q.y*2.2-t*1.8)+fbm(q*2.+t*.4)*1.3);
  vec3 fire=ramp(pow(n,1.9)*1.7+inside*.18+(.5-abs(q.x))*.22-.14);
  col=mix(col,fire,inside);
  return mix(col,vec3(1.,.97,.88),smoothstep(.86,1.,pa));
}

vec3 sunset(vec2 uv,float pc){
  float z=exp(log(70.)*(1.-eOut(pc)));
  float leaves=smoothstep(5.,1.8,z);
  vec2 c=mix(S,vec2(.5),smoothstep(.25,1.,pc));
  c+=(m-.5)*vec2(.012,-.008)*pc;
  vec2 iu=fit(uv,BA,c,z);
  // water: ripples and a shimmering reflection
  float w=smoothstep(.655,.68,iu.y);
  iu.x+=sin(iu.y*260.-t*2.2)*.0011*w+sin(iu.y*90.+t*1.3)*.0008*w;
  // coming out of the sun the world is all big pixels; they resolve as we pull back
  float px=smoothstep(1.3,5.,z);
  vec2 q=(floor(iu*BS)+.5)/BS;
  vec3 col=mix(texture(B,iu).rgb,texture(B,q).rgb,px);
  // lanterns breathe
  float lum=dot(col,vec3(.299,.587,.114));
  float lan=smoothstep(.55,.85,col.r)*(1.-smoothstep(.25,.5,col.g))*smoothstep(.3,.6,lum);
  col*=1.+lan*.35*sin(t*5.+hash(floor(iu*BS/6.))*40.);
  col+=vec3(1.,.55,.3)*w*.08*smoothstep(.6,1.,vn(vec2(iu.x*80.,iu.y*400.-t*2.)));
  // the sun glows
  vec2 sd=(iu-S)*vec2(BA,1.);
  col+=vec3(1.,.78,.5)*exp(-dot(sd,sd)*18.)*(.22+.05*sin(t*1.7));
  // red leaves, falling through the scene
  for(int i=0;i<3;i++){
    float fi=float(i),g=26.+fi*14.;
    vec2 lp=iu*vec2(g*BA,g);
    lp+=vec2(-t*(1.1+fi*.5)+sin(t*.9+lp.y*.3)*.6,-t*(1.6+fi*.6));
    vec2 id=floor(lp),fr=fract(lp);
    float h=hash(id+fi*7.);
    if(h>.935&&leaves>0.){
      vec2 ce=vec2(hash(id+2.),hash(id+5.))*.6+.2;
      vec2 dd=abs(fr-ce);
      float sz=.035+.035*h;
      if(max(dd.x,dd.y*1.4)<sz) col=mix(col,mix(vec3(.75,.06,.12),vec3(1.,.25,.2),h),.92*leaves);
    }
  }
  return col;
}

void main(){
  vec2 uv=gl_FragCoord.xy/r;
  float p=clamp(P,0.,1.);
  vec3 col;
  if(p<.5){ col=lighter(uv,clamp(p/.5,0.,1.)); }
  else{
    float pc=clamp((p-.5)/.5,0.,1.);
    col=sunset(uv,pc);
    col=mix(vec3(1.,.97,.88),col,smoothstep(0.,.14,pc));   // out of the white-hot
  }
  float SA=r.x/r.y;
  col*=mix(.62,1.,smoothstep(1.2,.3,length((uv-.5)*vec2(SA*.8,1.))));
  col+=(hash(gl_FragCoord.xy+fract(t*7.)*91.)-.5)*.03;
  o=vec4(col,1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag)); gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const uR = U('r'), uT = U('t'), uP = U('P'), uM = U('m'), uAA = U('AA'), uBA = U('BA'), uBS = U('BS');
  gl.uniform1i(U('A'), 0); gl.uniform1i(U('B'), 1);

  let loaded = 0, AA = .56, BA = 1.78, BW = 1199, BH = 672;
  canvas.loaded = () => loaded / 2;
  const load = (file, unit, done) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      const tx = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      done(img); loaded++;
      canvas.dispatchEvent(new CustomEvent('progress', { detail: loaded / 2 }));
    };
    img.src = base + file;
  };
  load('lighter.webp', 0, i => { AA = i.naturalWidth / i.naturalHeight; });
  load('sunset.webp', 1, i => { BA = i.naturalWidth / i.naturalHeight; BW = i.naturalWidth; BH = i.naturalHeight; });

  let mx = .5, my = .5, sx = .5, sy = .5;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth; my = 1 - e.clientY / innerHeight; }, { passive: true });
  /* with nobody driving: a 16 s journey, a pause on the sunset, again */
  const auto = s => Math.min(1, (s % 19) / 16);
  const t0 = performance.now();
  let last = t0, visible = true, raf = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(canvas);
  function frame(now) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const dpr = Math.min(1.75, devicePixelRatio || 1), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    if (loaded === 2) {
      const s = (now - t0) / 1000, V = window.AFTER;
      sx += (mx - sx) * Math.min(1, dt * 4); sy += (my - sy) * Math.min(1, dt * 4);
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uR, w, h); gl.uniform1f(uT, still ? 3 : s);
      gl.uniform1f(uP, V ? V.p : (canvas.dataset.p != null ? +canvas.dataset.p : auto(s)));
      gl.uniform2f(uM, sx, sy); gl.uniform1f(uAA, AA); gl.uniform1f(uBA, BA); gl.uniform2f(uBS, BW, BH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
})();
