/* Emberblade — motion background (your image, set alight)
 * Usage: <canvas data-bg></canvas> inside any positioned container, then <script src="bg.js"></script>.
 * Keep scene.webp next to this file. Serve over http(s): browsers block textures from file://.
 * The portrait is shown on its side, as a landscape. Its flames writhe and run along the blade.
 * Move to fan them; click to send a burst of fire.
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
  canvas.style.background = '#070304';
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) { canvas.style.background = `#070304 url(${base}scene.webp) center/cover`; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const vert = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const frag = `#version 300 es
precision highp float;
uniform sampler2D img;
uniform vec2 r;        // canvas px
uniform float t;       // seconds
uniform float spin;    // 1 = portrait as painted, 0 = turned to landscape
uniform vec2 m;        // pointer 0..1 (y up), smoothed
uniform float heat;    // how hard the pointer is fanning (0..1)
uniform vec3 burst;    // last click: xy (0..1, y up), z = seconds since
uniform float LA;      // landscape aspect of the turned image
out vec4 o;

float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s;}
vec2 curl(vec2 p){float e=.07;
  return vec2(vn(p+vec2(0,e))-vn(p-vec2(0,e)),-(vn(p+vec2(e,0))-vn(p-vec2(e,0))))/(2.*e);}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}

// landscape coords (x 0..LA... normalised 0..1, y down) -> the painted portrait's texel
vec3 tex(vec2 L,float lod){ return textureLod(img,vec2(1.-L.y,L.x),lod).rgb; }
bool inside(vec2 L){ return L.x>0.&&L.x<1.&&L.y>0.&&L.y<1.; }
float fireOf(vec3 c){
  float lum=dot(c,vec3(.299,.587,.114));
  /* saturated orange-to-yellow only: warm skin and red hair stay out */
  return smoothstep(.55,.95,c.r)*smoothstep(.22,.62,c.g)*smoothstep(.45,.75,c.r-c.b)*(1.-smoothstep(.45,.8,c.b))*smoothstep(.38,.75,lum);
}
vec3 flameRamp(float v){
  v=clamp(v,0.,1.);
  vec3 c=mix(vec3(.35,.02,0.),vec3(1.,.22,.02),smoothstep(0.,.35,v));
  c=mix(c,vec3(1.,.62,.12),smoothstep(.35,.7,v));
  return mix(c,vec3(1.,.95,.75),smoothstep(.75,1.,v));
}

