/*! Piixpal v0.3.0 | tiny pixel creatures that live on your website | MIT
 *  https://github.com/diiviikk5/Piixpal
 */
(() => {
'use strict';
const VERSION = '0.3.0';
const K = (window.Piixpal && window.Piixpal._k) || (function piixCore() {
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
/* box="selector": the element a pal is kept inside (its closest match, else the first on the page) */
const boxOf = host => {
  const sel = host.getAttribute('box');
  if (!sel) return null;
  try { return host.closest(sel) || document.querySelector(sel); } catch (_) { return null; }
};
/* pin a pal to the viewport: its x/y become viewport coords (plus the layer origin) */
const pin = a => { a.node.style.position = 'fixed'; a.pinned = true; return a; };
/* the world a pal lives in: its box="…" element in doc coords, or (pinning it) the viewport */
const areaOf = (host, a) => {
  const box = boxOf(host);
  if (!box && a) pin(a);
  return () => box ? rectOf(box) : { l: origin.x, t: origin.y, r: origin.x + docW(), b: origin.y + innerHeight, w: docW(), h: innerHeight, fixed: true };
};
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
  layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:visible;z-index:var(--piix-z,2147482000);pointer-events:none;margin:0;padding:0;border:0';
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

/* ---------- every live pal, so they can notice each other ---------- */
const ACTORS = new Set();
/* tell nearby pals something happened: their behaviour's hear(type, from, dist) runs */
const shout = (from, type, radius) => {
  ACTORS.forEach(o => {
    if (o === from || !o.ctl || !o.ctl.hear) return;
    const d = Math.hypot(o.x - from.x, (o.y - o.h / 2) - (from.y - from.h / 2));
    if (d < radius) o.ctl.hear(type, from, d);
  });
};

/* ---------- Actor: one sprite on the layer ---------- */
class Actor {
  constructor(spec, opts = {}) {
    const root = getLayer();
    this.spec = spec;
    this.frames = baked(spec);
    /* a little smaller on phones, unless asked not to */
    const base = opts.scale || spec.scale || 4;
    this.s = Math.max(1, Math.round(innerWidth > 0 && innerWidth < 640 && !opts.fixed ? Math.max(2, base * .75) : base));
    this.x = 0; this.y = 0;            /* foot point, document coords */
    this.face = 1;                     /* 1 = right, -1 = left (sprites are drawn facing right) */
    this.sx = 1; this.sy = 1; this.rot = 0; this.ox = 0; this.oy = 0;
    this.clip = null; this.fi = 0; this.ft = 0; this.fps = 6; this.loop = true; this.done = false;
    this._drawn = null; this._tf = ''; this._ctf = '';
    this.pinned = false;              /* true: x/y are viewport coords (+ origin), the node is position:fixed */

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
    ACTORS.add(this);
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
    const ic = ICONS[icon] || (typeof icon === 'string' && icon[0] === '#' && numberIcon(icon));
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
  /* the pointer in this pal's own coordinate space */
  get mx() { return this.pinned ? ptr.cx + origin.x : ptr.x; }
  get my() { return this.pinned ? ptr.cy + origin.y : ptr.y; }
  /* is the pointer over this pal's box? */
  near(m = 0) {
    const cx = this.x + this.ox, cy = this.y - this.h / 2 + this.oy;
    return Math.abs(this.mx - cx) < this.w / 2 + m && Math.abs(this.my - cy) < this.h / 2 + m;
  }
  destroy() { clearTimeout(this._bt); this.node.remove(); ACTORS.delete(this); }
}

/* a crew member for group behaviours: same scale as its leader, any registered pal */
const recruit = (lead, name, opts = {}) => new Actor(SPRITES[name] || lead.spec, { scale: opts.scale || lead.s, hue: opts.hue, fixed: true });

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

/* ---------- testing hook: run the simulation forward without waiting for frames ---------- */
Piixpal.advance = (seconds = 1, fps = 60) => {
  const dt = 1 / fps;
  let t = lastT || now();
  for (let i = 0, n = Math.round(seconds * fps); i < n; i++) {
    t += dt * 1000;
    scroll.v = lerp(scroll.v, (scrollY - scroll.y) / dt, .25); scroll.y = scrollY;
    layerOrigin();
    subs.forEach(fn => fn(dt, t));
  }
  lastT = 0;
};

/* ---------- shape painting, for bigger characters ---------- */
Object.assign(art, {
  /* build rows from fn(x, y) -> palette key or falsy */
  paint(w, h, fn) { return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => fn(x, y) || '.').join('')); },
  ellipse(x, y, cx, cy, rx, ry) { const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; return dx * dx + dy * dy <= 1; },
  rrect(x, y, x0, y0, x1, y1, r) {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x, cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + .5;
  },
  /* give a flat body key some volume: shade its bottom-right rim, light its top-left rim */
  volume(rows, body = 'b', shade = 'd', light = 'B') {
    const at = (x, y) => (rows[y] || '')[x] || '.';
    return rows.map((r, y) => [...r].map((c, x) => {
      if (c !== body) return c;
      if (at(x + 1, y) === '.' || at(x, y + 1) === '.') return shade;
      if ((at(x - 1, y) === '.' || at(x, y - 1) === '.') && y < rows.length * .55 && x < r.length * .6) return light;
      return c;
    }).join(''));
  }
});

/* wrap a painted shape in a 1px outline (empty pixels touching the shape become `ink`) */
art.outline = (rows, ink = 'k') => rows.map((r, y) => [...r].map((c, x) => {
  if (c !== '.') return c;
  const at = (xx, yy) => ((rows[yy] || '')[xx] || '.') !== '.';
  return at(x + 1, y) || at(x - 1, y) || at(x, y + 1) || at(x, y - 1) ? ink : '.';
}).join(''));

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
  leaf: ['....gg', '..gggg', '.gggg.', 'gggg..', 'g.....'],
  copy: ['.kkkk..', '.k..kkk', '.k..k.k', '.k..k.k', '.kkkk.k', '...k..k', '...kkkk'],
  check: ['......g', '.....gg', 'g...gg.', 'gg.gg..', '.ggg...', '..g....'],
  x: ['r...r', '.r.r.', '..r..', '.r.r.', 'r...r'],
  up: ['..k..', '.kkk.', 'kkkkk', '..k..', '..k..']
};
/* 3x5 digits; say('#12') composes a number bubble */
const DIGITS = ['kkk|k.k|k.k|k.k|kkk', '.k.|kk.|.k.|.k.|kkk', 'kkk|..k|kkk|k..|kkk', 'kkk|..k|.kk|..k|kkk', 'k.k|k.k|kkk|..k|..k',
  'kkk|k..|kkk|..k|kkk', 'kkk|k..|kkk|k.k|kkk', 'kkk|..k|.k.|.k.|.k.', 'kkk|k.k|kkk|k.k|kkk', 'kkk|k.k|kkk|..k|kkk'].map(d => d.split('|'));
const numberIcon = name => {
  if (!ICONS[name] && /^#\d+$/.test(name)) {
    const ds = name.slice(1).split('').map(Number);
    ICONS[name] = [0, 1, 2, 3, 4].map(y => ds.map(d => DIGITS[d][y]).join('.'));
  }
  return ICONS[name];
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

/* ---- ui.js ---- */
/* Real words for pals that need them: toasts, tour cards, tooltips, summaries.
 * Cards live in their own shadow root, above the pals and NOT aria-hidden, so screen
 * readers and keyboards can use them. They look like the pixel speech bubbles. */
const UI_INK = '#1b1226', UI_PAPER = '#fffdf5';
const UI_FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif';
const UI_MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
const UI_CSS = `
:host{all:initial}
.card{position:absolute;left:0;top:0;box-sizing:border-box;width:max-content;max-width:min(var(--w,300px),calc(100vw - 24px));
  padding:12px 14px;font:500 14px/1.45 ${UI_FONT};color:${UI_INK};background:${UI_PAPER};text-align:left;
  box-shadow:0 -3px 0 ${UI_INK},0 3px 0 ${UI_INK},-3px 0 0 ${UI_INK},3px 0 0 ${UI_INK},6px 9px 0 rgba(27,18,38,.18);
  pointer-events:auto;transform-origin:var(--tx,50%) 100%;animation:piix-in .22s steps(4) both}
.card.below{transform-origin:var(--tx,50%) 0}
.card.fixed{position:fixed}
.card.tip::after{content:"";position:absolute;left:var(--tx,50%);top:100%;width:6px;height:6px;margin:3px 0 0 -3px;background:${UI_PAPER};
  box-shadow:0 3px 0 ${UI_INK},-3px 0 0 ${UI_INK},3px 0 0 ${UI_INK}}
.card.tip.below::after{top:auto;bottom:100%;margin:0 0 3px -3px;box-shadow:0 -3px 0 ${UI_INK},-3px 0 0 ${UI_INK},3px 0 0 ${UI_INK}}
.card h4{margin:0 0 5px;font:800 11px/1.2 ${UI_MONO};letter-spacing:.07em;text-transform:uppercase;color:#6c6477;display:flex;align-items:center;gap:7px}
.card p{margin:0}
.card ul{margin:2px 0 0;padding-left:18px}
.card li{margin:4px 0}
.card .row{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;align-items:center;margin-top:12px}
.card .row .n{margin-right:auto;font:700 12px/1 ${UI_MONO};color:#6c6477}
.card button,.card a.b{font:700 13px/1 ${UI_FONT};padding:9px 12px;border:0;border-radius:0;background:${UI_INK};color:${UI_PAPER};cursor:pointer;
  text-decoration:none;box-shadow:0 3px 0 rgba(27,18,38,.32);transition:transform .08s}
.card button:active,.card a.b:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(27,18,38,.32)}
.card button.ghost{background:transparent;color:${UI_INK};box-shadow:inset 0 0 0 2px ${UI_INK}}
.card button.x{position:absolute;right:4px;top:4px;width:24px;height:24px;padding:0;background:transparent;color:${UI_INK};box-shadow:none;font:700 17px/1 ${UI_FONT}}
.card button:focus-visible,.card a:focus-visible{outline:3px solid #6b4cff;outline-offset:2px}
.card a{color:inherit}
.card canvas{image-rendering:pixelated;flex:none}
.card .ic{display:flex;gap:10px;align-items:flex-start}
.card.out{animation:piix-out .16s steps(3) both}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@keyframes piix-in{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}
@keyframes piix-out{to{transform:scale(.5);opacity:0}}
@media (prefers-reduced-motion:reduce){.card,.card.out{animation:none}}
`;
let uiHost = null, uiShadow = null, uiLive = null;
const uiRoot = () => {
  if (uiShadow) return uiShadow;
  uiHost = document.createElement('div');
  uiHost.setAttribute('data-piixpal-ui', '');
  uiHost.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:visible;z-index:calc(var(--piix-z,2147482000) + 1);margin:0;padding:0;border:0';
  uiShadow = uiHost.attachShadow({ mode: 'open' });
  const st = document.createElement('style');
  st.textContent = UI_CSS;
  uiLive = document.createElement('div');
  uiLive.className = 'sr';
  uiLive.setAttribute('aria-live', 'polite');
  uiShadow.append(st, uiLive);
  document.body.appendChild(uiHost);
  return uiShadow;
};
/* uiEl('p', { text, cls, attrs, on, style }, ...children) */
const uiEl = (tag, o = {}, ...kids) => {
  const e = document.createElement(tag);
  if (o.cls) e.className = o.cls;
  if (o.text != null) e.textContent = o.text;
  if (o.style) e.style.cssText = o.style;
  if (o.attrs) for (const k in o.attrs) e.setAttribute(k, o.attrs[k]);
  if (o.on) for (const k in o.on) e.addEventListener(k, o.on[k]);
  e.append(...kids.filter(k => k != null && k !== false));
  return e;
};
/* a pixel icon from ICONS as an inline canvas */
const uiIcon = (name, s = 3) => {
  if (!ICONS[name] && !numberIcon(name)) return null;
  const c = bakeIcon(name);
  c.style.width = c.width * s + 'px'; c.style.height = c.height * s + 'px';
  return c;
};
/* a new card: { fixed, tip, cls, width, attrs } */
const uiCard = (o = {}) => {
  const c = uiEl('div', { cls: 'card' + (o.fixed ? ' fixed' : '') + (o.tip ? ' tip' : '') + (o.cls ? ' ' + o.cls : ''), attrs: o.attrs });
  if (o.width) c.style.setProperty('--w', o.width + 'px');
  uiRoot().appendChild(c);
  return c;
};
/* put a card's tail at (x, y): doc coords, or viewport coords (+ origin) for fixed cards.
 * It sits above the point (or below), flips if there's no room, and stays inside `area`. */
const uiPlace = (c, x, y, { below = false, gap = 12, area } = {}) => {
  const fixed = c.classList.contains('fixed');
  const o = uiHost.getBoundingClientRect();
  const ox = fixed ? origin.x : o.left + scrollX, oy = fixed ? origin.y : o.top + scrollY;
  const A = area || (fixed ? { l: origin.x, r: origin.x + docW(), t: origin.y, b: origin.y + innerHeight } : { l: scrollX, r: scrollX + docW(), t: scrollY, b: scrollY + innerHeight });
  const w = c.offsetWidth, h = c.offsetHeight;
  if (!below && y - h - gap < A.t + 4 && y + gap + h < A.b) below = true;
  else if (below && y + gap + h > A.b - 4 && y - h - gap > A.t) below = false;
  const left = clamp(x - w / 2, A.l + 6, Math.max(A.l + 6, A.r - w - 6));
  const top = below ? y + gap : y - h - gap;
  c.classList.toggle('below', below);
  c.style.setProperty('--tx', Math.round(clamp(x - left, 14, w - 14)) + 'px');
  c.style.left = Math.round(left - ox) + 'px';
  c.style.top = Math.round(top - oy) + 'px';
};
/* put a card's top-left corner at (x, y), in the same coordinates as uiPlace */
const uiAt = (c, x, y) => {
  const fixed = c.classList.contains('fixed');
  const o = uiHost.getBoundingClientRect();
  c.style.left = Math.round(x - (fixed ? origin.x : o.left + scrollX)) + 'px';
  c.style.top = Math.round(y - (fixed ? origin.y : o.top + scrollY)) + 'px';
};
const uiClose = c => {
  if (!c || c._closing) return;
  c._closing = true;
  if (reduced()) { c.remove(); return; }
  c.classList.add('out');
  setTimeout(() => c.remove(), 170);
};
/* tell screen readers something happened */
const uiAnnounce = text => {
  uiRoot();
  uiLive.textContent = '';
  setTimeout(() => { uiLive.textContent = text; }, 40);
};

/* ---- text.js ---- */
/* Text geometry shared by every pal that lives on text. */
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

/* ---------- surfaces: the top edges things can stand or land on ---------- */
/* what counts as a surface by default (toys, the platformer, weather…) */
const LAND = 'h1,h2,h3,h4,p,li,button,.btn,img,pre,blockquote,figure,footer,nav,header,table,.card,[data-piix-land]';
const platCache = { at: -1, sel: '', list: [] };
/* a surface: text elements use their first line's glyph tops, everything else its box */
const TEXTY = /^(H[1-6]|P|LI|BLOCKQUOTE|DT|DD|FIGCAPTION|LABEL)$/;
const surfaceOf = el => {
  const r = el.getBoundingClientRect();
  if (r.width <= 8 || r.height <= 2 || r.bottom < -400 || r.top > innerHeight + 2000) return null;
  if (TEXTY.test(el.tagName)) {
    const rg = document.createRange();
    rg.selectNodeContents(el);
    const rs = [...rg.getClientRects()].filter(q => q.width > 1);
    if (rs.length) {
      const top = rs[0].top, line = rs.filter(q => q.top - top < 4);
      const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
      return { el, l: Math.min(...line.map(q => q.left)) + scrollX, r: Math.max(...line.map(q => q.right)) + scrollX, t: top + scrollY + (line[0].height - fs) / 2 + fs * .26 };
    }
  }
  return { el, l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY };
};
/* every surface's top edge in doc coords, measured at most once per frame for everyone */
const platforms = (sel, extra) => {
  const t = Math.floor(now() / 16);
  if (platCache.at !== t || platCache.sel !== sel) {
    platCache.at = t; platCache.sel = sel;
    let els = [];
    try { els = [...document.querySelectorAll(sel)]; } catch (_) { /* bad selector */ }
    platCache.list = els.map(surfaceOf).filter(Boolean);
  }
  if (extra) { const p = surfaceOf(extra); return p ? platCache.list.concat(p) : platCache.list; }
  return platCache.list;
};

/* ---- drag.js ---- */
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

/* ---- elements/crowd.js ---- */
/* <piix-crowd mode="crowd|swarm|form" count="80" text="HELLO" height="420">
 * A stage full of tiny agents on one canvas, depth-sorted on a 2.5D floor.
 *   crowd   they wander, stop to high-five when they meet, and dodge the cursor
 *   swarm   they flock across the floor after the cursor
 *   form    they walk into place to spell `text`; click to scatter, they regroup
 * Everywhere: click empty floor to drop in a new one, grab one and throw it.
 * Batched Canvas 2D: hundreds of agents at 60fps without WebGL. */
const BLIP = (() => {
  const body = [
    '..kkkkk..',
    '.kbBbbbk.',
    '.kbkbkbk.',
    '.kbbbbbk.',
    '.kbbbbbk.',
    '.kdbbbdk.',
    '..kkkkk..'
  ];
  const legs = { a: '..k...k..', b: '...k.k...', stand: '..k...k..', dangle: '.k.....k.' };
  const f = (rows, l) => rows.concat([l]);
  return {
    w: 9, h: 8,
    frames: {
      walkA: f(body, legs.a), walkB: f(body, legs.b), stand: f(body, legs.stand),
      wave: f(art.compose(body, [7, 0, ['.k']], [7, 1, ['kk']]), legs.stand),
      held: f(art.put(body, 2, 2, ['bkbkb']), legs.dangle),
      dizzy: f(art.put(body, 2, 2, ['kbbbk']), legs.stand),
      sleep: f(art.put(body, 2, 2, ['bbbbb', 'kbbbk'].slice(0, 1)), legs.stand)
    }
  };
})();
const CROWD_COLORS = ['#c6f432', '#ff6b4a', '#6b4cff', '#58c8ff', '#ffd23f', '#ff9cc2', '#25b89a', '#f4f1fa'];

class PiixCrowdElement extends HTMLElement {
  static get observedAttributes() { return ['mode', 'count', 'text', 'scale']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._tick = this._tick.bind(this);
    this._agents = []; this._fx = []; this._vis = true;
  }
  connectedCallback() {
    this.shadowRoot.innerHTML = `<style>
:host{display:block;position:relative;height:${+this.getAttribute('height') || 420}px;touch-action:none;user-select:none}
canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;cursor:grab}
canvas.held{cursor:grabbing}
</style><canvas aria-hidden="true"></canvas>`;
    this._cv = this.shadowRoot.querySelector('canvas');
    this._g = this._cv.getContext('2d');
    this.setAttribute('role', 'img');
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'A crowd of tiny pixel characters');
    this._bake();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this);
    this._io = new IntersectionObserver(es => { this._vis = es[es.length - 1].isIntersecting; }, { rootMargin: '100px' });
    this._io.observe(this);
    this._cv.addEventListener('pointerdown', e => this._down(e));
    this._resize();
    sub(this._tick);
  }
  disconnectedCallback() { unsub(this._tick); if (this._ro) this._ro.disconnect(); if (this._io) this._io.disconnect(); }
  attributeChangedCallback(n) {
    if (!this._cv) return;
    if (n === 'scale') { this._bake(); return; }
    if (n === 'text' || n === 'mode') this._targets();
    if (n === 'count') this._populate();
  }
  get mode() { const m = this.getAttribute('mode'); return m === 'swarm' || m === 'form' ? m : 'crowd'; }
  /* scatter everyone, then let them settle again */
  scatter() { this._agents.forEach(a => { a.vx += rnd(-300, 300); a.vy += rnd(-200, 200); a.z = Math.max(a.z, 0); a.vz = rnd(150, 320); a.scatter = 1.4; }); }

  _bake() {
    /* every frame in every colour, facing both ways, baked once */
    const s = this._s = +this.getAttribute('scale') || 3;
    this._sprites = CROWD_COLORS.map(col => {
      const pal = { k: hexRGBA('#17121f'), b: hexRGBA(col), B: hexRGBA(mixHex(col, .45)), d: hexRGBA(mixHex(col, -.22)) };
      const out = {};
      for (const k in BLIP.frames) {
        const one = bake(BLIP.frames[k], pal, BLIP.w, BLIP.h);
        const right = document.createElement('canvas'); right.width = BLIP.w * s; right.height = BLIP.h * s;
        const rg = right.getContext('2d'); rg.imageSmoothingEnabled = false; rg.drawImage(one, 0, 0, right.width, right.height);
        const left = document.createElement('canvas'); left.width = right.width; left.height = right.height;
        const lg = left.getContext('2d'); lg.translate(left.width, 0); lg.scale(-1, 1); lg.drawImage(right, 0, 0);
        out[k] = [left, right];
      }
      return out;
    });
  }
  _resize() {
    const r = this.getBoundingClientRect(), d = this._dpr = Math.min(devicePixelRatio || 1, 2);
    this._W = r.width; this._H = r.height;
    this._cv.width = Math.round(r.width * d); this._cv.height = Math.round(r.height * d);
    if (!this._agents.length) this._populate(); else this._agents.forEach(a => { a.x = clamp(a.x, 8, this._W - 8); a.y = clamp(a.y, 20, this._H - 6); });
    this._targets();
  }
  _new(x, y, z = 0) {
    return { x, y, z, vx: 0, vy: 0, vz: 0, c: (Math.random() * CROWD_COLORS.length) | 0, face: chance(.5) ? 1 : 0,
      state: 'walk', timer: rnd(1, 4), gx: x, gy: y, t: rnd(0, 1), mate: null, dizzy: 0, scatter: 0, tx: null, ty: null };
  }
  _populate() {
    const n = clamp(+this.getAttribute('count') || (this.mode === 'form' ? 160 : 70), 1, 600);
    while (this._agents.length < n) this._agents.push(this._new(rnd(10, this._W - 10), rnd(30, this._H - 8)));
    this._agents.length = n;
    this._targets();
  }
  /* formation: rasterise the text and hand each agent a spot */
  _targets() {
    this._agents.forEach(a => { a.tx = a.ty = null; });
    if (this.mode !== 'form' || !this._W) return;
    const text = (this.getAttribute('text') || 'HELLO').slice(0, 16);
    const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
    const rows = 40, font = `900 ${rows}px ${getComputedStyle(this).fontFamily || 'sans-serif'}`;
    x.font = font;
    const w = Math.ceil(x.measureText(text).width) + 4; c.width = w; c.height = Math.ceil(rows * 1.1);
    x.font = font; x.textBaseline = 'top'; x.fillText(text, 2, 2);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    /* pick the coarsest grid that still has a spot for (nearly) everyone */
    let pts = [], step = 1;
    const sample = st => { const out = []; for (let yy = 0; yy < c.height; yy += st) for (let xx = 0; xx < c.width; xx += st) if (d[(yy * c.width + xx) * 4 + 3] > 120) out.push([xx, yy]); return out; };
    for (let st = 8; st >= 1; st--) { pts = sample(st); step = st; if (pts.length >= this._agents.length * .92) break; }
    const cell = Math.min((this._W - 40) / c.width, (this._H - 50) / c.height);
    const ox = (this._W - c.width * cell) / 2, oy = (this._H - c.height * cell) / 2 + 20;
    /* nearest-ish assignment: sort both by x so nobody crosses the whole stage */
    const spots = pts.map(([px, py]) => [ox + px * cell, oy + py * cell]).sort((p, q) => p[0] - q[0]);
    const order = this._agents.slice().sort((p, q) => p.x - q.x);
    order.forEach((a, i) => { const s = spots[Math.floor(i * spots.length / order.length)]; if (s && i < spots.length * 1.0) { a.tx = s[0]; a.ty = s[1]; } });
  }

  _local(e) { const r = this._cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  _hit(x, y) {
    const s = this._s, w = BLIP.w * s, h = BLIP.h * s;
    let best = null;
    for (const a of this._agents) if (Math.abs(x - a.x) < w / 2 + 2 && y < a.y - a.z + 2 && y > a.y - a.z - h - 2 && (!best || a.y > best.y)) best = a;
    return best;
  }
  _down(e) {
    if (e.button > 0) return;
    e.preventDefault();
    const [x, y] = this._local(e);
    const a = this._hit(x, y);
    if (!a) {
      /* empty floor: drop a new one in (or scatter the formation) */
      if (this.mode === 'form' && this._agents.some(q => q.tx != null)) { this.scatter(); return; }
      if (this._agents.length < 600) { const n = this._new(x, clamp(y, 24, this._H - 6), 220); n.vz = -50; this._agents.push(n); }
      return;
    }
    try { this._cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    a.held = true; a.state = 'held'; this._cv.classList.add('held');
    let lx = x, ly = y, lt = now(), vx = 0, vy = 0;
    const mv = ev => {
      const [mx, my] = this._local(ev), t = now(), dt = Math.max(8, t - lt);
      vx = lerp(vx, (mx - lx) / dt * 1000, .5); vy = lerp(vy, (my - ly) / dt * 1000, .5); lx = mx; ly = my; lt = t;
      a.x = clamp(mx, 6, this._W - 6); a.z = Math.max(20, a.y - my + BLIP.h * this._s * .6);
    };
    const up = () => {
      this._cv.removeEventListener('pointermove', mv); this._cv.removeEventListener('pointerup', up); this._cv.removeEventListener('pointercancel', up);
      this._cv.classList.remove('held');
      a.held = false; a.state = 'air';
      if (now() - lt > 90) vx = vy = 0;
      a.vx = clamp(vx, -900, 900); a.vy = clamp(vy * .25, -300, 300); a.vz = clamp(-vy * .6, -200, 700);
    };
    this._cv.addEventListener('pointermove', mv); this._cv.addEventListener('pointerup', up); this._cv.addEventListener('pointercancel', up);
  }

  _tick(dt, t) {
    if (!this._vis || !this._W) return;
    const R = reduced(), W = this._W, H = this._H, A = this._agents, mode = this.mode;
    const r = this.getBoundingClientRect();
    const px = ptr.cx - r.left, py = ptr.cy - r.top;
    const inside = ptr.seen && px > 0 && py > 0 && px < W && py < H;
    if (!R) for (const a of A) {
      if (a.held) continue;
      a.t += dt;
      /* air time: thrown or dropped in */
      if (a.z > 0 || a.vz > 0 || a.state === 'air') {
        a.vz -= 1400 * dt; a.z += a.vz * dt; a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < 6 || a.x > W - 6) { a.vx *= -.6; a.x = clamp(a.x, 6, W - 6); }
        a.y = clamp(a.y, 24, H - 4);
        if (a.z <= 0) {
          a.z = 0;
          if (a.vz < -260) { a.vz = -a.vz * .35; this._fx.push({ x: a.x, y: a.y, t: 0, k: 'dust' }); }
          else { a.vz = 0; a.vx *= .3; a.vy *= .3; a.state = 'walk'; a.timer = rnd(.5, 2); if (Math.hypot(a.vx, a.vy) > 30 || a._fell) a.dizzy = 1.2; }
        }
        continue;
      }
      a.dizzy = Math.max(0, a.dizzy - dt);
      a.scatter = Math.max(0, a.scatter - dt);
      let fx = 0, fy = 0, speed = 34;
      if (mode === 'swarm' && inside) {
        /* head for the cursor, but keep a little personal space */
        const dx = px - a.x, dy = py - a.y, d = Math.hypot(dx, dy) || 1;
        if (d > 30) { fx += dx / d * 90; fy += dy / d * 90; }
        speed = 70;
      } else if (mode === 'form' && a.tx != null && a.scatter <= 0) {
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        if (d > 1.5) { fx += dx / d * Math.min(80, d * 4); fy += dy / d * Math.min(80, d * 4); speed = 60; a.state = 'walk'; }
        else { a.x = a.tx; a.y = a.ty; a.vx = a.vy = 0; a.state = a.t % 9 < .4 ? 'wave' : 'stand'; a.face = 1; }
      } else {
        /* wander between little waypoints, sometimes stop for a wave */
        a.timer -= dt;
        if (a.state === 'walk') {
          const dx = a.gx - a.x, dy = a.gy - a.y, d = Math.hypot(dx, dy);
          if (d < 4 || a.timer <= 0) {
            if (chance(.35)) { a.state = chance(.3) ? 'wave' : 'stand'; a.timer = rnd(.8, 2.5); }
            else { a.gx = clamp(a.x + rnd(-120, 120), 10, W - 10); a.gy = clamp(a.y + rnd(-70, 70), 26, H - 6); a.timer = rnd(2, 5); }
          } else { fx += dx / d * 40; fy += dy / d * 40; }
        } else if (a.timer <= 0 && a.state !== 'five') { a.state = 'walk'; a.timer = rnd(2, 5); }
      }
      /* the cursor parts the crowd */
      if (inside && mode !== 'swarm') {
        const dx = a.x - px, dy = a.y - py, d = Math.hypot(dx, dy) || 1;
        if (d < 56) { fx += dx / d * 900 / Math.max(d / 14, 1); fy += dy / d * 900 / Math.max(d / 14, 1); a.state = 'walk'; }
      }
      if (a.state === 'walk' || mode === 'swarm' || (fx || fy)) {
        a.vx = lerp(a.vx, fx, 1 - Math.exp(-6 * dt)); a.vy = lerp(a.vy, fy, 1 - Math.exp(-6 * dt));
        const sp = Math.hypot(a.vx, a.vy), lim = speed * 2.2;
        if (sp > lim) { a.vx *= lim / sp; a.vy *= lim / sp; }
        a.x = clamp(a.x + a.vx * dt, 6, W - 6); a.y = clamp(a.y + a.vy * dt, 24, H - 4);
        if (Math.abs(a.vx) > 3) a.face = a.vx > 0 ? 1 : 0;
      }
    }

    /* separation + high fives (crowd mode), using a coarse grid so it stays cheap */
    if (!R) {
      const cell = 16, grid = new Map();
      for (const a of A) { const k = ((a.x / cell) | 0) + ',' + ((a.y / cell) | 0); (grid.get(k) || grid.set(k, []).get(k)).push(a); }
      for (const a of A) {
        if (a.held || a.z > 0) continue;
        const gx = (a.x / cell) | 0, gy = (a.y / cell) | 0;
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
          const list = grid.get((gx + i) + ',' + (gy + j)); if (!list) continue;
          for (const o of list) {
            if (o === a || o.z > 0) continue;
            const dx = a.x - o.x, dy = a.y - o.y, d = Math.hypot(dx, dy * 2) || .1;
            if (d < 9 && !(mode === 'form' && a.tx != null && a.scatter <= 0)) { a.x += dx / d * .6; a.y += dy / d * .3; }
            if (mode === 'crowd' && d < 14 && a.state === 'walk' && o.state === 'walk' && !a.mate && !o.mate && chance(.02)) {
              a.mate = o; o.mate = a; a.state = o.state = 'five'; a.timer = o.timer = .7;
              a.face = o.x > a.x ? 1 : 0; o.face = 1 - a.face;
              this._fx.push({ x: (a.x + o.x) / 2, y: Math.min(a.y, o.y) - BLIP.h * this._s - 4, t: 0, k: 'spark' });
            }
          }
        }
      }
      for (const a of A) if (a.state === 'five') { a.timer -= dt; if (a.timer <= 0) { a.state = 'walk'; a.timer = rnd(1, 3); a.mate = null; a.gx = clamp(a.x + (a.face ? -80 : 80), 10, W - 10); } }
    }
    this._render(t);
  }

  _render(t) {
    const g = this._g, d = this._dpr, s = this._s, W = this._W, H = this._H;
    g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, W, H);
    g.imageSmoothingEnabled = false;
    const A = this._agents.slice().sort((p, q) => p.y - q.y);
    /* shadows first, then everyone back to front */
    g.fillStyle = 'rgba(23,18,31,.16)';
    for (const a of A) { const w = BLIP.w * s * (a.z > 0 ? clamp(1 - a.z / 300, .4, 1) : 1); g.fillRect(Math.round(a.x - w / 2 + s), Math.round(a.y - s / 2), Math.round(w - 2 * s), s); }
    for (const a of A) {
      const set = this._sprites[a.c];
      let fr = 'stand';
      if (a.held) fr = 'held';
      else if (a.z > 0) fr = 'held';
      else if (a.dizzy > 0) fr = 'dizzy';
      else if (a.state === 'wave' || a.state === 'five') fr = Math.floor(a.t * 6) % 2 ? 'wave' : 'stand';
      else if (a.state === 'walk' && Math.hypot(a.vx, a.vy) > 6) fr = Math.floor(a.t * 9) % 2 ? 'walkA' : 'walkB';
      const img = set[fr][a.face];
      const bob = fr.startsWith('walk') ? (Math.floor(a.t * 9) % 2) * -s : 0;
      g.drawImage(img, Math.round(a.x - img.width / 2), Math.round(a.y - img.height - a.z + bob));
    }
    /* sparks for high fives, dust for landings */
    this._fx = this._fx.filter(f => (f.t += 1 / 60) < .5);
    for (const f of this._fx) {
      const k = f.t / .5, n = 6, rad = 4 + k * 14;
      g.fillStyle = f.k === 'spark' ? '#ffd23f' : 'rgba(23,18,31,.35)';
      for (let i = 0; i < n; i++) {
        const ang = i / n * 6.283 + (f.k === 'spark' ? 0 : .5);
        g.fillRect(Math.round(f.x + Math.cos(ang) * rad - s / 2), Math.round(f.y + Math.sin(ang) * rad * (f.k === 'spark' ? 1 : .4) - s / 2), s, s);
      }
    }
  }
}

/* ---- elements/sprite.js ---- */
/* <piix-sprite name="mochi" size="96"></piix-sprite>
 * Self-contained characters you can paste anywhere: they sit inline like an image.
 * Eyes follow the cursor, they blink, breathe, hop when clicked and nap when ignored.
 *
 *   name         which sprite (see Piixpal.figures)
 *   size         width in px (snapped to whole sprite pixels)   default: 5 × sprite width
 *   scale        or give the pixel size directly
 *   render       pixel | dots | halftone | dither | ascii | voxel   default: the sprite's own (pixel)
 *                  dots = LED dot-matrix, halftone = shaded sub-dots, dither = 1-bit grain,
 *                  ascii = characters, voxel = extruded 3D blocks that turn toward you
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
    const want = this.getAttribute('name');
    /* its file may still be loading: wait for it rather than showing someone else */
    if (want && !FIGURES[want]) {
      this._tries = (this._tries || 0) + 1;
      if (this._tries < 80) { clearTimeout(this._retry); this._retry = setTimeout(() => this.isConnected && this._build(), 125); }
      return;
    }
    const spec = this._spec = FIGURES[want] || FIGURES[Object.keys(FIGURES)[0]];
    if (!spec) return;
    this._pal = figurePalette(spec, this.getAttribute('color'));
    this._frames = bakeFigure(spec, this._pal);
    const size = +this.getAttribute('size');
    const s = this._s = +this.getAttribute('scale') || (size ? Math.max(1, Math.round(size / spec.w)) : (spec.scale || 5));
    const mode = this._mode = RENDERS.includes(this.getAttribute('render')) ? this.getAttribute('render') : (spec.render || 'pixel');
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
    this._g = buf.getContext('2d', { willReadFrequently: mode !== 'pixel' && mode !== 'voxel' });
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
    if (!this._vis || !this._cv || !this._spec) return;
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
    if (TEXTURES[this._mode]) {
      const data = this._g.getImageData(0, 0, W, H).data;
      TEXTURES[this._mode](o, data, W, H, s);
      return;
    }
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

