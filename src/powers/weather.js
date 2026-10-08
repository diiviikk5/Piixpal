/* WEATHER: pixel weather that knows where your text is.   @component weather
 *
 *   <piix-weather kind="snow"></piix-weather>
 *
 * Snow settles on the real shapes of your letters, piles up, slides off the edges and
 * falls through the gaps; sweep the cursor through it to brush it off. Rain splashes on
 * whatever it hits. Leaves and petals come to rest on your headings and blow away when
 * you wave the cursor near them. Moving the cursor stirs the air.
 *
 *   kind      snow | rain | leaves | petals                   default: snow
 *   amount    0–3, how much falls                              default: 1
 *   land      CSS selector for what it settles on
 *   box       keep it inside one element. Put the tag inside an element (not <body>)
 *             and it stays in that element too.
 *
 *   el.clear()   brush everything off */
const WX_LAND = 'h1,h2,h3,h4,p,li,button,.btn,img,pre,blockquote,figure,.card,[data-piix-land]';
const WX_KINDS = {
  snow: { n: 150, fall: [26, 58], sway: [6, 20], fr: [.6, 1.6], heap: true },
  rain: { n: 120, fall: [640, 860], sway: [0, 0], fr: [0, 0], splash: true },
  leaves: { n: 24, fall: [34, 64], sway: [22, 52], fr: [.7, 1.4], rest: 26 },
  petals: { n: 46, fall: [22, 44], sway: [16, 38], fr: [.8, 1.8], rest: 14 }
};
/* little sprites for leaves and petals: rows of palette keys (a = fill, b = edge) */
const WX_SPRITES = {
  leaves: [['.bb.', 'baab', 'baab', '.bb.'], ['bbb.', 'baab', '.bab'], ['.b..', 'bab.', 'baab', '.bb.'], ['bb..', 'baab', '.bbb']],
  petals: [['bb.', 'bab', '.b.'], ['.bb', 'bab', 'bb.'], ['bb', 'ab']]
};
const WX_LEAF_COLORS = [['#f08a24', '#a8501a'], ['#d9452b', '#8c2a1b'], ['#f2c037', '#a77c13'], ['#b5652e', '#6e3a17']];
const WX_PETAL_COLORS = [['#ffc4d3', '#e98aa6'], ['#ffd6e1', '#ef9ab3'], ['#ffffff', '#f0a7bd']];

class PiixWeatherElement extends HTMLElement {
  static get observedAttributes() { return ['kind', 'amount']; }
  connectedCallback() {
    this.style.display = 'none';
    cancelAnimationFrame(this._q);
    this._q = requestAnimationFrame(() => { this._q = requestAnimationFrame(() => this._start()); });
  }
  disconnectedCallback() { cancelAnimationFrame(this._q); this._stop(); }
  attributeChangedCallback(n, a, b) { if (a !== b && this._on) { this._stop(); this._start(); } }
  /* brush everything off */
  clear() { if (this._surfs) for (const s of this._surfs.values()) s.h.fill(0); if (this._parts) this._parts.forEach(p => { p.rest = null; }); }

