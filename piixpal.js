/*! Piixpal v0.1.0 | tiny pixel creatures that live on your website | MIT
 *  https://github.com/diiviikk5/Piixpal
 *
 *    <script src="piixpal.js"></script>
 *    <h1>Hello <piix-pal pal="bitbug"></piix-pal></h1>
 */
(() => {
'use strict';
if (window.Piixpal) return;
const VERSION = '0.1.0';

/* ---- core.js ---- */
/* The engine: one animation loop, one pointer, one overlay layer, a sprite baker
 * and the Actor that every pal is built from. Behaviours and pals plug in below. */

/* ---------- small helpers ---------- */
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reduceMQ.matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const chance = p => Math.random() < p;
const pick = a => a[(Math.random() * a.length) | 0];
const lerp = (a, b, k) => a + (b - a) * k;
const now = () => performance.now();
const hexRGBA = h => {
  h = h.replace('#', '');
  if (h.length <= 4) h = [...h].map(c => c + c).join('');
  const n = parseInt(h.padEnd(8, 'f'), 16);
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
};

/* ---------- shared pointer (client coords; doc coords on demand) ---------- */
const ptr = {
  cx: -1e5, cy: -1e5, seen: false, last: 0, down: false, vx: 0, vy: 0,
  get x() { return this.cx + scrollX; },
  get y() { return this.cy + scrollY; }
};
addEventListener('pointermove', e => {
  if (e.pointerType === 'touch' && !ptr.down) return;
  const t = now(), dt = Math.max(8, t - ptr.last);
  if (ptr.seen) { ptr.vx = lerp(ptr.vx, (e.clientX - ptr.cx) / dt * 1000, .35); ptr.vy = lerp(ptr.vy, (e.clientY - ptr.cy) / dt * 1000, .35); }
  ptr.cx = e.clientX; ptr.cy = e.clientY; ptr.seen = true; ptr.last = t;
}, { passive: true });
addEventListener('pointerdown', e => { ptr.down = true; ptr.cx = e.clientX; ptr.cy = e.clientY; ptr.seen = true; ptr.last = now(); }, { passive: true });
addEventListener('pointerup', () => { ptr.down = false; }, { passive: true });
document.addEventListener('pointerleave', () => { ptr.cx = ptr.cy = -1e5; }, { passive: true });
const ptrDist = (x, y) => Math.hypot(ptr.x - x, ptr.y - y);

/* ---------- scroll velocity (px/s), smoothed ---------- */
const scroll = { y: scrollY, v: 0 };

/* ---------- one loop for everything; it sleeps when nobody listens ---------- */
const subs = new Set();
let raf = 0, lastT = 0;
const frame = t => {
  const dt = Math.min(.05, lastT ? (t - lastT) / 1000 : 1 / 60);
  lastT = t;
  scroll.v = lerp(scroll.v, (scrollY - scroll.y) / Math.max(dt, .001), .25);
  scroll.y = scrollY;
  layerOrigin();
  subs.forEach(fn => fn(dt, t));
  raf = subs.size ? requestAnimationFrame(frame) : (lastT = 0);
};
const sub = fn => { subs.add(fn); if (!raf) raf = requestAnimationFrame(frame); };
const unsub = fn => subs.delete(fn);

/* ---------- geometry ---------- */
const rectOf = el => {
  const r = el.getBoundingClientRect();
  return { l: r.left + scrollX, t: r.top + scrollY, r: r.right + scrollX, b: r.bottom + scrollY, w: r.width, h: r.height };
};
const docW = () => document.documentElement.clientWidth;
const onScreen = (r, m = 200) => r.b > scrollY - m && r.t < scrollY + innerHeight + m && r.r > -m && r.l < docW() + m;
/* The y a pal stands on at doc-x. Elements can offer a custom contour via piixSurface(x). */
const surfaceAt = (el, x, r = rectOf(el)) => {
  if (typeof el.piixSurface === 'function') return el.piixSurface(x);
  return x >= r.l && x <= r.r ? r.t : null;
};

/* ---------- the overlay layer: absolute, in document space, never blocks clicks ---------- */
const LAYER_CSS = `
:host{all:initial}
.a{position:absolute;left:0;top:0;pointer-events:none;will-change:transform;contain:layout style}
.a canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:auto;cursor:grab;transform-origin:50% 100%;touch-action:none;-webkit-user-drag:none;user-select:none}
.a.held canvas{cursor:grabbing}
.a.nograb canvas{cursor:pointer}
.a.ghost canvas{pointer-events:none}
.bub{position:absolute;left:50%;bottom:100%;margin-bottom:var(--g);transform:translateX(-50%) scale(0);transform-origin:50% 100%;
  background:#fffdf5;padding:var(--p);line-height:0;pointer-events:none;
  box-shadow:0 calc(var(--u)*-1) 0 0 #1b1226,0 var(--u) 0 0 #1b1226,calc(var(--u)*-1) 0 0 0 #1b1226,var(--u) 0 0 0 #1b1226;
  transition:transform .14s steps(3)}
.bub::after{content:"";position:absolute;left:50%;top:100%;width:var(--u);height:var(--u);margin-left:calc(var(--u)*-.5);
  background:#fffdf5;box-shadow:0 var(--u) 0 0 #1b1226,calc(var(--u)*-1) 0 0 0 #1b1226,var(--u) 0 0 0 #1b1226}
.bub.on{transform:translateX(-50%) scale(1)}
.bub canvas{pointer-events:none;cursor:default;image-rendering:pixelated}
.thread{position:absolute;left:0;top:0;transform-origin:50% 0;pointer-events:none;background:currentColor;opacity:.75}
`;
let layer = null, layerRoot = null;
const origin = { x: 0, y: 0 };
const getLayer = () => {
  if (layerRoot) return layerRoot;
  layer = document.createElement('div');
  layer.setAttribute('data-piixpal', VERSION);
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:visible;z-index:2147482000;pointer-events:none;margin:0;padding:0;border:0';
  layerRoot = layer.attachShadow({ mode: 'open' });
  const st = document.createElement('style');
  st.textContent = LAYER_CSS;
  layerRoot.appendChild(st);
  document.body.appendChild(layer);
  layerOrigin();
  return layerRoot;
};
/* if <body> is positioned, the layer is offset; measure it once per frame */
function layerOrigin() {
  if (!layer) return;
  const r = layer.getBoundingClientRect();
  origin.x = r.left + scrollX; origin.y = r.top + scrollY;
}

/* ---------- sprites: palette-indexed strings, baked to tiny canvases ---------- */
const SPRITES = {};
const bake = (rows, pal, w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const pad = h - rows.length; /* short frames sit on the floor */
  rows.forEach((row, ry) => {
    for (let x = 0; x < row.length && x < w; x++) {
      const col = pal[row[x]];
      if (!col) continue;
      const [r, gg, b, a] = col, i = ((ry + pad) * w + x) * 4;
      img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = a;
    }
  });
  g.putImageData(img, 0, 0);
  return c;
};
/* Register a pal. spec = { w, h, palette:{ch:'#hex'}, frames:{clip:[rows[]]}, fps:{clip:n}, does:'behaviour', ... } */
const defineSprite = (name, spec) => {
  SPRITES[name] = spec;
  spec.name = name;
  spec._baked = null;
  return spec;
};
const baked = spec => {
  if (spec._baked) return spec._baked;
  const pal = {};
  for (const k in spec.palette) pal[k] = hexRGBA(spec.palette[k]);
  const out = {};
  for (const clip in spec.frames) out[clip] = spec.frames[clip].map(rows => bake(rows, pal, spec.w, spec.h));
  return (spec._baked = out);
};

/* ---------- Actor: one sprite on the layer ---------- */
class Actor {
  constructor(spec, opts = {}) {
    const root = getLayer();
    this.spec = spec;
    this.frames = baked(spec);
    this.s = Math.max(1, Math.round(opts.scale || spec.scale || 4));
    this.x = 0; this.y = 0;            /* foot point, document coords */
    this.face = 1;                     /* 1 = right, -1 = left (sprites are drawn facing right) */
    this.sx = 1; this.sy = 1; this.rot = 0; this.ox = 0; this.oy = 0;
    this.clip = null; this.fi = 0; this.ft = 0; this.fps = 6; this.loop = true; this.done = false;
    this._drawn = null; this._tf = ''; this._ctf = '';

    const n = this.node = document.createElement('div');
    n.className = 'a';
    n.style.setProperty('--u', Math.max(2, this.s >> 1) + 'px');
    n.style.setProperty('--p', Math.max(3, this.s) + 'px');
    n.style.setProperty('--g', Math.max(6, this.s * 2) + 'px');
    const cv = this.cv = document.createElement('canvas');
    cv.width = spec.w; cv.height = spec.h;
    cv.style.width = spec.w * this.s + 'px';
    cv.style.height = spec.h * this.s + 'px';
    if (opts.hue) cv.style.filter = `hue-rotate(${+opts.hue}deg)`;
    this.g = cv.getContext('2d');
    this.bub = document.createElement('div');
    this.bub.className = 'bub';
    n.append(this.bub, cv);
    root.appendChild(n);
    this.play(spec.start || Object.keys(spec.frames)[0]);
  }
  get w() { return this.spec.w * this.s; }
  get h() { return this.spec.h * this.s; }
  has(clip) { return !!this.frames[clip]; }
  /* play a clip; same clip keeps running unless reset */
  play(clip, { fps, loop = true, reset = false } = {}) {
    if (!this.frames[clip]) return this;
    if (clip !== this.clip || reset) { this.clip = clip; this.fi = 0; this.ft = 0; this.done = false; }
    this.fps = fps || (this.spec.fps && this.spec.fps[clip]) || 6;
    this.loop = loop;
    return this;
  }
  /* advance the clip by dt seconds */
  step(dt) {
    const fr = this.frames[this.clip];
    if (!fr || reduced()) return;
    this.ft += dt;
    const spf = 1 / this.fps;
    while (this.ft >= spf) {
      this.ft -= spf;
      if (this.fi + 1 < fr.length) this.fi++;
      else if (this.loop) this.fi = 0;
      else { this.done = true; break; }
    }
  }
  /* push state to the DOM; only touches what changed */
  render() {
    const f = this.frames[this.clip][this.fi];
    if (f !== this._drawn) {
      this._drawn = f;
      this.g.clearRect(0, 0, this.spec.w, this.spec.h);
      this.g.drawImage(f, 0, 0);
    }
    const W = this.w, H = this.h;
    let left = this.x - W / 2 + this.ox - origin.x;
    const top = this.y - H + this.oy - origin.y;
    left = clamp(left, -origin.x, docW() - W - origin.x);
    const tf = `translate3d(${Math.round(left)}px,${Math.round(top)}px,0)`;
    if (tf !== this._tf) { this._tf = tf; this.node.style.transform = tf; }
    const ctf = `scale(${(this.face * this.sx).toFixed(3)},${this.sy.toFixed(3)})` + (this.rot ? ` rotate(${this.rot.toFixed(2)}deg)` : '');
    if (ctf !== this._ctf) { this._ctf = ctf; this.cv.style.transform = ctf; }
  }
  /* pixel speech bubble with an icon from ICONS */
  say(icon, ms = 1200) {
    const ic = ICONS[icon];
    clearTimeout(this._bt);
    if (!ic) { this.bub.classList.remove('on'); return; }
    const s = Math.max(2, Math.round(this.s * .75));
    const c = bakeIcon(icon);
    c.style.width = c.width * s + 'px'; c.style.height = c.height * s + 'px';
    this.bub.replaceChildren(c);
    this.bub.classList.add('on');
    if (ms) this._bt = setTimeout(() => this.bub.classList.remove('on'), ms);
  }
  hush() { clearTimeout(this._bt); this.bub.classList.remove('on'); }
  /* is the pointer over this pal's box (doc coords)? */
  near(m = 0) {
    const cx = this.x + this.ox, cy = this.y - this.h / 2 + this.oy;
    return Math.abs(ptr.x - cx) < this.w / 2 + m && Math.abs(ptr.y - cy) < this.h / 2 + m;
  }
  destroy() { clearTimeout(this._bt); this.node.remove(); }
}

/* ---------- behaviours: (actor, target, host) => { tick(dt,t), poke(e)?, grab(e)?, destroy()? } ---------- */
const BEHAVIORS = {};
const defineBehavior = (name, fn) => { BEHAVIORS[name] = fn; };

/* ---------- public API ---------- */
const Piixpal = window.Piixpal = {
  version: VERSION,
  sprites: SPRITES,
  behaviors: BEHAVIORS,
  sprite: defineSprite,
  behavior: defineBehavior,
  get reducedMotion() { return reduced(); }
};

/* ---------- art helpers: build frames from parts instead of copy-pasting grids ---------- */
const art = {
  /* overlay patch rows onto base at (x, y). '_' in a patch keeps the base pixel, '.' erases it */
  put(base, x, y, patch) {
    const out = base.slice();
    patch.forEach((p, i) => {
      const ry = y + i;
      if (ry < 0) return;
      while (out.length <= ry) out.push('');
      let row = out[ry].padEnd(x + p.length, '.');
      for (let j = 0; j < p.length; j++) {
        if (p[j] === '_' || x + j < 0) continue;
        row = row.slice(0, x + j) + p[j] + row.slice(x + j + 1);
      }
      out[ry] = row;
    });
    return out;
  },
  /* apply several patches: art.compose(base, [x, y, patch], ...) */
  compose(base, ...patches) { return patches.reduce((r, [x, y, p]) => art.put(r, x, y, p), base); },
  flipV(rows) { return rows.slice().reverse(); },
  flipH(rows) { const w = Math.max(...rows.map(r => r.length)); return rows.map(r => [...r.padEnd(w, '.')].reverse().join('')); },
  /* drop empty rows from the bottom so the frame sits on the floor again */
  trim(rows) { const r = rows.slice(); while (r.length && !/[^.]/.test(r[r.length - 1])) r.pop(); return r; },
  /* shift right by n columns (negative = left) */
  shift(rows, n) { return rows.map(r => n >= 0 ? '.'.repeat(n) + r : r.slice(-n)); },
  /* swap palette keys: art.swap(rows, { w: 'k' }) */
  swap(rows, map) { return rows.map(r => [...r].map(c => map[c] || c).join('')); }
};
Piixpal.art = art;

/* ---- icons.js ---- */
/* Tiny glyphs for speech bubbles. Drawn, not typed: no fonts are loaded. */
const ICON_PAL = { k: '#1b1226', r: '#ff4d6d', b: '#3fc8ff', y: '#ffc93f', g: '#7bd63a' };
const ICONS = {
  '!': ['kk', 'kk', 'kk', 'kk', '..', 'kk'],
  '?': ['.kkkk.', 'kk..kk', '....kk', '..kkk.', '......', '..kk..'],
  '!?': ['kk..kkkk.', 'kk.kk..kk', 'kk....kk.', 'kk...kk..', '.........', 'kk...kk..'],
  '...': ['kk.kk.kk', 'kk.kk.kk'],
  heart: ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
  zz: ['kkkk.....', '..k......', '.k..kkk..', 'kkkk..k..', '.....k...', '....kkk..'],
  grr: ['.k.k..kkk..k', 'kkkkk.k.k..k', '.k.k..k.kk.k', 'kkkkk.k.....', '.k.k..kkk..k'],
  note: ['...kkk', '...k.k', '...k..', '.kkk..', 'kkkk..', '.kk...'],
  sweat: ['..b..', '.bbb.', 'bbbbb', 'bbbbb', '.bbb.'],
  star: ['...y...', '..yyy..', 'yyyyyyy', '.yyyyy.', '.yy.yy.', 'y.....y'],
  vein: ['.r...r.', 'rr...rr', '.......', 'rr...rr', '.r...r.'],
  hi: ['k..k.kk', 'k..k...', 'kkkk.kk', 'k..k.kk', 'k..k.kk'],
  eep: ['kkk.kkk.kkk.', 'k...k...k.k.', 'kk..kk..kkk.', 'k...k...k...', 'kkk.kkk.k...'],
  leaf: ['....gg', '..gggg', '.gggg.', 'gggg..', 'g.....']
};
const iconCache = {};
const iconPal = Object.fromEntries(Object.entries(ICON_PAL).map(([k, v]) => [k, hexRGBA(v)]));
const bakeIcon = name => {
  if (!iconCache[name]) {
    const rows = ICONS[name];
    const w = Math.max(...rows.map(r => r.length));
    iconCache[name] = bake(rows, iconPal, w, rows.length);
  }
  /* a fresh copy each time: a canvas can only live in one bubble */
  const src = iconCache[name], c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
};
Piixpal.icons = ICONS;

/* ---- behaviors/_drag.js ---- */
/* Shared pick-up-and-throw handling. Calls move(x, y, vx, vy) while held (foot point,
 * doc coords) and end({ moved, vx, vy }) on release. A press without movement is a click. */
const drag = (actor, e, { move, end }) => {
  const cv = actor.cv;
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* old browsers */ }
  const sx = e.clientX, sy = e.clientY;
  const px0 = sx + scrollX, py0 = sy + scrollY;
  const gx = actor.x - px0, gy = actor.y - py0;
  let moved = false, vx = 0, vy = 0, lx = px0, ly = py0, lt = now();
  const mv = ev => {
    const x = ev.clientX + scrollX, y = ev.clientY + scrollY, t = now(), d = Math.max(8, t - lt);
    vx = lerp(vx, (x - lx) / d * 1000, .5); vy = lerp(vy, (y - ly) / d * 1000, .5);
    lx = x; ly = y; lt = t;
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) {
      moved = true; actor.held = true; actor.node.classList.add('held');
    }
    if (moved && move) move(x + gx, y + gy, vx, vy);
  };
  const up = () => {
    cv.removeEventListener('pointermove', mv);
    cv.removeEventListener('pointerup', up);
    cv.removeEventListener('pointercancel', up);
    actor.held = false; actor.node.classList.remove('held');
    if (now() - lt > 90) vx = vy = 0; /* held still before letting go: just drop it */
    if (end) end({ moved, vx: clamp(vx, -2600, 2600), vy: clamp(vy, -2600, 2600) });
  };
  cv.addEventListener('pointermove', mv);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
};

