/* Culture — motion background
 * A live reaction-diffusion culture (Gray-Scott, simulated on the GPU) that grows out of your type.
 * Usage: <canvas data-bg></canvas> inside any positioned container, then <script src="bg.js"></script>.
 * No canvas found → a fixed full-screen one is created behind the page.
 *
 * Start it already grown with data-warm="4000" (simulation steps).
 * Mark the lines it should grow from with data-grow (one element per line of text):
 *   <h1><span data-grow>Grown,</span><span data-grow>not made.</span></h1>
 * With none, it grows from a ring. Drag across the page to plant your own (in the accent colour).
 * Colours: <canvas data-bg data-paper="#ecebe6" data-ink="#0c0c0c" data-accent="#ff4a1c">
 */
(() => {
  let canvas = document.querySelector('canvas[data-bg]');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.setAttribute('data-bg', '');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block';
    document.body.prepend(canvas);
  }
  const paper = canvas.dataset.paper || '#ecebe6', ink = canvas.dataset.ink || '#0c0c0c', accent = canvas.dataset.accent || '#ff4a1c';
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  const flat = () => { canvas.style.background = paper; };
  if (!gl || !gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return flat();
  addEventListener('pagehide', () => { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });
  const rgb = h => { const n = parseInt(h.slice(1).replace(/^(.)(.)(.)$/, '$1$1$2$2$3$3'), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

  const VS = `#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
  /* one step of the chemistry. r = food (A), g = culture (B), b = what you planted (fades) */
  const STEP = `#version 300 es
precision highp float;
in vec2 uv;out vec4 o;
uniform sampler2D s,mask;uniform vec2 px;uniform float t,seed,kick;uniform vec4 brush;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),u.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),u.x),u.y);}
void main(){
  vec4 c=texture(s,uv);
  vec4 l=(texture(s,uv+vec2(px.x,0.))+texture(s,uv-vec2(px.x,0.))+texture(s,uv+vec2(0.,px.y))+texture(s,uv-vec2(0.,px.y)))*.2
        +(texture(s,uv+px)+texture(s,uv-px)+texture(s,uv+vec2(px.x,-px.y))+texture(s,uv+vec2(-px.x,px.y)))*.05-c;
  float A=c.r,B=c.g,N=c.b;
  float inside=texture(mask,uv).r;
  /* how fertile the paper is here: rich beside the letters, thinning out with distance.
   * The blurred copies of the type come free from the texture's mip chain. */
  float near=max(textureLod(mask,uv,3.).r*1.3,max(textureLod(mask,uv,4.6).r*2.2,textureLod(mask,uv,5.8).r*3.4));
  /* the edge of the fertile ground drifts slowly, so the culture keeps advancing and dying back */
  float drift=vn(uv*vec2(5.,3.)+vec2(t*.021,-t*.016))-.5+.5*(vn(uv*vec2(11.,7.)-t*.03)-.5);
  float fert=smoothstep(.06,.42,near+drift*.5);
  fert=max(fert,smoothstep(.04,.3,N));
  /* fertile: coral that branches into a maze. barren: it starves. between: it breaks into spots */
  float F=mix(.0235,.0545,fert),K=mix(.0698,.0620,fert);
  float R=A*B*B;
  A+=.42*l.r-R+F*(1.-A);
  B+=.21*l.g+R-(K+F)*B;
  /* the type is where it starts: the letters are sown once, in full, and after that they throw
   * a few fresh sparks now and then, so whatever dies back can grow again */
  B=max(B,inside*kick*step(1.-kick,vn(uv/px*.11+seed)));
  /* drag to plant */
  float d=length((uv-brush.xy)/px)/brush.z;
  float bq=exp(-d*d)*brush.w;
  /* what you plant is a seed and a patch of good ground round it, which slowly goes back to bare paper */
  B=max(B,bq*.9);N=max(N*.99988,exp(-d*d*.22)*brush.w);
  /* a breath of noise keeps perfect symmetry from ever settling in */
  B+=(h2(uv*731.+seed)-.5)*.0012*fert;
  o=vec4(clamp(A,0.,1.),clamp(B,0.,1.),N,1.);
}`;
  /* drawing it: flat ink on paper, edges cut sharp at any size, your own growth in the accent */
  const DRAW = `#version 300 es
