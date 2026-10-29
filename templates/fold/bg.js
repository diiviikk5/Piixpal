/* Fold — motion background
 * Usage: <canvas data-bg></canvas> inside any positioned container, then <script src="bg.js"></script>.
 * No canvas found → a fixed full-screen one is created behind the page.
 */
(() => {
  let canvas = document.querySelector('canvas[data-bg]');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.setAttribute('data-bg', '');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block';
    document.body.prepend(canvas);
  }
  const gl = canvas.getContext('webgl', { antialias:false, alpha:false });
  if (!gl) { canvas.style.background = 'radial-gradient(30% 20% at 40% 45%,#ff6a3a,transparent),radial-gradient(25% 18% at 60% 58%,#7a3cff,transparent),#fff'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });   /* free the GPU context when the page/iframe goes away */

  const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const frag = `
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m;
// Fold — dyed silk folding over itself on white.
// A few S-shaped creases run diagonally across the page. Each crease is razor sharp on one side and
// bleeds colour softly away on the other (the inside of the fold, lit from behind). The colour slides
// along each crease, red at the hinge, orange in the body, violet where the fold turns away, and the
// creases themselves bend, travel and hand the colour on to each other. Layers multiply like dye.
float th(float x){x=clamp(x,-9.,9.);float e=exp(2.*x);return (e-1.)/(e+1.);}

// one fold: rgb = dye colour, a = coverage
vec4 fold(vec2 p,float k,float T){
  vec2 dir=normalize(vec2(1.,.82+.15*sin(T*.21+k)));
  vec2 nrm=vec2(-dir.y,dir.x);
  float u=dot(p,dir), v=dot(p,nrm);
  // the crease: an S-curve whose bend and offset breathe
  float bend=.75+.35*sin(T*.37+k*2.1);
  float off=(k-1.)*.4+.16*sin(T*.29+k*3.7);
  float cr=off+bend*.3*th((u-.3*sin(T*.23+k))*3.4)-.05*u;
  float d=v-cr;                                         // >0: inside the fold
  if(mod(k,2.)>.5) d=-d;                                // alternate folds hold their dye on the other side
  // dye lives along part of the crease only (a travelling blob)
  float along=exp(-pow((u-.45*sin(T*.31+k*2.7))/(.27+.09*sin(T*.4+k)),2.));
  float px=1.5/r.y;
  float inside=smoothstep(-px,px,d);                    // razor edge, anti-aliased to one pixel
  float fall=exp(-max(d,0.)*(8.+3.*sin(T*.33+k)));     // soft bleed away from the crease
  float al=clamp(inside*fall*along*1.7,0.,1.);
  // hue along the fold
  float hv=.5+.5*sin(u*2.2+T*.45+k*2.);
  vec3 col=mix(vec3(1.,.36,.1),vec3(.43,.15,1.),smoothstep(.55,.95,hv));
  col=mix(col,vec3(.88,.04,.13),exp(-max(d,0.)*40.)*.7);   // deep red right at the hinge
  return vec4(col,al);
}
void main(){
  vec2 p=(gl_FragCoord.xy-.5*r)/r.y;
  p+=(m-.5)*.06;                                        // the page tilts with the pointer
  float T=t*1.6;
  vec3 c=vec3(1.,.996,.992);                            // warm white paper
  for(int i=0;i<3;i++){
    float k=float(i);
    vec4 f=fold(p,k,T+k*7.3);
    c*=mix(vec3(1.),f.rgb,f.a);                         // dye multiplies
  }
  float g=fract(sin(dot(gl_FragCoord.xy+fract(t*7.)*91.,vec2(12.9898,78.233)))*43758.5453);
  c+=(g-.5)*.012;
  gl_FragColor=vec4(c,1.);
}
`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.bindAttribLocation(prog, 0, 'p');
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n), ur = U('r'), ut = U('t'), um = U('m'), uo = U('o');
  const focus = (canvas.dataset.focus || '.5,.5').split(',').map(Number); // optional: <canvas data-bg data-focus="x,y">

  const SCALE = 1; // render scale vs CSS pixels — lower = faster, softer
  const resize = () => { const P = /[?&]preview/.test(location.search) ? .5 : 1; canvas.width = canvas.clientWidth * SCALE * P; canvas.height = canvas.clientHeight * SCALE * P; gl.viewport(0, 0, canvas.width, canvas.height); };
  new ResizeObserver(resize).observe(canvas); resize();

  let mx = .5, my = .5, tx = mx, ty = my, visible = true;
  addEventListener('pointermove', e => { const b = canvas.getBoundingClientRect(); tx = (e.clientX - b.left) / b.width; ty = 1 - (e.clientY - b.top) / b.height; });
  new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(canvas);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  const frame = now => {
    requestAnimationFrame(frame);
    if (!visible) return;
    mx += (tx - mx) * .04; my += (ty - my) * .04;
    gl.uniform2f(ur, canvas.width, canvas.height);
    gl.uniform1f(ut, canvas.time != null ? canvas.time : still ? 20 : (now - t0) / 1000);
    gl.uniform2f(um, mx, my);
    if (uo) gl.uniform2f(uo, focus[0], focus[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  requestAnimationFrame(frame);
})();
