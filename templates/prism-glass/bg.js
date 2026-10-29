/* Prism Glass — motion background
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
  if (!gl) { canvas.style.background = 'radial-gradient(30% 40% at 30% 30%,#ffc9bb,transparent),radial-gradient(30% 40% at 80% 60%,#c9c3ff,transparent),#f2f1f8'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });   /* free the GPU context when the page/iframe goes away */

  const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const frag = `
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m;
// Refractive glass: twisted rounded-square torus. Ray enters, refracts (per-channel IOR = dispersion),
// marches through the glass, exits, and samples the backdrop â€” so the grid and colours bend and split.
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
mat3 R;
float map(vec3 p){
  p=R*p;
  float a=atan(p.z,p.x);
  vec2 q=vec2(length(p.xz)-1.,p.y);
  // a soft square-ish cross-section that slowly rolls around the ring - glass catches light differently as it turns
  q=rot(a+t*.4)*q;
  float rr=.36+.035*sin(a*3.+t*.6);
  vec2 k=abs(q); float sq=pow(pow(k.x,3.)+pow(k.y,3.),1./3.);   // superellipse
  return (sq-rr)*.85;
}
vec3 nrm(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
// the backdrop: pastel blobs + a fine grid on a plane behind the object
vec3 back(vec3 ro,vec3 rd){
  float s=(-2.5-ro.z)/rd.z;
  vec2 p=ro.xy+rd.xy*s;
  vec3 c=mix(vec3(.95,.94,.98),vec3(.9,.9,.97),p.y*.1+.5);
  vec2 b1=vec2(-1.6+.4*sin(t*.2),1.1), b2=vec2(1.8,-.6+.4*cos(t*.17)), b3=vec2(.2+.6*sin(t*.13),-1.6);
  c=mix(c,vec3(1.,.62,.5),exp(-dot(p-b1,p-b1)*.35)*.85);
  c=mix(c,vec3(.6,.55,1.),exp(-dot(p-b2,p-b2)*.3)*.85);
  c=mix(c,vec3(.45,.95,.8),exp(-dot(p-b3,p-b3)*.4)*.7);
  vec2 g=abs(fract(p*1.6)-.5);
  c*=1.-.07*smoothstep(.47,.5,max(g.x,g.y));
  return c;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
  float sa=r.x/r.y;
  uv-=sa>1.2?vec2(.32,0.):vec2(0.,.12);
  float ay=t*.18+(m.x-.5)*.9, ax=1.05+.15*sin(t*.23)+(m.y-.5)*.5;
  R=mat3(1.,0.,0.,0.,cos(ax),sin(ax),0.,-sin(ax),cos(ax))*mat3(cos(ay),0.,-sin(ay),0.,1.,0.,sin(ay),0.,cos(ay));
  vec3 ro=vec3(0.,0.,7.), rd=normalize(vec3(uv,-1.9));
  float d=0., hit=0.;
  for(int i=0;i<90;i++){float h=map(ro+rd*d);if(h<.001){hit=1.;break;}d+=h;if(d>12.)break;}
  vec3 col=back(ro,rd);
  if(hit>.5){
    vec3 p=ro+rd*d, n=nrm(p);
    float fr=.04+.96*pow(1.-max(dot(n,-rd),0.),4.);
    vec3 refr=vec3(0.);
    for(int ch=0;ch<3;ch++){
      float ior=1.45+float(ch)*.035;                 // R < G < B: dispersion
      vec3 rd2=refract(rd,n,1./ior);
      vec3 q=p-n*.01; float dd=0.;
      for(int i=0;i<56;i++){float h=-map(q+rd2*dd);if(h<.0007)break;dd+=max(h,.004);}
      vec3 pe=q+rd2*dd, ne=-nrm(pe);
      vec3 rd3=refract(rd2,ne,ior);
      if(dot(rd3,rd3)<.01)rd3=reflect(rd2,ne);         // total internal reflection
      vec3 bc=back(pe,rd3);
      refr[ch]=ch==0?bc.r:ch==1?bc.g:bc.b;
          }
    refr*=vec3(.97,.98,1.)*(.92+.08*exp(-d*.0));
    vec3 refl=mix(vec3(.85,.86,.95),vec3(1.),smoothstep(-.2,.8,reflect(rd,n).y));
    col=mix(refr,refl,fr);
    col+=vec3(1.)*pow(max(dot(reflect(rd,n),normalize(vec3(-.4,.7,.6))),0.),80.)*.9;
  }
  // soft contact shadow on the backdrop under the object
  else{ vec2 sp=uv-vec2(.0,-.62); col*=1.-.12*exp(-dot(sp*vec2(.7,3.),sp*vec2(.7,3.))*2.); }
  col+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.01;
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
