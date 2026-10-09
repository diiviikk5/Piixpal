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