/* ---------- texture renderers: each turns the 1x frame into something with grain ---------- */
const RENDERS = ['pixel', 'dots', 'voxel', 'halftone', 'dither', 'ascii'];
const lum = (r, g, b) => (r * .299 + g * .587 + b * .114) / 255;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
const ASCII = ' .:-=+*#%@';
const TEXTURES = {
  /* halftone: each pixel is four sub-dots, bigger where the colour is darker */
  halftone(o, d, W, H, s) {
    const half = s / 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; if (d[i + 3] < 40) continue;
      const L = lum(d[i], d[i + 1], d[i + 2]);
      const rad = half * (.32 + (1 - L) * .5);
      o.fillStyle = `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`; o.beginPath();
      for (let k = 0; k < 4; k++) {
        const cx = x * s + (k & 1) * half + half / 2, cy = y * s + (k >> 1) * half + half / 2;
        o.moveTo(cx + rad, cy); o.arc(cx, cy, rad, 0, 6.2832);
      }
      o.fill();
    }
  },
  /* dither: 1-bit grain. Each pixel becomes a 4x4 patch thresholded by a Bayer matrix,
   * so light areas thin out into speckle and dark ones stay solid */
  dither(o, d, W, H, s) {
    const sub = s / 4;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; if (d[i + 3] < 40) continue;
      const L = lum(d[i], d[i + 1], d[i + 2]), dark = 1.12 - L * .95;
      o.fillStyle = `rgb(${Math.round(d[i] * .82)},${Math.round(d[i + 1] * .82)},${Math.round(d[i + 2] * .82)})`;
      for (let k = 0; k < 16; k++) {
        const bx = (x * 4 + (k & 3)) & 3, by = (y * 4 + (k >> 2)) & 3;
        if (BAYER[by * 4 + bx] < dark) o.fillRect(x * s + (k & 3) * sub, y * s + (k >> 2) * sub, Math.ceil(sub), Math.ceil(sub));
      }
    }
  },
  /* ascii: one character per pixel, denser glyphs for darker colours */
  ascii(o, d, W, H, s) {
    o.font = `800 ${Math.round(s * 1.5)}px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
    o.textAlign = 'center'; o.textBaseline = 'middle';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; if (d[i + 3] < 40) continue;
      const L = lum(d[i], d[i + 1], d[i + 2]);
      const ch = ASCII[clamp(Math.round((1 - L) * (ASCII.length - 1)) + 4, 2, ASCII.length - 1)];
      o.fillStyle = `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`;
      o.fillText(ch, x * s + s / 2, y * s + s / 2);
    }
  }
};

/* defaults for the big, bold sprites: one recolourable body, chunky 3D blocks, block eyes */
const BIG = { kind: 'big', scale: 8, render: 'voxel', depth: 2, tilt: true, shy: true, glint: '#ffffff', lid: 'b', recolor: { b: 0, d: -.24, B: .42 } };

/* ---- elements/type.js ---- */
/* <piix-type text="PIIXPAL" rows="18" cell="8" color="#16111f" shade="#c6f432" depth="1" fit>
 * Any font, rasterised into chunky blocks with an extruded shadow.
 * Pixels rain in on load, lift off their shadow around the cursor, and ripple when clicked.
 * Exposes piixSurface(x) so pals can walk on the actual letter tops. */
class PiixTypeElement extends HTMLElement {
  static get observedAttributes() { return ['text', 'rows', 'cell', 'font', 'weight', 'color', 'shade', 'depth', 'gap', 'fit', 'align', 'intro', 'shape']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._tick = this._tick.bind(this);
    this._pm = this._pm.bind(this);
    this._pd = this._pd.bind(this);
    this._cells = []; this._on = false; this._tok = 0; this._waves = [];
  }
  connectedCallback() {
    this.shadowRoot.innerHTML = `<style>
:host{display:block;line-height:0;position:relative}
canvas{display:block;pointer-events:none;image-rendering:pixelated}
</style><canvas aria-hidden="true"></canvas>`;
    this._cv = this.shadowRoot.querySelector('canvas');
    this._g = this._cv.getContext('2d');
    this.setAttribute('role', 'img');
    this._ro = new ResizeObserver(() => { if (this._cols) this._layout(); });
    this._ro.observe(this);
    addEventListener('pointermove', this._pm, { passive: true });
    this.addEventListener('pointerdown', this._pd);
    this._raster();
  }
  disconnectedCallback() {
    if (this._ro) this._ro.disconnect();
    removeEventListener('pointermove', this._pm);
    this.removeEventListener('pointerdown', this._pd);
    unsub(this._tick); this._on = false;
  }
  attributeChangedCallback(n) {
    if (!this._cv) return;
    if (['text', 'rows', 'font', 'weight', 'align'].includes(n)) { clearTimeout(this._rt); this._rt = setTimeout(() => this._raster(), 40); }
    else if (this._cols) this._layout();
  }
  get text() { return (this.getAttribute('text') ?? this.textContent).trim(); }

  /* rain the pixels in again */
  replay() { this._seedIntro(); this._wake(); }

  /* true once every pixel has landed (pals wait for this before stepping on) */
  get piixSettled() { return !!this._cols && this._cells.every(p => p.landed); }

  /* something landed on the letters at doc (x, y): send a small ripple through them */
  piixImpact(x, y, power = 1) {
    if (!this._cols || reduced()) return;
    const r = this._cv.getBoundingClientRect();
    this._waves.push({ x: (x - scrollX - r.left) / this._cell, y: (y - scrollY - r.top - this._head) / this._cell, r: 0, max: 5 + 5 * power, amp: .5 + .4 * power });
    this._wake();
  }

  /* doc-y of the top letter pixel at doc-x, or null over a gap */
  piixSurface(x) {
    if (!this._cols) return null;
    const r = this._cv.getBoundingClientRect();
    const c = Math.floor((x - scrollX - r.left) / this._cell);
    const top = this._top[c];
    return top == null ? null : r.top + scrollY + this._head + top * this._cell;
  }

  async _raster() {
    const tok = ++this._tok;
    const lines = this.text.split(/\||\n/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) { this._cols = 0; return; }
    const rows = +this.getAttribute('rows') || 18;
    const weight = this.getAttribute('weight') || 800;
    const fam = this.getAttribute('font') || getComputedStyle(this).fontFamily || 'system-ui,sans-serif';
    const font = `${weight} ${rows}px ${fam}`;
    try { await document.fonts.load(font, lines.join('')); } catch (_) { /* use whatever is there */ }
    if (tok !== this._tok) return;
    const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
    x.font = font;
    const ws = lines.map(l => Math.ceil(x.measureText(l).width));
    const W = Math.max(...ws) + 2, lh = Math.round(rows * 1.02);
    c.width = W; c.height = lh * lines.length + 2;
    x.font = font; x.fillStyle = '#000'; x.textBaseline = 'alphabetic';
    const align = this.getAttribute('align') || 'left';
    lines.forEach((l, i) => {
      const ox = align === 'center' ? Math.round((W - ws[i]) / 2) : align === 'right' ? W - ws[i] - 1 : 1;
      x.fillText(l, ox, Math.round(i * lh + rows * .8) + 1);
    });
    const d = x.getImageData(0, 0, c.width, c.height).data, cells = [];
    for (let yy = 0; yy < c.height; yy++) for (let xx = 0; xx < c.width; xx++) {
      if (d[(yy * c.width + xx) * 4 + 3] > 110) cells.push({ x: xx, y: yy, oy: 0, vy: 0, lift: 0, lv: 0, delay: 0, landed: true });
    }
    /* crop empty margins */
    const minX = Math.min(...cells.map(p => p.x)), minY = Math.min(...cells.map(p => p.y));
    for (const p of cells) { p.x -= minX; p.y -= minY; }
    this._cols = Math.max(...cells.map(p => p.x)) + 1;
    this._rowsN = Math.max(...cells.map(p => p.y)) + 1;
    this._cells = cells;
    this._top = [];
    for (const p of cells) if (this._top[p.x] == null || p.y < this._top[p.x]) this._top[p.x] = p.y;
    this.setAttribute('aria-label', lines.join(' '));
    this._layout();
    if (this.getAttribute('intro') !== 'none') this._seedIntro();
    this._wake();
    this.dispatchEvent(new CustomEvent('piix:type', { bubbles: true }));
  }

  _layout() {
    let cell = +this.getAttribute('cell') || 8;
    if (this.hasAttribute('fit')) {
      const avail = this.clientWidth || (this.parentElement && this.parentElement.clientWidth) || 0;
      if (avail) cell = Math.max(2, Math.min(cell, Math.floor(avail / (this._cols + 1))));
    }
    this._cell = cell;
    this._depth = Math.round(cell * (this.getAttribute('depth') != null ? +this.getAttribute('depth') : 1) * .6);
    const gap = this.getAttribute('gap');
    this._gap = Math.round(cell * clamp(gap != null ? +gap : .1, 0, .45));
    this._head = cell * 3;                  /* headroom for lifted pixels */
    const w = this._cols * cell + this._depth, h = this._rowsN * cell + this._depth + this._head;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this._dpr = dpr;
    this._cv.width = Math.round(w * dpr); this._cv.height = Math.round(h * dpr);
    this._cv.style.width = w + 'px'; this._cv.style.height = h + 'px';
    this._cv.style.marginTop = -this._head + 'px';
    this._render();
  }

  _seedIntro() {
    if (reduced()) return;
    const H = (this._rowsN + 6) * this._cell;
    for (const p of this._cells) {
      p.landed = false; p.vy = 0;
      p.oy = -H - rnd(0, this._cell * 8);
      p.delay = p.x * .012 + rnd(0, .18) + (this._rowsN - p.y) * .004;
    }
    this._t = 0;
  }

  _wake() { if (!this._on) { this._on = true; sub(this._tick); } }

  _pm() {
    if (!this._cols || reduced()) return;
    const r = this._cv.getBoundingClientRect(), m = this._cell * 8;
    if (ptr.cx > r.left - m && ptr.cx < r.right + m && ptr.cy > r.top - m && ptr.cy < r.bottom + m) { this._hot = true; this._wake(); }
  }
  _pd(e) {
    if (!this._cols || reduced()) return;
    const r = this._cv.getBoundingClientRect();
    this._waves.push({ x: (e.clientX - r.left) / this._cell, y: (e.clientY - r.top - this._head) / this._cell, r: 0, max: this._cols + 20, amp: 1.6 });
    this._wake();
  }

  _tick(dt) {
    if (!this._cols) return;
    const cell = this._cell, G = 5200;
    let busy = false;
    this._t = (this._t || 0) + dt;
    const r = this._cv.getBoundingClientRect();
    const px = (ptr.cx - r.left) / cell, py = (ptr.cy - r.top - this._head) / cell;
    const R = 7, hot = this._hot && ptr.seen;
    this._waves.forEach(w => { w.r += dt * 60; });
    this._waves = this._waves.filter(w => w.r < w.max);
    if (this._waves.length) busy = true;
    let near = false;
    for (const p of this._cells) {
      /* falling in */
      if (!p.landed) {
        busy = true;
        if (this._t < p.delay) continue;
        p.vy += G * dt; p.oy += p.vy * dt;
        if (p.oy >= 0) {
          if (p.vy > 500) { p.oy = 0; p.vy = -p.vy * .22; }
          else { p.oy = 0; p.vy = 0; p.landed = true; }
        }
      }
      /* lift around the cursor, and on passing ripples */
      let goal = 0;
      if (hot) {
        const dx = p.x + .5 - px, dy = p.y + .5 - py, d = Math.sqrt(dx * dx + dy * dy);
        if (d < R) { const k = 1 - d / R; goal = k * k * cell * 1.4; near = true; }
      }
      for (const w of this._waves) {
        const d = Math.hypot(p.x - w.x, p.y - w.y), band = Math.abs(d - w.r);
        if (band < 2.5) goal = Math.max(goal, (1 - band / 2.5) * cell * w.amp * Math.max(0, 1 - w.r / w.max));
      }
      p.lv += ((goal - p.lift) * 320 - p.lv * 22) * dt;
      p.lift += p.lv * dt;
      if (Math.abs(p.lift) > .05 || Math.abs(p.lv) > .5) busy = true;
    }
    if (!near) this._hot = false;
    this._render();
    if (!busy && !this._hot) { unsub(this._tick); this._on = false; }
  }

  _render() {
    if (!this._cols) return;
    const g = this._g, cell = this._cell, gap = this._gap, s = cell - gap, dep = this._depth, head = this._head;
    g.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    g.clearRect(0, 0, this._cv.width, this._cv.height);
    const color = this.getAttribute('color') || 'currentColor';
    const ink = color === 'currentColor' ? getComputedStyle(this).color : color;
    const shade = this.getAttribute('shade');
    const put = CELL_SHAPES[this.getAttribute('shape')] || CELL_SHAPES.square;
    /* shadow layer stays on the ground */
    if (shade && dep) {
      g.fillStyle = shade; g.beginPath();
      for (const p of this._cells) {
        if (!p.landed && p.oy < -cell) continue;
        put(g, p.x * cell + dep, head + p.y * cell + dep + Math.round(Math.min(0, p.oy)), s);
      }
      g.fill();
    }
    g.fillStyle = ink; g.beginPath();
    for (const p of this._cells) {
      const y = head + p.y * cell + Math.round(p.oy - p.lift);
      if (y + s < 0) continue;
      put(g, p.x * cell, y, s);
    }
    g.fill();
  }
}

/* how one block is drawn: shape="square|dot|round|plus|diamond" (all added to one path) */
const CELL_SHAPES = {
  square: (g, x, y, s) => g.rect(x, y, s, s),
  dot: (g, x, y, s) => { const r = s * .46; g.moveTo(x + s / 2 + r, y + s / 2); g.arc(x + s / 2, y + s / 2, r, 0, 6.2832); },
  round: (g, x, y, s) => { if (g.roundRect) g.roundRect(x, y, s, s, s * .32); else g.rect(x, y, s, s); },
  plus: (g, x, y, s) => { const t = s / 3; g.rect(x + t, y, t, s); g.rect(x, y + t, t, t); g.rect(x + 2 * t, y + t, t, t); },
  diamond: (g, x, y, s) => { g.moveTo(x + s / 2, y); g.lineTo(x + s, y + s / 2); g.lineTo(x + s / 2, y + s); g.lineTo(x, y + s / 2); g.closePath(); }
};

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
    /* recolouring doesn't need a fresh pal */
    if (n === 'hue') { this._actor.cv.style.filter = b ? `hue-rotate(${+b}deg)` : ''; return; }
    this._unmount(); this._mount();
  }
  get actor() { return this._actor || null; }
  /* the running behaviour, for pals with an API (el.ctl.toast(…), el.ctl.start()…) */
  get ctl() { return this._ctl || null; }
  /* poke it from code: el.poke() */
  poke() { if (this._ctl && this._ctl.poke) this._ctl.poke(); }

  _mount() {
    if (!this.isConnected || this._mounted) return;
    const name = (this.getAttribute('pal') || '').toLowerCase();
    const sel = this.getAttribute('on');
    let targets;
    try { targets = sel ? [...document.querySelectorAll(sel)] : [this.parentElement]; } catch (e) { targets = []; }
    targets = targets.filter(el => el && el !== document.documentElement);
    const spec = SPRITES[name] || (!name && SPRITES[Object.keys(SPRITES)[0]]);
    const make = spec && (BEHAVIORS[this.getAttribute('do')] || BEHAVIORS[spec.does]);
    /* the pal's own file, or the element it lives on, may simply not be here yet
       (a second script still loading, a framework still rendering): try again shortly */
    if (!spec || !make || !targets.length) {
      this._tries = (this._tries || 0) + 1;
      if (this._tries < 80) { clearTimeout(this._retry); this._retry = setTimeout(() => this._mount(), 125); }
      else console.warn('[piixpal]', !spec ? `no pal called "${name}"` : !make ? `unknown behaviour "${this.getAttribute('do') || spec.does}"` : 'nothing to live on', this);
      return;
    }
    this._tries = 0;

    const actor = this._actor = new Actor(spec, { scale: +this.getAttribute('scale') || 0, hue: this.getAttribute('hue'), fixed: this.hasAttribute('fixed-scale') });
    actor.host = this;
    const ctl = this._ctl = actor.ctl = make(actor, targets, this) || {};
    if (!ctl.grab) actor.node.classList.add('nograb');

    this._pd = e => {
      if (e.button > 0) return;
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('piix:poke', { bubbles: true }));
      if (ctl.grab) ctl.grab(e); else if (ctl.poke) ctl.poke(e);
    };
    actor.cv.addEventListener('pointerdown', this._pd);

    /* a behaviour can run a whole crew of extra actors (groups, flocks, families) */
    const wire = c => {
      if (c._wired) return;
      c._wired = true; c.host = this;
      if (!ctl.grab) c.node.classList.add('nograb');
      c.cv.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('piix:poke', { bubbles: true }));
        if (ctl.grab) ctl.grab(e, c); else if (ctl.poke) ctl.poke(e, c);
      });
    };
    /* box="selector": the cursor only counts while it's inside the box, and nothing leaves it */
    const boxEl = boxOf(this);
    const keep = (c, b) => {
      c.x = clamp(c.x, b.l + c.w / 2, Math.max(b.l + c.w / 2, b.r - c.w / 2));
      c.y = clamp(c.y, b.t + c.h, Math.max(b.t + c.h, b.b - 2));
    };
    let first = true;
    this._tick = (dt, t) => {
      /* sleep when far off-screen, but always draw the first frame */
      const awake = first || (ctl.awake ? ctl.awake() : Math.abs(actor.y - (scrollY + innerHeight / 2)) < innerHeight * 1.5) || actor.held;
      if (!awake) return;
      first = false;
      const b = boxEl && rectOf(boxEl);
      if (b && !(ptr.x >= b.l && ptr.x <= b.r && ptr.y >= b.t && ptr.y <= b.b)) {
        const cx = ptr.cx, cy = ptr.cy;
        ptr.cx = ptr.cy = -1e5;
        try { ctl.tick(dt, t); } finally { ptr.cx = cx; ptr.cy = cy; }
      } else ctl.tick(dt, t);
      if (b && !ctl.boxed) { keep(actor, b); if (ctl.crew) for (const c of ctl.crew) keep(c, b); }
      actor.step(dt);
      actor.render();
      if (ctl.crew) for (const c of ctl.crew) { wire(c); c.step(dt); c.render(); }
    };
    sub(this._tick);
    this._mounted = true;
    this.dispatchEvent(new CustomEvent('piix:ready', { bubbles: true, detail: { pal: spec.name } }));
  }
  _unmount() {
    if (!this._mounted) return;
    unsub(this._tick);
    if (this._ctl && this._ctl.destroy) this._ctl.destroy();
    if (this._ctl && this._ctl.crew) this._ctl.crew.forEach(c => c.destroy());
    if (this._actor) { this._actor.cv.removeEventListener('pointerdown', this._pd); this._actor.destroy(); }
    this._actor = this._ctl = null;
    this._mounted = false;
  }
}

const define = (n, c) => { if (!customElements.get(n)) customElements.define(n, c); };

/* ---------- JS API: add pals without writing any markup ---------- */
/* Piixpal.add('bitbug', 'h1')                      a pal living on the first h1
 * Piixpal.add('pip', '.btn')                       one bird, every .btn a perch
 * Piixpal.add('mochi', '#card', { size: 120 })     sprites go inside the element
 * Piixpal.add('kitty', someElement)                or pass an element directly */
/* components that are their own element rather than a pal or sprite: { weather: 'piix-weather' } */
const ELEMENTS = {};
const add = (name, where = 'body', attrs = {}) => {
  name = String(name).toLowerCase();
  if (ELEMENTS[name]) {
    const el = document.createElement(ELEMENTS[name]);
    for (const k in attrs) if (attrs[k] !== false && attrs[k] != null && k !== '_tries') el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    const host = typeof where === 'string' ? document.querySelector(where) : where;
    (host || document.body).appendChild(el);
    return el;
  }
  /* not registered yet (its file is still loading)? wait to find out if it's a pal or a sprite */
  if (!attrs.type && !SPRITES[name] && !FIGURES[name] && !ELEMENTS[name] && (attrs._tries || 0) < 80) {
    setTimeout(() => add(name, where, { ...attrs, _tries: (attrs._tries || 0) + 1 }), 125);
    return null;
  }
  attrs = { ...attrs }; delete attrs._tries;
  const isSprite = attrs.type === 'sprite' || (!SPRITES[name] && !!FIGURES[name]);
  const target = typeof where === 'string' ? null : where;
  const el = document.createElement(isSprite ? 'piix-sprite' : 'piix-pal');
  attrs = { ...attrs }; delete attrs.type;
  el.setAttribute(el.tagName === 'PIIX-SPRITE' ? 'name' : 'pal', name);
  for (const k in attrs) if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
  if (el.tagName === 'PIIX-SPRITE') {
    const host = target || document.querySelector(where);
    if (host) host.appendChild(el);
  } else {
    if (target) target.appendChild(el);
    else { el.setAttribute('on', where); document.body.appendChild(el); }
  }
  return el;
};
/* data-pals="bitbug@h1, boing@footer, pip@.btn?scale=3" on the script tag itself */
const autoAttach = script => {
  const list = script && script.getAttribute('data-pals');
  if (!list) return;
  const run = () => list.split(',').map(s => s.trim()).filter(Boolean).forEach(item => {
    const [head, query = ''] = item.split('?');
    const [name, where = 'body'] = head.split('@').map(s => s.trim());
    const attrs = Object.fromEntries(new URLSearchParams(query));
    add(name, where, attrs);
  });
  if (document.readyState === 'complete') run(); else addEventListener('load', run, { once: true });
};
const SCRIPT = document.currentScript;

/* define the elements once every component in this file has registered */
const start = (script = SCRIPT) => {
  define('piix-pal', PiixPalElement);
  define('piix-type', PiixTypeElement);
  define('piix-sprite', PiixSpriteElement);
  define('piix-crowd', PiixCrowdElement);
  if (script && !script._piix) { script._piix = true; autoAttach(script); }
};
Object.assign(Piixpal, {
  add,
  /* every pal, sprite and behaviour currently registered */
  list: () => ({ pals: Object.keys(SPRITES).filter(n => n[0] !== '_'), sprites: Object.keys(FIGURES), behaviors: Object.keys(BEHAVIORS), elements: Object.keys(ELEMENTS) }),
  clear: () => document.querySelectorAll(['piix-pal', 'piix-sprite', ...Object.values(ELEMENTS)].join()).forEach(e => e.remove())
});

Piixpal._k = { reduceMQ, reduced, clamp, rnd, chance, pick, lerp, now, hexRGBA, ptr, ptrDist, scroll, subs, raf, frame, sub, unsub, rectOf, docW, boxOf, pin, areaOf, onScreen, surfaceAt, LAYER_CSS, layer, origin, getLayer, layerOrigin, SPRITES, bake, defineSprite, baked, ACTORS, shout, Actor, recruit, BEHAVIORS, defineBehavior, Piixpal, art, ICON_PAL, ICONS, DIGITS, numberIcon, iconCache, iconPal, bakeIcon, UI_INK, UI_FONT, UI_MONO, UI_CSS, uiHost, uiRoot, uiEl, uiIcon, uiCard, uiPlace, uiAt, uiClose, uiAnnounce, measureCtx, glyphTop, textProfile, segAt, LAND, platCache, TEXTY, surfaceOf, platforms, drag, BLIP, CROWD_COLORS, PiixCrowdElement, FIGURES, defineFigure, mixHex, figurePalette, bakeFigure, HEAD, PiixSpriteElement, RENDERS, lum, BAYER, ASCII, TEXTURES, BIG, PiixTypeElement, CELL_SHAPES, PiixPalElement, define, ELEMENTS, add, autoAttach, SCRIPT, start };
return Piixpal._k;
})();
const { reduceMQ, reduced, clamp, rnd, chance, pick, lerp, now, hexRGBA, ptr, ptrDist, scroll, subs, raf, frame, sub, unsub, rectOf, docW, boxOf, pin, areaOf, onScreen, surfaceAt, LAYER_CSS, layer, origin, getLayer, layerOrigin, SPRITES, bake, defineSprite, baked, ACTORS, shout, Actor, recruit, BEHAVIORS, defineBehavior, Piixpal, art, ICON_PAL, ICONS, DIGITS, numberIcon, iconCache, iconPal, bakeIcon, UI_INK, UI_FONT, UI_MONO, UI_CSS, uiHost, uiRoot, uiEl, uiIcon, uiCard, uiPlace, uiAt, uiClose, uiAnnounce, measureCtx, glyphTop, textProfile, segAt, LAND, platCache, TEXTY, surfaceOf, platforms, drag, BLIP, CROWD_COLORS, PiixCrowdElement, FIGURES, defineFigure, mixHex, figurePalette, bakeFigure, HEAD, PiixSpriteElement, RENDERS, lum, BAYER, ASCII, TEXTURES, BIG, PiixTypeElement, CELL_SHAPES, PiixPalElement, define, ELEMENTS, add, autoAttach, SCRIPT, start } = K;

/* ---- behaviors/beeline.js ---- */
/* beeline: a little line of worker bees buzzing round their element. Come close and
 * they follow your cursor in single file, each one chasing the bee in front. Stop
 * moving and they head home and circle the hive.
 *   count="6"   number of bees */
defineBehavior('beeline', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 6, 2, 30);
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .5;
  const bees = [a, ...Array.from({ length: n - 1 }, () => recruit(a, 'bees'))];
  const st = bees.map(() => ({ x: null, y: 0, vx: 0, vy: 0 }));
  let chasing = false, idleSince = now();

  return {
    crew: bees.slice(1),
    awake: () => true,
    tick(dt, t) {
      const r = rectOf(el);
      const hx = r.l + r.w * at, hy = r.t - 26 * S;
      if (st[0].x == null) st.forEach((s, i) => { s.x = hx + i * 8; s.y = hy; });
      if (now() - ptr.last < 120) idleSince = now();
      const idle = now() - idleSince;
      if (!chasing && ptr.seen && idle < 300 && (ptrDist(hx, hy) < 260 * S || ptrDist(st[0].x, st[0].y) < 160 * S)) chasing = true;
      if (chasing && idle > 3000) chasing = false;

      bees.forEach((b, i) => {
        const s = st[i];
        let gx, gy, k;
        if (reduced()) { gx = hx + (i - n / 2) * 12 * S; gy = hy; s.x = gx; s.y = gy; }
        else {
          if (i === 0) {
            gx = chasing ? ptr.x - 24 * S : hx + Math.cos(t / 500) * 30 * S;
            gy = chasing ? ptr.y - 10 * S : hy + Math.sin(t / 350) * 10 * S;
            k = chasing ? 7 : 3;
          } else {
            /* follow the bee in front, a few pixels back */
            const p = st[i - 1];
            gx = p.x - Math.sign(p.vx || 1) * 14 * S; gy = p.y + Math.sin(t / 120 + i) * 4 * S; k = 9;
            if (!chasing) { gx = hx + Math.cos(t / 500 + i * (6.28 / n)) * 34 * S; gy = hy + Math.sin(t / 400 + i * (6.28 / n)) * 14 * S; k = 3; }
          }
          s.vx = lerp(s.vx, (gx - s.x) * k, 1 - Math.exp(-8 * dt));
          s.vy = lerp(s.vy, (gy - s.y) * k, 1 - Math.exp(-8 * dt));
          s.x += s.vx * dt; s.y += s.vy * dt;
        }
        b.x = s.x; b.y = s.y;
        if (Math.abs(s.vx) > 8) b.face = s.vx > 0 ? 1 : -1;
        b.play('fly');
      });
    },
    poke(e, who) { (who || a).say('heart', 600); chasing = !chasing; idleSince = now(); }
  };
});

/* ---- behaviors/bounce.js ---- */
/* bounce: hop happily along the top of an element. Leaps at the cursor if it hovers
 * close. Grab it and throw it; it squashes on landing and gets dizzy if you overdo it.
 * Click (without dragging) for a big jump. */
defineBehavior('bounce', (a, [el], host) => {
  const S = a.s / 4;
  const G = 2400 * S;                       /* gravity, px/s² */
  const energy = +host.getAttribute('energy') || 1;
  let vx = 0, vy = 0, state = 'air', wait = 0, placed = false, spin = 0;
  let sq = 0, sqv = 0;                      /* squash spring: + is tall, - is flat */
  let dizzy = 0, combo = 0;

  /* pixel lettering has a real outline; over its gaps you fall to the bottom */
  const floor = r => typeof el.piixSurface === 'function' ? (el.piixSurface(a.x) ?? r.b) : r.t;
  const jump = (power = 1, toward = null) => {
    vy = -rnd(560, 760) * Math.sqrt(S) * power * energy;
    vx = toward != null ? clamp((toward - a.x) * 1.6, -380 * S, 380 * S) : rnd(-110, 110) * S;
    if (Math.abs(vx) > 8) a.face = vx > 0 ? 1 : -1;
    sqv += 9; state = 'air';
  };

  return {
    tick(dt) {
      const r = rectOf(el);
      if (!placed) {
        const at = host.getAttribute('at');
        a.x = r.l + r.w * (at != null ? clamp(+at, 0, 1) : rnd(.2, .8));
        a.y = floor(r) - 200 * S; state = 'air'; placed = true;
      }
      if (reduced()) { a.y = floor(r); a.play('idle'); return; }
      if (state === 'held') return;

      const L = r.l + a.w / 2, R = r.r - a.w / 2;
      if (state === 'air') {
        vy += G * dt;
        a.x += vx * dt; a.y += vy * dt;
        if (a.x < L) { a.x = L; vx = Math.abs(vx) * .7; sqv -= 4; }
        if (a.x > R) { a.x = R; vx = -Math.abs(vx) * .7; sqv -= 4; }
        spin *= Math.pow(.2, dt);
        a.rot += spin * dt;
        a.play(vy < 0 ? 'rise' : 'air');
        sq = lerp(sq, clamp(Math.abs(vy) / 2600, 0, .22), .3);
        if (a.y >= floor(r)) {
          const impact = vy;
          a.y = floor(r); a.rot = 0; spin = 0;
          if (typeof el.piixImpact === 'function') el.piixImpact(a.x, a.y, clamp(impact / 1200, .3, 1.6));
          if (impact > 520 * Math.sqrt(S)) shout(a, 'thud', 170 * S * clamp(impact / 1200, .6, 1.8));
          sq = -clamp(impact / 2200, .12, .42); sqv = 0;
          if (impact > 2100 * Math.sqrt(S) || combo > 2) {
            dizzy = 2.2; combo = 0; a.say('star', 1800); a.play('dizzy');
            state = 'ground'; wait = 2.2; vx = 0;
          } else if (impact > 600 * Math.sqrt(S)) {
            /* a bouncy landing keeps some of its speed */
            vy = -impact * .45; vx *= .8; state = 'air'; a.play('land');
          } else {
            state = 'ground'; wait = rnd(.15, .9); vx = 0; combo = 0;
            a.play('land');
          }
        }
      } else {
        a.y = floor(r);
        a.x = clamp(a.x, L, R);
        wait -= dt;
        if (dizzy > 0) { dizzy -= dt; a.play('dizzy'); }
        else if (wait < .1) a.play('land');
        else a.play('idle');
        /* the cursor is a toy */
        const d = ptrDist(a.x, a.y - a.h / 2);
        if (dizzy <= 0 && ptr.seen && d < 170 * S && ptr.y < a.y && wait > .05 && chance(dt * 5)) {
          jump(clamp((a.y - ptr.y) / (200 * S), .8, 1.5), ptr.x); a.say(chance(.5) ? 'heart' : 'note', 700);
        } else if (wait <= 0 && dizzy <= 0) {
          jump(chance(.15) ? 1.35 : rnd(.55, 1));
        }
      }

      /* squash & stretch spring */
      sqv += (-sq * 260 - sqv * 14) * dt;
      sq += sqv * dt;
      a.sy = 1 + sq; a.sx = 1 - sq * .7;
    },
    grab(e) {
      const was = state;
      drag(a, e, {
        move: (x, y) => { state = 'held'; a.x = x; a.y = y + a.h * .35; a.rot = 0; a.play('held'); },
        end: ({ moved, vx: tx, vy: ty }) => {
          if (!moved) {
            if (was === 'held') return;
            if (state === 'ground' || state === 'air') { jump(1.6); spin = (chance(.5) ? 1 : -1) * 720; a.say('!', 600); }
            return;
          }
          vx = tx; vy = ty; state = 'air';
          spin = clamp(tx * .9, -900, 900);
          if (Math.hypot(tx, ty) > 1600) { combo = 3; a.say('!?', 800); }
        }
      });
    },
    poke() { jump(1.6); }
  };
});

/* ---- behaviors/captcha.js ---- */
/* captcha: guards an "I'm not a robot" checkbox. Sweats when the cursor comes near
 * the box, panics and flees when it's ticked, and sneaks back a few seconds later.
 * Put it inside the label/element that holds the checkbox. */
defineBehavior('captcha', (a, [el], host) => {
  const S = a.s / 3;
  const box = el.matches && el.matches('input[type=checkbox]') ? el : el.querySelector('input[type=checkbox]');
  const anchor = box || el;
  let state = 'sit', timer = 0, x = null, off = 0;
  const onChange = () => {
    if (box.checked) { state = 'flee'; timer = 2.6; a.say('!?', 800); }
    else { state = 'sit'; a.say('heart', 700); }
  };
  if (box) box.addEventListener('change', onChange);

  return {
    tick(dt) {
      const r = rectOf(el), b = rectOf(anchor);
      const home = clamp(b.r + a.w * .7, r.l + a.w / 2, r.r - a.w / 2);
      if (x == null) x = home;
      a.y = r.t;
      if (reduced()) { a.x = home; a.play('idle'); return; }
      timer -= dt;
      if (state === 'flee') {
        /* run off the far end and vanish */
        off += 160 * S * dt; a.face = 1; a.play('run');
        a.node.style.opacity = clamp(1 - off / (r.r - home + a.w), 0, 1).toFixed(2);
        if (timer <= 0) { state = 'return'; a.face = -1; }
      } else if (state === 'return') {
        off = Math.max(0, off - 50 * S * dt); a.play('run');
        a.node.style.opacity = clamp(1 - off / (r.r - home + a.w), 0, 1).toFixed(2);
        if (off <= 0) { state = 'sit'; a.face = 1; a.say('...', 1200); a.play('shy'); timer = 1.5; }
      } else {
        a.node.style.opacity = '1';
        const near = ptr.seen && ptrDist(b.l + b.w / 2, b.t + b.h / 2) < 70 * S && !(box && box.checked);
        if (near) { a.play('nervous'); if (chance(dt * 1.5)) a.say('sweat', 500); }
        else if (timer <= 0) a.play('idle');
      }
      a.x = home + off;
    },
    poke() { a.say(pick(['?', '...', '!']), 700); },
    destroy() { if (box) box.removeEventListener('change', onChange); }
  };
});

/* ---- behaviors/choir.js ---- */
/* choir: a row of singers on an element who sway and sing in perfect time.
 * They look at the cursor when it's near. Click one for a solo; click it again and
 * everyone joins back in.
 *   count="4"   number of singers   bpm="96"   tempo */
defineBehavior('choir', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 4, 1, 10);
  const bpm = +host.getAttribute('bpm') || 96;
  const singers = [a, ...Array.from({ length: n - 1 }, (_, i) => recruit(a, 'choir', { hue: (i + 1) * 70 }))];
  /* a little score: which singers open their mouths on which beat */
  const score = Array.from({ length: 16 }, () => singers.map(() => chance(.65)));
  let solo = -1, lastBeat = -1;

  return {
    crew: singers.slice(1),
    tick(dt, t) {
      const r = rectOf(el);
      const beatLen = 60000 / bpm, beat = Math.floor(t / beatLen), phase = (t % beatLen) / beatLen;
      const near = ptr.seen && ptr.x > r.l - 80 && ptr.x < r.r + 80 && Math.abs(ptr.y - r.t) < 120 * S;
      singers.forEach((s, i) => {
        s.x = r.l + r.w * ((i + .5) / n); s.y = r.t;
        if (reduced()) { s.play('hush'); return; }
        s.rot = Math.sin((beat + phase) * Math.PI) * 6;
        s.oy = -Math.abs(Math.sin(phase * Math.PI)) * 3 * S;
        const singing = solo >= 0 ? i === solo : score[beat % 16][i];
        if (near && !singing) { s.play('look'); s.face = ptr.x < s.x ? -1 : 1; }
        else { s.face = 1; s.play(singing ? 'sing' : 'hush'); }
        if (beat !== lastBeat && singing && chance(solo >= 0 ? .6 : .12)) s.say('note', beatLen * .9);
      });
      lastBeat = beat;
    },
    poke(e, who) {
      const i = Math.max(0, singers.indexOf(who || a));
      solo = solo === i ? -1 : i;
      singers.forEach(s => s.hush());
    }
  };
});

/* ---- behaviors/climb.js ---- */
/* climb: walks the full perimeter of an element: top, right side, underneath, left side.
 * Freezes and wags its tail when the cursor comes close. Poke it to make it sprint
 * the other way round. */
defineBehavior('climb', (a, [el], host) => {
  const S = a.s / 3;
  const speed = 34 * S * (+host.getAttribute('speed') || 1);
  let d = null, dir = 1, state = 'walk', timer = rnd(3, 6), sprint = 0, rot = 0;
  a.cv.style.transformOrigin = '50% 50%';

  /* distance along the border -> point + heading */
  const at = (r, s) => {
    const W = r.w, H = r.h, P = 2 * (W + H);
    s = ((s % P) + P) % P;
    if (s < W) return { x: r.l + s, y: r.t, ang: 0 };
    if (s < W + H) return { x: r.r, y: r.t + (s - W), ang: 90 };
    if (s < 2 * W + H) return { x: r.r - (s - W - H), y: r.b, ang: 180 };
    return { x: r.l, y: r.b - (s - 2 * W - H), ang: 270 };
  };

  return {
    tick(dt) {
      const r = rectOf(el);
      if (d == null) d = (r.w + r.h) * 2 * (host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) * .5 : rnd(0, .25));
      if (!reduced()) {
        const p0 = at(r, d);
        const near = ptr.seen && ptrDist(p0.x, p0.y) < 70 * S && sprint <= 0;
        timer -= dt;
        if (near) { state = 'freeze'; a.play('wag'); }
        else if (state === 'freeze') { state = 'walk'; }
        if (state === 'walk') {
          a.play('walk', { fps: sprint > 0 ? 22 : 10 });
          d += dir * speed * (sprint > 0 ? 3.5 : 1) * dt;
          if (timer <= 0 && sprint <= 0) { state = 'rest'; timer = rnd(.8, 2); a.play('idle'); }
        } else if (state === 'rest' && timer <= 0) { state = 'walk'; timer = rnd(3, 7); if (chance(.3)) dir = -dir; }
        sprint -= dt;
      }
      const p = at(r, d);
      /* turn smoothly at the corners */
      let want = p.ang + (dir < 0 ? 180 : 0);
      while (want - rot > 180) want -= 360;
      while (want - rot < -180) want += 360;
      rot = lerp(rot, want, 1 - Math.exp(-14 * dt));
      a.rot = rot;
      /* centre the gecko on the edge line */
      a.x = p.x; a.y = p.y + a.h / 2;
      a.face = 1;
    },
    poke() { dir = -dir; sprint = 1.4; state = 'walk'; a.say('!', 500); },
    hear(type) { if (type === 'thud') { sprint = 1; state = 'walk'; } }
  };
});

/* ---- behaviors/count.js ---- */
/* count: sheep trotting along an element and jumping a fence in the middle, one at a
 * time, forever. The fence keeps count. Lovely for loading states.
 *   count="3"   number of sheep   speed="1" */
defineBehavior('count', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 3, 1, 10);
  const fence = recruit(a, 'fence');
  const flock = [a, ...Array.from({ length: n - 1 }, () => recruit(a, 'sheep'))];
  const speed = 46 * S * (+host.getAttribute('speed') || 1);
  let off = 0, total = 0;
  const passed = flock.map(() => false);
  a.node.parentNode.insertBefore(fence.node, a.node);   /* sheep jump in front of the fence */

  return {
    crew: [fence, ...flock.slice(1)],
    tick(dt) {
      const r = rectOf(el);
      const span = r.w + 60 * S, mid = r.l + r.w / 2;
      fence.x = mid; fence.y = r.t; fence.play('idle');
      if (!reduced()) off += speed * dt;
      flock.forEach((sh, i) => {
        const pos = ((off + i * span / n) % span + span) % span;
        const x = r.l - 30 * S + pos;
        sh.x = x; sh.y = r.t; sh.face = 1;
        /* the jump: a hop centred on the fence */
        const d = Math.abs(x - mid), J = 34 * S;
        if (d < J) { sh.oy = -Math.cos(d / J * Math.PI / 2) * 30 * S; sh.play('jump'); }
        else { sh.oy = 0; sh.play('walk'); }
        if (x > mid && !passed[i]) { passed[i] = true; total++; fence.say('#' + total, 0); }
        if (x < mid) passed[i] = false;
        const edge = Math.min(pos, span - pos);
        sh.node.style.opacity = clamp(edge / (30 * S), 0, 1).toFixed(2);
      });
    },
    poke(e, who) { (who || a).say('heart', 700); }
  };
});

/* ---- behaviors/crawl.js ---- */
/* crawl: walk along the top of an element's text, hop over gaps and letter steps,
 * stop to sniff and look around, scurry away from the cursor, flip over when poked.
 *
 * Surface, in order of preference:
 *   1. el.piixSurface(x)         (e.g. <piix-type> exposes the real letter contour)
 *   2. the first line of text    (real glyph tops, unless edge="box")
 *   3. the element's top edge */
defineBehavior('crawl', (a, [el], host) => {
  const mode = host.getAttribute('edge') || (typeof el.piixSurface === 'function' ? 'surface' : 'text');
  const S = a.s / 3;                      /* everything scales with the sprite */
  const speed = 30 * S * (+host.getAttribute('speed') || 1);
  const step = 2.5 * a.s;                 /* bigger than this and it hops instead */
  const reach = 34 * a.s;                 /* how far it will hop across a gap */
  let box = null, state = 'walk', timer = rnd(2, 4), hop = null, placed = false, fleeX = null, metAt = 0;
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
  const startHop = (x1, y1, drop = false) => {
    const hgt = Math.max(10 * S, a.y - y1 + 8 * S);
    hop = { x0: a.x, y0: a.y, x1, y1, p: 0, d: drop ? .55 : clamp(.28 + Math.abs(x1 - a.x) / 500, .28, .6), yc: drop ? a.y : Math.min(a.y, y1) - hgt * 1.4 };
    a.play('hop');
  };
  const bump = power => { if (typeof el.piixImpact === 'function') el.piixImpact(a.x, a.y, power); };
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
        /* wait for pixel lettering to finish raining in, then drop onto it */
        if (el.piixSettled === false) { a.node.style.visibility = 'hidden'; return; }
        a.node.style.visibility = '';
        const at = host.getAttribute('at');
        a.x = box.l + (box.r - box.l) * (at != null ? clamp(+at, 0, 1) : rnd(.15, .85));
        let y = surf(a.x);
        for (let i = 0; y == null && i < 40; i++) { a.x += a.w * .1; y = surf(a.x); }
        a.face = chance(.5) ? 1 : -1;
        placed = true;
        if (reduced() || y == null) { a.y = y ?? box.t; a.play('walk'); }
        else { a.y = y - 160 * S; startHop(a.x, y, true); }
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
        if (p >= 1) {
          const fall = Math.max(0, hop.y1 - Math.min(hop.y0, hop.yc));
          hop = null; a.y = surf(a.x) ?? a.y; a.sy = .8; a.sx = 1.15;
          a.play(state === 'flip' ? 'flip' : 'walk');
          bump(clamp(fall / (60 * S), .3, 1.4));
        }
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
          /* two bugs bump into each other: a little moment, then both turn back */
          if (now() - metAt > 4000) for (const o of ACTORS) {
            if (o === a || o.spec !== a.spec || Math.abs(o.y - a.y) > a.h || Math.abs(o.x - a.x) > a.w * .85 || (o.x - a.x) * a.face < 0) continue;
            metAt = now(); a.say('heart', 900); go('idle', .9, 'idle');
            setTimeout(() => turn(), 700);
            if (o.ctl && o.ctl.meet) o.ctl.meet(a);
            break;
          }
          if (timer <= 0) {
            const r = Math.random();
            if (r < .4) go('sniff', rnd(1, 1.8), 'sniff');
            else if (r < .75) go('look', rnd(1.2, 2.2), 'look', { reset: true });
            else go('idle', rnd(1, 2.4), 'idle');
          }
          break;
        case 'alarm':
          if (timer <= 0) { a.face = (fleeX ?? ptr.x) > a.x ? -1 : 1; fleeX = null; go('scurry', rnd(.9, 1.4)); }
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
    meet(other) {
      if (now() - metAt < 1500 || hop || state === 'flip') return;
      metAt = now(); a.face = other.x > a.x ? 1 : -1;
      a.say('heart', 900); go('idle', .9, 'idle'); setTimeout(() => turn(), 700);
    },
    hear(type, from) {
      if (type !== 'thud' || hop || state === 'flip' || state === 'alarm' || state === 'scurry') return;
      fleeX = from.x; go('alarm', .25, 'alarm'); a.say('!', 600);
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

/* ---- behaviors/creep.js ---- */
/* creep: glides very slowly along the top of an element's text (or edge), leaving a
 * shimmering slime trail that fades out behind it. Hides in its shell when the cursor
 * gets close or something thuds nearby, then peeks out and carries on. */
defineBehavior('creep', (a, [el], host) => {
  const S = a.s / 3;
  const speed = 9 * S * (+host.getAttribute('speed') || 1);
  const mode = host.getAttribute('edge') || (typeof el.piixSurface === 'function' ? 'surface' : 'text');
  const cache = {};
  let box = null, state = 'walk', timer = rnd(4, 8), placed = false, run = 0, lastY = 0;

  const slime = document.createElement('div');
  slime.style.cssText = `position:absolute;left:0;top:0;height:${Math.max(2, Math.round(a.s * .7))}px;pointer-events:none;border-radius:2px;` +
    'background:linear-gradient(90deg,rgba(150,225,255,0),rgba(150,225,255,.55) 70%,rgba(255,255,255,.85));' +
    'transform-origin:100% 50%';
  a.node.parentNode.insertBefore(slime, a.node);

  const lane = () => {
    if (mode === 'surface') { const r = rectOf(el); return { l: r.l, r: r.r, t: r.t }; }
    if (mode === 'text') { const t = textProfile(el, cache); if (t) return t; }
    const r = rectOf(el); return { l: r.l, r: r.r, t: r.t };
  };
  const surf = x => {
    if (x < box.l + a.w * .35 || x > box.r - a.w * .35) return null;
    if (mode === 'surface') return el.piixSurface(x);
    return box.segs ? segAt(box.segs, x) : box.t;
  };
  const hide = t => { state = 'hide'; timer = t; a.play('hide'); };

  return {
    tick(dt) {
      box = lane();
      if (!placed) {
        const at = host.getAttribute('at');
        a.x = box.l + (box.r - box.l) * (at != null ? clamp(+at, 0, 1) : rnd(.2, .8));
        a.y = surf(a.x) ?? box.t; lastY = a.y; a.face = chance(.5) ? 1 : -1; placed = true;
      }
      const g = surf(a.x);
      if (g != null) a.y = g;
      if (reduced()) { a.play('idle'); slime.style.width = '0px'; return; }

      const near = ptr.seen && ptrDist(a.x, a.y - a.h / 2) < 60 * S + a.w / 2;
      timer -= dt;
      switch (state) {
        case 'walk': {
          a.play('walk');
          if (near) { hide(rnd(2.5, 4)); a.say('sweat', 700); break; }
          const nx = a.x + a.face * speed * dt;
          const ny = surf(nx);
          /* snails don't jump: at a gap or an edge, it turns around */
          if (ny == null || Math.abs(ny - a.y) > a.h * .9) { a.face = -a.face; run = 0; state = 'rest'; timer = rnd(1, 2); a.play('idle'); break; }
          a.x = nx; a.y = ny;
          run = Math.abs(a.y - lastY) > 1 ? 0 : Math.min(run + speed * dt, 170 * S);
          lastY = a.y;
          if (timer <= 0) { state = 'rest'; timer = rnd(1.5, 3); a.play('idle'); }
          break;
        }
        case 'rest':
          if (near) { hide(rnd(2.5, 4)); break; }
          if (timer <= 0) { state = 'walk'; timer = rnd(5, 10); if (chance(.25)) { a.face = -a.face; run = 0; } }
          break;
        case 'hide':
          a.play('hide');
          if (near) timer = Math.max(timer, 1.2);
          if (timer <= 0) { state = 'peek'; timer = rnd(.8, 1.4); a.play('peek'); }
          break;
        case 'peek':
          if (near) { hide(rnd(2, 3)); break; }
          if (timer <= 0) { state = 'walk'; timer = rnd(4, 8); }
          break;
      }

      /* the trail sits under the shell and stretches out behind it, fading */
      const len = Math.round(run);
      const tail = a.face > 0 ? a.x - a.w * .25 - len : a.x + a.w * .25;
      slime.style.width = len + 'px';
      slime.style.transform = `translate3d(${Math.round(tail - origin.x)}px,${Math.round(a.y - 2 - origin.y)}px,0) scaleX(${a.face > 0 ? 1 : -1})`;
      slime.style.transformOrigin = a.face > 0 ? '100% 50%' : '0 50%';
    },
    poke() { hide(rnd(3, 4.5)); a.say(pick(['!', 'eep']), 700); },
    hear(type) { if (type === 'thud') hide(rnd(2.5, 4)); },
    destroy() { slime.remove(); }
  };
});

/* ---- behaviors/drop.js ---- */
/* drop: waits until its element scrolls into view, then parachutes down from the top
 * of the screen, swaying, and lands on it. Folds the chute, waves. Click to jump again. */
defineBehavior('drop', (a, [el], host) => {
  const S = a.s / 3;
  const cache = {};
  let state = 'wait', x = 0, sway = rnd(0, 6), timer = 0, vy = 0;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : rnd(.25, .75);
  const spot = () => {
    const tp = textProfile(el, cache);
    if (tp) { const x = tp.l + (tp.r - tp.l) * at; return { x, y: segAt(tp.segs, x) ?? tp.t }; }
    const r = rectOf(el); return { x: r.l + r.w * at, y: r.t };
  };
  a.node.style.visibility = 'hidden';

  return {
    awake: () => true,
    tick(dt, t) {
      const s = spot();
      if (state === 'wait') {
        const r = rectOf(el);
        if (r.t < scrollY + innerHeight * .8 && r.b > scrollY) {
          state = 'fall'; x = s.x + rnd(-40, 40) * S; a.y = Math.min(scrollY - 10, s.y - 200 * S);
          a.node.style.visibility = ''; a.play('fall');
          if (reduced()) { a.y = s.y; a.x = s.x; state = 'landed'; a.play('landed'); }
        }
        return;
      }
      if (state === 'fall') {
        sway += dt * 2.2;
        x = lerp(x, s.x, 1 - Math.exp(-.8 * dt));
        a.x = x + Math.sin(sway) * 18 * S;
        a.rot = Math.cos(sway) * 10;
        a.y += 70 * S * dt;
        if (a.y >= s.y) { a.y = s.y; a.rot = 0; state = 'landed'; timer = .8; a.play('landed'); a.sy = .8; a.sx = 1.2; }
        return;
      }
      a.x = s.x; a.y = s.y;
      a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
      timer -= dt;
      if (state === 'landed' && timer <= 0) { state = 'wave'; timer = 2.4; a.play('wave'); a.say('hi', 1400); }
      else if (state === 'wave' && timer <= 0) { state = 'stand'; a.play('landed'); }
      else if (state === 'launch') {
        vy -= 1200 * S * dt; a.y += vy * dt;
      }
    },
    poke() {
      if (state === 'fall') return;
      state = 'fall'; a.play('fall'); a.say('!', 600);
      a.y = Math.min(scrollY - 10, a.y - 220 * S); x = a.x;
    }
  };
});

/* ---- behaviors/float.js ---- */
/* float: a balloon on a string tied to an element. Sways like an upside-down pendulum,
 * pushed by cursor swipes and scrolling. Click to pop; it re-inflates after a bit. */
defineBehavior('float', (a, [el], host) => {
  const S = a.s / 4;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .85;
  const L = (+host.getAttribute('length') || 70) * S;
  let th = rnd(-.2, .2), w = 0, state = 'up', timer = 0, grow = 1, lastV = 0;

  const silk = document.createElement('div');
  silk.className = 'thread';
  silk.style.width = Math.max(1, Math.round(a.s / 3)) + 'px';
  silk.style.color = host.getAttribute('silk') || '#17121f';
  a.node.parentNode.insertBefore(silk, a.node);
  a.cv.style.transformOrigin = '50% 100%';

  return {
    tick(dt, t) {
      const r = rectOf(el);
      const ax = r.l + r.w * at, ay = r.t;
      if (!reduced()) {
        const acc = (scroll.v - lastV) / Math.max(dt, .001); lastV = scroll.v;
        w += clamp(acc * .000015, -1.5, 1.5);
        const near = ptr.seen && Math.abs(ptr.x - a.x) < 60 * S && Math.abs(ptr.y - (a.y - a.h / 2)) < 70 * S;
        if (near) w += clamp(ptr.vx * .00012, -.4, .4);
        /* buoyancy pulls it upright, plus a lazy breeze */
        w += (-Math.sin(th) * 7 + Math.sin(t / 1300) * .35 - w * 1.6) * dt;
        th = clamp(th + w * dt, -.8, .8);
      }
      timer -= dt;
      if (state === 'popped') {
        a.play('pop');
        if (timer <= 0) { state = 'grow'; grow = .15; a.play('idle'); }
      } else if (state === 'grow') {
        grow = Math.min(1, grow + dt * .8);
        if (grow >= 1) state = 'up';
      } else a.play(Math.floor(t / 2800) % 6 === 0 && (t % 2800) < 150 ? 'blink' : 'idle');
      const len = L * (state === 'popped' ? .3 : 1);
      const ex = ax + Math.sin(th) * len, ey = ay - Math.cos(th) * len;
      a.x = ex; a.y = ey;
      a.rot = th * 40;
      a.sx = a.sy = state === 'popped' ? 1.3 : grow;
      silk.style.height = Math.round(len) + 'px';
      silk.style.transform = `translate3d(${Math.round(ax - origin.x)}px,${Math.round(ay - origin.y)}px,0) rotate(${(180 - th * 57.3).toFixed(1)}deg)`;
      silk.style.opacity = state === 'popped' ? '.35' : '.75';
    },
    poke() {
      if (state !== 'up') return;
      state = 'popped'; timer = 2.4;
      shout(a, 'thud', 200);
      a.say('!?', 700);
    },
    destroy() { silk.remove(); }
  };
});

/* ---- behaviors/follow.js ---- */
/* follow: naps on its element until the cursor comes near, then tags along behind it
 * around the page. When the cursor stops for a while it flies home and naps again.
 * Poke it for a loop-the-loop. */
defineBehavior('follow', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .5;
  const MAX = 760 * S;
  let state = 'home', vx = 0, vy = 0, loop = 0, side = -1, idleSince = now(), placed = false;

  const home = () => {
    const r = rectOf(el);
    return { x: r.l + a.w / 2 + (r.w - a.w) * at, y: typeof el.piixSurface === 'function' ? (el.piixSurface(r.l + r.w * at) ?? r.t) : r.t };
  };
  const steer = (gx, gy, dt, gain, max) => {
    const dx = gx - a.x, dy = gy - a.y;
    vx = lerp(vx, clamp(dx * gain, -max, max), 1 - Math.exp(-5 * dt));
    vy = lerp(vy, clamp(dy * gain, -max, max), 1 - Math.exp(-5 * dt));
    a.x += vx * dt; a.y += vy * dt;
    return Math.hypot(dx, dy);
  };

  return {
    tick(dt, t) {
      const h = home();
      if (!placed) { a.x = h.x; a.y = h.y; placed = true; a.play('sleep'); a.say('zz', 0); }
      if (reduced()) { a.x = h.x; a.y = h.y; a.play('perch'); return; }
      if (now() - ptr.last < 120) idleSince = now();
      const idle = now() - idleSince;

      if (state === 'home') {
        a.x = h.x; a.y = h.y; a.rot = 0;
        a.play(idle > 6000 ? 'sleep' : 'perch');
        if (ptr.seen && idle < 400 && ptrDist(a.x, a.y - a.h / 2) < 220 * S) {
          state = 'follow'; a.hush(); a.say(chance(.5) ? 'heart' : '!', 700); vy = -200 * S;
        }
        return;
      }

      if (state === 'follow') {
        /* hang back on the side the cursor came from, a little above it */
        if (Math.abs(ptr.vx) > 60) side = ptr.vx > 0 ? -1 : 1;
        const gx = ptr.x + side * 46 * S, gy = ptr.y - 18 * S + Math.sin(t / 160) * 6 * S;
        steer(gx, gy, dt, 6, MAX);
        if (idle > 4500 || !ptr.seen || ptr.cx < -1e4) { state = 'return'; a.say('zz', 900); }
      } else if (state === 'return') {
        const d = steer(h.x, h.y - 2 * S, dt, 3.2, MAX * .55);
        if (d < 3 * S) { state = 'home'; vx = vy = 0; a.say('zz', 0); }
        if (idle < 200 && ptrDist(a.x, a.y) < 260 * S) state = 'follow';
      }

      if (loop > 0) { loop = Math.max(0, loop - dt / .6); a.rot = (1 - loop) * 360 * (a.face || 1); a.play('happy'); }
      else {
        a.rot = clamp(vx / MAX * 18, -18, 18);
        a.play('fly');
      }
      if (Math.abs(vx) > 25) a.face = vx > 0 ? 1 : -1;
    },
    poke() {
      if (state === 'home') { state = 'follow'; a.hush(); }
      loop = 1; a.say('heart', 800);
    },
    hear(type) { if (type === 'thud' && state === 'home') { state = 'follow'; a.hush(); a.say('!', 600); } }
  };
});

/* ---- behaviors/glow.js ---- */
/* glow: fireflies drifting around an element, blinking softly. Hover the element and
 * they gather round your cursor. Click one and they all scatter, then drift back.
 *   count="9"   number of fireflies */
defineBehavior('glow', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 9, 1, 40);
  const flies = [a, ...Array.from({ length: n - 1 }, () => recruit(a, 'fireflies'))];
  const st = flies.map(() => ({ x: null, y: 0, vx: 0, vy: 0, ph: rnd(0, 6.28), sp: rnd(.4, .9), rx: rnd(.25, .5), ry: rnd(.2, .45), on: chance(.5), next: rnd(.2, 2) }));
  const GLOW = 'drop-shadow(0 0 3px #fff36b) drop-shadow(0 0 9px #ffd23f)';
  flies.forEach(f => f.node.classList.add('nograb'));

  return {
    crew: flies.slice(1),
    awake: () => onScreen(rectOf(el)),
    tick(dt, t) {
      const r = rectOf(el);
      const cx = r.l + r.w / 2, cy = r.t + r.h / 2;
      const hover = ptr.seen && ptr.x > r.l - 40 && ptr.x < r.r + 40 && ptr.y > r.t - 40 && ptr.y < r.b + 40;
      flies.forEach((f, i) => {
        const s = st[i];
        if (s.x == null) { s.x = cx; s.y = cy; }
        s.ph += dt * s.sp;
        /* each one traces its own lazy loop, round the element or round the cursor */
        const gx = hover ? ptr.x + Math.cos(s.ph * 2 + i) * 34 * S : cx + Math.cos(s.ph) * r.w * s.rx;
        const gy = hover ? ptr.y + Math.sin(s.ph * 3 + i) * 26 * S : cy + Math.sin(s.ph * 1.7) * r.h * s.ry + 10;
        if (!reduced()) {
          s.vx += ((gx - s.x) * 2.2 - s.vx * 1.6) * dt; s.vy += ((gy - s.y) * 2.2 - s.vy * 1.6) * dt;
          s.x += s.vx * dt; s.y += s.vy * dt;
          s.next -= dt;
          if (s.next <= 0) { s.on = !s.on; s.next = s.on ? rnd(.6, 2.4) : rnd(.15, .9); }
        } else { s.x = gx; s.y = gy; s.on = true; }
        f.x = s.x; f.y = s.y; f.face = s.vx >= 0 ? 1 : -1;
        f.play(s.on ? 'on' : 'off');
        f.cv.style.filter = s.on ? GLOW : '';
      });
    },
    poke() { st.forEach(s => { s.vx += rnd(-600, 600); s.vy += rnd(-600, 200); }); }
  };
});

/* ---- behaviors/guard.js ---- */
/* guard: sits on a form field and watches you type. Its eyes follow the caret,
 * it covers its eyes for passwords, cheers for valid input and sweats over invalid.
 * Put it inside an <input>'s wrapper, a <label> or a <form>; it finds the field. */
const caretCtx = document.createElement('canvas').getContext('2d');
defineBehavior('guard', (a, [el], host) => {
  const S = a.s / 3;
  const field = el.matches && el.matches('input,textarea') ? el : el.querySelector('input,textarea') || el;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .85;
  let mood = '', moodT = 0, hop = 0, x = null;

  /* where the caret is, in doc-x */
  const caretX = r => {
    if (!field.value || field.selectionStart == null) return r.l + 14;
    const cs = getComputedStyle(field);
    caretCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const shown = field.type === 'password' ? '•'.repeat(field.selectionStart) : field.value.slice(0, field.selectionStart);
    return r.l + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth) + caretCtx.measureText(shown).width - field.scrollLeft;
  };
  const feel = (m, t, icon) => { mood = m; moodT = t; if (icon) a.say(icon, 900); };
  const onInput = () => { if (chance(.25)) hop = .25; mood = ''; };
  const onBlur = () => {
    if (!field.value || !field.checkValidity) return;
    if (field.checkValidity()) { feel('happy', 1.6, 'check'); hop = .35; }
    else feel('worried', 2.2, 'sweat');
  };
  field.addEventListener('input', onInput);
  field.addEventListener('blur', onBlur);

  return {
    tick(dt) {
      const r = rectOf(field);
      const focused = document.activeElement === field;
      const secret = field.type === 'password';
      const home = r.l + a.w / 2 + (r.w - a.w) * at;
      const want = focused && !secret ? clamp(caretX(r) + a.w * .6, r.l + a.w / 2, r.r - a.w / 2) : home;
      x = x == null ? home : lerp(x, want, 1 - Math.exp(-8 * dt));
      a.x = x; a.y = r.t;
      moodT -= dt; hop = Math.max(0, hop - dt);
      a.oy = -Math.sin(Math.PI * hop / .35) * 10 * S * (hop > 0);
      if (reduced()) { a.play('idle'); return; }
      if (focused && secret) a.play('cover');
      else if (moodT > 0) a.play(mood);
      else if (focused) a.play(caretX(r) < a.x ? 'l' : 'r');
      else if (ptr.seen && ptrDist(a.x, a.y) < 120 * S) a.play(ptr.x < a.x ? 'l' : 'r');
      else a.play('idle');
    },
    poke() { hop = .35; a.say(field.type === 'password' ? '...' : 'heart', 700); },
    destroy() { field.removeEventListener('input', onInput); field.removeEventListener('blur', onBlur); }
  };
});

/* ---- behaviors/hang.js ---- */
/* hang: dangles from the bottom edge of an element on a silk thread. Swings when the
 * page scrolls or the cursor brushes past, zips up when you reach for it, then lowers
 * itself back down, legs wiggling. Poke it and it yo-yos. */
defineBehavior('hang', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .82;
  const rest = (+host.getAttribute('length') || 70) * S;
  let L = 0, Lv = 0, goal = rest;            /* thread length and its spring */
  let th = 0, w = 0;                         /* pendulum angle (rad) and angular speed */
  let state = 'lower', timer = 0, lastV = 0;

  const silk = document.createElement('div');
  silk.className = 'thread';
  silk.style.width = Math.max(1, Math.round(a.s / 2)) + 'px';
  silk.style.color = host.getAttribute('silk') || '#1b1226';
  a.node.parentNode.insertBefore(silk, a.node);
  a.cv.style.transformOrigin = '50% 0';
  a.node.classList.add('nograb');

  return {
    tick(dt, t) {
      const r = rectOf(el);
      const ax = r.l + r.w * at, ay = r.b;
      if (reduced()) { L = rest; th = 0; }
      else {
        /* scroll gives the spider a shove (it lags behind the page) */
        const acc = (scroll.v - lastV) / Math.max(dt, .001);
        lastV = scroll.v;
        w += clamp(acc * .00002, -2, 2) + (chance(dt * .4) ? rnd(-.15, .15) : 0);
        /* the cursor sweeping past the spider pushes it */
        const px = a.x, py = a.y - a.h / 2;
        if (ptr.seen && Math.abs(ptr.x - px) < 40 * S && Math.abs(ptr.y - py) < 60 * S) w += clamp(ptr.vx * .00009, -.25, .25);

        const g = 9.8 * 160;
        w += (-g / Math.max(L, 20) * Math.sin(th) - w * 1.1) * dt;
        th = clamp(th + w * dt, -1.2, 1.2);

        const near = ptr.seen && ptrDist(px, py) < 75 * S;
        timer -= dt;
        switch (state) {
          case 'lower':
            goal = rest + Math.sin(t / 1600) * 10 * S;
            a.play(Math.abs(Lv) > 30 ? 'wiggle' : 'idle');
            if (near) { state = 'flee'; a.play('scared'); a.say(chance(.5) ? '!' : 'sweat', 700); }
            break;
          case 'flee':
            goal = 10 * S;
            a.play('scared');
            if (!near) { state = 'wait'; timer = rnd(1.2, 2.2); }
            break;
          case 'wait':
            goal = 10 * S;
            a.play('idle');
            if (near) state = 'flee';
            else if (timer <= 0) state = 'lower';
            break;
        }
        /* fast up, slow down */
        const k = goal < L ? 140 : 18;
        Lv += ((goal - L) * k - Lv * (goal < L ? 18 : 6)) * dt;
        L = Math.max(4, L + Lv * dt);
      }
      const ex = ax + Math.sin(th) * L, ey = ay + Math.cos(th) * L;
      a.x = ex; a.y = ey + a.h;
      a.rot = -th * 57.3;
      /* render() turns the canvas around its top, so pivot the foot point to match */
      silk.style.height = Math.round(L + 2) + 'px';
      silk.style.transform = `translate3d(${Math.round(ax - origin.x)}px,${Math.round(ay - origin.y)}px,0) rotate(${(-th * 57.3).toFixed(2)}deg)`;
    },
    hear(type) {
      if (type !== 'thud') return;
      w += (chance(.5) ? 1 : -1) * rnd(.5, 1); a.say('sweat', 600);
    },
    poke() {
      Lv += 520 * S; w += rnd(-1.2, 1.2);
      a.say(pick(['!', 'heart', '!?']), 700);
    },
    destroy() { silk.remove(); }
  };
});

/* ---- behaviors/launch.js ---- */
/* launch: sits on an element (a deploy button, say). Click it: countdown 3-2-1, it
 * blasts off the top of the screen trailing smoke, then drops back down on its
 * retro-rockets and lands where it started. With box="selector" it leaves through the
 * top of that element instead of the screen. */
defineBehavior('launch', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .85;
  let state = 'pad', t = 0, alt = 0, v = 0, count = 0;
  const puffs = [];
  const boxEl = boxOf(host);
  /* how high it climbs before it's gone: off the top of the box, or of the screen */
  const ceiling = s => boxEl ? s.y - rectOf(boxEl).t + a.h + 20 * S : s.y + 300 * S;
  const spot = () => { const r = rectOf(el); return { x: r.l + a.w / 2 + (r.w - a.w) * at, y: r.t }; };
  const puff = () => {
    if (a.node.style.opacity === '0') return; /* no smoke while it's out of the box */
    const p = document.createElement('div');
    const s = Math.round(a.s * rnd(2, 4));
    p.style.cssText = `position:absolute;left:0;top:0;width:${s}px;height:${s}px;background:#d9d4e3;border-radius:2px;pointer-events:none`;
    a.node.parentNode.insertBefore(p, a.node);
    puffs.push({ el: p, x: a.x + rnd(-4, 4) * S, y: a.y + rnd(0, 6) * S, life: 1, vx: rnd(-30, 30) * S });
  };

  return {
    boxed: true,
    awake: () => true,
    tick(dt) {
      const s = spot();
      a.x = s.x;
      if (!reduced()) {
        if (state === 'count') {
          t -= dt;
          a.ox = rnd(-1, 1) * S;
          if (t <= 0) { count--; if (count > 0) { a.say('#' + count, 700); t = .7; } else { state = 'up'; v = 0; a.ox = 0; a.say('up', 600); } }
        } else if (state === 'up') {
          v += 1500 * S * dt; alt += v * dt;
          if (chance(dt * 40)) puff();
          if (alt > ceiling(s)) { state = 'away'; t = 1.2; }
        } else if (state === 'away') {
          t -= dt; if (t <= 0) { state = 'down'; v = 420 * S; }
        } else if (state === 'down') {
          /* retro-rockets: ease to a gentle touchdown */
          v = Math.max(60 * S, Math.min(v, alt * 2.2)); alt -= v * dt;
          if (chance(dt * 18)) puff();
          if (alt <= 0) { alt = 0; state = 'pad'; a.sy = .82; a.sx = 1.18; shout(a, 'thud', 160 * S); }
        }
      }
      a.y = s.y - alt;
      if (boxEl) a.node.style.opacity = a.y - a.h * .5 < rectOf(boxEl).t ? '0' : '';
      a.play(state === 'up' || state === 'down' ? 'burn' : 'idle');
      a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life -= dt * 1.4; p.y += 30 * S * dt; p.x += p.vx * dt;
        p.el.style.opacity = Math.max(0, p.life).toFixed(2);
        p.el.style.transform = `translate3d(${Math.round(p.x - origin.x)}px,${Math.round(p.y - origin.y)}px,0) scale(${(2 - p.life).toFixed(2)})`;
        if (p.life <= 0) { p.el.remove(); puffs.splice(i, 1); }
      }
    },
    poke() { if (state === 'pad') { state = 'count'; count = 3; t = .7; a.say('#3', 700); } },
    destroy() { puffs.forEach(p => p.el.remove()); }
  };
});