/* ---- behaviors/crawl.js ---- */
/* crawl: walk along the top of an element's text, hop over gaps and letter steps,
 * stop to sniff and look around, scurry away from the cursor, flip over when poked.
 *
 * Surface, in order of preference:
 *   1. el.piixSurface(x)         (e.g. <piix-type> exposes the real letter contour)
 *   2. the first line of text    (real glyph tops, unless edge="box")
 *   3. the element's top edge */
/* Per-glyph contour of an element's first line of text: [{l, r, t}] in doc coords.
 * Each glyph's real ink top is measured with canvas metrics, so a pal climbs onto
 * a tall "T", steps down to an "e" and hops across spaces. Cached until layout moves. */
const measureCtx = document.createElement('canvas').getContext('2d');
const glyphTop = (ch, font) => {
  measureCtx.font = font;
  const m = measureCtx.measureText(ch);
  return [m.fontBoundingBoxAscent || 0, m.actualBoundingBoxAscent || 0];
};
const textProfile = (el, cache) => {
  const box = el.getBoundingClientRect();
  const key = [box.left, box.top, box.width, box.height, scrollX, scrollY, document.fonts.status].join();
  if (cache.key === key) return cache.v;
  const segs = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const rg = document.createRange();
  let top = null, n, count = 0;
  outer: while ((n = walk.nextNode())) {
    const p = n.parentElement;
    if (!p || p.closest('piix-pal')) continue;
    const cs = getComputedStyle(p);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const txt = n.data;
    for (let i = 0; i < txt.length && count < 400; i++, count++) {
      rg.setStart(n, i); rg.setEnd(n, i + 1);
      const r = rg.getClientRects()[0];
      if (!r || r.width < .5) continue;
      if (top === null) top = r.top;
      if (r.top - top > r.height * .6) break outer;   /* reached the second line */
      if (/\s/.test(txt[i])) continue;              /* spaces are gaps */
      const [fa, ga] = glyphTop(txt[i], font);
      segs.push({ l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY + (fa - ga) });
    }
  }
  /* glue neighbours into runs so tiny kerning gaps don't count as holes */
  for (let i = 1; i < segs.length; i++) if (segs[i].l - segs[i - 1].r < 2) segs[i - 1].r = segs[i].l;
  const v = segs.length ? { l: segs[0].l, r: segs[segs.length - 1].r, t: Math.min(...segs.map(s => s.t)), segs } : null;
  cache.key = key; cache.v = v;
  return v;
};
const segAt = (segs, x) => { for (const s of segs) if (x >= s.l && x <= s.r) return s.t; return null; };

