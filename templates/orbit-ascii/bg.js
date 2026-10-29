/* Orbit ASCII — ASCII motion background
 * Usage: <canvas data-bg></canvas> inside any positioned container, then <script src="bg.js"></script>. Keep glyphs.png next to this file.
 * Optional: <canvas data-bg data-cell="12"> sets the character cell height in px.
 */
(() => {
  const base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]*$/, '');
  let canvas = document.querySelector('canvas[data-bg]');
  if (!canvas) { canvas = document.createElement('canvas'); canvas.setAttribute('data-bg', ''); canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block'; document.body.prepend(canvas); }
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) { canvas.style.background = 'radial-gradient(30% 40% at 62% 50%,#5a4a3a,#030304 70%)'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });
  const FB = false, MODE = 'glyph', NG = 27;
  const vert = `#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`;
  const sceneSrc = `#version 300 es
precision highp float;
uniform vec2 r,R,m,mv; uniform float t; uniform sampler2D prev;
out vec4 o;
// Ringed planet, ray-traced, for the ASCII engine. Banded atmosphere that rotates, a ring with gaps that
// casts its shadow onto the planet (and the planet onto the ring), terminator glow, twinkling stars.
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,-s,0,s,c);}
mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,-s,0,s,c,0,0,0,1);}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  float A=R.x/R.y;
  vec2 p=(uv-vec2(.62,.5))*vec2(A,1.);
  if(A<1.1) p=(uv-.5)*vec2(A,1.);
  p+=(m-.5)*.04;
  vec3 ro=vec3(0.,0.,4.6), rd=normalize(vec3(p,-1.75));
  mat3 tilt=rz(.42)*rx(-.22-(m.y-.5)*.12);
  vec3 L=normalize(vec3(-.55,.5,.85));
  float bright=0.; vec3 col=vec3(0.);
  // stars
  float st=step(.996,h21(floor(gl_FragCoord.xy)))*(.25+.35*(.5+.5*sin(t*2.+h21(floor(gl_FragCoord.xy)+3.)*40.)));
  bright=st*.5; col=vec3(.6,.65,.85);
  // planet
  float Rp=.82;
  float b=dot(ro,rd), c=dot(ro,ro)-Rp*Rp, h=b*b-c;
  float tP=1e9;
  if(h>0.) tP=-b-sqrt(h);
  // ring plane (in the tilted frame): y=0, radii 1.15..1.9
  vec3 rn=tilt*vec3(0.,1.,0.);
  float tR=-dot(ro,rn)/dot(rd,rn);
  vec3 rp=ro+rd*tR; float rr=length(rp);
  bool ring=tR>0.&&rr>1.15&&rr<1.92;
  float ringD=0.;
  if(ring){
    float band=.55+.45*sin(rr*38.)*sin(rr*11.+1.);
    band*=smoothstep(1.15,1.22,rr)*smoothstep(1.92,1.82,rr)*(1.-.85*smoothstep(.02,0.,abs(rr-1.52)));   // Cassini gap
    // planet shadow on the ring
    float bs=dot(rp,L), cs=dot(rp,rp)-Rp*Rp, hs=bs*bs-cs;
    float sh=(hs>0.&&-bs-sqrt(hs)>0.)?.12:1.;
    ringD=band*sh*(.55+.45*abs(dot(L,rn)));
  }
  if(tP<1e8&&(!ring||tP<tR)){
    vec3 q=ro+rd*tP, n=normalize(q);
    vec3 nl=transpose(tilt)*n;                                        // planet-local
    float lat=nl.y, lon=atan(nl.z,nl.x)+t*.12;
    float bands=fbm(vec2(lon*1.6,lat*9.+fbm(vec2(lon*3.,lat*14.)+t*.03)*1.4));
    float dif=max(dot(n,L),0.);
    // ring shadow on the planet
    float tr=-dot(q,rn)/dot(L,rn); vec3 rq=q+L*tr; float rl=length(rq);
    float rsh=(tr>0.&&rl>1.15&&rl<1.92)?.35+.4*(.5+.5*sin(rl*38.)):1.;
    float term=smoothstep(.0,.25,dif)*(1.-smoothstep(.25,.6,dif));
    bright=(dif*(.55+.6*bands)*rsh+term*.12);
    bright+=pow(1.-max(dot(n,-rd),0.),3.)*.35*smoothstep(-.2,.3,dot(n,L));   // atmosphere rim
    col=mix(vec3(1.,.55,.25),vec3(.95,.93,.88),smoothstep(.15,.6,dif));
    if(ring&&tR<tP) {}
  }
  if(ring&&tR<tP){ bright=max(bright*(1.-ringD*.4),ringD); col=mix(col,vec3(.9,.85,.75),.7); }
  o=vec4(col,clamp(bright,0.,1.));
}
`;
  const glyphSrc = `#version 300 es
precision highp float;
uniform sampler2D sc, at; uniform vec2 R, G; uniform float t, NG, CW, CH;
out vec4 o;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){
  vec2 px=vec2(gl_FragCoord.x,R.y-gl_FragCoord.y);
  vec2 cell=floor(px/vec2(CW,CH)); vec2 f=fract(px/vec2(CW,CH));
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
    c=s.rgb*smoothstep(rad+aa,rad-aa,d);
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