/* ---- behaviors/lounge.js ---- */
/* lounge: lies on an element swishing its tail. Swats at the cursor when it comes close,
 * dozes off when ignored, purrs when poked. */
defineBehavior('lounge', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .2;
  const cache = {};
  let state = 'rest', timer = 0, calm = 0;
  const spot = () => {
    const tp = host.getAttribute('edge') !== 'box' && textProfile(el, cache);
    if (tp) {
      const x = tp.l + a.w / 2 + Math.max(0, tp.r - tp.l - a.w) * at, half = a.w * .35;
      const under = tp.segs.filter(g => g.r > x - half && g.l < x + half);
      return { x, y: under.length ? Math.min(...under.map(g => g.t)) : tp.t };
    }
    const r = rectOf(el); return { x: r.l + a.w / 2 + (r.w - a.w) * at, y: r.t };
  };
  return {
    tick(dt) {
      const s = spot();
      a.x = s.x; a.y = s.y;
      if (reduced()) { a.play('rest'); return; }
      const d = ptr.seen ? ptrDist(a.x, a.y - a.h / 2) : 1e9;
      calm = d < 160 * S ? 0 : calm + dt;
      timer -= dt;
      if (state === 'sleep') {
        a.play('sleep');
        if (d < 50 * S) { state = 'rest'; a.hush(); a.say('!', 600); }
        return;
      }
      if (state === 'purr') { a.play('purr'); if (timer <= 0) state = 'rest'; return; }
      if (d < 75 * S) {
        /* face the cursor and swat */
        a.face = ptr.x < a.x ? 1 : -1;
        a.play('swat');
        if (chance(dt * 1.2)) a.say(pick(['!', 'grr']), 400);
      } else {
        a.play('rest');
        if (calm > 9) { state = 'sleep'; a.say('zz', 0); }
      }
    },
    poke() {
      a.hush();
      state = 'purr'; timer = 2; a.say('heart', 1200);
    }
  };
});

/* ---- behaviors/march.js ---- */
/* march: a line of ants marching along the top of an element, some carrying crumbs.
 * Bring the cursor close and the nearby ants scatter, then hurry back into line.
 *   count="7"   number of ants */
defineBehavior('march', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 7, 2, 30);
  const ants = [a, ...Array.from({ length: n - 1 }, () => recruit(a, 'ants'))];
  const st = ants.map((_, i) => ({ p: i * 18 * S, ox: 0, oy: 0, vx: 0, vy: 0, carry: i % 3 === 1 }));
  const speed = 26 * S * (+host.getAttribute('speed') || 1);
  let off = 0;

  return {
    crew: ants.slice(1),
    tick(dt) {
      const r = rectOf(el);
      const span = r.w + 40 * S;
      if (!reduced()) off += speed * dt;
      ants.forEach((ant, i) => {
        const s = st[i];
        const pos = ((s.p - off) % span + span) % span;   /* march right to left along the edge */
        const x = r.r + 20 * S - pos;
        /* scatter from the cursor, then spring back into line */
        if (ptr.seen && !reduced() && ptrDist(x + s.ox, r.t + s.oy - 4) < 55 * S) {
          const dx = x + s.ox - ptr.x || .1, d = Math.abs(dx);
          s.vx += Math.sign(dx) * 900 * S * dt / Math.max(d / 40, .4);
          s.vy -= 260 * S * dt;
        }
        s.vx += (-s.ox * 40 - s.vx * 9) * dt; s.vy += (-s.oy * 40 - s.vy * 9) * dt;
        s.ox += s.vx * dt; s.oy = Math.min(0, s.oy + s.vy * dt);
        ant.x = x; ant.y = r.t; ant.ox = s.ox; ant.oy = s.oy; ant.face = -1;
        ant.play(s.carry ? 'carry' : 'walk');
        /* fade in and out at the ends of the line */
        const edge = Math.min(pos, span - pos);
        ant.node.style.opacity = clamp(edge / (24 * S), 0, 1).toFixed(2);
      });
    },
    poke(e, who) { (who || a).say(pick(['!', 'grr']), 500); st.forEach(s => { s.vy -= rnd(100, 260) * S; }); }
  };
});

/* ---- behaviors/mimic.js ---- */
/* mimic: a copycat cursor. Replays the exact path your cursor took a moment ago and
 * clicks wherever you clicked. Stop moving and it catches up and dances. It never
 * catches clicks itself.   delay="0.5" seconds behind   box="selector" only inside that element */
defineBehavior('mimic', (a, targets, host) => {
  const delay = (+host.getAttribute('delay') || .5) * 1000;
  const path = [], clicks = [];
  const boxEl = boxOf(host);
  const inside = (x, y) => { if (!boxEl) return true; const b = rectOf(boxEl); return x >= b.l && x <= b.r && y >= b.t && y <= b.b; };
  let lx = null, ly = null, ripple = 0;
  a.node.classList.add('ghost');
  const ring = document.createElement('div');
  ring.style.cssText = 'position:absolute;left:0;top:0;width:24px;height:24px;margin:-12px 0 0 -12px;border:3px solid #c6f432;border-radius:50%;pointer-events:none;opacity:0';
  a.node.parentNode.insertBefore(ring, a.node);
  const mv = () => { if (!inside(ptr.x, ptr.y)) return; path.push({ t: now(), x: ptr.x, y: ptr.y }); if (path.length > 600) path.shift(); };
  const dn = e => { if (e.button === 0 && inside(e.clientX + scrollX, e.clientY + scrollY)) clicks.push({ t: now(), x: e.clientX + scrollX, y: e.clientY + scrollY }); };
  addEventListener('pointermove', mv, { passive: true });
  addEventListener('pointerdown', dn, { passive: true });

  return {
    awake: () => true,
    tick(dt) {
      const t = now() - delay;
      /* where was the cursor `delay` ago? */
      while (path.length > 1 && path[1].t <= t) path.shift();
      const p = path[0];
      const idle = now() - ptr.last > delay + 1200;
      if (p) {
        const tx = idle ? ptr.x + 18 : p.x, ty = idle ? ptr.y + 18 : p.y;
        lx = lx == null ? tx : lerp(lx, tx, idle ? 1 - Math.exp(-4 * dt) : 1);
        ly = ly == null ? ty : lerp(ly, ty, idle ? 1 - Math.exp(-4 * dt) : 1);
      }
      if (lx == null) { a.node.style.opacity = '0'; return; }
      a.node.style.opacity = ptr.seen && ptr.cx > -1e4 && inside(ptr.x, ptr.y) ? '1' : '0';
      /* the arrow's tip is its top-left pixel */
      a.x = lx + a.w / 2; a.y = ly + a.h;
      while (clicks.length && clicks[0].t <= t) {
        const c = clicks.shift();
        ripple = .45; a.play('click');
        ring.style.transform = `translate3d(${Math.round(c.x - origin.x)}px,${Math.round(c.y - origin.y)}px,0) scale(.3)`;
      }
      if (ripple > 0) {
        ripple -= dt;
        const k = 1 - ripple / .45;
        ring.style.opacity = (1 - k).toFixed(2);
        ring.style.transform = ring.style.transform.replace(/scale\([^)]*\)/, `scale(${(.3 + k * 1.4).toFixed(2)})`);
        if (ripple <= 0) a.play('idle');
      } else a.play(idle && !reduced() ? 'dance' : 'idle');
    },
    destroy() { removeEventListener('pointermove', mv); removeEventListener('pointerdown', dn); ring.remove(); }
  };
});

/* ---- behaviors/mind.js ---- */
/* mind: minds its own business. Sits on an element and reads, flips pages, dozes off.
 * Hover nearby for a while and it glances up at you. Poke it and it turns its back.
 * Poke it three times and it packs up and hops somewhere quieter. */
defineBehavior('mind', (a, [el], host) => {
  const S = a.s / 3;
  let at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .85;
  let state = 'read', timer = rnd(4, 8), stare = 0, pokes = [], hop = null, readFor = 0;
  const has = c => a.has(c);
  const go = (s, t, clip) => { state = s; timer = t; if (clip && has(clip)) a.play(clip, { reset: true }); };
  const cache = {};
  /* where to sit: on the tallest glyph under it if the element has text, else the top edge */
  const spot = r => {
    if (typeof el.piixSurface === 'function') { const x = r.l + a.w / 2 + (r.w - a.w) * at; return { x, y: el.piixSurface(x) ?? r.t }; }
    const tp = host.getAttribute('edge') !== 'box' && textProfile(el, cache);
    if (tp) {
      const x = tp.l + a.w / 2 + Math.max(0, tp.r - tp.l - a.w) * at, half = a.w * .3;
      const under = tp.segs.filter(g => g.r > x - half && g.l < x + half);
      return { x, y: under.length ? Math.min(...under.map(g => g.t)) : tp.t };
    }
    return { x: r.l + a.w / 2 + (r.w - a.w) * at, y: r.t };
  };

  return {
    tick(dt) {
      const r = rectOf(el);
      if (hop) {
        hop.p = Math.min(1, hop.p + dt / hop.d);
        const p = hop.p, q = 1 - p, s = spot(r);
        a.x = lerp(hop.x0, s.x, p);
        a.y = q * q * hop.y0 + 2 * q * p * (Math.min(hop.y0, s.y) - 50 * S) + p * p * s.y;
        a.sy = 1.1; a.sx = .92;
        if (p >= 1) { hop = null; a.sy = .82; a.sx = 1.15; hop = null; go('back', 1.2, 'back'); }
        return;
      }
      const s = spot(r);
      a.x = s.x; a.y = s.y;
      a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
      if (reduced()) { a.play('read'); return; }

      timer -= dt;
      readFor += dt;
      const close = ptr.seen && ptrDist(a.x, a.y - a.h / 2) < 110 * S;
      stare = close ? stare + dt : Math.max(0, stare - dt * 2);

      switch (state) {
        case 'read':
          a.play('read');
          if (stare > 1.1) { go('look', 1.4, 'look'); a.say('...', 1300); stare = -2; }
          else if (timer <= 0) {
            if (readFor > 18 && chance(.5)) { go('doze', rnd(5, 9), 'doze'); a.say('zz', 0); readFor = 0; }
            else go('flip', .5, 'flip');
          }
          break;
        case 'flip':
          if (timer <= 0) go('read', rnd(4, 9), 'read');
          break;
        case 'doze':
          if (close && stare > .6) { a.hush(); go('look', 1, 'look'); a.say('!', 700); stare = -2; }
          else if (timer <= 0) { a.hush(); go('read', rnd(4, 8), 'read'); }
          break;
        case 'look':
          if (timer <= 0) go('read', rnd(4, 8), 'read');
          break;
        case 'annoyed':
          if (timer <= 0) go('back', rnd(3, 4.5), 'back');
          break;
        case 'back':
          if (timer <= 0) { a.say('...', 900); go('read', rnd(4, 8), 'read'); }
          break;
      }
    },
    hear(type) {
      if (type !== 'thud' || hop || state === 'annoyed' || state === 'back' || now() - (this._heard || 0) < 2500) return;
      this._heard = now();
      a.hush(); a.say(pick(['grr', 'vein', '!?']), 900);
      go('annoyed', .8, 'annoyed');
    },
    poke() {
      if (hop) return;
      const t = now();
      pokes = pokes.filter(p => t - p < 4000).concat(t);
      a.hush();
      if (pokes.length >= 3) {
        /* that's it, moving */
        pokes = [];
        a.say('grr', 900);
        const r = rectOf(el);
        const old = at;
        at = old > .5 ? rnd(.05, .35) : rnd(.65, .95);
        a.face = at > old ? 1 : -1;
        hop = { x0: a.x, y0: a.y, p: 0, d: clamp(Math.abs(at - old) * r.w / 700, .45, .9) };
        a.play('back');
        return;
      }
      a.say(pokes.length === 1 ? '!?' : 'vein', 900);
      go('annoyed', .7, 'annoyed');
    }
  };
});

