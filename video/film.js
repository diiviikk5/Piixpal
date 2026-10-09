/* Piixpal launch film. Every frame is a pure function of time T (seconds), drawn on one canvas.
 * The pals are the real ones from the library; the render-style shot uses live <piix-sprite> elements.
 * Shots are drawn into layers so the cuts between them can blur, smear, dissolve into pixels or heat up. */
const W = 1920, H = 1080, DUR = 37;
const main = document.getElementById('c');
let g = main.getContext('2d');
const C = {
  ink: '#17121f', ink2: '#2b2436', muted: '#6c6477', soft: '#cdc6da', bone: '#f1ede4', bone2: '#e6e0d3', char: '#121214',
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
  outBack: k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  outElastic: k => k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - .75) * (2 * Math.PI / 3)) + 1
};

/* ---------- colour ---------- */
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], cl(k))).toString(16).padStart(2, '0')).join(''); };

/* ---------- layers ---------- */
const canvas = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const LA = canvas(), LB = canvas(), LV = [0, 1, 2, 3, 4].map(() => canvas()), LH = canvas(), LF = canvas(), TS = canvas(8, 8);
/* draw fn into a layer instead of the screen */
function into(cv, fn) {
  const prev = g; g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.filter = 'none'; g.globalAlpha = 1; g.imageSmoothingEnabled = false;
  fn();
  g.setTransform(1, 0, 0, 1, 0, 0); g = prev;
  return cv;
}
const reset = () => { g.setTransform(1, 0, 0, 1, 0, 0); g.filter = 'none'; g.globalAlpha = 1; };
/* camera: zoom k around (fx, fy), then nudge */
const camera = (k = 1, fx = W / 2, fy = H / 2, dx = 0, dy = 0) => g.setTransform(k, 0, 0, k, fx - fx * k + dx, fy - fy * k + dy);

/* ---------- pals ---------- */
const S = Piixpal.sprites, BAKED = {};
const baked = name => {
  if (BAKED[name]) return BAKED[name];
  const sp = S[name], out = {};
  for (const clip in sp.frames) out[clip] = sp.frames[clip].map(rows => {
    const c = canvas(sp.w, sp.h), x = c.getContext('2d'), pad = sp.h - rows.length;
    rows.forEach((row, ry) => { for (let i = 0; i < row.length; i++) { const col = sp.palette[row[i]]; if (col) { x.fillStyle = col; x.fillRect(i, ry + pad, 1, 1); } } });
    return c;
  });
  return (BAKED[name] = out);
};
const clipOf = (name, want) => { const c = Object.keys(S[name].frames); return want.find(w => c.includes(w)) || c[0]; };
/* draw a pal standing at (x, y): bottom-centre, or centre with o.center */
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
  if (o.shadow) { g.fillStyle = 'rgba(23,18,31,.12)'; g.beginPath(); g.ellipse(0, 0, sp.w * s * .42, s * 1.2, 0, 0, 7); g.fill(); }
  g.drawImage(img, -sp.w * s / 2, o.center ? -sp.h * s / 2 : -sp.h * s, sp.w * s, sp.h * s);
  g.restore();
}
/* a pal that arrives with a squash and a little burst */
function popPal(T, at, name, clip, x, y, s, o = {}) {
  if (T < at) return;
  const p = E.outElastic(prog(T, at, at + .6));
  pal(name, clip, T, x, y, s, { ...o, sx: p, sy: p });
  const k = prog(T, at, at + .4);
  if (k < 1) { g.fillStyle = C.lime; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, d = E.outCubic(k) * s * 16, z = s * 2 * (1 - k); g.fillRect(x + Math.cos(a) * d - z / 2, y - s * 4 + Math.sin(a) * d - z / 2, z, z); } }
}

