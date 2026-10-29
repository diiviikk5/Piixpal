/* Respite — motion background (your image, animated)
 * Usage: <canvas data-bg></canvas> inside any positioned container, then <script src="bg.js"></script>.
 * Keep scene.jpg + maps.png next to this file. Serve over http(s) — browsers block textures from file://.
 * Optional: <canvas data-bg data-focus="x,y"> picks which part of the image stays in view when cropped (0..1).
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
  const focus = (canvas.dataset.focus || '.5,.5').split(',').map(Number);
  // instant poster: the still image shows until the first animated frame is ready (and stays if WebGL2 is missing)
  canvas.style.background = `url(${base}scene.jpg) ${focus[0] * 100}% ${100 - focus[1] * 100}% / cover no-repeat`;
  const gl = canvas.getContext('webgl2', { antialias:false, alpha:false });
  if (!gl) return;
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });   /* free the GPU context when the page/iframe goes away */

  const vert = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const frag = `#version 300 es
precision highp float;
uniform sampler2D img;   // the scene image
uniform sampler2D maps;  // per-template maps (R = depth, white = near)
uniform sampler2D sky;   // optional clean background plate
uniform vec2 r;          // canvas size, px
uniform float t;         // seconds
uniform vec2 m;          // pointer 0..1, smoothed
uniform vec2 o;          // focus point in the image 0..1
uniform float ia;        // image aspect (w/h)
out vec4 fragColor;

// screen uv (0..1, y up) → image uv, cover-fit around focus o. zoom > 1 crops in a little,
// leaving margin so displacement/parallax never reveals an edge.
vec2 cover(vec2 uv,float zoom){
  float sa=r.x/r.y;
  vec2 s=sa>ia?vec2(1.,ia/sa):vec2(sa/ia,1.);
  s/=zoom;
  vec2 c=clamp(o,s*.5,1.-s*.5);
  return c+(uv-.5)*s;
}
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
// Liquid drift for soft gradient photos: the image's own pixels flow along a slow, smooth field.
float dn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
// curl of a noise potential → divergence-free flow (no pinching, looks like liquid)
vec2 curl(vec2 p){
  float e=.05;
  float n1=dn(p+vec2(0.,e)),n2=dn(p-vec2(0.,e)),n3=dn(p+vec2(e,0.)),n4=dn(p-vec2(e,0.));
  return vec2(n1-n2,-(n3-n4))/(2.*e);
}
// iu: image uv. amp ~ .02–.06, speed ~ .02–.06
vec2 drift(vec2 iu,float amp,float speed){
  float T=t*speed;
  vec2 q=iu*1.6;
  vec2 f=curl(q+vec2(T,T*.6))*.6+curl(q*2.1-vec2(T*.8,-T*1.1))*.4;
  iu+=f*amp*.18;
  // a second, slower sway of the whole field
  iu+=vec2(sin(T*1.3+iu.y*3.),cos(T*1.1+iu.x*2.5))*amp*.25;
  // pointer gently pushes the colour away
  vec2 mp=m; vec2 d=(gl_FragCoord.xy/r-mp)*vec2(r.x/r.y,1.);
  iu+=d*exp(-dot(d,d)*7.)*amp*.9;
  return iu;
}
// sample with optional blur (mip bias) — gradients with baked grain read cleaner blurred, then fresh grain on top
vec3 soft(vec2 iu,float lod){return textureLod(img,iu,lod*.2).rgb;}   // near-full detail: the image is the hero
vec3 grain(vec3 c,float amt){return c+(hash(gl_FragCoord.xy+fract(t*7.)*91.)-.5)*amt*.55;}   // light dither only
// Respite — the resting knight, as a floating card on a soft blur of its own world.
// In the card: canopy sways, dappled light slides over trunk and armour, clouds drift, the meadow bends in waves
// of wind, butterflies flit, the sword catches a glint, two birds wheel. Outside: the scene, blurred and breathing.
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
float rbox(vec2 p,vec2 b,float rr){vec2 q=abs(p)-b+rr;return length(max(q,0.))+min(max(q.x,q.y),0.)-rr;}
float butterfly(vec2 q,float s,float ph){
  q/=s;
  float flap=.25+.75*abs(sin(ph));                          // wings open and close
  vec2 w=vec2(abs(q.x)/max(flap,.08),q.y);
  float up=length((w-vec2(.55,.28))*vec2(1.,1.25))-.42;    // forewing
  float lo=length((w-vec2(.42,-.25))*vec2(1.,1.1))-.3;     // hindwing
  float body=length(q*vec2(5.,1.))-.35;
  return smoothstep(.06,-.06,min(min(up,lo),body));
}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  float SA=r.x/r.y;
  vec2 cam=(m-.5)*vec2(.02,.014)+vec2(sin(t*.11),sin(t*.083+1.))*.004;
  // backdrop: the same picture, very soft, slowly breathing
  vec2 bu=cover(uv,1.15+.03*sin(t*.07))+cam*.5;
  vec3 c=textureLod(img,bu,6.5).rgb;
  c=mix(c,vec3(.95,.95,.9),.58)+vec3(-.01,0.,.01);         // a light pastel wash of its own colours
  // the card: full height minus a margin, right side on wide screens, centred on tall ones
  float H=.9, W=H*ia;
  vec2 ctr=SA>1.2?vec2(SA-W*.5-.06*SA*.5,.5):vec2(SA*.5,.5);
  vec2 pp=uv*vec2(SA,1.)-ctr;
  float d=rbox(pp,vec2(W,H)*.5,.018);
  // soft drop shadow under the card
  c*=1.-.45*smoothstep(.06,-.01,d-.01+pp.y*.02);
  vec2 iu=pp/vec2(W,H)+.5+cam;
  iu=(iu-.5)/1.03+.5;
  if(d<.002){
    float t1=t;
    vec3 b0=textureLod(img,iu,2.).rgb;
    float green=smoothstep(.04,.15,b0.g-max(b0.r,b0.b)*.9);
    float sky=smoothstep(.06,.2,b0.b-b0.r)*smoothstep(.45,.85,iu.y)*step(.24,iu.x);
    float cloud=sky*smoothstep(.65,.85,lum(b0))+smoothstep(.75,.9,lum(b0))*smoothstep(.55,.75,iu.y)*step(.24,iu.x);
    // canopy (top) sways, more at the tips
    float canopy=green*smoothstep(.72,.95,iu.y);
    vec2 sw=vec2(sin(t1*1.1+iu.x*7.)*.003+sin(t1*2.3+iu.y*19.)*.0012,sin(t1*1.4+iu.x*9.)*.0012)*canopy;
    // clouds drift and slowly reshape
    vec2 cd=(drift(iu,.03,.025)-iu)*min(cloud,1.)+vec2(.002*sin(t1*.05),0.)*cloud;
    // the meadow: travelling waves of wind, flower heads move more than stems
    float meadow=smoothstep(.36,.18,iu.y);
    float wave=sin(iu.x*14.-t1*1.6+sin(iu.y*30.)*.5)*.6+sin(iu.x*31.+t1*2.4)*.4;
    vec2 mw=vec2(wave*.0028,abs(wave)*.0006)*meadow*(.5+.5*smoothstep(.36,.05,iu.y));
    vec2 q=iu+sw+cd+mw;
    vec3 col=texture(img,clamp(q,.001,.999)).rgb;
    // dappled light sliding over the trunk, the knight and the grass under the tree
    vec2 dp=q*vec2(9.,14.)+vec2(t1*.12,t1*.05);
    float dap=smoothstep(.45,.75,dn(dp)*.65+dn(dp*2.2+3.)*.35);
    float under=smoothstep(.85,.55,q.x+(q.y-.5)*.3)*smoothstep(.05,.2,q.y)*smoothstep(.8,.6,q.y)*(1.-sky);
    col*=1.+under*(dap-.45)*.42;
    // the sword's guard catches the light
    vec2 gp=(q-vec2(.085,.6))*vec2(ia,1.);
    float star=exp(-length(gp)*90.)+exp(-abs(gp.x)*600.-abs(gp.y)*45.)+exp(-abs(gp.y)*600.-abs(gp.x)*45.);
    col+=vec3(1.,.92,.7)*star*(.35+.65*pow(.5+.5*sin(t1*.9),6.));
    // butterflies flitting near the knight
    for(int i=0;i<3;i++){
      float k=float(i);
      vec2 bp=vec2(.55+.25*sin(t1*.21+k*2.1)+.06*sin(t1*.9+k*5.),.62+.12*sin(t1*.17+k*1.3)+.04*sin(t1*1.3+k));
      vec2 bq=(q-bp)*vec2(ia,1.);
      float b=butterfly(bq,.011+.003*k,t1*(14.+k*3.));
      col=mix(col,mix(vec3(1.,.55,.12),vec3(.12,.06,.04),smoothstep(.5,1.,length(bq)/(.011+.003*k))),b);
    }
    // two birds wheeling above the towers
    for(int i=0;i<2;i++){
      float k=float(i);
      vec2 bp=vec2(.8+.12*cos(t1*.3+k*3.),.86+.05*sin(t1*.4+k*2.));
      vec2 bd=(q-bp)*vec2(ia,1.)/.008; bd.x=abs(bd.x);
      float fl=sin(t1*8.+k*2.)*.6, y=bd.x*(.35+fl)-bd.x*bd.x*(.6+fl*.8);
      col=mix(col,vec3(.18,.15,.14),max(smoothstep(.12,0.,abs(bd.y-y))*step(bd.x,1.),smoothstep(.2,0.,length(bd*vec2(1.,1.6))))*.9);
    }
    float a=smoothstep(.002,-.002,d);
    c=mix(c,col,a);
  }
  // a thin light rim on the card
  c+=vec3(1.)*.18*exp(-abs(d)*900.)*step(-.001,-abs(d)+.002);
  fragColor=vec4(grain(c,.015),1.);
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
  const U = n => gl.getUniformLocation(prog, n);
  const ur = U('r'), ut = U('t'), um = U('m'), uo = U('o'), uia = U('ia');
  gl.uniform1i(U('img'), 0); gl.uniform1i(U('maps'), 1); gl.uniform1i(U('sky'), 2);

  const PV = /[?&]preview/.test(location.search);   // gallery thumbnails load light images
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');   // keeps warped/displaced texture sharp
  const load = (src, unit) => new Promise(res => {
    if (!src) return res(null);
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      res(im);
    };
    im.onerror = () => res(null);
    im.src = base + src;
  });

  const SCALE = 1.0; // render at full device resolution (× devicePixelRatio, capped at 2)
  const resize = () => { const d = Math.min(devicePixelRatio || 1, 2) * SCALE * (/[?&]preview/.test(location.search) ? .4 : 1); /* ?preview = light thumbnail render */ canvas.width = canvas.clientWidth * d; canvas.height = canvas.clientHeight * d; gl.viewport(0, 0, canvas.width, canvas.height); };
  new ResizeObserver(resize).observe(canvas); resize();

  let mx = .5, my = .5, tx = mx, ty = my, visible = true;
  addEventListener('pointermove', e => { const b = canvas.getBoundingClientRect(); tx = (e.clientX - b.left) / b.width; ty = 1 - (e.clientY - b.top) / b.height; });
  new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(canvas);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  Promise.all([load(PV ? 'scene_s.jpg' : 'scene.jpg', 0), load('maps.png', 1), load(PV && null ? 'sky_s.jpg' : null, 2)]).then(([im]) => {
    if (!im) return;
    gl.uniform1f(uia, im.width / im.height);
    gl.uniform2f(uo, focus[0], focus[1]);
    const t0 = performance.now();
    const frame = now => {
      requestAnimationFrame(frame);
      if (!visible) return;
      mx += (tx - mx) * .05; my += (ty - my) * .05;
      gl.uniform2f(ur, canvas.width, canvas.height);
      gl.uniform1f(ut, canvas.time != null ? canvas.time : still ? 0 : (now - t0) / 1000 + (canvas.seek || 0)); // canvas.seek = seconds, handy for tuning
      gl.uniform2f(um, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    requestAnimationFrame(frame);
  });
})();