/* ---- behaviors/parade.js ---- */
/* parade: a mother duck walks along an element with her ducklings in a line behind her.
 * The ducklings follow her exact path, so when she turns round they file back past.
 * Poke a duckling and it hops; poke the mother and the whole family quacks.
 *   count="4"   number of ducklings */
defineBehavior('parade', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 4, 1, 12);
  const kids = Array.from({ length: n }, () => recruit(a, 'duckling'));
  const hops = kids.map(() => 0);
  const trail = [];
  let x = null, dir = 1, state = 'walk', timer = rnd(3, 6), quack = 0;
  const first = 26 * S, gap = 22 * S;

  return {
    crew: kids,
    tick(dt) {
      const r = rectOf(el);
      const L = r.l + a.w / 2, R = r.r - a.w / 2;
      if (x == null) {
        x = L + (R - L) * rnd(.45, .7);
        /* start with the ducklings already lined up behind her */
        for (let d = (first + gap * n) * 1.2; d > 0; d -= 1) trail.push({ x: x - r.l - d * dir, face: dir });
        trail.reverse();
      }
      if (!reduced()) {
        timer -= dt; quack -= dt;
        if (state === 'walk') {
          const nx = clamp(x + dir * 22 * S * dt, L, R);
          if (nx !== x) trail.unshift({ x: nx - r.l, face: dir });
          x = nx;
          if (x <= L || x >= R) dir = -dir;
          if (timer <= 0) { state = 'rest'; timer = rnd(1, 2.2); }
        } else if (timer <= 0 && quack <= 0) { state = 'walk'; timer = rnd(3, 7); if (chance(.3)) dir = -dir; }
        if (trail.length > 4000) trail.length = 4000;
      }
      a.x = clamp(x, L, R); a.y = r.t; a.face = dir;
      a.play(quack > 0 ? 'quack' : state === 'walk' ? 'walk' : 'idle');

      /* each duckling sits a fixed walking-distance back along her path */
      let dist = 0, idx = 0, prev = x - r.l;
      kids.forEach((k, i) => {
        const want = first + i * gap;
        while (idx < trail.length - 1 && dist < want) { dist += Math.abs(trail[idx].x - prev); prev = trail[idx].x; idx++; }
        const p = trail[idx] || { x: x - r.l - want * dir, face: dir };
        k.x = clamp(r.l + p.x, r.l + k.w / 2, r.r - k.w / 2); k.y = r.t; k.face = p.face;
        hops[i] = Math.max(0, hops[i] - dt);
        k.oy = -Math.sin(Math.PI * hops[i] / .4) * 14 * S * (hops[i] > 0);
        k.play(state === 'walk' ? 'walk' : 'idle');
      });
    },
    poke(e, who) {
      const i = kids.indexOf(who);
      if (i >= 0) { hops[i] = .4; who.say(pick(['!', 'note']), 600); return; }
      quack = 1.4; state = 'rest'; timer = 1.4; a.say('note', 900);
      kids.forEach((k, j) => setTimeout(() => { hops[j] = .4; k.say('note', 700); }, 150 + j * 140));
    },
    hear(type) { if (type === 'thud') { hops.fill(.4); a.say('!', 500); } }
  };
});

/* ---- behaviors/peek.js ---- */
/* peek: hides behind an element and peeks over its top edge. Ears first, then eyes,
 * then the whole face. Eyes follow the cursor from a safe distance. Get close and it
 * ducks, then pops up somewhere else along the edge. Poke it: "eep!" */
defineBehavior('peek', (a, [el], host) => {
  const S = a.s / 4;
  const H = a.h;
  let at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), .05, .95) : rnd(.15, .85);
  let state = 'hidden', timer = rnd(.6, 1.6), depth = H, goal = H, blinkAt = now() + rnd(2000, 5000), eep = 0;
  const STEPS = { hidden: H, ears: H - 3 * a.s, eyes: H - 7 * a.s, out: 0 };
  const shy = 95 * S + a.w / 2;
  const go = (s, t) => { state = s; timer = t; goal = STEPS[s] ?? goal; };
  a.node.style.clipPath = `inset(-400px -400px ${H}px -400px)`;

  const look = () => {
    const dx = ptr.x - a.x, dy = ptr.y - (a.y - H * .6);
    if (!ptr.seen) return 'c';
    const h = dx < -40 ? 'l' : dx > 40 ? 'r' : '';
    const v = dy < -40 ? 'u' : dy > 60 ? 'd' : '';
    const k = v === 'd' ? 'd' : (v + h) || 'c';
    return a.has(k) ? k : 'c';
  };

  return {
    tick(dt) {
      const r = rectOf(el);
      a.x = r.l + a.w / 2 + (r.w - a.w) * at;
      a.y = r.t;
      if (reduced()) { depth = STEPS.eyes; a.oy = depth; a.play('c'); a.node.style.clipPath = `inset(-400px -400px ${Math.round(depth)}px -400px)`; return; }

      const d = ptr.seen ? ptrDist(a.x, a.y) : 1e9;
      timer -= dt;
      if (d < shy && state !== 'hidden' && state !== 'duck') {
        if (state === 'out' && chance(.35)) a.say('eep', 600);
        eep = .2; go('duck', rnd(1.4, 2.6)); goal = H;
      }

      switch (state) {
        case 'hidden':
          if (timer <= 0 && d > shy * 1.4) go('ears', rnd(.5, 1.1));
          break;
        case 'ears':
          if (timer <= 0) go('eyes', rnd(.5, 1));
          break;
        case 'eyes':
          if (timer <= 0) go('out', rnd(4, 9));
          break;
        case 'out':
          if (timer <= 0) { go('duck', rnd(1, 3)); goal = H; }
          break;
        case 'duck':
          if (timer <= 0 && d > shy * 1.6) {
            /* reappear somewhere else along the edge */
            at = clamp(at + (chance(.5) ? 1 : -1) * rnd(.2, .5), .06, .94);
            go('hidden', rnd(.3, 1));
          }
          break;
      }

      /* ducking is fast, rising is cautious */
      const speed = goal > depth ? 14 : 3.2;
      depth = lerp(depth, goal, 1 - Math.exp(-speed * dt));
      if (Math.abs(depth - goal) < .5) depth = goal;
      /* rise in whole sprite-pixels so it stays crisp */
      const shown = Math.round(depth / a.s) * a.s;
      a.oy = shown;
      a.node.style.clipPath = `inset(-400px -400px ${shown}px -400px)`;

      if (eep > 0) { eep -= dt; a.play('eep'); }
      else if (state !== 'duck') {
        const t = now();
        if (t > blinkAt) { a.play('blink'); if (t > blinkAt + 140) blinkAt = t + rnd(2200, 5200); }
        else a.play(look());
      }
    },
    hear(type) {
      if (type !== 'thud' || state === 'hidden' || state === 'duck') return;
      eep = .3; if (chance(.5)) a.say('eep', 600);
      go('duck', rnd(1.5, 3)); goal = H;
    },
    poke() {
      if (state === 'hidden' || state === 'duck') return;
      eep = .35; a.say('eep', 800);
      go('duck', rnd(2.5, 4)); goal = H;
    }
  };
});

/* ---- behaviors/perch.js ---- */
/* perch: sits on top of a button or link. Looks around, pecks, sings.
 * Hover its perch and it takes off, circles, and lands on another perch once the
 * coast is clear. Give it several perches with on=".btn" and it hops between them. */
defineBehavior('perch', (a, targets, host) => {
  const S = a.s / 3;
  const MAX = 560 * S;
  let perch = targets[0], frac = rnd(.25, .75), state = 'sit', timer = rnd(2, 4);
  let vx = 0, vy = 0, goal = null, orbit = 0, cx = 0, cy = 0, calm = 0, placed = false;

  const seat = (el, f) => { const r = rectOf(el); return { x: r.l + r.w * f, y: r.t, r }; };
  const threatened = el => {
    if (!ptr.seen) return false;
    const r = rectOf(el), m = 26 * S;
    return ptr.x > r.l - m && ptr.x < r.r + m && ptr.y > r.t - a.h - m && ptr.y < r.b + m;
  };
  const visible = el => { const r = rectOf(el); return r.w > 0 && r.t > scrollY + a.h && r.b < scrollY + innerHeight; };
  const choose = () => {
    const free = targets.filter(el => !threatened(el));
    const seen = free.filter(visible);
    const pool = seen.length ? seen : free.length ? free : targets;
    const others = pool.filter(el => el !== perch);
    return pick(others.length && chance(.75) ? others : pool);
  };
  const takeoff = () => {
    state = 'fly'; calm = 0; orbit = rnd(0, 6.28);
    const r = rectOf(perch);
    cx = clamp(a.x + rnd(-120, 120) * S, 60, docW() - 60);
    cy = Math.max(scrollY + 60, r.t - rnd(110, 190) * S);
    vy = -320 * S; vx = (ptr.x > a.x ? -1 : 1) * 160 * S;
    a.play('fly');
  };

  return {
    tick(dt) {
      if (!placed) { const s = seat(perch, frac); a.x = s.x; a.y = s.y; a.face = chance(.5) ? 1 : -1; placed = true; }
      if (reduced()) { const s = seat(perch, frac); a.x = s.x; a.y = s.y; a.play('idle'); return; }

      if (state === 'sit') {
        const s = seat(perch, frac);
        a.x = s.x; a.y = s.y; a.rot = 0;
        a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
        if (threatened(perch) || ptrDist(a.x, a.y - a.h / 2) < 50 * S) { takeoff(); if (chance(.4)) a.say('!', 500); return; }
        timer -= dt;
        if (a.done || a.clip === 'idle') {
          if (timer <= 0) {
            const r = Math.random();
            if (r < .35) a.play('peck', { loop: false, reset: true });
            else if (r < .6) a.play('look', { loop: false, reset: true });
            else if (r < .75) { a.face = -a.face; }
            else if (r < .85) a.say('note', 1100);
            timer = rnd(1.5, 4);
          }
          if (a.done) a.play('idle', { reset: true });
        }
        return;
      }

      /* flying */
      const threat = threatened(perch);
      if (state === 'fly') {
        orbit += dt * 2.4;
        goal = { x: cx + Math.cos(orbit) * 70 * S, y: cy + Math.sin(orbit * 2) * 22 * S };
        calm = threat ? 0 : calm + dt;
        if (calm > 1.1) { perch = choose(); frac = rnd(.2, .8); state = 'land'; }
      }
      if (state === 'land') {
        const s = seat(perch, frac);
        goal = { x: s.x, y: s.y };
        if (threatened(perch)) { cx = a.x; cy = a.y - 60 * S; state = 'fly'; calm = 0; }
      }
      const dx = goal.x - a.x, dy = goal.y - a.y, dist = Math.hypot(dx, dy) || 1;
      const want = state === 'land' ? Math.min(MAX, dist * 5 + 40) : MAX * .7;
      vx = lerp(vx, dx / dist * want, 1 - Math.exp(-4.5 * dt));
      vy = lerp(vy, dy / dist * want, 1 - Math.exp(-4.5 * dt));
      a.x += vx * dt; a.y += vy * dt;
      if (Math.abs(vx) > 20) a.face = vx > 0 ? 1 : -1;
      a.rot = clamp(vy / MAX * 12, -12, 12) * a.face;
      a.play('fly', { fps: vy < -40 ? 16 : 11 });
      if (state === 'land' && dist < 4 * S) {
        const s = seat(perch, frac);
        a.x = s.x; a.y = s.y; vx = vy = 0; a.rot = 0;
        a.sy = .8; a.sx = 1.15;
        state = 'sit'; timer = rnd(1, 2.5); a.play('idle', { reset: true });
      }
    },
    hear(type, from, d) { if (type === 'thud' && state === 'sit' && d < 130 * S) { takeoff(); a.say('!', 500); } },
    poke() { if (state === 'sit') { takeoff(); a.say('!', 600); } }
  };
});

/* ---- behaviors/pop.js ---- */
/* pop: whack-a-mole. Pops up through an element's top edge at a random spot, looks
 * around, ducks. Click it while it's up to bonk it (stars, dizzy, back down).
 * Leaves a little dirt mound where it surfaced. */
defineBehavior('pop', (a, [el], host) => {
  const H = a.h;
  const hill = recruit(a, 'molehill');
  let frac = rnd(.15, .85), state = 'hidden', timer = rnd(.8, 2), depth = H, goal = H, bonks = 0;
  a.node.style.clipPath = `inset(-400px -400px ${H}px -400px)`;
  hill.node.classList.add('ghost');
  a.node.parentNode.insertBefore(hill.node, a.node);   /* the mound sits behind the mole */

  const go = (s, t, g) => { state = s; timer = t; goal = g; };
  return {
    crew: [hill],
    tick(dt) {
      const r = rectOf(el);
      a.x = r.l + a.w / 2 + (r.w - a.w) * frac; a.y = r.t;
      hill.x = a.x; hill.y = r.t + 2; hill.play('idle');
      if (reduced()) { depth = H * .45; }
      else {
        timer -= dt;
        switch (state) {
          case 'hidden': if (timer <= 0) { a.play('up'); go('up', rnd(1.2, 2.2), 0); } break;
          case 'up':
            if (timer <= 0) go('hidden', rnd(.6, 1.6), H);
            else a.play(Math.floor(timer * 2) % 3 === 0 ? 'l' : 'up');
            break;
          case 'bonked': if (timer <= 0) go('hidden', rnd(1.4, 2.4), H); break;
        }
        /* move to a fresh hole while underground */
        if (state === 'hidden' && depth >= H - .5 && timer > .3) frac = rnd(.08, .92);
        const k = goal > depth ? 18 : 10;
        depth = lerp(depth, goal, 1 - Math.exp(-k * dt));
      }
      const shown = Math.round(depth / a.s) * a.s;
      a.oy = shown;
      a.node.style.clipPath = `inset(-400px -400px ${shown}px -400px)`;
      /* the mound only shows while the mole is near the surface */
      hill.node.style.opacity = depth < H * .9 ? '1' : '0';
    },
    poke() {
      if (state !== 'up') return;
      bonks++;
      a.play('bonk'); a.say(bonks % 5 === 0 ? 'grr' : 'star', 700);
      go('bonked', .45, 0);
      host.dispatchEvent(new CustomEvent('piix:bonk', { bubbles: true, detail: { count: bonks } }));
    }
  };
});

/* ---- behaviors/progress.js ---- */
/* progress: a reading-progress bar with a runner on it. The bar fills as you scroll;
 * the runner keeps pace, idles when you stop, and celebrates at the end of the page.
 *   side="bottom|top"   where the bar sits (default bottom)   color="#c6f432"
 *   box="selector"   draw the bar along that element's edge instead of the screen's */
defineBehavior('progress', (a, targets, host) => {
  const S = a.s / 3;
  const side = host.getAttribute('side') === 'top' ? 'top' : 'bottom';
  const H = Math.max(3, Math.round(a.s * 1.4));
  const bar = document.createElement('div');
  bar.setAttribute('aria-hidden', 'true');
  bar.style.cssText = `position:fixed;left:0;${side}:0;height:${H}px;width:0;z-index:var(--piix-z,2147482000);pointer-events:none;` +
    `background:${host.getAttribute('color') || '#c6f432'};box-shadow:0 0 0 1px rgba(23,18,31,.25);transition:width .08s linear`;
  const boxEl = boxOf(host);
  if (boxEl) {
    if (getComputedStyle(boxEl).position === 'static') boxEl.style.position = 'relative';
    bar.style.position = 'absolute'; bar.style.zIndex = '1';
    if (side === 'bottom') bar.style.borderRadius = '0 0 0 12px';
    boxEl.appendChild(bar);
  } else {
    document.body.appendChild(bar);
    /* the runner rides the fixed bar, so pin it to the viewport too */
    a.node.style.position = 'fixed';
  }
  let x = 0, done = false, lastY = scrollY;

  return {
    awake: () => true,
    tick(dt) {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const p = clamp(scrollY / max, 0, 1);
      bar.style.width = (p * 100).toFixed(2) + '%';
      const bx = boxEl && rectOf(boxEl);
      const vw = bx ? boxEl.clientWidth : document.documentElement.clientWidth;
      const want = clamp(p * vw, a.w / 2, vw - a.w / 2);
      const moving = Math.abs(scrollY - lastY) > .5;
      if (moving) a.face = scrollY > lastY ? 1 : -1;
      lastY = scrollY;
      x = reduced() ? want : lerp(x, want, 1 - Math.exp(-10 * dt));
      if (bx) {
        /* along the box's edge, in doc coords */
        const bl = bx.l + boxEl.clientLeft, bt = bx.t + boxEl.clientTop;
        a.x = bl + x;
        a.y = side === 'top' ? bt + H + a.h : bt + boxEl.clientHeight - H;
      } else {
        /* viewport coords, offset by the layer origin so render() lands them right */
        a.x = x + origin.x;
        a.y = (side === 'top' ? H + a.h : innerHeight - H) + origin.y;
      }
      if (p > .995 && !done) { done = true; a.say('star', 1600); a.play('cheer'); }
      if (p < .97) done = false;
      if (done) a.play('cheer');
      else a.play(moving ? 'run' : 'idle', { fps: moving ? clamp(8 + Math.abs(scroll.v) / 120, 8, 22) : 2 });
    },
    poke() { a.say('up', 700); scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' }); },
    destroy() { bar.remove(); }
  };
});

/* ---- behaviors/school.js ---- */
/* school: a school of fish swimming inside an element like a tank. They flock (stay
 * close, line up, don't bump), turn at the glass, and flee from the cursor.
 *   count="7"   number of fish */
defineBehavior('school', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 7, 2, 40);
  const hues = [0, 25, 330, 190, 60, 290];
  const fish = [a, ...Array.from({ length: n - 1 }, (_, i) => recruit(a, 'fish', { hue: hues[(i + 1) % hues.length] }))];
  const b = fish.map(() => ({ x: null, y: 0, vx: rnd(-40, 40), vy: rnd(-20, 20) }));
  const MAX = 120 * S, MIN = 35 * S;

  return {
    crew: fish.slice(1),
    awake: () => onScreen(rectOf(el)),
    tick(dt) {
      const r = rectOf(el), pad = 14 * S;
      const box = { l: r.l + pad + a.w / 2, r: r.r - pad - a.w / 2, t: r.t + pad + a.h, b: r.b - pad };
      if (b[0].x == null) b.forEach(f => { f.x = rnd(box.l, box.r); f.y = rnd(box.t, box.b); });
      if (!reduced()) {
        let cx = 0, cy = 0, ax = 0, ay = 0;
        b.forEach(f => { cx += f.x; cy += f.y; ax += f.vx; ay += f.vy; });
        cx /= n; cy /= n; ax /= n; ay /= n;
        b.forEach((f, i) => {
          let fx = (cx - f.x) * .6 + (ax - f.vx) * .9, fy = (cy - f.y) * .6 + (ay - f.vy) * .9;
          b.forEach((o, j) => {
            if (i === j) return;
            const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy) || 1;
            if (d < 20 * S) { fx += dx / d * 1400 * S / d; fy += dy / d * 1400 * S / d; }
          });
          /* the glass */
          if (f.x < box.l + 20) fx += 300; if (f.x > box.r - 20) fx -= 300;
          if (f.y < box.t + 10) fy += 300; if (f.y > box.b - 10) fy -= 300;
          /* the cursor is a shark */
          if (ptr.seen) {
            const dx = f.x - ptr.x, dy = f.y - fish[i].h / 2 - ptr.y, d = Math.hypot(dx, dy) || 1;
            if (d < 90 * S) { fx += dx / d * 3200 * S / Math.max(d / 30, 1); fy += dy / d * 3200 * S / Math.max(d / 30, 1); }
          }
          f.vx += fx * dt; f.vy += fy * dt;
          const sp = Math.hypot(f.vx, f.vy) || 1, k = clamp(sp, MIN, MAX) / sp;
          f.vx *= k; f.vy *= k;
          f.x = clamp(f.x + f.vx * dt, box.l, box.r); f.y = clamp(f.y + f.vy * dt, box.t, box.b);
        });
      }
      fish.forEach((fi, i) => {
        const f = b[i];
        fi.x = f.x; fi.y = f.y;
        if (Math.abs(f.vx) > 4) fi.face = f.vx > 0 ? 1 : -1;
        fi.rot = clamp(f.vy / MAX * 25, -25, 25) * fi.face;
        fi.play('swim', { fps: 4 + Math.hypot(f.vx, f.vy) / MAX * 10 });
      });
    },
    poke(e, who) {
      const i = Math.max(0, fish.indexOf(who || a));
      b[i].vx *= 3; b[i].vy *= 3; (who || a).say('!', 400);
    }
  };
});

/* ---- behaviors/select.js ---- */
/* select: reacts to text selection. Select something inside its element (or anywhere,
 * with on="body") and it hops to the end of your selection; copy it and it shows a
 * clipboard. Clear the selection and it hops home. */
defineBehavior('select', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .9;
  const cache = {};
  let goal = null, hop = null, cheer = 0;
  const home = () => {
    const tp = textProfile(el, cache);
    if (tp) { const x = tp.l + (tp.r - tp.l) * at; return { x, y: segAt(tp.segs, x) ?? tp.t }; }
    const r = rectOf(el); return { x: r.l + r.w * at, y: r.t };
  };
  const go = (x, y) => { hop = { x0: a.x, y0: a.y, x1: x, y1: y, p: 0 }; };
  const onSel = () => {
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { if (goal) { goal = null; const h = home(); go(h.x, h.y); } return; }
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer) && el !== document.body) return;
    const rects = [...range.getClientRects()].filter(r => r.width > 0);
    const last = rects[rects.length - 1];
    if (!last) return;
    goal = { x: last.right + scrollX + a.w * .6, y: last.top + scrollY + 2 };
    go(goal.x, goal.y); a.play('hold'); a.say('!', 500);
  };
  const onCopy = () => { if (goal) { cheer = 1.4; a.say('copy', 1200); } };
  document.addEventListener('selectionchange', onSel);
  document.addEventListener('copy', onCopy);

  return {
    tick(dt) {
      if (hop) {
        hop.p = Math.min(1, hop.p + dt / .35);
        const p = hop.p, q = 1 - p, top = Math.min(hop.y0, hop.y1) - 40 * S;
        a.x = lerp(hop.x0, hop.x1, p); a.y = q * q * hop.y0 + 2 * q * p * top + p * p * hop.y1;
        if (p >= 1) hop = null;
        return;
      }
      if (goal) { a.x = goal.x; a.y = goal.y; }
      else { const h = home(); a.x = h.x; a.y = h.y; }
      cheer -= dt;
      a.play(cheer > 0 ? 'happy' : goal ? 'hold' : 'idle');
    },
    poke() { cheer = .8; a.say('heart', 700); },
    destroy() { document.removeEventListener('selectionchange', onSel); document.removeEventListener('copy', onCopy); }
  };
});

/* ---- behaviors/signal.js ---- */
/* signal: shows Wi-Fi bars that depend on how close the cursor is. Full bars and a
 * grin up close, no signal and a frown far away. */
defineBehavior('signal', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .85;
  let level = 0, shown = 0;
  return {
    tick(dt) {
      const r = rectOf(el);
      a.x = r.l + a.w / 2 + (r.w - a.w) * at; a.y = r.t;
      const d = ptr.seen && ptr.cx > -1e4 ? ptrDist(a.x, a.y - a.h / 2) : 1e9;
      const want = d < 90 * S ? 3 : d < 220 * S ? 2 : d < 420 * S ? 1 : 0;
      level = lerp(level, want, 1 - Math.exp(-3 * dt));
      const n = Math.round(level);
      if (n !== shown) { if (n === 0) a.say('...', 900); if (n === 3 && shown < 3) a.say('heart', 700); shown = n; }
      a.play('s' + n);
    },
    poke() { a.say(shown === 3 ? 'heart' : '?', 700); }
  };
});

/* ---- behaviors/slide.js ---- */
/* slide: waddle a little, flop onto the belly and slide along the element, get up
 * at the far end, turn round and do it again. Poke it and it slips and spins. */
defineBehavior('slide', (a, [el], host) => {
  const S = a.s / 3;
  let frac = rnd(.1, .4), dir = 1, state = 'walk', v = 0, timer = rnd(1, 2.4), spin = 0;
  const cache = {};
  const surf = () => {
    const tp = host.getAttribute('edge') !== 'box' && textProfile(el, cache);
    return tp ? { l: tp.l, r: tp.r, t: tp.t } : (r => ({ l: r.l, r: r.r, t: r.t }))(rectOf(el));
  };
  return {
    tick(dt) {
      const r = surf(), span = Math.max(1, r.r - r.l - a.w);
      a.y = r.t;
      if (!reduced()) {
        timer -= dt;
        if (state === 'walk') {
          a.play('walk'); frac += dir * 16 * S * dt / span;
          if (timer <= 0) { state = 'slide'; v = rnd(170, 240) * S; a.sy = .7; a.sx = 1.3; }
        } else if (state === 'slide') {
          a.play('slide'); frac += dir * v * dt / span; v *= Math.exp(-.9 * dt);
          if (v < 20 * S) { state = 'rest'; timer = .7; a.play('idle'); }
        } else if (state === 'rest' && timer <= 0) { state = 'walk'; timer = rnd(1, 2.4); }
        if (frac >= 1 || frac <= 0) { frac = clamp(frac, 0, 1); dir = -dir; if (state === 'slide') { state = 'rest'; timer = .9; a.play('idle'); a.say(pick(['!', 'note']), 600); } }
        if (spin > 0) { spin -= dt; a.rot = (1 - spin / .7) * 360 * dir; if (spin <= 0) a.rot = 0; }
      }
      a.face = dir;
      a.x = r.l + a.w / 2 + span * frac;
      a.sx = lerp(a.sx, 1, .15); a.sy = lerp(a.sy, 1, .15);
    },
    poke() { spin = .7; a.say('!?', 600); state = 'slide'; v = 120 * S; },
    hear(type) { if (type === 'thud') { state = 'slide'; v = 150 * S; } }
  };
});

/* ---- behaviors/snap.js ---- */
/* snap: a frog that thinks the cursor is a fly. When it buzzes close, the tongue shoots
 * out at it; hold still at the tip and you're caught. Click to make it hop along. */
defineBehavior('snap', (a, [el], host) => {
  const S = a.s / 4;
  let frac = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .5;
  let state = 'sit', t = 0, cool = 1, tx = 0, ty = 0, hop = null, happy = 0;
  const tongue = document.createElement('div');
  tongue.style.cssText = `position:absolute;left:0;top:0;height:${Math.max(3, Math.round(a.s * 1.2))}px;border-radius:999px;background:#ff7aa8;box-shadow:0 0 0 ${Math.max(1, a.s >> 2)}px #17121f;transform-origin:0 50%;pointer-events:none;opacity:0`;
  a.node.parentNode.insertBefore(tongue, a.node);
  const RANGE = 150 * S;

  return {
    tick(dt) {
      const r = rectOf(el);
      if (hop) {
        hop.p = Math.min(1, hop.p + dt / .45);
        const p = hop.p, q = 1 - p, x = lerp(hop.x0, hop.x1, p);
        frac = (x - r.l - a.w / 2) / Math.max(1, r.w - a.w);
        a.oy = -(4 * p * q) * 46 * S; a.play('jump');
        if (p >= 1) { hop = null; a.oy = 0; a.sy = .8; a.sx = 1.2; }
      }
      a.x = r.l + a.w / 2 + (r.w - a.w) * clamp(frac, 0, 1); a.y = r.t;
      a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
      if (reduced() || hop) { tongue.style.opacity = '0'; if (!hop) a.play('sit'); return; }
      const mx = a.x + a.face * a.w * .1, my = a.y - a.h * .45;
      cool -= dt; happy -= dt;
      const d = ptr.seen ? Math.hypot(ptr.x - mx, ptr.y - my) : 1e9;
      if (state === 'sit') {
        if (Math.abs(ptr.x - a.x) > 6) a.face = ptr.x > a.x ? 1 : -1;
        a.play(happy > 0 ? 'happy' : 'sit');
        if (d < RANGE && cool <= 0) { state = 'aim'; t = .22; }
      } else if (state === 'aim') {
        t -= dt;
        if (t <= 0) { state = 'out'; t = 0; tx = ptr.x; ty = ptr.y; a.play('snap'); }
      }
      if (state === 'out' || state === 'back') {
        t += dt / .14 * (state === 'out' ? 1 : -1);
        const k = clamp(t, 0, 1), len = Math.hypot(tx - mx, ty - my) * k, ang = Math.atan2(ty - my, tx - mx);
        tongue.style.opacity = '1';
        tongue.style.width = Math.round(len) + 'px';
        tongue.style.transform = `translate3d(${Math.round(mx - origin.x)}px,${Math.round(my - origin.y)}px,0) rotate(${ang}rad)`;
        if (state === 'out' && k >= 1) {
          state = 'back';
          if (Math.hypot(ptr.x - tx, ptr.y - ty) < 14 * S) { happy = 1.6; a.say('heart', 900); }
        }
        if (state === 'back' && k <= 0) { state = 'sit'; cool = 1.1; tongue.style.opacity = '0'; }
      }
    },
    poke() {
      if (hop) return;
      const r = rectOf(el), x0 = a.x;
      const x1 = clamp(x0 + (chance(.5) ? 1 : -1) * rnd(60, 140) * S, r.l + a.w / 2, r.r - a.w / 2);
      a.face = x1 > x0 ? 1 : -1;
      hop = { x0, x1, p: 0 };
    },
    destroy() { tongue.remove(); }
  };
});

/* ---- behaviors/sweep.js ---- */
/* sweep: a robot vacuum. Glides along the top of an element and back, bumps at the
 * ends, stops and beeps when the cursor blocks the way, spins when poked. */
defineBehavior('sweep', (a, [el], host) => {
  const S = a.s / 4;
  const speed = 46 * S * (+host.getAttribute('speed') || 1);
  let frac = rnd(.2, .8), dir = chance(.5) ? 1 : -1, state = 'go', timer = 0, spin = 0;
  a.cv.style.transformOrigin = '50% 70%';
  return {
    tick(dt) {
      const r = rectOf(el);
      const L = r.l + a.w / 2, R = r.r - a.w / 2, span = Math.max(1, R - L);
      a.x = L + span * frac; a.y = r.t; a.face = dir;
      if (reduced()) return;
      timer -= dt;
      if (spin > 0) { spin -= dt; a.rot = (1 - spin / .8) * 720; if (spin <= 0) a.rot = 0; return; }
      const ahead = ptr.seen && Math.abs(ptr.y - (a.y - a.h / 2)) < 40 * S && (ptr.x - a.x) * dir > 0 && (ptr.x - a.x) * dir < 60 * S;
      if (state === 'go') {
        a.play('go');
        if (ahead) { state = 'beep'; timer = .9; a.play('beep'); a.say('!', 600); }
        frac += dir * speed * dt / span;
        if (frac <= 0 || frac >= 1) { frac = clamp(frac, 0, 1); dir = -dir; a.sx = .8; a.sy = 1.15; a.say(chance(.3) ? '!' : null, 400); }
      } else if (state === 'beep' && timer <= 0) {
        if (ahead) dir = -dir;
        state = 'go';
      }
      a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
    },
    poke() { spin = .8; a.say('?', 800); },
    hear(type) { if (type === 'thud') { spin = .8; } }
  };
});

/* ---- behaviors/toss.js ---- */
/* toss: a toy you can throw around the page. It lands on real elements (headings,
 * paragraphs, buttons, cards…), rolls, falls off edges onto whatever is below, and can
 * be batted with a fast swipe of the cursor. Click it for a little kick.
 *
 *   land="css selector"   what counts as a surface (defaults to common content elements)
 *
 * Sprite options (spec.toss): { bounce, friction, spin, heavy, faces, squeak } */
defineBehavior('toss', (a, [el], host) => {
  const P = a.spec.toss || {};
  const S = a.s / 4;
  const G = 2600 * S;
  const bounce = P.bounce ?? .45, friction = P.friction ?? 3, spin = P.spin ?? 0;
  const sel = host.getAttribute('land') || LAND;
  let state = 'rest', vx = 0, vy = 0, on = null, offset = 0, placed = false, settle = 0;
  if (spin) a.cv.style.transformOrigin = '50% 50%';

  /* box="selector" keeps it inside one element: its walls, ceiling and floor */
  const boxEl = boxOf(host);
  const B = () => boxEl ? rectOf(boxEl) : null;
  const floorY = () => { const b = B(); return b ? b.b - 3 : document.documentElement.scrollHeight - 1; };
  const minX = () => { const b = B(); return (b ? b.l : 0) + a.w / 2; };
  const maxX = () => { const b = B(); return (b ? b.r : docW()) - a.w / 2; };
  const inBox = p => { const b = B(); return !b || (p.t > b.t && p.t < b.b && p.r > b.l && p.l < b.r); };
  const fly = (nvx, nvy) => { state = 'air'; vx = nvx; vy = nvy; on = null; if (a.has('roll')) a.play('roll'); };
  const land = (p, impact) => {
    a.y = p ? p.t : floorY();
    if (impact > 420 * Math.sqrt(S) && bounce > 0) {
      vy = -impact * bounce; vx *= .85;
      a.sy = 1 - clamp(impact / 4000, .08, .3); a.sx = 2 - a.sy;
    } else {
      state = 'rest'; vy = 0; on = p; offset = p ? a.x - p.l : 0;
      a.sy = .85; a.sx = 1.15;
      if (P.faces) { a.play('f' + (1 + ((Math.random() * 6) | 0))); a.rot = 0; }
      else if (a.has('idle')) a.play('idle');
    }
    if (impact > 300 * Math.sqrt(S)) {
      if (p && typeof p.el.piixImpact === 'function') p.el.piixImpact(a.x, a.y, clamp(impact / 1400, .3, 1.6));
      if (impact > 700 * Math.sqrt(S)) shout(a, 'thud', (P.heavy ? 260 : 150) * S);
      if (P.squeak && chance(.7)) a.say(pick(['!', 'note', '!?']), 600);
    }
  };

  return {
    tick(dt) {
      if (!placed) {
        const r = surfaceOf(el) || { el, ...rectOf(el) }, at = host.getAttribute('at');
        a.x = r.l + (r.r - r.l) * (at != null ? clamp(+at, 0, 1) : rnd(.2, .8)); a.y = r.t;
        on = r; offset = a.x - r.l; placed = true;
        if (P.faces) a.play('f' + (1 + ((Math.random() * 6) | 0)));
      }
      if (state === 'held') return;
      a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
      if (reduced()) return;

      /* a fast swipe of the cursor bats it */
      const speed = Math.hypot(ptr.vx, ptr.vy);
      if (ptr.seen && speed > 900 && now() - ptr.last < 50 && a.near(10 * S)) {
        fly(clamp(ptr.vx * .55, -1800, 1800), Math.min(clamp(ptr.vy * .5, -1600, 600), -320 * S));
        if (P.squeak) a.say('!', 400);
      }

      if (state === 'rest') {
        /* ride along with the surface it sits on; roll to a stop */
        if (on) {
          const p = surfaceOf(on.el);
          if (!p) { fly(vx, 0); return; }
          offset += vx * dt;
          on = p; a.x = on.l + offset; a.y = on.t;
          if (a.x < on.l - a.w * .25 || a.x > on.r + a.w * .25) { fly(vx, 0); return; }
        } else { a.x += vx * dt; a.y = floorY(); }
        vx *= Math.exp(-friction * dt);
        if (Math.abs(vx) < 4) vx = 0;
        if (spin) a.rot += vx * dt / (a.w / 2) * 57.3 * spin;
        else a.rot = lerp(a.rot, 0, .2);
        a.x = clamp(a.x, minX(), maxX());
        return;
      }

      /* in the air */
      const y0 = a.y;
      vy = Math.min(vy + G * dt, 3200);
      a.x += vx * dt; a.y += vy * dt;
      if (a.x < minX()) { a.x = minX(); vx = Math.abs(vx) * .6; }
      if (a.x > maxX()) { a.x = maxX(); vx = -Math.abs(vx) * .6; }
      const bx = B();
      if (bx && a.y - a.h < bx.t) { a.y = bx.t + a.h; vy = Math.abs(vy) * .5; }
      a.rot += (spin ? vx * dt / (a.w / 2) * 57.3 * spin : vx * dt * .6);
      if (vy > 0) {
        let best = null;
        for (const p of platforms(sel, el)) {
          if (a.x < p.l + 2 || a.x > p.r - 2 || !inBox(p)) continue;
          if (p.t >= y0 - 1 && p.t <= a.y && (!best || p.t < best.t)) best = p;
        }
        if (best) land(best, vy);
        else if (a.y >= floorY()) land(null, vy);
      }
      settle += dt;
    },
    grab(e) {
      drag(a, e, {
        move: (x, y) => {
          state = 'held'; a.x = x; a.y = y + a.h * .4;
          const b = B(); if (b) { a.x = clamp(a.x, minX(), maxX()); a.y = clamp(a.y, b.t + a.h, floorY()); }
          vx = vy = 0; if (a.has('held')) a.play('held'); },
        end: ({ moved, vx: tx, vy: ty }) => {
          if (!moved) { fly(rnd(-160, 160) * S, -rnd(520, 700) * Math.sqrt(S)); if (P.squeak) a.say('note', 500); return; }
          fly(tx, ty);
        }
      });
    },
    poke() { fly(rnd(-160, 160) * S, -600 * Math.sqrt(S)); },
    hear(type, from, d) { if (type === 'thud' && state === 'rest' && !P.heavy) fly((a.x - from.x) * 2, -260 * S); }
  };
});

