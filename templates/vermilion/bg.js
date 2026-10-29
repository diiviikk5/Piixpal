/* Vermilion — a five-room WebGL scroll experience (your images, animated)
 * Usage: <canvas data-bg></canvas> + <script src="bg.js"></script>. Keep c1–c5.jpg and d1–d5.png next to this file.
 * Drive it with window.VERM = { p: 0..4 (room progress), v: scroll velocity }. Without it, it plays the rooms by itself.
 * Rooms: 0 crown · 1 vortex · 2 colonnade · 3 ossuary · 4 court. Each room has its own motion; transitions are shader-made.
 */
(() => {
  const base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]*$/, '');
  let canvas = document.querySelector('canvas[data-bg]');
  if (!canvas) {
    canvas = document.createElement('canvas'); canvas.setAttribute('data-bg', '');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block';
    document.body.prepend(canvas);
  }
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) { canvas.style.background = 'radial-gradient(40% 50% at 50% 40%,#c0261c,#3a0606 70%,#120202)'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });
  const PREVIEW = /[?&]preview/.test(location.search);

  const vert = `#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`;
  const frag = `#version 300 es
precision highp float;
uniform sampler2D c0,c1,c2,c3,c4,d0,d1,d2,d3,d4;
uniform vec2 r,m; uniform float t,P,V;
out vec4 o;
const float IA=1.7778;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec3 tx(int i,vec2 u){ if(i==0)return texture(c0,u).rgb; if(i==1)return texture(c1,u).rgb; if(i==2)return texture(c2,u).rgb; if(i==3)return texture(c3,u).rgb; return texture(c4,u).rgb; }
vec3 txl(int i,vec2 u,float l){ if(i==0)return textureLod(c0,u,l).rgb; if(i==1)return textureLod(c1,u,l).rgb; if(i==2)return textureLod(c2,u,l).rgb; if(i==3)return textureLod(c3,u,l).rgb; return textureLod(c4,u,l).rgb; }
float dp(int i,vec2 u){ if(i==0)return textureLod(d0,u,1.).r; if(i==1)return textureLod(d1,u,1.).r; if(i==2)return textureLod(d2,u,1.).r; if(i==3)return textureLod(d3,u,1.).r; return textureLod(d4,u,1.).r; }
// screen uv → image uv, cover-fit around a focus point, zoom > 1 crops in
vec2 cover(vec2 uv,float z,vec2 fo){
  float sa=r.x/r.y; vec2 s=sa>IA?vec2(1.,IA/sa):vec2(sa/IA,1.); s/=z;
  vec2 c=clamp(fo,s*.5,1.-s*.5); return c+(uv-.5)*s;
}
vec2 par(int i,vec2 iu,vec2 cam,float foc){ vec2 q=iu; for(int k=0;k<4;k++) q=iu-cam*(dp(i,q)-foc); return q; }
vec2 CAM;
float embers(vec2 uv,float speed,float dens,float sc){
  vec2 g=vec2(uv.x*r.x/r.y*sc+sin(uv.y*6.+t*.7)*.3,uv.y*sc-t*speed);
  vec2 id=floor(g),f=fract(g)-.5; float rn=h21(id);
  f+=.3*vec2(sin(t*1.3+rn*40.),cos(t+rn*30.));
  return smoothstep(.09,0.,length(f))*step(1.-dens,rn)*(.5+.5*sin(t*4.+rn*60.));
}
// ---------------- rooms ----------------
vec3 crown(vec2 uv,float f){
  vec2 iu=cover(uv,1.04+.16*f*f,vec2(.5,.58));
  iu=par(0,iu,CAM,.45);
  vec3 c=tx(0,iu);
  // the thorn crown: gold/orange pixels breathe with heat and bloom
  float gold=smoothstep(.12,.35,c.r-c.b)*smoothstep(.3,.65,c.g);
  vec3 bl=txl(0,iu,4.);
  float bgold=smoothstep(.1,.3,bl.r-bl.b)*smoothstep(.25,.5,bl.g);
  float heat=.6+.4*sin(t*1.6+iu.x*7.)*sin(t*.9+iu.y*5.);
  c+=c*gold*.45*heat+vec3(1.,.55,.2)*bgold*.35*heat;
  // the red wall: slow mottled light + flicker
  float wall=smoothstep(.12,.3,c.r-max(c.g,c.b))*(1.-gold);
  c*=1.+wall*(.10*(fbm(iu*4.+vec2(t*.05,0.))-.5)+.03*sin(t*11.)*sin(t*7.3));
  c+=vec3(1.,.55,.18)*embers(uv,.12,.04,26.)*(.6+.6*smoothstep(.3,.9,uv.y));
  return c*(1.-.35*f);
}
vec3 vortex(vec2 uv,float f){
  // endless fall: the tunnel image re-scaled by powers of two, crossfaded, and swirled
  float sa=r.x/r.y;
  vec2 q=(uv-.5)*vec2(sa,1.);
  q+=CAM*.6;
  float T=t*.11+f*1.9;
  vec3 c=vec3(0.); float W=0.;
  for(int k=0;k<3;k++){
    float z=fract(T+float(k)/3.);
    float Z=exp2(z*1.6);
    float w=sin(3.14159*z);
    float a=(T+float(k)/3.-z)*2.2+z*1.4+length(q)*.6*sin(t*.2);
    vec2 rq=mat2(cos(a),-sin(a),sin(a),cos(a))*q/Z;
    vec2 iu=vec2(.5,.52)+rq*vec2(1./IA,1.)*.95;
    c+=txl(1,clamp(iu,.001,.999),.4)*w; W+=w;
  }
  c/=W;
  c=pow(c,vec3(.9))*vec3(1.25,1.,1.);
  c+=vec3(.9,.08,.04)*exp(-length(q)*2.5)*.06*(1.+sin(t*2.));
  return c;
}
vec3 hall(vec2 uv,float f){
  // walking down the colonnade: near pillars slide past faster than far ones (depth), the doorway glows
  vec2 VP=vec2(.53,.505);
  float F=f*.4+.02*sin(t*.3);
  vec2 iu=cover(uv,1.03,vec2(.5,.5));
  iu+=CAM*.4;
  vec2 q=iu;
  for(int k=0;k<4;k++){ float d=dp(2,q); q=VP+(iu-VP)/(1.+F*(.45+.9*d*d)); }
  vec3 c=tx(2,clamp(q,.001,.999));
  float door=exp(-pow(length((q-VP)*vec2(IA,1.))/.035,2.));
  c+=vec3(1.,.15,.08)*door*.5*(.75+.25*sin(t*3.)*sin(t*1.7));
  // dust drifting through the light
  c+=vec3(1.,.3,.25)*embers(uv,.03,.03,40.)*.4*smoothstep(.2,.7,lum(c)*3.);
  return c;
}
vec3 ossuary(vec2 uv,float f){
  vec2 iu=cover(uv,1.12,vec2(.5,.66-.3*f));
  iu=par(3,iu,CAM*1.3+vec2(0.,.01*sin(t*.4)),.5);
  // the crosses sway a hair, pivoting at their base
  float top=smoothstep(.55,.75,iu.y)*smoothstep(.2,.05,lum(txl(3,iu,2.)));
  iu.x+=sin(t*.8+iu.x*3.)*.0025*top*(iu.y-.55)*4.;
  vec3 c=tx(3,iu);
  // a slow light sweep across the bone
  float sw=fract(t*.06+f*.4)*1.6-.3;
  float band=exp(-pow((iu.x+iu.y*.35-sw)/.09,2.));
  c+=c*band*.55*smoothstep(.15,.5,lum(c));
  c*=.92+.08*sin(t*9.)*sin(t*5.7);
  c+=vec3(1.,.4,.3)*embers(uv,.05,.03,30.)*.35;
  return c;
}
vec3 court(vec2 uv,float f){
  vec2 iu=cover(uv,1.05+.12*f,vec2(.5,.55));
  iu=par(4,iu,CAM*1.2,.5);
  vec3 c=tx(4,iu);
  // eyes and wet red catch-lights pulse
  float hot=smoothstep(.35,.6,c.r-c.g)*smoothstep(.45,.8,c.r);
  c+=c*hot*.5*(.5+.5*sin(t*2.2+iu.x*20.));
  // candlelight flicker
  c*=1.+.06*(fbm(vec2(t*6.,1.))-.5)*2.;
  // fog rolling low across the court
  vec2 fp=iu*vec2(3.,6.)+vec2(t*.07,0.);
  float fog=smoothstep(.45,.85,fbm(fp+fbm(fp*1.7-t*.05)))*smoothstep(.6,.1,iu.y);
  c=mix(c,vec3(.55,.06,.08),fog*.45);
  c+=vec3(1.,.25,.2)*embers(uv,.04,.025,34.)*.35;
  return c;
}
vec3 room(int i,vec2 uv,float f){
  if(i==0) return crown(uv,f); if(i==1) return vortex(uv,f); if(i==2) return hall(uv,f); if(i==3) return ossuary(uv,f); return court(uv,f);
}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  CAM=(m-.5)*vec2(.02,.014)+vec2(sin(t*.11),sin(t*.083+1.))*.004;
  float p=clamp(P,0.,4.);
  int a=int(min(floor(p),4.)); float f=p-float(a);
  if(a==4) f=0.;
  vec3 c=room(a,uv,f);
  // transitions: the camera dives into a portal in the room (smoke, the vortex's heart, the far door, a skull's eye)
  // and comes out in the next room. They take the last half of each room's scroll.
  float k=smoothstep(.5,1.,f);
  if(k>0.&&a<4){
    float sa=r.x/r.y;
    vec2 asp=vec2(sa,1.);
    if(a==0){
      // into the smoke: push toward the crown while red smoke rushes past in layers, the vortex forms behind it
      vec2 T=vec2(.5,.62);
      float Zd=1.+5.5*k*k;
      vec3 outc=room(0,T+(uv-T)/Zd,f);
      vec3 inc=room(1,.5+(uv-.5)/(1.+.6*(1.-k)),0.);
      float cross_=smoothstep(.45,.72,k);
      c=mix(outc,inc,cross_);
      float dens=0.;
      for(int l=0;l<3;l++){
        float fl=float(l);
        float z=fract(k*1.6+fl/3.);                         // each smoke layer rushes toward the camera, then is replaced
        float sc=mix(4.,.6,z);
        vec2 sp=(uv-T)*asp*sc+vec2(fl*3.1,t*.05+fl*1.7);
        float n=fbm(sp+fbm(sp*1.6+t*.08)*1.2);
        dens+=smoothstep(.32,.7,n)*sin(3.14159*z);
      }
      float veil=sin(3.14159*k);
      vec3 smoke=mix(vec3(.18,.01,.01),vec3(.95,.22,.12),clamp(dens*.6,0.,1.));
      float hl=smoothstep(.5,1.2,dens);                    // lit billow edges
      smoke+=vec3(1.,.45,.2)*hl*.25;
      c=mix(c,smoke,clamp(dens*veil*1.5+pow(veil,3.)*.55,0.,1.));
    } else if(a==1){
      // into the vortex: an endless dive into the dark heart; the hall is already visible down the hole
      float Zd=exp(k*k*3.4);
      vec3 outc=room(1,.5+(uv-.5)/Zd,f);
      float d=length((uv-.5)*asp);
      float R=.07*Zd*k;
      float e=smoothstep(.15,1.,k);
      vec3 inc=room(2,.5+(uv-.5)*mix(3.2,1.,e),0.);
      float msk=smoothstep(R,R*.7,d);
      c=mix(outc,inc,max(msk,smoothstep(.9,1.,k)));
      c+=vec3(1.,.12,.05)*exp(-abs(d-R)*45.)*.6*(1.-k)*step(.02,R);
    } else if(a==2){
      // through the door: fly down the hall into the glowing doorway; its frame passes the edge of the screen
      vec2 T=vec2(.53,.505);
      float Zd=exp(k*k*3.6);
      vec3 outc=room(2,T+(uv-T)/Zd,f);
      vec2 dq=(uv-T)*asp;
      vec2 hs=vec2(.0115,.021)*Zd;
      vec2 bq=abs(dq)-hs;
      float door=max(bq.x,bq.y);
      float e=smoothstep(.1,1.,k);
      vec2 ctr=mix(T,vec2(.5),e);
      vec3 inc=room(3,.5+(uv-ctr)*mix(2.6,1.,e),0.);
      float red=smoothstep(.12,.3,outc.r-max(outc.g,outc.b)*1.4)*smoothstep(.15,.35,outc.r);
      float near=smoothstep(.003,-.003,max(abs(dq.x)-hs.x*2.2,abs(dq.y)-hs.y*1.6));
      float msk=red*near*smoothstep(.0,.2,k);
      c=mix(outc,inc,max(msk,smoothstep(.9,1.,k)));
      c+=vec3(1.,.25,.12)*near*(1.-red)*0.;
      c=mix(c,vec3(1.,.35,.2),exp(-abs(door)*20.)*.12*k*(1.-k)*4.);   // warm spill from the door as you pass it
    } else {
      // into the eye: dive into the left socket of the centre skull; its darkness swallows the frame, the court rises from it
      vec2 eye=vec2(.508,.365);
      vec2 s2=sa>IA?vec2(1.,IA/sa):vec2(sa/IA,1.); s2/=1.12;
      vec2 fo=vec2(.5,.66-.3*f); vec2 cc=clamp(fo,s2*.5,1.-s2*.5);
      vec2 T=(eye-cc)/s2+.5;
      float Zd=exp(k*k*4.6);
      vec3 outc=room(3,T+(uv-T)/Zd,f);
      float d=length((uv-T)*asp);
      float R=.03*Zd;
      float dark=smoothstep(.16,.05,lum(outc));
      float msk=dark*smoothstep(R,R*.55,d);
      msk=max(msk,smoothstep(.8,.97,k));
      float e=smoothstep(.35,1.,k);
      vec2 ctr=mix(T,vec2(.5),e);
      vec3 inc=room(4,.5+(uv-ctr)*mix(2.,1.,e),0.)*smoothstep(.3,.95,k);
      c=mix(outc,inc,msk);
    }
  }
  // scroll speed pulls a little chroma + streak
  c*=1.-.1*min(abs(V),1.)*smoothstep(.3,.8,abs(uv.x-.5));
  // vignette + grain
  c*=1.-.45*pow(length((uv-.5)*vec2(1.05,1.15)),2.3);
  c+=(h21(gl_FragCoord.xy+fract(t*7.)*91.)-.5)*.035;
  o=vec4(max(c,0.),1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.bindAttribLocation(prog, 0, 'p'); gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  let loaded = 0; const TOTAL = 10;
  const tex = (unit, url) => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([60, 4, 4, 255]));
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => {
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);   // image rows top-down → uv y-up
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
      loaded++; canvas.dispatchEvent(new CustomEvent('progress', { detail: loaded / TOTAL }));
    };
    im.src = base + url;
  };
  for (let i = 0; i < 5; i++) {
    tex(i, `c${i + 1}${PREVIEW ? '_s' : ''}.jpg`); tex(5 + i, `d${i + 1}.png`);
    gl.uniform1i(U('c' + i), i); gl.uniform1i(U('d' + i), 5 + i);
  }
  canvas.loaded = () => loaded / TOTAL;
  const ur = U('r'), ut = U('t'), um = U('m'), uP = U('P'), uV = U('V');
  const resize = () => { const d = Math.min(devicePixelRatio || 1, 1.5) * (PREVIEW ? .5 : 1); canvas.width = canvas.clientWidth * d; canvas.height = canvas.clientHeight * d; gl.viewport(0, 0, canvas.width, canvas.height); };
  new ResizeObserver(resize).observe(canvas); resize();
  let mx = .5, my = .5, tx = .5, ty = .5;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth; ty = 1 - e.clientY / innerHeight; });
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  // no driver → play the rooms by itself: dwell in each room, then let the shader transition run
  const autoP = s => { const per = 10, i = Math.floor(s / per) % 5; return i + (s % per) / per; };   // 10 s per room, transition in its last 2.8 s
  const frame = now => {
    requestAnimationFrame(frame);
    const s = canvas.time != null ? canvas.time : still ? 20 : (now - t0) / 1000;
    mx += (tx - mx) * .05; my += (ty - my) * .05;
    const V = window.VERM || null;
    gl.uniform2f(ur, canvas.width, canvas.height); gl.uniform1f(ut, s); gl.uniform2f(um, mx, my);
    gl.uniform1f(uP, V ? V.p : (canvas.dataset.room != null ? +canvas.dataset.room : autoP(s)));
    gl.uniform1f(uV, V ? V.v : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  requestAnimationFrame(frame);
})();
