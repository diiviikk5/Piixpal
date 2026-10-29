/* Halftone — halftone motion background
 * Usage: <canvas data-bg></canvas> inside any positioned container, then <script src="bg.js"></script>.
 * Optional: <canvas data-bg data-cell="12"> sets the character cell height in px.
 */
(() => {
  const base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]*$/, '');
  let canvas = document.querySelector('canvas[data-bg]');
  if (!canvas) { canvas = document.createElement('canvas'); canvas.setAttribute('data-bg', ''); canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block'; document.body.prepend(canvas); }
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) { canvas.style.background = 'linear-gradient(180deg,#efeff2 40%,#b0263a 41%,#5a1022)'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });
  const FB = false, MODE = 'dot', NG = 0;
  const vert = `#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`;
  const sceneSrc = `#version 300 es
precision highp float;
uniform vec2 r,R,m,mv; uniform float t; uniform sampler2D prev;
out vec4 o;
// Halftone peaks: ray-marched ridged mountains, a cloudy sky and a flat valley floor, printed as ink dots on paper.
// Every 4.5 s the shot cuts to a new mountain and a new two-ink palette (like a riso print run), with a slow push-in.
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float SEED;
float terrain(vec2 x){
  vec2 x0=x; x+=SEED*17.3;
  float h=0.,a=1.,f=.35;
  for(int i=0;i<6;i++){ float n=1.-abs(vn(x*f)*2.-1.); h+=a*n*n; a*=.48; f*=2.07; x+=vec2(3.1,1.7); }
  // one dominant peak, centred ahead of the camera
  vec2 c=x0-vec2((SEED-3.)*1.2,13.);   // (the octave loop shifts x, so use the original point)
  float pr=length(c);
  float peak=3.6*exp(-pr*.32)*(1.+.25*h);                 // one big ridged peak, sharp at the top
  return h*.35*(.3+smoothstep(2.,8.,pr))+peak*(.8+.4*h*.5)-.9;
}
vec3 nrm(vec2 x){ float e=.03; return normalize(vec3(terrain(x-vec2(e,0.))-terrain(x+vec2(e,0.)),2.*e,terrain(x-vec2(0.,e))-terrain(x+vec2(0.,e)))); }
float clouds(vec2 p){ float v=0.,a=.5; for(int i=0;i<4;i++){ v+=a*vn(p); p=p*2.1+vec2(t*.04,0.); a*=.5; } return v; }
void main(){
  float SHOT=4.5;
  float k=floor(t/SHOT), ph=fract(t/SHOT);
  SEED=mod(k,5.)+1.;
  int pal=int(mod(k,5.));
  vec2 uv=gl_FragCoord.xy/r;
  float A=R.x/R.y;
  vec2 p=(uv-.5)*vec2(A,1.);
  // camera: low over the valley, pushing in slowly through the shot, a touch of pointer look
  vec3 ro=vec3(0.,.3+.1*h21(vec2(SEED)),.2+ph*1.6);
  vec3 ta=ro+vec3((m.x-.5)*.3,.16+(m.y-.5)*.1,1.);
  vec3 fw=normalize(ta-ro), rt=normalize(cross(vec3(0,1,0),fw)), up=cross(fw,rt);
  vec3 rd=normalize(p.x*rt+p.y*up+1.6*fw);
  vec3 L=normalize(vec3(-.6,.55,.4));
  // march the heightfield
  float d=0., hit=-1.;
  for(int i=0;i<90;i++){
    vec3 q=ro+rd*d; float h=q.y-terrain(q.xz);
    if(h<.002*d){ hit=d; break; }
    d+=max(h*.45,.01); if(d>40.) break;
  }
  float lum; int mat;
  if(hit>0.){
    vec3 q=ro+rd*hit; vec3 n=nrm(q.xz);
    float dif=max(dot(n,L),0.);
    float snow=smoothstep(.55,.75,n.y)*smoothstep(.6,1.4,q.y);
    lum=.12+.8*dif;
    lum=mix(lum,.85+.15*dif,snow);
    float fog=1.-exp(-hit*.06);
    lum=mix(lum,.9,fog*.8);
    mat=q.y<-.6?2:1;                       // valley floor vs rock
    if(mat==2) lum=.55+.3*vn(q.xz*vec2(.6,4.))-.15*(1.-fog);
  } else {
    float cl=clouds(rd.xz/max(rd.y,.05)*.6+SEED);
    lum=.92-.35*smoothstep(.45,.75,cl)*smoothstep(0.,.3,rd.y);
    mat=0;
  }
  // a quick flash of paper on each cut
  lum=mix(lum,1.,smoothstep(.06,0.,ph)*.85);
  // five riso palettes: [sky ink, rock ink, ground ink]
  vec3 sk,rk,gr;
  if(pal==0){ sk=vec3(.85,.2,.25); rk=vec3(.78,.08,.12); gr=vec3(.55,.12,.2); }
  else if(pal==1){ sk=vec3(.2,.35,.7); rk=vec3(.1,.12,.35); gr=vec3(.15,.25,.55); }
  else if(pal==2){ sk=vec3(.35,.35,.45); rk=vec3(.08,.07,.12); gr=vec3(.2,.18,.25); }
  else if(pal==3){ sk=vec3(.05,.45,.55); rk=vec3(.06,.2,.25); gr=vec3(.1,.45,.2); }
  else { sk=vec3(.8,.45,.45); rk=vec3(.55,.2,.18); gr=vec3(.45,.25,.3); }
  vec3 ink=mat==0?sk:mat==1?rk:gr;
  o=vec4(ink,pow(clamp(1.-lum,0.,1.),1.15));
}
`;
  const glyphSrc = `#version 300 es
precision highp float;
uniform sampler2D sc, at; uniform vec2 R, G; uniform float t, NG, CW, CH;
const vec3 PAPER=vec3(0.937,0.937,0.949);
out vec4 o;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){
  vec2 px=vec2(gl_FragCoord.x,R.y-gl_FragCoord.y);
  if(NG<.5) px.x+=mod(floor(px.y/CH),2.)*CW*.5;              // halftone: staggered rows, like a print screen
  vec2 cell=floor(px/vec2(CW,CH)); vec2 f=fract(px/vec2(CW,CH));
  cell.x=min(cell.x,G.x-1.);
  vec4 s=texelFetch(sc,ivec2(cell.x,G.y-1.-cell.y),0);
  float L=clamp(s.a,0.,1.);
  vec3 c;
  if(NG>0.){
    // a little life: a few cells re-roll one step up or down the ramp
    float j=h21(cell+floor(t*9.));
    float idx=clamp(floor(L*(NG-.01))+(j>.985?1.:j<.015?-1.:0.),0.,NG-1.);
    float g=texture(at,vec2((idx+f.x)/NG,f.y)).r;
    c=s.rgb*g;
  } else {
    // halftone: a round dot per cell, area proportional to brightness, rotated screen
    vec2 q=f-.5; q.x*=CW/CH;
    float rad=sqrt(L)*.62;
    float d=length(q);
    float aa=1.2/CH;
    float dot_=smoothstep(rad+aa,rad-aa,d);
    c=PAPER.r<0.?s.rgb*dot_:mix(PAPER,s.rgb,dot_);
  }
  o=vec4(c,1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const mk = fs => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vert)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p); return p; };
  const P1 = mk(sceneSrc), P2 = mk(glyphSrc);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const half = !!gl.getExtension('EXT_color_buffer_float');
  const U1 = n => gl.getUniformLocation(P1, n), U2 = n => gl.getUniformLocation(P2, n);
  // the scene buffers (two when the scene feeds back on itself)
  let bufs = [], cols = 0, rows = 0;
  const mkbuf = () => { const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texImage2D(gl.TEXTURE_2D, 0, half ? gl.RGBA16F : gl.RGBA8, cols, rows, 0, gl.RGBA, half ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx, 0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return { tx, fb }; };
  // glyph atlas
  const atlas = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, atlas);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  if (NG) { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, atlas);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); }; im.src = base + 'glyphs.png'; }
  const PREVIEW = /[?&]preview/.test(location.search);
  let CH = +(canvas.dataset.cell || 7.0), CW = CH * (1);
  const resize = () => {
    const d = Math.min(devicePixelRatio || 1, 2) * (PREVIEW ? .6 : 1);
    canvas.width = canvas.clientWidth * d; canvas.height = canvas.clientHeight * d;
    const ch = CH * d, cw = CW * d;
    cols = Math.ceil(canvas.width / cw); rows = Math.ceil(canvas.height / ch);
    bufs.forEach(b => { gl.deleteTexture(b.tx); gl.deleteFramebuffer(b.fb); });
    bufs = FB ? [mkbuf(), mkbuf()] : [mkbuf()];
    canvas._cw = cw; canvas._ch = ch;
  };
  new ResizeObserver(resize).observe(canvas); resize();
  let mx = .5, my = .5, tx = .5, ty = .5, vx = 0, vy = 0;
  addEventListener('pointermove', e => { const b = canvas.getBoundingClientRect(); tx = (e.clientX - b.left) / b.width; ty = 1 - (e.clientY - b.top) / b.height; });
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now(); let cur = 0;
  const frame = now => {
    requestAnimationFrame(frame);
    const s = canvas.time != null ? canvas.time : still ? 12 : (now - t0) / 1000;
    const nx = mx + (tx - mx) * .12, ny = my + (ty - my) * .12; vx = (nx - mx) * 60; vy = (ny - my) * 60; mx = nx; my = ny;
    // pass 1: the scene, one texel per cell
    const src = bufs[cur], dst = FB ? bufs[1 - cur] : bufs[0];
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, cols, rows); gl.useProgram(P1);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tx); gl.uniform1i(U1('prev'), 0);
    gl.uniform2f(U1('r'), cols, rows); gl.uniform2f(U1('R'), canvas.width, canvas.height); gl.uniform1f(U1('t'), s);
    gl.uniform2f(U1('m'), mx, my); gl.uniform2f(U1('mv'), vx, vy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (FB) cur = 1 - cur;
    // pass 2: glyphs
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(P2);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, dst.tx); gl.uniform1i(U2('sc'), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, atlas); gl.uniform1i(U2('at'), 1);
    gl.uniform2f(U2('R'), canvas.width, canvas.height); gl.uniform2f(U2('G'), cols, rows);
    gl.uniform1f(U2('t'), s); gl.uniform1f(U2('NG'), NG); gl.uniform1f(U2('CW'), canvas._cw); gl.uniform1f(U2('CH'), canvas._ch);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  requestAnimationFrame(frame);
})();
