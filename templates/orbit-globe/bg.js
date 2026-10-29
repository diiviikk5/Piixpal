/* Orbit — motion background
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
  if (!gl) { canvas.style.background = 'radial-gradient(45% 60% at 75% 70%,#0e2550,#03060f 70%)'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });   /* free the GPU context when the page/iframe goes away */

  const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const frag = `
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m;
// Dotted globe: analytic sphere, latitude-balanced dot grid, procedural continents, atmosphere,
// and great-circle data arcs with comet heads (hidden behind the planet), endpoint pulses.
const float PI=3.14159265;
const float F=1.55;   // focal length
float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float land(vec3 p){float v=n3(p*2.6+2.)*.55+n3(p*5.2+7.)*.3+n3(p*10.+3.)*.15;return smoothstep(.455,.485,v)*smoothstep(.97,.8,abs(p.y));}
mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
vec3 ll(float la,float lo){la*=PI/180.;lo*=PI/180.;return vec3(cos(la)*sin(lo),sin(la),cos(la)*cos(lo));}
void ends(int k,out vec3 A,out vec3 B){
  if(k==0){A=ll(38.,-110.);B=ll(50.,5.);}
  else if(k==1){A=ll(50.,5.);B=ll(14.,75.);}
  else if(k==2){A=ll(14.,75.);B=ll(-2.,112.);}
  else if(k==3){A=ll(-2.,112.);B=ll(36.,140.);}
  else if(k==4){A=ll(40.,-75.);B=ll(-20.,-48.);}
  else{A=ll(50.,5.);B=ll(-25.,25.);}
}
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-6),0.,1.);return length(pa-ba*h);}
vec2 proj(vec3 V){return V.xy*F/(3.2-V.z);}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
  float sa=r.x/r.y;
  vec2 u=uv-(sa>1.2?vec2(.42,-.1):vec2(0.,-.28));
  float rotA=t*.07+(m.x-.5)*.7, tilt=.38+(m.y-.5)*.3;
  mat3 R=rotX(tilt)*rotY(rotA);
  vec3 ro=vec3(0.,0.,3.2), rd=normalize(vec3(u,-F));

  // background: deep navy, faint stars
  vec3 col=mix(vec3(.01,.015,.035),vec3(.02,.03,.07),uv.y+.5);
  vec2 gc=gl_FragCoord.xy/6.; vec2 gi=floor(gc), gf=fract(gc)-.5;
  float st=step(.985,h31(vec3(gi,1.)));
  col+=vec3(.75,.85,1.)*st*smoothstep(.18,.0,length(gf))*(.3+.5*h31(vec3(gi,2.)))*(.7+.3*sin(t*2.+h31(vec3(gi,3.))*20.));

  float b=dot(ro,rd), c=dot(ro,ro)-1., disc=b*b-c;
  float dmin=length(ro-rd*b);
  // atmosphere halo
  col+=vec3(.25,.55,1.)*exp(-max(dmin-1.,0.)*14.)*.55*step(1.,dmin);
  if(disc>0.){
    float tt=-b-sqrt(disc);
    vec3 pv=ro+rd*tt, po=pv*R;                     // view → object (v*R = transpose(R)*v)
    float facing=max(dot(pv,-rd),0.);
    float lat=asin(clamp(po.y,-1.,1.)), lon=atan(po.x,po.z);
    const float ROWS=90.;
    float row=floor((lat+PI*.5)/PI*ROWS);
    float latc=(row+.5)/ROWS*PI-PI*.5;
    float cnt=max(1.,floor(2.*ROWS*cos(latc)));
    float li=floor((lon+PI)/(2.*PI)*cnt);
    float lonc=(li+.5)/cnt*2.*PI-PI;
    vec3 dc=vec3(cos(latc)*sin(lonc),sin(latc),cos(latc)*cos(lonc));
    float dotR=PI/ROWS*.3;
    float dm=smoothstep(dotR,dotR*.45,length(po-dc));
    float L=land(dc);
    vec3 base=vec3(.012,.025,.055)+vec3(.05,.12,.3)*pow(1.-facing,2.5);   // dark sphere with blue limb
    vec3 dcol=mix(vec3(.15,.25,.45)*.22,vec3(.62,.86,1.),L);
    col=base+dcol*dm*(.25+.75*facing);
    // a slow scan band of light sweeping across the land
    float scan=exp(-pow(sin(lon*.5-t*.25)*6.,2.));
    col+=vec3(.4,.8,1.)*dm*L*scan*.5;
  }
  // arcs
  for(int k=0;k<6;k++){
    vec3 A,B; ends(k,A,B);
    float ang=acos(clamp(dot(A,B),-1.,1.));
    float ph=fract(t*.16+float(k)*.173)*1.5;            // 0..1 travel, then a pause
    vec2 pv=vec2(0.); float pvis=0.;
    float acc=0.;
    for(int j=0;j<=26;j++){
      float s=float(j)/26.;
      vec3 P=normalize(mix(A,B,s))*(1.+.14*ang*sin(PI*s));
      vec3 V=R*P;
      vec2 sp=proj(V);
      float vis=(V.z>-.05||length(V.xy)>1.)?1.:0.;
      if(j>0){
        float w=smoothstep(ph-.5,ph,s)*step(s,ph)*vis*pvis;
        float d=seg(u,pv,sp);
        acc+=w*(smoothstep(.005,.0,d)*1.1+exp(-d*90.)*.3);
      }
      pv=sp; pvis=vis;
    }
    vec3 ac=mix(vec3(1.,.45,.85),vec3(.45,.95,1.),fract(float(k)*.37));
    col+=ac*acc;
    // pulses where an arc lands
    vec3 VB=R*B;
    if(VB.z>0.){
      float d=length(u-proj(VB));
      float land_=smoothstep(.85,1.,ph)*smoothstep(1.4,1.,ph);
      float rr=fract(t*.8+float(k))*.045;
      col+=ac*(smoothstep(.003,.0,abs(d-rr))*(1.-rr/.045)+smoothstep(.006,.002,d))*(.35+land_);
    }
  }
  vec2 q=gl_FragCoord.xy/r;
  col*=1.-.3*dot(q-.5,q-.5);
  col=1.-exp(-col*1.3);
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

  const SCALE = 0.85; // render scale vs CSS pixels — lower = faster, softer
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
