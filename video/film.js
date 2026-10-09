/* Piixpal launch film: every frame is a pure function of time T (seconds), drawn on one canvas.
 * The pals are the real ones from the library; big 3D sprites are live <piix-sprite> elements. */
const W = 1920, H = 1080, DUR = 38;
const cv = document.getElementById('c'), g = cv.getContext('2d');
const C = {
  ink: '#17121f', ink2: '#2b2436', deep: '#100c16', paper: '#f3eee3', card: '#fbf8f1', muted: '#6c6477', soft: '#cdc6da',
  line: '#d8cfbd', lime: '#c6f432', lime2: '#a8d81c', coral: '#ff6b4a', violet: '#6b4cff', sky: '#58c8ff', sun: '#ffd23f', mint: '#25b89a', white: '#ffffff'
};
const SANS = '"Bricolage Grotesque"', PIX = 'Silkscreen', MONO = '"JetBrains Mono"';

/* ---------- time ---------- */
const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const prog = (T, a, b) => cl((T - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const E = {
  outExpo: k => k >= 1 ? 1 : 1 - Math.pow(2, -10 * k),
  outCubic: k => 1 - Math.pow(1 - k, 3),
  inCubic: k => k * k * k,
  inOut: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
  outBack: k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  outElastic: k => k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - .75) * (2 * Math.PI / 3)) + 1
};

/* ---------- colour ---------- */
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => { const A = rgb(a), B = rgb(b); return 'rgb(' + A.map((v, i) => Math.round(lerp(v, B[i], cl(k)))).join(',') + ')'; };

/* ---------- pals ---------- */
const S = Piixpal.sprites, BAKED = {};
const baked = name => {
  if (BAKED[name]) return BAKED[name];
  const sp = S[name], out = {};
  for (const clip in sp.frames) out[clip] = sp.frames[clip].map(rows => {
    const c = document.createElement('canvas'); c.width = sp.w; c.height = sp.h;
    const x = c.getContext('2d'), pad = sp.h - rows.length;
    rows.forEach((row, ry) => { for (let i = 0; i < row.length; i++) { const col = sp.palette[row[i]]; if (col) { x.fillStyle = col; x.fillRect(i, ry + pad, 1, 1); } } });
    return c;
  });
  return (BAKED[name] = out);
};
/* draw a pal standing at (x, y): bottom-centre, or centre with o.center. t drives the clip */
function pal(name, clip, t, x, y, s, o = {}) {
  const sp = S[name], b = baked(name), fr = b[clip] || b[Object.keys(b)[0]];
  const f = typeof sp.fps === 'object' ? sp.fps[clip] : sp.fps;
  const img = fr[o.frame != null ? o.frame % fr.length : Math.floor(Math.max(0, t) * (o.fps || f || 6)) % fr.length];
  g.save();
  g.translate(x, y);
  if (o.rot) g.rotate(o.rot);
  g.scale((o.flip ? -1 : 1) * (o.sx ?? 1), o.sy ?? 1);
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  g.imageSmoothingEnabled = false;
  if (o.shadow) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-sp.w * s * .4, -2, sp.w * s * .8, 6); }
  g.drawImage(img, -sp.w * s / 2, o.center ? -sp.h * s / 2 : -sp.h * s, sp.w * s, sp.h * s);
  g.restore();
}
const size = name => S[name];