  _start() {
    if (this._on || !this.isConnected || reduced()) return;
    this._on = true;
    const kind = WX_KINDS[this.getAttribute('kind')] ? this.getAttribute('kind') : 'snow';
    const K = WX_KINDS[kind];
    const amount = this.hasAttribute('amount') ? clamp(+this.getAttribute('amount') || 0, 0, 3) : 1;
    const par = this.parentElement;
    const box = boxOf(this) || (par && par !== document.body && par !== document.documentElement ? par : null);
    const land = this.getAttribute('land') || WX_LAND;
    const P = 3;                                 /* one weather pixel, in CSS px */
    const MAXH = 4;                              /* snow piles up to this many pixels */
    const surfs = this._surfs = new Map();
    const parts = this._parts = [];
    const cache = new WeakMap();
    const view = () => box ? rectOf(box) : { l: scrollX, t: scrollY, r: scrollX + docW(), b: scrollY + innerHeight, w: docW(), h: innerHeight };

    const cv = this._cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = `position:${box ? 'absolute' : 'fixed'};left:0;top:0;pointer-events:none;image-rendering:pixelated;image-rendering:crisp-edges`;
    getLayer().appendChild(cv);
    const g = cv.getContext('2d');

    /* light or dark page? pick colours that show up on it */
    let C = null, cT = 0;
    const colours = () => {
      let el = box || document.body, rgb = null;
      while (el && !rgb) {
        const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
        if (m && (m.length < 4 || +m[3] > .5)) rgb = m.map(Number);
        el = el.parentElement;
      }
      const light = !rgb || (rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114) > 140;
      C = light
        ? { flake: '#9fb4d3', core: '#ffffff', heap: '#ffffff', edge: '#a9bedb', rain: '#5b8fd6' }
        : { flake: '#ffffff', core: '#ffffff', heap: '#f4f7fc', edge: '#c3d1e6', rain: '#8fb8ee' };
    };

    /* where things can land: per-pixel-column tops of headings (letter by letter) and boxes */
    const measure = () => {
      const V = view();
      let els = [];
      try { els = [...(box || document).querySelectorAll(land)]; } catch (_) { /* bad selector */ }
      for (const el of els) {
        if (el.closest('piix-pal,piix-weather,[data-piixpal]')) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 6 || r.height < 4) continue;
        if (r.top + scrollY > V.b + 60 || r.bottom + scrollY < V.t - 60 || r.right + scrollX < V.l || r.left + scrollX > V.r) continue;
        let segs = null, top = 0, L, R;
        if (/^H[1-4]$/.test(el.tagName) || (TEXTY.test(el.tagName) && el.textContent.trim().length < 40)) {
          if (!cache.has(el)) cache.set(el, {});
          const tp = textProfile(el, cache.get(el));
          if (tp) { segs = tp.segs; L = tp.l; R = tp.r; }
        }
        if (!segs) { const sf = surfaceOf(el); if (!sf) continue; L = sf.l; R = sf.r; top = sf.t; }
        L = Math.max(L, V.l); R = Math.min(R, V.r);
        const c0 = Math.floor(L / P), n = Math.floor(R / P) - c0 + 1;
        if (n < 2 || n > 3000) continue;
        let s = surfs.get(el);
        if (!s || s.c0 !== c0 || s.n !== n) {
          const old = s;
          s = { el, c0, n, base: new Float32Array(n), h: new Uint8Array(n) };
          if (old) for (let i = 0; i < n; i++) { const j = Math.round(i * old.n / n); if (j < old.n) s.h[i] = old.h[j]; }
          surfs.set(el, s);
        }
        for (let i = 0; i < n; i++) {
          const x = (c0 + i + .5) * P;
          const t = segs ? segAt(segs, x) : top;
          s.base[i] = t == null ? NaN : t;
          if (t == null) s.h[i] = 0;
        }
      }
      for (const [el, s] of surfs) if (!el.isConnected) surfs.delete(el);
    };

    /* particles */
    const spawn = (p, V, anywhere) => {
      p.x = rnd(V.l - 30, V.r + 30);
      p.y = anywhere ? rnd(V.t, V.b) : V.t - rnd(4, 60);
      p.vy = rnd(K.fall[0], K.fall[1]);
      p.sw = rnd(K.sway[0], K.sway[1]); p.fr = rnd(K.fr[0], K.fr[1]); p.ph = rnd(0, 6.28); p.t = 0;
      p.ix = 0; p.iy = 0; p.rest = null; p.life = 0;
      p.big = kind === 'snow' && chance(.22);
      p.len = rnd(3, 6) | 0;
      const spr = WX_SPRITES[kind];
      if (spr) { p.spr = (Math.random() * spr.length) | 0; p.col = pick(kind === 'leaves' ? WX_LEAF_COLORS : WX_PETAL_COLORS); }
      p.splash = 0;
      return p;
    };
    const V0 = view();
    const N = Math.round(K.n * amount * (box ? Math.min(1, (V0.w * V0.h) / (1280 * 800) * 1.6) : 1));
    for (let i = 0; i < N; i++) parts.push(spawn({}, V0, true));
    const drops = [];    /* rain splashes and brushed-off snow */