/* ---------- type ---------- */
const font = (px, w = 560, fam = SANS) => `${w} ${px}px ${fam}`;
function text(str, x, y, { size = 54, weight = 560, fam = SANS, color = C.ink, align = 'left', alpha = 1, track = 0, base = 'alphabetic' } = {}) {
  g.save();
  g.font = font(size, weight, fam); g.letterSpacing = track + 'px';
  g.fillStyle = color; g.textAlign = align; g.textBaseline = base; g.globalAlpha *= alpha;
  g.fillText(str, x, y);
  g.restore();
}
function measure(str, size, weight = 560, fam = SANS, track = 0) {
  g.save(); g.font = font(size, weight, fam); g.letterSpacing = track + 'px';
  const m = g.measureText(str); g.restore();
  return { w: m.width, asc: m.actualBoundingBoxAscent };
}
/* soft type: each part focuses in out of a blur, and blurs away again. parts: 'text' or [text, colour] */
function soft(parts, T, tin, tout, { x = W / 2, y = H / 2, size = 62, weight = 560, fam = SANS, color = C.ink, align = 'center', track = null, stagger = .07 } = {}) {
  parts = (Array.isArray(parts) ? parts : [parts]).map(p => typeof p === 'string' ? [p, color] : p);
  track = track ?? -size * .02;
  g.save();
  g.font = font(size, weight, fam); g.letterSpacing = track + 'px'; g.textBaseline = 'middle';
  const sp = g.measureText(' ').width + size * .05, ws = parts.map(([s]) => g.measureText(s).width);
  const total = ws.reduce((a, b) => a + b, 0) + sp * (parts.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  parts.forEach(([s, col], i) => {
    const a = E.outCubic(prog(T, tin + i * stagger, tin + i * stagger + .55));
    const b = tout == null ? 0 : E.inCubic(prog(T, tout + i * stagger * .5, tout + i * stagger * .5 + .35));
    const k = a * (1 - b);
    if (k > 0) {
      g.filter = `blur(${((1 - a) * 18 + b * 16).toFixed(1)}px)`;
      g.globalAlpha = k; g.fillStyle = col;
      g.fillText(s, cx, y + (1 - a) * size * .35 - b * size * .2);
    }
    cx += ws[i] + sp;
  });
  g.restore();
  return total;
}
function rrect(x, y, w, h, r, fill, stroke, lw = 2) {
  g.beginPath(); g.roundRect(x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}
/* a soft drop shadow under a rounded card */
function lifted(x, y, w, h, r, fill, depth = 1) {
  g.save(); g.shadowColor = `rgba(40,30,60,${.13 * depth})`; g.shadowBlur = 60 * depth; g.shadowOffsetY = 24 * depth;
  rrect(x, y, w, h, r, fill); g.restore();
}
/* typed code: tokens [[text, colour]], n characters shown */
function tokens(list, x, y, n, { size = 34, fam = MONO, weight = 500 } = {}) {
  let left = n, cx = x;
  for (const [s, col] of list) {
    if (left <= 0) break;
    const part = s.slice(0, left); left -= part.length;
    text(part, cx, y, { size, fam, weight, color: col, base: 'middle' });
    cx += measure(part, size, weight, fam).w;
  }
  return cx;
}
const tokLen = list => list.reduce((a, [s]) => a + s.length, 0);

/* ---------- backdrops ---------- */
/* warm paper, a few drifting colour blooms, and the pastel horizon from the bottom of the frame */
function paper(T, { horizon = 1, blooms = .5, base = C.bone } = {}) {
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  if (blooms) [[C.lime, .2, .3], [C.sky, .75, .2], ['#ffb8c8', .55, .75]].forEach(([c, fx, fy], i) => {
    const x = W * (fx + Math.sin(T * .3 + i * 2) * .06), y = H * (fy + Math.cos(T * .25 + i) * .05), r = 520;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, c + Math.round(blooms * 40).toString(16).padStart(2, '0')); gr.addColorStop(1, c + '00');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  if (horizon) {
    const y0 = H * .58, gr = g.createLinearGradient(0, y0, 0, H);
    gr.addColorStop(0, 'rgba(241,237,228,0)');
    gr.addColorStop(.42, `rgba(255,214,184,${.7 * horizon})`);
    gr.addColorStop(.7, `rgba(255,186,206,${.55 * horizon})`);
    gr.addColorStop(1, `rgba(176,232,196,${.9 * horizon})`);
    g.fillStyle = gr; g.fillRect(0, y0, W, H - y0);
  }
}
function studio(spot = .5) {
  const gr = g.createRadialGradient(W * spot, H * .45, 40, W * spot, H * .5, W * .75);
  gr.addColorStop(0, '#34323a'); gr.addColorStop(.5, '#1a191d'); gr.addColorStop(1, '#09090a');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
function grid(color, step = 48, x0 = 0, y0 = 0, w = W, h = H, lw = 1.5) {
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  g.strokeStyle = color; g.lineWidth = lw; g.beginPath();
  for (let x = x0; x <= x0 + w; x += step) { g.moveTo(x, y0); g.lineTo(x, y0 + h); }
  for (let y = y0; y <= y0 + h; y += step) { g.moveTo(x0, y); g.lineTo(x0 + w, y); }
  g.stroke(); g.restore();
}
/* film grain over everything, the same for a given frame */
const GRAIN = (() => { const c = canvas(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; })();
function grain(T, a = .07) {
  const f = Math.floor(T * 30), ox = Math.floor(hash(f) * 256), oy = Math.floor(hash(f + .5) * 256);
  g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'overlay';
  for (let x = -ox; x < W; x += 256) for (let y = -oy; y < H; y += 256) g.drawImage(GRAIN, x, y);
  g.restore();
}
/* code glyphs and pixels that blink in around the words */
const GL = ['<', '>', '/', '{', '}', '/', ';', '*', '/'];
function glyphs(T, t0, t1, seed, n = 18, { cx = W / 2, cy = H / 2, rx = 560, ry = 300, size = 40, dark = false } = {}) {
  const cols = dark ? [C.lime, C.sky, '#ff8fb1', C.sun] : [C.coral, C.violet, C.lime2, C.sky, '#ff4fa3', C.ink];
  for (let i = 0; i < n; i++) {
    const h = hash(seed * 100 + i), at = t0 + h * (t1 - t0 - .4), life = .3 + hash(i * 7 + seed) * .5;
    if (T < at || T > at + life) continue;
    const a = hash(i * 13 + seed) * 6.283, r = .4 + hash(i * 17 + seed) * .6;
    const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r - (T - at) * 24;
    const col = cols[Math.floor(hash(i * 19 + seed) * cols.length)], k = E.outBack(prog(T, at, at + .14));
    g.save(); g.translate(x, y); g.rotate((hash(i * 31 + seed) - .5) * .5); g.scale(k, k);
    if (hash(i * 23 + seed) < .3) { g.fillStyle = col; g.fillRect(-7, -7, 14, 14); }
    else text(GL[Math.floor(hash(i * 29 + seed) * GL.length)], 0, 0, { size, weight: 400, fam: PIX, color: col, align: 'center', base: 'middle' });
    g.restore();
  }
}

/* ---------- the mark: a lime pixel with two eyes ---------- */
function mark(x, y, s = 56, k = 1) {
  g.save(); g.translate(x, y); g.scale(k, k);
  rrect(-s / 2, -s / 2, s, s, s * .22, C.lime, C.ink, s * .07);
  g.fillStyle = C.ink; g.fillRect(s * .06, -s * .2, s * .15, s * .26); g.fillRect(-s * .21, -s * .2, s * .15, s * .26);
  g.restore();
}
function logo(T, at, out, y = H / 2, size = 84) {
  const tw = measure('Piixpal', size, 650, SANS, -2).w, ms = size * .8, total = ms + size * .32 + tw, x0 = W / 2 - total / 2;
  const a = E.outCubic(prog(T, at, at + .6)), b = out == null ? 0 : E.inCubic(prog(T, out, out + .35));
  if (a * (1 - b) <= 0) return;
  g.save(); g.globalAlpha = a * (1 - b); g.filter = `blur(${((1 - a) * 14 + b * 14).toFixed(1)}px)`;
  mark(x0 + ms / 2, y, ms, lerp(.6, 1, E.outBack(prog(T, at, at + .5))));
  text('Piixpal', x0 + ms + size * .32, y + size * .04, { size, weight: 650, color: C.ink, base: 'middle', track: -2 });
  g.restore();
}

/* ===================================================================== shots */

/* 0 – 3.6: three small phrases, glyphs blinking around them */
function sOpen(T) {
  paper(T, { horizon: lerp(0, .5, prog(T, 1, 4)), blooms: .35 });
  glyphs(T, .1, 3.9, 1, 26);
  soft('Build websites', T, .25, 1.1);
  soft('that feel', T, 1.25, 2.1);
  const w = soft([['alive.', C.ink]], T, 2.25, null, { size: 64, weight: 650 });
  popPal(T, 2.75, 'bitbug', T < 3.1 ? 'idle' : 'walk', W / 2 - w / 2 + 40 + cl(T - 3.1, 0, 1) * 70, H / 2 - 26, 4);
  reset();
}

/* 3.6 – 7: websites fly in from deep space, gather, collapse into one pixel, and that pixel is the logo */
const CARDS = [
  ['hero', 960, 470, 540, 330], ['toast', 560, 300, 330, 112], ['chart', 1370, 330, 360, 250], ['profile', 600, 690, 310, 220],
  ['button', 1330, 640, 300, 100], ['phone', 1590, 560, 210, 390], ['blog', 330, 520, 270, 320], ['dash', 1000, 800, 440, 200], ['price', 1620, 240, 250, 220]
];
function uiCard(kind, w, h, T) {
  const P = { hero: [C.ink, 'bitbug'], toast: [C.white, 'pidge'], chart: [C.white, 'boing'], profile: ['#fff1bf', 'kitty'], button: [null, 'pip'], phone: [C.ink, 'frog'], blog: ['#fbf8f1', 'shel'], dash: ['#1f1b29', 'termi'], price: ['#e8f9c4', 'penguin'] }[kind];
  if (kind === 'button') { rrect(0, 0, w, h, h / 2, C.coral); text('Get started →', w / 2, h / 2 + 2, { size: 30, weight: 650, color: C.white, align: 'center', base: 'middle' }); }
  else {
    rrect(0, 0, w, h, 22, P[0]);
    if (kind === 'hero') { text('Make it', 36, 120, { size: 64, weight: 700, color: C.white, track: -2 }); text('yours.', 36, 190, { size: 64, weight: 700, color: C.lime, track: -2 }); rrect(36, 236, 170, 54, 27, C.lime); rrect(220, 236, 130, 54, 27, null, 'rgba(255,255,255,.3)'); }
    if (kind === 'toast') { g.beginPath(); g.arc(52, h / 2, 26, 0, 7); g.fillStyle = C.mint; g.fill(); text('✓', 52, h / 2 + 2, { size: 28, weight: 700, color: C.white, align: 'center', base: 'middle' }); text('Saved', 96, h / 2 - 12, { size: 32, weight: 650, base: 'middle' }); text('delivered by pigeon', 96, h / 2 + 22, { size: 18, fam: MONO, weight: 400, color: C.muted, base: 'middle' }); }
    if (kind === 'chart') { text('Visitors', 28, 50, { size: 26, weight: 650 }); [.4, .7, .5, .9, .65, 1].forEach((v, i) => rrect(28 + i * 52, h - 30 - v * 140, 36, v * 140, 8, i === 5 ? C.violet : '#e3ddf9')); }
    if (kind === 'profile') { g.beginPath(); g.arc(70, 80, 40, 0, 7); g.fillStyle = C.coral; g.fill(); rrect(130, 58, 140, 18, 9, 'rgba(23,18,31,.7)'); rrect(130, 88, 100, 14, 7, 'rgba(23,18,31,.25)'); rrect(30, 150, 250, 14, 7, 'rgba(23,18,31,.15)'); rrect(30, 176, 190, 14, 7, 'rgba(23,18,31,.15)'); }
    if (kind === 'phone') { rrect(14, 14, w - 28, h - 28, 18, C.sky); rrect(34, 220, w - 68, 90, 14, C.white); rrect(70, 30, w - 140, 10, 5, C.ink); }
    if (kind === 'blog') { rrect(18, 18, w - 36, 150, 14, C.mint); rrect(18, 192, w - 60, 20, 10, C.ink); rrect(18, 226, w - 90, 14, 7, C.line); rrect(18, 252, w - 70, 14, 7, C.line); }
    if (kind === 'dash') { for (let i = 0; i < 3; i++) { rrect(20 + i * 140, 24, 124, 152, 14, '#2b2436'); text(['118', '0', '23'][i], 36 + i * 140, 96, { size: 46, weight: 700, color: [C.lime, C.sky, C.sun][i] }); rrect(36 + i * 140, 130, 80, 10, 5, '#4a4258'); } }
    if (kind === 'price') { text('Free', 26, 76, { size: 52, weight: 700, track: -2 }); text('forever', 26, 116, { size: 24, fam: MONO, weight: 400, color: C.muted }); rrect(26, 150, w - 52, 46, 23, C.ink); }
  }
  pal(P[1], clipOf(P[1], ['idle', 'sit', 'rest', 'typing']), T, w * .7, 0, 4);
}
function sCollage(T) {
  paper(T, { horizon: .5, blooms: .35 });
  glyphs(T, 4.0, 5.5, 2, 14);
  const drift = E.inOut(prog(T, 4.0, 5.6)), col = E.inCubic(prog(T, 5.5, 5.95));
  camera(lerp(1.08, 1, drift), W / 2, H / 2);
  CARDS.forEach(([kind, x, y, w, h], i) => {
    const at = 4.0 + i * .085, k = E.outExpo(prog(T, at, at + .8));
    if (k <= 0) return;
    const z = lerp(6, 1, k), s = (1 / z) * (1 - col);
    if (s <= .01) return;
    const px = lerp(W / 2 + (x - W / 2) / z, W / 2, col), py = lerp(H / 2 + (y - H / 2) / z, H / 2, col);
    g.save();
    g.filter = `blur(${((z - 1) * 3 + col * 12).toFixed(1)}px)`; g.globalAlpha = cl(k * 2);
    g.translate(px, py); g.rotate(col * (i % 2 ? .4 : -.4)); g.scale(s, s); g.translate(-w / 2, -h / 2);
    lifted(0, 0, w, h, kind === 'button' ? h / 2 : 22, kind === 'button' ? C.coral : '#fff', .8);
    uiCard(kind, w, h, T);
    g.restore();
  });
  reset();
  /* the pixel everything fell into */
  const pk = prog(T, 5.85, 6.02);
  if (pk > 0 && T < 6.1) { const z = 26 * E.outBack(pk) * (1 + Math.sin(T * 30) * .05); g.fillStyle = C.lime; g.fillRect(W / 2 - z / 2, H / 2 - z / 2, z, z); }
  logo(T, 6.0, null);
  reset();
}

/* 7 – 9.6: the prompt. You ask for a pal */
const PROMPT = [['<', '#8a8494'], ['piix-pal', '#d6336c'], [' pal', '#a66a00'], ['=', '#8a8494'], ['"bitbug"', '#2f8a3a'], [' />', '#8a8494']];
function sPrompt(T) {
  paper(T, { horizon: .7, blooms: .4 });
  logo(T, -1, 7.05);
  glyphs(T, 7.2, 8.7, 3, 16, { rx: 640, ry: 330 });
  const k = E.outExpo(prog(T, 7.15, 7.8)), dive = E.inCubic(prog(T, 8.6, 9.5));
  const w = 860, h = 176, x = W / 2 - w / 2, y = H / 2 - h / 2 + (1 - k) * 60;
  const bx = x + w - 70, by = y + h - 70, ox = bx + 22, oy = by + 22;
  g.save(); g.globalAlpha = k * (1 - dive); g.filter = `blur(${((1 - k) * 12 + dive * 26).toFixed(1)}px)`;
  camera(lerp(1, 1.8, dive), ox, oy);
  lifted(x, y, w, h, 26, C.white, 1);
  const n = Math.round(tokLen(PROMPT) * prog(T, 7.4, 8.3));
  const end = n ? tokens(PROMPT, x + 40, y + 62, n) : x + 40;
  if (!n) text('Add a pal to my site…', x + 40, y + 62, { size: 30, weight: 400, color: '#a49eae', base: 'middle' });
  if (Math.floor(T * 2.5) % 2 === 0 || (T > 7.4 && T < 8.3)) { g.fillStyle = C.ink; g.fillRect(end + 3, y + 44, 3, 38); }
  text('+', x + 44, y + h - 40, { size: 36, weight: 400, color: '#a49eae', base: 'middle' });
  const sent = T > 8.5;
  rrect(bx, by + (T > 8.5 && T < 8.6 ? 3 : 0), 44, 44, 12, sent ? C.lime : C.ink);
  if (!sent) text('↑', bx + 22, by + 23, { size: 26, weight: 700, color: C.white, align: 'center', base: 'middle' });
  const ck = E.inOut(prog(T, 8.0, 8.45));
  if (T > 8.0) cursor(lerp(W - 300, bx + 26, ck), lerp(H - 120, by + 30, ck), 5);
  g.restore();
  reset();
  /* the pixel leaves the button, finds the middle of the frame, and the camera falls into it */
  if (T > 8.5) {
    const a = E.inOut(prog(T, 8.5, 9.1)), px = lerp(ox, W / 2, a), py = lerp(oy, H / 2, a);
    const z = T < 9.1 ? lerp(40, 80, a) : 80 * Math.pow(2600 / 80, E.inCubic(prog(T, 9.1, 9.98)));
    const rush = prog(T, 9.0, 9.9);
    if (rush > 0) for (let i = 0; i < 70; i++) {
      const an = hash(i * 3.3) * 6.283, ph = (hash(i * 7.1) + T * (1.2 + hash(i) * 1.5)) % 1, r0 = 80 + ph * 1300, len = 60 + ph * 420 * rush;
      g.strokeStyle = i % 3 ? 'rgba(198,244,50,' + (.5 * rush * ph) + ')' : 'rgba(23,18,31,' + (.25 * rush * ph) + ')';
      g.lineWidth = 3 + ph * 8; g.beginPath(); g.moveTo(px + Math.cos(an) * r0, py + Math.sin(an) * r0); g.lineTo(px + Math.cos(an) * (r0 + len), py + Math.sin(an) * (r0 + len)); g.stroke();
    }
    g.save(); g.shadowColor = 'rgba(40,30,60,.25)'; g.shadowBlur = 40; cubeFace(px - z / 2, py - z / 2, z, '#b8f23a'); g.restore();
  }
}
function cursor(x, y, s) {
  ['k......', 'kk.....', 'kwk....', 'kwwk...', 'kwwwk..', 'kwwwwk.', 'kwwkkk.', 'kk.....'].forEach((r, j) => [...r].forEach((c, i) => { if (c !== '.') { g.fillStyle = c === 'k' ? C.ink : C.white; g.fillRect(x + i * s, y + j * s, s, s); } }));
}

/* 9.6 – 13.6: the product shot. Bitbug, one pixel at a time, as glossy cubes under a studio light */
function cubeFace(x, y, P, col) {
  const gap = P * .05, gr = g.createLinearGradient(x, y, x, y + P);
  gr.addColorStop(0, mix(col, '#ffffff', .38)); gr.addColorStop(.35, col); gr.addColorStop(1, mix(col, '#000000', .18));
  g.fillStyle = gr; g.beginPath(); g.roundRect(x + gap, y + gap, P - gap * 2, P - gap * 2, P * .14); g.fill();
  g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + P * .18, y + P * .14, P * .22, P * .08);
}
function voxel(name, clip, frame, cx, by, P, focus, maxBlur = 5) {
  const sp = S[name], rows = sp.frames[clip][frame % sp.frames[clip].length], pad = sp.h - rows.length;
  const buckets = [[], [], [], [], []];
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    const col = sp.palette[ch]; if (!col) return;
    buckets[Math.min(4, Math.floor(Math.abs(i - focus) / 2.4))].push([i, j + pad, col]);
  }));
  const d = P * .2, x0 = cx - sp.w * P / 2, y0 = by - sp.h * P;
  for (let b = 4; b >= 0; b--) {
    if (!buckets[b].length) continue;
    const layer = into(LV[b], () => {
      for (const [i, j, col] of buckets[b]) { g.fillStyle = mix(col, '#000000', .55); g.fillRect(x0 + i * P + d * .5, y0 + j * P + d, P, P); }
      for (const [i, j, col] of buckets[b]) cubeFace(x0 + i * P, y0 + j * P, P, col);
    });
    g.save();
    g.filter = `blur(${(b * maxBlur / 4 * 2).toFixed(1)}px)`;
    if (b === 0) { g.shadowColor = 'rgba(198,244,50,.28)'; g.shadowBlur = 90; }
    g.drawImage(layer, 0, 0);
    g.restore();
  }
}
function sMacro(T) {
  const sp = S.bitbug, i0 = 4, j0 = 4;
  const k = E.inOut(prog(T, 11.3, 14.4)), z = E.outExpo(prog(T, 10, 11.3)), u = E.inOut(prog(T, 10, 11.3));
  const Pc = lerp(118, 66, k), cxc = lerp(780, 980, k), byc = lerp(1020, 860, k), fc = lerp(13, 6, k);
  const P = T < 11.3 ? Math.exp(lerp(Math.log(2600), Math.log(118), z)) : Pc;
  /* keep the cube we came out of pinned while the shot opens up */
  const ccx = cxc - sp.w * Pc / 2 + (i0 + .5) * Pc, ccy = byc - sp.h * Pc + (j0 + .5) * Pc;
  const dx = lerp(W / 2, ccx, u), dy = lerp(H / 2, ccy, u);
  const cx = dx + sp.w * P / 2 - (i0 + .5) * P, by = dy + sp.h * P - (j0 + .5) * P;
  studio(lerp(.5, lerp(.62, .45, k), u));
  g.save(); g.filter = 'blur(30px)'; g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.ellipse(cx, by + 20, 16 * P * .5, P * .9, 0, 0, 7); g.fill(); g.restore();
  voxel('bitbug', 'walk', T < 11.3 ? 0 : Math.floor(T * 3), cx, by, P, T < 11.3 ? lerp(i0, fc, u) : fc, T < 11.3 ? lerp(0, 9, u) : lerp(9, 4, k));
  soft([['Meet', '#a9a4b2'], ['Bitbug.', '#f1ede4']], T, 11.5, 12.6, { y: 960, size: 46 });
  soft([['16 × 11 pixels of', '#a9a4b2'], ['personality.', C.lime]], T, 12.8, 13.8, { y: 960, size: 46 });
  reset();
}

/* 13.6 – 16.4: on a real-looking site, the headline sliding past, pals living on it */
function sSite(T) {
  paper(T, { horizon: 1, blooms: .3 });
  const z = E.outCubic(prog(T, 13.8, 17));
  camera(lerp(1.1, 1, z), W / 2, H * .45);
  const x = 300, y = 120, w = 1320, h = 740;
  lifted(x, y, w, h, 24, C.ink, 1.2);
  g.save(); g.beginPath(); g.roundRect(x, y, w, h, 24); g.clip();
  const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#2a2140'); gr.addColorStop(1, '#120f19');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  grid('rgba(198,244,50,.06)', 44, x, y, w, h);
  text('▪ trailhead', x + 40, y + 52, { size: 24, weight: 650, color: C.white, base: 'middle' });
  ['Work', 'About', 'Shop'].forEach((s, i) => text(s, x + w - 360 + i * 100, y + 52, { size: 22, weight: 500, color: '#b9b2c7', base: 'middle' }));
  rrect(x + w - 70, y + 34, 40, 36, 10, C.lime);
  /* the headline, wider than the card, gliding left */
  const hs = 190, hx = x + 40 - (T - 13.8) * 110, hb = y + 400, top = hb - measure('M', hs, 700).asc;
  text('Make the web', hx, hb, { size: hs, weight: 700, color: C.white, track: -7 });
  const mx = measure('Make the web ', hs, 700, SANS, -7).w;
  text('fun again.', hx + mx, hb, { size: hs, weight: 700, color: C.lime, track: -7 });
  pal('bitbug', 'walk', T, hx + 260 + (T - 13.8) * 230, top, 7);
  pal('penguin', 'walk', T, hx + mx + 420 + (T - 13.8) * 150, top, 6);
  /* cards along the bottom */
  ['Pals', 'Superpowers', 'Sprites', 'Crowd', 'Type'].forEach((s, i) => {
    const cx = x + 40 + i * 252, cy = y + h - 230;
    rrect(cx, cy, 232, 190, 18, 'rgba(255,255,255,.06)', 'rgba(255,255,255,.1)', 1.5);
    text(s, cx + 20, cy + 160, { size: 24, weight: 600, color: C.white });
    const who = ['kitty', 'pix', 'pip', 'frog', 'boing'][i], c = clipOf(who, ['sleep', 'idle', 'sit']);
    const b = who === 'boing' ? Math.abs(Math.sin(T * 6)) * 30 : 0;
    pal(who, who === 'boing' && b > 6 ? 'air' : c, T, cx + 116, cy + 110 - b, 5);
  });
  g.restore();
  reset();
}

/* 16.4 – 19.2: the component tree writes itself */
const TREE = [[0, 'components', null], [1, 'pals', null], [2, 'bitbug', 'bitbug'], [2, 'kitty', 'kitty'], [2, 'boing', 'boing'], [2, 'penguin', 'penguin'],
  [1, 'superpowers', null], [2, 'pidge', 'pidge'], [2, 'pix', 'pix'], [2, 'plug', 'plug'], [1, 'sprites', null], [2, 'whale', null], [2, 'astronaut', null]];
const CROWD_CAST = ['bitbug', 'pinch', 'frog', 'gecko', 'penguin', 'pip', 'boing', 'shel', 'beep', 'termi', 'peeper', 'bumble', 'mole', 'hiss', 'kitty'];
const CROWDS = {};
/* sample a shape drawn by mask(ctx) into points, one pal per point */
function crowdOf(key, mask, step) {
  if (CROWDS[key]) return CROWDS[key];
  const o = canvas(), x = o.getContext('2d'); mask(x);
  const d = x.getImageData(0, 0, W, H).data, pts = [];
  for (let y = 0, r = 0; y < H; y += step, r++) for (let i = (r % 2) * step / 2; i < W; i += step) if (d[(y * W + Math.floor(i)) * 4 + 3] > 128) pts.push([i, y]);
  return (CROWDS[key] = pts.map((p, i) => ({ p, n: CROWD_CAST[Math.floor(hash(i * 7.7) * CROWD_CAST.length)], a: hash(i * 3.1) * 6.283, r: hash(i * 5.3), d: hash(i * 9.1) * .4, sp: .6 + hash(i * 1.7) * .8 })));
}
function crowd(T, agents, { t0, form, scatter = null, s = 2 }) {
  agents.forEach((a, i) => {
    const R = 1250 + a.r * 300, sx = W / 2 + Math.cos(a.a) * R, sy = H / 2 + Math.sin(a.a) * R * .65;
    const w = E.outCubic(prog(T, t0 + a.d * .5, form + a.d)), ring = 260 + a.r * 520, sw = a.a + T * .3 * a.sp;
    let x = lerp(sx, W / 2 + Math.cos(sw) * ring, w), y = lerp(sy, H / 2 + Math.sin(sw) * ring * .6, w);
    const k = E.inOut(prog(T, form + a.d, form + .9 + a.d));
    const fx = x;
    x = lerp(x, a.p[0], k); y = lerp(y, a.p[1], k);
    let dir = a.p[0] - fx;
    if (scatter != null) { const q = E.inCubic(prog(T, scatter + a.d * .3, scatter + .5 + a.d * .3)); x += Math.cos(a.a) * q * 1800; y += Math.sin(a.a) * q * 1100; if (q > 0) dir = Math.cos(a.a); }
    const sp = S[a.n], fr = baked(a.n), clip = fr.walk || fr.fly || fr[Object.keys(fr)[0]];
    const img = clip[Math.floor(T * 9 + i) % clip.length];
    g.save(); g.translate(x, y + (k >= 1 ? Math.sin(T * 10 + i) * 1.2 : 0)); if (dir < 0) g.scale(-1, 1);
    g.drawImage(img, -sp.w * s / 2, -sp.h * s / 2, sp.w * s, sp.h * s); g.restore();
  });
}
function sCrowd(T) {
  g.fillStyle = '#0f0c18'; g.fillRect(0, 0, W, H);
  const glow = E.outCubic(prog(T, 16.6, 18)), gr = g.createRadialGradient(W / 2, 480, 0, W / 2, 480, 900);
  gr.addColorStop(0, 'rgba(198,244,50,' + (.04 + glow * .1) + ')'); gr.addColorStop(1, 'rgba(198,244,50,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  grid('rgba(255,255,255,.035)', 48);
  const ag = crowdOf('hello', x => { x.font = font(470, 700); x.letterSpacing = '-14px'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('hello', W / 2, 470); }, 15);
  camera(lerp(1, 1.08, E.inOut(prog(T, 17.6, 19))));
  crowd(T, ag, { t0: 15.7, form: 16.6, scatter: 18.55 });
  reset();
  soft([['Crowd.', C.white], ['Hundreds of pals, one canvas.', '#8e869c']], T, 16.1, 18.4, { y: 900, size: 40 });
}

/* 19.2 – 22.8: the same whale in six render styles, each on its own ground */
const STYLES = [['voxel', 'blueprint'], ['dots', 'riso'], ['halftone', 'news'], ['dither', 'gameboy'], ['ascii', 'crt'], ['pixel', 'lime']];
function ground(kind, x, y, w, h) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  if (kind === 'blueprint') { g.fillStyle = '#1d4c9e'; g.fillRect(x, y, w, h); grid('rgba(255,255,255,.12)', 24, x, y, w, h, 1); grid('rgba(255,255,255,.22)', 120, x, y, w, h, 2); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(x + w * .5, y + h * .5, Math.min(w, h) * .42, 0, 7); g.stroke(); }
  if (kind === 'riso') { g.fillStyle = '#ffd6e2'; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,79,163,.35)'; for (let yy = y; yy < y + h; yy += 22) for (let xx = x + ((yy - y) / 22 % 2) * 11; xx < x + w; xx += 22) { const r = 2 + 6 * ((xx - x) / w); g.beginPath(); g.arc(xx, yy, r, 0, 7); g.fill(); } }
  if (kind === 'news') { g.fillStyle = '#efe5cf'; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(23,18,31,.08)'; for (let yy = y + 10; yy < y + h; yy += 7) g.fillRect(x, yy, w, 1.5); }
  if (kind === 'gameboy') { g.fillStyle = '#9bbc0f'; g.fillRect(x, y, w, h); grid('rgba(48,98,48,.18)', 10, x, y, w, h, 1); }
  if (kind === 'crt') { const gr = g.createRadialGradient(x + w / 2, y + h / 2, 10, x + w / 2, y + h / 2, w * .7); gr.addColorStop(0, '#0f3a22'); gr.addColorStop(1, '#020805'); g.fillStyle = gr; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(0,0,0,.35)'; for (let yy = y; yy < y + h; yy += 5) g.fillRect(x, yy, w, 2); }
  if (kind === 'lime') { g.fillStyle = C.lime; g.fillRect(x, y, w, h); grid('rgba(23,18,31,.08)', 40, x, y, w, h, 1.5); }
  g.restore();
}
const STY_T = 19.0, STY_EACH = .375, STY_GRID = STY_T + STYLES.length * STY_EACH;
const TILE = i => { const w = 560, h = 340, gx = 24; return { x: (W - (3 * w + 2 * gx)) / 2 + (i % 3) * (w + gx), y: 200 + Math.floor(i / 3) * (h + gx), w, h }; };
const darkGround = kind => kind === 'blueprint' || kind === 'crt';
function sStyles(T) {
  g.fillStyle = C.bone; g.fillRect(0, 0, W, H);
  if (T < STY_GRID) {
    const i = cl(Math.floor((T - STY_T) / STY_EACH), 0, 5);
    ground(STYLES[i][1], 0, 0, W, H);
    text(`render="${STYLES[i][0]}"`, W / 2, 940, { size: 30, fam: MONO, weight: 500, color: darkGround(STYLES[i][1]) ? '#e8f2ff' : C.ink, align: 'center', base: 'middle' });
  } else {
    const k = E.outExpo(prog(T, STY_GRID, STY_GRID + .7));
    camera(lerp(1.12, 1, k));
    STYLES.forEach(([r, kind], i) => {
      const t = TILE(i), a = E.outCubic(prog(T, STY_GRID + i * .05, STY_GRID + i * .05 + .4));
      g.save(); g.globalAlpha = a;
      lifted(t.x, t.y, t.w, t.h, 22, C.white, .6);
      g.beginPath(); g.roundRect(t.x, t.y, t.w, t.h, 22); g.clip();
      ground(kind, t.x, t.y, t.w, t.h);
      g.restore();
      text(`render="${r}"`, t.x + 22, t.y + t.h - 26, { size: 20, fam: MONO, weight: 500, color: darkGround(kind) ? '#e8f2ff' : C.ink, alpha: a });
    });
    reset();
    soft([['Six ways to', C.muted], ['draw a pal.', C.ink]], T, STY_GRID + .15, null, { y: 120, size: 48 });
  }
  reset();
}
/* the live sprites for that shot: one per style, placed over the canvas */
const STY_EL = STYLES.map(([r]) => {
  const el = document.createElement('piix-sprite');
  el.setAttribute('name', 'whale'); el.setAttribute('render', r); el.setAttribute('scale', '12'); el.setAttribute('look', 'none'); el.setAttribute('sleep-after', '0');
  el.style.display = 'none';
  document.getElementById('big').append(el);
  return el;
});
function styleSprites(T, vis) {
  STY_EL.forEach((el, i) => {
    let on = vis > 0, x, y, s;
    if (T < STY_GRID) { on = on && i === cl(Math.floor((T - STY_T) / STY_EACH), 0, 5); x = W / 2; y = 860; s = 2.1 + (T - STY_T - i * STY_EACH) * .3; }
    else { const t = TILE(i), k = E.outExpo(prog(T, STY_GRID, STY_GRID + .7)), z = lerp(1.12, 1, k); x = W / 2 + (t.x + t.w / 2 - W / 2) * z; y = H / 2 + (t.y + t.h - 50 - H / 2) * z; s = .6 * z * E.outCubic(prog(T, STY_GRID + i * .05, STY_GRID + i * .05 + .4)); }
    el.style.display = on ? '' : 'none';
    el._vis = true; /* drawn every frame, the observer is too slow for a frame-by-frame render */
    if (on) { el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.opacity = vis; el.style.filter = vis < 1 ? `blur(${((1 - vis) * 16).toFixed(1)}px)` : ''; el.style.transform = `translate(-50%,-100%) scale(${s})`; }
  });
}

/* 22.8 – 24.7: superpowers streak in like fast-forwarded tickets */
const POWERS = [
  ['Toasts, delivered by pigeon', 'pidge', '#ffd9cf', 'Piixpal.toast()'],
  ['Snow that settles on your headings', 'penguin', '#d4efff', '<piix-weather>'],
  ['Your page, as a platformer', 'pix', '#e9fbbf', 'pal="pix"'],
  ['A pal that sulks when you go offline', 'plug', '#fff0b8', 'pal="plug"'],
  ['Pull the cord for dark mode', 'bulb', '#e3dcff', 'pal="bulb"']
];
function powerCard(i, x, y, T) {
  const [title, who, bg, tag] = POWERS[i], w = 900, h = 100;
  rrect(x, y, w, h, 50, bg);
  g.beginPath(); g.arc(x + 52, y + h / 2, 36, 0, 7); g.fillStyle = C.white; g.fill();
  pal(who, Object.keys(S[who].frames)[0], T, x + 52, y + h / 2 + 22, 3);
  text(title, x + 108, y + h / 2 + 2, { size: 34, weight: 600, base: 'middle', track: -.5 });
  text(tag, x + w - 34, y + h / 2 + 2, { size: 20, fam: MONO, weight: 500, color: C.muted, align: 'right', base: 'middle' });
}
function sPowers(T) {
  paper(T, { horizon: .6, blooms: .5, base: '#ece8f6' });
  soft([['Superpowers.', C.ink], ['They leave the page.', C.muted]], T, 22.05, null, { y: 160, size: 48 });
  POWERS.forEach((_, i) => {
    const at = 22.2 + i * .13, x1 = W / 2 - 450, y = 290 + i * 122;
    const pos = t => lerp(W + 300, x1, E.outExpo(prog(t, at, at + .55)));
    if (T < at) return;
    const v = Math.abs(pos(T) - pos(T - 1 / 60));
    /* motion blur: several copies along the path, averaged */
    const n = v > 4 ? 6 : 1;
    for (let j = 0; j < n; j++) {
      g.save(); g.globalAlpha = 1 / (j + 1);
      if (v > 4) g.filter = `blur(${Math.min(14, v * .12).toFixed(1)}px)`;
      powerCard(i, pos(T - j * .006), y, T);
      g.restore();
    }
  });
  reset();
}

/* 24.7 – 26.2: a quick run across a sentence */
let LEVEL;
const PLAY = [24.1, 25.5];
function level() {
  if (LEVEL) return LEVEL;
  const [t0, t1] = PLAY, sz = 120, ws = [['YOUR', 820], ['PAGE', 690], ['IS', 570], ['A', 700], ['LEVEL', 540]];
  let x = 150; LEVEL = { sz, plats: [] };
  for (const [w, base] of ws) { const m = measure(w, sz, 700, SANS, -3); LEVEL.plats.push({ w, x, x1: x + m.w, base, top: base - measure('E', sz, 700).asc }); x += m.w + 110; }
  const P = LEVEL.plats, seg = [];
  P.forEach((p, i) => {
    seg.push({ kind: 'run', x0: i ? p.x + 30 : p.x + 40, x1: p.x1 - 34, y: p.top });
    if (P[i + 1]) seg.push({ kind: 'jump', x0: p.x1 - 34, x1: P[i + 1].x + 30, y0: p.top, y1: P[i + 1].top });
  });
  const len = s => s.kind === 'run' ? Math.abs(s.x1 - s.x0) : 240, total = seg.reduce((a, s) => a + len(s), 0);
  let acc = 0; seg.forEach(s => { s.a = acc / total; acc += len(s); s.b = acc / total; });
  LEVEL.seg = seg;
  /* each coin sits over the middle of a jump, so it is taken at the jump's halfway time */
  LEVEL.coins = seg.filter(s => s.kind === 'jump').map(s => ({ x: (s.x0 + s.x1) / 2, y: Math.min(s.y0, s.y1) - 190, at: t0 + (s.a + s.b) / 2 * (t1 - t0) }));
  return LEVEL;
}
function sPlay(T) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#9fd8ff'); gr.addColorStop(.7, '#e4f4ff'); gr.addColorStop(1, '#fff3e0');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  /* pixel clouds drifting */
  for (let i = 0; i < 5; i++) { const x = ((hash(i) * W + T * (30 + i * 12)) % (W + 400)) - 200, y = 90 + hash(i * 3) * 280, s = 14; g.fillStyle = 'rgba(255,255,255,.9)'; [[0, 1, 6], [1, 0, 4], [2, 1, 3]].forEach(([dx, dy, w]) => g.fillRect(x + dx * s * 2, y + dy * s, w * s * 2, s)); g.fillRect(x - s, y + s * 2, 16 * s, s); }
  const [t0, t1] = PLAY, { plats, seg, coins, sz } = level();
  camera(lerp(1.06, 1, E.outCubic(prog(T, 23.8, 24.6))));
  for (const p of plats) { text(p.w, p.x, p.base, { size: sz, weight: 700, color: C.ink, track: -3 }); g.fillStyle = C.mint; g.fillRect(p.x, p.top - 10, p.x1 - p.x, 10); }
  const u = prog(T, t0, t1), s = seg.find(s => u <= s.b) || seg[seg.length - 1], k = cl((u - s.a) / (s.b - s.a));
  let x, y, clip;
  if (s.kind === 'run') { x = lerp(s.x0, s.x1, k); y = s.y; clip = u >= 1 ? 'happy' : 'run'; }
  else { x = lerp(s.x0, s.x1, k); y = lerp(s.y0, s.y1, k) - Math.sin(k * Math.PI) * 220; clip = k < .5 ? 'jump' : 'fall'; }
  let got = 0;
  coins.forEach((c, i) => {
    if (T >= c.at) { got++; const r = prog(T, c.at, c.at + .5); if (r < 1) text('+1', c.x, c.y - r * 70, { size: 32, fam: PIX, weight: 400, color: C.coral, align: 'center', alpha: 1 - r }); }
    else pal('_coin', 'spin', T, c.x, c.y + Math.sin(T * 6 + i) * 8, 7);
  });
  pal('pix', clip, T, x, y, 8);
  reset();
  text('WORLD 1-1', 90, 90, { size: 28, fam: PIX, weight: 400, color: C.ink });
  text('COINS ' + String(got).padStart(2, '0'), W - 90, 90, { size: 28, fam: PIX, weight: 400, color: C.ink, align: 'right' });
}

/* 26.2 – 29.6: dark. One command, then the code */
const CMD = 'npm i piixpal';
const REACT = [
  [['import', '#b69cff'], [' { PiixPal } ', '#e9e6df'], ['from', '#b69cff'], [' "piixpal/react"', C.lime], [';', '#8d8796']],
  [],
  [['export default function', '#b69cff'], [' Hero', C.sky], ['() {', '#e9e6df']],
  [['  return', '#b69cff'], [' (', '#e9e6df']],
  [['    <', '#8d8796'], ['h1', '#ff8f73'], ['>', '#8d8796']],
  [['      Hello ', '#e9e6df'], ['<', '#8d8796'], ['PiixPal', '#ff8f73'], [' pal', C.sun], ['=', '#8d8796'], ['"kitty"', C.lime], [' />', '#8d8796']],
  [['    </', '#8d8796'], ['h1', '#ff8f73'], ['>', '#8d8796']],
  [['  );', '#e9e6df']],
  [['}', '#e9e6df']]
];
function sDark(T) {
  g.fillStyle = '#121212'; g.fillRect(0, 0, W, H);
  const gr = g.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * .7); gr.addColorStop(0, 'rgba(255,255,255,.04)'); gr.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  /* the command, typed big */
  const out = E.inCubic(prog(T, 27.6, 28.0));
  if (out < 1) {
    g.save(); g.globalAlpha = 1 - out; g.filter = `blur(${(out * 18).toFixed(1)}px)`;
    const size = 104, n = Math.round(CMD.length * prog(T, 26.3, 26.95)), shown = CMD.slice(0, n);
    const full = measure('→ ' + CMD, size, 500).w, x = W / 2 - full / 2, y = H / 2 - out * 60;
    text('→', x, y, { size, weight: 500, color: C.lime, base: 'middle' });
    const ax = x + measure('→ ', size, 500).w, px = ax + measure('npm i ', size, 500).w;
    const sel = E.outCubic(prog(T, 27.05, 27.25));
    if (sel > 0) rrect(px - 8, y - size * .56, (measure('piixpal', size, 500).w + 16) * sel, size * 1.12, 10, C.lime);
    text(shown.slice(0, 6), ax, y, { size, weight: 500, color: '#f1ede4', base: 'middle' });
    text(shown.slice(6), px, y, { size, weight: 500, color: sel > .5 ? C.ink : '#f1ede4', base: 'middle' });
    if (n < CMD.length || Math.floor(T * 2.5) % 2) { g.fillStyle = C.lime; g.fillRect(ax + measure(shown, size, 500).w + 6, y - size * .5, 6, size); }
    g.restore();
  }
  /* the editor */
  const k = E.outExpo(prog(T, 27.8, 28.5));
  if (k > 0) {
    const w = 1080, h = 560, x = W / 2 - w / 2, y = H / 2 - h / 2 + (1 - k) * 80;
    g.save(); g.globalAlpha = k; g.filter = `blur(${((1 - k) * 14).toFixed(1)}px)`;
    rrect(x, y, w, h, 20, '#1b1b1d', '#2c2c30', 2);
    text('Hero.jsx', x + 36, y + 40, { size: 20, fam: MONO, weight: 500, color: '#8d8796', base: 'middle' });
    g.fillStyle = '#2c2c30'; g.fillRect(x, y + 76, w, 1.5);
    const all = REACT.reduce((a, l) => a + tokLen(l), 0);
    let left = Math.round(all * prog(T, 28.1, 29.1));
    if (T > 29.05) rrect(x + 12, y + 110 + 5 * 46 - 22, w - 24, 44, 8, 'rgba(107,76,255,.28)');
    REACT.forEach((line, i) => {
      const ly = y + 110 + i * 46;
      text(String(i + 1).padStart(2, ' '), x + 36, ly, { size: 22, fam: MONO, weight: 400, color: '#4d4a55', base: 'middle' });
      if (left > 0) { const n = Math.min(left, tokLen(line)); tokens(line, x + 90, ly, n, { size: 26 }); left -= n; }
    });
    g.restore();
    popPal(T, 29.2, 'kitty', 'rest', x + w - 160, y, 5);
  }
  glyphs(T, 26.2, 27.5, 11, 12, { dark: true, rx: 700, ry: 340 });
  reset();
}

/* 29.6 – 32.6: everyone, each on its own tile, the camera pulling back from Bitbug */
let CAST;
function sGrid(T) {
  g.fillStyle = C.bone; g.fillRect(0, 0, W, H);
  if (!CAST) {
    CAST = Object.keys(S).filter(n => n[0] !== '_' && !['fence', 'molehill', 'ants', 'fish', 'bees', 'fireflies', 'duckling', 'choir', 'bitbug'].includes(n)).slice(0, 44);
    CAST.splice(22, 0, 'bitbug');
  }
  const cols = 9, ts = 196, gap = 14, x0 = (W - (cols * ts + (cols - 1) * gap)) / 2, y0 = (H - (5 * ts + 4 * gap)) / 2;
  const bgs = ['#e9fbbf', '#d4efff', '#ffd9cf', '#fff0b8', '#e3dcff', '#d3f3e8', '#ffe1ec', C.white];
  const zk = E.inOut(prog(T, 30.1, 31.6)), c22 = [x0 + 4 * (ts + gap) + ts / 2, y0 + 2 * (ts + gap) + ts / 2];
  camera(lerp(5.2, 1, zk), c22[0], c22[1], (W / 2 - c22[0]) * (1 - zk), (H / 2 - c22[1]) * (1 - zk));
  CAST.forEach((n, i) => {
    const c = i % cols, r = Math.floor(i / cols), x = x0 + c * (ts + gap), y = y0 + r * (ts + gap);
    const dist = Math.hypot(c - 4, r - 2), at = 30.0 + dist * .07, k = E.outBack(prog(T, at, at + .45));
    if (k <= 0) return;
    g.save(); g.translate(x + ts / 2, y + ts / 2); g.scale(1, k);
    rrect(-ts / 2, -ts / 2, ts, ts, 22, n === 'bitbug' ? C.ink : bgs[(c * 3 + r * 5) % bgs.length]);
    const sp = S[n], s = Math.max(3, Math.floor(118 / Math.max(sp.w, sp.h)));
    pal(n, clipOf(n, ['walk', 'idle', 'fly', 'sit', 'rest', 'swim', 'go']), T + i * .1, 0, sp.h * s / 2, s);
    g.restore();
  });
  reset();
  const pk = E.outBack(prog(T, 31.7, 32.1));
  if (pk > 0) {
    const str = '118 components  ·  0 dependencies', w = measure(str, 40, 600).w + 80;
    g.save(); g.translate(W / 2, H / 2); g.scale(pk, pk);
    lifted(-w / 2, -44, w, 88, 44, C.ink, 1.4);
    text(str, 0, 2, { size: 40, weight: 600, color: C.white, align: 'center', base: 'middle' });
    g.restore();
  }
  reset();
}

/* 32.6 – 36: the name, the line, the address. Pals walk in to stand under it */
let END;
const endL = () => END || (END = (() => { const size = 220, tw = measure('Piixpal', size, 650, SANS, -6.6).w, ms = 168, gap = 52, x0 = W / 2 - (ms + gap + tw) / 2; return { size, ms, mx: x0 + ms / 2, tx: x0 + ms + gap, y: 420 }; })());
function sEnd(T) {
  paper(T, { horizon: 1, blooms: .55 });
  const L = endL(), res = prog(T, 34.0, 34.4);
  const ag = crowdOf('logo', x => {
    x.fillStyle = '#000'; x.beginPath(); x.roundRect(L.mx - L.ms / 2, L.y - L.ms / 2, L.ms, L.ms, L.ms * .22); x.fill();
    x.font = font(L.size, 650); x.letterSpacing = '-6.6px'; x.textBaseline = 'middle'; x.fillText('Piixpal', L.tx, L.y + L.size * .04);
  }, 12);
  if (res < 1) { g.save(); g.globalAlpha = 1 - res; crowd(T, ag, { t0: 32.2, form: 32.75 }); g.restore(); }
  if (res > 0) {
    g.save(); g.globalAlpha = res; g.filter = `blur(${((1 - res) * 10).toFixed(1)}px)`;
    mark(L.mx, L.y, L.ms, lerp(1.15, 1, E.outBack(res)));
    text('Piixpal', L.tx, L.y + L.size * .04, { size: L.size, weight: 650, color: C.ink, base: 'middle', track: -6.6 });
    g.restore();
  }
  soft([['Tiny pixel creatures that', C.muted], ['live', C.ink], ['on your website.', C.muted]], T, 34.35, null, { y: 590, size: 44, stagger: .05 });
  soft([['piixpal.dvkk.dev', C.ink], ['·', '#a49eae'], ['npm i piixpal', C.ink]], T, 34.8, null, { y: 680, size: 30, fam: MONO, weight: 500, stagger: .06 });
  [['bitbug', -1, 780], ['boing', -1, 600], ['pip', -1, 420], ['penguin', 1, 1150], ['frog', 1, 1330], ['kitty', 1, 1500]].forEach(([n, side, stop], i) => {
    const at = 34.4 + i * .1, k = E.outCubic(prog(T, at, at + 1.1)), x = lerp(side < 0 ? -120 : W + 120, stop, k);
    if (T < at) return;
    const clip = k < .98 ? clipOf(n, ['walk', 'slide', 'fly', 'air']) : clipOf(n, ['idle', 'sit', 'rest']);
    pal(n, clip, T, x, 920, 5, { flip: side > 0 && n !== 'kitty', shadow: true });
  });
  if (T > 36.3) { g.fillStyle = `rgba(0,0,0,${E.inOut(prog(T, 36.3, 37))})`; g.fillRect(0, 0, W, H); }
  reset();
}

/* ===================================================================== the cut */
const SHOTS = [[0, sOpen], [4, sCollage], [7, sPrompt], [10, sMacro], [14, sSite], [16, sCrowd], [19, sStyles], [22, sPowers], [24, sPlay], [26, sDark], [30, sGrid], [32.5, sEnd]];
/* how each shot hands over to the next: [type, length] */
const CUT = { 4: ['blur', .5], 7: ['cut', 0], 10: ['cut', 0], 14: ['whip', .4], 16: ['pixels', .5], 19: ['whip', .4], 22: ['blur', .5], 24: ['pixels', .45], 26: ['whip', .4], 30: ['thermal', .9], 32.5: ['blur', .6] };

/* average copies of a layer slid sideways: a camera whip */
function smear(src, dx, amt, n = 9) {
  for (let i = 0; i < n; i++) { g.globalAlpha = 1 / (i + 1); g.drawImage(src, dx + amt * (i / (n - 1) - .5), 0); }
  g.globalAlpha = 1;
}
/* the heat map: the picture, pixelated, with its brightness run through a hot palette */
const HEAT = ['#1d1240', '#4b2bd6', '#c43bd8', '#ff4f7a', '#ff8a3d', '#ffd23f', '#d8f75a', '#f6ffe0'].map(rgb);
function thermal(src, cell, T) {
  const w = Math.ceil(W / cell), h = Math.ceil(H / cell);
  TS.width = w; TS.height = h;
  const x = TS.getContext('2d'); x.imageSmoothingEnabled = true; x.drawImage(src, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h), p = d.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const o = (j * w + i) * 4;
    let v = (p[o] * .3 + p[o + 1] * .59 + p[o + 2] * .11) / 255;
    v = cl(v * 1.5 + .18 * Math.sin(i * .21 + T * 4) * Math.sin(j * .17 - T * 3) + .12);
    const f = v * (HEAT.length - 1), a = Math.floor(f), b = Math.min(HEAT.length - 1, a + 1), t = f - a;
    p[o] = lerp(HEAT[a][0], HEAT[b][0], t); p[o + 1] = lerp(HEAT[a][1], HEAT[b][1], t); p[o + 2] = lerp(HEAT[a][2], HEAT[b][2], t); p[o + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  g.imageSmoothingEnabled = false; g.drawImage(TS, 0, 0, W, H);
}
function compose(T) {
  reset(); g.imageSmoothingEnabled = false;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  let i = 0; while (i + 1 < SHOTS.length && T >= SHOTS[i + 1][0]) i++;
  /* inside a handover? */
  let from = null, to = null, kind, k;
  for (const j of [i, i + 1]) {
    if (j <= 0 || j >= SHOTS.length) continue;
    const B = SHOTS[j][0], [type, d] = CUT[B] || ['cut', 0];
    if (d && T >= B - d / 2 && T < B + d / 2) { from = SHOTS[j - 1][1]; to = SHOTS[j][1]; kind = type; k = (T - (B - d / 2)) / d; }
  }
  if (!from) { SHOTS[i][1](T); return; }
  into(LA, () => from(T)); into(LB, () => to(T));
  if (kind === 'blur') {
    g.filter = `blur(${(k * 22).toFixed(1)}px)`; g.drawImage(LA, 0, 0);
    g.filter = `blur(${((1 - k) * 22).toFixed(1)}px)`; g.globalAlpha = E.inOut(k); g.drawImage(LB, 0, 0);
  } else if (kind === 'whip') {
    const sm = Math.sin(k * Math.PI) * 420;
    if (k < .5) smear(LA, -E.inCubic(k * 2) * 500, sm); else smear(LB, (1 - E.outCubic((k - .5) * 2)) * 500, sm);
  } else if (kind === 'pixels') {
    g.drawImage(LA, 0, 0);
    const B = 96, cols = Math.ceil(W / B), rows = Math.ceil(H / B);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const d = hash(c * 37 + r * 11) * .7 + (c / cols) * .3, x = c * B, y = r * B;
      if (k > d + .12) g.drawImage(LB, x, y, B, B, x, y, B, B);
      else if (k > d) { g.fillStyle = (c + r) % 3 ? C.bone : C.lime; g.fillRect(x + 2, y + 2, B - 4, B - 4); }
    }
  } else if (kind === 'thermal') {
    g.drawImage(LA, 0, 0);
    const cell = Math.round(lerp(72, 8, E.inOut(cl((k - .15) / .7))));
    const heat = into(LH, () => thermal(LB, cell, T));
    g.globalAlpha = E.inOut(cl(k / .25)); g.drawImage(heat, 0, 0);
    g.globalAlpha = E.inOut(cl((k - .78) / .22)); g.drawImage(LB, 0, 0);
  } else g.drawImage(LB, 0, 0);
}
/* the whole frame breathes with the kick in the loud parts, and jumps on the drops */
const GROOVE = [[10, 26], [30, 32.5]], DROPS = [10, 30];
function pulse(T) {
  let p = 1;
  for (const [a, b] of GROOVE) if (T >= a && T < b) p += .011 * Math.exp(-((T - a) % .5) * 14);
  for (const d of DROPS) if (T >= d && T < d + .6) p += .045 * Math.exp(-(T - d) * 7);
  return p;
}
function draw(T) {
  into(LF, () => compose(T));
  reset(); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const p = pulse(T);
  g.setTransform(p, 0, 0, p, W / 2 - W / 2 * p, H / 2 - H / 2 * p); g.drawImage(LF, 0, 0); reset();
  for (const d of DROPS) if (T >= d && T < d + .25) { g.fillStyle = `rgba(255,255,255,${.55 * (1 - (T - d) / .25)})`; g.fillRect(0, 0, W, H); }
  grain(T);
}
/* how visible the live sprites are: fully inside the styles shot, fading through its handovers */
function spriteVis(T) {
  const a = STY_T, b = 22, da = CUT[a][1] / 2, db = CUT[b][1] / 2;
  if (T < a || T > b + db) return 0;
  if (T < a + da) return prog(T, a, a + da);
  if (T > b - db) return 1 - prog(T, b - db, b + db);
  return 1;
}

/* ===================================================================== sound cues
 * music.mjs reads these, so every blip lands on the frame that makes it */
function cues() {
  const c = [], at = (t, kind) => c.push([+t.toFixed(3), kind]);
  [.25, 1.25, 2.25].forEach(t => at(t, 'word'));
  at(2.75, 'pop');
  CARDS.forEach((_, i) => at(4.0 + i * .085, 'card'));
  at(5.45, 'suck'); at(5.85, 'blip'); at(6.0, 'logo');
  for (let i = 0; i < tokLen(PROMPT); i++) at(7.4 + i * .9 / tokLen(PROMPT), 'key');
  at(8.5, 'click');
  [11.5, 12.8].forEach(t => at(t, 'word'));
  [14, 19, 26].forEach(t => at(t, 'whoosh'));
  at(15.7, 'swarm'); at(17.5, 'form'); at(18.55, 'scatter');
  for (let i = 0; i < 6; i++) at(STY_T + i * STY_EACH, 'style');
  at(STY_GRID, 'whoosh');
  POWERS.forEach((_, i) => at(22.2 + i * .13, 'swish'));
  level().coins.forEach(k => at(k.at, 'coin'));
  for (let i = 0; i < CMD.length; i++) at(26.3 + i * .65 / CMD.length, 'key');
  at(27.05, 'select');
  for (let i = 0; i < 70; i++) at(28.1 + i / 70, 'key');
  at(29.2, 'pop');
  for (let i = 0; i < 6; i++) at(30.0 + i * .12, 'tile');
  at(31.7, 'blip');
  at(32.2, 'swarm'); at(34.0, 'logo');
  for (let i = 0; i < 6; i++) at(35.4 + i * .1, 'step');
  return c.sort((a, b) => a[0] - b[0]);
}

const ready = Promise.all(['700 100px "Bricolage Grotesque"', '650 100px "Bricolage Grotesque"', '560 100px "Bricolage Grotesque"', '450 40px "Bricolage Grotesque"', '400 30px Silkscreen', '500 30px "JetBrains Mono"', '400 30px "JetBrains Mono"'].map(f => document.fonts.load(f)))
  .then(() => document.fonts.ready);
/* the renderer calls this once per frame; it moves the library's clock to T too */
window.__film = { DUR, ready, cues, frame(T) { styleSprites(T, spriteVis(T)); __clock.step(T * 1000 - __clock.ms); draw(T); } };

/* watching in a normal browser: play in real time */
if (!navigator.webdriver && !location.search.includes('render')) {
  const start = +(new URLSearchParams(location.search).get('t') || 0);
  ready.then(() => { const t0 = __realNow(); setInterval(() => { const T = (start + (__realNow() - t0) / 1000) % DUR; window.__film.frame(T); }, 1000 / 30); });
}