/* ---- behaviors/type.js ---- */
/* type: types lines into a little terminal bubble above the pal, character by
 * character, pausing between lines.  lines="first|second|third"   speed="1" */
defineBehavior('type', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .5;
  const lines = (host.getAttribute('lines') || 'npm i piixpal|added 1 package, 0 vulnerabilities|✓ pals deployed').split('|');
  const cps = 22 * (+host.getAttribute('speed') || 1);
  const term = document.createElement('div');
  term.style.cssText = `position:absolute;left:0;top:0;transform-origin:50% 100%;pointer-events:none;white-space:pre;max-width:320px;overflow:hidden;
    font:600 ${Math.max(11, Math.round(a.s * 4))}px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#c6f432;background:#17121f;
    padding:${a.s * 2}px ${a.s * 3}px;border-radius:${a.s * 2}px;box-shadow:0 0 0 ${Math.max(2, a.s - 1)}px #17121f,0 ${a.s}px 0 ${Math.max(2, a.s - 1)}px rgba(23,18,31,.35)`;
  a.node.parentNode.appendChild(term);
  let li = 0, ci = 0, pause = .6, blinkT = 0;

  return {
    tick(dt) {
      const r = rectOf(el);
      a.x = r.l + a.w / 2 + (r.w - a.w) * at; a.y = r.t;
      const line = lines[li % lines.length];
      if (reduced()) ci = line.length;
      else if (pause > 0) pause -= dt;
      else if (ci < line.length) { ci = Math.min(line.length, ci + cps * dt * rnd(.4, 1.6)); if (ci >= line.length) pause = 1.6; }
      else { li++; ci = 0; pause = .35; }
      blinkT += dt;
      const caret = Math.floor(blinkT * 2) % 2 ? '█' : ' ';
      term.textContent = '$ ' + line.slice(0, Math.floor(ci)) + caret;
      a.play(ci > 0 && ci < line.length ? 'typing' : 'idle');
      const w = term.offsetWidth, h = term.offsetHeight;
      term.style.transform = `translate3d(${Math.round(clamp(a.x - w / 2, 4, docW() - w - 4) - origin.x)}px,${Math.round(a.y - a.h - h - 10 * S - origin.y)}px,0)`;
    },
    poke() { li++; ci = 0; pause = 0; a.say('!', 400); },
    destroy() { term.remove(); }
  };
});

/* ---- behaviors/wire.js ---- */
/* wire: a row of birds sitting along an element's top edge like a telephone wire.
 * Run the cursor along the row and they hop up one after another, like a wave.
 * Click one and the whole row takes off, loops round, and lands back one by one.
 *   count="6"   number of birds */
defineBehavior('wire', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 6, 2, 20);
  const birds = [a, ...Array.from({ length: n - 1 }, () => recruit(a, 'sparrows'))];
  const st = birds.map((_, i) => ({ hop: 0, delay: -1, fly: 0, ang: 0, face: i % 2 ? -1 : 1, next: rnd(1, 5) }));

  const startHop = (i, delay) => { if (st[i].hop <= 0 && st[i].delay < 0) st[i].delay = delay; };
  return {
    crew: birds.slice(1),
    tick(dt) {
      const r = rectOf(el);
      birds.forEach((b, i) => {
        const s = st[i];
        const home = r.l + r.w * ((i + .5) / n);
        if (!reduced()) {
          /* the cursor brushing past sets off a ripple */
          if (ptr.seen && s.hop <= 0 && s.fly <= 0 && Math.abs(ptr.x - home) < 18 * S && ptr.y < r.t + 10 && ptr.y > r.t - 60 * S) {
            for (let j = 0; j < n; j++) startHop(j, Math.abs(j - i) * .07);
          }
          if (s.delay >= 0) { s.delay -= dt; if (s.delay < 0) s.hop = .55; }
          s.hop = Math.max(0, s.hop - dt);
          s.next -= dt;
          if (s.next <= 0 && s.hop <= 0 && s.fly <= 0) { s.next = rnd(1.5, 5); if (chance(.4)) s.face = -s.face; else b.play('peck', { loop: false, reset: true }); }
        }
        if (s.fly > 0) {
          /* a loop round the sky and back to the same spot on the wire */
          s.fly = Math.max(0, s.fly - dt);
          const p = 1 - s.fly / 2.2, ang = p * Math.PI * 2;
          b.x = home + Math.sin(ang) * 60 * S; b.y = r.t; b.oy = -Math.sin(p * Math.PI) * 110 * S;
          b.face = Math.cos(ang) >= 0 ? 1 : -1;
          b.play('fly');
          return;
        }
        b.x = home; b.y = r.t; b.face = s.face;
        b.oy = -Math.sin(Math.PI * s.hop / .55) * 20 * S;
        if (s.hop > 0) b.play('fly');
        else if (b.clip !== 'peck' || b.done) b.play('sit');
      });
    },
    poke() {
      st.forEach((s, i) => setTimeout(() => { s.fly = 2.2; }, i * 90));
      a.say('!', 500);
    },
    hear(type) { if (type === 'thud') st.forEach((s, i) => { s.delay = i * .05; }); }
  };
});

/* ---- pals/balloon.js ---- */
/* BALLOON: a balloon with a face, tied to your element.
 * Job: floats above it on a string, drifting in the breeze of your cursor and the
 * scroll. Click it and it pops. Give it a moment and it inflates again. */
(() => {
  const body = [
    '...kkkk...',
    '.kkbbbbkk.',
    'kbBBbbbbbk',
    'kbBbbbbbbk',
    'kbbwkbwkbk',
    'kbbbbbbbbk',
    'kbbpbbpbbk',
    '.kbbkkbbk.',
    '.kbbbbbbk.',
    '..kbbbbk..',
    '...kbbk...',
    '....kk....',
    '...kbbk...'
  ];
  const pop = [
    '..........',
    '.b..k..b..',
    '..b.k.b...',
    '...b.b....',
    'bbb...bbb.',
    '...b.b....',
    '..b.k.b...',
    '.b..k..b..',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........'
  ];
  defineSprite('balloon', {
    w: 10, h: 13, scale: 4, does: 'float',
    palette: { k: '#17121f', b: '#ff5b7f', B: '#ffc2d1', w: '#ffffff', p: '#ff97b0' },
    frames: { idle: [body], blink: [art.compose(body, [3, 4, ['kk']], [6, 4, ['kk']])], pop: [pop] }
  });
})();

/* ---- pals/beep.js ---- */
/* BEEP: a small robot with a big secret, guarding your "I'm not a robot" checkbox.
 * Job: sweats nervously when your cursor nears the checkbox. Tick it and Beep panics
 * and runs off; it creeps back a few seconds later, embarrassed. */
(() => {
  const body = [
    '....kk....',
    '....rk....',
    '..kkkkkk..',
    '.kmmmmmmk.',
    '.kmwkmwkm'.padEnd(10, 'k').slice(0, 10),
    '.kmmmmmmk.',
    '.kmmkkmmk.',
    '..kkkkkk..',
    '.kmmmmmmk.',
    '.kmmmmmmk.'
  ];
  const legs = { a: ['..k....k..'], b: ['...k..k...'], stand: ['..k....k..'] };
  const r = (rows, l, light) => art.put(rows, 4, 1, [light ? 'g' : 'r']).concat(legs[l]);
  const nervous = art.compose(body, [3, 4, ['wwkww'.slice(0, 5)]], [3, 6, ['kmmk'.replace('mm', 'kk')]]);
  defineSprite('beep', {
    w: 10, h: 11, scale: 3, does: 'captcha',
    palette: { k: '#17121f', m: '#c9d3ea', w: '#ffffff', r: '#ff4d6d', g: '#c6f432' },
    frames: {
      idle: [r(body, 'stand'), r(body, 'stand', true)],
      nervous: [r(nervous, 'stand'), r(art.shift(nervous, 1).map(x => x.slice(0, 10)), 'stand')],
      run: [r(nervous, 'a'), r(nervous, 'b')],
      shy: [r(art.put(body, 3, 4, ['kmmkm'.replace(/m/g, 'm')]), 'stand')]
    },
    fps: { idle: 1.5, nervous: 10, run: 12 }
  });
})();

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

/* ---- pals/boing.js ---- */
/* BOING — a coral jelly drop with more energy than sense.
 * Job: bounces on top of an element (footers love it). Grab it, throw it, watch it wobble.
 * Throw it too hard and it gets dizzy. */
(() => {
  const body = [
    '.....kkkk.....',
    '...kkcccckk...',
    '..kcHHccccck..',
    '.kcHHccccccck.',
    '.kcHcccccccck.',
    'kcccccccccccck',
    'kcccccccccccck',
    'kcpcccccccccpk',
    'kdccccccccccdk',
    'kddccccccccddk',
    '.kddddddddddk.',
    '..kkkkkkkkkk..'
  ];
  /* eyes: two 2x2 patches at (4,5) and (8,5) */
  const EYE = {
    open: ['wk', 'kk'],
    blink: ['cc', 'kk'],
    happy: ['kk', 'cc'],
    dizzy: ['kc', 'ck'],
    up: ['kk', 'wk']
  };
  /* mouth: 4x2 patch at (5,7) */
  const MOUTH = {
    flat: ['_kk_', '____'],
    smile: ['k__k', '_kk_'],
    open: ['_kk_', '_kk_'],
    wobble: ['_k_k', 'k_k_']
  };
  const jelly = (eye, mouth) => art.compose(body, [4, 5, EYE[eye]], [8, 5, EYE[eye]], [5, 7, MOUTH[mouth]]);

  defineSprite('boing', {
    w: 14, h: 12, scale: 4,
    does: 'bounce',
    palette: {
      k: '#1b1226', c: '#ff6b4a', H: '#ffd4c4', d: '#cf3f22', p: '#ffb3a0', w: '#ffffff'
    },
    frames: {
      idle: [jelly('open', 'smile'), jelly('open', 'smile'), jelly('open', 'smile'), jelly('blink', 'smile')],
      air: [jelly('open', 'open')],
      rise: [jelly('up', 'smile')],
      land: [jelly('happy', 'flat')],
      held: [jelly('open', 'wobble'), jelly('blink', 'wobble')],
      dizzy: [jelly('dizzy', 'wobble'), jelly('dizzy', 'flat')],
      happy: [jelly('happy', 'smile')]
    },
    fps: { idle: 3, held: 8, dizzy: 6 }
  });
})();

/* ---- pals/bumble.js ---- */
/* BUMBLE: a fuzzy little bee who naps on your element.
 * Job: wakes up when your cursor comes by, follows you around the page, and flies
 * home for another nap when you stop moving. Poke it for a loop-the-loop. */
(() => {
  const up = [
    '.kk........kk.',
    'kwwk......kwwk',
    'kwwwk....kwwwk',
    '.kwwkkkkkkwwk.'
  ];
  const down = [
    '..............',
    '..............',
    '.kkk......kkk.',
    'kwwwkkkkkkwwwk'
  ];
  const body = (eyes) => [
    '...kyyyyyyk...',
    '..kyY' + 'yyyyyyk..'.slice(0, 9),
    ...eyes,
    '..kkkkkkkkkk..',
    '..kyyyyyyyyk..',
    '..kkkkkkkkkk..',
    '...kyyyyyyk...',
    '....kkkkkk....',
    '......kk......'
  ];
  const EYES = {
    open: ['..kywwyywwyk..', '..kywkyywkyk..'],
    shut: ['..kyyyyyyyyk..', '..kykkyykkyk..'],
    happy: ['..kykkyykkyk..', '..kkyykkyyk...'.slice(0, 14).padEnd(14, '.')]
  };
  /* wings on top of a body (the body's first row overlaps the wing base) */
  const bee = (wings, eyes = 'open') => wings.concat(body(EYES[eyes]));

  defineSprite('bumble', {
    w: 14, h: 15, scale: 3,
    does: 'follow',
    palette: { k: '#17121f', y: '#ffd23f', Y: '#fff2a8', w: '#e4f6ff' },
    frames: {
      fly: [bee(up), bee(down)],
      happy: [bee(up, 'happy'), bee(down, 'happy')],
      sleep: [bee(down, 'shut')],
      perch: [bee(down), bee(down), bee(down), bee(down, 'shut')]
    },
    fps: { fly: 20, happy: 22, sleep: 1, perch: 3 }
  });
})();

/* ---- pals/capy.js ---- */
/* CAPY: a capybara with a yuzu on its head. Famously, completely unbothered.
 * Job: minds its own business on your text. Blinks slowly. Dozes. Poke it and it turns
 * round, very calmly, to face the other way. */
(() => {
  const capy = (eyes = 'chill', back = false) => {
    let rows = art.outline(art.paint(20, 12, (x, y) => {
      if (art.ellipse(x, y, 15, 1.4, 1.5, 1.3)) return 'y';                                   /* the yuzu */
      if (x === 16 && y === 0) return 'l';
      if (art.ellipse(x, y, 8, 8, 7.4, 3.6)) return y >= 10 ? 'd' : 'b';                     /* body */
      if (art.rrect(x, y, 11, 3, 18, 9, 2)) return x >= 17 ? 'd' : 'b';                      /* head + snout */
      if (art.ellipse(x, y, 12, 3, 1, 1)) return 'd';                                         /* ear */
      if (y === 11 && (x === 4 || x === 6 || x === 11 || x === 13)) return 'd';               /* feet */
      return null;
    }));
    if (back) return art.flipH(rows);
    if (eyes === 'chill') rows = art.put(rows, 14, 5, ['kk']);
    if (eyes === 'open') rows = art.compose(rows, [14, 4, ['wk']], [14, 5, ['kk']]);
    if (eyes === 'shut') rows = art.put(rows, 14, 6, ['kk']);
    if (eyes === 'cross') rows = art.compose(rows, [13, 4, ['kk']], [14, 5, ['kk']]);
    return art.put(rows, 17, 7, ['k']);
  };
  defineSprite('capy', {
    w: 20, h: 12, scale: 3, does: 'mind',
    palette: { k: '#17121f', b: '#b07a4a', d: '#8a5a32', y: '#ffc23f', l: '#4fc46a', w: '#ffffff' },
    frames: {
      read: [capy(), capy(), capy(), capy(), capy('shut'), capy()],
      flip: [capy('shut'), capy()],
      look: [capy('open')],
      doze: [capy('shut')],
      annoyed: [capy('cross')],
      back: [capy('chill', true)]
    },
    fps: { read: 1, flip: 4, doze: 1 }
  });
})();

/* ---- pals/echo.js ---- */
/* ECHO: your cursor's little shadow.
 * Job: follows the exact path your cursor took, half a second behind, and clicks
 * wherever you clicked. Stop moving and it catches up and does a little dance. */
(() => {
  const arrow = [
    'k........',
    'kk.......',
    'kwk......',
    'kwwk.....',
    'kwwwk....',
    'kwkwkk...',
    'kwwwwwk..',
    'kwkwkwwk.',
    'kwwwwwwwk',
    'kwwwkkkkk',
    'kwkwwk...',
    'kk.kwwk..',
    'k...kwwk.',
    '.....kk..'
  ].map(r => r.padEnd(9, '.'));
  /* the arrow's face: two eye pixels and a mouth, swapped for expressions */
  const press = art.put(arrow, 0, 5, ['kwkwkk']).map((r, i) => i === 7 ? 'kwwwwwwk.' : r);
  const happy = art.compose(arrow, [1, 5, ['wkwk']], [1, 7, ['wkkw']]);
  defineSprite('echo', {
    w: 9, h: 14, scale: 3, does: 'mimic',
    palette: { k: '#17121f', w: '#c6f432' },
    frames: { idle: [arrow], click: [press], dance: [happy, art.shift(happy, 1)] },
    fps: { dance: 5 }
  });
})();

/* ---- pals/frog.js ---- */
/* FROG: a frog who is convinced your cursor is a fly.
 * Job: sits on your element; when the cursor buzzes close, its tongue snaps out at it.
 * Keep still at the end of the tongue and it catches you. Click it and it hops. */
(() => {
  const sit = [
    '..kk....kk..',
    '.kwwk..kwwk.',
    '.kwkkkkkwkk.'.slice(0, 12),
    'kgggggggggggk'.slice(0, 12),
    'kgGgggggggGk',
    'kgggkkkkgggk',
    'kgggggggggk.'.padEnd(12, '.'),
    '.kgg.kk.ggk.',
    'kkgk....kgkk'
  ];
  const blink = art.compose(sit, [2, 1, ['kk']], [8, 1, ['kk']]);
  const open = art.put(sit, 4, 5, ['kppk']);
  const jump = art.put(sit, 0, 8, ['.kk......kk.']);
  defineSprite('frog', {
    w: 12, h: 9, scale: 4, does: 'snap',
    palette: { k: '#17121f', g: '#7bd63a', G: '#c8f58a', w: '#ffffff', p: '#ff7aa8' },
    frames: { sit: [sit, sit, sit, blink], snap: [open], jump: [jump], happy: [art.compose(blink, [4, 5, ['kggk']])] },
    fps: { sit: 1.4 }
  });
})();

/* ---- pals/gecko.js ---- */
/* GECKO: a tiny lizard with sticky feet.
 * Job: walks the whole border of a card: along the top, down the side, upside-down
 * underneath and back up. Freezes when watched. Poke it and it sprints the other way. */
(() => {
  const A = [
    '....k.....k...',
    '....kk....kk..',
    '..kkggGgggggk.',
    'kkgggggggggggk',
    '..kkggGggggwk.',
    '...kk....kk...',
    '...k.....k....'
  ];
  const B = [
    '...k.....k....',
    '...kk....kk...',
    '..kkggGgggggk.',
    'kkgggggggggggk',
    '..kkggGggggwk.',
    '....kk....kk..',
    '....k.....k...'
  ];
  const fix = rows => art.put(rows, 11, 2, ['wk']);
  const wag = art.put(fix(A), 0, 2, ['k.', '.k', 'k.']);
  defineSprite('gecko', {
    w: 14, h: 7, scale: 3, does: 'climb',
    palette: { k: '#17121f', g: '#7bd63a', G: '#d2ff8a', w: '#ffffff' },
    frames: { walk: [fix(A), fix(B)], idle: [fix(A)], wag: [fix(A), wag] },
    fps: { walk: 10, wag: 8 }
  });
})();

/* ---- pals/group-sprites.js ---- */
/* Cast for the group pals. Each group is one <piix-pal> that runs a whole crew. */
(() => {
  const K = '#17121f';

  /* DUCKS: a mother duck and her ducklings (do="parade") */
  const mama = [
    '.....kkk....',
    '....kwwwk...',
    '....kwkwkoo.',
    '....kwwwkoo.',
    '.k..kwwwk...',
    'kwk.kwwwwk..',
    'kwwkwwwwwwk.',
    'kwwwwWWwwwwk',
    '.kwwwwwwwwk.',
    '..kkkkkkkk..'
  ];
  defineSprite('ducks', {
    w: 12, h: 11, scale: 3, does: 'parade',
    palette: { k: K, w: '#ffffff', W: '#d9dce8', o: '#ff9a2f' },
    frames: {
      walk: [mama.concat(['...o..o.....']), mama.concat(['....o.o.....'])],
      idle: [mama.concat(['...o...o....'])],
      quack: [art.put(mama, 9, 2, ['ooo']).concat(['...o...o....'])]
    },
    fps: { walk: 6 }
  });
  const ling = ['..kkk..', '.kyyyk.', '.kykyoo', 'k.kyyk.', 'kykyyyk', 'kyyyyyk', '.kkkkk.'];
  defineSprite('duckling', {
    w: 7, h: 8, scale: 3, does: 'parade',
    palette: { k: K, y: '#ffd23f', o: '#ff9a2f' },
    frames: { walk: [ling.concat(['..o.o..']), ling.concat(['...oo..'])], idle: [ling.concat(['..o..o.'])] },
    fps: { walk: 9 }
  });

  /* ANTS: a marching line, some carrying crumbs (do="march") */
  const ant = legs => ['.kk.kk..', 'kkkkkkkk', legs];
  defineSprite('ants', {
    w: 8, h: 3, scale: 3, does: 'march',
    palette: { k: K, c: '#ffd9a0' },
    frames: {
      walk: [ant('k.k.k.k.'), ant('.k.k.k.k')],
      carry: [['..cc....', '.kkckk..', 'kkkkkkkk', 'k.k.k.k.'], ['..cc....', '.kkckk..', 'kkkkkkkk', '.k.k.k.k']]
    },
    fps: { walk: 12, carry: 12 }
  });

  /* FISH: a little school (do="school") */
  const fish = tail => [`.${tail[0]}.kkk..`, `k${tail[1]}kfffk.`, `kfFffwkk`, `k${tail[1]}kfffk.`, `.${tail[0]}.kkk..`];
  defineSprite('fish', {
    w: 8, h: 5, scale: 3, does: 'school',
    palette: { k: K, f: '#ff8a3d', F: '#ffd0a8', w: '#ffffff' },
    frames: { swim: [fish(['k', 'f']), fish(['.', 'k'])] },
    fps: { swim: 6 }
  });

  /* SPARROWS: birds on a wire (do="wire") */
  const bird = ['..kkk...', '.kbbwk..', '.kbbbkoo', 'kbBBbbk.', 'kbBBBbk.', '.kbbbk..', '..k.k...'];
  const flap = ['k.....k.', 'kb...bk.', '.kbkbkoo', '..kbbk..', '..kbbk..', '...kk...', '........'];
  defineSprite('sparrows', {
    w: 8, h: 7, scale: 3, does: 'wire',
    palette: { k: K, b: '#9a6b44', B: '#e8c9a4', w: '#ffffff', o: '#ffb020' },
    frames: { sit: [bird], peck: [art.put(bird, 5, 2, ['k', 'koo']), bird], fly: [flap, art.put(bird, 0, 6, ['........'])] },
    fps: { peck: 6, fly: 14 }
  });

  /* CHOIR: four singers who keep perfect time (do="choir") */
  const singer = (mouth, eyes = 'wk') => [
    '..kkkkk..',
    '.kbbbbbk.',
    'kbbbbbbbk',
    `kb${eyes}b${eyes}bk`.slice(0, 9).padEnd(9, 'k'),
    'kbbbbbbbk',
    mouth,
    'kbbbbbbbk',
    'kbbbbbbbk',
    '.kbbbbbk.',
    '..kkkkk..'
  ];
  defineSprite('choir', {
    w: 9, h: 10, scale: 3, does: 'choir',
    palette: { k: K, b: '#6b4cff', w: '#ffffff', m: '#ff7aa8' },
    frames: {
      hush: [singer('kbbbkbbbk')],
      sing: [singer('kbbkmkbbk'), singer('kbbkkkbbk')],
      look: [singer('kbbbkbbbk', 'kw')]
    },
    fps: { sing: 4 }
  });

  /* FIREFLIES: soft blinking lights (do="glow") */
  defineSprite('fireflies', {
    w: 5, h: 4, scale: 3, does: 'glow',
    palette: { k: K, y: '#fff36b', Y: '#ffd23f', w: '#e8f6ff' },
    frames: { on: [['w...w', '.kYk.', '.yyy.', '..y..']], off: [['w...w', '.kYk.', '.kkk.', '.....']] }
  });

  /* SHEEP: jump the fence, one by one, forever (do="count") */
  const sheep = legs => ['.kkkkk....', 'kwwWwwk...', 'kwWwwwwfff', 'kwwwwwwfwf', 'kwwwwwwfff', '.kkkkkk...', legs];
  defineSprite('sheep', {
    w: 10, h: 7, scale: 3, does: 'count',
    palette: { k: K, w: '#ffffff', W: '#e8e4f0', f: '#3b2a4f' },
    frames: { walk: [sheep('.f.f..f.f.'), sheep('..f.ff.f..')], jump: [sheep('.ff...ff..')] },
    fps: { walk: 8 }
  });
  defineSprite('fence', {
    w: 12, h: 9, scale: 3, does: 'count',
    palette: { k: K, b: '#c98a4e', d: '#8a5a2e' },
    frames: { idle: [['.k..k..k..k.', 'kbkkbkkbkkbk', 'kbkkbkkbkkbk', 'kbbbbbbbbbbk', 'kddddddddddk', 'kbkkbkkbkkbk', 'kbbbbbbbbbbk', 'kddddddddddk', 'kbkkbkkbkkbk']] }
  });

  /* BEES: a busy little line of worker bees (do="beeline") */
  defineSprite('bees', {
    w: 7, h: 6, scale: 3, does: 'beeline',
    palette: { k: K, y: '#ffd23f', w: '#e4f6ff' },
    frames: { fly: [['.ww.ww.', '.wwkww.', 'kyykyyk', 'kkkkykw', 'kyykyyk', '.kkkkk.'], ['.......', '.kwkwk.', 'kyykyyk', 'kkkkykw', 'kyykyyk', '.kkkkk.']] },
    fps: { fly: 18 }
  });
})();

/* ---- pals/hiss.js ---- */
/* HISS: a long green snake who slithers along your text and tastes the air.
 * Job: crawls the glyph outline like Bitbug, but in waves. Flicks its tongue. */
(() => {
  const snake = (phase, tongue = false, eye = 'open') => {
    const rows = art.outline(art.paint(18, 8, (x, y) => {
      if (art.ellipse(x, y, 14.5, 3.5, 2.6, 2.1)) return 'g';                       /* head */
      if (x >= 1 && x <= 12) {
        const c = 4 + Math.round(Math.sin((x + phase) * .85) * 1.2);               /* the wave */
        if (y === c || y === c - 1) return (x + phase) % 4 < 2 ? 'g' : 'G';
      }
      return null;
    }));
    let out = art.compose(rows, [15, 2, [eye === 'open' ? 'w' : 'k']]);
    out = art.put(out, 16, 2, [eye === 'open' ? 'k' : 'g']);
    if (tongue) out = art.put(out, 17, 4, ['r']);
    return out;
  };
  defineSprite('hiss', {
    w: 18, h: 8, scale: 3, does: 'crawl',
    palette: { k: '#17121f', g: '#4fc46a', G: '#2f9a4a', w: '#ffffff', r: '#ff4d6d' },
    frames: {
      walk: [snake(0), snake(1), snake(2), snake(3)],
      idle: [snake(0), snake(0), snake(0, false, 'shut')],
      look: [snake(1), snake(1, true)],
      sniff: [snake(0, true), snake(0), snake(0, true)],
      alarm: [snake(2, true), snake(3, true)],
      hop: [snake(2)],
      flip: [art.trim(art.flipV(snake(0, true, 'shut'))), art.trim(art.flipV(snake(2, true, 'shut')))]
    },
    fps: { walk: 8, idle: 1.5, sniff: 6, alarm: 12, flip: 10 }
  });
})();

/* ---- pals/kitty.js ---- */
/* KITTY: a black cat lounging on your element like it pays the rent.
 * Job: lies there swishing its tail. Bring the cursor close and it swats at it.
 * Leave it alone and it falls asleep. Poke it and it purrs. */
(() => {
  const rest = [
    '..k.k.............',
    '.kkkkk............',
    'kbwbbwk...........',
    'kbbpbbkkkkkkkkk...',
    'kbbbbbbbbbbbbbbk..',
    '.kbbbbbbbbbbbbbbkkk',
    '.kbbbbbbbbbbbbbbbkk',
    '.kkbbkkkkkkkkbbkk..',
    '..kkk.......kkk....'
  ].map(r => r.slice(0, 18).padEnd(18, '.'));
  const tailUp = art.compose(rest, [15, 3, ['..k', '.kk', 'k..']], [16, 5, ['..']], [16, 6, ['..']]);
  const swat = art.compose(rest, [0, 5, ['kk']], [0, 6, ['kbk']], [0, 7, ['.kk']]).map((r, i) => i >= 5 && i <= 7 ? r : r);
  const sleep = art.compose(rest, [1, 2, ['bkbbkb']]);
  const purr = art.compose(rest, [1, 2, ['bkbbkb'.replace(/k/g, 'k')]], [2, 3, ['p']]);
  defineSprite('kitty', {
    w: 18, h: 9, scale: 3, does: 'lounge',
    palette: { k: '#17121f', b: '#2b2436', w: '#c6f432', p: '#ff9cc2' },
    frames: { rest: [rest, rest, tailUp, rest], swat: [swat, rest], sleep: [sleep], purr: [purr] },
    fps: { rest: 3, swat: 7 }
  });
})();

/* ---- pals/lurk.js ---- */
/* LURK — big eyes, little hands, zero courage.
 * Job: hides behind an element and peeks over its edge. Eyes follow you from a distance;
 * come close and it ducks. Pops up somewhere else along the edge a moment later. */
(() => {
  const head = [
    '...kk......kk...',
    '..kpuk....kupk..',
    '..kuuukkkkuuuk..',
    '.kuuuuuuuuuuuuk.',
    '.kuuwwwuuwwwuuk.',
    '.kuuwwwuuwwwuuk.',
    '.kuuwwwuuwwwuuk.',
    '.kuuuuuuuuuuuuk.',
    'khhhkuuuuuukhhhk',
    'kkkkkkkkkkkkkkkk'
  ];
  /* pupil position inside each 3x3 eye (eyes start at col 4 and col 9, row 4) */
  const pupil = (dx, dy) => art.compose(head, [4 + dx, 4 + dy, ['k']], [9 + dx, 4 + dy, ['k']]);
  const shut = art.compose(head, [4, 4, ['uuu', 'kkk', 'uuu']], [9, 4, ['uuu', 'kkk', 'uuu']]);
  const wide = art.compose(head, [4, 4, ['www', 'wkw', 'www']], [9, 4, ['www', 'wkw', 'www']], [2, 3, ['k']], [13, 3, ['k']]);

  defineSprite('lurk', {
    w: 16, h: 10, scale: 4,
    does: 'peek',
    palette: { k: '#1b1226', u: '#58c8ff', h: '#2f97d6', w: '#ffffff', p: '#ff9cc2' },
    frames: {
      c: [pupil(1, 1)],
      l: [pupil(0, 1)],
      r: [pupil(2, 1)],
      u: [pupil(1, 0)],
      ul: [pupil(0, 0)],
      ur: [pupil(2, 0)],
      d: [pupil(1, 2)],
      blink: [shut],
      eep: [wide]
    }
  });
})();

/* ---- pals/mole.js ---- */
/* MOLE: pops up out of an element's top edge, has a look around, ducks back down.
 * Job: whack-a-mole. Click it while it's up to bonk it. It will be back. */
(() => {
  const up = [
    '...kkkkkk...',
    '..kbbbbbbk..',
    '.kbBbbbbbbk.',
    '.kbwkbbwkbk.',
    '.kbbbppbbbk.',
    'kkbbkppkbbkk',
    'kcckbbbbkcck',
    'kcckbbbbkcck',
    '.kkkbbbbkkk.',
    '...kbbbbk...'
  ];
  const look = (dx) => art.compose(up, [3 + dx, 3, ['wk'].map(s => dx > 0 ? 'kw' : s)], [7 + dx, 3, [dx > 0 ? 'kw' : 'wk']]);
  const bonk = art.compose(up, [3, 3, ['kk']], [7, 3, ['kk']], [3, 2, ['k']], [8, 2, ['k']]);
  defineSprite('mole', {
    w: 12, h: 10, scale: 4, does: 'pop',
    palette: { k: '#17121f', b: '#8a5a3c', B: '#b98563', w: '#ffffff', p: '#ff9cc2', c: '#f2d6b8' },
    frames: { up: [up], l: [look(0)], r: [up], bonk: [bonk] }
  });
  defineSprite('molehill', {
    w: 16, h: 4, scale: 4, does: 'pop',
    palette: { k: '#17121f', d: '#6b4a2f', D: '#9a6b44' },
    frames: { idle: [['....kkkkkkkk....', '..kkdDddDdddkk..', '.kddddDddddDddk.', 'kddDddddddddDddk']] }
  });
})();

/* ---- pals/moss.js ---- */
/* MOSS — a mushroom with a book. Has no interest in you whatsoever.
 * Job: sits on an element and reads. Dozes off sometimes. Glances up if you hover too long.
 * Poke it and it turns its back on you. Keep poking and it moves somewhere quieter. */
(() => {
  const cap = [
    '....kkkkkkkk....',
    '..kkvvvvvvvvkk..',
    '.kvvVVvvvvwwvvk.',
    'kvvVVvvvvvwwvvvk',
    'kvwwvvvvvvvvvvvk',
    'kvwwvvvvvwwvvvvk',
    'kkkkkkkkkkkkkkkk'
  ];
  const face = {
    read: ['..kbbbbbbbbbbk..', '..kbkkbbbbkkbk..'],
    look: ['..kbbbbbbbbbbk..', '..kbwkbbbbwkbk..'],
    cross: ['..kbkbbbbbbkbk..', '..kbbkbbbbkbbk..'],
    doze: ['..kbbbbbbbbbbk..', '..kbbbbbbbbbbk..'],
    back: ['..kbbbbbbbbbbk..', '..kbbbbbbbbbbk..']
  };
  const book = [
    '.kkkkkkkkkkkkkk.',
    'bkRRRRRRRRRRRRkb',
    'bkRyyyyyRRRRRRkb',
    '.kRRRRRRRRRRRRk.',
    '.kkkkkkkkkkkkkk.'
  ];
  const bookLow = [
    '..kbbbbbbbbbbk..',
    '.kkkkkkkkkkkkkk.',
    'bkRRRRRRRRRRRRkb',
    'bkRyyyyyRRRRRRkb',
    '.kkkkkkkkkkkkkk.'
  ];
  const back = [
    '..kbbbbbbbbbbk..',
    '..kbbbbbbbbbbk..',
    '.bkbbbbbbbbbbkb.',
    '..kbbbbbbbbbbk..',
    '..kbbbbbbbbbbk..'
  ];
  const legs = ['...kbbbbbbbbk...', '..kkkk....kkkk..'];
  const moss = (f, b = book) => cap.concat(face[f], b, legs);
  /* page flip: a corner of paper pops up over the book */
  const flip = (n) => art.put(moss('read'), 7, 8, n ? ['_ww'] : ['ww_']);

  defineSprite('moss', {
    w: 16, h: 16, scale: 3,
    does: 'mind',
    palette: {
      k: '#1b1226', v: '#8a6bff', V: '#cbbcff', w: '#fffdf5', b: '#ffe6c4',
      R: '#25b89a', y: '#ffd23f'
    },
    frames: {
      read: [moss('read'), moss('read'), moss('read'), moss('read'), moss('read'), moss('read')],
      flip: [flip(0), flip(1), moss('read')],
      look: [moss('look', bookLow)],
      doze: [moss('doze', bookLow)],
      annoyed: [moss('cross', bookLow)],
      back: [cap.concat(face.back, back, legs)]
    },
    fps: { read: 1, flip: 7, doze: 1 }
  });
})();

/* ---- pals/para.js ---- */
/* PARA: a tiny parachutist who drops in when your section scrolls into view.
 * Job: floats down from the top of the screen, swaying, lands on your element, folds
 * the chute and waves. Click to send them back up for another jump. */
(() => {
  const chute = [
    '....kkkkkkkk....',
    '..kkrrwwrrwwkk..',
    '.krrrwwrrwwrrrk.',
    'krrrwwrrwwrrrwwk',
    'kkkkkkkkkkkkkkkk',
    '.k....k..k....k.',
    '..k...k..k...k..',
    '...k..k..k..k...',
    '....k.k..k.k....',
    '.....kkkkkk.....'
  ];
  const guy = [
    '......kkkk......',
    '.....kssssk.....',
    '.....kswswk.....',
    '.....kssssk.....',
    '....kbbbbbbk....',
    '...kbkbbbbkbk...',
    '.....kbbbbk.....',
    '.....kk..kk.....'
  ];
  const wave = art.compose(guy, [3, 3, ['.kk']], [2, 4, ['kbk.']], [3, 5, ['...']]);
  const folded = ['................', '................', '................', '................', '................', '................', '................', '................', '................', '..kkkkkkkkkk....'].map((r, i) => i === 9 ? '.krrwwrrwwrk....' : r);
  defineSprite('para', {
    w: 16, h: 18, scale: 3, does: 'drop',
    palette: { k: '#17121f', r: '#ff5b4a', w: '#fffdf5', s: '#ffd9b5', b: '#6b4cff' },
    frames: {
      fall: [chute.concat(guy)],
      landed: [folded.concat(guy)],
      wave: [folded.concat(wave), folded.concat(guy)]
    },
    fps: { wave: 3 }
  });
})();

/* ---- pals/peeper.js ---- */
/* PEEPER: a fluffball who guards your form fields.
 * Job: sits on an input and watches you type, eyes following the caret. Covers its eyes
 * for password fields. Cheers when a field is valid, sweats when it isn't. */
(() => {
  const base = [
    '...kkkkkk...',
    '..kffffffk..',
    '.kffffffffk.',
    'kffwwffwwffk',
    'kffwwffwwffk',
    'kffffffffffk',
    'kfppffffppfk',
    'kfffffkffffk',
    '.kffffffffk.',
    '..kkkkkkkk..',
    '..k......k..'
  ];
  const look = (dx, dy) => art.compose(base, [3 + dx, 3 + dy, ['k']], [7 + dx, 3 + dy, ['k']]);
  const cover = art.compose(base, [1, 3, ['khhkhhkhhkk'.slice(0, 10)]], [1, 4, ['khhhhkhhhh']], [0, 5, ['kk', 'kh']], [10, 5, ['kk', 'hk']]);
  const happy = art.compose(base, [3, 3, ['kk', 'ff']], [7, 3, ['kk', 'ff']], [5, 7, ['kffk']]);
  const worried = art.compose(look(0, 1), [3, 2, ['k']], [8, 2, ['k']], [5, 7, ['_kk_']]);
  defineSprite('peeper', {
    w: 12, h: 11, scale: 3, does: 'guard',
    palette: { k: '#17121f', f: '#f3f0fa', h: '#ffd9b5', w: '#ffffff', p: '#ffb3c7' },
    frames: { l: [look(0, 1)], r: [look(1, 1)], idle: [look(0, 0), look(1, 0), look(1, 0), look(0, 0)], cover: [cover], happy: [happy], worried: [worried] },
    fps: { idle: 1 }
  });
})();

/* ---- pals/penguin.js ---- */
/* PENGUIN: a penguin who has discovered that your element is slippery.
 * Job: waddles along, flops onto its belly and slides, gets up at the far end and
 * waddles back to do it again. Poke it and it slips over. */
