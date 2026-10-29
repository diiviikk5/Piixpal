/* Starmind — motion background (your image, animated)
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
// Starmind — a hand reaching into a beam of light, dust everywhere. The poster is portrait, so it is
// placed on the right at full height (cropped above its title), fading into black on the left where the
// type goes. The image's own baked-in dust is split off as a high-frequency layer (image − blurred image):
// that layer is advected upward and its specks twinkle, so the poster's real particles drift and sparkle
// while the hand itself stays still and sharp. Light shafts shimmer; fingertips pulse red; new motes drift.
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
const float TOP=.8;                       // use the top 80% of the poster (above the title)
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  float A=r.x/r.y;
  float W=ia/TOP;                         // image width in screen-height units
  float x0=A>W*1.05?A-W:A*.5-.43*W;      // right-aligned on desktop; hand centred on narrow screens
  vec2 cam=(m-.5)*vec2(.02,.012)+vec2(sin(t*.07),sin(t*.05+1.))*.006;
  vec2 ip=vec2((uv.x*A-x0)/W,(1.-TOP)+uv.y*TOP);
  ip=(ip-.5)/1.04+.5+cam;               // a small zoom margin so the camera can drift
  float inImg=step(0.,ip.x)*step(ip.x,1.);
  vec2 cp=clamp(ip,.001,.999);
  float dep=textureLod(maps,cp,1.).r;
  // hand mask, dilated: minimum over a ring of taps, so rims and glow just outside the fingers never move
  float bg=1.;
  for(int i=0;i<9;i++){
    float an=float(i)*.6981;
    vec2 o2=i==8?vec2(0.):vec2(cos(an),sin(an))*vec2(.014/ia,.014);
    vec2 tp=clamp(cp+o2,.001,.999);
    vec3 s0=textureLod(img,tp,2.).rgb;
    float redL=smoothstep(.03,.1,s0.r-max(s0.g,s0.b));
    float hand=max(smoothstep(.22,.42,textureLod(maps,tp,2.).r),redL);
    bg=min(bg,1.-hand);
  }
  float t1=t;
  // --- base: the blurred poster (stays put) + its dust layer (moves and twinkles)
  vec3 blur=textureLod(img,cp,2.4).rgb;
  vec3 sharp=textureLod(img,cp,0.).rgb;
  vec2 rise=vec2(.006,.035);              // dust floats up and slightly right, through the beam
  float ph=fract(t1/9.), ph2=fract(t1/9.+.5), w=abs(ph-.5)*2.;
  vec2 a1=cp-rise*(ph-.5)*bg, a2=cp-rise*(ph2-.5)*bg;
  // fine specks only (detail above a small blur radius): halos and soft glow never move
  const float FL=1.3;
  vec3 d1=textureLod(img,a1,0.).rgb-textureLod(img,a1,FL).rgb;
  vec3 d2=textureLod(img,a2,0.).rgb-textureLod(img,a2,FL).rgb;
  vec3 dust=max(mix(d1,d2,w),0.);
  vec3 still=max(sharp-textureLod(img,cp,FL).rgb,0.);
  // twinkle: each speck flickers on its own clock
  float tw=hash(floor(gl_FragCoord.xy*.5));
  float flick=.6+.9*(.5+.5*sin(t1*(2.+4.*tw)+tw*60.));
  vec3 c=sharp+bg*(dust*flick-still);
  // --- beam shimmer: soft bands sliding along rays fanning from behind the hand
  vec2 src=vec2(.42,.86);
  vec2 sd=(cp-src)*vec2(ia,1.);
  float ang=atan(sd.y,sd.x), rad=length(sd);
  float band=.5+.5*sin(ang*26.+t1*.15)*sin(ang*11.-t1*.1+2.);
  float pulse=.5+.5*sin(rad*14.-t1*1.2);
  float beamL=smoothstep(.12,.45,lum(blur));
  c+=vec3(.55,.75,1.)*beamL*band*pulse*.07*bg;
  // --- fingertips: the red rim light breathes
  float red=smoothstep(.12,.35,c.r-max(c.g,c.b))*smoothstep(.55,.75,cp.y);
  c+=c*red*.22*(.5+.5*sin(t1*.9));
  // --- new motes: white in the beam, a few red embers, drifting up and wavering
  for(int i=0;i<2;i++){
    float k=float(i);
    float sc=k<.5?70.:38.;
    vec2 g=vec2(gl_FragCoord.x/r.y*sc,gl_FragCoord.y/r.y*sc-t1*(.5+.4*k));
    vec2 id=floor(g); float rn=hash(id+k*17.);
    vec2 f=fract(g)-.5+.25*vec2(sin(t1*.7+rn*40.),0.);
    float s=smoothstep(.09,0.,length(f))*step(k<.5?.955:.985,rn);
    vec3 mc=k<.5?vec3(.85,.92,1.):vec3(1.,.25,.2);
    float where=k<.5?beamL*bg:smoothstep(.3,.9,uv.y)*.6;
    c+=mc*s*where*(.4+.6*sin(t1*3.+rn*50.));
  }
  // --- fade the poster into black on its left edge and outside it
  float fade=smoothstep(0.,.3,ip.x)*inImg*smoothstep(1.,.97,ip.x);
  if(A<W*1.05) fade=inImg*smoothstep(0.,.08,ip.x)*smoothstep(1.,.92,ip.x);
  c*=fade;
  // stray motes over the black, so the edge doesn't feel cut
  vec2 g2=vec2(gl_FragCoord.x/r.y*60.+t1*.1,gl_FragCoord.y/r.y*60.-t1*.35);
  float rn2=hash(floor(g2));
  c+=vec3(.7,.82,1.)*smoothstep(.08,0.,length(fract(g2)-.5))*step(.992,rn2)*(1.-fade)*.5*(.5+.5*sin(t1*2.+rn2*30.));
  fragColor=vec4(grain(max(c,0.),.018),1.);
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
