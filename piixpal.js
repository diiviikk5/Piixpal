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
  destroy() { clearTimeout(this._bt); this.node.remove(); ACTORS.delete(this); }
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

/* ---- elements/sprite.js ---- */
/* <piix-sprite name="mochi" size="96"></piix-sprite>
 * Small, self-contained pixel characters you can paste anywhere: they sit inline like an
 * image. Eyes follow the cursor, they blink, breathe a pixel, hop when clicked and nap
 * when nobody's around.
 *
 *   name         which sprite (see Piixpal.figures)
 *   size         width in px (snapped to whole sprite pixels)   default: 5 × sprite width
 *   scale        or give the pixel size directly
 *   hue          recolour, degrees
 *   look         mouse | wander | none                          default: mouse
 *   shy          leans away when the cursor gets close
 *   tilt         leans toward the cursor
 *   still        no breathing or hopping
 *   sleep-after  seconds of no input before napping, 0 = never  default: 25
 *
 * Figure spec: { w, h, palette, frames:[rows…], fps, eyes:[{x,y,w,h}], pupil:{w,h}, lid:'b' } */
const FIGURES = {};
const defineFigure = (name, spec) => {
  spec.name = name;
  spec.pupil = spec.pupil || { w: 1, h: 1 };
  spec._baked = null;
  FIGURES[name] = spec;
  return spec;
};
const bakeFigure = spec => {
  if (!spec._baked) {
    const pal = {};
    for (const k in spec.palette) pal[k] = hexRGBA(spec.palette[k]);
    spec._baked = spec.frames.map(rows => bake(rows, pal, spec.w, spec.h));
  }
  return spec._baked;
};
const HEAD = 3; /* rows of headroom above the sprite for breathing and z's */

class PiixSpriteElement extends HTMLElement {
  static get observedAttributes() { return ['name', 'size', 'scale', 'hue']; }
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

