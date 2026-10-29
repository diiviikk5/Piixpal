/* Cloudline — motion background
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
  if (!gl) { canvas.style.background = 'linear-gradient(180deg,#5d6fae,#c9b7cf 40%,#ffd2bb 55%,#fff1ea 62%,#d4c4d6)'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });   /* free the GPU context when the page/iframe goes away */

  const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const frag = `
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m;
// Volumetric cloud sea at dawn: density from 3D fbm shaped into a layer, light marched toward the sun
// (Beer-Lambert + powder), Henyey-Greenstein phase for the silver lining, distance fog into the sky.
float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p,int o){float v=0.,a=.5;for(int i=0;i<5;i++){if(i>=o)break;v+=a*n3(p);p=p*2.03+vec3(.31,.71,.13);a*=.5;}return v;}
vec3 SUN;
float dens(vec3 p,int o){
  vec3 q=p*vec3(.55,.9,.55)+vec3(t*.04,0.,t*.03);
  float cover=n3(vec3(p.xz*.09,t*.01))*.7+n3(vec3(p.xz*.21,3.))*.3;   // cloud banks vs open gaps
  float n=fbm(q,o);
  float top=.6+1.2*cover;                                              // taller cumulus where cover is high
  float prof=smoothstep(0.,.3,p.y)*smoothstep(top,top-.55,p.y);
  return clamp((n*prof+cover*.35-.52)*5.,0.,1.);
}
vec3 sky(vec3 d){
  float y=max(d.y,0.);
  vec3 c=mix(vec3(1.,.74,.62),vec3(.55,.62,.86),pow(y,.5));
  c=mix(c,vec3(.24,.32,.6),smoothstep(.35,1.,y));
  float s=max(dot(d,SUN),0.);
  c+=vec3(1.,.72,.48)*pow(s,8.)*.5+vec3(1.,.9,.75)*smoothstep(.9993,.9996,s)*3.;
  return c;
}
float hg(float c,float g){float g2=g*g;return (1.-g2)/(4.*3.14159*pow(1.+g2-2.*g*c,1.5));}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
  SUN=normalize(vec3(.55,.16,-1.));
  float yaw=(m.x-.5)*.35+.08*sin(t*.05);
  vec3 ro=vec3(0.,2.3+.06*sin(t*.3),-t*1.1);
  vec3 rd=normalize(vec3(uv.x,uv.y-.16+(m.y-.5)*.1,-1.35));
  rd=vec3(rd.x*cos(yaw)+rd.z*sin(yaw),rd.y,-rd.x*sin(yaw)+rd.z*cos(yaw));
  vec3 bg=sky(rd);
  // intersect the cloud slab y in [0,1.9]
  float t0=0., t1=0.;
  if(rd.y<-.001){ t0=max((2.-ro.y)/rd.y,0.); t1=min((0.-ro.y)/rd.y,40.); }
  vec3 col=vec3(0.); float T=1.;
  if(t1>t0){
    const int N=56;
    float dt=(t1-t0)/float(N);
    float tt=t0+dt*h31(vec3(gl_FragCoord.xy,fract(t)*7.));
    float cosA=dot(rd,SUN);
    float ph=mix(hg(cosA,.55),hg(cosA,-.2),.35)*6.;
    for(int i=0;i<N;i++){
      vec3 p=ro+rd*tt;
      float dist=tt;
      int oct=dist<14.?5:3;
      float d=dens(p,oct);
      if(d>.01){
        float ld=0.;
        for(int j=1;j<=4;j++)ld+=dens(p+SUN*float(j)*.24,3);
        float light=exp(-ld*1.5)*(1.-exp(-d*4.));          // Beer + powder
        vec3 amb=mix(vec3(.36,.38,.55),vec3(.95,.86,.86),smoothstep(0.,1.6,p.y));
        vec3 sc=amb*.5+vec3(1.,.8,.6)*light*ph*1.5;
        float a=1.-exp(-d*dt*4.);
        // aerial perspective: distant clouds melt into the horizon colour
        float fog=1.-exp(-dist*.035);
        sc=mix(sc,sky(vec3(rd.x,.02,rd.z)),fog);
        col+=T*a*sc; T*=1.-a;
        if(T<.02)break;
      }
      tt+=dt;
    }
  }
  col+=T*bg;
  // sun bloom through everything
  col+=vec3(1.,.8,.6)*pow(max(dot(rd,SUN),0.),40.)*.25;
  col=col/(1.+col*.32)*1.22;              // soft shoulder: keep the sunlit tops from clipping
  col=pow(col,vec3(.95));
  vec2 q=gl_FragCoord.xy/r;
  col*=1.-.22*dot(q-.5,q-.5)*2.;
  col+=(h31(vec3(gl_FragCoord.xy,fract(t)))-.5)*.012;
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

  const SCALE = 0.5; // render scale vs CSS pixels — lower = faster, softer
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
