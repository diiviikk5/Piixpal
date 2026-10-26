/* AQUA: the engine under the ASCII water components (pond, shoal).   @component aqua
 * A grid of glyphs on a canvas, creatures with a spine that are rasterised into that grid cell
 * by cell (shaded with glyph ramps, patterned, finned), fish that school like real fish
 * (align, cohere, keep apart, mill), and two fields that live on the grid: ripples (a damped
 * wave equation) and a wake that spreads and fades behind whatever swims.
 * With thanks to stackedlol/ascii-sharks for the idea of drawing sea life this way. */

const AQ_FONT = 'ui-monospace,"SF Mono","Cascadia Mono",Menlo,Consolas,monospace';

/* a glyph grid: put() cells, flush() draws them in as few colour batches as it can */
class AQGrid {
  constructor(cv, cell = 14) {
    this.cv = cv; this.g = cv.getContext('2d'); this.cell = cell;
    this.batches = new Map(); this.cols = 0; this.rows = 0; this.cw = 8; this.ch = cell; this.dpr = 1;
  }
  resize(w, h) {
    const dpr = this.dpr = Math.min(2, devicePixelRatio || 1);
    this.cv.width = Math.max(1, Math.round(w * dpr)); this.cv.height = Math.max(1, Math.round(h * dpr));
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    const g = this.g;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.font = `600 ${this.cell * .82}px ${AQ_FONT}`;
    this.cw = Math.max(5, g.measureText('M').width); this.ch = this.cell;
    this.cols = Math.ceil(w / this.cw); this.rows = Math.ceil(h / this.ch);
    this.w = w; this.h = h;
  }
  put(c, r, glyph, color) {
    let b = this.batches.get(color);
    if (!b) this.batches.set(color, (b = []));
    b.push(c, r, glyph);
  }
  flush(bg) {
    const g = this.g;
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, this.w, this.h); } else g.clearRect(0, 0, this.w, this.h);
    g.font = `600 ${this.cell * .82}px ${AQ_FONT}`; g.textBaseline = 'middle'; g.textAlign = 'center';
    for (const [color, b] of this.batches) {
      g.fillStyle = color;
      for (let i = 0; i < b.length; i += 3) g.fillText(b[i + 2], (b[i] + .5) * this.cw, (b[i + 1] + .5) * this.ch);
      b.length = 0;
    }
  }
}
/* colours as rgba strings, with the alpha rounded so batches stay few */
const AQ_RGBA = new Map();
const aqColor = (r, g, b, a = 1) => {
  r = r & 255; g = g & 255; b = b & 255; a = Math.round(clamp(a, 0, 1) * 12) / 12;
  const k = (r << 16 | g << 8 | b) * 16 + Math.round(a * 12);
  let s = AQ_RGBA.get(k);
  if (!s) AQ_RGBA.set(k, (s = `rgba(${r},${g},${b},${a.toFixed(3)})`));
  return s;
};
/* a cheap, stable hash and smooth value noise */
const aqHash = (x, y, z = 0) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const aqNoise = (x, y, z = 0) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = aqHash(xi, yi, z), b = aqHash(xi + 1, yi, z), c = aqHash(xi, yi + 1, z), d = aqHash(xi + 1, yi + 1, z);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
/* a slowly turning, divergence-free current (the curl of a drifting stream function) */
const aqCurrent = (x, y, t, out) => {
  const a = x / 260 + t * .07, b = y / 310 - t * .05, c = (x + y) / 190 + t * .11;
  out.x = (-Math.sin(a) * Math.sin(b) / 310 + .5 * Math.cos(c) / 190) * 3400;
  out.y = (-Math.cos(a) * Math.cos(b) / 260 - .5 * Math.cos(c) / 190) * 3400;
  return out;
};