defineBehavior('crawl', (a, [el], host) => {
  const mode = host.getAttribute('edge') || (typeof el.piixSurface === 'function' ? 'surface' : 'text');
  const S = a.s / 3;                      /* everything scales with the sprite */
  const speed = 30 * S * (+host.getAttribute('speed') || 1);
  const step = 2.5 * a.s;                 /* bigger than this and it hops instead */
  const reach = 34 * a.s;                 /* how far it will hop across a gap */
  let box = null, state = 'walk', timer = rnd(2, 4), hop = null, placed = false;
  const cache = {};

  const lane = () => {
    if (mode === 'surface') { const r = rectOf(el); return { l: r.l, r: r.r, t: r.t }; }
    if (mode === 'text') { const t = textProfile(el, cache); if (t) return t; }
    const r = rectOf(el); return { l: r.l, r: r.r, t: r.t };
  };
  const surf = x => {
    if (x < box.l + a.w * .3 || x > box.r - a.w * .3) return null;
    if (mode === 'surface') return el.piixSurface(x);
    return box.segs ? segAt(box.segs, x) : box.t;
  };
  const go = (st, t, clip, opt) => { state = st; timer = t; if (clip) a.play(clip, opt); };
  const startHop = (x1, y1) => {
    const hgt = Math.max(10 * S, a.y - y1 + 8 * S);
    hop = { x0: a.x, y0: a.y, x1, y1, p: 0, d: clamp(.28 + Math.abs(x1 - a.x) / 500, .28, .6), yc: Math.min(a.y, y1) - hgt * 1.4 };
    a.play('hop');
  };
  /* look ahead for somewhere to land; null if there's nowhere */
  const landing = from => {
    for (let dx = 2; dx < reach; dx += 2) {
      const x = from + a.face * dx, y = surf(x);
      if (y != null && Math.abs(y - a.y) < reach * 1.4) return [x + a.face * a.w * .15, surf(x + a.face * a.w * .15) ?? y];
    }
    return null;
  };
  const turn = () => { a.face = -a.face; };
  const move = v => {
    const nx = a.x + a.face * v * move.dt;
    const ny = surf(nx);
    if (ny != null && Math.abs(ny - a.y) <= step) { a.x = nx; a.y = ny; return; }
    const land = ny != null ? [nx + a.face * a.w * .2, surf(nx + a.face * a.w * .2) ?? ny] : landing(a.x);
    if (land && land[1] != null) startHop(land[0], land[1]);
    else if (state === 'scurry') turn();
    else { turn(); go('look', rnd(.6, 1.2), 'look'); }
  };

  return {
    tick(dt) {
      box = lane();
      if (!placed) {
        const at = host.getAttribute('at');
        a.x = box.l + (box.r - box.l) * (at != null ? clamp(+at, 0, 1) : rnd(.15, .85));
        a.y = surf(a.x) ?? box.t; a.face = chance(.5) ? 1 : -1;
        a.play('walk'); placed = true;
      }
      if (reduced()) { a.y = surf(a.x) ?? box.t; a.play('idle'); return; }
      move.dt = dt;

      /* mid-hop */
      if (hop) {
        hop.p = Math.min(1, hop.p + dt / hop.d);
        const p = hop.p, q = 1 - p;
        a.x = lerp(hop.x0, hop.x1, p);
        a.y = q * q * hop.y0 + 2 * q * p * hop.yc + p * p * hop.y1;
        a.sy = 1.08; a.sx = .94;
        if (p >= 1) { hop = null; a.y = surf(a.x) ?? a.y; a.sy = .8; a.sx = 1.15; a.play(state === 'flip' ? 'flip' : 'walk'); }
        return;
      }
      a.sx = lerp(a.sx, 1, .25); a.sy = lerp(a.sy, 1, .25);

      /* the ground moved under us (resize, reflow, text changed) */
      const g = surf(a.x);
      if (g == null) { a.x = clamp(a.x, box.l + a.w * .3, box.r - a.w * .3); a.y = surf(a.x) ?? box.t; }
      else if (Math.abs(g - a.y) > step) a.y = g;

      /* someone's coming */
      const scared = ptr.seen && ptrDist(a.x, a.y - a.h / 2) < 46 * S + a.w * .5;
      if (scared && (state === 'walk' || state === 'idle' || state === 'look' || state === 'sniff')) {
        go('alarm', .32, 'alarm'); a.say('!', 650);
      }

      timer -= dt;
      switch (state) {
        case 'walk':
          a.play('walk', { fps: 10 });
          move(speed);
          if (timer <= 0) {
            const r = Math.random();
            if (r < .4) go('sniff', rnd(1, 1.8), 'sniff');
            else if (r < .75) go('look', rnd(1.2, 2.2), 'look', { reset: true });
            else go('idle', rnd(1, 2.4), 'idle');
          }
          break;
        case 'alarm':
          if (timer <= 0) { a.face = ptr.x > a.x ? -1 : 1; go('scurry', rnd(.9, 1.4)); }
          break;
        case 'scurry':
          a.play('walk', { fps: 20 });
          move(speed * 3.4);
          if (timer <= 0) go('walk', rnd(2, 4));
          break;
        case 'flip':
          a.play('flip');
          if (timer <= 0) { a.rot = 0; startHop(a.x + a.face * 4 * S, a.y); go('walk', rnd(2, 4)); }
          break;
        default: /* idle, look, sniff */
          if (timer <= 0) { if (state === 'look' && chance(.4)) turn(); go('walk', rnd(3, 7), 'walk'); }
      }
    },
    poke() {
      if (state === 'flip' || hop) return;
      a.hush(); a.say(pick(['!?', 'grr', '!']), 900);
      startHop(a.x, a.y);
      go('flip', rnd(1.4, 2));
      a.play('flip');
    }
  };
});

