/* Ronin — motion background (your image, animated)
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
// Ronin — the engraved samurai on Klein-ish blue. The portrait sits right and melts into the same flat blue,
// extended across the screen. The red-and-silver wisps stream up and away, a light runs down the calligraphy
// blade, red flecks on the robe smoulder, sparks and embers drift past, the figure breathes.
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec3 BLUE(float y){ return mix(vec3(0.,.29,.485),vec3(0.,.243,.465),y); }   // sampled from the image's own ground
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  float SA=r.x/r.y;
  vec2 cam=(m-.5)*vec2(.02,.014)+vec2(sin(t*.11),sin(t*.083+1.))*.004;
  float t1=t;
  // the portrait, full height (a touch larger), right-aligned on wide screens
  float Z=1.08, W=ia*Z;
  float x0=SA>W*1.4?SA-W+.01:SA-W*.92;              // flush right: the robe runs off the picture's own edge
  vec2 iu=vec2((uv.x*SA-x0)/W,.5+(uv.y-.5)/Z)+cam;
  // breathing: a slow scale about the chest
  iu=(iu-vec2(.55,.55))*(1.-.006*sin(t1*.9))+vec2(.55,.55);
  vec3 c=BLUE(uv.y);
  float inside=step(0.,iu.x)*step(iu.x,1.)*step(0.,iu.y)*step(iu.y,1.);
  if(inside>0.){
    vec3 b0=textureLod(img,iu,2.5).rgb;
    float bg=smoothstep(.12,.04,length(b0-BLUE(iu.y)));          // 1 = flat blue ground
    // wisps: everything above the shoulders that is not ground streams up and to the right
    float wisp=(1.-bg)*smoothstep(.62,.8,iu.y)*smoothstep(.12,.3,iu.x);
    float ph=fract(t1/3.2), ph2=fract(t1/3.2+.5), w=abs(ph-.5)*2.;
    vec2 dir=vec2(.035,.06)+curl(iu*vec2(5.,7.)+t1*.1)*.006;
    vec2 a1=iu-dir*(ph-.5)*wisp, a2=iu-dir*(ph2-.5)*wisp;
    vec3 col=mix(texture(img,a1).rgb,texture(img,a2).rgb,w);
    // a light runs down the blade (hilt → tip), lifting the white calligraphy
    vec2 A=vec2(.07,.74), B=vec2(.74,.17);
    vec2 pa=iu-A, ba=B-A; float hh=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);
    float dist=length((pa-ba*hh)*vec2(ia,1.));
    float runner=fract(t1*.22);
    float band=exp(-pow((hh-runner*1.3+.15)/.06,2.));
    float steel=smoothstep(.55,.85,lum(col))*smoothstep(.06,.01,dist);
    col+=vec3(.75,.88,1.)*steel*band*.9;
    col+=vec3(.7,.85,1.)*exp(-dist*120.)*band*.25;
    // red flecks on the robe smoulder
    float red=smoothstep(.25,.45,col.r-max(col.g,col.b))*(1.-bg);
    col+=col*red*.45*(.5+.5*sin(t1*2.3+iu.x*40.+iu.y*30.));
    // melt the portrait's edges into the extended ground
    float e=smoothstep(0.,.06,iu.x)*smoothstep(0.,.03,iu.y)*smoothstep(1.,.97,iu.y);
    c=mix(c,col,e);
  }
  // drifting sparks (silver) and embers (red), streaming up-right like the wisps
  for(int i=0;i<2;i++){
    float k=float(i);
    float sc=k<.5?42.:24.;
    vec2 g=vec2(uv.x*SA*sc-t1*(1.2+k),uv.y*sc-t1*(2.2+k*1.5));
    vec2 id=floor(g),f=fract(g)-.5; float rn=hash(id+k*9.);
    f+=.25*vec2(sin(t1*1.7+rn*40.),cos(t1*1.3+rn*20.));
    float s=smoothstep(.08,0.,length(f*vec2(1.,.55)))*step(k<.5?.975:.985,rn);
    float near=smoothstep(SA-W*1.25,SA-W*.4,uv.x*SA)*smoothstep(.2,.7,uv.y);   // they come off the wisps, not the empty sky
    c+=(k<.5?vec3(.75,.85,1.):vec3(1.,.2,.18))*s*near*(.5+.5*sin(t1*5.+rn*60.));
  }
  // paper grain on the blue
  c*=1.+.05*(dn(uv*vec2(SA,1.)*220.)-.5);
  fragColor=vec4(grain(c,.02),1.);
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
