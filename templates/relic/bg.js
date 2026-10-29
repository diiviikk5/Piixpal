/* Relic — an engraved skull that builds itself from shards (motion background)
 * Usage: <canvas data-bg></canvas> + <script src="bg.js"></script>; keep skull.png next to this file.
 * Drive it with window.RELIC = { a: 0..1 } (0 = scattered, 1 = assembled). Without it, it loops: assemble · hold · scatter.
 * Everything is drawn as white line-engraving on black: hatching that thickens in shadow, contour lines, bark, leaves.
 */
(() => {
  const base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]*$/, '');
  let canvas = document.querySelector('canvas[data-bg]');
  if (!canvas) { canvas = document.createElement('canvas'); canvas.setAttribute('data-bg', ''); canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block'; document.body.prepend(canvas); }
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) { canvas.style.background = 'radial-gradient(30% 40% at 62% 50%,#3a3a3a,#000 70%)'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });
  const PREVIEW = /[?&]preview/.test(location.search);
  const vert = `#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`;
  const frag = `#version 300 es
precision highp float;
uniform sampler2D sk; uniform vec2 r,m,C; uniform float t,A,S;
out vec4 o;
float h11(float p){return fract(sin(p*127.1)*43758.5453);}
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float px;
const vec3 BONE=vec3(.93,.91,.86);
// line engraving of a luminance value: white lines, wider where brighter; crosshatch in the mids
float engrave(vec2 q,float L,float freq,float ang){
  vec2 d=vec2(cos(ang),sin(ang));
  float s=dot(q,d)*freq+L*2.2;
  float tri=abs(fract(s)-.5)*2.;
  float w=clamp(L*1.05,0.,1.);
  float aa=fwidth(s)*1.5;
  float l1=smoothstep(1.-w-aa,1.-w+aa,tri);
  vec2 d2=vec2(cos(ang+1.1),sin(ang+1.1));
  float s2=dot(q,d2)*freq*1.3;
  float tri2=abs(fract(s2)-.5)*2.;
  float w2=clamp((L-.35)*1.4,0.,1.)*.6;
  float l2=smoothstep(1.-w2-aa,1.-w2+aa,tri2);
  return max(l1,l2*.8);
}
// --- the skull, as shards ---------------------------------------------------------------
const float N=6.;
vec4 skull(vec2 p,float a){
  float Hs=.66;                                            // skull height in screen-height units
  vec3 col=vec3(0.); float cov=0.;
  for(int i=0;i<36;i++){
    float fi=float(i);
    vec2 cell=vec2(mod(fi,N),floor(fi/N));
    float delay=.05+.4*h11(fi*3.1+1.)+.1*length(cell-2.5)/3.5;
    float e=clamp((a-delay)/.32,0.,1.); e=1.-pow(1.-e,3.);
    float u=1.-e;
    // each shard flies in from its own direction, spinning, and settles
    vec2 dir=normalize(vec2(h11(fi+7.)-.5,h11(fi+13.)-.5)+(cell-2.5)*.15);
    vec2 off=dir*u*(.9+.8*h11(fi+5.))+vec2(0.,u*u*.3);
    float ang=u*(h11(fi+9.)-.5)*5.;
    vec2 ctr=C+(vec2((cell.x+.5)/N-.5,(cell.y+.5)/N-.5))*vec2(Hs*.975,Hs);
    vec2 q=rot(-ang)*(p-ctr-off)+ctr;
    vec2 su=(q-C)/vec2(Hs*.975,Hs)+.5;
    if(su.x<0.||su.x>1.||su.y<0.||su.y>1.) continue;
    // jagged shard borders: the grid is warped by noise in rest space, so neighbours agree
    vec2 g=su*N+(vec2(vn(su*7.),vn(su*7.+9.))-.5)*.8;
    if(floor(g)!=cell) continue;
    vec4 tx=texture(sk,vec2(su.x,1.-su.y));
    float msk=tx.g; if(msk<.02) continue;
    float L=tx.r;
    float ln=engrave(su*vec2(.975,1.),L,95.,.65+.2*vn(su*3.));
    // bold contour where the form turns
    vec2 e2=vec2(.004,0.);
    float gx=texture(sk,vec2(su.x+e2.x,1.-su.y)).r-texture(sk,vec2(su.x-e2.x,1.-su.y)).r;
    float gy=texture(sk,vec2(su.x,1.-su.y-e2.x)).r-texture(sk,vec2(su.x,1.-su.y+e2.x)).r;
    float edge=smoothstep(.12,.35,length(vec2(gx,gy)));
    float v=max(ln,edge*.85)*msk;
    // freshly arriving shards glow a little
    vec3 c=BONE*v*(1.+.6*u);
    col=mix(col,c,step(.5,msk));
    cov=max(cov,step(.5,msk));
  }
  return vec4(col,cov);
}
// --- a branch: an engraved cylinder with bark ---------------------------------------------
float branch(vec2 p,vec2 a,vec2 b,float rr,float seed,out float inside){
  vec2 pa=p-a,ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);
  vec2 n=normalize(vec2(-ba.y,ba.x));
  float wob=(vn(vec2(h*9.+seed,seed))-.5)*rr*.6;          // knotty, uneven
  float d=dot(pa,n)-wob;
  float along=length(ba)*h;
  float R=rr*(1.-.25*h)*(.85+.3*vn(vec2(h*4.,seed+3.)));
  float v=d/R;
  inside=step(abs(v),1.)*step(.001,h)*step(h,.999);
  if(inside<.5) return 0.;
  float shade=sqrt(max(0.,1.-v*v))*(.55+.45*v);            // lit from one side
  float bark=abs(fract(along*38.+v*1.5+vn(vec2(along*5.,v*2.+seed))*2.6)-.5)*2.;
  float lines=smoothstep(.6-shade*.45,.68-shade*.45,bark);
  float rim=smoothstep(.8,.97,abs(v));
  return max(lines*shade*.95,rim*.8);
}
// --- a leaf: vesica shape, central vein, diagonal hatching ---------------------------------
float leaf(vec2 p,vec2 c,float ang,float s,float g){
  if(g<=0.) return 0.;
  vec2 q=rot(-ang)*(p-c)/(s*g);
  q.x-=.5;                                                  // grows out from its stem
  float w=.5*sqrt(max(0.,1.-4.*q.x*q.x))*.6;
  if(abs(q.y)>w||abs(q.x)>.5) return 0.;
  float edge=smoothstep(w-.04,w,abs(q.y));
  float vein=smoothstep(.025,0.,abs(q.y))*step(-.45,q.x);
  float ribs=smoothstep(.85,.95,abs(fract((q.x+abs(q.y)*1.2)*9.)-.5)*2.)*step(abs(q.y),w-.03);
  float sh=step(0.,q.y)*.5+.5;
  return max(max(edge,vein),ribs*sh)*.9;
}
void main(){
  vec2 fc=gl_FragCoord.xy;
  vec2 p=fc/r.y;
  px=1./r.y;
  float a=clamp(A,0.,1.);
  vec2 par=(m-.5)*.02;
  p+=par;
  vec3 c=vec3(0.);
  // ink: grey blots bloom behind the relic, then thin out into a stain
  float ink=smoothstep(0.,.35,a);
  vec2 ip=(p-C)*vec2(1.,1.25);
  float n=fbm(ip*2.6+3.)+fbm(ip*7.+t*.02)*.3;
  float th=1.3-ink*1.0+length(ip)*.75;
  float blot=smoothstep(th-.02,th+.02,n);
  float core=smoothstep(th+.05,th+.3,n);                    // pooled ink is darker in the middle
  c=mix(c,vec3(.34,.34,.33),blot*(1.-.75*core)*(1.-.35*smoothstep(.6,1.,a)));
  // branches slam in along their own axis and lock into a crossed rack
  float bset=smoothstep(.42,.72,a);
  vec2 ends[10];
  float ang0[5]; ang0[0]=.62; ang0[1]=-.6; ang0[2]=1.52; ang0[3]=.12; ang0[4]=-1.1;
  for(int i=0;i<5;i++){
    float fi=float(i);
    float d=clamp((a-.4-fi*.05)/.25,0.,1.); d=1.-pow(1.-d,4.);
    vec2 dir=vec2(cos(ang0[i]),sin(ang0[i]));
    vec2 sl=dir*(1.-d)*(i%2==0?1.4:-1.4);
    vec2 A0=C-dir*.58+sl+vec2(0.,(fi-2.)*.012), B0=C+dir*.58+sl+vec2(0.,(fi-2.)*.012);
    float ins; float br=branch(p,A0,B0,.022+.006*h11(fi),fi*7.,ins);
    c=mix(c,vec3(0.),ins);
    c+=BONE*br*.9;
    // leaves sprout along the branch once it has landed
    for(int k=0;k<5;k++){
      float fk=float(k);
      float hh=.12+fk*.19;
      vec2 lp=mix(A0,B0,hh);
      float side=mod(fk,2.)<.5?1.:-1.;
      float la=ang0[i]+side*(.7+.4*h11(fi*5.+fk))+3.14159*step(side,0.);
      float gr=clamp((a-.68-.05*fk-.03*fi)/.22,0.,1.); gr=1.-pow(1.-gr,2.);
      gr*=1.+.03*sin(t*1.3+fk+fi);
      float lf=leaf(p,lp,la,.11+.04*h11(fi+fk*3.),gr);
      c=max(c,BONE*lf);
    }
  }
  // the skull sits on top of everything
  vec4 sk4=skull(p,clamp(a*1.05,0.,1.));
  c=mix(c,sk4.rgb,sk4.a);                                  // the skull occludes the rack behind it
  // breathing + film: flicker, scratches, grain, vignette
  c*=.94+.06*sin(t*7.)*sin(t*3.1);
  float scr=step(.9993,h11(floor(fc.x/2.)+floor(t*12.)*1.3))*.18*step(.6,h11(floor(t*12.)));
  c+=scr*vec3(.6);
  vec2 uv=fc/r;
  c*=1.-.6*pow(length((uv-.5)*vec2(1.,1.1)),2.4);
  c+=(h21(fc+fract(t*7.)*91.)-.5)*.06;
  o=vec4(c*vec3(1.,.99,.97),1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.bindAttribLocation(prog, 0, 'p'); gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  const im = new Image(); im.crossOrigin = 'anonymous';
  im.onload = () => { gl.bindTexture(gl.TEXTURE_2D, tx); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); };
  im.src = base + 'skull.png';
  gl.uniform1i(U('sk'), 0);
  const ur = U('r'), ut = U('t'), um = U('m'), uA = U('A'), uC = U('C');
  const resize = () => { const d = Math.min(devicePixelRatio || 1, 1.5) * (PREVIEW ? .5 : 1); canvas.width = canvas.clientWidth * d; canvas.height = canvas.clientHeight * d; gl.viewport(0, 0, canvas.width, canvas.height); };
  new ResizeObserver(resize).observe(canvas); resize();
  let mx = .5, my = .5, tx2 = .5, ty2 = .5;
  addEventListener('pointermove', e => { tx2 = e.clientX / innerWidth; ty2 = 1 - e.clientY / innerHeight; });
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  // loop: assemble (0–5 s) · hold (5–12 s) · scatter (12–14 s)
  const loopA = s => { const k = s % 14; if (k < 5) return k / 5; if (k < 12) return 1; return 1 - (k - 12) / 2; };
  const frame = now => {
    requestAnimationFrame(frame);
    const s = canvas.time != null ? canvas.time : still ? 8 : (now - t0) / 1000;
    mx += (tx2 - mx) * .05; my += (ty2 - my) * .05;
    const A = window.RELIC ? window.RELIC.a : (still ? 1 : loopA(s));
    const asp = canvas.width / canvas.height;
    // the relic sits right of centre on wide screens (room for type), centred on narrow ones
    const cx = canvas.dataset.center != null || asp < 1.1 ? asp / 2 : asp * .64;
    gl.uniform2f(ur, canvas.width, canvas.height); gl.uniform1f(ut, s); gl.uniform2f(um, mx, my);
    gl.uniform1f(uA, A); gl.uniform2f(uC, cx, .5);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  requestAnimationFrame(frame);
})();
