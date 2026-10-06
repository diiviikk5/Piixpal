/* <piix-sprite name="mochi" size="96"></piix-sprite>
 * Self-contained characters you can paste anywhere: they sit inline like an image.
 * Eyes follow the cursor, they blink, breathe, hop when clicked and nap when ignored.
 *
 *   name         which sprite (see Piixpal.figures)
 *   size         width in px (snapped to whole sprite pixels)   default: 5 × sprite width
 *   scale        or give the pixel size directly
 *   render       pixel | dots | voxel                           default: the sprite's own (pixel)
 *                  dots  = LED dot-matrix, voxel = extruded 3D blocks that turn toward you
 *   depth        voxel extrusion, in sprite pixels                default: 3
 *   color        body colour (sprites that support it); shade and light are derived
 *   eye          pupil colour
 *   hue          or just rotate every colour, degrees
 *   look         mouse | wander | none                          default: mouse
 *   shy, tilt    flinch away / lean toward the cursor (big sprites do both by default;
 *                turn off with no-shy / no-tilt)
 *   still        no breathing or hopping
 *   sleep-after  seconds of no input before napping, 0 = never  default: 25
 *
 * Figure spec: { w, h, palette, frames:[rows…], fps, eyes:[{x,y,w,h}], pupil:{w,h}, lid:'b',
 *                recolor:{ key: mix }, render, tilt, shy, glint, kind } */
const FIGURES = {};
const defineFigure = (name, spec) => {
  spec.name = name;
  spec.pupil = spec.pupil || { w: 1, h: 1 };
  spec._cache = {};
  FIGURES[name] = spec;
  return spec;
};
/* mix a hex colour toward black (amt < 0) or white (amt > 0) */
const mixHex = (hex, amt) => {
  const [r, g, b] = hexRGBA(hex), t = amt < 0 ? 0 : 255, k = Math.abs(amt);
  const c = v => Math.round(v + (t - v) * k).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
};
const figurePalette = (spec, color) => {
  const pal = { ...spec.palette };
  if (color && spec.recolor) for (const k in spec.recolor) pal[k] = spec.recolor[k] ? mixHex(color, spec.recolor[k]) : color;
  return pal;
};
const bakeFigure = (spec, pal) => {
  const key = JSON.stringify(pal);
  if (!spec._cache[key]) {
    const rgba = {};
    for (const k in pal) rgba[k] = hexRGBA(pal[k]);
    spec._cache[key] = spec.frames.map(rows => bake(rows, rgba, spec.w, spec.h));
  }
  return spec._cache[key];
};
const HEAD = 3; /* rows of headroom above the sprite for breathing and z's */

class PiixSpriteElement extends HTMLElement {
  static get observedAttributes() { return ['name', 'size', 'scale', 'hue', 'color', 'eye', 'render', 'depth']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._tick = this._tick.bind(this);
    this._down = this._down.bind(this);
    this._vis = true;
  }
  connectedCallback() {
    this._build();
    this._io = new IntersectionObserver(es => { this._vis = es[es.length - 1].isIntersecting; }, { rootMargin: '120px' });
    this._io.observe(this);
    this.addEventListener('pointerdown', this._down);
    sub(this._tick);
  }
  disconnectedCallback() {
    unsub(this._tick);
    if (this._io) this._io.disconnect();
    this.removeEventListener('pointerdown', this._down);
  }
  attributeChangedCallback(n) {
    if (!this.isConnected || !this._cv) return;
    if (n === 'hue') { this._cv.style.filter = this.getAttribute('hue') ? `hue-rotate(${+this.getAttribute('hue')}deg)` : ''; return; }
    this._build();
  }
  /* make it hop from code */
  poke() { this._down(); }
  _on(attr) { return this.hasAttribute(attr) || (!!this._spec[attr] && !this.hasAttribute('no-' + attr)); }