  _build() {
    const spec = this._spec = FIGURES[this.getAttribute('name')] || FIGURES[Object.keys(FIGURES)[0]];
    if (!spec) return;
    this._frames = bakeFigure(spec);
    const size = +this.getAttribute('size');
    const s = this._s = +this.getAttribute('scale') || (size ? Math.max(1, Math.round(size / spec.w)) : 5);
    const W = spec.w, H = spec.h + HEAD;
    this.shadowRoot.innerHTML = `<style>
:host{display:inline-block;line-height:0;vertical-align:bottom;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.w{display:block;transform-origin:50% 100%;will-change:transform}
canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges;margin-top:${-HEAD * s}px}
</style><div class="w"><canvas width="${W}" height="${H}" style="width:${W * s}px;height:${H * s}px"></canvas></div>`;
    this._wrap = this.shadowRoot.querySelector('.w');
    this._cv = this.shadowRoot.querySelector('canvas');
    if (this.getAttribute('hue')) this._cv.style.filter = `hue-rotate(${+this.getAttribute('hue')}deg)`;
    this._g = this._cv.getContext('2d');
    this._key = '';
    this._fi = 0; this._ox = 0; this._oy = 0; this._tilt = 0;
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
    if (t > this._nextBlink) { this._blinkEnd = t + 130; this._nextBlink = t + rnd(2400, 6000); }
    const eyes = asleep ? 'shut' : t < this._happy ? 'happy' : t < this._blinkEnd ? 'shut' : 'open';

    /* idle frames and a one-pixel breath */
    const fps = spec.fps || 2;
    const fi = R || spec.frames.length < 2 ? 0 : Math.floor(t / 1000 * fps * (asleep ? .4 : 1)) % spec.frames.length;
    const still = R || this.hasAttribute('still');
    const breath = still ? 0 : Math.floor(t / (asleep ? 1400 : 760)) % 2;
    const z = asleep && !R ? Math.floor(t / 700) % 3 : -1;
    const px = Math.round((gx + 1) / 2 * (spec.eyes[0] ? spec.eyes[0].w - spec.pupil.w : 0));
    const py = Math.round((gy + 1) / 2 * (spec.eyes[0] ? spec.eyes[0].h - spec.pupil.h : 0));
    const key = [fi, breath, eyes, px, py, z].join();
    if (key !== this._key) { this._key = key; this._draw(fi, breath, eyes, px, py, z); }

    /* body motion */
    let tx = 0, ty = 0, sx = 1, sy = 1, tilt = 0;
    if (!still) {
      if (this.hasAttribute('tilt') && tracking && !asleep) tilt = clamp(vx / (innerWidth * .4), -1, 1) * 8;
      if (this.hasAttribute('shy') && ptr.seen && !asleep) {
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
    this._wrap.style.transform = `translate(${this._ox.toFixed(1)}px,${oy.toFixed(1)}px) rotate(${this._tilt.toFixed(1)}deg) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
  }

  _draw(fi, breath, eyes, px, py, z) {
    const spec = this._spec, g = this._g, y0 = HEAD - breath;
    g.clearRect(0, 0, spec.w, spec.h + HEAD);
    g.drawImage(this._frames[fi], 0, y0);
    const ink = spec.palette.k || '#17121f', lid = spec.palette[spec.lid] || ink;
    for (const e of spec.eyes) {
      const x = e.x, y = e.y + y0;
      if (eyes === 'open') {
        g.fillStyle = spec.palette[spec.pupilKey || 'k'] || ink;
        g.fillRect(x + px, y + py, spec.pupil.w, spec.pupil.h);
      } else {
        g.fillStyle = lid; g.fillRect(x, y, e.w, e.h);
        g.fillStyle = ink;
        if (eyes === 'shut') g.fillRect(x, y + e.h - 1, e.w, 1);
        else { /* happy: an upside-down U */
          const top = y + Math.max(0, e.h - 2);
          g.fillRect(x, top, e.w, 1); g.fillRect(x, y + e.h - 1, 1, 1); g.fillRect(x + e.w - 1, y + e.h - 1, 1, 1);
        }
      }
    }
    if (z >= 0) {
      /* a little "z" drifting up in the headroom */
      g.fillStyle = ink;
      const zx = spec.w - 4 + (z > 1 ? 1 : 0), zy = 2 - z;
      g.fillRect(zx, zy + 0, 3, 1); g.fillRect(zx + 1, zy + 1, 1, 1); g.fillRect(zx, zy + 2, 3, 1);
    }
  }
}
Piixpal.figures = FIGURES;
Piixpal.figure = defineFigure;

/* ---- elements/type.js ---- */
/* <piix-type text="PIIXPAL" rows="18" cell="8" color="#16111f" shade="#c6f432" depth="1" fit>
 * Any font, rasterised into chunky blocks with an extruded shadow.
 * Pixels rain in on load, lift off their shadow around the cursor, and ripple when clicked.
 * Exposes piixSurface(x) so pals can walk on the actual letter tops. */
class PiixTypeElement extends HTMLElement {
  static get observedAttributes() { return ['text', 'rows', 'cell', 'font', 'weight', 'color', 'shade', 'depth', 'gap', 'fit', 'align', 'intro']; }
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
    /* shadow layer stays on the ground */
    if (shade && dep) {
      g.fillStyle = shade;
      for (const p of this._cells) {
        if (!p.landed && p.oy < -cell) continue;
        g.fillRect(p.x * cell + dep, head + p.y * cell + dep + Math.round(Math.min(0, p.oy)), s, s);
      }
    }
    g.fillStyle = ink;
    for (const p of this._cells) {
      const y = head + p.y * cell + Math.round(p.oy - p.lift);
      if (y + s < 0) continue;
      g.fillRect(p.x * cell, y, s, s);
    }
  }
}

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
if (typeof PiixSpriteElement !== 'undefined') define('piix-sprite', PiixSpriteElement);
})();