/* ---------- type ---------- */
const font = (px, w = 800, fam = SANS) => `${w} ${px}px ${fam}`;
function text(str, x, y, { size = 80, weight = 800, fam = SANS, color = C.white, align = 'left', alpha = 1, track = 0, base = 'alphabetic' } = {}) {
  g.save();
  g.font = font(size, weight, fam); g.letterSpacing = track + 'px';
  g.fillStyle = color; g.textAlign = align; g.textBaseline = base; g.globalAlpha *= alpha;
  g.fillText(str, x, y);
  g.restore();
}
function measure(str, size, weight = 800, fam = SANS, track = 0) {
  g.save(); g.font = font(size, weight, fam); g.letterSpacing = track + 'px';
  const m = g.measureText(str); g.restore();
  return { w: m.width, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
}
/* words that rise out of a mask one after another, and leave the same way */
function words(list, T, { x, y, size = 110, weight = 800, fam = SANS, color = C.white, align = 'center', t0 = 0, stagger = .08, dur = .6, out = null, track = null }) {
  const items = list.map(s => typeof s === 'string' ? { w: s } : s);
  g.save();
  g.font = font(size, weight, fam); g.letterSpacing = (track ?? -size * .035) + 'px';
  const sp = size * .26, ws = items.map(it => g.measureText(it.w).width);
  const total = ws.reduce((a, b) => a + b, 0) + sp * (items.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  items.forEach((it, i) => {
    const st = it.at ?? t0 + i * stagger;
    const pin = E.outExpo(prog(T, st, st + dur));
    const po = out == null ? 0 : E.inCubic(prog(T, out + i * stagger * .5, out + i * stagger * .5 + .3));
    if (pin > 0 && po < 1) {
      g.save();
      g.beginPath(); g.rect(cx - size, y - size * 1.1, ws[i] + size * 2, size * 1.45); g.clip();
      g.fillStyle = it.color || color;
      g.fillText(it.w, cx, y + (1 - pin) * size * 1.25 - po * size * 1.35);
      g.restore();
    }
    cx += ws[i] + sp;
  });
  g.restore();
  return total;
}
function rrect(x, y, w, h, r, fill, stroke, lw = 4) {
  g.beginPath(); g.roundRect(x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}
/* a chunky pill with the site's hard ink shadow */
function pill(str, cx, cy, { size = 34, fam = MONO, weight = 600, bg = C.lime, fg = C.ink, pad = 30, k = 1, shadow = C.ink } = {}) {
  const m = measure(str, size, weight, fam), w = m.w + pad * 2, h = size * 2;
  g.save(); g.translate(cx, cy); g.scale(k, k);
  if (shadow) rrect(-w / 2, -h / 2 + 7, w, h, h / 2, shadow);
  rrect(-w / 2, -h / 2, w, h, h / 2, bg, C.ink, 4);
  text(str, 0, 2, { size, weight, fam, color: fg, align: 'center', base: 'middle' });
  g.restore();
  return w;
}

/* ---------- pixel type: chunky extruded blocks, like <piix-type> ---------- */
const GLYPH = {
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  I: ['111', '010', '010', '010', '010', '010', '111'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111']
};
function pixelWord(word, cx, top, B, T, t0) {
  const letters = [...word].map(ch => GLYPH[ch]);
  const cols = letters.reduce((a, l) => a + l[0].length, 0) + letters.length - 1;
  let x = cx - cols * B / 2, col = 0;
  const blocks = [], spots = [];
  letters.forEach(l => {
    const lw = l[0].length;
    spots.push({ x0: x, x1: x + lw * B, mid: x + lw * B / 2 });
    for (let c = 0; c < lw; c++, col++) for (let r = 0; r < 7; r++) if (l[r][c] === '1') {
      const st = t0 + col * .032 + (6 - r) * .014;
      const k = prog(T, st, st + .42);
      if (k > 0) blocks.push([x + c * B, top + r * B - (1 - E.outBack(k)) * 520, k]);
    }
    x += (lw + 1) * B; col++;
  });
  const d = B * .3;
  g.fillStyle = '#5d8a12';
  for (const [bx, by] of blocks) g.fillRect(bx + d, by + d, B, B);
  for (const [bx, by] of blocks) {
    g.fillStyle = C.lime; g.fillRect(bx, by, B, B);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(bx, by, B, B * .16);
    g.strokeStyle = C.ink; g.lineWidth = 3; g.strokeRect(bx + 1.5, by + 1.5, B - 3, B - 3);
  }
  return spots;
}

/* ---------- screen furniture ---------- */
function grid(color, step = 48, ox = 0, oy = 0) {
  g.save(); g.strokeStyle = color; g.lineWidth = 2; g.beginPath();
  for (let x = ((ox % step) + step) % step; x < W; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
  for (let y = ((oy % step) + step) % step; y < H; y += step) { g.moveTo(0, y); g.lineTo(W, y); }
  g.stroke(); g.restore();
}
let VIG;
function vignette(a = .55) {
  if (!VIG) {
    VIG = document.createElement('canvas'); VIG.width = W; VIG.height = H;
    const v = VIG.getContext('2d'), gr = v.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * 1.05);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    v.fillStyle = gr; v.fillRect(0, 0, W, H);
  }
  g.save(); g.globalAlpha = a; g.drawImage(VIG, 0, 0); g.restore();
}
/* a blocky pixel wipe that covers the screen at tc and uncovers it again */
function wipe(T, tc, color, dur = .44) {
  const a = tc - dur / 2;
  if (T < a || T > tc + dur / 2) return;
  const B = 120, cols = Math.ceil(W / B), rows = Math.ceil(H / B), k = (T - a) / dur;
  g.fillStyle = color;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const d = (c + r * .7 + hash(c * 31 + r) * 2) / (cols + rows * .7 + 2);
    const s = k < .5 ? cl((k * 2 - d * .55) / .45) : 1 - cl(((k - .5) * 2 - d * .55) / .45);
    if (s > 0) { const z = B * s + 1; g.fillRect(c * B + (B - z) / 2, r * B + (B - z) / 2, z, z); }
  }
}
function flash(T, at, color, len = .35, peak = 1) {
  const a = T < at ? 0 : peak * (1 - prog(T, at, at + len));
  if (a > 0) { g.save(); g.globalAlpha = a; g.fillStyle = color; g.fillRect(0, 0, W, H); g.restore(); }
}
/* camera: zoom k around (fx, fy) plus a decaying shake from the listed hits */
function camera(k = 1, fx = W / 2, fy = H / 2, T = 0, hits = [], amp = 14) {
  let sx = 0, sy = 0;
  for (const h of hits) {
    const e = T - h; if (e < 0 || e > .4) continue;
    const f = (1 - e / .4) ** 2 * amp;
    sx += Math.sin(e * 90 + h) * f; sy += Math.cos(e * 77 + h * 3) * f;
  }
  g.setTransform(k, 0, 0, k, fx - fx * k + sx, fy - fy * k + sy);
}
const reset = () => g.setTransform(1, 0, 0, 1, 0, 0);
function burst(T, at, x, y, color, n = 10, r = 120) {
  const k = prog(T, at, at + .45); if (k <= 0 || k >= 1) return;
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + hash(at * 9 + i), d = E.outCubic(k) * r * (.6 + hash(i + at) * .6), z = 12 * (1 - k) + 2;
    g.fillRect(x + Math.cos(a) * d - z / 2, y + Math.sin(a) * d - z / 2, z, z);
  }
}
/* the pixel that falls first and becomes a pal */
function arrive(T, at, x, y, name, s, draw) {
  const fall = prog(T, at - .38, at);
  if (T < at) {
    if (fall > 0) {
      const py = lerp(y - 760, y, E.inCubic(fall));
      g.fillStyle = C.lime; g.fillRect(x - 9, py - 18, 18, 18);
      g.globalAlpha = .35; g.fillRect(x - 5, py - 70, 10, 50); g.globalAlpha = 1;
    }
    return;
  }
  burst(T, at, x, y - 20, C.lime, 12, 110);
  const p = E.outElastic(prog(T, at, at + .6));
  draw(p);
}

/* ---------- the browser window the opening happens in ---------- */
function browser(x, y, w, h, { bg = C.card, url = 'yourwebsite.com', dots = [C.line, C.line, C.line], chrome = '#ebe4d4', dark = false } = {}) {
  rrect(x + 10, y + 14, w, h, 22, 'rgba(0,0,0,.35)');
  rrect(x, y, w, h, 22, bg);
  g.save(); g.beginPath(); g.roundRect(x, y, w, 58, [22, 22, 0, 0]); g.fillStyle = chrome; g.fill(); g.restore();
  dots.forEach((d, i) => { g.beginPath(); g.arc(x + 34 + i * 30, y + 29, 9, 0, 7); g.fillStyle = d; g.fill(); });
  rrect(x + w / 2 - 200, y + 13, 400, 32, 16, dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)');
  text(url, x + w / 2, y + 30, { size: 19, weight: 400, fam: MONO, color: dark ? C.soft : C.muted, align: 'center', base: 'middle' });
}

/* ===================================================================== scenes */

/* 0 – 8s: every website looks the same. Then something moves in. */
function opening(T) {
  g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
  grid('rgba(255,255,255,.025)', 48);
  const up = E.inOut(prog(T, 1.9, 2.7));
  const push = E.inCubic(prog(T, 7.15, 8));
  const BX = 430, BY = 360;
  camera(lerp(1, 3.1, push), lerp(W / 2, 760, push), lerp(H / 2, 380, push), T, [4.4, 5.6, 6.1, 6.6, 7.1], 9);

  /* the browser rises in */
  const by = lerp(1150, 0, E.outExpo(prog(T, 1.95, 2.9)));
  g.save(); g.translate(0, by);
  const live = (at) => E.outCubic(prog(T, at, at + .35));
  const dots = [mix(C.line, C.coral, live(7.1)), mix(C.line, C.sun, live(7.15)), mix(C.line, C.mint, live(7.2))];
  browser(260, 250, 1400, 790, { dots });
  const head = 'WELCOME TO OUR WEBSITE', hs = 84, hm = measure(head, hs, 800, SANS, -2);
  const base = 430, capTop = base - measure('W', hs).asc;
  text(head, 340, base, { size: hs, color: mix('#d6cfc2', C.ink, live(4.4)), track: -2 });
  const bars = [[470, 980, 5.6], [505, 900, 5.6], [540, 620, 7.1]];
  bars.forEach(([y, w, at]) => rrect(340, y, w, 18, 9, mix('#e7dfcf', y === 540 ? C.mint : C.violet, live(at) * .55)));
  const press = T > 5.85 && T < 6.0 ? 5 : 0;
  rrect(340, 600 + 7, 300, 76, 16, mix('#e7dfcf', C.ink, live(5.85)));
  rrect(340, 600 + press, 300, 76, 16, mix('#d8cfbd', C.coral, live(5.85)), live(5.85) > 0 ? mix('#d8cfbd', C.ink, live(5.85)) : null);
  text('LEARN MORE', 490, 640 + press, { size: 28, color: mix(C.card, C.white, live(5.85)), align: 'center', base: 'middle', track: 1 });
  const cards = [[340, C.sun, 6.35], [770, C.sky, 6.1], [1200, C.mint, 6.6]];
  cards.forEach(([x, col, at]) => {
    rrect(x, 730, 400, 250, 20, mix('#efe9dc', col, live(at)), live(at) > .01 ? C.ink : null, 4);
    rrect(x + 30, 790, 250, 16, 8, 'rgba(23,18,31,.13)'); rrect(x + 30, 822, 300, 16, 8, 'rgba(23,18,31,.13)'); rrect(x + 30, 854, 190, 16, 8, 'rgba(23,18,31,.13)');
  });

  /* the arrivals */
  const bugX = 420 + cl(T - 4.75, 0, 2.1) * 170;
  arrive(T, 4.4, 420, capTop, 'bitbug', 5, p => {
    const clip = T < 4.75 ? 'idle' : T < 6.85 ? 'walk' : T < 7.55 ? 'look' : 'alarm';
    const hop = T > 7.55 ? -Math.abs(Math.sin((T - 7.55) * 14)) * 14 : 0;
    pal('bitbug', clip, T, bugX, capTop + hop, 5, { sx: p, sy: p });
  });
  arrive(T, 5.6, 1150, 470, 'kitty', 5, p => {
    pal('kitty', 'sleep', T, 1150, 470, 5, { sx: p, sy: p });
    for (let i = 0; i < 3; i++) { const z = ((T - 5.9) * .8 + i / 3) % 1; if (T > 5.9) text('z', 1200 + z * 40, 420 - z * 90, { size: 22 + z * 18, fam: PIX, weight: 400, color: C.violet, alpha: 1 - z }); }
  });
  arrive(T, 5.85, 560, 600, 'pip', 5, p => pal('pip', T < 6.4 ? 'idle' : 'peck', T, 560, 600 + press, 5, { sx: p, sy: p, flip: true }));
  arrive(T, 6.1, 970, 730, 'boing', 5, p => {
    const b = Math.abs(Math.sin((T - 6.1) * Math.PI * 2)), clip = b > .25 ? 'air' : 'land';
    pal('boing', clip, T, 970, 730 - b * 70, 5, { sx: p * (b < .1 ? 1.15 : 1), sy: p * (b < .1 ? .85 : 1) });
  });
  arrive(T, 6.35, 540, 730, 'termi', 5, p => pal('termi', 'typing', T, 540, 730, 5, { sx: p, sy: p }));
  arrive(T, 6.6, 1290, 730, 'shel', 5, p => pal('shel', 'walk', T, 1290 + cl(T - 6.8, 0, 2) * 60, 730, 5, { sx: p, sy: p }));
  arrive(T, 6.85, 1250, capTop, 'penguin', 5, p => pal('penguin', 'walk', T, 1250 - cl(T - 7, 0, 2) * 70, capTop, 5, { sx: p, sy: p, flip: true }));
  arrive(T, 7.1, 900, 540, 'frog', 5, p => pal('frog', T > 7.4 ? 'happy' : 'sit', T, 900, 540, 5, { sx: p, sy: p }));
  g.restore();
  reset();

  /* the words: they start in the middle and move up out of the way */
  g.save();
  g.translate(W / 2, lerp(575, 150, up)); g.scale(lerp(1, .62, up), lerp(1, .62, up));
  words(['Every', 'website', 'looks', { w: 'the' }, { w: 'same.', color: C.muted }], T, { x: 0, y: 0, size: 136, t0: .2, stagger: .25, out: 4.05 });
  words(['Until', 'something', { w: 'moved', color: C.lime }, { w: 'in.', color: C.lime }], T, { x: 0, y: 0, size: 136, t0: 4.3, stagger: .12, out: 7.2 });
  g.restore();
  vignette(.5);
  flash(T, 7.75, C.lime, 0, 0);
  if (T > 7.7) { g.save(); g.globalAlpha = E.inCubic(prog(T, 7.7, 8)); g.fillStyle = C.lime; g.fillRect(0, 0, W, H); g.restore(); }
}