    /* settle one pixel of snow at column i, letting it roll to a lower neighbour */
    const heapAdd = (s, i) => {
      for (const j of chance(.5) ? [i - 1, i + 1] : [i + 1, i - 1]) {
        if (j >= 0 && j < s.n && !isNaN(s.base[j]) && s.h[j] + 1 < s.h[i]) { i = j; break; }
      }
      if (s.h[i] < MAXH) { s.h[i]++; return true; }
      return false;
    };
    const hit = (p, y0) => {
      const c = Math.floor(p.x / P);
      let best = null, bi = 0, bt = 0;
      for (const s of surfs.values()) {
        const i = c - s.c0;
        if (i < 0 || i >= s.n) continue;
        const b = s.base[i];
        if (isNaN(b)) continue;
        const top = b - s.h[i] * P;
        if (y0 <= top && p.y >= top && (!best || top < bt)) { best = s; bi = i; bt = top; }
      }
      return best ? { s: best, i: bi, top: bt } : null;
    };

    let mT = 0, wind = 0, gust = rnd(0, 9);
    const tick = (dt, t) => {
      if (!this.isConnected) return;
      const V = view();
      if (box) { const br = box.getBoundingClientRect(); if (br.bottom < -50 || br.top > innerHeight + 50) return; }
      mT -= dt; if (mT <= 0) { measure(); mT = .5; }
      cT -= dt; if (cT <= 0 || !C) { colours(); cT = 2; }
      /* size and place the canvas */
      const cw = Math.ceil(V.w / P), ch = Math.ceil(V.h / P);
      if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; cv.style.width = cw * P + 'px'; cv.style.height = ch * P + 'px'; }
      if (box) cv.style.transform = `translate3d(${Math.round(V.l - origin.x)}px,${Math.round(V.t - origin.y)}px,0)`;

      /* wind: slow gusts, plus whatever the cursor stirs up */
      gust += dt * .3;
      wind = Math.sin(gust) * (kind === 'rain' ? 60 : 14) + Math.sin(gust * 2.7) * 6;
      const px = ptr.x, py = ptr.y, sp = Math.hypot(ptr.vx, ptr.vy);
      const ptrIn = ptr.seen && ptr.cx > -1e4 && px >= V.l && px <= V.r && py >= V.t && py <= V.b;

      /* brush snow off with a quick swipe */
      if (ptrIn && sp > 220 && now() - ptr.last < 60) {
        const c = Math.floor(px / P), R = 5;
        for (const s of surfs.values()) {
          for (let i = c - R - s.c0; i <= c + R - s.c0; i++) {
            if (i < 0 || i >= s.n || !s.h[i]) continue;
            const b = s.base[i];
            if (py < b - s.h[i] * P - 22 || py > b + 12) continue;
            for (let k = 0; k < s.h[i]; k++) if (drops.length < 300) drops.push({ x: (s.c0 + i) * P, y: b - (k + 1) * P, vx: ptr.vx * rnd(.15, .4) + rnd(-30, 30), vy: -rnd(60, 160) - Math.abs(ptr.vy) * .1, life: rnd(.5, .9), snow: 1 });
            s.h[i] = 0;
          }
        }
      }

