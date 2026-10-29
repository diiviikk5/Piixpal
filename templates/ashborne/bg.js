/* Ember — a four-room WebGL scroll experience (the eye video + your images, animated)
 * Usage: <canvas data-bg></canvas> + <script src="bg.js"></script>. Keep eye.mp4, c2–c4.jpg and d2–d4.png next to this file.
 * Drive it with window.EMBER = { p: 0..3 (room progress) }. Without it, it plays the rooms by itself.
 * Rooms: 0 the watcher (eye video) · 1 the walker (fire) · 2 the burning sky (clouds) · 3 the last one.
 * Transitions dive into the scene: through the pupil, up through a wall of fire, into the sun.
 */
(() => {
  const base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]*$/, '');
  let canvas = document.querySelector('canvas[data-bg]');
  if (!canvas) { canvas = document.createElement('canvas'); canvas.setAttribute('data-bg', ''); canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block'; document.body.prepend(canvas); }
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) { canvas.style.background = 'radial-gradient(20% 30% at 50% 50%,#ffb02e,#8a1a05 40%,#100302 70%)'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });
  const PREVIEW = /[?&]preview/.test(location.search);
  const vert = `#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`;
  const frag = `#version 300 es
precision highp float;
uniform sampler2D v0,c1,c2,c3,d1,d2,d3;
uniform vec2 r,m,PU; uniform float t,P; uniform vec3 ia;
out vec4 o;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec2 curl(vec2 p){float e=.05;return vec2(vn(p+vec2(0,e))-vn(p-vec2(0,e)),-(vn(p+vec2(e,0))-vn(p-vec2(e,0))))/(2.*e);}
float SA; vec2 CAM;
vec2 cover(vec2 uv,float z,vec2 fo,float IA){
  vec2 s=SA>IA?vec2(1.,IA/SA):vec2(SA/IA,1.); s/=z;
  vec2 c=clamp(fo,s*.5,1.-s*.5); return c+(uv-.5)*s;
}
// fire palette for procedural flame (0..1.5)
vec3 fireC(float h){ h=clamp(h,0.,1.6);
  vec3 c=mix(vec3(0.),vec3(.55,.05,.02),smoothstep(.05,.35,h)); c=mix(c,vec3(1.,.35,.05),smoothstep(.3,.7,h));
  c=mix(c,vec3(1.,.75,.3),smoothstep(.65,1.,h)); return mix(c,vec3(1.,.97,.85),smoothstep(.95,1.4,h)); }
float embers(vec2 uv,float speed,float dens,float sc){
  vec2 g=vec2(uv.x*SA*sc+sin(uv.y*5.+t*.8)*.4,uv.y*sc-t*speed);
  vec2 id=floor(g),f=fract(g)-.5; float rn=h21(id);
  f+=.3*vec2(sin(t*1.3+rn*40.),cos(t+rn*30.));
  return smoothstep(.1,0.,length(f*vec2(1.,.6)))*step(1.-dens,rn)*(.5+.5*sin(t*5.+rn*60.));
}
// ---------- room 0: the watcher — the eye video, square, on black ----------
#define PUPIL PU   // the slit's position in the current video frame (tracked offline → pupil.json)
vec3 eye(vec2 uv,float zoom,vec2 tgt){
  // fit the square video to the screen height, centred on the pupil
  vec2 q=(uv-.5)*vec2(SA,1.)/zoom;
  vec2 vu=tgt+q*.92+CAM*.4;
  vec3 c=vec3(0.);
  if(vu.x>0.&&vu.x<1.&&vu.y>0.&&vu.y<1.) c=texture(v0,vu).rgb;
  float edge=smoothstep(0.,.12,vu.x)*smoothstep(1.,.88,vu.x)*smoothstep(0.,.12,vu.y)*smoothstep(1.,.88,vu.y);
  c*=edge;
  // heat haze ring and drifting embers around it
  c+=vec3(1.,.35,.08)*embers(uv,.06,.03,22.)*.7;
  return c;
}
// ---------- room 1: the walker — portrait flame image placed right, flames flowing up ----------
vec3 walker(vec2 uv,float f){
  // the portrait, enlarged 1.4x and right-aligned so the figure is big; its black left side melts into the void
  float Zw=1.4+.06*f;
  float W=ia.x*Zw;                                // image width in screen-height units
  float x0=SA>W*1.25?SA-W:SA*.5-W*.55;
  vec2 iu=vec2((uv.x*SA-x0)/W,.42+(uv.y-.5)/Zw)+CAM*.6;
  vec2 su=clamp(iu,.001,.999);
  vec3 bl=textureLod(c1,su,3.).rgb;
  float flame=smoothstep(.32,.55,lum(bl))*(1.-smoothstep(.6,.85,textureLod(d1,su,2.).r)*.6);
  // flames rise: two-phase advection, only where it burns
  float T=t/2.6; float p1=fract(T), p2=fract(T+.5), w=abs(p1-.5)*2.;
  vec2 dir=vec2(.01,-.075)+curl(su*6.+t*.1)*.004;
  vec2 a1=su+dir*(p1-.5)*flame, a2=su+dir*(p2-.5)*flame;
  vec3 c=mix(texture(c1,a1).rgb,texture(c1,a2).rgb,w);
  // the spear tip and the ground line pulse
  c*=1.+.12*flame*sin(t*3.+su.y*20.);
  float gline=smoothstep(.14,.1,su.y)*smoothstep(.04,.08,su.y);
  c+=vec3(1.,.4,.1)*gline*.12*(.5+.5*sin(t*2.+su.x*30.));
  // fade the image's left/bottom edges into the void, keep the right continuing
  float fade=smoothstep(-.02,.15,iu.x)*smoothstep(1.02,.97,iu.x)*smoothstep(-.02,.04,iu.y);
  c*=fade;
  c+=vec3(1.,.55,.15)*embers(uv,.25,.05,26.)*(.5+.5*smoothstep(.2,.8,uv.x));
  return c;
}
// ---------- room 2: the burning sky — cloud sea that boils, sun breathing, rays ----------
const vec2 SUN=vec2(.135,.8);
vec3 sky(vec2 uv,float f){
  vec2 iu=cover(uv,1.08,vec2(.45+.1*sin(t*.05),.5),ia.y);
  // parallax: near puffs slide more
  vec2 cam=CAM*1.6+vec2(sin(t*.09)*.012,0.);
  vec2 q=iu; for(int k=0;k<4;k++) q=iu-cam*(textureLod(d2,q,1.).r-.4);
  float dep=textureLod(d2,q,1.).r;
  // boil: each lump breathes along a slow curl field, near lumps move more
  vec2 b=curl(q*vec2(5.,10.)+vec2(t*.05,t*.03))*.004*(.4+dep);
  b+=(q-vec2(.5,.3))*.006*sin(t*.4+dep*6.)*dep;   // swelling
  vec3 c=texture(c2,q+b).rgb;
  // sun: breathing core + rotating rays occluded by bright cloud tops
  vec2 sd=(iu-SUN)*vec2(ia.y,1.);
  float rs=length(sd), an=atan(sd.y,sd.x);
  float rays=pow(.5+.5*sin(an*14.+t*.1),4.)*.6+pow(.5+.5*sin(an*5.-t*.07),5.)*.4;
  c+=vec3(1.,.7,.35)*rays*exp(-rs*4.)*.35*(1.-dep*.6);
  c+=vec3(1.,.85,.6)*exp(-rs*rs*60.)*(.25+.1*sin(t*.8));
  c+=vec3(1.,.5,.15)*embers(uv,.05,.025,30.)*.5;
  return c;
}
// ---------- room 3: the last one — the wanderer before the blaze ----------
vec3 wanderer(vec2 uv,float f){
  vec2 iu=cover(uv,1.06+.06*f,vec2(.5,.55),ia.z);
  vec2 q=iu; for(int k=0;k<4;k++) q=iu-CAM*1.2*(textureLod(d3,q,1.).r-.5);
  vec3 b0=textureLod(c3,q,1.).rgb;
  float bright=smoothstep(.45,.8,lum(b0));
  // the blaze behind billows; the figure (dark) stays planted
  vec2 bw=curl(q*vec2(4.,6.)+vec2(0.,-t*.12))*.006*bright;
  // hair streams in the wind
  float hair=exp(-pow(length((q-vec2(.465,.78))*vec2(ia.z,1.))/.05,2.));
  bw+=vec2(sin(t*4.+q.y*80.)*.003,sin(t*3.+q.x*60.)*.0015)*hair;
  vec3 c=texture(c3,q+bw).rgb;
  c*=1.+.08*bright*sin(t*1.7)*sin(t*2.9+1.);
  // ash and embers blowing across, birds circling
  vec2 g=vec2(uv.x*SA*28.+t*1.6,uv.y*28.+t*.4+sin(uv.x*6.+t)*.5);
  vec2 id=floor(g),fr=fract(g)-.5; float rn=h21(id);
  float ash=smoothstep(.12,0.,length(fr*vec2(.6,1.3)))*step(.94,rn);
  c=mix(c,vec3(.12,.04,.03),ash*.7*step(.5,h21(id+3.)));
  c+=vec3(1.,.6,.25)*ash*step(h21(id+3.),.5)*.8;
  float fl=0.;
  for(int i=0;i<6;i++){
    float k=float(i);
    float an=t*(.25+.08*h21(vec2(k,1.)))+k*1.05;
    vec2 bp=vec2(.5,.62)+vec2(cos(an)*.32,sin(an*1.3)*.12);
    vec2 d=(iu-bp)*vec2(ia.z,1.)/(.012+.005*h21(vec2(k,4.)));
    d.x=abs(d.x); float flap=sin(t*9.+k*2.)*.6;
    float y=d.x*(.35+flap)-d.x*d.x*(.6+flap*.8);
    fl=max(fl,max(smoothstep(.12,0.,abs(d.y-y))*step(d.x,1.),smoothstep(.2,0.,length(d*vec2(1.,1.6)))));
  }
  c=mix(c,vec3(.15,.04,.03),fl*.85);
  c*=1.-.68*smoothstep(.52,.05,uv.y);               // ground falls into shadow under the title
  return c;
}
vec3 room(int i,vec2 uv,float f){ if(i==0) return eye(uv,1.,PUPIL); if(i==1) return walker(uv,f); if(i==2) return sky(uv,f); return wanderer(uv,f); }
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  SA=r.x/r.y;
  CAM=(m-.5)*vec2(.02,.014)+vec2(sin(t*.11),sin(t*.083+1.))*.004;
  float p=clamp(P,0.,3.);
  int a=int(min(floor(p),3.)); float f=p-float(a); if(a==3) f=0.;
  float k=smoothstep(.5,1.,f);
  vec3 c;
  if(a==0){
    // dive into the slit pupil: the eye grows around you while the slit itself widens into a portal onto the fire
    float Z=exp(k*k*5.);
    c=eye(uv,Z,PUPIL);
    vec2 q=(uv-.5)*vec2(SA,1.)/Z*.92;              // position in video uv relative to the pupil
    q=mat2(cos(.22),-sin(.22),sin(.22),cos(.22))*q;   // the slit leans a little
    float hh=.085, ww=.016*(1.+9.*k*k);             // the slit: a vertical vesica that dilates
    float yy=q.y/hh;
    float half_=ww*max(0.,1.-yy*yy);
    float dpo=abs(q.x)-half_;                       // <0 inside the slit
    float msk=smoothstep(.002/Z,-.002/Z,dpo)*step(abs(yy),1.)*smoothstep(.02,.15,k);
    msk=max(msk,smoothstep(.88,.99,k));
    float e=smoothstep(.2,1.,k);
    vec3 nx=walker(.5+(uv-.5)*mix(2.2,1.,e)+vec2(.27*(1.-e),.04*(1.-e)),0.);   // the figure starts centred in the slit
    c=mix(c,nx,msk);
    c+=vec3(1.,.55,.1)*exp(-abs(dpo)*Z*90.)*step(abs(yy),1.)*.9*smoothstep(.02,.2,k)*(1.-smoothstep(.85,1.,k));
  } else if(a==1){
    // rise through a wall of fire: the walker sinks away, flames thicken to fill everything, the sky opens above
    vec3 w=walker(uv-vec2(0.,k*k*.5),f);
    vec3 s=sky(uv+vec2(0.,(1.-k)*.35),0.);
    vec2 fp=vec2(uv.x*SA*5.5,uv.y*1.3-t*1.6);                 // stretched tall: tongues, not puffs
    float n=fbm(fp+vec2(fbm(fp*1.4+t*.3)*1.5,0.));
    float front=sin(3.14159*k);
    float rise=k*1.9-.35;                          // the fire front climbs from the bottom and passes the top
    float body=smoothstep(rise+.25,rise-.15,uv.y-n*.35);
    float heat=(n*.9+.35)*body*front*1.6;
    c=mix(w,s,smoothstep(.45,.75,k));
    float lick=fbm(fp*2.1-vec2(0.,t*1.1));
    float flm=smoothstep(.38,.72,n+lick*.35);
    vec3 fc=mix(vec3(.12,.02,.01),fireC(.45+lick*.75),flm);   // dark smoke between bright tongues
    c=mix(c,fc,clamp(body*front*1.5,0.,1.));
  } else if(a==2){
    // fly into the sun: zoom to it, bloom to white, the last one stands in the afterglow
    vec2 s0=SA>ia.y?vec2(1.,ia.y/SA):vec2(SA/ia.y,1.); s0/=1.08;
    vec2 cc=clamp(vec2(.45+.1*sin(t*.05),.5),s0*.5,1.-s0*.5);
    vec2 T=(SUN-cc)/s0+.5;
    float Z=exp(k*k*3.);
    c=sky(T+(uv-T)/Z,f);
    float white=smoothstep(.35,.7,k)*(1.-smoothstep(.75,1.,k));
    vec3 nx=wanderer(uv,0.);
    c=mix(c,nx,smoothstep(.6,.9,k));
    c=mix(c,vec3(1.,.93,.8),white*.95);
  } else c=wanderer(uv,f);
  c*=1.-.4*pow(length((uv-.5)*vec2(1.05,1.15)),2.4);
  c+=(h21(gl_FragCoord.xy+fract(t*7.)*91.)-.5)*.03;
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
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  const IA = [1, 1, 1]; let loaded = 0; const TOTAL = 7;
  const setup = (unit, mip) => { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); if (aniso && mip) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8); };
  const blank = unit => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([8, 2, 1, 255])); setup(unit, false); return t; };
  const tex = (unit, url, slot) => {
    const t = blank(unit); const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.generateMipmap(gl.TEXTURE_2D); setup(unit, true);
      if (slot != null) IA[slot] = im.width / im.height; loaded++; canvas.dispatchEvent(new CustomEvent('progress', { detail: loaded / TOTAL })); };
    im.src = base + url;
  };
  // the eye: a looping video, re-uploaded every frame
  const vt = blank(0);
  const vid = document.createElement('video'); vid.src = base + 'eye.mp4'; vid.muted = true; vid.loop = true; vid.playsInline = true; vid.crossOrigin = 'anonymous'; vid.preload = 'auto';
  vid.addEventListener('loadeddata', () => { loaded++; }, { once: true });
  vid.play().catch(() => addEventListener('pointerdown', () => vid.play(), { once: true }));
  for (let i = 0; i < 3; i++) { tex(1 + i, `c${i + 2}${PREVIEW ? '_s' : ''}.jpg`, i); tex(4 + i, `d${i + 2}.png`); }
  ['v0', 'c1', 'c2', 'c3', 'd1', 'd2', 'd3'].forEach((n, i) => gl.uniform1i(U(n), i));
  canvas.loaded = () => loaded / TOTAL;
  const ur = U('r'), ut = U('t'), um = U('m'), uP = U('P'), uia = U('ia'), uPU = U('PU');
  let PUP = null; fetch(base + 'pupil.json').then(r => r.json()).then(j => PUP = j).catch(() => {});
  const resize = () => { const d = Math.min(devicePixelRatio || 1, 1.5) * (PREVIEW ? .5 : 1); canvas.width = canvas.clientWidth * d; canvas.height = canvas.clientHeight * d; gl.viewport(0, 0, canvas.width, canvas.height); };
  new ResizeObserver(resize).observe(canvas); resize();
  let mx = .5, my = .5, tx = .5, ty = .5;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth; ty = 1 - e.clientY / innerHeight; });
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  const autoP = s => { const per = 10, i = Math.floor(s / per) % 4; return i + (s % per) / per; };
  const frame = now => {
    requestAnimationFrame(frame);
    const s = canvas.time != null ? canvas.time : still ? 20 : (now - t0) / 1000;
    mx += (tx - mx) * .05; my += (ty - my) * .05;
    if (vid.readyState >= 2) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vt); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid); }
    gl.uniform2f(ur, canvas.width, canvas.height); gl.uniform1f(ut, s); gl.uniform2f(um, mx, my);
    if (PUP) { const f = (vid.currentTime || 0) * 30, i = Math.floor(f) % PUP.length, j = (i + 1) % PUP.length, w = f % 1;
      gl.uniform2f(uPU, PUP[i][0] * (1 - w) + PUP[j][0] * w, PUP[i][1] * (1 - w) + PUP[j][1] * w); } else gl.uniform2f(uPU, .55, .49);
    // ia: image aspect for the walker (portrait), the clouds, the wanderer
    gl.uniform3f(uia, IA[0], IA[1], IA[2]);
    gl.uniform1f(uP, window.EMBER ? window.EMBER.p : (canvas.dataset.room != null ? +canvas.dataset.room : autoP(s)));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  requestAnimationFrame(frame);
})();
