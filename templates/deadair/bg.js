/* Deadair — motion background
 * Ditherpunk: a moon over a liquid flow-field, drawn in five tones through a dither, and torn by
 * glitches (row tears, datamosh blocks, pixel-sort streaks, solid bars) that follow the pointer.
 * It renders at a low "pixel" resolution and scales up crisp, so it is cheap on any screen.
 *
 * Usage: <canvas data-bg></canvas> inside any positioned container, then <script src="bg.js"></script>.
 * No canvas found → a fixed full-screen one is created behind the page.
 *
 *   data-theme    carbon | oxide | abyss | moss | bone            default: carbon
 *   data-dither   bayer | halftone | noise                        default: bayer
 *   data-pixel    size of one pixel in css px                     default: 3
 *   data-glitch   how restless it is on its own, 0..2             default: 1
 *
 * Move: the scene leans and tears where you go. Click: a hard burst.
 * From your code: canvas.setTheme('oxide', x, y)  (x, y in 0..1: where the new palette spreads from)
 *                 canvas.setDither('halftone'), canvas.burst()
 * It fires "themechange" (detail: { name, colors }) and "glitch" on the canvas, and sets
 * --da-bg, --da-dim, --da-mid, --da-ink, --da-accent on the canvas's parent so your type can match.
 */