      /* move */
      for (const p of parts) {
        if (p.rest) {
          /* resting leaves ride their surface; a nearby swipe blows them off */
          const s = p.rest.s, b = s.base[p.rest.i];
          p.life += dt;
          if (!s.el.isConnected || isNaN(b) || p.life > K.rest) { spawn(p, V, false); continue; }
          p.y = b;
          if (ptrIn && sp > 140 && Math.abs(px - p.x) < 40 && Math.abs(py - p.y) < 30) {
            p.rest = null; p.ix = ptr.vx * rnd(.3, .6); p.iy = -rnd(80, 200); p.t = 0;
          }
          continue;
        }
        p.t += dt;
        if (ptrIn && sp > 60) {
          const dx = p.x - px, dy = p.y - py, d2 = dx * dx + dy * dy;
          if (d2 < 4900) { const k = (1 - d2 / 4900) * dt * 5; p.ix += ptr.vx * k; p.iy += ptr.vy * k * .6; }
        }
        p.ix *= Math.exp(-2.4 * dt); p.iy *= Math.exp(-2.4 * dt);
        p.ix = clamp(p.ix, -600, 600); p.iy = clamp(p.iy, -400, 400);
        const y0 = p.y;
        p.x += (wind + Math.cos(p.t * p.fr + p.ph) * p.sw * p.fr + p.ix) * dt;
        p.y += (p.vy + p.iy) * dt;
        const h = hit(p, y0);
        if (h) {
          if (K.heap) { if (heapAdd(h.s, h.i)) { spawn(p, V, false); continue; } }
          else if (K.splash) {
            for (let k = 0; k < 3; k++) if (drops.length < 300) drops.push({ x: p.x, y: h.top - 1, vx: rnd(-70, 70), vy: -rnd(70, 150), life: rnd(.25, .4) });
            spawn(p, V, false); continue;
          } else { p.rest = h; p.y = h.top; p.life = 0; continue; }
        }
        if (p.y > V.b + 12 || p.x < V.l - 60 || p.x > V.r + 60) spawn(p, V, false);
      }
      /* snow slides: piles round off, and spill over edges and gaps */
      if (K.heap) for (const s of surfs.values()) {
        for (let k = 0; k < 2; k++) {
          const i = (Math.random() * s.n) | 0;
          if (s.h[i] < 2) continue;
          const j = chance(.5) ? i - 1 : i + 1;
          const gap = j < 0 || j >= s.n || isNaN(s.base[j]);
          if (gap) {
            s.h[i]--;
            if (drops.length < 300) drops.push({ x: (s.c0 + i) * P + (j < i ? -P : P), y: s.base[i] - s.h[i] * P, vx: (j < i ? -1 : 1) * rnd(10, 30), vy: 0, life: 2, snow: 1, fall: true });
          } else if (s.h[i] - s.h[j] >= 2) { s.h[i]--; s.h[j]++; }
        }
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.life -= dt; d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.life <= 0 || d.y > V.b + 10) drops.splice(i, 1);
      }

      /* draw */
      g.clearRect(0, 0, cw, ch);
      const X = x => Math.floor((x - V.l) / P), Y = y => Math.floor((y - V.t) / P);
      if (K.heap) {
        for (const s of surfs.values()) {
          for (let i = 0; i < s.n; i++) {
            const hh = s.h[i];
            if (!hh) continue;
            const b = s.base[i];
            if (isNaN(b) || b < V.t - 20 || b > V.b + 20) continue;
            const x = X((s.c0 + i) * P + 1), yb = Math.round((b - V.t) / P);
            g.fillStyle = C.heap; g.fillRect(x, yb - hh, 1, hh);
            g.fillStyle = C.edge; g.fillRect(x, yb - hh - 1, 1, 1);
            const l = i > 0 ? s.h[i - 1] : 0, r = i + 1 < s.n ? s.h[i + 1] : 0;
            if (l < hh) g.fillRect(x - 1, yb - hh, 1, hh - l);
            if (r < hh) g.fillRect(x + 1, yb - hh, 1, hh - r);
          }
        }
      }
      for (const p of parts) {
        const x = X(p.x), y = Y(p.y);
        if (kind === 'snow') {
          if (p.big) { g.fillStyle = C.flake; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); g.fillStyle = C.core; g.fillRect(x, y, 1, 1); }
          else { g.fillStyle = C.flake; g.fillRect(x, y, 1, 1); }
        } else if (kind === 'rain') {
          g.fillStyle = C.rain; g.globalAlpha = .85;
          const lean = Math.round(wind / 120);
          for (let k = 0; k < p.len; k++) g.fillRect(x - Math.round(lean * k / p.len), y - k, 1, 1);
          g.globalAlpha = 1;
        } else {
          const rows = WX_SPRITES[kind][p.spr];
          const flip = p.rest ? 0 : Math.floor(p.t * p.fr * 2 + p.ph) % 2;
          const h = rows.length;
          for (let ry = 0; ry < h; ry++) {
            const row = rows[flip ? h - 1 - ry : ry];
            for (let rx = 0; rx < row.length; rx++) {
              const ch2 = row[rx];
              if (ch2 === '.') continue;
              g.fillStyle = ch2 === 'a' ? p.col[0] : p.col[1];
              g.fillRect(x + rx - 1, y + ry - h, 1, 1);
            }
          }
        }
      }
      for (const d of drops) {
        g.fillStyle = d.snow ? C.flake : C.rain;
        g.fillRect(X(d.x), Y(d.y), 1, 1);
      }
    };
    this._tick = tick;
    sub(tick);
  }
  _stop() {
    if (!this._on) return;
    this._on = false;
    unsub(this._tick);
    if (this._cv) this._cv.remove();
    this._cv = this._surfs = this._parts = null;
  }
}
define('piix-weather', PiixWeatherElement);
ELEMENTS.weather = 'piix-weather';