/* ---- pals/bitbug.js ---- */
/* BITBUG — a lime beetle with one very curious antenna.
 * Job: crawls along the top of your text, climbs over letters, scurries if you get close,
 * and flips onto its back (legs flailing) when you poke it. */
(() => {
  const body = [
    '................',
    '...kkkkkk.......',
    '.kkGGggggkk.....',
    'kGGggsggggdk....',
    'kGgggggsggdkkkk.',
    'kgsggggggddkhhhk',
    'kdggggsggddkhhhk',
    'kddddddddddkhhpk',
    '.kkkkkkkkkkkkkk.'
  ];
  /* antenna: 4 rows that end right on top of the head (cols 12..15) */
  const ANT = {
    up: ['...k', '..k.', '..k.', '.k..'],
    twitch: ['..k.', '..k.', '.k..', '.k..'],
    sniff: ['....', '....', '...k', '.kk.'],
    back: ['k...', '.k..', '.k..', '.k..']
  };
  /* eye: 3x2 inside the head (cols 12..14, rows 5..6) */
  const EYE = {
    fwd: ['hww', 'hwk'],
    up: ['hwk', 'hww'],
    back: ['hww', 'hkw'],
    shut: ['hhh', 'hkk'],
    wide: ['wwk', 'wwk']
  };
  const LEGS = {
    a: ['..k...k...k.....', '.k...k...k......'],
    b: ['..k...k...k.....', '...k...k...k....'],
    stand: ['..k...k...k.....', '..k...k...k.....'],
    tuck: ['.k.k.k.k.k......']
  };
  const bug = (ant, eye, legs) => art.compose(body.concat(LEGS[legs]), [12, 0, ANT[ant]], [12, 5, EYE[eye]]);
  /* on its back: no antenna in the way, legs in the air, flailing */
  const belly = legs => art.trim(art.flipV(art.compose(body.concat(LEGS[legs]), [12, 5, EYE.shut])));

  defineSprite('bitbug', {
    w: 16, h: 11, scale: 3,
    does: 'crawl',
    palette: {
      k: '#1b1226', g: '#b8f23a', G: '#efffc0', d: '#6a9c1c', s: '#3f6b10',
      h: '#3a2a55', w: '#ffffff', p: '#ff7aa8'
    },
    frames: {
      walk: [bug('up', 'fwd', 'a'), bug('twitch', 'fwd', 'b')],
      idle: [bug('up', 'fwd', 'stand'), bug('up', 'fwd', 'stand'), bug('up', 'shut', 'stand'), bug('up', 'fwd', 'stand')],
      look: [bug('up', 'up', 'stand'), bug('twitch', 'up', 'stand'), bug('back', 'back', 'stand'), bug('back', 'back', 'stand')],
      sniff: [bug('sniff', 'fwd', 'stand'), bug('sniff', 'fwd', 'a'), bug('sniff', 'shut', 'stand'), bug('twitch', 'fwd', 'stand')],
      alarm: [bug('up', 'wide', 'stand'), bug('twitch', 'wide', 'tuck')],
      hop: [bug('up', 'wide', 'tuck')],
      flip: [belly('a'), belly('b')]
    },
    fps: { walk: 10, idle: 3, look: 2, sniff: 4, alarm: 12, flip: 12, hop: 1 }
  });
})();