  _build() {
    const spec = this._spec = FIGURES[this.getAttribute('name')] || FIGURES[Object.keys(FIGURES)[0]];
    if (!spec) return;
    this._pal = figurePalette(spec, this.getAttribute('color'));
    this._frames = bakeFigure(spec, this._pal);
    const size = +this.getAttribute('size');
    const s = this._s = +this.getAttribute('scale') || (size ? Math.max(1, Math.round(size / spec.w)) : (spec.scale || 5));
    const mode = this._mode = ['dots', 'voxel'].includes(this.getAttribute('render')) ? this.getAttribute('render') : (spec.render || 'pixel');
    const W = spec.w, H = spec.h + HEAD;
    const depth = this._depth = mode === 'voxel' ? Math.max(1, +this.getAttribute('depth') || spec.depth || 3) : 0;
    const pad = this._pad = depth * s;
    const dpr = this._dpr = mode === 'pixel' ? 1 : Math.min(devicePixelRatio || 1, 2);
    const cw = mode === 'pixel' ? W : Math.round((W * s + pad * 2) * dpr);
    const ch = mode === 'pixel' ? H : Math.round((H * s + pad * 2) * dpr);
    this.shadowRoot.innerHTML = `<style>
:host{display:inline-block;line-height:0;vertical-align:bottom;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.w{display:block;transform-origin:50% 100%;will-change:transform}
canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges;margin:${-HEAD * s - pad}px ${-pad}px ${-pad}px}
</style><div class="w"><canvas width="${cw}" height="${ch}" style="width:${W * s + pad * 2}px;height:${H * s + pad * 2}px"></canvas></div>`;
    this._wrap = this.shadowRoot.querySelector('.w');
    this._cv = this.shadowRoot.querySelector('canvas');
    if (this.getAttribute('hue')) this._cv.style.filter = `hue-rotate(${+this.getAttribute('hue')}deg)`;
    this._out = this._cv.getContext('2d');
    /* everything is composed at 1x here, then presented as pixels, dots or voxels */
    const buf = this._buf = document.createElement('canvas');
    buf.width = W; buf.height = H;
    this._g = buf.getContext('2d', { willReadFrequently: mode === 'dots' });
    if (mode === 'voxel') { this._shade = document.createElement('canvas'); this._shade.width = W; this._shade.height = H; }
    this._key = '';
    this._ox = 0; this._oy = 0; this._tilt = 0; this._rx = 0; this._ry = 0;
    this._blinkEnd = 0; this._nextBlink = now() + rnd(1200, 3600);
    this._look = { x: 0, y: 0, until: 0 };
    this._lastPoke = now();
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-hidden', 'true');
    else this.setAttribute('role', 'img');
  }

  _down() {
    this._hop = now(); this._happy = now() + 650; this._lastPoke = now();
    this.dispatchEvent(new CustomEvent('piix:poke', { bubbles: true }));
  }