(() => {
  const stand = [
    '...kkkk.....',
    '..kbbbbk....',
    '.kbwkbwk....'.replace('wk', 'wk'),
    '.kbbooobk...'.slice(0, 12),
    '.kbwwwwbk...',
    'kbbwwwwbbk..',
    'kbbwwwwbbk..',
    'kbbwwwwbbk..',
    '.kbwwwwbk...',
    '..kkkkkk....',
    '..oo..oo....'
  ];
  const step = art.put(stand, 0, 10, ['...oo..oo...']);
  const slide = [
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '.....kkkkk..',
    'kkkkkbbbbbk.',
    'kwwwwwwbwbkk',
    'kwwwwwwwbbko',
    '.kkkkkkkkkk.'
  ];
  defineSprite('penguin', {
    w: 12, h: 11, scale: 3, does: 'slide',
    palette: { k: '#17121f', b: '#2b3a55', w: '#ffffff', o: '#ff9a2f' },
    frames: { walk: [stand, step], idle: [stand], slide: [slide] },
    fps: { walk: 6 }
  });
})();

/* ---- pals/pinch.js ---- */
/* PINCH: a little crab who only knows how to walk sideways, which suits text just fine.
 * Job: scuttles along your headings, snapping its claws. Flips over when poked. */
(() => {
  const crab = (legs, claws = 'open', eyes = 'open') => {
    const rows = art.outline(art.paint(16, 10, (x, y) => {
      if (art.ellipse(x, y, 8, 6, 5.6, 2.9)) return y < 5 ? 'R' : 'r';
      if (art.ellipse(x, y, 2, 3.2, 1.7, 1.7) || art.ellipse(x, y, 14, 3.2, 1.7, 1.7)) return 'r';  /* claws */
      if ((x === 2 || x === 13) && y >= 4 && y <= 5) return 'r';
      if ((x === 6 || x === 9) && y >= 1 && y <= 3) return y === 1 ? 'w' : 'r';                      /* eye stalks */
      if (y === 9 && legs.includes(x)) return 'r';
      return null;
    }));
    let out = art.compose(rows, [6, 1, [eyes === 'open' ? 'k' : 'r']], [9, 1, [eyes === 'open' ? 'k' : 'r']]);
    if (claws === 'open') out = art.compose(out, [1, 2, ['.']], [14, 2, ['.']]);
    return art.put(out, 7, 6, ['kk']);
  };
  const A = [4, 6, 9, 11], B = [3, 7, 8, 12];
  defineSprite('pinch', {
    w: 16, h: 10, scale: 3, does: 'crawl',
    palette: { k: '#17121f', r: '#ff5b3a', R: '#ff9a7a', w: '#ffffff' },
    frames: {
      walk: [crab(A), crab(B)],
      idle: [crab(A), crab(A, 'shut'), crab(A), crab(A, 'open', 'shut')],
      look: [crab(A, 'shut'), crab(A)],
      sniff: [crab(A, 'shut'), crab(A), crab(A, 'shut')],
      alarm: [crab(B), crab(A)],
      hop: [crab([5, 10])],
      flip: [art.trim(art.flipV(crab(A))), art.trim(art.flipV(crab(B)))]
    },
    fps: { walk: 10, idle: 2, look: 3, sniff: 6, alarm: 14, flip: 10 }
  });
})();

/* ---- pals/pip.js ---- */
/* PIP — a round little bird who loves a good button.
 * Job: perches on top of buttons and links. Hover the button and it flies off,
 * loops around, and lands on another perch when the coast is clear. */
(() => {
  const body = [
    '......kkkk....',
    '.....kyyyyk...',
    '....kyyyyyyk..',
    '....kyyyywkk..',
    '...kyyyyyykkoo',
    '..kyyyyyyyyoo.',
    'kkyyWWWyyyyk..',
    'kyyWWWWWyyyk..',
    '.kyyWWWyyyyk..',
    '..kyyyyyyyk...',
    '...kkkkkkk....',
    '....o..o......'
  ];
  const blink = art.put(body, 8, 3, ['yyk']);
  const peck = art.compose(art.shift(body, 0), [11, 4, ['k..']], [11, 5, ['koo']], [11, 6, ['_oo']]);
  const lookUp = art.compose(body, [8, 3, ['wk']], [9, 2, ['k']]);
  /* flying: legs tucked, wing up or down */
  const tucked = art.put(body, 0, 11, ['..............']);
  const wingUp = art.compose(tucked, [3, 6, ['yyy']], [3, 7, ['yyyyy']], [4, 8, ['yyy']], [2, 2, ['.kk..', 'kWWk.', 'kWWWk', '.kWWk']]);
  const wingDown = art.compose(tucked, [3, 6, ['yyy']], [3, 7, ['yyyyy']], [4, 8, ['yyy']], [3, 9, ['kWWWk']], [4, 10, ['kWk', '.k.']]);

  defineSprite('pip', {
    w: 14, h: 13, scale: 3,
    does: 'perch',
    palette: { k: '#1b1226', y: '#ffd23f', W: '#e89b12', w: '#ffffff', o: '#ff7a2f' },
    frames: {
      idle: [body, body, body, blink, body, body],
      look: [lookUp, lookUp, body],
      peck: [peck, body, peck, body],
      fly: [wingUp, wingDown]
    },
    fps: { idle: 3, look: 2, peck: 8, fly: 12 }
  });
})();

/* ---- pals/rocket.js ---- */
/* ROCKET: a small rocket that lives on your "Deploy" button.
 * Job: sits there looking keen. Click it and it counts down, launches off the top of
 * the screen in a trail of smoke, then comes back down and lands. Ship it. */
(() => {
  const body = [
    '....k....',
    '...krk...',
    '..krrrk..',
    '..kwwwk..',
    '.kwbbbwk.',
    '.kwbwbwk.',
    '.kwbbbwk.',
    '.kwwwwwk.',
    '.kwwwwwk.',
    'krkwwwkrk',
    'krkwwwkrk',
    'kkkkkkkkk',
    '...kkk...'
  ];
  const flame = [
    ['..oyyyo..', '...oyo...', '....o....'],
    ['..yoyoy..', '...yoy...', '...o.o...']
  ];
  const pad = ['.........', '.........', '.........'];
  defineSprite('rocket', {
    w: 9, h: 16, scale: 3, does: 'launch',
    palette: { k: '#17121f', r: '#ff4d6d', w: '#f3f0fa', b: '#58c8ff', y: '#ffd23f', o: '#ff7a2f' },
    frames: { idle: [body.concat(pad)], burn: flame.map(f => body.concat(f)) },
    fps: { burn: 14 }
  });
})();

/* ---- pals/roomba.js ---- */
/* ROOMBA: a small robot vacuum that takes its job very seriously.
 * Job: sweeps back and forth along an element, bumps the ends, stops and beeps if your
 * cursor is in the way. Poke it and it spins in confusion. */
(() => {
  const base = [
    '...kkkkkkkk...',
    '.kkmmmmmmmmkk.',
    'kmmMMmmmmmmlmk',
    'kddddddddddddk',
    '.kkkkkkkkkkkk.',
    '..k........k..'
  ];
  defineSprite('roomba', {
    w: 14, h: 6, scale: 4, does: 'sweep',
    palette: { k: '#17121f', m: '#5c5470', M: '#8f86a6', d: '#2d2838', l: '#c6f432', r: '#ff4d6d' },
    frames: {
      go: [base, art.put(base, 11, 2, ['k'])],
      beep: [art.put(base, 11, 2, ['r']), base]
    },
    fps: { go: 3, beep: 8 }
  });
})();

/* ---- pals/router.js ---- */
/* ROUTER: a little Wi-Fi router whose signal is your cursor.
 * Job: the closer your cursor, the more bars it shows. Wander off and it loses
 * signal and gets sad. Hover right on top and it beams. */
(() => {
  const base = [
    '.k......k.',
    '.k......k.',
    '.k......k.',
    'kkkkkkkkkk',
    'kbbbbbbbbk',
    'kbwkbbwkbk',
    'kbbbbbbbbk',
    'kblbbbbbbk'.replace('l', 'l'),
    'kkkkkkkkkk',
    '.k......k.'
  ];
  /* signal bars float above: up to three arcs */
  const bars = n => [
    n >= 3 ? '..gggggg..' : '..........',
    n >= 3 ? '.g......g.' : '..........',
    n >= 2 ? '...gggg...' : '..........',
    n >= 2 ? '..g....g..' : '..........',
    n >= 1 ? '....gg....' : '....xx....'
  ];
  const sad = art.compose(base, [2, 5, ['bbbbbb']], [2, 6, ['kbbbbk'.replace('bbbb', 'kbbk').slice(0, 6)]]);
  const glad = art.compose(base, [2, 5, ['kkbbkk']], [3, 6, ['bkkb']]);
  const f = (n, face) => bars(n).concat(face);
  defineSprite('router', {
    w: 10, h: 15, scale: 3, does: 'signal',
    palette: { k: '#17121f', b: '#6b4cff', w: '#ffffff', l: '#c6f432', g: '#25b89a', x: '#ff4d6d' },
    frames: { s0: [f(0, sad), f(0, art.put(sad, 2, 7, ['l']))], s1: [f(1, base)], s2: [f(2, base)], s3: [f(3, glad)] },
    fps: { s0: 2 }
  });
})();

/* ---- pals/scrolly.js ---- */
/* SCROLLY: a tiny runner on a reading-progress bar.
 * Job: runs along a bar at the bottom of the screen as you scroll, keeping pace with
 * how far down the page you are. Reaches the end and celebrates. */
(() => {
  const head = [
    '...kkkk...',
    '..kssssk..',
    '.krrrrrrk.',
    '.kswswssk.',
    '.kssssssk.',
    '..kkkkkk..',
    '..kbbbbk..',
    '.kbbbbbbk.'
  ];
  const legs = {
    a: ['.kbbbbbbk.', '..kk..kk..', '.k.....k..'],
    b: ['..kbbbbk..', '...k.k....', '...k..k...'],
    c: ['.kbbbbbbk.', '..kk..kk..', '..k....k..'],
    stand: ['..kbbbbk..', '..k....k..', '..k....k..'],
    cheer: ['k.kbbbbk.k', '..k....k..', '.kk....kk.']
  };
  const f = (l, armsUp) => (armsUp ? art.compose(head, [0, 6, ['k']], [9, 6, ['k']]) : head).concat(legs[l]);
  defineSprite('scrolly', {
    w: 10, h: 11, scale: 3, does: 'progress',
    palette: { k: '#17121f', s: '#ffd9b5', r: '#ff4d6d', w: '#ffffff', b: '#58c8ff' },
    frames: { run: [f('a'), f('b'), f('c'), f('b')], idle: [f('stand'), f('stand'), f('stand', true), f('stand')], cheer: [f('cheer', true), f('stand')] },
    fps: { run: 12, idle: 2, cheer: 6 }
  });
})();

/* ---- pals/shel.js ---- */
/* SHEL: a very slow snail with a very nice shell.
 * Job: creeps along your text leaving a shimmering slime trail.
 * Too close and it hides in its shell until you go away. */
(() => {
  const walkA = [
    '...kkkkkk.......',
    '..kSSssssk...k.k',
    '.kSskkkkssk..b.b',
    '.kskSsssksk..b.b',
    '.kskskksksk.kbbk',
    '.kskssskssk.kbbk',
    '.kskkkkkssk.kbpk',
    'kbkkkkkkkkkkkbbk',
    'kbbbbbbbbbbbbbbk',
    '.kkkkkkkkkkkkkk.'
  ];
  const walkB = art.compose(walkA, [0, 8, ['kbbbbbbbbbbbbbk.']], [0, 9, ['.kkkkkkkkkkkkk..']]);
  const sway = art.put(walkA, 12, 1, ['.k.k', '.b.b']);
  const shell = [
    '...kkkkkk...',
    '..kSSssssk..',
    '.kSskkkkssk.',
    '.kskSsssksk.',
    '.kskskksksk.',
    '.kskssskssk.',
    '.kskkkkkssk.',
    '.kssssssssk.',
    '..kkkkkkkk..'
  ].map(r => r.padEnd(16, '.'));
  const peek = art.compose(shell, [11, 3, ['..k.']], [11, 4, ['.kbk']], [11, 5, ['kbbk']], [11, 6, ['kbbk']], [10, 7, ['kkkkk']]);

  defineSprite('shel', {
    w: 16, h: 10, scale: 3,
    does: 'creep',
    palette: { k: '#17121f', S: '#ffe2bd', s: '#ef9a4b', b: '#9fe3c9', p: '#ff9cc2' },
    frames: {
      walk: [walkA, walkA, walkB, walkB],
      idle: [walkA, walkA, sway, walkA],
      hide: [shell],
      peek: [peek]
    },
    fps: { walk: 3, idle: 2 }
  });
})();

/* ---- pals/shibe.js ---- */
/* SHIBE: a very good shiba, lying on your element. Such lounge. Very nap.
 * Job: wags its tail, swats at the cursor when it gets close, naps, and gets happy
 * when you poke it. */
(() => {
  const dog = (tail = 0, eyes = 'open', paw = false, tongue = false) => {
    const rows = art.outline(art.paint(20, 11, (x, y) => {
      if ((x >= 2 && x <= 3 && y >= 1 && y <= 3 && x - 2 <= y - 1) || (x >= 7 && x <= 8 && y >= 1 && y <= 3 && 8 - x <= y - 1)) return 'o';  /* ears */
      if (art.ellipse(x, y, 5, 6, 3.9, 3.4)) return y >= 7 || (x <= 3 && y >= 6) ? 'c' : 'o';                                  /* head */
      if (art.rrect(x, y, 7, 6, 17, 9, 2)) return y === 9 ? 'c' : 'o';                                                           /* body */
      if (art.ellipse(x, y, 17.5, 4.5 + tail, 1.6, 1.6)) return art.ellipse(x, y, 17.5, 4.5 + tail, .8, .8) ? 'c' : 'o';         /* curly tail */
      if (paw && x <= 1 && y >= 8 && y <= 9) return 'c';
      return null;
    }));
    let out = rows;
    if (eyes === 'open') out = art.compose(out, [3, 5, ['k']], [6, 5, ['k']]);
    else if (eyes === 'shut') out = art.compose(out, [2, 5, ['kk']], [6, 5, ['kk']]);
    else out = art.compose(out, [2, 5, ['k']], [3, 4, ['k']], [4, 5, ['k']], [5, 5, ['k']], [6, 4, ['k']], [7, 5, ['k']]);   /* happy ^ ^ */
    out = art.put(out, 4, 7, ['kk']);
    if (tongue) out = art.put(out, 4, 8, ['pp']);
    return out;
  };
  defineSprite('shibe', {
    w: 20, h: 11, scale: 3, does: 'lounge',
    palette: { k: '#17121f', o: '#e8913f', c: '#fff1de', p: '#ff7aa8' },
    frames: {
      rest: [dog(0), dog(-1), dog(0), dog(1)],
      swat: [dog(0, 'open', true), dog(0)],
      sleep: [dog(0, 'shut')],
      purr: [dog(-1, 'happy', false, true), dog(1, 'happy', false, true)]
    },
    fps: { rest: 6, swat: 7, purr: 8 }
  });
})();

/* ---- pals/snip.js ---- */
/* SNIP: a highlighter pen with opinions.
 * Job: when you select text, it hops over to the end of your selection and holds its
 * nib up proudly. Copy the text and it shows you a clipboard. */
(() => {
  const base = [
    '.kkkkk.',
    'kcCccck',
    'kkkkkkk',
    'kyYyyyk',
    'kyYyyyk',
    'kykykyk',
    'kyyyyyk',
    'kyykyyk',
    'kyyyyyk',
    'kyyyyyk',
    'kkkkkkk',
    '.ksssk.',
    '..kyk..',
    '...k...'
  ];
  const blink = art.put(base, 0, 5, ['kyyyyyk']);
  const happy = art.compose(base, [0, 4, ['kkYyyyk'.replace('kkY', 'kyk').replace('yyyk', 'ykyk')]], [0, 5, ['kyyyyyk']], [0, 7, ['kykkkyk']]);
  const wow = art.compose(base, [0, 7, ['kykkkyk']], [0, 8, ['kykkkyk']]);
  defineSprite('snip', {
    w: 7, h: 14, scale: 3, does: 'select',
    palette: { k: '#17121f', y: '#fff36b', Y: '#fffbd0', c: '#ff7aa8', C: '#ffc2d6', s: '#b7b0c4' },
    frames: { idle: [base, base, base, blink], happy: [happy], hold: [wow, base] },
    fps: { idle: 1.5, hold: 4 }
  });
})();

/* ---- pals/termi.js ---- */
/* TERMI: a tiny terminal who types for you.
 * Job: sits on your element and types out lines in a little terminal bubble, one
 * after another, forever. lines="npm i piixpal|shipped!" */
(() => {
  const base = [
    'kkkkkkkkkkkk',
    'kmmmmmmmmmmk',
    'kmssssssssmk',
    'kmsgsssgssmk',
    'kmsssssssmmk'.slice(0, 12),
    'kmssgggsssmk',
    'kmssssssssmk',
    'kmmmmmmmmmmk',
    'kkkkkkkkkkkk',
    '....kmmk....',
    '..kkkkkkkk..'
  ];
  const blink = art.put(base, 3, 3, ['ssssss'.slice(0, 5)]);
  const type = art.put(base, 4, 5, ['gsg']);
  defineSprite('termi', {
    w: 12, h: 11, scale: 3, does: 'type',
    palette: { k: '#17121f', m: '#c9c3d6', s: '#17121f', g: '#c6f432' },
    frames: { idle: [base, base, base, blink], typing: [base, type] },
    fps: { idle: 1.5, typing: 8 }
  });
})();

/* ---- pals/thread.js ---- */
/* THREAD — a small spider on a long string. Mostly harmless, entirely dramatic.
 * Job: dangles from the bottom of an element (navs, banners). Sways when you scroll,
 * zips up if you reach for it, yo-yos when poked, and lowers itself back down. */
(() => {
  const body = [
    '......kk......',
    '....kkkkkk....',
    'k..kPPppppk..k',
    '.k.kpppppppkk.',
    '.kkpwkppwkpkk.',
    'k.kpppppppppk.',
    '.kkpprppprpk.k',
    '.k.kkpppppkk..',
    'k..k.kkkkk.k..',
    '...k.......k..'
  ];
  const legsB = art.compose(body,
    [0, 2, ['.k']], [12, 2, ['k.']], [0, 5, ['.']], [13, 5, ['k']], [0, 8, ['.k']], [12, 8, ['.k']]);
  const blink = art.compose(body, [5, 4, ['kk']], [8, 4, ['kk']]);
  const scared = art.compose(body, [5, 4, ['ww']], [8, 4, ['ww']], [5, 6, ['_kkk_']]);

  defineSprite('thread', {
    w: 14, h: 10, scale: 3,
    does: 'hang',
    palette: { k: '#1b1226', p: '#43306a', P: '#7a63b3', w: '#ffffff', r: '#ff7aa8' },
    frames: {
      idle: [body, body, body, blink],
      wiggle: [body, legsB],
      scared: [scared, legsB]
    },
    fps: { idle: 2, wiggle: 9, scared: 14 }
  });
})();

/* ---- pals/toy-ball.js ---- */
/* toy box: things you can throw around the page (do="toss") */
(() => {
  const K = '#17121f';
  /* BALL: a beach ball. Bouncy, rolly, slightly smug. */
  defineSprite('ball', {
    w: 10, h: 10, scale: 4, does: 'toss',
    toss: { bounce: .72, friction: .9, spin: 1 },
    palette: { k: K, r: '#ff5b4a', y: '#ffd23f', b: '#58c8ff', w: '#ffffff' },
    frames: { idle: [[
      '...kkkk...',
      '.kkrrwwkk.',
      '.krrrwwbk.',
      'kyrrrwbbbk',
      'kyyywwbbbk',
      'kyyywwwbbk',
      'kyyywwwrrk',
      '.kyyywrrk.',
      '.kkyywrkk.',
      '...kkkk...'
    ].map(r => r.padEnd(10, '.').slice(0, 10))] }
  });
})();

/* ---- pals/toy-can.js ---- */
/* toy box: things you can throw around the page (do="toss") */
(() => {
  const K = '#17121f';
  /* CAN: a soda can. Rolls a long, long way. */
  defineSprite('can', {
    w: 8, h: 12, scale: 4, does: 'toss',
    toss: { bounce: .3, friction: .7, spin: 1 },
    palette: { k: K, s: '#cfd6e6', r: '#ff4d6d', R: '#ff8fa3', w: '#ffffff' },
    frames: { idle: [[
      '.kkkkkk.',
      'kssssssk',
      'krRrrrrk',
      'krRrrrrk',
      'kwwwwwwk',
      'krRwwrrk',
      'krRrwwrk',
      'kwwwwwwk',
      'krRrrrrk',
      'krRrrrrk',
      'kssssssk',
      '.kkkkkk.'
    ]] }
  });
})();

/* ---- pals/toy-cube.js ---- */
/* toy box: things you can throw around the page (do="toss") */
(() => {
  const K = '#17121f';
  /* CUBE: a jelly cube. Wobbles forever after every landing. */
  const cube = [
    '.kkkkkkkkk.',
    'kGGgggggggk',
    'kGgggggggdk',
    'kggkgggkgdk',
    'kggkgggkgdk',
    'kgggggggg dk'.replace(' ', ''),
    'kggggkgggdk',
    'kgggggggddk',
    'kdddddddddk',
    '.kkkkkkkkk.'
  ];
  const wob = n => cube.map((r, i) => i < 5 ? (n > 0 ? '.' + r.slice(0, -1) : r.slice(1) + '.') : r);
  defineSprite('cube', {
    w: 11, h: 10, scale: 4, does: 'toss',
    toss: { bounce: .58, friction: 7 },
    palette: { k: K, g: '#7fe08f', G: '#c8ffd0', d: '#3fae5c' },
    frames: { idle: [cube, wob(1), cube, wob(-1), cube, cube, cube, cube], held: [wob(1), wob(-1)] },
    fps: { idle: 8, held: 10 }
  });
})();

/* ---- pals/toy-dice.js ---- */
/* toy box: things you can throw around the page (do="toss") */
(() => {
  const K = '#17121f';
  /* DICE: lands on a random face. Every throw is a decision. */
  const pips = {
    1: [[3, 3]], 2: [[1, 1], [5, 5]], 3: [[1, 1], [3, 3], [5, 5]], 4: [[1, 1], [5, 1], [1, 5], [5, 5]],
    5: [[1, 1], [5, 1], [3, 3], [1, 5], [5, 5]], 6: [[1, 1], [5, 1], [1, 3], [5, 3], [1, 5], [5, 5]]
  };
  const blank = ['.kkkkkkk.', 'kwwwwwwwk', 'kwwwwwwwk', 'kwwwwwwwk', 'kwwwwwwwk', 'kwwwwwwwk', 'kwwwwwwwk', 'kwwwwwwwk', '.kkkkkkk.'];
  const face = n => pips[n].reduce((rows, [x, y]) => art.put(rows, x + 1, y + 1, [n === 1 ? 'r' : 'k']), blank);
  const faces = {};
  for (let n = 1; n <= 6; n++) faces['f' + n] = [face(n)];
  defineSprite('dice', {
    w: 9, h: 9, scale: 4, does: 'toss',
    toss: { bounce: .38, friction: 6, faces: true },
    palette: { k: K, w: '#ffffff', r: '#ff4d6d' },
    frames: { ...faces, roll: [face(1), face(4), face(2), face(6), face(3), face(5)] },
    fps: { roll: 14 }
  });
})();

/* ---- pals/toy-duck.js ---- */
/* toy box: things you can throw around the page (do="toss") */
(() => {
  const K = '#17121f';
  /* DUCK: a rubber duck. Squeaks when it lands. Floats in spirit. */
  const duck = [
    '....kkk.....',
    '...kyyyk....',
    '...kywky....',
    '...kyyykoo..',
    '.k.kyyyykk..',
    'kykkyyyyyyk.',
    'kyyyyyyyyyyk',
    'kyyyYYYyyyyk',
    '.kyyyyyyyyk.',
    '..kkkkkkkk..'
  ].map(r => r.padEnd(12, '.').slice(0, 12));
  defineSprite('duck', {
    w: 12, h: 10, scale: 4, does: 'toss',
    toss: { bounce: .5, friction: 4, squeak: true },
    palette: { k: K, y: '#ffd23f', Y: '#e8a512', o: '#ff7a2f', w: '#ffffff' },
    frames: { idle: [duck], held: [art.put(duck, 4, 2, ['_kk'])] }
  });
})();

/* ---- pals/toy-pebble.js ---- */
/* toy box: things you can throw around the page (do="toss") */
(() => {
  const K = '#17121f';
  /* PEBBLE: a heavy little rock. Doesn't bounce. Lands with a thud everyone hears. */
  defineSprite('pebble', {
    w: 12, h: 8, scale: 4, does: 'toss',
    toss: { bounce: 0, friction: 9, heavy: true },
    palette: { k: K, g: '#a7a0b3', G: '#d3cedb', d: '#7d758b' },
    frames: { idle: [[
      '...kkkkk....',
      '.kkGGgggkk..',
      'kGGggggggk..',
      'kggkkgkkggk.',
      'kgggggggggk.',
      'kdggggggggdk',
      '.kddddddddk.',
      '..kkkkkkkk..'
    ].map(r => r.padEnd(12, '.'))] }
  });
})();

/* ---- sprites/alien.js ---- */
/* ALIEN: a tiny visitor with three eyes and one antenna. Has questions about your CSS. */
(() => {
  const body = ant => art.outline(art.paint(14, 15, (x, y) => {
    if (x === 7 && y >= 1 && y <= 3) return 'g';
    if (art.ellipse(x, y, 7 + ant, 1, 1.3, 1.3)) return 'p';                               /* antenna bulb */
    if (art.ellipse(x, y, 7, 8, 5.8, 5.6)) return y < 6 && x < 6 ? 'G' : 'g';
    if (y >= 13 && (x === 4 || x === 9)) return 'g';
    return null;
  }));
  const face = rows => art.compose(rows, [3, 7, ['ww.ww.ww'.replace(/\./g, 'g')]], [3, 8, ['ww.ww.ww'.replace(/\./g, 'g')]], [6, 11, ['kk']]);
  defineFigure('alien', {
    w: 14, h: 15, fps: 2,
    tag: 'A tiny visitor with three eyes and one antenna. Has questions about your CSS.',
    palette: { k: '#17121f', g: '#7bd63a', G: '#c8f58a', p: '#ff7aa8', w: '#ffffff' },
    frames: [face(body(0)), face(body(1)), face(body(0)), face(body(-1))],
    eyes: [{ x: 3, y: 7, w: 2, h: 2 }, { x: 6, y: 7, w: 2, h: 2 }, { x: 9, y: 7, w: 2, h: 2 }],
    lid: 'g'
  });
})();

/* ---- sprites/avocado.js ---- */
/* AVOCADO: half an avocado, proudly showing off its pit. Ripe for exactly one day. */
(() => {
  const body = art.outline(art.paint(13, 16, (x, y) => {
    const top = y < 7 ? 1 - (7 - y) * .1 : 1;                 /* a pear shape: narrower on top */
    if (!art.ellipse(x, y, 6.5, 8.5, 5.8 * top, 7.2)) return null;
    if (art.ellipse(x, y, 6.5, 10.5, 2.5, 2.5)) return x < 6 && y < 10 ? 'S' : 's';
    if (art.ellipse(x, y, 6.5, 8.8, 4.6 * top, 6.1)) return 'a';
    return 'g';
  }));
  defineFigure('avocado', {
    w: 13, h: 16,
    tag: 'Half an avocado, proudly showing off its pit. Ripe for exactly one day.',
    palette: { k: '#17121f', g: '#3f7a2a', a: '#d8f08a', s: '#9a5a2e', S: '#c98a4e', w: '#ffffff' },
    frames: [art.compose(body, [3, 5, ['ww']], [3, 6, ['ww']], [8, 5, ['ww']], [8, 6, ['ww']])],
    eyes: [{ x: 3, y: 5, w: 2, h: 2 }, { x: 8, y: 5, w: 2, h: 2 }],
    lid: 'a'
  });
})();

/* ---- sprites/battery.js ---- */
/* BATTERY: a battery that is always charging and always at 1%. Brave. */
(() => {
  const shell = art.outline(art.paint(18, 11, (x, y) => art.rrect(x, y, 1, 1, 14, 9, 1) ? 'w' : (x >= 15 && x <= 16 && y >= 4 && y <= 6 ? 'm' : null)));
  const level = n => {
    let r = shell;
    for (let i = 0; i < n; i++) r = art.compose(r, [3 + i * 3, 7, ['gg']], [3 + i * 3, 8, ['gg']]);   /* charge bars along the bottom */
    return r;
  };
  const face = rows => art.compose(rows, [5, 3, ['ww']], [5, 4, ['ww']], [9, 3, ['ww']], [9, 4, ['ww']], [7, 5, ['kk']]);
  defineFigure('battery', {
    w: 18, h: 11, fps: 3,
    tag: 'A battery that is always charging and always at one percent. Brave.',
    palette: { k: '#17121f', w: '#f3f0fa', m: '#9aa3b5', g: '#7bd63a' },
    frames: [0, 1, 2, 3, 4, 0].map(n => face(level(n))),
    eyes: [{ x: 5, y: 3, w: 2, h: 2 }, { x: 9, y: 3, w: 2, h: 2 }],
    lid: 'w'
  });
})();

/* ---- sprites/big-astronaut.js ---- */
/* ASTRONAUT (big): a tiny astronaut floating in place. Eyes glow behind the visor. */
(() => {
  const frame = blink => art.volume(art.paint(20, 24, (x, y) => {
    if (art.ellipse(x, y, 10, 7, 7.6, 7)) {
      if (art.rrect(x, y, 5, 4, 15, 10, 3)) return 'v';                                         /* visor */
      return 'b';                                                                                /* helmet */
    }
    if (art.rrect(x, y, 2, 11, 6, 17, 1) && y >= 12) return 'p';                                 /* backpack */
    if (art.rrect(x, y, 4, 12, 16, 20, 3)) return y === 15 && x >= 8 && x <= 12 ? (blink && x % 2 ? 'r' : 'g') : 'b';   /* suit + chest panel */
    if (y >= 21 && ((x >= 6 && x <= 8) || (x >= 12 && x <= 14))) return 'b';                     /* boots */
    if (y >= 13 && y <= 17 && (x === 17 || x === 18)) return 'b';                                /* arm */
    return null;
  }));
  defineFigure('astronaut', {
    ...BIG, w: 20, h: 24, fps: 2, scale: 7,
    tag: 'A tiny astronaut floating in place. Eyes glow behind the visor.',
    palette: { b: '#f3f0fa', d: '#b7b0c4', B: '#ffffff', v: '#1a1f3a', p: '#c9c3d6', g: '#c6f432', r: '#ff4d6d', k: '#58c8ff' },
    frames: [frame(0), frame(1)],
    eyes: [{ x: 7, y: 6, w: 2, h: 3 }, { x: 11, y: 6, w: 2, h: 3 }],
    pupil: { w: 2, h: 2 }, pupilKey: 'k', glint: '#ffffff', lid: 'v'
  });
})();

/* ---- sprites/big-bolt.js ---- */
/* BOLT (big): a chunky robot whose face is a little screen. Its eyes glow. */
(() => {
  const frame = light => art.volume(art.paint(20, 22, (x, y) => {
    if (y <= 2 && x >= 9 && x <= 10) return y === 0 || (y === 1 && light) ? 'a' : 'm';
    if (y === 3 && x >= 8 && x <= 11) return 'm';
    if ((x <= 1 || x >= 18) && y >= 9 && y <= 12) return 'm';            /* ear bolts */
    if (art.rrect(x, y, 2, 4, 17, 19, 3)) {
      if (art.rrect(x, y, 4, 7, 15, 15, 2)) return 's';                   /* the screen */
      return 'b';
    }
    if (y >= 20 && ((x >= 5 && x <= 7) || (x >= 12 && x <= 14))) return 'm';
    return null;
  }), 'b', 'd', 'B');
  const face = rows => art.put(rows, 7, 13, ['gggggg'.slice(0, 6)]);
  defineFigure('bolt', {
    ...BIG, w: 20, h: 22, fps: 1.6,
    tag: 'A chunky robot whose face is a little screen. Its eyes glow.',
    palette: { b: '#b8c4e0', d: '#8590b0', B: '#eef2ff', m: '#5c5470', s: '#17121f', a: '#ff4d6d', g: '#c6f432', k: '#17121f' },
    frames: [face(frame(true)), face(frame(false))],
    eyes: [{ x: 5, y: 8, w: 4, h: 4 }, { x: 11, y: 8, w: 4, h: 4 }],
    pupil: { w: 2, h: 3 },
    pupilKey: 'g',
    glint: '#ffffff',
    lid: 's'
  });
})();

/* ---- sprites/big-brain.js ---- */
/* BRAIN (big): a very big brain, thinking very hard. Sparks race along its folds. */
(() => {
  const frame = f => art.volume(art.paint(24, 19, (x, y) => {
    const inL = art.ellipse(x, y, 8, 9, 7.6, 7.6), inR = art.ellipse(x, y, 16, 9, 7.6, 7.6);
    if (!inL && !inR && !(y >= 15 && y <= 17 && x >= 10 && x <= 13)) return null;
    if (x === 12 && y < 15) return 'd';                                                     /* the middle */
    /* wiggly folds, with a spark travelling along one of them */
    const fold = Math.sin(x * .9 + y * .35) + Math.sin(y * 1.1 - x * .3);
    if (Math.abs(fold) < .32) return ((x + y * 2 + f * 3) % 11) === 0 ? 'y' : 'd';
    return 'b';
  }));
  defineFigure('brain', {
    ...BIG, w: 24, h: 19, fps: 6, scale: 7,
    tag: 'A very big brain, thinking very hard. Sparks race along its folds.',
    palette: { b: '#ff9cc2', d: '#e26f9d', B: '#ffd1e3', y: '#fff36b', k: '#17121f', m: '#17121f' },
    frames: [0, 1, 2, 3].map(f => art.compose(frame(f), [5, 7, ['bbbb']], [5, 8, ['bbbb']], [5, 9, ['bbbb']], [15, 7, ['bbbb']], [15, 8, ['bbbb']], [15, 9, ['bbbb']], [11, 12, ['mm']])),
    eyes: [{ x: 5, y: 7, w: 4, h: 3 }, { x: 15, y: 7, w: 4, h: 3 }],
    pupil: { w: 2, h: 2 }
  });
})();

/* ---- sprites/big-crt.js ---- */
/* CRT (big): a beige monitor from the old internet. Its face glows on the screen. */
(() => {
  const frame = scan => art.volume(art.paint(22, 22, (x, y) => {
    if (y >= 18) return (y === 18 && x >= 8 && x <= 13) || (y >= 19 && x >= 5 && x <= 16) ? 'b' : null;   /* stand */
    if (!art.rrect(x, y, 1, 0, 20, 17, 2)) return null;
    if (art.rrect(x, y, 4, 3, 17, 13, 2)) return y === 3 + scan ? 'S' : 's';                              /* screen + scanline */
    if (y === 15 && x >= 15 && x <= 17) return x === 17 ? 'g' : 'd';                                      /* power light */
    return 'b';
  }), 'b', 'd', 'B');
  defineFigure('crt', {
    ...BIG, w: 22, h: 22, fps: 5, scale: 7,
    tag: 'A beige monitor from the old internet. Its face glows on the screen.',
    palette: { b: '#e8dcc2', d: '#bfb08f', B: '#fff7e6', s: '#1a2a24', S: '#24453a', g: '#c6f432', k: '#17121f' },
    frames: Array.from({ length: 10 }, (_, i) => art.put(frame(i), 9, 11, ['gggg'])),
    eyes: [{ x: 6, y: 5, w: 4, h: 4 }, { x: 12, y: 5, w: 4, h: 4 }],
    pupil: { w: 2, h: 3 }, pupilKey: 'g', glint: '#ffffff', lid: 's'
  });
})();

/* ---- sprites/big-elephant.js ---- */
/* ELEPHANT (big): a baby elephant with big ears and a trunk that never sits still. */
(() => {
  const frame = sw => art.volume(art.paint(24, 20, (x, y) => {
    if (art.ellipse(x, y, 4.5, 7, 4.2, 5.2) || art.ellipse(x, y, 19.5, 7, 4.2, 5.2)) return art.ellipse(x, y, 4.8, 7, 2.4, 3.4) || art.ellipse(x, y, 19.2, 7, 2.4, 3.4) ? 'p' : 'b';  /* ears */
    if (art.ellipse(x, y, 12, 8, 7, 6.4)) return 'b';                                             /* head */
    const tx = 12 + Math.round(Math.sin(y * .5 + sw) * 1.2);                                       /* swinging trunk */
    if (y >= 13 && y <= 18 && x >= tx - 1 && x <= tx + 1 - (y > 16 ? 1 : 0)) return 'b';
    if (y >= 15 && y <= 19 && ((x >= 6 && x <= 8) || (x >= 15 && x <= 17))) return 'd';           /* front feet */
    return null;
  }));
  defineFigure('elephant', {
    ...BIG, w: 24, h: 20, fps: 3, scale: 7,
    tag: 'A baby elephant with big ears and a trunk that never sits still.',
    palette: { b: '#a7a0c4', d: '#7d75a0', B: '#d3cee6', p: '#ffb3c7', k: '#17121f' },
    frames: [0, 1.4, 2.8, 1.4].map(frame),
    eyes: [{ x: 8, y: 6, w: 2, h: 3 }, { x: 14, y: 6, w: 2, h: 3 }],
    pupil: { w: 2, h: 2 }
  });
})();

/* ---- sprites/big-flick.js ---- */
/* FLICK (big): a little flame with big feelings. Never, ever stands still. */
(() => {
  const frame = f => {
    const sway = [-1, 0, 1, 0][f], tip = [0, 1, 0, 2][f];
    return art.volume(art.paint(18, 24, (x, y) => {
      if (y < tip) return null;
      /* a teardrop: narrow swaying tip on a round base */
      const k = clamp((y - tip) / 14, 0, 1);
      const cx = 9 + sway * (1 - k) * 2, half = 1 + k * 7;
      const inBody = y < 15 ? Math.abs(x + .5 - cx) <= half : art.ellipse(x, y, 9, 16, 8.2, 7.6);
      if (!inBody) return null;
      const core = y > 9 && art.ellipse(x, y, 9, 18, 4.2, 6.5 - (f % 2));
      return core ? 'c' : 'b';
    }));
  };
  defineFigure('flick', {
    ...BIG, w: 18, h: 24, fps: 7,
    tag: 'A little flame with big feelings. Never, ever stands still.',
    palette: { b: '#ff8a2a', d: '#e2561a', B: '#ffc06b', c: '#ffe066', k: '#17121f', m: '#17121f' },
    frames: [0, 1, 2, 3].map(f => art.put(frame(f), 8, 19, ['mm'])),
    eyes: [{ x: 4, y: 14, w: 3, h: 4 }, { x: 11, y: 14, w: 3, h: 4 }],
    pupil: { w: 2, h: 3 },
    lid: 'c',
    recolor: { b: 0, d: -.2, B: .35 }
  });
})();