/* ---------- a field on the grid: ripples (wave equation) or wake (diffuse and fade) ---------- */
class AQField {
  constructor() { this.cols = 0; this.rows = 0; }
  resize(cols, rows) { this.cols = cols; this.rows = rows; this.a = new Float32Array(cols * rows); this.b = new Float32Array(cols * rows); }
  add(c, r, v) { c |= 0; r |= 0; if (c >= 0 && r >= 0 && c < this.cols && r < this.rows) this.a[r * this.cols + c] += v; }
  get(c, r) { c |= 0; r |= 0; return c >= 0 && r >= 0 && c < this.cols && r < this.rows ? this.a[r * this.cols + c] : 0; }
  /* ripples: the classic two-buffer wave, damped */
  wave(damp = .985) {
    const { cols, rows, a, b } = this;
    for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
      const i = r * cols + c;
      b[i] = ((a[i - 1] + a[i + 1] + a[i - cols] + a[i + cols]) * .5 - b[i]) * damp;
    }
    this.a = b; this.b = a;
  }
  /* wake: blur into the neighbours, then fade */
  spread(keep = .93) {
    const { cols, rows, a, b } = this;
    for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
      const i = r * cols + c;
      b[i] = (a[i] * .6 + (a[i - 1] + a[i + 1] + a[i - cols] + a[i + cols]) * .1) * keep;
    }
    this.a = b; this.b = a;
  }
}

