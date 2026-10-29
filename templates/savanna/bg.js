/* Savanna — motion background (your image, animated)
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
  const focus = (canvas.dataset.focus || '.5,.55').split(',').map(Number);
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
// Depth parallax from maps.r (white = near). The screen point s shows image point i where
// s = i + cam*(depth(i) - focal). Solve for i with a few fixed-point steps: near layers slide
// over far ones with no tearing, the way a real camera move would.
float depthAt(vec2 iu){return textureLod(maps,iu,1.).r;}
vec2 parallax(vec2 iu,vec2 cam,float focal){
  vec2 i=iu;
  for(int k=0;k<5;k++){ i=iu-cam*(depthAt(i)-focal); }
  return i;
}
// a slow, looping camera drift plus the pointer
vec2 camMove(float amp,float speed){
  vec2 auto_=vec2(sin(t*speed),sin(t*speed*.71+1.3)*.6)*amp;
  return auto_+(m-.5)*vec2(2.,1.4)*amp;
}
// mist: soft drifting banks. dir = drift direction, scale = bank size
float mist(vec2 p,vec2 dir,float scale){
  vec2 q=p*scale+dir*t;
  float n=dn(q)*.55+dn(q*2.1+vec2(3.1,1.7)-dir*t*.6)*.3+dn(q*4.3-dir*t*.3)*.15;
  return smoothstep(.35,.85,n);
}
// light shafts: soft streaks along \`dir\` (unit, image space), shimmering slowly
float shafts(vec2 p,vec2 dir,float freq){
  vec2 nrm=vec2(-dir.y,dir.x);
  float x=dot(p,nrm)*freq;
  float a=dn(vec2(x,t*.08))*.6+dn(vec2(x*2.3+5.,t*.11))*.4;
  return smoothstep(.45,.9,a);
}
// Savanna — the illustration, alive. Everything is the source image; motion is masked by what each pixel is:
//  sky (bright, above the horizon): clouds stream slowly sideways, stars twinkle
//  sun: breathes, and its painted rings ripple outward
//  silhouettes (near-black): acacia canopies sway from the top, trunks stay planted
//  river band: horizontal shimmer; grass at the bottom: wind
//  plus a flock crossing in front of the sun, and a slow depth-parallax camera.
const vec2 SUN=vec2(.5,.55);      // image uv (y up)
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
// one bird: a flapping V. q in image uv relative to the bird, s = size, ph = wing phase
float bird(vec2 q,float s,float ph){
  q/=s; q.x=abs(q.x);
  float flap=sin(ph)*.55;
  float y=q.x*(.35+flap)-q.x*q.x*(.6+flap*.8);   // wing curve
  float wing=smoothstep(.09,.0,abs(q.y-y))*step(q.x,1.);
  float body=smoothstep(.16,.0,length(q*vec2(1.,1.6)));
  return max(wing,body);
}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  vec2 iu=cover(uv,1.06);
  vec2 cam=camMove(.01,.08);
  vec2 ip=parallax(iu,cam,.35);
  vec3 base=textureLod(img,ip,0.).rgb;
  float L=lum(base);
  float sil=smoothstep(.13,.05,L);                        // silhouette (trees, ground, animals)
  float sky=smoothstep(.36,.46,ip.y)*(1.-sil);            // above the horizon and not a silhouette
  float t1=t;
  // --- trees: canopies sway, more towards the top of each tree; trunks barely move
  float canopy=sil*smoothstep(.5,.85,ip.y);
  float wind=sin(t1*.9+ip.x*6.)*.6+sin(t1*1.7+ip.x*13.+ip.y*9.)*.4;
  vec2 tw=vec2(wind*.0028,wind*.0008)*canopy*smoothstep(.45,.95,ip.y);
  // --- clouds: the whole sky band drifts along a curl field, gently, never the sun disc
  float sunD=length((ip-SUN)*vec2(ia,1.));
  float cl=sky*smoothstep(.14,.24,sunD);
  vec2 dr=drift(ip,.035,.035)-ip;
  dr.x+=.004*sin(t1*.05);                                 // a slow prevailing wind
  // --- river: horizontal shimmer in the bright band
  float river=smoothstep(.2,.24,ip.y)*smoothstep(.31,.27,ip.y)+smoothstep(.03,.06,ip.y)*smoothstep(.15,.11,ip.y)*smoothstep(.2,.8,ip.x)*smoothstep(.85,.6,ip.x);
  vec2 rv=vec2(sin(ip.y*420.+t1*2.2)*.0016+sin(ip.y*180.-t1*1.3)*.001,0.)*river*smoothstep(.2,.32,L);
  // --- grass: bottom edge sways
  float grass=smoothstep(.16,.02,ip.y);
  vec2 gw=vec2(sin(t1*1.4+ip.x*40.)*.0018,0.)*grass*sil;
  vec2 q=ip+tw+dr*cl+rv+gw;
  vec3 c=textureLod(img,q,0.).rgb;
  // --- sun: breathing glow + rings rippling outward through the painted arcs
  float ring=sin(sunD*120.-t1*2.2)*.5+.5;
  float halo=smoothstep(.42,.17,sunD)*smoothstep(.15,.19,sunD);
  c+=vec3(1.,.82,.55)*halo*ring*.07*(1.-sil);
  c*=1.+.06*smoothstep(.2,.0,sunD)*(.5+.5*sin(t1*.7));
  c+=vec3(1.,.75,.45)*exp(-sunD*sunD*30.)*.06*(1.-sil)*(.6+.4*sin(t1*.5));
  // --- stars: twinkle new points in the upper sky
  vec2 g=gl_FragCoord.xy/r.y*110.; vec2 id=floor(g),f=fract(g)-.5; float rn=hash(id);
  float up=smoothstep(.62,.9,ip.y)*sky;
  c+=vec3(1.,.93,.85)*smoothstep(.09,0.,length(f))*step(.986,rn)*up*(.5+.5*sin(t1*(1.+rn*3.)+rn*40.))*.7;
  // --- a flock crossing in front of the sun, flapping
  float fl=0.;
  for(int i=0;i<7;i++){
    float k=float(i);
    float sp=.018+.006*hash(vec2(k,1.));
    float x=fract(.15+k*.137+t1*sp)*1.4-.2;
    vec2 bp=vec2(x,.57+.1*sin(k*2.3)+.012*sin(t1*.6+k)+.03*(x-.5));
    vec2 d=(ip-bp)*vec2(ia,1.);
    fl=max(fl,bird(d,.006+.003*hash(vec2(k,7.)),t1*(9.+3.*hash(vec2(k,3.)))+k));
  }
  c=mix(c,vec3(.05,.02,.04),fl*.9);
  fragColor=vec4(grain(c,.018),1.);
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
