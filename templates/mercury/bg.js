/* Mercury — motion background
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
  if (!gl) { canvas.style.background = 'radial-gradient(40% 50% at 50% 50%,#2b1a5c,#030305)'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });   /* free the GPU context when the page/iframe goes away */

  const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const frag = `
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m;
// Raymarched liquid chrome: five metaballs + one that follows the cursor, reflecting a procedural studio.
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
vec3 C(float i){return vec3(sin(t*.45+i*1.7)*.95,cos(t*.37+i*2.3)*.5,sin(t*.29+i*.9)*.45);}
vec3 MP;
float map(vec3 p){
  float d=length(p-C(0.))-.56;
  d=smin(d,length(p-C(1.))-.42,.6);
  d=smin(d,length(p-C(2.))-.5,.6);
  d=smin(d,length(p-C(3.))-.36,.6);
  d=smin(d,length(p-C(4.))-.3,.6);
  d=smin(d,length(p-MP)-.34,.75);
  return d;
}
vec3 nrm(vec3 p){vec2 e=vec2(.0015,0.);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
// studio environment: two softboxes, a top strip, coloured bounce from either side
vec3 env(vec3 d){
  // chrome reads as chrome when it mirrors a bright sky, a crisp horizon and a dark floor
  vec3 sky=mix(vec3(.22,.23,.3),vec3(1.,1.,1.02),pow(smoothstep(.0,.85,d.y),1.6));
  vec3 flr=mix(vec3(.02,.02,.03),vec3(.1,.09,.12),smoothstep(-1.,-.05,d.y));
  vec3 c=mix(flr,sky,smoothstep(-.03,.03,d.y));
  c+=vec3(1.)*smoothstep(.06,.0,abs(d.x-.42))*smoothstep(.05,.5,d.y)*1.2;      // softbox right
  c+=vec3(1.)*smoothstep(.1,.0,abs(d.x+.5))*smoothstep(.1,.6,d.y)*.8;          // softbox left
  c=mix(c,vec3(.03,.03,.05),smoothstep(.06,.0,abs(d.x-.05))*smoothstep(.2,.7,d.y)*.85);   // dark flag splits the sky
  c+=vec3(.5,.3,1.)*smoothstep(.3,1.,-d.x)*smoothstep(.1,-.5,d.y)*.9;          // violet bounce
  c+=vec3(1.,.45,.25)*smoothstep(.3,1.,d.x)*smoothstep(.1,-.6,d.y)*.6;         // warm bounce
  return c;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
  MP=vec3((m-.5)*vec2(r.x/r.y,1.)*3.,.25);
  vec3 ro=vec3(0.,0.,5.4), rd=normalize(vec3(uv,-1.8));
  float d=0., glow=0., hit=0.;
  for(int i=0;i<90;i++){
    vec3 p=ro+rd*d;
    float h=map(p);
    glow+=exp(-h*9.)*.012;
    if(h<.001){hit=1.;break;}
    d+=h*.9;
    if(d>11.)break;
  }
  // background: near-black with a soft violet bloom behind the metal
  vec2 q=gl_FragCoord.xy/r;
  vec3 col=vec3(.012,.012,.018)+vec3(.16,.08,.38)*exp(-dot(uv,uv)*2.6)*.35;
  col+=vec3(.5,.4,1.)*glow*.25;
  if(hit>.5){
    vec3 p=ro+rd*d, n=nrm(p), v=-rd;
    float ndv=max(dot(n,v),0.);
    float fr=.8+.2*pow(1.-ndv,3.);
    vec3 refl=env(reflect(rd,n));
    vec3 film=.5+.5*cos(6.2831*(ndv*1.4+vec3(0.,.33,.67)+t*.04));   // thin-film iridescence
    col=refl*fr*mix(vec3(1.),film,.22);
    col+=vec3(1.)*pow(max(dot(reflect(rd,n),normalize(vec3(.4,.6,.7))),0.),60.)*1.5;
    col*=.85+.15*smoothstep(-1.,1.,n.y);
  }
  col=1.-exp(-col*1.25);
  col*=1.-.35*dot(q-.5,q-.5)*2.;
  col+=(fract(sin(dot(gl_FragCoord.xy+fract(t),vec2(12.9898,78.233)))*43758.5453)-.5)*.012;
  gl_FragColor=vec4(col,1.);
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

  const SCALE = 0.75; // render scale vs CSS pixels — lower = faster, softer
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