/* ---- sprites/big-fluff.js ---- */
/* FLUFF (big): a sheep made almost entirely of cloud. Trots in place, very proudly. */
(() => {
  const puffs = [[5, 6], [11, 4], [17, 6], [3, 11], [19, 11], [6, 15], [16, 15], [11, 16]];
  const frame = step => art.volume(art.paint(22, 22, (x, y) => {
    if (art.ellipse(x, y, 11, 11, 4.6, 5.2)) return 'F';
    if (puffs.some(([cx, cy]) => art.ellipse(x, y, cx, cy, 4.4, 4.4)) || art.ellipse(x, y, 11, 10, 8, 7)) return 'b';
    const legs = [6, 9, 13, 16];
    for (let i = 0; i < legs.length; i++) {
      const up = (i % 2) === step ? 1 : 0;
      if (x === legs[i] && y >= 18 && y <= 21 - up) return 'L';
    }
  }));
  defineFigure('fluff', {
    ...BIG, w: 22, h: 22, fps: 3,
    tag: 'A sheep made almost entirely of cloud. Trots in place, very proudly.',
    palette: { b: '#ff9ec4', d: '#e26f9d', B: '#ffd6e6', F: '#3b2a4f', L: '#3b2a4f', k: '#ffffff', w: '#ffffff' },
    frames: [0, 1].map(s => art.put(frame(s), 10, 13, ['pp'.replace(/p/g, 'B')])),
    eyes: [{ x: 7, y: 8, w: 3, h: 3 }, { x: 12, y: 8, w: 3, h: 3 }],
    pupil: { w: 2, h: 2 },
    lid: 'F',
    glint: null,
    recolor: { b: 0, d: -.2, B: .45 }
  });
})();

/* ---- sprites/big-gloop.js ---- */
/* GLOOP (big): a slow, happy blob that drips a little. Mostly harmless. */
(() => {
  const drips = [[3, 2], [4, 3], [9, 1], [10, 2], [15, 3], [16, 2], [17, 1]];
  const frame = f => art.volume(art.paint(22, 21, (x, y) => {
    if (y < 11) return art.ellipse(x, y, 11, 10, 10.5, 9.5) && 'b';
    if (y < 16) return x >= 1 && x <= 20 && 'b';
    const d = drips.find(([dx]) => dx === x);
    return d && y < 16 + ((d[1] + f) % 4) + 1 && 'b';
  }));
  defineFigure('gloop', {
    ...BIG, w: 22, h: 21, fps: 2.5,
    tag: 'A slow, happy blob that drips a little. Mostly harmless.',
    palette: { b: '#ff6b4a', d: '#c94a2e', B: '#ffb39f', k: '#17121f', m: '#17121f' },
    frames: [0, 1, 2, 3].map(f => art.put(frame(f), 10, 13, ['mm'])),
    eyes: [{ x: 5, y: 7, w: 5, h: 5 }, { x: 12, y: 7, w: 5, h: 5 }],
    pupil: { w: 3, h: 4 }
  });
})();

/* ---- sprites/big-gpu.js ---- */
/* GPU (big): a graphics card whose two fans are its eyes. RGB strip included, obviously. */
(() => {
  const frame = f => art.volume(art.paint(26, 17, (x, y) => {
    if (x <= 1 && y >= 2 && y <= 15) return 'm';                                          /* the bracket */
    if (y >= 15 && x >= 6 && x <= 20) return x % 2 ? 'g' : null;                          /* gold contacts */
    if (!art.rrect(x, y, 2, 2, 25, 14, 2)) return null;
    if (y === 3 && x >= 4 && x <= 23) return 'rGu'[(x + f) % 3];                             /* RGB strip */
    for (const cx of [9, 18]) {
      if (art.ellipse(x, y, cx, 9, 4.2, 4.2)) {
        if (art.ellipse(x, y, cx, 9, 1.6, 1.6)) return 'h';
        const a = Math.atan2(y + .5 - 9, x + .5 - cx);
        return Math.floor((a / Math.PI * 3 + 6 + f * .5)) % 2 ? 'F' : 'f';                /* spinning blades */
      }
    }
    return 'b';
  }));
  defineFigure('gpu', {
    ...BIG, w: 26, h: 17, fps: 8, scale: 7,
    tag: 'A graphics card whose two fans are its eyes. RGB strip included, obviously.',
    palette: { b: '#3b3550', d: '#25213a', B: '#5c5470', m: '#9aa3b5', g: '#ffd23f', f: '#2d2838', F: '#6e6585', h: '#c9c3d6',
      r: '#ff4d6d', G: '#c6f432', u: '#58c8ff', k: '#17121f' },
    frames: [0, 1, 2].map(frame),
    eyes: [{ x: 8, y: 8, w: 2, h: 2 }, { x: 17, y: 8, w: 2, h: 2 }],
    pupil: { w: 1, h: 1 }, glint: null, lid: 'h'
  });
})();

/* ---- sprites/big-hops.js ---- */
/* HOPS (big): long ears, short attention span. One ear never quite stays up. */
(() => {
  const frame = flop => art.volume(art.paint(20, 25, (x, y) => {
    /* left ear stands, right ear flops over in the second frame */
    if (art.rrect(x, y, 3, 0, 7, 11, 2)) return x >= 4 && x <= 6 && y >= 2 && y <= 9 ? 'p' : 'b';
    if (!flop && art.rrect(x, y, 12, 0, 16, 11, 2)) return x >= 13 && x <= 15 && y >= 2 && y <= 9 ? 'p' : 'b';
    if (flop && art.rrect(x, y, 13, 3, 19, 7, 2)) return 'b';
    if (flop && art.rrect(x, y, 12, 5, 16, 11, 2)) return 'b';
    return art.ellipse(x, y, 10, 17, 9.6, 8) && 'b';
  }));
  const face = rows => art.compose(rows, [9, 19, ['pp']], [8, 21, ['m..m'.replace(/\./g, '_')]], [9, 22, ['mm']]);
  defineFigure('hops', {
    ...BIG, w: 20, h: 25, fps: .8,
    tag: 'Long ears, short attention span. One ear never quite stays up.',
    palette: { b: '#b9a4ff', d: '#8d74e6', B: '#e4dbff', p: '#ff9cc2', k: '#17121f', m: '#17121f' },
    frames: [face(frame(false)), face(frame(false)), face(frame(true))],
    eyes: [{ x: 4, y: 14, w: 4, h: 4 }, { x: 12, y: 14, w: 4, h: 4 }],
    pupil: { w: 2, h: 3 }
  });
})();

/* ---- sprites/big-inky.js ---- */
/* INKY (big): a small squid with five wiggly arms and one very big question. */
(() => {
  const arms = [2, 6, 10, 14, 18];
  const frame = f => art.volume(art.paint(22, 22, (x, y) => {
    if (y < 11) return art.ellipse(x, y, 11, 9, 9.6, 8.6) && 'b';
    if (y < 14) return x >= 2 && x <= 19 && 'b';
    /* arms sway: every other arm leans the other way */
    for (let i = 0; i < arms.length; i++) {
      const lean = (i + f) % 2 ? 1 : -1, off = y > 17 ? lean : 0;
      if (x >= arms[i] + off && x <= arms[i] + 1 + off && y <= 20 - (i % 2)) return 'b';
    }
  }));
  defineFigure('inky', {
    ...BIG, w: 22, h: 22, fps: 3,
    tag: 'A small squid with five wiggly arms and one very big question.',
    palette: { b: '#6b4cff', d: '#4a2fd6', B: '#a995ff', k: '#17121f', m: '#17121f', w: '#ffffff' },
    frames: [0, 1].map(f => art.put(frame(f), 10, 12, ['mm'])),
    eyes: [{ x: 5, y: 6, w: 5, h: 5 }, { x: 12, y: 6, w: 5, h: 5 }],
    pupil: { w: 3, h: 3 },
    pupilKey: 'w',
    glint: '#17121f'
  });
})();

/* ---- sprites/big-keycap.js ---- */
/* KEYCAP (big): a chunky mechanical keycap. Thocky. Click it for a satisfying press. */
(() => {
  const body = art.volume(art.paint(18, 16, (x, y) => {
    if (art.rrect(x, y, 3, 1, 14, 9, 2)) return 't';                          /* the dished top */
    if (art.rrect(x, y, 1, 3, 16, 14, 2)) return 'b';                         /* the skirt */
    return null;
  }), 'b', 'd', 'B');
  defineFigure('keycap', {
    ...BIG, w: 18, h: 16, scale: 8,
    tag: 'A chunky mechanical keycap. Thocky. Click it for a satisfying press.',
    palette: { b: '#c6f432', d: '#8fb81a', B: '#ecffb0', t: '#dcff6e', k: '#17121f', m: '#17121f' },
    frames: [art.put(body, 8, 7, ['mm'])],
    eyes: [{ x: 5, y: 3, w: 3, h: 3 }, { x: 10, y: 3, w: 3, h: 3 }],
    pupil: { w: 2, h: 2 }, lid: 't',
    recolor: { b: 0, d: -.25, B: .5, t: .22 }
  });
})();

/* ---- sprites/big-llama.js ---- */
/* LLAMA (big): a fluffy llama with a long neck and a calm, knowing look. */
(() => {
  const frame = ear => art.volume(art.paint(20, 26, (x, y) => {
    if ((x === 9 || x === 10 + ear) && y >= 0 && y <= 2) return 'b';                          /* ears */
    if ((x === 14 || x === 15 - ear) && y >= 0 && y <= 2) return 'b';
    if (art.rrect(x, y, 8, 2, 17, 9, 3)) return x >= 15 && y >= 6 ? 'c' : 'b';              /* head + muzzle */
    if (art.rrect(x, y, 9, 8, 14, 17, 2)) return 'b';                                         /* neck */
    if (art.ellipse(x, y, 9, 19, 8.6, 4.4)) return (x + y) % 3 === 0 ? 'B' : 'b';             /* fluffy body */
    if (y >= 23 && [3, 6, 12, 15].includes(x)) return 'd';                                    /* legs */
    return null;
  }));
  defineFigure('llama', {
    ...BIG, w: 20, h: 26, fps: 1.2, scale: 7,
    tag: 'A fluffy llama with a long neck and a calm, knowing look.',
    palette: { b: '#f3ead8', d: '#c9b896', B: '#ffffff', c: '#e8dcc2', k: '#17121f', m: '#17121f' },
    frames: [0, 0, 1, 0].map(e => art.put(frame(e), 16, 7, ['m'])),
    eyes: [{ x: 11, y: 4, w: 2, h: 2 }, { x: 14, y: 4, w: 2, h: 2 }],
    pupil: { w: 1, h: 2 }
  });
})();

/* ---- sprites/big-mumu.js ---- */
/* MUMU (big): a round little bear who would like a snack, please. Ears wiggle. */
(() => {
  const frame = wig => art.volume(art.paint(22, 21, (x, y) => {
    const earY = 3 + (wig ? 1 : 0);
    if (art.ellipse(x, y, 4, earY, 3.4, 3.4)) return art.ellipse(x, y, 4, earY, 1.6, 1.6) ? 'p' : 'b';
    if (art.ellipse(x, y, 18, 3, 3.4, 3.4)) return art.ellipse(x, y, 18, 3, 1.6, 1.6) ? 'p' : 'b';
    if (art.ellipse(x, y, 11, 13, 4, 3)) return 's';
    if (art.ellipse(x, y, 11, 11, 10.5, 9.4)) return 'b';
    return y >= 19 && ((x >= 4 && x <= 7) || (x >= 14 && x <= 17)) && 'b';
  }));
  const face = rows => art.compose(rows, [10, 11, ['kk']], [10, 13, ['_k']], [9, 14, ['k_k']]);
  defineFigure('mumu', {
    ...BIG, w: 22, h: 21, fps: .7,
    tag: 'A round little bear who would like a snack, please. Ears wiggle.',
    palette: { b: '#e0a46a', d: '#b87a42', B: '#f6d2ad', p: '#ff9cc2', s: '#fff1de', k: '#17121f' },
    frames: [face(frame(0)), face(frame(0)), face(frame(1))],
    eyes: [{ x: 5, y: 7, w: 3, h: 3 }, { x: 14, y: 7, w: 3, h: 3 }],
    pupil: { w: 2, h: 2 }
  });
})();

/* ---- sprites/big-server.js ---- */
/* SERVER (big): a server rack keeping your site alive. Its drive lights never stop. */
(() => {
  const BAYS = [9, 13, 17];
  const frame = f => art.volume(art.paint(16, 24, (x, y) => {
    if (!art.rrect(x, y, 1, 0, 14, 21, 2)) return (y >= 22 && (x === 3 || x === 12)) ? 'd' : null;
    for (const by of BAYS) if (y >= by && y <= by + 2 && x >= 3 && x <= 12) {
      if (y === by + 1 && x === 11) return ((f + by) % 3) ? 'g' : 'o';                     /* blinking LEDs */
      if (y === by + 1 && x >= 4 && x <= 8) return 'v';                                     /* vents */
      return 's';
    }
    return 'b';
  }));
  defineFigure('server', {
    ...BIG, w: 16, h: 24, fps: 5, scale: 7,
    tag: 'A server rack keeping your site alive. Its drive lights never stop.',
    palette: { b: '#c9d3ea', d: '#8f9bb8', B: '#eef2ff', s: '#2d2838', v: '#5c5470', g: '#c6f432', o: '#ff7a2f', k: '#17121f', m: '#17121f' },
    frames: [0, 1, 2].map(f => art.put(frame(f), 7, 6, ['mm'])),
    eyes: [{ x: 3, y: 2, w: 4, h: 3 }, { x: 9, y: 2, w: 4, h: 3 }],
    pupil: { w: 2, h: 2 }
  });
})();

/* ---- sprites/big-spud.js ---- */
/* SPUD (big): a lumpy potato with a tiny sprout and a lot of potential. */
(() => {
  const lump = (x, y) => ((x * 7 + y * 13) % 11) < 2;
  const body = art.volume(art.paint(20, 20, (x, y) => {
    if (y < 3) return null;
    const inside = art.ellipse(x, y, 10, 12, 9.6, 7.6);
    const edge = inside && !art.ellipse(x, y, 10, 12, 8.6, 6.6);
    if (!inside || (edge && lump(x, y))) return null;
    return ((x * 5 + y * 3) % 17 === 0) ? 's' : 'b';
  }));
  const sprout = [
    ['..gg..gg..', '.gGg..gGg.', '..ggggg...', '....g.....'],
    ['.gg....gg.', 'gGg...gGg.', '.gggggg...', '....g.....']
  ];
  defineFigure('spud', {
    ...BIG, w: 20, h: 20, fps: 1.2,
    tag: 'A lumpy potato with a tiny sprout and a lot of potential.',
    palette: { b: '#d9a066', d: '#a9733f', B: '#f2cc9c', s: '#8a5a2e', g: '#4fc46a', G: '#9be57a', k: '#17121f', m: '#17121f' },
    frames: sprout.map(sp => art.compose(body, [5, 0, sp], [9, 15, ['mm']])),
    eyes: [{ x: 5, y: 9, w: 3, h: 4 }, { x: 12, y: 9, w: 3, h: 4 }],
    pupil: { w: 2, h: 3 }
  });
})();

/* ---- sprites/big-tofu.js ---- */
/* TOFU (big): a block of tofu on two stubby legs, marching on the spot. Firm but fair. */
(() => {
  const frame = step => art.volume(art.paint(20, 20, (x, y) => {
    if (art.rrect(x, y, 1, 1, 18, 14, 3)) return 'b';
    const left = x >= 5 && x <= 6, right = x >= 13 && x <= 14;
    if ((left || right) && y >= 15) {
      const lift = (left && step === 1) || (right && step === 3) ? 1 : 0;
      return y <= 18 - lift && 'b';
    }
  }));
  const face = rows => art.compose(rows, [3, 10, ['p']], [16, 10, ['p']], [9, 10, ['mm']]);
  defineFigure('tofu', {
    ...BIG, w: 20, h: 20, fps: 4,
    tag: 'A block of tofu on two stubby legs, marching on the spot. Firm but fair.',
    palette: { b: '#c6f432', d: '#93c01a', B: '#ecffb0', p: '#ff9cc2', k: '#17121f', m: '#17121f' },
    frames: [0, 1, 2, 3].map(s => face(frame(s))),
    eyes: [{ x: 4, y: 5, w: 4, h: 4 }, { x: 12, y: 5, w: 4, h: 4 }],
    pupil: { w: 2, h: 3 }
  });
})();

/* ---- sprites/big-unicorn.js ---- */
/* UNICORN (big): the startup kind. A golden horn, a rainbow mane, a billion-dollar smile. */
(() => {
  const RAINBOW = 'roygbv';
  const frame = f => art.volume(art.paint(22, 22, (x, y) => {
    if (y <= 4 && x >= 13 && x <= 15 && Math.abs(x - 14) <= (y + 1) / 3) return 'h';             /* horn */
    if (art.ellipse(x, y, 14, 9, 5.6, 4.8)) return 'b';                                          /* head */
    if (x >= 7 && x <= 10 && y >= 3 && y <= 14 && y - 3 <= (x - 6) * 3) return RAINBOW[(y + f) % 6];   /* mane */
    if (art.ellipse(x, y, 10, 15, 7.6, 4.4)) return 'b';                                         /* body */
    if (y >= 18 && [5, 8, 12, 15].includes(x)) return 'd';                                       /* legs */
    if (x <= 2 && y >= 12 && y <= 16) return RAINBOW[(y + f + 2) % 6];                           /* tail */
    return null;
  }));
  defineFigure('unicorn', {
    ...BIG, w: 22, h: 22, fps: 4, scale: 7,
    tag: 'The startup kind. A golden horn, a rainbow mane, a billion-dollar smile.',
    palette: { b: '#f6f0ff', d: '#cbbfe6', B: '#ffffff', h: '#ffd23f', r: '#ff4d6d', o: '#ff9a2f', y: '#ffd23f', g: '#7bd63a', v: '#6b4cff', k: '#17121f', m: '#17121f', p: '#ffb3c7' },
    frames: [0, 1, 2, 3, 4, 5].map(f => art.compose(frame(f), [17, 11, ['m']], [18, 10, ['p']])),
    eyes: [{ x: 13, y: 7, w: 2, h: 3 }],
    pupil: { w: 2, h: 2 }
  });
})();

/* ---- sprites/big-whale.js ---- */
/* WHALE (big): a friendly whale who surfaces now and then for a little spout. */
(() => {
  const body = art.volume(art.paint(28, 18, (x, y) => {
    if (y < 4) return null;
    if (art.ellipse(x, y, 12, 12, 11.6, 6.4)) return y > 13 && x < 18 ? 'B' : 'b';
    /* the tail rises off to the right and splits into a fluke */
    if (x >= 20 && x <= 24 && y >= 8 && y <= 13 && art.ellipse(x, y, 22, 12, 3.5, 3.4)) return 'b';
    if (art.ellipse(x, y, 25, 6.5, 2.4, 2.6) || art.ellipse(x, y, 25.5, 9.5, 2.2, 1.8)) return 'b';
    return null;
  }), 'b', 'd', 'L');
  const mouth = rows => art.put(rows, 3, 13, ['.mmmmmm']);
  const spouts = [
    ['................', '................', '................', '................'],
    ['................', '........w.......', '.......ww.......', '........w.......'],
    ['......w...w.....', '.......w.w......', '........w.......', '........w.......'],
    ['.....w.....w....', '......w...w.....', '.......w.w......', '........w.......']
  ];
  defineFigure('whale', {
    ...BIG, w: 28, h: 18, fps: 2, scale: 7,
    tag: 'A friendly whale who surfaces now and then for a little spout.',
    palette: { b: '#58c8ff', d: '#2f97d6', L: '#bfeaff', B: '#e8f8ff', w: '#bfeaff', k: '#17121f', m: '#17121f' },
    frames: [0, 0, 0, 1, 2, 3, 2].map(i => art.compose(mouth(body), [0, 0, spouts[i]])),
    eyes: [{ x: 5, y: 9, w: 3, h: 3 }],
    pupil: { w: 2, h: 2 },
    recolor: { b: 0, d: -.24, L: .45 }
  });
})();

/* ---- sprites/boba.js ---- */
/* BOBA: a cup of milk tea with a straw and a lot of pearls. Chewy personality. */
(() => {
  const top = [
    '........kk..',
    '.......kk...',
    '......kk....',
    '..kkkkkkkk..',
    '.klllllllk..'.replace('k..', 'lk.'),
    'kkkkkkkkkkkk',
    '.kttttttttk.',
    '.ktwwttwwtk.',
    '.ktwwttwwtk.',
    '.ktttkktttk.',
    '.kttttttttk.'
  ];
  const pearls = [
    ['..kbtbbtbk..', '..kbbtbbbk..', '..kbbbbbbk..', '...kkkkkk...'],
    ['..kbbtbtbk..', '..kbtbbbbk..', '..kbbbbbbk..', '...kkkkkk...']
  ];
  defineFigure('boba', {
    w: 12, h: 15, fps: 1.5,
    tag: 'A cup of milk tea with a straw and a lot of pearls. Chewy personality.',
    palette: { k: '#17121f', l: '#fff7ec', t: '#e8c39e', b: '#4a2a1a', w: '#ffffff' },
    frames: pearls.map(p => top.concat(p)),
    eyes: [{ x: 3, y: 7, w: 2, h: 2 }, { x: 7, y: 7, w: 2, h: 2 }],
    lid: 't'
  });
})();

/* ---- sprites/cactus.js ---- */
/* CACTUS: a potted cactus who blooms when it's in a good mood. Do not hug. */
(() => {
  const body = [
    '....kkkkkkkk....',
    '...kgGggggggk...',
    '...kgGggggggk.k.',
    '.k.kgwwggwwgkkgk',
    'kgkkgwwggwwgkkgk',
    'kgkkgggkkgggkkgk',
    'kggggggggggggggk',
    '.kkkggggggggkkk.',
    '...kggggggggk...',
    '..kkkkkkkkkkkk..',
    '..kooooooooook..',
    '...kooooooook...',
    '...kodoooodok...',
    '....kkkkkkkk....'
  ];
  defineFigure('cactus', {
    w: 16, h: 15, fps: .5,
    tag: 'A potted cactus who blooms when it is in a good mood. Do not hug.',
    palette: { k: '#17121f', g: '#4fc46a', G: '#9be57a', w: '#ffffff', o: '#e8784a', d: '#c45a30', f: '#ff7aa8' },
    frames: [['................'].concat(body), ['.......ff.......'].concat(art.put(body, 6, 0, ['_kffk_']))],
    eyes: [{ x: 5, y: 4, w: 2, h: 2 }, { x: 9, y: 4, w: 2, h: 2 }],
    lid: 'g'
  });
})();

/* ---- sprites/candle.js ---- */
/* CANDLE: a little candle with a flame that never sits still. */
(() => {
  const body = [
    '....k.....',
    '.kkkkkkkk.',
    'kcCcccccck',
    'kcwwccwwck',
    'kcwwccwwck',
    'kccckkccck',
    'kcCccccccck'.slice(0, 10),
    'kcccccccck',
    'kdccccccdk',
    'kddddddddk',
    '.kkkkkkkk.'
  ];
  const flames = [
    ['....y.....', '...yyy....', '...yoy....', '..yoooy...', '...yoy....'],
    ['.....y....', '....yy....', '...yyoy...', '...yooy...', '...yoy....'],
    ['..........', '....y.....', '...yyy....', '...yoy....', '...yoy....']
  ];
  defineFigure('candle', {
    w: 10, h: 16, fps: 7,
    tag: 'A little candle with a flame that never sits still.',
    palette: { k: '#17121f', y: '#ffd23f', o: '#ff7a2f', c: '#ffe1ec', C: '#ffffff', d: '#f2b5cc', w: '#ffffff' },
    frames: flames.map(f => f.concat(body)),
    eyes: [{ x: 2, y: 8, w: 2, h: 2 }, { x: 6, y: 8, w: 2, h: 2 }],
    lid: 'c'
  });
})();

/* ---- sprites/cherries.js ---- */
/* CHERRIES: two cherries on one stem. Inseparable. Four eyes, one opinion. */
(() => {
  const body = art.outline(art.paint(15, 14, (x, y) => {
    if (art.ellipse(x, y, 4, 9.5, 3.4, 3.4) || art.ellipse(x, y, 11, 9.5, 3.4, 3.4)) return (x === 3 || x === 10) && y === 8 ? 'R' : 'r';
    /* two stems meeting at the top, plus a leaf */
    if ((y >= 1 && y <= 5) && (x === Math.round(7 - (y - 1) * .7) || x === Math.round(7 + (y - 1) * .9))) return 'g';
    if (y >= 0 && y <= 1 && x >= 8 && x <= 10) return 'G';
    return null;
  }));
  defineFigure('cherries', {
    w: 15, h: 14, fps: 1,
    tag: 'Two cherries on one stem. Inseparable. Four eyes, one opinion.',
    palette: { k: '#17121f', r: '#ff3d5a', R: '#ffb3c0', g: '#4a7a2a', G: '#7bd63a', w: '#ffffff' },
    frames: [body],
    /* dot eyes, two per cherry; they look up and down */
    eyes: [{ x: 2, y: 8, w: 1, h: 2 }, { x: 5, y: 8, w: 1, h: 2 }, { x: 9, y: 8, w: 1, h: 2 }, { x: 12, y: 8, w: 1, h: 2 }],
    lid: 'r'
  });
})();

/* ---- sprites/cloud.js ---- */
/* CLOUD: a little cloud with a light, cheerful drizzle. */
(() => {
  const base = [
    '.....kkkk.......',
    '...kkccCCk.kk...',
    '..kccccCCCkcck..',
    '.kccccccccccCCk.',
    'kcccccccccccccck',
    'kcccccccccccccck',
    'kcpccccKKccccpck',
    'kdccccccccccccdk',
    '.kddddddddddddk.',
    '..kkkkkkkkkkkk..'
  ];
  defineFigure('cloud', {
    w: 16, h: 12, fps: 3,
    tag: 'A little cloud with a light, cheerful drizzle.',
    palette: { k: '#17121f', c: '#f4f6ff', C: '#ffffff', d: '#c9d0ea', p: '#ffb3c7', K: '#17121f', b: '#58c8ff' },
    frames: [
      base.concat(['....b......b....', '................']),
      base.concat(['.......b.......b', '....b......b....']),
      base.concat(['................', '.......b.......b'])
    ],
    eyes: [{ x: 4, y: 4, w: 2, h: 2 }, { x: 10, y: 4, w: 2, h: 2 }],
    lid: 'c'
  });
})();

/* ---- sprites/coffee.js ---- */
/* COFFEE: a mug of coffee, steaming gently, quietly judging your sleep schedule. */
(() => {
  const mug = [
    '.kkkkkkkkk....',
    'kcCccccccck...',
    'kmmmmmmmmmkkkk',
    'kmwwmmmwwmkmmk',
    'kmwwmmmwwmkmmk',
    'kmpmmmmmpmkkkk',
    'kmmmmkkmmmk...',
    'kmmmmmmmmmk...',
    '.kmmmmmmmk....',
    '..kkkkkkk.....'
  ];
  const steam = [
    ['...s....s.....', '....s..s......', '...s....s.....', '....s..s......'],
    ['....s..s......', '...s....s.....', '....s..s......', '...s....s.....'],
    ['..............', '....s...s.....', '...s...s......', '....s...s.....']
  ];
  defineFigure('coffee', {
    w: 14, h: 14, fps: 3,
    tag: 'A mug of coffee, steaming gently, quietly judging your sleep schedule.',
    palette: { k: '#17121f', m: '#ff6b4a', c: '#6b3b1f', C: '#9a5a2e', w: '#ffffff', p: '#ffb3a0', s: '#c9c3d6' },
    frames: steam.map(st => st.concat(mug)),
    eyes: [{ x: 2, y: 7, w: 2, h: 2 }, { x: 7, y: 7, w: 2, h: 2 }],
    lid: 'm'
  });
})();

/* ---- sprites/cookie.js ---- */
/* COOKIE: a chocolate chip cookie with one bite missing. It knows who did it. */
(() => {
  const chips = [[3, 3], [8, 4], [2, 8], [6, 9], [9, 8], [5, 2]];
  const body = art.outline(art.paint(13, 13, (x, y) => {
    if (!art.ellipse(x, y, 6.5, 6.5, 5.6, 5.6)) return null;
    if (art.ellipse(x, y, 11.5, 1.5, 3.2, 3.2)) return null;      /* the bite */
    if (chips.some(([cx, cy]) => cx === x && cy === y)) return 'c';
    return (x + y) % 7 === 0 ? 'C' : 'b';
  }));
  defineFigure('cookie', {
    w: 13, h: 13,
    tag: 'A chocolate chip cookie with one bite missing. It knows who did it.',
    palette: { k: '#17121f', b: '#e8a65a', C: '#f6c487', c: '#4a2a1a', w: '#ffffff', m: '#17121f' },
    frames: [art.compose(body, [3, 5, ['ww']], [3, 6, ['ww']], [7, 5, ['ww']], [7, 6, ['ww']], [5, 8, ['mm']])],
    eyes: [{ x: 3, y: 5, w: 2, h: 2 }, { x: 7, y: 5, w: 2, h: 2 }],
    lid: 'b'
  });
})();

/* ---- sprites/donut.js ---- */
/* DONUT: a strawberry donut with sprinkles. Has a hole in its life and is fine with it. */
(() => {
  const sprinkles = { '3,2': 'y', '6,1': 'b', '10,2': 'g', '12,4': 'y', '2,5': 'b', '11,6': 'w' };
  const body = art.outline(art.paint(15, 11, (x, y) => {
    if (!art.ellipse(x, y, 7.5, 5.5, 7, 5)) return null;
    if (art.ellipse(x, y, 7.5, 5, 1.9, 1.3)) return null;
    const frosted = y < 6 || (y === 6 && (x * 3) % 5 < 2);
    if (frosted) return sprinkles[x + ',' + y] || (x < 6 && y < 3 ? 'P' : 'p');
    return y > 8 ? 'D' : 'd';
  }));
  defineFigure('donut', {
    w: 15, h: 11,
    tag: 'A strawberry donut with sprinkles. Has a hole in its life and is fine with it.',
    palette: { k: '#17121f', p: '#ff9cc2', P: '#ffd1e3', d: '#e8a65a', D: '#c98a4e', y: '#ffd23f', b: '#58c8ff', g: '#7bd63a', w: '#ffffff' },
    frames: [art.compose(body, [3, 4, ['ww']], [3, 5, ['ww']], [10, 4, ['ww']], [10, 5, ['ww']])],
    eyes: [{ x: 3, y: 4, w: 2, h: 2 }, { x: 10, y: 4, w: 2, h: 2 }],
    lid: 'p'
  });
})();

/* ---- sprites/dragon.js ---- */
/* DRAGON: a pocket dragon. Flaps its little wings. Breathes a little fire now and then. */
(() => {
  const body = (wing, fire) => {
    let rows = art.outline(art.paint(18, 14, (x, y) => {
      if (art.ellipse(x, y, 7, 9, 4.6, 3.6)) return y >= 10 && x >= 5 && x <= 9 ? 'c' : 'g';      /* belly */
      if (art.ellipse(x, y, 12.5, 5, 3.4, 3)) return 'g';                                         /* head */
      if (x >= 14 && x <= 15 && y >= 5 && y <= 6) return 'g';                                      /* snout */
      if (y >= 7 && y <= 9 && x >= 0 && x <= 3 && y - 7 >= 3 - x) return 'g';                      /* tail */
      if ((x === 11 || x === 13) && y === 1) return 'G';                                          /* horns */
      /* wing up or down */
      if (wing ? (y >= 1 && y <= 5 && x >= 3 && x <= 8 && y >= 6 - (x - 3) * .9) : (y >= 4 && y <= 7 && x >= 2 && x <= 6 && y <= 3 + (6 - x))) return 'G';
      if (y === 13 && (x === 5 || x === 9)) return 'g';
      return null;
    }));
    if (fire) rows = art.compose(rows, [16, 4, ['y.']], [16, 5, ['oy']], [16, 6, ['y.']]);
    return rows;
  };
  defineFigure('dragon', {
    w: 18, h: 14, fps: 5,
    tag: 'A pocket dragon. Flaps its little wings. Breathes a little fire now and then.',
    palette: { k: '#17121f', g: '#25b89a', G: '#9be0c8', c: '#fff1de', y: '#ffd23f', o: '#ff7a2f', w: '#ffffff' },
    frames: [body(1), body(0), body(1), body(0), body(1), body(0), body(1, 1), body(0, 1)],
    eyes: [{ x: 12, y: 4, w: 2, h: 2 }],
    lid: 'g'
  });
})();

/* ---- sprites/egg.js ---- */
/* EGG: an egg with a crack and a lot of questions. */
defineFigure('egg', {
  w: 12, h: 14,
  tag: 'An egg with a crack and a lot of questions.',
  palette: { k: '#17121f', e: '#fff4dc', E: '#ffffff', d: '#ead6ad', w: '#ffffff', b: '#ffb3a0' },
  frames: [[
    '....kkkk....',
    '...keeeek...',
    '..keEeeeek..',
    '.keEekeeek..',
    '.keeeekekek.',
    'keewweewweek',
    'keewweewweek',
    'keeeeeeeeeek',
    'kebeeeeeebek',
    'keeeeeeeeeek',
    '.keeeeeeeek.',
    '.kdeeeeeedk.',
    '..kddddddk..',
    '...kkkkkk...'
  ]],
  eyes: [{ x: 3, y: 5, w: 2, h: 2 }, { x: 7, y: 5, w: 2, h: 2 }],
  pupilKey: 'k',
  lid: 'e'
});

/* ---- sprites/floppy.js ---- */
/* FLOPPY: a floppy disk who remembers when 1.44 MB was a lot. Also, the save icon. */
defineFigure('floppy', {
  w: 14, h: 14,
  tag: 'A floppy disk who remembers when 1.44 MB was a lot. Also, the save icon.',
  palette: { k: '#17121f', b: '#58c8ff', s: '#d9dde8', S: '#9aa3b5', l: '#ffffff', w: '#ffffff', p: '#ff9cc2' },
  frames: [[
    'kkkkkkkkkkkkk.',
    'kbbksssssskbbk',
    'kbbksSSssskbbk',
    'kbbksSSssskbbk',
    'kbbksssssskbbk',
    'kbbbkkkkkkbbbk',
    'kbbbbbbbbbbbbk',
    'kbbkkkkkkkkbbk',
    'kbbklllllllbbk'.slice(0, 14),
    'kbbklwwllwwlbk'.slice(0, 13) + 'k',
    'kbbklwwllwwlbk'.slice(0, 13) + 'k',
    'kbbklpllllplbk'.slice(0, 13) + 'k',
    'kbbklllkklllbk'.slice(0, 13) + 'k',
    'kkkkkkkkkkkkkk'
  ]],
  eyes: [{ x: 5, y: 9, w: 2, h: 2 }, { x: 9, y: 9, w: 2, h: 2 }],
  lid: 'l'
});

/* ---- sprites/heart.js ---- */
/* HEART: a like button with feelings. Beats. Gets a little bigger when you hover nearby. */
(() => {
  const heart = (big) => art.outline(art.paint(15, 13, (x, y) => {
    const s = big ? 1 : .9, cx = 7.5, cy = 7;
    const X = (x + .5 - cx) / (5.9 * s), Y = -(y + .5 - cy) / (5.4 * s);
    /* the classic implicit heart curve */
    const v = (X * X + Y * Y - 1) ** 3 - X * X * Y * Y * Y * 1.4;
    return v <= 0 ? ((x < 6 && y < 5) ? 'H' : 'r') : null;
  }));
  defineFigure('heart', {
    w: 15, h: 13, fps: 2.5,
    tag: 'A like button with feelings. Beats steadily, blushes easily.',
    palette: { k: '#17121f', r: '#ff4d6d', H: '#ffb3c0', w: '#ffffff' },
    frames: [heart(true), heart(false), heart(true), heart(true)].map(rows => art.compose(rows, [4, 6, ['ww']], [4, 7, ['ww']], [9, 6, ['ww']], [9, 7, ['ww']])),
    eyes: [{ x: 4, y: 6, w: 2, h: 2 }, { x: 9, y: 6, w: 2, h: 2 }],
    lid: 'r'
  });
})();

/* ---- sprites/inbox.js ---- */
/* INBOX: an envelope with a notification badge it cannot stop checking. */
(() => {
  const env = art.outline(art.paint(16, 13, (x, y) => {
    if (art.rrect(x, y, 1, 3, 14, 11, 1)) {
      /* the flap: a V from the top corners */
      const v = Math.abs(x - 7.5) * .62 + 3;
      return y <= v + .4 && y >= v - .6 ? 'k' : y < v ? 'E' : 'e';
    }
    return null;
  }));
  /* a red badge with a white 1 in it */
  const badge = () => art.compose(env, [12, 0, ['.rr.', 'rrrr', 'rrrr', '.rr.']], [13, 1, ['w', 'w']]);
  defineFigure('inbox', {
    w: 16, h: 13, fps: .8,
    tag: 'An envelope with a notification badge it cannot stop checking.',
    palette: { k: '#17121f', e: '#fff7ec', E: '#ffe3c2', r: '#ff4d6d', w: '#ffffff' },
    frames: [env, badge(), badge(), badge()],
    eyes: [{ x: 5, y: 8, w: 2, h: 2 }, { x: 9, y: 8, w: 2, h: 2 }],
    lid: 'e'
  });
})();

/* ---- sprites/loaf.js ---- */
/* LOAF: a ginger cat in its most efficient shape. Ears twitch when you're not looking. */
(() => {
  const base = [
    '.kk....kk.......',
    '.kok..kok.......',
    '.kbbbbbbbk......',
    'kbbbbbbbbbkkkkk.',
    'kbwwbbwwbbsbsbbk',
    'kbwwbbwwbbbbbbbk',
    'kbbbkpkbbbsbsbbk',
    'kbbbbbbbbbbbbbbk',
    'kdbbbbbbbbbbbdkk',
    '.kkkkkkkkkkkkkk.'
  ];
  defineFigure('loaf', {
    w: 16, h: 10, fps: 1.5,
    tag: 'A ginger cat in its most efficient shape. Ears twitch when you are not looking.',
    palette: { k: '#17121f', b: '#ffa94d', s: '#e07a1f', d: '#d9822b', o: '#ff9cc2', p: '#ff7aa8', w: '#ffffff' },
    frames: [base, base, base, art.put(base, 6, 0, ['...', 'kkk'])],
    eyes: [{ x: 2, y: 4, w: 2, h: 2 }, { x: 6, y: 4, w: 2, h: 2 }],
    lid: 'b'
  });
})();