/* ---- boot.js ---- */
/* <piix-pal pal="bitbug" do="crawl" on="#title" scale="4" hue="0">
 * Put it inside the element it should live on, or point at one with on="css selector".
 * The tag itself stays invisible; the pal is drawn on a shared overlay layer. */
class PiixPalElement extends HTMLElement {
  static get observedAttributes() { return ['pal', 'do', 'on', 'scale', 'hue', 'at', 'side']; }
  connectedCallback() {
    this.style.display = 'none';
    if (this._mounted) return;
    cancelAnimationFrame(this._q);
    /* two frames: let the page lay out (and webfonts settle) before measuring */
    this._q = requestAnimationFrame(() => { this._q = requestAnimationFrame(() => this._mount()); });
  }
  disconnectedCallback() {
    cancelAnimationFrame(this._q);
    /* a moved element reconnects in the same task; only tear down if it really left */
    queueMicrotask(() => { if (!this.isConnected) this._unmount(); });
  }
  attributeChangedCallback(n, a, b) {
    if (a === b || !this._mounted) return;
    this._unmount(); this._mount();
  }
  get actor() { return this._actor || null; }
  /* poke it from code: el.poke() */
  poke() { if (this._ctl && this._ctl.poke) this._ctl.poke(); }

  _mount() {
    if (!this.isConnected || this._mounted) return;
    const name = (this.getAttribute('pal') || '').toLowerCase();
    const spec = SPRITES[name] || SPRITES[Object.keys(SPRITES)[0]];
    if (!spec) return;
    const sel = this.getAttribute('on');
    let targets;
    try { targets = sel ? [...document.querySelectorAll(sel)] : [this.parentElement]; } catch (e) { targets = []; }
    targets = targets.filter(el => el && el !== document.documentElement);
    if (!targets.length) { console.warn('[piixpal] nothing to live on for', this); return; }
    const make = BEHAVIORS[this.getAttribute('do')] || BEHAVIORS[spec.does];
    if (!make) { console.warn('[piixpal] unknown behaviour', this.getAttribute('do') || spec.does); return; }

    const actor = this._actor = new Actor(spec, { scale: +this.getAttribute('scale') || 0, hue: this.getAttribute('hue') });
    actor.host = this;
    const ctl = this._ctl = make(actor, targets, this) || {};
    if (!ctl.grab) actor.node.classList.add('nograb');

    this._pd = e => {
      if (e.button > 0) return;
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('piix:poke', { bubbles: true }));
      if (ctl.grab) ctl.grab(e); else if (ctl.poke) ctl.poke(e);
    };
    actor.cv.addEventListener('pointerdown', this._pd);

    let first = true;
    this._tick = (dt, t) => {
      /* sleep when far off-screen, but always draw the first frame */
      const awake = first || Math.abs(actor.y - (scrollY + innerHeight / 2)) < innerHeight * 1.5 || actor.held;
      if (!awake) return;
      first = false;
      ctl.tick(dt, t);
      actor.step(dt);
      actor.render();
    };
    sub(this._tick);
    this._mounted = true;
    this.dispatchEvent(new CustomEvent('piix:ready', { bubbles: true, detail: { pal: spec.name } }));
  }
  _unmount() {
    if (!this._mounted) return;
    unsub(this._tick);
    if (this._ctl && this._ctl.destroy) this._ctl.destroy();
    if (this._actor) { this._actor.cv.removeEventListener('pointerdown', this._pd); this._actor.destroy(); }
    this._actor = this._ctl = null;
    this._mounted = false;
  }
}

const define = (n, c) => { if (!customElements.get(n)) customElements.define(n, c); };
define('piix-pal', PiixPalElement);
if (typeof PiixTypeElement !== 'undefined') define('piix-type', PiixTypeElement);
})();
