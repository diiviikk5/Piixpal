/* Desert Dragon — motion background (your image, animated)
 * Usage: <canvas data-bg></canvas> inside any positioned container, then <script src="bg.js"></script>.
 * Keep scene.jpg + maps.png + sky.jpg next to this file. Serve over http(s) — browsers block textures from file://.
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
// img  = the original painting (dragon colours)   sky  = clean plate (dragon removed, sun rebuilt)
// maps.r = dragon alpha. All rig points measured on the painting (uv, y up).
const vec2 PL=vec2(.474,.627);    // left shoulder
const vec2 PR=vec2(.503,.627);    // right shoulder
const vec2 TB=vec2(.486,.47);     // tail base
const vec2 SUN=vec2(.491,.508);
const float TAU=6.2831853;

mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}

float beatPhase(){ return t*TAU/2.9; }
// asymmetric wing beat: quick powerful downstroke, slow recovery upstroke. +1 = wings high
float beat(float T){ return sin(T+.55*sin(T)); }

// Inverse rig: screen-space image uv → where that pixel lives on the still painting.
vec2 rig(vec2 q){
  float T=beatPhase(), b=beat(T);
  // body: lifts on the downstroke, slow hover drift on top
  q-=vec2(.006*sin(t*.31),-.016*b+.009*sin(t*.23));
  // wings: rotation about each shoulder, bending toward the tip, with a trailing whip in the membrane
  vec2 a=(q-PL)*vec2(ia,1.); float rL=length(a);
  float bend=smoothstep(.02,.42,rL);
  float angL=(.2*b+.06*sin(T-rL*5.-.6))*bend;
  float gL=smoothstep(PL.x+.004,PL.x-.035,q.x)*smoothstep(.18,.5,abs(a.x)/max(rL,1e-4));   // sideways from the shoulder only (never the tail below)
  float k=1.-.05*max(0.,-b)*bend;                      // foreshorten on the downstroke
  vec2 la=rot(angL*gL)*a; la.x/=mix(1.,k,gL);
  q=PL+la/vec2(ia,1.);

  vec2 c=(q-PR)*vec2(ia,1.); float rR=length(c);
  float bendR=smoothstep(.02,.42,rR);
  float angR=(.2*b+.06*sin(T-rR*5.-.6))*bendR;
  float gR=smoothstep(PR.x-.004,PR.x+.035,q.x)*smoothstep(.18,.5,abs(c.x)/max(rR,1e-4));
  float kR=1.-.05*max(0.,-b)*bendR;
  vec2 ra=rot(-angR*gR)*c; ra.x/=mix(1.,kR,gR);
  q=PR+ra/vec2(ia,1.);

  // tail: a whip — sideways sway that grows down the tail and travels along it (monotonic per row: never folds)
  float dy=max(TB.y-q.y,0.);
  float sway=(.018*sin(T*.5-dy*14.)+.008*sin(t*.37-dy*9.))*pow(dy/.21,1.4);
  q.x-=sway/ia*smoothstep(.0,.03,dy);
  return q;
}
vec4 dragon(vec2 iu){
  vec2 q=rig(iu);
  float inb=step(0.,q.x)*step(q.x,1.)*step(0.,q.y)*step(q.y,1.);
  float a=textureLod(maps,q,0.).r*inb;
  // defringe: the painting's edge pixels are a blend of dragon and sky; remove the sky that was behind them
  vec3 I=textureLod(img,q,0.).rgb, B=textureLod(sky,q,0.).rgb;
  vec3 F=clamp((I-(1.-a)*B)/max(a,.15),0.,1.);
  return vec4(F,a);
}
// background: the clean plate with drifting clouds, blowing dust and heat shimmer
vec3 plate(vec2 iu){
  float skyM=smoothstep(.33,.4,iu.y);
  vec2 p=iu;
  p.x+=(dn(vec2(iu.x*3.,iu.y*6.)+vec2(t*.03,0.))-.5)*.012*skyM;
  p.y+=(dn(vec2(iu.x*3.+9.,iu.y*6.-t*.02))-.5)*.006*skyM;
  float hz=exp(-pow((iu.y-.33)*22.,2.));
  p.x+=(dn(vec2(iu.y*120.,t*1.4))-.5)*.0025*hz;       // heat shimmer on the horizon
  vec3 c=textureLod(sky,p,0.).rgb;
  float ground=smoothstep(.36,.3,iu.y);
  vec2 dp=vec2(iu.x*ia*2.5-t*.09,iu.y*14.);
  float dust=smoothstep(.45,.9,dn(dp)*.6+dn(dp*2.3+4.)*.4)*ground*smoothstep(.0,.3,iu.y);
  c=mix(c,vec3(.85,.45,.2),dust*.22);
  return c;
}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  vec2 iu=cover(uv,1.05);
  vec2 camB=(m-.5)*vec2(.008,.004), camD=(m-.5)*vec2(.022,.012);
  vec3 bg=plate(iu+camB);
  vec4 dr=dragon(iu+camD);
  // the sun breathes
  vec2 sd=(iu+camB-SUN)*vec2(ia,1.);
  float sl=length(sd);
  bg+=vec3(1.,.6,.25)*exp(-sl*9.)*.1*(.6+.4*sin(t*.5));
  // backlit membranes: wings glow warm where they pass in front of the sun, rims catch fire
  float back=exp(-sl*5.5);
  vec3 dcol=dr.rgb*(1.+back*.75*vec3(1.,.55,.25));
  float rim=clamp(dr.a*(1.-dr.a)*4.,0.,1.);
  dcol+=vec3(1.,.55,.2)*rim*(.04+.5*back);
  vec3 c=mix(bg,dcol,dr.a);
  // god rays: march toward the sun; light is blocked by the (moving) dragon → shafts flicker through the wings
  vec2 sp=iu+camB;
  float acc=0.;
  const int N=22;
  for(int i=0;i<N;i++){
    float f=(float(i)+hash(gl_FragCoord.xy+t))/float(N);
    vec2 p=mix(sp,SUN,f*.92);
    float L=smoothstep(.55,.95,dot(textureLod(sky,p,2.).rgb,vec3(.4,.45,.15)));
    float occ=1.-dragon(p-camB+camD).a;
    acc+=L*occ*(1.-f*.6);
  }
  acc/=float(N);
  c+=vec3(1.,.62,.3)*acc*.18*smoothstep(1.,.0,sl);
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

  Promise.all([load(PV ? 'scene_s.jpg' : 'scene.jpg', 0), load('maps.png', 1), load(PV ? 'sky_s.jpg' : 'sky.jpg', 2)]).then(([im]) => {
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