  _tick(dt, t) {
    if (!this._vis || !this._cv) return;
    const spec = this._spec, s = this._s, R = reduced();
    const r = this.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * .45;
    const idle = t - Math.max(ptr.last, this._lastPoke);
    const nap = this.hasAttribute('sleep-after') ? +this.getAttribute('sleep-after') : 25;
    const asleep = nap > 0 && idle > nap * 1000;
    const mode = this.getAttribute('look') || 'mouse';
    const vx = ptr.cx - cx, vy = ptr.cy - cy;
    const tracking = mode === 'mouse' && ptr.seen && idle < 4000;

    /* gaze, -1..1 on both axes */
    let gx = 0, gy = 0;
    if (tracking) { const k = Math.max(r.width, 40) * 1.4; gx = clamp(vx / k, -1, 1); gy = clamp(vy / k, -1, 1); }
    else if (mode !== 'none') {
      if (t > this._look.until) this._look = { x: rnd(-1, 1), y: rnd(-.7, .7), until: t + rnd(1200, 3000) };
      gx = this._look.x; gy = this._look.y;
    }
    if (asleep) { gx = 0; gy = 0; }
    if (t > this._nextBlink) { this._blinkEnd = t + 130; this._nextBlink = t + rnd(2400, 6000); }
    const eyes = asleep ? 'shut' : t < this._happy ? 'happy' : t < this._blinkEnd ? 'shut' : 'open';

    /* idle frames and a one-pixel breath */
    const fps = spec.fps || 2;
    const fi = R || spec.frames.length < 2 ? 0 : Math.floor(t / 1000 * fps * (asleep ? .4 : 1)) % spec.frames.length;
    const still = R || this.hasAttribute('still');
    const breath = still ? 0 : Math.floor(t / (asleep ? 1400 : 760)) % 2;
    const z = asleep && !R ? Math.floor(t / 700) % 3 : -1;
    const e0 = spec.eyes[0];
    const px = Math.round((gx + 1) / 2 * (e0 ? e0.w - spec.pupil.w : 0));
    const py = Math.round((gy + 1) / 2 * (e0 ? e0.h - spec.pupil.h : 0));

    /* voxel: the 3D turn, smoothed; the extrusion shows the side facing away from you */
    this._ry += ((still ? 0 : gx) - this._ry) * .12;
    this._rx += ((still ? 0 : gy) - this._rx) * .12;
    const ex = this._mode === 'voxel' ? Math.round(-this._ry * 4) / 4 : 0;
    const ey = this._mode === 'voxel' ? Math.round((-this._rx * .8 + .55) * 4) / 4 : 0;

    const key = [fi, breath, eyes, px, py, z, ex, ey].join();
    if (key !== this._key) { this._key = key; this._draw(fi, breath, eyes, px, py, z); this._present(ex, ey); }

    /* body motion */
    let tx = 0, ty = 0, sx = 1, sy = 1, tilt = 0;
    if (!still) {
      if (this._on('tilt') && tracking && !asleep) tilt = clamp(vx / (innerWidth * .4), -1, 1) * 8;
      if (this._on('shy') && ptr.seen && !asleep) {
        const d = Math.hypot(vx, vy) || 1, lim = r.width * 1.2;
        if (d < lim) { const k = (1 - d / lim) * r.width * .18; tx = -vx / d * k; ty = -vy / d * k; }
      }
      if (this._hop) {
        const p = (t - this._hop) / 460;
        if (p >= 1) this._hop = 0;
        else { ty -= Math.sin(Math.PI * p) * spec.h * s * .35; const q = Math.sin(Math.PI * p * 2) * .08; sx = 1 - q * .6; sy = 1 + q; }
      }
    }
    this._ox += (tx - this._ox) * .18; this._oy += (ty - this._oy) * .18; this._tilt += (tilt - this._tilt) * .1;
    const oy = this._hop ? ty : this._oy;
    const turn = this._mode === 'voxel' ? `perspective(${Math.round(r.width * 5)}px) rotateY(${(this._ry * 24).toFixed(1)}deg) rotateX(${(-this._rx * 14).toFixed(1)}deg) ` : '';
    this._wrap.style.transform = `translate(${this._ox.toFixed(1)}px,${oy.toFixed(1)}px) ${turn}rotate(${this._tilt.toFixed(1)}deg) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
  }

  /* compose one 1x frame: body, live eyes, z's */
  _draw(fi, breath, eyes, px, py, z) {
    const spec = this._spec, g = this._g, y0 = HEAD - breath, pal = this._pal;
    g.clearRect(0, 0, spec.w, spec.h + HEAD);
    g.drawImage(this._frames[fi], 0, y0);
    const ink = pal.k || '#17121f', lid = pal[spec.lid] || ink;
    const pupil = this.getAttribute('eye') || pal[spec.pupilKey || 'k'] || ink;
    for (const e of spec.eyes) {
      const x = e.x, y = e.y + y0;
      if (eyes === 'open') {
        g.fillStyle = pupil;
        g.fillRect(x + px, y + py, spec.pupil.w, spec.pupil.h);
        if (spec.glint && spec.pupil.w > 1) { g.fillStyle = spec.glint; g.fillRect(x + px, y + py, 1, 1); }
      } else {
        g.fillStyle = lid; g.fillRect(x, y, e.w, e.h);
        g.fillStyle = pupil;
        if (eyes === 'shut') g.fillRect(x, y + e.h - 1, e.w, 1);
        else { /* happy: an upside-down U */
          const top = y + Math.max(0, e.h - 2);
          g.fillRect(x, top, e.w, 1); g.fillRect(x, y + e.h - 1, 1, 1); g.fillRect(x + e.w - 1, y + e.h - 1, 1, 1);
        }
      }
    }
    if (z >= 0) {
      /* a little "z" drifting up in the headroom */
      g.fillStyle = pupil;
      const zx = spec.w - 4 + (z > 1 ? 1 : 0), zy = 2 - z;
      g.fillRect(zx, zy + 0, 3, 1); g.fillRect(zx + 1, zy + 1, 1, 1); g.fillRect(zx, zy + 2, 3, 1);
    }
  }

  /* put the composed frame on screen in the chosen style */
  _present(ex, ey) {
    const o = this._out, buf = this._buf, W = buf.width, H = buf.height, s = this._s, pad = this._pad, d = this._dpr;
    if (this._mode === 'pixel') { o.clearRect(0, 0, W, H); o.drawImage(buf, 0, 0); return; }
    o.setTransform(d, 0, 0, d, 0, 0);
    o.clearRect(0, 0, W * s + pad * 2, H * s + pad * 2);
    o.imageSmoothingEnabled = false;
    if (this._mode === 'dots') {
      /* one round dot per pixel, batched by colour */
      const data = this._g.getImageData(0, 0, W, H).data, groups = new Map(), rad = s * .44;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (data[i + 3] < 40) continue;
        const c = `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
        if (!groups.has(c)) groups.set(c, []);
        groups.get(c).push(x, y);
      }
      groups.forEach((pts, c) => {
        o.fillStyle = c; o.beginPath();
        for (let i = 0; i < pts.length; i += 2) {
          const cx = (pts[i] + .5) * s, cy = (pts[i + 1] + .5) * s;
          o.moveTo(cx + rad, cy); o.arc(cx, cy, rad, 0, 6.2832);
        }
        o.fill();
      });
      return;
    }
    /* voxel: stack darkened copies behind the face, half a pixel apart */
    const sh = this._shade, sg = sh.getContext('2d');
    sg.clearRect(0, 0, W, H); sg.globalCompositeOperation = 'source-over'; sg.drawImage(buf, 0, 0);
    sg.globalCompositeOperation = 'source-atop'; sg.fillStyle = 'rgba(10,6,20,.42)'; sg.fillRect(0, 0, W, H);
    const steps = this._depth * 2, u = s / 2;
    for (let i = steps; i >= 1; i--) o.drawImage(sh, pad + ex * i * u, pad + ey * i * u, W * s, H * s);
    o.drawImage(buf, pad, pad, W * s, H * s);
  }
}
Piixpal.figures = FIGURES;
Piixpal.figure = defineFigure;
