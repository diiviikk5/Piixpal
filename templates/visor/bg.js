/* Visor — motion background (a portrait on a 3D plane; its visor line opens into another world)
 * Usage: <canvas data-bg></canvas> inside any positioned container, then <script src="bg.js"></script>.
 * Keep scene.png next to this file. Serve over http(s).
 * Drive it with window.VISOR = { p: 0..1 } (the hero maps scroll to it). Without that it plays by itself.
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
  canvas.style.background = `#050304 url(${base}scene.png) center/cover`;
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) return;
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const vert = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const frag = `#version 300 es
precision highp float;
uniform sampler2D img;
uniform vec2 r; uniform float t; uniform float P; uniform vec2 m; uniform float IA;
out vec4 o;
const float BY=.465;            // the visor line, image y (down) 0..1
const vec2 BX=vec2(.4,.82);     // ...and where it runs, image x
const vec3 RED=vec3(1.,.16,.12);
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,-s,0,s,c);}
mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0,s,0,1,0,-s,0,c);}

// the portrait as a plane in space: returns image uv (y down) and whether we hit it
vec2 plane(vec2 q,float pitch,float yaw,float dist,out float hit){
  vec3 ro=vec3(0,0,-dist), rd=normalize(vec3(q,1.6));
  mat3 R=ry(yaw)*rx(pitch);
  vec3 n=R*vec3(0,0,-1), c=vec3(0);
  float d=dot(c-ro,n)/dot(rd,n);
  hit=d>0.?1.:0.;
  vec3 h=ro+rd*d;
  vec3 l=transpose(R)*(h-c);                        // into the plane's own frame
  float SA=r.x/r.y, w=max(SA,IA)*1.06, hh=w/IA;     // cover the screen when facing it
  vec2 uv=vec2(l.x/w+.5,.5-l.y/hh);
  hit*=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
  return uv;
}
// the world behind the visor: a red grid running to the horizon, a beam, drifting sparks
vec3 world(vec2 q,float k){
  vec3 c=mix(vec3(.02,0.,.01),vec3(.18,.01,.02),smoothstep(-.6,.2,q.y));
  float hz=-.02;
  if(q.y<hz){
    float z=.35/(hz-q.y);
    vec2 g=vec2(q.x*z,z+t*1.4*(.4+k));
    vec2 f=abs(fract(g)-.5);
    float line=smoothstep(.06*z*.15+.01,0.,min(f.x,f.y)*(1./(1.+z*.08)));
    c+=RED*line*smoothstep(14.,1.,z)*.9;
  }
  c+=RED*exp(-abs(q.y-hz)*60.)*1.2+vec3(1.,.55,.5)*exp(-abs(q.y-hz)*260.);
  // a sun of sorts, sliced
  vec2 sp=q-vec2(0.,.2); float sd=length(sp);
  float bands=step(.5,fract((q.y-.08)*18.-t*.4))*step(q.y,.18)+step(.18,q.y);
  c+=mix(RED,vec3(1.,.6,.3),smoothstep(.0,.3,q.y))*smoothstep(.3,.29,sd)*bands*.85;
  c+=RED*exp(-sd*4.)*.25;
  for(int i=0;i<2;i++){
    vec2 st=q*vec2(22.+float(i)*14.)+vec2(0.,t*(1.+float(i)));
    vec2 id=floor(st),fr=fract(st)-.5;
    float h=hash(id+float(i)*5.);
    if(h>.92) c+=vec3(1.,.4,.35)*smoothstep(.08,0.,length(fr))*(.5+.5*sin(t*6.+h*30.));
  }
  return c;
}

void main(){
  vec2 uv=gl_FragCoord.xy/r;
  float SA=r.x/r.y;
  vec2 q=(uv-.5)*vec2(SA,1.);
  float p=clamp(P,0.,1.);
  float beam=smoothstep(.05,.3,p);          // the visor line stretches into a laser
  float open=smoothstep(.28,.72,p);         // the slit opens
  float fall=smoothstep(.3,.95,p);          // the portrait tips back and away
  vec2 mm=(m-.5);
  float pitch=-mm.y*.12-fall*1.05, yaw=mm.x*.18+fall*.12;
  float dist=1.6+fall*1.4;
  float hit;
  vec2 iu=plane(q,pitch,yaw,dist,hit);

  // the portrait, with its visor alive
  vec3 col=vec3(.02,.01,.01);
  if(hit>0.){
    float vy=iu.y-BY, vx=smoothstep(BX.x-.03,BX.x+.04,iu.x)*smoothstep(BX.y+.04,BX.y-.02,iu.x);
    // the hot band shimmers sideways
    iu.x+=sin(iu.y*240.+t*7.)*.0016*exp(-vy*vy*900.);
    col=texture(img,iu).rgb;
    float pulse=.6+.4*sin(t*2.6)+.15*sin(t*13.);
    col+=RED*exp(-vy*vy*2400.)*vx*pulse*.9;
    col+=RED*exp(-vy*vy*120.)*vx*.18*pulse;
    // a scan line sweeps across the lens
    float sx=fract(t*.35)*1.6-.3;
    col+=vec3(1.,.7,.65)*exp(-pow((iu.x-sx)*40.,2.))*exp(-vy*vy*3000.)*vx;
    col*=1.-fall*.5;
  }
  // the beam: the visor's line, stretched across everything (follows the tilted plane's line on screen)
  float by=-.5+ (1.-BY);                    // visor height in plane space when facing us
  float sy=(uv.y-.5) - by*(1.-fall*.9) - mm.y*.02;
  float flick=.85+.15*sin(t*40.)+.1*vn(vec2(uv.x*30.,t*8.));
  vec3 laser=RED*exp(-sy*sy*3000.)*1.6+vec3(1.,.75,.7)*exp(-sy*sy*40000.)*1.4+RED*exp(-abs(sy)*24.)*.35;
  float reach=smoothstep(0.,1.,beam*1.6-abs(uv.x-.62)*1.4);
  // the slit: everything inside it is the world behind the visor
  float half_=open*.62;
  float inSlit=smoothstep(half_+.004,half_-.004,abs(sy));
  vec3 w=world(q-vec2(0.,sy*0.),open);
  col=mix(col,w,inSlit*step(.001,open));
  // bright lips on the slit's edges
  col+=RED*exp(-pow((abs(sy)-half_)*180.,2.))*step(.001,open)*(1.-open*.5)*1.4;
  col+=laser*reach*flick*(1.-open*.6);
  // grade
  col=col/(1.+col*.25);
  col*=mix(.6,1.,smoothstep(1.3,.3,length((uv-.5)*vec2(SA*.8,1.))));
  col+=(hash(gl_FragCoord.xy+fract(t*7.)*91.)-.5)*.035;
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
  const uR = U('r'), uT = U('t'), uP = U('P'), uM = U('m'), uIA = U('IA');

  let ready = false, IA = 1.78;
  canvas.loaded = () => ready ? 1 : 0;
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => {
    const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    IA = img.naturalWidth / img.naturalHeight; ready = true;
    canvas.dispatchEvent(new CustomEvent('progress', { detail: 1 }));
  };
  img.src = base + 'scene.png';

  let mx = .5, my = .5, sx = .5, sy = .5;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth; my = 1 - e.clientY / innerHeight; }, { passive: true });
  const t0 = performance.now(); let last = t0, visible = true, raf = 0;
  /* nobody driving: close, open, hold, close again (14 s) */
  const auto = s => { const k = (s % 14) / 14; return k < .15 ? 0 : k < .6 ? (k - .15) / .45 : k < .85 ? 1 : 1 - (k - .85) / .15; };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(canvas);
  function frame(now) {
    raf = 0; if (!visible) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const dpr = Math.min(1.75, devicePixelRatio || 1), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    if (ready) {
      const s = (now - t0) / 1000, V = window.VISOR;
      sx += (mx - sx) * Math.min(1, dt * 4); sy += (my - sy) * Math.min(1, dt * 4);
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uR, w, h); gl.uniform1f(uT, still ? 2 : s);
      gl.uniform1f(uP, V ? V.p : (canvas.dataset.p != null ? +canvas.dataset.p : auto(s)));
      gl.uniform2f(uM, sx, sy); gl.uniform1f(uIA, IA);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
})();
