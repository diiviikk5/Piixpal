/* Signal — motion background
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
  if (!gl) { canvas.style.background = 'radial-gradient(30% 45% at 62% 50%,#3a3d55,#000 70%)'; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });   /* free the GPU context when the page/iframe goes away */

  const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const frag = `
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m;
// Signal — a human profile made of live code.
// A head-and-shoulders silhouette (smooth-union SDF) is rendered as rows of tiny glyphs that re-roll as
// you watch. It is lit like a 3D bust (normal from the SDF gradient). Colour runs through it in bands
// (white, cyan, magenta, amber, ultramarine). Rows slide sideways in glitch bursts, some rows smear into
// pixel-sorted streaks, and the back of the head dissolves into glyphs carried off by the wind.
float h11(float p){return fract(sin(p*127.1)*43758.5453);}
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vn(p);p=p*2.03+vec2(1.3,7.1);a*=.5;}return v;}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float ell(vec2 p,vec2 c,vec2 rr){vec2 q=(p-c)/rr;return (length(q)-1.)*min(rr.x,rr.y);}

// the bust, facing right. units: frame height = 1, origin at the bust's centre
float bust(vec2 p){
  float d=ell(p,vec2(-.03,.2),vec2(.2,.23));                  // cranium
  d=smin(d,ell(p,vec2(.08,.08),vec2(.13,.19)),.06);           // face
  d=smin(d,ell(p,vec2(.205,.07),vec2(.035,.03)),.03);         // nose
  d=smin(d,ell(p,vec2(.17,-.03),vec2(.05,.035)),.03);         // lips
  d=smin(d,ell(p,vec2(.1,-.1),vec2(.1,.07)),.05);             // jaw + chin
  vec2 q=p-vec2(.0,-.22); q.x+=q.y*.35;
  d=smin(d,max(abs(q.x)-.1,abs(q.y)-.16),.06);                // neck, leaning forward
  d=smin(d,ell(p,vec2(-.1,-.62),vec2(.5,.3)),.09);            // shoulders
  return d;
}
void main(){
  float A=r.x/r.y;
  vec2 fc=gl_FragCoord.xy;
  // glyph grid in px
  float cw=max(4.,floor(r.y/150.)), ch=cw*1.6;
  float row=floor(fc.y/ch);
  // glitch bursts: every ~0.6 s some rows jump sideways
  float burst=floor(t*1.7);
  float hr=h21(vec2(row,burst));
  float bOn=step(.82,h11(burst*3.1));                          // is this moment a burst?
  float shift=(hr-.5)*step(.7,hr)*(.04+.12*bOn)*r.y;
  shift+=sin(row*.37+t*.6)*1.5;                                // tiny always-on wobble
  vec2 sp=fc+vec2(shift,0.);
  vec2 cell=floor(sp/vec2(cw,ch)), cf=fract(sp/vec2(cw,ch));
  vec2 cc=(cell+.5)*vec2(cw,ch);                               // cell centre px
  // bust space (pointer turns it a hair)
  vec2 p=(cc-vec2(r.x*.62,r.y*.55))/r.y;
  p.x-=(m.x-.5)*.03; p.y-=(m.y-.5)*.02;
  float d=bust(p);
  // pixel-sort streaks: some rows smear the silhouette out to the left
  float sr=h21(vec2(row,floor(t*.5)+9.));
  float streak=0.;
  if(sr>.8){
    float len=(.08+.3*h11(row+3.))*(.6+.4*sin(t*.8+row));
    float ds=bust(p+vec2(len,0.));
    // the smear: solid dashes trailing left of the silhouette edge
    float dash=step(.3,h21(vec2(floor(sp.x/(cw*(1.+2.*h11(row)))),row+floor(t*3.))));
    float thin=step(.25,cf.y)*step(cf.y,.7);                  // dashes are thinner than a glyph row
    streak=step(ds,0.)*step(0.,d)*dash*thin*exp(-d*9.);
  }
  // dissolve: the back of the head erodes into the wind
  float back=smoothstep(.0,-.3,p.x);
  vec2 wp=p*vec2(6.,12.)+vec2(t*.9,0.);
  float erode=(fbm(wp)-.45)*.12*back;
  float inside=step(d+erode,0.);
  // stray glyphs blown off to the left and up
  float stray=step(.93,h21(cell+floor(t*4.)))*smoothstep(.16,.0,d)*back*step(0.,d);
  float cover=max(inside,stray*.8);
  // the glyph itself: a 3x5 bitmap that re-rolls at its own pace
  vec2 g=floor(cf*vec2(4.,6.))-vec2(.5,.5);
  float bit=0.;
  if(g.x>=0.&&g.x<3.&&g.y>=0.&&g.y<5.){
    float roll=floor(t*(2.+6.*h21(cell))+h21(cell*1.7)*9.);
    bit=step(.45,h21(cell*.93+g*7.1+roll));
  }
  // some cells are solid blocks (denser data where it's bright)
  // lighting: a 3D-ish normal from the SDF gradient
  float e=.004;
  vec2 gr=vec2(bust(p+vec2(e,0.))-bust(p-vec2(e,0.)),bust(p+vec2(0.,e))-bust(p-vec2(0.,e)))/(2.*e);
  float depth=clamp(-d*7.,0.,1.);
  vec3 n=normalize(vec3(gr*(1.-depth),.35+depth));
  vec3 L=normalize(vec3(.6,.5,.65));
  float lit=clamp(dot(n,L),0.,1.)*.7+.38;
  lit*=.55+.45*smoothstep(-.45,.0,p.y-(-.35));                 // shoulders brightest at the bottom-left
  float rim=pow(1.-clamp(depth*3.,0.,1.),3.)*.6;
  // colour bands drifting through
  float hue=fbm(p*vec2(2.5,4.)+vec2(0.,t*.05))*1.4+p.y*.6;
  vec3 c1=vec3(.25,.85,1.), c2=vec3(1.,.3,.75), c3=vec3(1.,.72,.3), c4=vec3(.3,.4,1.);
  vec3 col=mix(c1,c2,smoothstep(.2,.45,fract(hue)));
  col=mix(col,c3,smoothstep(.5,.7,fract(hue)));
  col=mix(col,c4,smoothstep(.75,.95,fract(hue)));
  // most of the bust is white/grey; colour shows in bands
  float sat=smoothstep(.45,.75,fbm(p*3.+vec2(t*.04,0.)+5.));
  col=mix(vec3(.95),col,clamp(sat*1.15,0.,1.));
  float block=step(.93,h21(cell+floor(t*2.)))*lit;
  float on=max(bit,block);
  vec3 c=col*(lit+rim)*on*cover;
  // pixel-sort streaks in vivid colour
  vec3 sc=h11(row*1.7)<.33?c1:h11(row*1.7)<.66?c2:c3;
  c=max(c,sc*streak*(.75+.25*h11(row+burst))*(.55+.45*bit));
  // the bright bottom-left shoulder washes out like the reference
  c+=vec3(.9,.92,1.)*on*cover*smoothstep(-.3,-.75,p.y)*smoothstep(.1,-.4,p.x)*.5;
  // faint scanline + film grain on black
  c*=.92+.08*sin(fc.y*3.14159/ch*2.);
  c+=(h21(fc+fract(t*7.)*91.)-.5)*.02;
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