(() => {
  let canvas = document.querySelector('canvas[data-bg]');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.setAttribute('data-bg', '');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block';
    document.body.prepend(canvas);
  }
  canvas.style.imageRendering = 'pixelated';
  /* five tones each, dark to light, then the accent. Dark, low-key, one loud colour used sparingly */
  const THEMES = {
    carbon: ['#08080a', '#1d1e22', '#55575e', '#e6e2d6', '#c9f73a'],
    oxide: ['#0a0706', '#2b140d', '#7a3a1d', '#ead9c2', '#ff5417'],
    abyss: ['#04060c', '#0e1838', '#2f4796', '#cdd6f4', '#7f9cff'],
    moss: ['#060906', '#16241a', '#4f6b45', '#dde5cd', '#a8f06a'],
    bone: ['#0a0a0a', '#262626', '#7a7a7a', '#efefef', '#efefef']
  };
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) { canvas.style.background = THEMES.carbon[0]; return; }
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });

  const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const frag = `
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m; uniform float e, burst, rest, dmode;
uniform vec3 tr[6]; uniform vec3 pa[5]; uniform vec3 pb[5]; uniform vec3 wipe;
float h1(float n){return fract(sin(n*91.345)*47453.5453);}
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),u.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vn(p);p=p*2.03+vec2(17.,9.);a*=.5;}return v;}
float bayer2(vec2 a){a=floor(a);return fract(dot(a,vec2(.5,a.y*.75)));}
float bayer4(vec2 a){return bayer2(.5*a)*.25+bayer2(a);}

/* the picture, before anything breaks it. p: centred, one unit tall. returns (light 0..1, accent 0..1) */
vec2 scene(vec2 p,float tt){
  float asp=r.x/r.y;
  vec2 pm=m-.5;
  float L=0.,A=0.;
  /* stars */
  vec2 sg=floor((p+pm*.02)*70.);
  L=step(.991,h2(sg))*(.5+.5*sin(tt*2.+h2(sg+3.)*40.));
  /* the moon: a lit sphere, cratered, its dark side lost in the sky */
  vec2 mc=vec2(asp*.24,.17)-pm*.06;
  vec2 d=(p-mc)/.44;float dd=dot(d,d);
  if(dd<1.){
    vec3 n=vec3(d,sqrt(1.-dd));
    float lam=max(dot(n,normalize(vec3(-.55,.5,.62))),0.);
    float cr=fbm(d*3.2+7.)+.5*fbm(d*9.+2.);
    float rim=smoothstep(1.,.86,dd);
    L=lam*(.3+.85*cr)*rim+.05*rim;
    A=smoothstep(.74,.9,fbm(d*2.1+vec2(3.,tt*.03))+.18*lam)*step(.12,lam);
  }
  /* an arc of orbit, one pixel thin */
  float orb=abs(length((p-mc)*vec2(1.,2.4))-.74);
  L=max(L,smoothstep(.004,.0,orb)*step(dd,9.)*step(1.02,dd)*.9);
  /* the liquid: a flow-field folding over itself, rising from the bottom of the frame */
  float hz=-.1+.1*fbm(vec2(p.x*1.3+tt*.03,3.))+.04*sin(p.x*3.+tt*.2);
  if(p.y<hz){
    vec2 q=p*vec2(1.5,2.4)+pm*.22;
    float w=fbm(q+vec2(tt*.07,0.));
    float w2=fbm(q*1.6+w*2.4+vec2(-tt*.1,tt*.045));
    float rdg=abs(sin((w2*8.+q.y*3.+w*2.)*3.14159));
    float dep=smoothstep(hz,hz-.5,p.y);
    L=smoothstep(.08,.8,pow(rdg,.55)*(.25+1.1*w2)*(.7+.3*dep));
    L=L*.92+.05;
    A=smoothstep(.5,.62,w2)*smoothstep(.55,.95,rdg)*smoothstep(.0,.25,dep);
    /* foam where the liquid meets the sky */
    L=max(L,smoothstep(.02,.0,hz-p.y)*.8);
  }
  return vec2(clamp(L,0.,1.),clamp(A,0.,1.));
}

void main(){
  vec2 c=floor(gl_FragCoord.xy);
  vec2 uv=(c+.5)/r;
  float asp=r.x/r.y;
  vec2 am=vec2((uv.x-m.x)*asp,uv.y-m.y);
  /* how broken things are: a short burst every few seconds, more where and when the pointer moves, all the way on a click */
  float ph=fract(t/4.7+.3);
  float idle=smoothstep(0.,.015,ph)*smoothstep(.085,.06,ph)*rest;
  float lg=smoothstep(.26,0.,length(am))*(.25+.75*e);
  float g=clamp(.05*rest+idle*.75+e*.55+burst*1.2+lg*.7,0.,1.6);
  float tt=t;
  float solid=0.;

  /* 1. rows slip sideways */
  float tk=floor(t*9.);
  float rows=mix(46.,14.,h1(floor(t*2.3)));
  float rid=floor(uv.y*rows);
  float hr=h2(vec2(rid,tk));
  if(hr<g*.22)uv.x+=(h2(vec2(rid,tk+5.))-.5)*.32*g;
  /* ...and the pointer leaves a wake of them */
  for(int i=0;i<6;i++){
    float band=smoothstep(.035,0.,abs(uv.y-tr[i].y+(h1(float(i)+tk)-.5)*.03));
    float reach=smoothstep(.55,.05,abs(uv.x-tr[i].x));
    uv.x+=band*reach*tr[i].z*.11*(h1(float(i)*3.+tk)>.5?1.:-1.);
  }
  vec2 cc=uv*r;
  /* 2. blocks freeze on an old frame and drift: datamosh */
  float bs=h2(floor(cc/64.)+floor(t*.7))>.5?16.:h2(floor(cc/32.)+1.)>.5?8.:32.;
  vec2 bid=floor(cc/bs);
  float hb=h2(bid+floor(t*5.)*13.7);
  if(hb<g*.2){
    uv+=(vec2(h2(bid+2.),h2(bid+4.))-.5)*vec2(.22,.05)*min(g,1.);
    tt=t-1.5-2.5*h2(bid+9.);
    /* some of them go coarse, like a stream dropping to a lower bitrate */
    if(hb<g*.09){float k=h2(bid+11.)>.5?4.:8.;uv=(floor(uv*r/k)*k+.5*k)/r;}
  }
  /* 3. columns smear downward from a bright pixel: pixel sorting */
  float cid=floor(cc.x/2.);
  float ts=floor(t*3.);
  float hs=h2(vec2(cid,ts));
  if(hs<g*.3+lg*.35){
    float y0=.12+.8*h2(vec2(cid*1.31,ts+7.));
    float len=(.1+.42*h2(vec2(cid,ts+3.)))*min(1.,g+.3);
    if(uv.y<y0&&uv.y>y0-len)uv.y=y0;
  }
  /* 4. solid bars, the loudest mark, used least */
  float bh=floor(uv.y*r.y/3.);
  float hbar=h2(vec2(bh,floor(t*7.)));
  if(hbar<g*.05){
    float x0=h2(vec2(bh,3.)),wd=.05+.3*h2(vec2(bh,8.));
    if(uv.x>x0&&uv.x<x0+wd)solid=1.+step(.5,h2(vec2(bh,12.)));
  }

  vec2 p=vec2((uv.x-.5)*asp,uv.y-.5);
  vec2 s=scene(p,tt);
  float L=s.x,A=s.y;
  /* a ghost of the picture one step to the side, where it is breaking: the print slipped */
  if(g>.25){float L2=scene(p+vec2(.012*g,0.),tt).x;A=max(A,smoothstep(.25,.6,abs(L2-L))*step(.5,h2(vec2(rid,tk+2.)))*min(1.,g));}
  if(solid>1.5){L=.02;A=0.;}else if(solid>.5){L=.5;A=1.;}

  /* the dither: three ways to break a tone into dots */
  float th;
  if(dmode<.5)th=bayer4(c);
  else if(dmode<1.5){vec2 q=mat2(.7071,-.7071,.7071,.7071)*c/4.;th=clamp(length(fract(q)-.5)*1.25,0.,1.);}
  else th=h2(c+floor(t*10.)*.37);
  /* film grain that flickers, so flat areas stay alive */
  L+=(h2(c*1.7+floor(t*12.))-.5)*.07;
  float q=clamp(L,0.,1.)*3.+(th-.5)*.95;
  float idx=clamp(floor(q+.5),0.,3.);
  float acc=step(.5,A*1.15+(th-.5)*.7);

  /* the palette: a new theme spreads from where it was chosen, through the dither */
  float wd2=length(vec2((uv.x-wipe.x)*asp,uv.y-wipe.y));
  float nw=step(wd2,wipe.z*(asp+1.)*1.05+(th-.5)*.12-.06);
  vec3 col;
  if(acc>.5)col=mix(pa[4],pb[4],nw);
  else if(idx<.5)col=mix(pa[0],pb[0],nw);
  else if(idx<1.5)col=mix(pa[1],pb[1],nw);
  else if(idx<2.5)col=mix(pa[2],pb[2],nw);
  else col=mix(pa[3],pb[3],nw);
  /* scanlines so faint you feel them more than see them, and darker corners */
  col*=.94+.06*step(1.,mod(c.y,2.));
  vec2 v=uv-.5;col*=1.-.55*dot(v,v);
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
  const U = n => gl.getUniformLocation(prog, n);
  const u = { r: U('r'), t: U('t'), m: U('m'), e: U('e'), burst: U('burst'), rest: U('rest'), dmode: U('dmode'), tr: U('tr[0]'), pa: U('pa[0]'), pb: U('pb[0]'), wipe: U('wipe') };

  const rgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const flat = name => new Float32Array(THEMES[name].flatMap(rgb));
  let theme = THEMES[canvas.dataset.theme] ? canvas.dataset.theme : 'carbon', from = theme, wipe = [.5, .5, 2], wiping = false;
  const DM = { bayer: 0, halftone: 1, noise: 2 };
  let dmode = DM[canvas.dataset.dither] ?? 0;
  const vars = name => {
    const c = THEMES[name], host = canvas.parentElement || document.body;
    ['bg', 'dim', 'mid', 'ink', 'accent'].forEach((k, i) => host.style.setProperty('--da-' + k, c[i]));
    canvas.dispatchEvent(new CustomEvent('themechange', { detail: { name, colors: c } }));
  };
  canvas.themes = Object.keys(THEMES);
  canvas.setTheme = (name, x = .5, y = .5) => {
    if (!THEMES[name] || name === theme) return;
    from = theme; theme = name; wipe = [x, y, 0]; wiping = true; canvas.dataset.theme = name; vars(name);
  };
  canvas.setDither = name => { if (name in DM) { dmode = DM[name]; canvas.dataset.dither = name; } };
  let burst = 0;
  canvas.burst = (k = 1) => { burst = Math.max(burst, k); canvas.dispatchEvent(new CustomEvent('glitch')); };
  vars(theme);

  const resize = () => {
    const px = Math.max(1, +canvas.dataset.pixel || 3) * (/[?&]preview/.test(location.search) ? 1.5 : 1);
    canvas.width = Math.max(2, Math.ceil(canvas.clientWidth / px)); canvas.height = Math.max(2, Math.ceil(canvas.clientHeight / px));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  new ResizeObserver(resize).observe(canvas); resize();

  /* the pointer: where it is, how fast it is going, and the wake it leaves */
  let mx = .5, my = .5, tx = mx, ty = my, en = 0, visible = true, lx = 0, ly = 0, lt = 0;
  const trail = Array.from({ length: 6 }, () => [0, -1, 0]); let ti = 0, tdx = 0;
  addEventListener('pointermove', e => {
    const b = canvas.getBoundingClientRect(); tx = (e.clientX - b.left) / b.width; ty = 1 - (e.clientY - b.top) / b.height;
    const now = performance.now(), dt = Math.max(8, now - lt), sp = Math.hypot(e.clientX - lx, e.clientY - ly) / dt;   /* px per ms */
    tdx += Math.hypot(e.clientX - lx, e.clientY - ly); lx = e.clientX; ly = e.clientY; lt = now;
    en = Math.min(1, en + sp * .05);
    if (tdx > 46 && tx >= 0 && tx <= 1 && ty >= 0 && ty <= 1) { tdx = 0; trail[ti] = [tx, ty, Math.min(1, .35 + sp * .5)]; ti = (ti + 1) % 6; }
  }, { passive: true });
  addEventListener('pointerdown', e => { const b = canvas.getBoundingClientRect(); if (e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom) canvas.burst(1); }, { passive: true });
  new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(canvas);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now(); let last = 0;
  const tarr = new Float32Array(18);
  const frame = now => {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now;
    if (!visible) return;
    mx += (tx - mx) * Math.min(1, dt * 5); my += (ty - my) * Math.min(1, dt * 5);
    en *= Math.pow(.06, dt); burst *= Math.pow(.012, dt);
    trail.forEach((p, i) => { p[2] *= Math.pow(.2, dt); tarr.set(p, i * 3); });
    if (wiping) { wipe[2] += dt * 1.5; if (wipe[2] > 1.3) { wiping = false; from = theme; wipe[2] = 2; } }
    gl.uniform2f(u.r, canvas.width, canvas.height);
    gl.uniform1f(u.t, canvas.time != null ? canvas.time : still ? 12.3 : 12.3 + (now - t0) / 1000);
    gl.uniform2f(u.m, mx, my);
    gl.uniform1f(u.e, still ? 0 : en); gl.uniform1f(u.burst, still ? 0 : burst);
    gl.uniform1f(u.rest, still ? 0 : (canvas.dataset.glitch != null ? +canvas.dataset.glitch : 1));
    gl.uniform1f(u.dmode, dmode);
    gl.uniform3fv(u.tr, tarr);
    gl.uniform3fv(u.pa, flat(from)); gl.uniform3fv(u.pb, flat(theme));
    gl.uniform3f(u.wipe, wipe[0], wipe[1], wiping ? wipe[2] : 2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  requestAnimationFrame(frame);
})();