void main(){
  vec2 uv=gl_FragCoord.xy/r;
  float SA=r.x/r.y;
  vec2 q=(uv-.5)*vec2(SA,1.);
  // camera: a slow breath plus the pointer's pull
  q+=(m-.5)*vec2(-.02,.015)*(1.-spin)+vec2(sin(t*.21),cos(t*.17))*.004;
  // turn: cover the screen in landscape, fit the screen in portrait
  float a=-spin*1.5707963;
  float s0=max(SA/LA,1.)*1.04, s1=min(1./LA,SA)*.92;
  float s=mix(s0,s1,spin);
  vec2 Lc=rot(a)*q/s;
  vec2 L=vec2(Lc.x/LA+.5,.5-Lc.y);

  // where the fire is, from a soft look at the painting
  float fm=inside(L)?fireOf(tex(L,2.5)):0.;
  float fwide=inside(L)?fireOf(tex(L,5.)):0.;

  // fanning: the pointer stirs the flames near it
  vec2 mp=(m-.5)*vec2(SA,1.), dm=q-mp; float near=exp(-dot(dm,dm)*9.);
  // the burst: a ring of heat running out from the click
  vec2 bp=(burst.xy-.5)*vec2(SA,1.); float bd=length(q-bp);
  float ring=exp(-pow((bd-burst.z*1.35)*9.,2.))*exp(-burst.z*1.6);

  // morph: flames writhe along curl noise and stream down the blade (to the right) and up
  float T=t*(1.+heat*1.5);
  vec2 flow=curl(L*vec2(3.2,4.)+vec2(-T*.32,T*.22))*.65+curl(L*8.5-vec2(T*.7,-T*.4))*.35;
  float amp=(.008+.012*near*(.5+heat)+.02*ring)*(1.-spin*.7);
  vec2 D=(flow+vec2(-.35,.25))*amp*fm;
  D+=(q-bp)/max(bd,.001)*ring*.012*vec2(1./LA,-1.);
  // heat shimmer above the fire
  D+=vec2(vn(L*40.+vec2(0.,-t*3.)),vn(L*40.+vec2(9.,-t*3.)))*.0022*fwide;
  vec2 Ld=L+D;

  vec3 c=inside(Ld)?tex(Ld,0.):vec3(.03,.01,.012);
  float f=inside(Ld)?fireOf(c):0.;

  // procedural tongues riding on the painted fire
  vec2 fp=Ld*vec2(6.,8.)+vec2(-T*1.4,T*.9);
  float n=fbm(fp+curl(fp*.5)*.8);
  float tongue=smoothstep(.42,.95,n+fm*.55)*fm;
  c+=flameRamp(n*.75+fm*.3)*tongue*(.22+.3*heat+.45*near);
  // pulse: the whole blaze breathes
  c+=c*f*(.12*sin(t*2.3+n*6.)+.04);
  // bloom from the soft fire
  if(inside(Ld)) c+=tex(Ld,5.)*fwide*.28*(1.+near*.6);

  // a bright pass that runs from the guard to the tip every few seconds
  vec2 H=vec2(.17,.66), Tp=vec2(1.06,.5), bv=Tp-H;
  float bu=clamp(dot(Ld-H,bv)/dot(bv,bv),0.,1.);
  float bl=length((Ld-H-bv*bu)*vec2(LA,1.));
  float sw=fract(t/5.2)*1.6-.3;
  c+=vec3(1.,.8,.5)*exp(-bl*bl*900.)*exp(-pow((bu-sw)*7.,2.))*1.4*(1.-spin);

  // embers: three layers drifting up and to the right, scattered by the pointer and the burst
  vec3 em=vec3(0);
  for(int i=0;i<3;i++){
    float fi=float(i), g=14.+fi*11.;
    vec2 eq=q+dm*near*(.25+heat*.4)/(1.+fi)+(q-bp)/max(bd,.001)*ring*.15;
    vec2 st=eq*g+vec2(-t*(1.2+fi*.7),-t*(2.4+fi*1.3))*(1.+heat);
    vec2 id=floor(st),fr=fract(st)-.5;
    float h=hash(id+fi*13.);
    if(h>.72){
      vec2 off=vec2(hash(id+3.),hash(id+7.))-.5;
      float d=length(fr-off*.7);
      float fl=.6+.4*sin(t*(6.+h*9.)+h*40.);
      em+=flameRamp(.55+h*.45)*smoothstep(.09-fi*.02,0.,d)*fl*(1.4-fi*.3);
    }
  }
  c+=em*(1.-spin*.5);
  // the pointer carries a little warmth, more over the fire
  c+=vec3(1.,.35,.08)*near*(.06+.25*fwide)*(1.+heat);
  c+=vec3(1.,.5,.15)*ring*.35;

  // grade: deep blacks, hot highlights
  c=c/(1.+c*.32);
  c=pow(c,vec3(1.04));
  float vg=smoothstep(1.25,.25,length((uv-.5)*vec2(SA*.75,1.)));
  c*=mix(.55,1.,vg);
  c+=(hash(gl_FragCoord.xy+fract(t*7.)*91.)-.5)*.025;
  o=vec4(c,1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag)); gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const uR = U('r'), uT = U('t'), uSpin = U('spin'), uM = U('m'), uHeat = U('heat'), uBurst = U('burst'), uLA = U('LA');

  let ready = false, LA = 16 / 9;
  canvas.loaded = () => ready ? 1 : 0;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const tx = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    LA = img.naturalHeight / img.naturalWidth;   // the portrait, turned on its side
    ready = true; start = performance.now();
    canvas.dispatchEvent(new CustomEvent('progress', { detail: 1 }));
  };
  img.src = base + 'scene.webp';

  /* pointer: position, how fast it moves (fanning), clicks */
  let mx = .5, my = .5, sx = .5, sy = .5, heat = 0, lastMove = 0, bx = .5, by = .5, bt = 99;
  const host = canvas.parentElement || document.body;
  addEventListener('pointermove', e => {
    const b = canvas.getBoundingClientRect();
    const nx = (e.clientX - b.left) / b.width, ny = 1 - (e.clientY - b.top) / b.height;
    heat = Math.min(1, heat + Math.hypot(nx - mx, ny - my) * 3);
    mx = nx; my = ny; lastMove = performance.now();
  }, { passive: true });
  host.addEventListener('pointerdown', e => {
    if (e.target.closest && e.target.closest('a,button,input,textarea,select,label')) return;
    const b = canvas.getBoundingClientRect();
    bx = (e.clientX - b.left) / b.width; by = 1 - (e.clientY - b.top) / b.height; bt = 0;
  });

  let start = performance.now(), last = performance.now(), visible = true, raf = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(canvas);
  function frame(now) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const dpr = Math.min(1.75, devicePixelRatio || 1), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    if (ready) {
      const el = (now - start) / 1000;
      sx += (mx - sx) * Math.min(1, dt * 5); sy += (my - sy) * Math.min(1, dt * 5);
      heat *= Math.pow(.25, dt); bt += dt;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uR, w, h); gl.uniform1f(uT, still ? 6 : el + 3); gl.uniform1f(uSpin, 0);
      gl.uniform2f(uM, sx, sy); gl.uniform1f(uHeat, heat); gl.uniform3f(uBurst, bx, by, bt); gl.uniform1f(uLA, LA);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (still) return;
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
})();
