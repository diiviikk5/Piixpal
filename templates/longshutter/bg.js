/* Longshutter — motion background
 * A long-exposure vortex: thousands of dashed light trails circling a funnel, in real 3D.
 * Usage: <canvas data-bg></canvas> inside any positioned container, then <script src="bg.js"></script>.
 * No canvas found → a fixed full-screen one is created behind the page.
 * Optional: <canvas data-bg data-focus=".66,.52"> moves the eye of the vortex (0..1 across, 0..1 up).
 */
(() => {
  let canvas = document.querySelector('canvas[data-bg]');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.setAttribute('data-bg', '');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block';
    document.body.prepend(canvas);
  }
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) { canvas.style.background = 'radial-gradient(60% 50% at 66% 52%,#16306e,#04060f 70%)'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });
  const DER = !!gl.getExtension('OES_standard_derivatives');   /* lets each trail know how wide a pixel is, so far rings never shimmer */

  const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const frag = `${DER ? '#extension GL_OES_standard_derivatives : enable\n#define DER 1\n' : ''}
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m; uniform vec2 o;
float h1(float n){return fract(sin(n*127.1)*43758.5453);}
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),u.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),u.x),u.y);}

/* the funnel: a wide dish that curls up at the rim and falls away into a throat */
float H(float q){return -.62/(q+.26)+.045*q*q;}

/* a star's colour on a long exposure: mostly blue-white, some amber and red, the odd green */
vec3 tint(float k){
  vec3 c=mix(vec3(.42,.6,1.),vec3(.86,.92,1.),smoothstep(0.,.45,k));
  c=mix(c,vec3(1.,.5,.2),smoothstep(.62,.72,k));
  c=mix(c,vec3(1.,.16,.1),smoothstep(.8,.9,k));
  c=mix(c,vec3(.3,1.,.75),smoothstep(.965,.985,k));
  return c;
}

/* hairlines: every ring has its own brightness and breaks into a few long arcs. When a pixel covers many of them they average out */
float fine(float u0,float th,float sc,float fw){
  float u=u0*sc,id=floor(u);
  float v=h1(id+sc);v=v*v*2.2;
  v*=.45+.55*smoothstep(.25,.6,vn(vec2(id*.71,th*1.3+id*.37)));
  return mix(v,.62,smoothstep(.35,1.3,fw*sc));
}

/* one family of concentric trails. u: ring coordinate, th: angle, q: radius, fw: how many rings a pixel spans */
vec3 trails(float u,float th,float q,float fw,float seed,float dens){
  float id=floor(u),f=fract(u)-.5;
  float a=h1(id+seed),b=h1(id*1.37+seed+9.),c=h1(id*2.11+seed+3.),d=h1(id*.73+seed+5.);
  if(a>dens)return vec3(0.);
  /* each ring turns at its own rate, faster toward the throat, like orbits */
  float w=(.05+.3*b)/pow(q+.12,1.5);
  float ph=th/6.2831853+t*w*.085+c;
  /* the shutter was open a while: every star drew an arc with a bright head and a fading tail */
  float n=1.+floor(d*3.);
  float arc=fract(ph*n);
  float len=.25+.7*h1(id+seed+21.);
  float tail=smoothstep(0.,len,arc)*smoothstep(len+.012,len,arc);
  tail*=tail;
  /* and many were pulsing, so the arc is a row of dots */
  float dots=1.;
  if(b>.3){float k=floor((22.+170.*c)*q+6.);float g=fract(ph*k);float duty=.3+.4*d;dots=smoothstep(0.,.1,g)*smoothstep(duty+.1,duty,g);}
  /* thickness: never thinner than a pixel, and it keeps the same light when a pixel swallows it */
  float w0=.1+.16*c*c;
  float wd=max(w0,fw*.6);
  float line=exp(-f*f/(wd*wd))*(w0/wd);
  float bright=.3+2.6*pow(d,5.)+.55*c;
  return tint(h1(id*3.3+seed+1.))*line*tail*dots*bright*smoothstep(1.6,.55,fw);
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
  vec2 foc=(o-.5)*vec2(r.x/r.y,1.);
  /* camera: above the dish, looking down into it; the pointer leans it a little */
  vec3 ro=vec3(-.3+(m.x-.5)*.45,1.32+(m.y-.5)*.3,-3.05);
  vec3 ta=vec3(.1,-.42,0.);
  vec3 ww=normalize(ta-ro),uu=normalize(cross(vec3(0.,1.,0.),ww)),vv=cross(ww,uu);
  vec3 rd=normalize((uv.x-foc.x)*uu+(uv.y-foc.y+.02)*vv+1.2*ww);

  /* march to the surface */
  float d=0.,hit=0.;vec3 p=ro;
  for(int i=0;i<90;i++){
    p=ro+rd*d;
    float q=length(p.xz),e=p.y-H(q);
    if(e<.0015*d){hit=1.;break;}
    d+=e*(q<.7?.22:.45);
    if(d>26.)break;
  }

  vec3 col=vec3(0.);
  if(hit>.5){
    float q=length(p.xz),th=atan(p.z,p.x);
    float u0=pow(q,.82);
#ifdef DER
    float fw=fwidth(u0);
#else
    float fw=.0018*d;
#endif
    /* three scales of trail: a few heavy ones, a field of fine ones, and dust */
    col+=trails(u0*46.,th,q,fw*46.,0.,.62)*1.15;
    col+=trails(u0*150.+7.3,th,q,fw*150.,40.,.5)*.85;
    col+=trails(u0*420.+3.1,th,q,fw*420.,80.,.4)*.6;

    /* where countless faint trails pile up they fuse into light: a white-hot band with a blue inside edge and an ember outside.
     * It is built from real hairlines (two scales of them), so up close you can still count the trails */
    float f1=fine(u0,th,300.,fw),f2=fine(u0,th,1150.,fw);
    float grain=.35*f1+.65*f2;
    float b1=exp(-pow((q-1.86)/.085,2.));
    float b2=exp(-pow((q-1.62)/.2,2.));
    float b3=exp(-pow((q-2.06)/.1,2.));
    float b4=exp(-pow((q-2.3)/.2,2.));
    /* the band is brightest on the near side, where the dish faces the lens */
    float near=.1+.9*smoothstep(.45,-.85,sin(th+.55));
    col+=(vec3(1.,1.,1.)*b1*3.4+vec3(.2,.42,1.)*b2*1.25+vec3(1.,.24,.08)*b3*1.9+vec3(.5,.05,.03)*b4*.9)*grain*near;
    /* a blue haze through the bowl, and the throat falls to black */
    col+=vec3(.02,.05,.17)*exp(-pow((q-1.15)/.8,2.))*(.3+.7*grain);
    col*=smoothstep(-1.9,-.3,p.y);
    col*=smoothstep(7.5,3.6,q);
  }

  /* loose stars out of focus in front of the lens: soft discs, thickest along the bottom */
  vec2 sp=gl_FragCoord.xy/r.y;
  for(int L=0;L<2;L++){
    float sc=L==0?7.:13.;
    vec2 g=sp*sc+vec2(t*.012*(L==0?1.:-.6),float(L)*5.3);
    vec2 ci=floor(g),cf=fract(g)-.5;
    float k=h2(ci+float(L)*17.);
    float low=smoothstep(.62,.0,uv.y+.5+.25*h2(ci+3.));
    if(k>.62&&low>0.){
      vec2 off=(vec2(h2(ci+1.),h2(ci+2.))-.5)*.6;
      float rad=(.035+.09*h2(ci+4.))*(L==0?1.:.6);
      float disc=smoothstep(rad,rad*.72,length(cf-off));
      float tw=.6+.4*sin(t*(.6+2.*h2(ci+6.))+k*40.);
      col+=tint(h2(ci+9.))*disc*low*tw*(L==0?.34:.6)*(.4+.6*h2(ci+7.));
    }
  }

  /* deep navy air, a touch darker at the corners */
  col+=vec3(.006,.012,.035);
  col*=1.-.35*dot(uv,uv);
  /* film response and a breath of grain so the gradients never band */
  col=1.-exp(-col*1.25);
  col=pow(col,vec3(.92));
  col+=(h2(gl_FragCoord.xy+fract(t)*91.)-.5)/255.*1.5;
  gl_FragColor=vec4(col,1.);
}`;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.bindAttribLocation(prog, 0, 'p');
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n), ur = U('r'), ut = U('t'), um = U('m'), uo = U('o');
  const focus = (canvas.dataset.focus || '.7,.55').split(',').map(Number);

  /* fine trails want real pixels: render at device resolution, capped so big screens stay smooth */
  const resize = () => {
    const P = /[?&]preview/.test(location.search) ? .6 : 1, dpr = Math.min(devicePixelRatio || 1, 2);
    let s = dpr * P; const px = canvas.clientWidth * canvas.clientHeight * s * s, CAP = 2.6e6;
    if (px > CAP) s *= Math.sqrt(CAP / px);
    canvas.width = Math.max(2, canvas.clientWidth * s); canvas.height = Math.max(2, canvas.clientHeight * s);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  new ResizeObserver(resize).observe(canvas); resize();

  let mx = .5, my = .5, tx = mx, ty = my, visible = true;
  addEventListener('pointermove', e => { const b = canvas.getBoundingClientRect(); tx = (e.clientX - b.left) / b.width; ty = 1 - (e.clientY - b.top) / b.height; });
  new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(canvas);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  const frame = now => {
    requestAnimationFrame(frame);
    if (!visible) return;
    mx += (tx - mx) * .03; my += (ty - my) * .03;
    gl.uniform2f(ur, canvas.width, canvas.height);
    gl.uniform1f(ut, canvas.time != null ? canvas.time : still ? 40 : 40 + (now - t0) / 1000);
    gl.uniform2f(um, mx, my);
    /* on a tall screen the eye moves up and to the middle, clear of the words */
    const tall = canvas.width < canvas.height * .8;
    gl.uniform2f(uo, tall ? .56 : focus[0], tall ? .76 : focus[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  requestAnimationFrame(frame);
})();