/* ---------- a creature with a spine: the head steers, every node follows the one in front ---------- */
class AQSpine {
  constructor({ x, y, len = 120, nodes = 14, heading = 0, width, pattern, fins = 'koi', speed = 60, seed = Math.random() * 1000 }) {
    this.len = len; this.n = nodes; this.seg = len / (nodes - 1);
    this.width = width || (s => .11 * Math.sin(Math.PI * Math.pow(Math.min(1, s), .7)) + .02);
    this.pattern = pattern; this.fins = fins; this.speed = speed; this.seed = seed;
    this.heading = heading; this.turn = 0; this.t = Math.random() * 10; this.gulp = 0;
    this.pts = Array.from({ length: nodes }, (_, i) => ({ x: x - Math.cos(heading) * this.seg * i, y: y - Math.sin(heading) * this.seg * i }));
  }
  get head() { return this.pts[0]; }
  /* steer toward a point, turning at most `agility` radians a second, swimming with a wiggle */
  steer(tx, ty, dt, speed = this.speed, agility = 2.2) {
    const h = this.pts[0];
    const want = Math.atan2(ty - h.y, tx - h.x);
    let d = want - this.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.turn = clamp(d, -agility * dt, agility * dt);
    this.heading += this.turn;
    this.t += dt * (1.5 + speed / 40);
    const wig = Math.sin(this.t * 3.2) * .35;
    h.x += Math.cos(this.heading + wig * .3) * speed * dt;
    h.y += Math.sin(this.heading + wig * .3) * speed * dt;
    this.follow();
  }
  follow() {
    for (let i = 1; i < this.n; i++) {
      const a = this.pts[i - 1], b = this.pts[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      b.x = a.x + dx / d * this.seg; b.y = a.y + dy / d * this.seg;
    }
  }
  /* nearest point on the spine to (px, py): s along it (0 head .. 1 tail), distance, and which side */
  nearest(px, py) {
    let best = 1e9, bs = 0, side = 1;
    for (let i = 0; i < this.n - 1; i++) {
      const a = this.pts[i], b = this.pts[i + 1], ex = b.x - a.x, ey = b.y - a.y, l2 = ex * ex + ey * ey || 1;
      let u = ((px - a.x) * ex + (py - a.y) * ey) / l2; u = u < 0 ? 0 : u > 1 ? 1 : u;
      const qx = a.x + ex * u - px, qy = a.y + ey * u - py, d = qx * qx + qy * qy;
      if (d < best) { best = d; bs = (i + u) / (this.n - 1); side = ex * (py - a.y) - ey * (px - a.x) > 0 ? 1 : -1; }
    }
    return [bs, Math.sqrt(best), side];
  }
  /* rasterise into the grid. paint(c, r, glyph, color) */
  draw(grid, paint, light = 1) {
    const { cw, ch } = grid, L = this.len, maxW = L * .2;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of this.pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    const pad = maxW + L * .14;
    const c0 = Math.max(0, Math.floor((x0 - pad) / cw)), c1 = Math.min(grid.cols - 1, Math.ceil((x1 + pad) / cw));
    const r0 = Math.max(0, Math.floor((y0 - pad) / ch)), r1 = Math.min(grid.rows - 1, Math.ceil((y1 + pad) / ch));
    const tail = this.pts[this.n - 1], pre = this.pts[this.n - 2], tdx = tail.x - pre.x, tdy = tail.y - pre.y, tl = Math.hypot(tdx, tdy) || 1;
    const sway = Math.sin(this.t * 3.2 + 1.2) * .5;
    /* the pectoral fins: at a quarter of the way down, flapping */
    const fi = Math.max(1, Math.round((this.n - 1) * .24)), fa = this.pts[fi - 1], fb = this.pts[fi], fdx = fa.x - fb.x, fdy = fa.y - fb.y, fl = Math.hypot(fdx, fdy) || 1;
    const flap = .55 + Math.sin(this.t * 2.4) * .35;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const px = (c + .5) * cw, py = (r + .5) * ch;
      const [s, d, side] = this.nearest(px, py);
      const hw = this.width(s) * L;
      let part = 0, v = 0;
      if (d <= hw && s < .995) { part = 1; v = d / hw * side; }
      else if (this.fins) {
        /* the tail fan, past the last node, swaying */
        const ux = tdx / tl, uy = tdy / tl, rx = px - tail.x, ry = py - tail.y, along = rx * ux + ry * uy, across = -rx * uy + ry * ux;
        const spread = along * (this.fins === 'manta' ? .3 : .9), off = along * sway;
        if (along > -2 && along < L * (this.fins === 'manta' ? .3 : .17) && Math.abs(across - off) < spread + 1.5) { part = 2; v = (across - off) / (spread + 1.5); }
        else if (this.fins === 'koi') {
          /* pectoral fins, either side, swept back */
          const nx = -fdy / fl, ny = fdx / fl;
          for (const sg of [-1, 1]) {
            const bx = fb.x + nx * sg * this.width(.24) * L, by = fb.y + ny * sg * this.width(.24) * L;
            const qx = px - bx, qy = py - by, a2 = qx * nx * sg + qy * ny * sg, b2 = -(qx * fdx + qy * fdy) / fl;
            if (a2 > 0 && a2 < L * .12 * flap && b2 > -1 && b2 < a2 * .9 + 1) { part = 3; v = a2 / (L * .12); }
          }
        }
      }
      if (!part) continue;
      paint(c, r, s, v, part, light);
    }
  }
}

