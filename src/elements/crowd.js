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