/* ---- sprites/mochi.js ---- */
/* MOCHI: a soft pink rice cake. Squishy, blushy, easily delighted. */
defineFigure('mochi', {
  w: 14, h: 10,
  tag: 'A soft pink rice cake. Squishy, blushy, easily delighted.',
  palette: { k: '#17121f', b: '#ffc9dc', B: '#fff2f7', d: '#f39bbd', w: '#ffffff', p: '#ff7aa8' },
  frames: [[
    '....kkkkkk....',
    '..kkbbbbbbkk..',
    '.kbBBbbbbbbbk.',
    'kbBbbbbbbbbbbk',
    'kbbwwbbbbwwbbk',
    'kbbwwbbbbwwbbk',
    'kbpbbbkkbbbpbk',
    'kdbbbbbbbbbbdk',
    '.kddbbbbbbddk.',
    '..kkkkkkkkkk..'
  ]],
  eyes: [{ x: 3, y: 4, w: 2, h: 2 }, { x: 9, y: 4, w: 2, h: 2 }],
  lid: 'b'
});

/* ---- sprites/modem.js ---- */
/* MODEM: a dial-up modem. Its lights blink in a pattern only it understands. */
(() => {
  const body = art.outline(art.paint(18, 10, (x, y) => art.rrect(x, y, 1, 2, 16, 8, 1) ? (y <= 3 ? 'M' : 'm') : (y === 9 && (x === 3 || x === 14) ? 'm' : null)));
  const lights = pattern => [4, 7, 10, 13].reduce((r, x, i) => art.put(r, x, 7, [pattern[i] ? 'g' : 'd']), body);
  defineFigure('modem', {
    w: 18, h: 10, fps: 6,
    tag: 'A dial-up modem. Its lights blink in a pattern only it understands.',
    palette: { k: '#17121f', m: '#c9c3d6', M: '#ece8f3', g: '#c6f432', d: '#5c5470', w: '#ffffff' },
    frames: [[1, 0, 1, 0], [0, 1, 1, 0], [1, 1, 0, 1], [0, 0, 1, 1], [1, 0, 0, 1], [1, 1, 1, 1]].map(lights),
    eyes: [{ x: 5, y: 4, w: 2, h: 2 }, { x: 11, y: 4, w: 2, h: 2 }],
    lid: 'm', pupilKey: 'k'
  });
})();

/* ---- sprites/onigiri.js ---- */
/* ONIGIRI: a rice ball in a seaweed jacket. Calm, round-ish, triangular. */
defineFigure('onigiri', {
  w: 14, h: 12,
  tag: 'A rice ball in a seaweed jacket. Calm, round-ish, triangular.',
  palette: { k: '#17121f', w: '#ffffff', W: '#f1ece2', n: '#1f3b2c', N: '#2f5a43', p: '#ffb3c7' },
  frames: [[
    '......kk......',
    '.....kwwk.....',
    '....kwwwwk....',
    '...kwwwwwwk...',
    '..kwwwwwwwwk..',
    '..kwwwwwwwwk..',
    '.kwwwwwwwwwwk.',
    '.kwpwwwwwwpwk.',
    'kwwwwwkkwwwwwk',
    'kWwnNnnnnnnwWk',
    'kWwnnnnnnnnwWk',
    '.kkkkkkkkkkkk.'
  ]],
  eyes: [{ x: 3, y: 5, w: 3, h: 2 }, { x: 8, y: 5, w: 3, h: 2 }],
  pupil: { w: 2, h: 2 },
  lid: 'w'
});

/* ---- sprites/planet.js ---- */
/* PLANET: a small ringed planet. Spins slowly, shines a little, thinks big. */
(() => {
  const base = [
    '.....kkkkkk.....',
    '...kkppppppkk...',
    '..kpPPpppppppk..',
    '.kpPppppppppppk.',
    '.kppwwppppwwppk.',
    '.kppwwppppwwppk.',
    'kRRrrrrrrrrrrRRk',
    '.kkrrrrrrrrrrkk.',
    '..kdppppppppdk..',
    '...kddddddddk...',
    '.....kkkkkk.....'
  ];
  defineFigure('planet', {
    w: 16, h: 11, fps: 3,
    tag: 'A small ringed planet. Spins slowly, shines a little, thinks big.',
    palette: { k: '#17121f', p: '#a991ff', P: '#ddd3ff', d: '#7a5fe0', w: '#ffffff', r: '#ffd23f', R: '#fff0a0' },
    frames: [base, art.put(base, 5, 6, ['R']), art.put(base, 10, 6, ['R'])],
    eyes: [{ x: 4, y: 4, w: 2, h: 2 }, { x: 10, y: 4, w: 2, h: 2 }],
    lid: 'p'
  });
})();

/* ---- sprites/prompty.js ---- */
/* PROMPTY: a chat bubble who is always just about to reply. Thinking… thinking… */
(() => {
  const body = art.outline(art.paint(16, 13, (x, y) => {
    if (art.rrect(x, y, 1, 1, 14, 9, 3)) return 'b';
    if (y >= 10 && y <= 11 && x >= 3 && x <= 5 - (y - 10)) return 'b';                   /* the tail */
    return null;
  }));
  const dots = n => [4, 7, 10].reduce((r, x, i) => art.put(r, x, 7, [i < n ? 'kk' : 'BB']), body);
  defineFigure('prompty', {
    w: 16, h: 13, fps: 3,
    tag: 'A chat bubble who is always just about to reply. Thinking… thinking…',
    palette: { k: '#17121f', b: '#6b4cff', B: '#a995ff', w: '#ffffff' },
    frames: [0, 1, 2, 3].map(dots),
    eyes: [{ x: 4, y: 3, w: 3, h: 3 }, { x: 9, y: 3, w: 3, h: 3 }],
    pupil: { w: 2, h: 2 },
    lid: 'b', pupilKey: 'w', glint: null
  });
})();

/* ---- sprites/pudding.js ---- */
/* PUDDING: a caramel pudding on a plate. Cannot stop jiggling. */
(() => {
  const base = [
    '....kkkkkk....',
    '..kkcccccckk..',
    '.kcCCccccccck.',
    'kucccuucccuuuk',
    'kuuuuuuuuuuuuk',
    'kuuwwuuuuwwuuk',
    'kuuwwuuuuwwuuk',
    'kupuuukkuuupuk',
    'kduuuuuuuuuudk',
    'kdduuuuuuuuddk',
    '.kkkkkkkkkkkk.',
    'kssssssssssssk',
    '.kkkkkkkkkkkk.'
  ];
  /* jiggle: the caramel top slides a pixel one way, then the other */
  const jig = n => base.map((r, i) => i < 3 ? (n > 0 ? '.' + r.slice(0, -1) : r.slice(1) + '.') : r);
  defineFigure('pudding', {
    w: 14, h: 13, fps: 5,
    tag: 'A caramel pudding on a plate. Cannot stop jiggling.',
    palette: { k: '#17121f', c: '#b85c1f', C: '#e8964a', u: '#ffe08a', d: '#f0c25a', w: '#ffffff', p: '#ffb3a0', s: '#ece6f5' },
    frames: [base, base, jig(1), base, jig(-1), base, base, base],
    eyes: [{ x: 3, y: 5, w: 2, h: 2 }, { x: 9, y: 5, w: 2, h: 2 }],
    lid: 'u'
  });
})();

/* ---- sprites/robo.js ---- */
/* ROBO: a tiny robot head. Its antenna light blinks when it's thinking (always). */
(() => {
  const base = [
    '......rr......',
    '......kk......',
    '..kkkkkkkkkk..',
    '.kmmmmmmmmmmk.',
    '.kmMMmmmmmmmk.',
    'kkmwwwmmwwwmkk',
    'kkmwwwmmwwwmkk',
    '.kmmmmmmmmmmk.',
    '.kmmmkkkkmmmk.',
    '.kmmmmmmmmmmk.',
    '..kkkkkkkkkk..'
  ];
  defineFigure('robo', {
    w: 14, h: 11, fps: 2,
    tag: 'A tiny robot head. The antenna light means it is thinking. It is always thinking.',
    palette: { k: '#17121f', m: '#b8c4e0', M: '#eef2ff', w: '#e9fff7', r: '#ff4d6d', y: '#c6f432' },
    frames: [base, art.put(base, 6, 0, ['yy'])],
    eyes: [{ x: 3, y: 5, w: 3, h: 2 }, { x: 8, y: 5, w: 3, h: 2 }],
    pupil: { w: 2, h: 2 },
    lid: 'm'
  });
})();

/* ---- sprites/star.js ---- */
/* STAR: a little star who twinkles on purpose. Main-character energy. */
(() => {
  /* a five-pointed star, by point-in-polygon */
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 3.1 : 7.2, a = -Math.PI / 2 + i * Math.PI / 5;
    return [7.5 + Math.cos(a) * r, 8 + Math.sin(a) * r];
  });
  const inside = (x, y) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const body = art.outline(art.paint(15, 16, (x, y) => inside(x + .5, y + .5) ? (y < 7 && x < 7 ? 'Y' : 'y') : null));
  const glints = [[], [[1, 1], [13, 3]], [[13, 1], [1, 12], [14, 12]], [[0, 5]]];
  defineFigure('star', {
    w: 15, h: 16, fps: 3,
    tag: 'A little star who twinkles on purpose. Main-character energy.',
    palette: { k: '#17121f', y: '#ffd23f', Y: '#fff2a8', w: '#ffffff', p: '#ff9a5a' },
    frames: glints.map(g => g.reduce((rows, [x, y]) => art.put(rows, x, y, ['w']), art.compose(body, [5, 7, ['ww.ww'.replace('.', 'y')]], [5, 8, ['wwyww']], [6, 10, ['pkp'.replace(/p/g, 'y')]]))),
    eyes: [{ x: 5, y: 7, w: 2, h: 2 }, { x: 8, y: 7, w: 2, h: 2 }],
    lid: 'y'
  });
})();

/* ---- sprites/sushi.js ---- */
/* SUSHI: a piece of salmon nigiri wearing its fish like a very good blanket. */
(() => {
  const body = art.outline(art.paint(17, 11, (x, y) => {
    /* salmon draped over the top, stripes running across */
    if (art.rrect(x, y, 1, 1, 15, 4, 2)) return (x + y) % 4 === 0 ? 'O' : 'o';
    if (art.rrect(x, y, 2, 3, 14, 9, 2)) return 'w';
    return null;
  }));
  defineFigure('sushi', {
    w: 17, h: 11,
    tag: 'A piece of salmon nigiri wearing its fish like a very good blanket.',
    palette: { k: '#17121f', o: '#ff8a5a', O: '#ffd2b8', w: '#ffffff', p: '#ffb3c0' },
    frames: [art.compose(body, [3, 8, ['p']], [13, 8, ['p']], [8, 8, ['kk']])],
    eyes: [{ x: 4, y: 5, w: 3, h: 2 }, { x: 10, y: 5, w: 3, h: 2 }],
    pupil: { w: 2, h: 2 },
    lid: 'w'
  });
})();

/* ---- sprites/toast.js ---- */
/* TOAST: a slice of toast with a pat of butter slowly giving up. */
(() => {
  const base = [
    '..kkkk..kkkk..',
    '.kcccckkcccck.',
    'kcttttyyttttck',
    'kcttttyyttttck',
    'kcttwwttwwttck',
    'kcttwwttwwttck',
    'kctpttkkttptck',
    'kcttttttttttck',
    'kcttttttttttck',
    'kcttttttttttck',
    '.kcccccccccck.',
    '..kkkkkkkkkk..'
  ];
  defineFigure('toast', {
    w: 14, h: 12, fps: 1,
    tag: 'A slice of toast with a pat of butter slowly giving up.',
    palette: { k: '#17121f', c: '#c97a35', t: '#ffdca0', y: '#fff36b', w: '#ffffff', p: '#ffa06b' },
    frames: [base, art.put(base, 7, 4, ['y']), art.compose(base, [7, 4, ['y']], [7, 5, ['y']])],
    eyes: [{ x: 4, y: 4, w: 2, h: 2 }, { x: 8, y: 4, w: 2, h: 2 }],
    lid: 't'
  });
})();

/* ---- sprites/token.js ---- */
/* TOKEN: a little gold token that spins. Every model wants it. Context is everything. */
(() => {
  /* a spinning coin: the same disc squashed to different widths */
  const coin = w => art.outline(art.paint(14, 14, (x, y) => art.ellipse(x, y, 7, 7, Math.max(.8, 5.8 * w), 5.8) ? (Math.abs(x + .5 - 7) < 5.8 * w - 1.6 ? 'y' : 'd') : null));
  const face = rows => art.compose(rows, [5, 6, ['ww']], [5, 7, ['ww']], [8, 6, ['ww']], [8, 7, ['ww']]);
  defineFigure('token', {
    w: 14, h: 14, fps: 7,
    tag: 'A little gold token that spins. Every model wants it. Context is everything.',
    palette: { k: '#17121f', y: '#ffd23f', d: '#e09a12', w: '#ffffff' },
    frames: [face(coin(1)), face(coin(1)), face(coin(1)), coin(.7), coin(.35), coin(.12), coin(.35), coin(.7)],
    eyes: [{ x: 5, y: 6, w: 2, h: 2 }, { x: 8, y: 6, w: 2, h: 2 }],
    lid: 'y'
  });
})();

/* ---- sprites/ufo.js ---- */
/* UFO: a very small visitor. Came in peace, stayed for the cursor. */
(() => {
  const base = [
    '......kkkk......',
    '....kkggggkk....',
    '...kgwwggwwgk...',
    '...kgwwggwwgk...',
    '..kkggggggggkk..',
    '.kssSSssssssssk.',
    'kssssssssssssssk',
    'kdldddldddldddlk',
    '.kkkkkkkkkkkkkk.'
  ];
  defineFigure('ufo', {
    w: 16, h: 9, fps: 4,
    tag: 'A very small visitor. Came in peace, stayed for the cursor.',
    palette: { k: '#17121f', g: '#8ff0d8', w: '#ffffff', s: '#cbc4dc', S: '#f3f0f8', d: '#8a82a3', l: '#ffd23f' },
    frames: [base, art.put(base, 0, 7, ['kdddldddldddlddk'])],
    eyes: [{ x: 5, y: 2, w: 2, h: 2 }, { x: 9, y: 2, w: 2, h: 2 }],
    lid: 'g'
  });
})();

/* ---- sprites/wizard.js ---- */
/* WIZARD: a very small wizard whose hat does most of the work. Sparkles on request. */
(() => {
  const body = art.outline(art.paint(16, 18, (x, y) => {
    /* a tall, slightly bent hat */
    if (y <= 7 && Math.abs(x + .5 - (8 + (7 - y) * .25)) <= y * .55 + .6) return (x + y) % 5 === 0 ? 'S' : 'h';
    if (y === 8 && x >= 2 && x <= 13) return 'h';
    if (art.ellipse(x, y, 8, 11, 3.6, 2.8)) return 'f';                                        /* face */
    if (art.ellipse(x, y, 8, 15, 4.8, 2.8)) return y < 14 ? 'w' : 'r';                        /* beard + robe */
    return null;
  }));
  const sparkle = pts => pts.reduce((r, [x, y]) => art.put(r, x, y, ['S']), body);
  defineFigure('wizard', {
    w: 16, h: 18, fps: 3,
    tag: 'A very small wizard whose hat does most of the work. Sparkles on request.',
    palette: { k: '#17121f', h: '#6b4cff', S: '#ffd23f', f: '#ffd9b5', w: '#f3f0fa', r: '#6b4cff' },
    frames: [body, sparkle([[1, 2], [14, 6]]), sparkle([[0, 6], [15, 1]]), body],
    eyes: [{ x: 6, y: 10, w: 1, h: 2 }, { x: 9, y: 10, w: 1, h: 2 }],
    lid: 'f'
  });
})();

/* ---- powers/pix.js ---- */
/* PIX: play your page. A tiny hero in a red headband who can run and jump on your
 * headings, paragraphs, buttons and images. Click Pix to take control:
 *   ← → (or A D) run · ↑ W or Space jump, hold for higher, jump again in the air
 *   ↓ drops through a platform · Esc stops
 * Coins appear on your links and buttons; collect them all. Gamepads and touch work too.
 *
 *   coins="10"          how many coins to hide (0 = none)
 *   land="selector"     what counts as a platform (defaults to text, buttons, images, cards)
 *   play="click|keys"   keys: arrow keys start the game too (when nothing else has focus)
 *
 * Events: piix:play, piix:coin { got, total }, piix:win, piix:stop  */
(() => {
  const W = 17, H = 15;
  const TAILS = [
    [[3, 4], [2, 5], [3, 5], [2, 6]],
    [[3, 3], [2, 3], [1, 2], [3, 4], [2, 4]],
    [[3, 3], [2, 4], [1, 4], [3, 4], [2, 3]],
    [[3, 3], [2, 2], [1, 1], [3, 4], [2, 3]]
  ];
  const frame = ({ by = 0, tail = 0, feet = [], eyes = 'open' }) => {
    let rows = art.paint(W, H, (x, y) => {
      const yy = y - by;
      if (!art.ellipse(x, yy, 9.5, 7, 5.7, 5.4)) return null;
      return yy === 3 || yy === 4 ? 'r' : 'b';
    });
    rows = art.volume(rows);
    for (const [tx, ty] of TAILS[tail]) rows = art.put(rows, tx, ty + by, ['r']);
    rows = art.outline(rows);
    const ey = 6 + by;
    if (eyes === 'open') rows = art.compose(rows, [10, ey, ['e', 'e']], [13, ey, ['e', 'e']]);
    else if (eyes === 'shut') rows = art.compose(rows, [10, ey + 1, ['e']], [13, ey + 1, ['e']]);
    else if (eyes === 'happy') rows = art.compose(rows, [9, ey, ['_e_', 'e_e']], [12, ey, ['_e_', 'e_e']]);
    else if (eyes === 'wide') rows = art.compose(rows, [10, ey - 1, ['e', 'e', 'e']], [13, ey - 1, ['e', 'e', 'e']]);
    rows = art.compose(rows, [9, ey + 2, ['p']], [14, ey + 2, ['p']], [11, ey + 3, ['ee']]);
    for (const [fx, fy] of feet) rows = art.put(rows, fx, fy, ['k']);
    return rows;
  };
  const STAND = [[6, 13], [7, 13], [11, 13], [12, 13]];
  const PAL = { k: '#17121f', b: '#c6f432', d: '#8cc21e', B: '#effcb3', r: '#ff4d6d', e: '#17121f', p: '#ff9fb5' };
  defineSprite('pix', {
    w: W, h: H, scale: 3, does: 'player',
    palette: PAL,
    frames: {
      idle: [frame({ feet: STAND }), frame({ feet: STAND, tail: 0 }), frame({ feet: STAND, eyes: 'shut' }), frame({ feet: STAND })],
      run: [
        frame({ by: -1, tail: 1, feet: [[5, 12], [6, 12], [12, 12], [13, 12]] }),
        frame({ by: 0, tail: 2, feet: [[7, 13], [8, 13], [10, 13], [11, 13]] }),
        frame({ by: -1, tail: 1, feet: [[6, 12], [7, 12], [11, 12], [12, 12]] }),
        frame({ by: 0, tail: 2, feet: [[6, 13], [7, 13], [12, 13], [13, 13]] })
      ],
      jump: [frame({ by: -1, tail: 3, feet: [[7, 12], [8, 12], [10, 12], [11, 12]] })],
      fall: [frame({ tail: 3, eyes: 'wide', feet: [[5, 13], [6, 13], [12, 13], [13, 13]] })],
      happy: [frame({ feet: STAND, eyes: 'happy' }), frame({ by: -1, tail: 3, eyes: 'happy', feet: [[6, 12], [7, 12], [11, 12], [12, 12]] })]
    },
    fps: { idle: 1.5, run: 12, happy: 5 }
  });

  /* coins: a spinning gold piece (crew only) */
  const coin = [
    ['.kkkk.', 'kyYYyk', 'kYyyok', 'kYyyok', 'kYyyok', 'kyyook', '.kkkk.'],
    ['.kkk..', '.kYyk.', '.kYyk.', '.kYyk.', '.kYyk.', '.kyok.', '.kkk..'],
    ['..kk..', '..ky..', '..ky..', '..ky..', '..ky..', '..ko..', '..kk..'],
    ['..kkk.', '.kyYk.', '.kyYk.', '.kyYk.', '.kyYk.', '.koyk.', '..kkk.']
  ];
  defineSprite('_coin', {
    w: 6, h: 7, scale: 3,
    palette: { k: '#17121f', y: '#ffd23f', Y: '#fff3a8', o: '#e8a213' },
    frames: { spin: coin, flat: [coin[0]] },
    fps: { spin: 8 }
  });
})();

ICONS.play = ['k...', 'kk..', 'kkk.', 'kkkk', 'kkk.', 'kk..', 'k...'];

/* player: the platformer brain behind Pix. Platforms are every line of text and the top
 * of every button, image and card; they're one-way, so you jump up through them. */
const PIX_PLAYERS = new Set();
const PIX_KEYS = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', Space: 'u', ArrowDown: 'd', KeyS: 'd' };
const pixEditable = t => !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
/* scroll without the page's smooth-scrolling getting in the way */
const pixScrollTo = y => {
  const h = document.documentElement, was = h.style.scrollBehavior;
  h.style.scrollBehavior = 'auto';
  window.scrollTo(scrollX, y);
  h.style.scrollBehavior = was;
};
defineBehavior('player', (a, [el], host) => {
  const S = a.s / 3;
  const boxEl = boxOf(host);
  const sel = host.getAttribute('land') || LAND;
  const nCoins = host.hasAttribute('coins') ? clamp(Math.round(+host.getAttribute('coins') || 0), 0, 40) : 10;
  const RUN = 215 * S, ACC = 1800 * S, AIR = 1150 * S, DEC = 2300 * S, G = 2350 * S, JUMP = 745 * S, CUT = 260 * S, MAXF = 1300 * S;
  let playing = false, placed = false, vx = 0, vy = 0, ground = null, coyote = 0, buffer = 0, jumps = 0, dropT = 0;
  let spin = 0, platT = 0, plats = [], bumps = [], hintT = 0, happyT = 0, prevU = false, jumpTap = false;
  const keys = new Set(), touch = {};
  const crew = [], coins = [];
  let hud = null, pad = null, got = 0, total = 0;

  /* ---- the level: every line of text, every box top ---- */
  const lines = (e, out) => {
    const rg = document.createRange();
    rg.selectNodeContents(e);
    const rs = [...rg.getClientRects()].filter(q => q.width > 2 && q.height > 2);
    if (!rs.length) return false;
    const fs = parseFloat(getComputedStyle(e).fontSize) || 16;
    const ls = [];
    for (const q of rs) {
      const L = ls.find(l => Math.min(l.b, q.bottom) - Math.max(l.t, q.top) > Math.min(l.b - l.t, q.height) * .5);
      if (L) { L.l = Math.min(L.l, q.left); L.r = Math.max(L.r, q.right); L.t = Math.min(L.t, q.top); L.b = Math.max(L.b, q.bottom); }
      else ls.push({ l: q.left, r: q.right, t: q.top, b: q.bottom });
    }
    for (const L of ls) out.push({ el: e, l: L.l + scrollX, r: L.r + scrollX, t: L.t + scrollY + (L.b - L.t - fs) / 2 + fs * .26 });
    return true;
  };
  const measure = () => {
    const out = [], bs = [];
    const root = boxEl || document;
    const lo = boxEl ? -1e9 : scrollY - innerHeight * 1.2, hi = boxEl ? 1e9 : scrollY + innerHeight * 2.2;
    let els = [];
    try { els = [...root.querySelectorAll(sel)]; } catch (_) { /* bad selector */ }
    for (const e of els) {
      if (e.closest('piix-pal,[data-piixpal]')) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 8 || r.height < 4 || r.bottom + scrollY < lo || r.top + scrollY > hi) continue;
      if (TEXTY.test(e.tagName) && lines(e, out)) continue;
      out.push({ el: e, l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY });
    }
    try {
      for (const e of root.querySelectorAll('a[href],button,.btn,[data-piix-bump]')) {
        const r = e.getBoundingClientRect();
        if (r.width < 4 || r.bottom + scrollY < lo || r.top + scrollY > hi) continue;
        bs.push({ el: e, l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY, b: r.bottom + scrollY, cool: 0 });
      }
    } catch (_) { /* ignore */ }
    for (const b of bs) { const old = bumps.find(o => o.el === b.el); if (old) b.cool = old.cool; }
    plats = out; bumps = bs;
  };
  const world = () => {
    if (boxEl) { const r = rectOf(boxEl); return { l: r.l + a.w / 2, r: r.r - a.w / 2, top: r.t + a.h, floor: r.b - 2 }; }
    return { l: a.w / 2, r: docW() - a.w / 2, top: -1e9, floor: document.documentElement.scrollHeight - 2 };
  };
  const groundAt = (x, y, W) => {
    let best = null;
    for (const p of plats) if (x >= p.l - 3 && x <= p.r + 3 && Math.abs(p.t - y) <= 6 && (!best || Math.abs(p.t - y) < Math.abs(best.t - y))) best = p;
    if (!best && Math.abs(W.floor - y) <= 6) best = { t: W.floor, l: -1e9, r: 1e9, floor: true };
    return best;
  };
  const land = (p, impact) => {
    a.y = p.t; ground = p; vy = 0; jumps = 0;
    if (spin) { spin = 0; a.rot = 0; a.cv.style.transformOrigin = ''; }
    if (impact > 520 * S) { a.sy = .76; a.sx = 1.24; }
    if (impact > 950 * S) shout(a, 'thud', 200 * S);
  };

  /* ---- coins ---- */
  const spawnCoins = () => {
    const cands = [];
    try {
      for (const e of (boxEl || document).querySelectorAll('a[href],button,.btn,h1,h2,h3,[data-piix-coin]')) {
        if (e.closest('piix-pal,[data-piixpal]')) continue;
        const r = e.getBoundingClientRect();
        if (r.width < 12 || r.height < 6) continue;
        if (!boxEl && (r.bottom < -innerHeight * .3 || r.top > innerHeight * 1.3)) continue;
        cands.push(r);
      }
    } catch (_) { /* ignore */ }
    for (let i = cands.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [cands[i], cands[j]] = [cands[j], cands[i]]; }
    const B = boxEl && rectOf(boxEl);
    for (const r of cands) {
      if (coins.length >= nCoins) break;
      const x = r.left + scrollX + rnd(.2, .8) * r.width;
      let y = r.top + scrollY - 14 * S;
      /* not right where Pix is standing: that one would be free */
      if (Math.abs(x - a.x) < 50 * S && Math.abs(y - a.y) < 60 * S) continue;
      const c = recruit(a, '_coin');
      if (B) y = Math.max(y, B.t + c.h + 4);
      c.x = x; c.y = y; c.play('spin', { fps: rnd(7, 10) });
      coins.push({ c, x, y, ph: rnd(0, 6.28), t: -1 });
      crew.push(c);
    }
    got = 0; total = coins.length;
  };
  const collect = k => {
    if (k.t >= 0) return;
    k.t = 0; got++;
    host.dispatchEvent(new CustomEvent('piix:coin', { bubbles: true, detail: { got, total } }));
    hudUpdate();
    if (got === total && total) {
      happyT = 2.4; a.say('star', 2200);
      host.dispatchEvent(new CustomEvent('piix:win', { bubbles: true, detail: { total } }));
      uiAnnounce(`All ${total} coins!`);
    }
  };

  /* ---- HUD and touch pad ---- */
  const hudUpdate = () => {
    if (!hud) return;
    hud.querySelector('.n').textContent = total ? (got === total ? `all ${total} coins!` : `${got} / ${total} coins`) : 'free play';
  };
  const placeHud = () => {
    if (!hud) return;
    /* in a box: top-left of the box; on the page: the bottom-left of the screen */
    const r = boxEl ? rectOf(boxEl) : { l: origin.x, t: origin.y, r: origin.x + docW(), b: origin.y + innerHeight };
    if (boxEl) uiAt(hud, r.l + 10, r.t + 10); else uiAt(hud, r.l + 14, r.b - hud.offsetHeight - 14);
    if (pad) uiAt(pad, r.r - pad.offsetWidth - (boxEl ? 10 : 14), r.b - pad.offsetHeight - (boxEl ? 10 : 14));
  };
  const showHud = () => {
    hud = uiCard({ fixed: !boxEl, attrs: { role: 'group', 'aria-label': 'Pix controls' } });
    hud.style.padding = '9px 11px';
    hud.append(
      uiEl('div', { cls: 'ic', style: 'align-items:center;gap:8px' }, uiIcon('play', 2), uiEl('b', { cls: 'n', text: '' }),
        uiEl('button', { text: 'Stop', attrs: { type: 'button' }, style: 'margin-left:auto;padding:6px 9px', on: { click: () => me.stop() } })),
      uiEl('div', { text: '← → run · ↑ jump · ↓ drop · Esc', style: `margin-top:6px;font:600 11px/1 ${UI_MONO};color:#6c6477` })
    );
    hudUpdate();
    if (matchMedia('(pointer: coarse)').matches) {
      pad = uiCard({ fixed: !boxEl, attrs: { role: 'group', 'aria-label': 'Touch controls' } });
      pad.style.cssText += ';padding:8px;display:flex;gap:8px;touch-action:none;user-select:none;-webkit-user-select:none';
      for (const [k, label] of [['l', '◀'], ['r', '▶'], ['u', '▲']]) {
        const b = uiEl('button', { text: label, attrs: { type: 'button', 'aria-label': { l: 'left', r: 'right', u: 'jump' }[k] }, style: 'width:54px;height:54px;font-size:20px;touch-action:none' });
        const on = e => { e.preventDefault(); touch[k] = true; if (k === 'u') jumpTap = true; try { b.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } };
        const off = () => { touch[k] = false; };
        b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
        pad.appendChild(b);
      }
    }
    placeHud();
  };

  /* ---- start / stop ---- */
  const me = {
    get playing() { return playing; },
    start() {
      if (playing) return;
      PIX_PLAYERS.forEach(p => p !== me && p.stop());
      playing = true;
      measure(); spawnCoins(); showHud();
      vy = -JUMP * .55; ground = null; a.say('!', 600);
      host.dispatchEvent(new CustomEvent('piix:play', { bubbles: true }));
      uiAnnounce('Playing Pix. Arrow keys to run and jump, Escape to stop.' + (total ? ` ${total} coins to find.` : ''));
    },
    stop() {
      if (!playing) return;
      playing = false; keys.clear(); for (const k in touch) touch[k] = false;
      coins.splice(0).forEach(k => k.c.destroy()); crew.length = 0;
      uiClose(hud); uiClose(pad); hud = pad = null;
      host.dispatchEvent(new CustomEvent('piix:stop', { bubbles: true, detail: { got, total } }));
    }
  };
  PIX_PLAYERS.add(me);
  const kd = e => {
    if (pixEditable(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = PIX_KEYS[e.code];
    if (!playing) {
      if (!k || host.getAttribute('play') !== 'keys') return;
      const r = boxEl ? boxEl.getBoundingClientRect() : null;
      const seen = r ? r.bottom > 0 && r.top < innerHeight : a.y > scrollY && a.y - a.h < scrollY + innerHeight;
      if (!seen || [...PIX_PLAYERS].some(p => p.playing)) return;
      me.start();
    }
    if (e.key === 'Escape') { me.stop(); return; }
    if (!k) return;
    e.preventDefault();
    if (k === 'u' && !e.repeat) jumpTap = true;
    keys.add(k);
  };
  const ku = e => { const k = PIX_KEYS[e.code]; if (k) keys.delete(k); };
  const blur = () => keys.clear();
  addEventListener('keydown', kd);
  addEventListener('keyup', ku);
  addEventListener('blur', blur);

  let gpStart = false, gpJump = false;
  const gamepad = () => {
    const gps = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const g = gps[0];
    if (!g) return null;
    const b = i => !!(g.buttons[i] && g.buttons[i].pressed);
    return { l: g.axes[0] < -.35 || b(14), r: g.axes[0] > .35 || b(15), u: b(0) || b(12), d: g.axes[1] > .6 || b(13), start: b(9) };
  };

  return {
    crew,
    awake: () => playing,
    start: () => me.start(),
    stop: () => me.stop(),
    get playing() { return playing; },
    tick(dt) {
      const W0 = world();
      if (!placed) {
        const r = surfaceOf(el) || rectOf(el), at = host.getAttribute('at');
        a.x = clamp(r.l + (r.r - r.l) * (at != null ? clamp(+at, 0, 1) : .5), W0.l, W0.r); a.y = r.t;
        placed = true; measure(); ground = groundAt(a.x, a.y, W0);
      }
      platT -= dt;
      if (platT <= 0) { measure(); platT = playing ? .25 : .7; }

      /* input: keys, touch pad, gamepad */
      const gp = gamepad();
      if (gp && gp.start && !gpStart && !playing) me.start();
      if (gp && gp.u && !gpJump && playing) jumpTap = true;
      gpStart = !!(gp && gp.start); gpJump = !!(gp && gp.u);
      const inp = playing
        ? { l: keys.has('l') || touch.l || (gp && gp.l), r: keys.has('r') || touch.r || (gp && gp.r), u: keys.has('u') || touch.u || (gp && gp.u), d: keys.has('d') || touch.d || (gp && gp.d) }
        : {};
      const tap = jumpTap;
      jumpTap = false;

      /* run */
      const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
      if (dir) { vx = clamp(vx + dir * (ground ? ACC : AIR) * dt, -RUN, RUN); a.face = dir; }
      else if (ground) { const dv = DEC * dt; vx = Math.abs(vx) <= dv ? 0 : vx - Math.sign(vx) * dv; }
      else vx *= Math.exp(-1.5 * dt);

      /* jump: buffered, with coyote time, and one flip in the air */
      if (tap) buffer = .13;
      buffer -= dt;
      coyote = ground ? .09 : coyote - dt;
      if (buffer > 0 && (coyote > 0 || jumps < 2)) {
        const first = coyote > 0;
        vy = -JUMP * (first ? 1 : .86);
        jumps = first ? 1 : 2; ground = null; coyote = 0; buffer = 0;
        a.sy = 1.2; a.sx = .84;
        if (!first) { spin = 1; a.cv.style.transformOrigin = '50% 55%'; }
      }
      if (playing && !inp.u && vy < -CUT) vy = -CUT;
      if (inp.d && ground && !ground.floor) { ground = null; dropT = .24; vy = 60 * S; }
      dropT -= dt;

      /* move */
      const y0 = a.y;
      a.x += vx * dt;
      if (a.x < W0.l) { a.x = W0.l; vx = 0; }
      if (a.x > W0.r) { a.x = W0.r; vx = 0; }
      if (ground) {
        const p = groundAt(a.x, a.y, W0);
        if (p) { a.y = p.t; ground = p; } else ground = null;
      }
      if (!ground) {
        vy = Math.min(vy + G * dt, MAXF);
        a.y += vy * dt;
        if (a.y - a.h < W0.top) { a.y = W0.top + a.h; vy = Math.max(vy, 0); }
        if (vy < 0) {
          /* bonk links and buttons from below; a coin sitting on one pops out */
          const head = a.y - a.h, head0 = y0 - a.h;
          for (const b of bumps) {
            if (b.cool > 0 || a.x < b.l || a.x > b.r || !(b.b <= head0 && b.b >= head)) continue;
            b.cool = .4;
            try { b.el.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-6 * S}px)` }, { transform: 'translateY(0)' }], { duration: 200, easing: 'ease-out' }); } catch (_) { /* old browsers */ }
            for (const k of coins) if (k.t < 0 && k.x >= b.l - 6 && k.x <= b.r + 6 && k.y <= b.t + 4 && k.y >= b.t - 60 * S) collect(k);
          }
        } else {
          let best = null;
          for (const p of plats) {
            if (a.x < p.l - 3 || a.x > p.r + 3) continue;
            if (dropT > 0 && p.t <= y0 + 8) continue;
            if (p.t >= y0 - .5 && p.t <= a.y && (!best || p.t < best.t)) best = p;
          }
          if (!best && a.y >= W0.floor) best = { t: W0.floor, l: -1e9, r: 1e9, floor: true };
          if (best) land(best, vy);
        }
      }
      for (const b of bumps) b.cool -= dt;

      /* the camera follows while playing */
      if (playing && !boxEl) {
        const sy = a.y - a.h / 2 - scrollY, top = innerHeight * .3, bot = innerHeight * .7;
        const want = sy < top ? sy - top : sy > bot ? sy - bot : 0;
        if (Math.abs(want) > 1) pixScrollTo(scrollY + (reduced() ? want : want * Math.min(1, dt * 7)));
      }

      /* coins: bob, get collected, fly up and fade */
      for (let i = coins.length - 1; i >= 0; i--) {
        const k = coins[i];
        if (k.t < 0) {
          k.ph += dt * 3;
          k.c.x = k.x; k.c.y = k.y + Math.sin(k.ph) * 2 * S;
          if (Math.abs(k.c.x - a.x) < (a.w + k.c.w) * .42 && k.c.y > a.y - a.h - 2 && k.c.y - k.c.h < a.y + 2) collect(k);
        } else {
          k.t += dt;
          k.c.y = k.y - k.t * 120 * S; k.c.play('spin', { fps: 24 });
          k.c.node.style.opacity = Math.max(0, 1 - k.t / .45).toFixed(2);
          if (k.t > .45) { k.c.destroy(); coins.splice(i, 1); crew.splice(crew.indexOf(k.c), 1); }
        }
      }

      /* look */
      a.sx = lerp(a.sx, 1, .22); a.sy = lerp(a.sy, 1, .22);
      if (spin > 0) { spin = Math.max(0, spin - dt * 3.2); a.rot = (1 - spin) * 360 * a.face; if (!spin) { a.rot = 0; a.cv.style.transformOrigin = ''; } }
      happyT -= dt;
      if (!ground) a.play(vy < 0 ? 'jump' : 'fall');
      else if (Math.abs(vx) > 18 * S) a.play('run', { fps: 7 + Math.abs(vx) / RUN * 7 });
      else if (happyT > 0) a.play('happy');
      else {
        a.play('idle');
        if (!playing && ptr.seen && ptrDist(a.x, a.y - a.h / 2) < 140 * S) a.face = ptr.x < a.x ? -1 : 1;
      }
      if (!playing) {
        hintT -= dt;
        if (hintT <= 0 && a.near(24 * S)) { a.say('play', 1400); hintT = 4; }
      }
      placeHud();
    },
    poke() { if (playing) jumpTap = true; else me.start(); },
    hear(type) { if (type === 'thud' && ground && !playing) { vy = -260 * S; ground = null; } },
    destroy() {
      me.stop(); PIX_PLAYERS.delete(me);
      removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('blur', blur);
    }
  };
});

K.start(document.currentScript);
})();