/* ---------- schools: many little fish, each a glyph; obstacles and predators steer them ---------- */
class AQSchool {
  constructor(n, { x, y, w, h, kind = 'sardine' }) {
    const K = {
      sardine: { cruise: 46, max: 120, align: 1.6, cohesion: .9, sep: 28, mill: 40, jitter: 30, rgb: [150, 190, 230] },
      anchovy: { cruise: 56, max: 140, align: 3, cohesion: .4, sep: 26, mill: 0, jitter: 24, rgb: [120, 220, 210] },
      goby: { cruise: 34, max: 110, align: .4, cohesion: .9, sep: 28, mill: 0, jitter: 90, rgb: [240, 190, 90] },
      neon: { cruise: 50, max: 130, align: 2.2, cohesion: .7, sep: 24, mill: 30, jitter: 35, rgb: [80, 230, 255] }
    }[kind] || {};
    this.k = K;
    const a = Math.random() * Math.PI * 2;
    this.fish = Array.from({ length: n }, () => ({ x: x + Math.random() * w * .2, y: y + Math.random() * h * .2, vx: Math.cos(a) * K.cruise, vy: Math.sin(a) * K.cruise, glint: 0 }));
  }
  /* one step. avoid(x, y) -> [ax, ay] pushes away from walls, text and predators */
  step(dt, avoid, t) {
    const F = this.fish, K = this.k, R = 64, R2 = R * R, cur = { x: 0, y: 0 };
    let mx = 0, my = 0;
    for (const f of F) { mx += f.x; my += f.y; }
    mx /= F.length; my /= F.length;
    for (const f of F) {
      let ax = 0, ay = 0, n = 0, cx = 0, cy = 0, vx = 0, vy = 0;
      for (const o of F) {
        if (o === f) continue;
        const dx = o.x - f.x, dy = o.y - f.y, d2 = dx * dx + dy * dy;
        if (d2 > R2) continue;
        n++; cx += o.x; cy += o.y; vx += o.vx; vy += o.vy;
        if (d2 < K.sep * K.sep) { const d = Math.sqrt(d2) || 1; ax -= dx / d * (K.sep - d) * 9; ay -= dy / d * (K.sep - d) * 9; }
      }
      if (n) {
        ax += (vx / n - f.vx) * K.align + (cx / n - f.x) * K.cohesion;
        ay += (vy / n - f.vy) * K.align + (cy / n - f.y) * K.cohesion;
      }
      /* a mill: swing round the school's centre */
      if (K.mill) { const dx = f.x - mx, dy = f.y - my, d = Math.hypot(dx, dy) || 1; ax += -dy / d * K.mill; ay += dx / d * K.mill; }
      aqCurrent(f.x, f.y, t, cur); ax += cur.x * .4; ay += cur.y * .4;
      ax += (Math.random() - .5) * K.jitter * 2; ay += (Math.random() - .5) * K.jitter * 2;
      const [px, py, scare] = avoid(f.x, f.y);
      ax += px; ay += py;
      const pv = Math.hypot(f.vx, f.vy);
      f.vx += ax * dt; f.vy += ay * dt;
      /* fish swim level: damp the vertical a little */
      f.vy *= Math.pow(.6, dt);
      let sp = Math.hypot(f.vx, f.vy) || 1;
      const want = clamp(sp, K.cruise * .6, (scare ? K.max : K.cruise * 1.4));
      f.vx = f.vx / sp * want; f.vy = f.vy / sp * want;
      f.glint = Math.max(f.glint * Math.pow(.02, dt), Math.abs(sp - pv) > 25 || scare ? 1 : 0);
      f.x += f.vx * dt; f.y += f.vy * dt;
    }
  }
}
/* a little fish, as one glyph pointing the way it swims */
const aqFishGlyph = (vx, vy) => {
  const a = Math.atan2(vy, vx * 1.6), o = ((a / Math.PI * 4 + 8.5) | 0) % 8;
  return ['-', '\\', '|', '/', '-', '\\', '|', '/'][o];
};
/* push away from a rectangle (x0, y0, x1, y1) within `reach` */
const aqRectPush = (x, y, rc, reach, k, out) => {
  const qx = clamp(x, rc[0], rc[2]), qy = clamp(y, rc[1], rc[3]), dx = x - qx, dy = y - qy, d = Math.hypot(dx, dy);
  if (d > reach) return 0;
  if (d < .01) {
    /* inside: out the nearest side */
    const l = x - rc[0], r = rc[2] - x, t = y - rc[1], b = rc[3] - y, m = Math.min(l, r, t, b);
    if (m === l) out[0] -= k * 2; else if (m === r) out[0] += k * 2; else if (m === t) out[1] -= k * 2; else out[1] += k * 2;
    return 1;
  }
  const f = k * Math.pow(1 - d / reach, 2);
  out[0] += dx / d * f; out[1] += dy / d * f;
  return f / k;
};
