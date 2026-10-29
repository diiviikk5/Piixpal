/* Furnace — motion background
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
  if (!gl) { canvas.style.background = 'linear-gradient(90deg,#000 5%,#ff7a18 22%,#fff1c9 30%,#ff7a18 40%,#300 60%,#000)'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });   /* free the GPU context when the page/iframe goes away */

  const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const frag = `
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m;
// Furnace — a living fire seen through fluted glass.
// Behind the glass: a column of fire (fbm flames advected upward, a breathing core, a heat ramp black→red→
// orange→white). In front: vertical ribs of uneven width, each a little cylinder lens that squeezes and
// mirrors a wide slice of the fire, so one flame becomes dozens of molten bars. Rib edges catch a thin line
// of light even where the fire is far away — the red hairlines on the dark side.
float h11(float p){return fract(sin(p*127.1)*43758.5453);}
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vn(p);p=p*2.02+vec2(3.1,1.7);a*=.5;}return v;}

float LX;   // where the fire stands (screen x, 0..aspect)
// heat of the fire at a point (x in aspect units, y 0..1)
float fire(vec2 p){
  float A=r.x/r.y;
  vec2 q=p-vec2(LX,.5);
  q.x+=.22*q.y*q.y-.03;                   // the column bows like a lens, so the bars curve
  // tall soft body, wider at the bottom, breathing
  float breath=1.+.08*sin(t*.9)+.05*sin(t*2.3+1.);
  float w=.24*breath*(1.-1.5*q.y*q.y)*(1.+.12*sin(q.y*5.-t*.7));   // fattest mid-height → lens-shaped bars
  w=max(w,.02);
  float body=exp(-q.x*q.x/(w*w))*exp(-pow(q.y/.7,6.));
  // flames: fbm advected upward, sheared sideways, eating into the body's edges
  vec2 fp=vec2(q.x*5.,q.y*2.6-t*.55);
  float n=fbm(fp+vec2(fbm(fp*1.3+t*.2)*1.4,0.));
  float flame=body*(.55+.9*n);
  flame+=exp(-q.x*q.x/(w*w*.18))*exp(-q.y*q.y*1.6)*.35*(.8+.2*sin(t*1.7));   // hot core
  return flame;
}
vec3 ramp(float h){
  h=clamp(h,0.,1.6);
  vec3 c=vec3(0.);
  c=mix(c,vec3(.45,.03,.0),smoothstep(.05,.35,h));
  c=mix(c,vec3(1.,.32,.04),smoothstep(.3,.7,h));
  c=mix(c,vec3(1.,.72,.25),smoothstep(.65,1.,h));
  c=mix(c,vec3(1.,.96,.82),smoothstep(.95,1.4,h));
  return c;
}
void main(){
  float A=r.x/r.y;
  vec2 p=gl_FragCoord.xy/r.y;           // x 0..A, y 0..1
  LX=A*(.3+.05*sin(t*.13)+.03*sin(t*.31+2.))+(m.x-.5)*A*.25;
  // ribs: uneven widths, a little denser towards the right (like the glass is curving away)
  float x=p.x/A;
  float s=x*(26.+20.*x)+.9*sin(x*9.+.5)+.45*sin(x*23.)+.25*sin(x*51.);
  float id=floor(s), f=fract(s);
  // rib width in screen units → for the lens strength
  float ds=(30.+32.*x)/A;
  float cx=(id+.5-.6*sin(x*9.+.5)-.3*sin(x*23.));   // approx centre, in s units
  float wcol=1./ds;
  // the lens: each rib shows a mirrored slice of the fire, about 8 ribs wide, + a tiny per-rib jitter
  float spread=wcol*(6.+5.*h11(id));
  float xs=p.x-(f-.5)*spread+(h11(id+7.)-.5)*wcol*2.;
  // ribs also bend the image slightly vertically near their edges (cylinder lens isn't perfect)
  float ys=p.y+(f-.5)*(f-.5)*.06*(h11(id+3.)-.5);
  float heat=fire(vec2(xs,ys));
  // rib profile: bright core, dark seam between ribs
  float prof=smoothstep(0.,.18,f)*smoothstep(1.,.78,f);
  vec3 c=ramp(heat*.95)*mix(.06,1.,pow(prof,1.4));
  // the edge line: each rib's left edge catches light from the fire's general direction
  float edge=exp(-f*f*900.)+exp(-(1.-f)*(1.-f)*1600.)*.5;
  float far=fire(vec2(p.x,p.y))*.0+exp(-pow((p.x-LX)/(A*.55),2.))*exp(-pow((p.y-.5)/.55,4.));
  c+=vec3(1.,.22,.05)*edge*(.18+.9*far)*(.6+.4*h11(id+11.));
  // ember sparks drifting up through the glass
  vec2 g=vec2(p.x*38.,p.y*22.-t*1.4);
  vec2 gi=floor(g),gf=fract(g)-.5; float rs=h21(gi);
  float spark=step(.985,rs)*smoothstep(.12,0.,length(gf*vec2(1.,.5)))*exp(-pow((p.x-LX)/.35,2.));
  c+=vec3(1.,.6,.2)*spark*prof*(.5+.5*sin(t*6.+rs*40.));
  // heat shimmer in the brightest bars
  c*=1.+.06*sin(p.y*40.-t*5.+id)*smoothstep(.6,1.,heat);
  c+=(h21(gl_FragCoord.xy+fract(t*7.)*91.)-.5)*.015;
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