precision highp float;
in vec2 uv;out vec4 o;
uniform sampler2D s,mask;uniform vec3 paper,ink,accent;uniform vec2 r;uniform float solid,t;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec4 c=texture(s,uv);
  float B=c.g;
  float w=max(fwidth(B),1e-4);
  float a=smoothstep(-.9,.9,(B-.23)/w);
  /* a hairline of lighter ink just inside the edge gives the growth a printed, slightly embossed lip */
  float lip=smoothstep(-.9,.9,(B-.3)/w);
  a=max(a,solid*smoothstep(.45,.55,texture(mask,uv).r));
  vec3 col=mix(ink,accent,smoothstep(.02,.14,c.b));
  col=mix(col*1.0+.06,col,lip);
  vec3 pc=paper;
  /* paper: a little tooth, and a soft shadow of the culture pressed into it */
  pc-=.035*smoothstep(.04,.2,B)*(1.-a);
  pc+=(h2(gl_FragCoord.xy)-.5)*.022;
  o=vec4(mix(pc,col,a),1.);
}`;
  const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(x)); return x; };
  const program = fs => { const P = gl.createProgram(); gl.attachShader(P, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(P, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(P, 0, 'p'); gl.linkProgram(P); return P; };
  const stepP = program(STEP), drawP = program(DRAW);
  const UL = (P, names) => Object.fromEntries(names.map(n => [n, gl.getUniformLocation(P, n)]));
  const us = UL(stepP, ['s', 'mask', 'px', 't', 'seed', 'kick', 'brush']), ud = UL(drawP, ['s', 'mask', 'paper', 'ink', 'accent', 'r', 'solid', 't']);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  let W = 0, H = 0, tex = [], fbo = [], cur = 0, maskTex = gl.createTexture(), solid = 1, ok = true, sow = true;
  const mcv = document.createElement('canvas'), m2 = mcv.getContext('2d');
  const target = () => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, W, H, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) ok = false;
    gl.clearColor(1, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);   /* all food, no culture */
    return [t, f];
  };

  /* the type, drawn where it really sits on the page, at the simulation's size */
  const drawMask = () => {
    const box = canvas.getBoundingClientRect(), k = W / Math.max(1, box.width);
    mcv.width = W; mcv.height = H;
    m2.fillStyle = '#000'; m2.fillRect(0, 0, W, H); m2.fillStyle = '#fff';
    const lines = [...document.querySelectorAll('[data-grow]')].filter(e => e.getClientRects().length);
    solid = lines.length ? 0 : 1;
    if (!lines.length) {
      /* nothing to grow from: a ring, off centre, like a dish on a bench */
      const cx = W * .62, cy = H * .5, R = Math.min(W, H) * .27;
      m2.lineWidth = Math.max(3, R * .09); m2.strokeStyle = '#fff'; m2.beginPath(); m2.arc(cx, cy, R, 0, 7); m2.stroke();
      m2.beginPath(); m2.arc(cx - R * .28, cy + R * .2, R * .11, 0, 7); m2.fill();
    }
    for (const el of lines) {
      const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize) * k;
      let text = el.textContent; if (cs.textTransform === 'uppercase') text = text.toUpperCase();
      m2.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
      if ('letterSpacing' in m2) m2.letterSpacing = (parseFloat(cs.letterSpacing) || 0) * k + 'px';
      m2.textBaseline = 'alphabetic';
      /* the glyphs' own box (not the line box), so the baseline lands where the browser put it */
      const rg = document.createRange(); rg.selectNodeContents(el);
      const b = rg.getBoundingClientRect(), mt = m2.measureText(text);
      const asc = mt.fontBoundingBoxAscent || fs * .9, desc = mt.fontBoundingBoxDescent || fs * .25;
      const top = (b.top - box.top) * k + ((b.height * k) - (asc + desc)) / 2;
      m2.fillText(text, (b.left - box.left) * k, top + asc);
    }
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, mcv);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  const CELL = 2.6;   /* css pixels per simulation cell: smaller = finer pattern, slower */
  let lastW = 0;
  const resize = () => {
    const cw = canvas.clientWidth, ch = canvas.clientHeight; if (!cw || !ch) return;
    const dpr = Math.min(devicePixelRatio || 1, 2) * (/[?&]preview/.test(location.search) ? .6 : 1);
    canvas.width = cw * dpr; canvas.height = ch * dpr;
    const nw = Math.max(64, Math.round(cw / CELL)), nh = Math.max(64, Math.round(ch / CELL));
    /* only restart the culture when the page really changed shape (not on a phone's address bar sliding) */
    if (Math.abs(nw - W) > 2 || !tex.length) {
      W = nw; H = nh;
      tex.forEach(t => gl.deleteTexture(t)); fbo.forEach(f => gl.deleteFramebuffer(f));
      const a = target(), b = target(); tex = [a[0], b[0]]; fbo = [a[1], b[1]]; cur = 0;
    }
    if (!ok) return;
    drawMask(); lastW = cw; sow = true;
  };
  resize();
  if (!ok) return flat();
  new ResizeObserver(resize).observe(canvas);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawMask(); sow = true; });

  /* the pointer plants culture while it moves */
  let bx = -1, by = -1, bw = 0, lx = 0, ly = 0, visible = true;
  addEventListener('pointermove', e => {
    const b = canvas.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = 1 - (e.clientY - b.top) / b.height;
    const sp = Math.hypot(e.clientX - lx, e.clientY - ly); lx = e.clientX; ly = e.clientY;
    bx = x; by = y; bw = Math.min(1, bw + sp / 12);
  }, { passive: true });
  new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(canvas);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P = rgb(paper), I = rgb(ink), AC = rgb(accent);
  const t0 = performance.now();
  let steps = 0;
  const sim = n => {
    gl.useProgram(stepP); gl.viewport(0, 0, W, H);
    gl.uniform1i(us.s, 0); gl.uniform1i(us.mask, 1); gl.uniform2f(us.px, 1 / W, 1 / H);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, maskTex); gl.activeTexture(gl.TEXTURE0);
    for (let i = 0; i < n; i++) {
      gl.uniform1f(us.t, steps * .016); gl.uniform1f(us.seed, (steps * 7.13) % 100);
      gl.uniform4f(us.brush, bx, by, 5, i === 0 ? bw : 0);
      gl.uniform1f(us.kick, sow ? 1 : steps % 700 === 699 ? .34 : 0); sow = false;
      gl.bindTexture(gl.TEXTURE_2D, tex[cur]); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1 - cur]);
      gl.drawArrays(gl.TRIANGLES, 0, 3); cur = 1 - cur; steps++;
    }
    bw *= .7;
  };
  /* people who asked for less motion get a grown, finished culture, standing still */
  const warm = +(canvas.dataset.warm || (location.search.match(/[?&]warm=(\d+)/) || [])[1] || 0);   /* start already grown: <canvas data-bg data-warm="2000"> */
  if (still) sim(2600); else if (warm) sim(warm);
  let last = 0;
  const frame = now => {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now;
    if (!visible) return;
    /* the same pace on any screen, 60 Hz or 144: a quick start, then it settles to a slow creep */
    if (!still) sim(Math.max(1, Math.round(dt * (steps < 900 ? 840 : 540))));
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(drawP);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, maskTex); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
    gl.uniform1i(ud.s, 0); gl.uniform1i(ud.mask, 1); gl.uniform1f(ud.solid, solid);
    gl.uniform3fv(ud.paper, P); gl.uniform3fv(ud.ink, I); gl.uniform3fv(ud.accent, AC);
    gl.uniform2f(ud.r, canvas.width, canvas.height); gl.uniform1f(ud.t, (performance.now() - t0) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  requestAnimationFrame(frame);
})();
