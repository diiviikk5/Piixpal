/* Bitcloud — motion background (1-bit dithered cumulus, lit by your cursor)
 * Usage: <canvas data-bg></canvas> inside any positioned container, then <script src="bg.js"></script>.
 * No images: the clouds are generated. The cursor is the sun; drag to blow the clouds; click for lightning.
 * Optional: data-ink="#1a1f3b" data-paper="#f2eed2" for your own two colours, data-pixel="3" for dot size.
 */
(() => {
  let canvas = document.querySelector('canvas[data-bg]');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.setAttribute('data-bg', '');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block';
    document.body.prepend(canvas);
  }
  const ink = canvas.dataset.ink || '#1a1f3b', paper = canvas.dataset.paper || '#f2eed2';
  canvas.style.background = ink;
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) return;
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hex = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

  const vert = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const frag = `#version 300 es
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 sun; uniform vec2 off; uniform float px;
uniform vec3 INK; uniform vec3 PAPER; uniform vec3 bolt;   // bolt: x, y (0..1) and seconds since
out vec4 o;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
// a cumulus layer: clouds are heaps of puffs, big in the middle, small at the edges, flat underneath.
// Each puff is lit like a little sphere facing the sun. Returns brightness, or -1 for sky.
float puffs(vec2 p,vec2 sunp,float sc,float seed,float cover){
  p*=sc; sunp*=sc;
  vec2 id=floor(p/2.);
  float best=-1.,lum=-1.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 cell=id+vec2(i,j);
    if(hash(cell+seed)>cover) continue;                     // gaps of open sky
    vec2 cc=(cell+.5)*2.+(vec2(hash(cell+seed+1.),hash(cell+seed+2.))-.5)*.5;
    float W=.55+.35*hash(cell+seed+3.);                     // half-width of this cloud
    float base=cc.y-.45;
    if(p.y<base) continue;                                  // cumulus have flat bottoms
    for(int k=0;k<11;k++){
      float u=float(k)/10., hk=hash(cell*1.7+float(k)*3.3+seed);
      float dome=1.-pow(abs(u-.5)*2.,1.6);
      vec2 c=vec2(cc.x+(u-.5)*2.*W+(hk-.5)*.12, base+.12+dome*.55*W*(.7+.6*hk));
      float rr=(.14+.3*dome)*(.75+.5*hash(cell+float(k)*5.1+seed))*(1.+.035*sin(t*.7+hk*30.));
      vec2 dv=(p-c)/rr; float dd=dot(dv,dv);
      if(dd>1.) continue;
      float z=sqrt(1.-dd), hgt=z*rr+c.y*.02;
      if(hgt>best){
        best=hgt;
        vec3 n=vec3(dv,z), L=normalize(vec3(sunp-p,1.4));
        float diff=clamp(dot(n,L),0.,1.);
        float under=smoothstep(.0,.35,p.y-base);            // undersides sit in shadow
        lum=(.48+.85*diff+.3*pow(1.-z,2.)*diff)*(.62+.38*under);
      }
    }
  }
  return lum;
}
float bayer(vec2 b){                       // 8x8 ordered dither, 0..1
  vec2 a=mod(b,2.),c=mod(floor(b/2.),2.),e=mod(floor(b/4.),2.);
  float v=(a.x*2.+a.y*3.-a.x*a.y*4.)*16.+(c.x*2.+c.y*3.-c.x*c.y*4.)*4.+(e.x*2.+e.y*3.-e.x*e.y*4.);
  return (v+.5)/64.;
}
void main(){
  vec2 cell=floor(gl_FragCoord.xy/px);
  vec2 uv=(cell+.5)*px/r;                 // chunky pixels: every dot samples its block centre
  float SA=r.x/r.y;
  vec2 q=uv*vec2(SA,1.)*2.2+off;
  vec2 s=sun*vec2(SA,1.)*2.2+off;
  float sky=mix(.03,.2,uv.y)+.24*exp(-length((uv-sun)*vec2(SA,1.))*2.6);
  float v=sky;
  float far=puffs(q+vec2(t*.035,0.),s+vec2(t*.035,0.),2.6,11.,.5);
  if(far>=0.) v=mix(sky,far*.7,.92);
  float near=puffs(q+vec2(t*.08,0.),s+vec2(t*.08,0.),1.15,3.,.72);
  if(near>=0.) v=near;
  // lightning: a flash, and a jagged 1-bit bolt down to the click
  float bt=bolt.z;
  if(bt<1.2){
    float flash=exp(-bt*9.)*(.6+.4*step(.5,fract(bt*14.)));
    v+=flash*.6;
    if(uv.y>bolt.y){
      float k=(uv.y-bolt.y)/max(1.-bolt.y,.01);
      float bx=bolt.x+(vn(vec2(uv.y*18.,bolt.x*30.))-.5)*.08*k+(vn(vec2(uv.y*60.,3.))-.5)*.02;
      float wv=abs(uv.x-bx)*SA*r.y/px;
      v+=step(wv,1.)*step(bt,.5)*2.+step(wv,3.)*exp(-bt*6.)*.6;
    }
  }
  v=clamp(v,0.,1.);
  o=vec4(v>bayer(cell)?PAPER:INK,1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag)); gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const uR = U('r'), uT = U('t'), uSun = U('sun'), uOff = U('off'), uPx = U('px'), uBolt = U('bolt');
  gl.uniform3fv(U('INK'), hex(ink)); gl.uniform3fv(U('PAPER'), hex(paper));
  canvas.loaded = () => 1;

  /* the sun follows the cursor (and drifts on its own when nobody's around); dragging blows the clouds */
  let tx = .72, ty = .78, sx = .72, sy = .78, idle = true, ox = 0, oy = 0, vx = 0, vy = 0, down = false, lx = 0, ly = 0, bx = .5, by = .5, bt = 9;
  addEventListener('pointermove', e => {
    const b = canvas.getBoundingClientRect(), nx = (e.clientX - b.left) / b.width, ny = 1 - (e.clientY - b.top) / b.height;
    if (down) { vx -= (nx - lx) * 3; vy -= (ny - ly) * 3; }
    tx = nx; ty = ny; lx = nx; ly = ny; idle = false;
  }, { passive: true });
  const host = canvas.parentElement || document.body;
  host.addEventListener('pointerdown', e => {
    if (e.target.closest && e.target.closest('a,button,input,textarea,select,label')) return;
    const b = canvas.getBoundingClientRect();
    down = true; lx = (e.clientX - b.left) / b.width; ly = 1 - (e.clientY - b.top) / b.height;
    bx = lx; by = ly; bt = 0;
  });
  addEventListener('pointerup', () => { down = false; });

  const t0 = performance.now(); let last = t0, visible = true, raf = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(canvas);
  function frame(now) {
    raf = 0; if (!visible) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const s = (now - t0) / 1000;
    const dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    if (idle) { tx = .5 + Math.sin(s * .13) * .3; ty = .72 + Math.sin(s * .21) * .12; }
    sx += (tx - sx) * Math.min(1, dt * 3); sy += (ty - sy) * Math.min(1, dt * 3);
    ox += vx * dt; oy += vy * dt; vx *= Math.pow(.3, dt); vy *= Math.pow(.3, dt); bt += dt;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uR, w, h); gl.uniform1f(uT, still ? 4 : s); gl.uniform2f(uSun, sx, sy); gl.uniform2f(uOff, ox, oy);
    gl.uniform1f(uPx, Math.max(2, Math.round((+canvas.dataset.pixel || 3) * dpr))); gl.uniform3f(uBolt, bx, by, bt);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!still) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
})();
