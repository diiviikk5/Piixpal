/* Vapor — ASCII motion background
 * Usage: <canvas data-bg></canvas> inside any positioned container, then <script src="bg.js"></script>. Keep glyphs.png next to this file.
 * Optional: <canvas data-bg data-cell="12"> sets the character cell height in px.
 */
(() => {
  const base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]*$/, '');
  let canvas = document.querySelector('canvas[data-bg]');
  if (!canvas) { canvas = document.createElement('canvas'); canvas.setAttribute('data-bg', ''); canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block'; document.body.prepend(canvas); }
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) { canvas.style.background = 'radial-gradient(20% 40% at 68% 50%,#3a3a44,#07070a 70%)'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });
  const FB = true, MODE = 'glyph', NG = 27;
  const vert = `#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`;
  const sceneSrc = `#version 300 es
precision highp float;
uniform vec2 r,R,m,mv; uniform float t; uniform sampler2D prev;
out vec4 o;
// Vapor: a feedback smoke simulation drawn in ASCII. Each frame the previous frame is advected along a
// turbulent, divergence-free (curl) flow with buoyancy, cooled and thinned; incense sticks emit warm smoke and
// the pointer both pushes the flow and injects its own colour. rgb = smoke colour, a = density (picks the glyph).
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float pot(vec2 p){ return vn(p)*.6+vn(p*2.3+7.1)*.3+vn(p*5.1+3.3)*.1; }
vec2 curl(vec2 p){ float e=.02; return vec2(pot(p+vec2(0,e))-pot(p-vec2(0,e)),-(pot(p+vec2(e,0))-pot(p-vec2(e,0))))/(2.*e); }
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  float A=R.x/R.y;
  vec2 a=uv*vec2(A,1.);
  // the flow: rising, with turbulence that grows with height
  vec2 v=vec2(0.,.0028);
  v+=curl(a*2.6+vec2(0.,-t*.15))*.0024*(.25+uv.y*1.9);
  v.x+=sin(t*.23+uv.y*3.)*.0004;
  // the pointer pushes the smoke the way it moves
  vec2 mp=m*vec2(A,1.);
  float md=length(a-mp);
  v+=vec2(mv.x*A,mv.y)*.006*exp(-md*md*60.);
  vec2 back=uv-v*vec2(1./A,1.);
  vec4 pr=texture(prev,back);
  // diffuse a little (neighbour blur) and fade
  vec2 px=1./r;
  vec4 nb=(texture(prev,back+vec2(px.x,0.))+texture(prev,back-vec2(px.x,0.))+texture(prev,back+vec2(0.,px.y))+texture(prev,back-vec2(0.,px.y)))*.25;
  vec4 s=mix(pr,nb,.05);
  s.a=max(s.a*.9945-.0009,0.); s.rgb=mix(s.rgb,vec3(.55,.6,.75),.003);
  // three incense sticks, smoke rising from their glowing tips
  for(int i=0;i<3;i++){
    float fi=float(i);
    vec2 tip=vec2((.6+fi*.12+.01*sin(t*.7+fi))*A,.16+.03*fi);
    float d=length(a-tip);
    float puff=exp(-d*d*7000.)*(.75+.25*sin(t*3.1+fi*2.));
    s.a=min(1.,s.a+puff*.9);
    s.rgb=mix(s.rgb,vec3(1.,.82,.62),clamp(puff*1.5,0.,1.));
  }
  // the pointer leaves its own trail, in a hue that slowly cycles
  float sp=length(mv);
  float inj=exp(-md*md*700.)*clamp(sp*2.2,0.,1.);
  vec3 hue=.6+.4*cos(6.2831*(t*.05+vec3(0.,.33,.67)));
  s.a=max(s.a,inj);
  s.rgb=mix(s.rgb,hue,clamp(inj*2.,0.,1.));
  // the sticks themselves and their embers (drawn, not simulated)
  float stick=0.;
  for(int i=0;i<3;i++){ float fi=float(i); vec2 tip=vec2((.6+fi*.12+.01*sin(t*.7+fi))*A,.16+.03*fi);
    if(a.y<tip.y-.01&&a.y>tip.y-.22&&abs(a.x-tip.x+(tip.y-a.y)*.08)<1.2/r.x*A) stick=1.; }
  vec4 outc=s;
  if(stick>0.) outc=vec4(vec3(.35,.3,.28),.35);
  // a breath of fresh air at the edges so nothing piles up
  outc.a*=smoothstep(0.,.03,uv.x)*smoothstep(1.,.97,uv.x)*smoothstep(1.,.92,uv.y);
  o=vec4(outc.rgb,clamp(outc.a,0.,1.));
  o.a=stick>0.?o.a:o.a;
}
`;
  const glyphSrc = `#version 300 es
precision highp float;
uniform sampler2D sc, at; uniform vec2 R, G; uniform float t, NG, CW, CH;
const vec3 PAPER=vec3(-1.);
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
  let CH = +(canvas.dataset.cell || 12.0), CW = CH * (0.6);
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
