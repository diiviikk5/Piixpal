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

/* 8 – 12s: the name lands, and so do the pals */
function title(T) {
  g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
  grid('rgba(198,244,50,.05)', 48, 0, (T - 8) * 30);
  const lands = [9.05, 9.2, 9.35, 9.5, 9.65, 9.8, 9.95];
  camera(lerp(1.0, 1.05, prog(T, 8, 12)), W / 2, 520, T, [8.05, 8.55, 9.05, 9.5, 9.95], 12);
  const B = 40, top = 320;
  const spots = pixelWord('PIIXPAL', W / 2, top, B, T, 8.02);
  const cast = [['bitbug', 'idle', 7], ['boing', 'idle', 7], ['frog', 'sit', 7], ['penguin', 'idle', 7], ['pip', 'idle', 7], ['shibe', 'rest', 6], ['duck', 'idle', 7]];
  cast.forEach(([n, clip, s], i) => {
    const at = lands[i], sp = spots[i];
    if (T < at - .5) return;
    const k = prog(T, at - .5, at), y = lerp(-200, top, k * k);
    const sq = T > at ? 1 - Math.sin(prog(T, at, at + .25) * Math.PI) * .3 : 1;
    let c = clip, yy = y;
    if (n === 'boing' && T > at + .3) { const b = Math.abs(Math.sin((T - at - .3) * Math.PI * 2)); yy = top - b * 60; c = b > .2 ? 'air' : 'land'; }
    if (n === 'bitbug' && T > at + .6) c = 'look';
    if (n === 'frog' && T > at + .5) c = 'happy';
    if (n === 'pip' && T > at + .5) c = 'peck';
    pal(n, c, T, sp.mid, yy, s, { sx: 2 - sq, sy: sq, flip: i > 3 });
    if (T > at) burst(T, at, sp.mid, top, C.lime, 8, 70);
  });
  reset();
  words(['Tiny', 'pixel', 'creatures', 'that', { w: 'live', color: C.lime }, 'on', 'your', 'website.'], T, { x: W / 2, y: 790, size: 70, weight: 650, color: C.soft, t0: 10.0, stagger: .065 });
  const vk = E.outBack(prog(T, 10.7, 11.1));
  if (vk > 0) pill('v0.4  ·  out now', W / 2, 900, { size: 28, k: vk });
  vignette(.55);
  flash(T, 8, C.lime, .45);
}

/* 12 – 22s: the montage, one verb per beat pair */
const CUTS = [12, 13, 14, 15, 16, 17, 18, 19.5, 22];
function label(T, t0, verb, color, dim, n) {
  words([{ w: 'They', color: dim }, ...verb.split(' ').map(w => ({ w, color }))], T, { x: 110, y: 985, size: 112, align: 'left', t0: t0 + .04, stagger: .05, dur: .45 });
  text(String(n).padStart(2, '0') + ' / 08', W - 110, 120, { size: 26, weight: 600, fam: MONO, color: dim, align: 'right' });
  text('piixpal', 110, 120, { size: 30, weight: 400, fam: PIX, color: dim });
}
function punch(T, t0) { const k = E.outExpo(prog(T, t0, t0 + .4)); camera(lerp(1.12, 1, k), W / 2, H / 2); }

function crawl(T) {
  const t0 = 12;
  g.fillStyle = C.paper; g.fillRect(0, 0, W, H); grid('rgba(23,18,31,.05)', 48);
  punch(T, t0);
  const str = 'HELLO WORLD', sz = 250, m = measure(str, sz, 800, SANS, -6), base = 640, top = base - measure('H', sz).asc;
  text(str, W / 2, base, { size: sz, color: C.ink, align: 'center', track: -6 });
  const x0 = W / 2 - m.w / 2;
  pal('bitbug', 'walk', T, x0 + 90 + (T - t0) * 760, top, 10, { fps: 14 });
  pal('pinch', 'walk', T, x0 + m.w - 60 - (T - t0) * 380, top, 9, { flip: true, fps: 12 });
  pal('gecko', 'walk', T, x0 + 380 + (T - t0) * 300, top, 8, { fps: 12 });
  reset();
  label(T, t0, 'crawl.', C.ink, C.muted, 1);
}
function nap(T) {
  const t0 = 13;
  g.fillStyle = C.sky; g.fillRect(0, 0, W, H); grid('rgba(255,255,255,.12)', 48);
  punch(T, t0);
  const x = 420, y = 330, w = 1080, h = 420;
  rrect(x + 12, y + 14, w, h, 26, C.ink); rrect(x, y, w, h, 26, C.white, C.ink, 5);
  text('Quarterly report', x + 70, y + 120, { size: 64, color: C.ink, track: -2 });
  ['Strong growth across every metric we', 'track, and a noticeable increase in', 'pixel creatures napping on the text.'].forEach((l, i) =>
    text(l, x + 70, y + 200 + i * 58, { size: 40, weight: 500, color: C.muted }));
  pal('kitty', 'sleep', T, x + 300, y, 9);
  pal('capy', 'doze', T, x + 820, y, 8, { flip: true });
  for (let i = 0; i < 4; i++) {
    const z = ((T - t0) * 1.1 + i / 4) % 1;
    text('z', x + 380 + z * 60, y - 80 - z * 160, { size: 30 + z * 34, fam: PIX, weight: 400, color: C.ink, alpha: 1 - z });
  }
  reset();
  label(T, t0, 'nap.', C.ink, 'rgba(23,18,31,.55)', 2);
}
function perch(T) {
  const t0 = 14;
  g.fillStyle = C.sun; g.fillRect(0, 0, W, H); grid('rgba(23,18,31,.06)', 48);
  punch(T, t0);
  const land = t0 + .38, press = T > land && T < land + .12 ? 8 : 0;
  const bx = W / 2 - 340, by = 430, bw = 680, bh = 160;
  rrect(bx, by + 12, bw, bh, 80, C.ink);
  rrect(bx, by + press, bw, bh, 80, C.coral, C.ink, 6);
  text('Get started  →', W / 2, by + bh / 2 + press + 4, { size: 64, color: C.white, align: 'center', base: 'middle', track: -1 });
  const k = prog(T, t0, land), px = lerp(W + 100, W / 2 + 160, E.outCubic(k)), py = lerp(-120, by + press, E.outCubic(k)) - Math.sin(k * Math.PI) * 120;
  pal('pip', T < land ? 'fly' : T < land + .3 ? 'idle' : 'peck', T, px, py, 11, { flip: true, fps: T < land ? 12 : 6 });
  pal('bumble', 'fly', T, W / 2 - 420 + Math.sin(T * 6) * 30, 330 + Math.cos(T * 9) * 20, 7);
  reset();
  label(T, t0, 'perch.', C.ink, 'rgba(23,18,31,.5)', 3);
}
/* toys under gravity, bouncing off the floor and walls: simulated from the throw, so any frame is reproducible */
function toss(T, at, x, y, vx, vy, floor = 860) {
  let px = x, py = y, rot = 0; const dt = 1 / 240;
  for (let t = at; t < T; t += dt) {
    vy += 3800 * dt; px += vx * dt; py += vy * dt; rot += vx * dt * .012;
    if (py > floor) { py = floor; vy *= -.52; vx *= .8; }
    if (px < 80 || px > W - 80) { vx *= -.8; px = cl(px, 80, W - 80); }
  }
  return { x: px, y: py, rot };
}
function thrown(T) {
  const t0 = 15;
  g.fillStyle = C.coral; g.fillRect(0, 0, W, H); grid('rgba(255,255,255,.08)', 48);
  punch(T, t0);
  g.fillStyle = 'rgba(23,18,31,.18)'; g.fillRect(0, 868, W, 12);
  [['duck', t0 + .05, 260, 520, 1500, -1500], ['dice', t0 + .2, 380, 620, 1100, -1700], ['ball', t0 + .32, 200, 560, 1900, -1300]].forEach(([n, at, x, y, vx, vy]) => {
    const p = T < at ? { x, y, rot: 0 } : toss(T, at, x, y, vx, vy, 868 - S[n].h * 6.5);
    pal(n, n === 'dice' ? 'roll' : 'idle', T, p.x, p.y, 13, { center: true, rot: p.rot });
    if (T < at + .1) cursor(x + 30, y + 40, T < at);
  });
  reset();
  label(T, t0, 'get thrown.', C.white, 'rgba(23,18,31,.6)', 4);
}
function cursor(x, y, grab) {
  const A = grab ? ['k......', 'kk.....', 'kwk....', 'kwwk...', 'kwwwk..', 'kwwwwk.', 'kwwkkk.', 'kk.kwk.', '....kk.'] : ['k......', 'kk.....', 'kwk....', 'kwwk...', 'kwwwk..', 'kwwwwk.', 'kwwkkk.', 'kk.....'];
  const s = 7;
  A.forEach((r, j) => [...r].forEach((c, i) => { if (c !== '.') { g.fillStyle = c === 'k' ? C.ink : C.white; g.fillRect(x + i * s, y + j * s, s, s); } }));
}
function deliver(T) {
  const t0 = 16;
  g.fillStyle = C.violet; g.fillRect(0, 0, W, H); grid('rgba(255,255,255,.08)', 48);
  punch(T, t0);
  const drop = t0 + .45;
  const k = prog(T, t0, drop), bx = lerp(-200, W / 2, E.outCubic(k)), by = 330 + Math.sin(T * 14) * 8;
  const fx = T < drop ? bx : W / 2 + (T - drop) * 1300, fy = T < drop ? by : by - (T - drop) * 700;
  const ck = E.outBack(prog(T, drop, drop + .35)), cx = W / 2, cy = T < drop ? by + 150 : lerp(by + 150, 640, ck);
  /* the note it carries, then the toast it becomes */
  const cw = lerp(380, 620, ck), ch = lerp(120, 150, ck);
  if (T < drop) { g.strokeStyle = C.white; g.lineWidth = 4; g.beginPath(); g.moveTo(bx, by - 20); g.lineTo(bx, by + 90); g.stroke(); }
  g.save(); g.translate(T < drop ? bx : cx, cy);
  rrect(-cw / 2, -ch / 2 + 10, cw, ch, 24, C.ink); rrect(-cw / 2, -ch / 2, cw, ch, 24, C.white, C.ink, 5);
  g.beginPath(); g.arc(-cw / 2 + 70, 0, 30, 0, 7); g.fillStyle = C.mint; g.fill();
  text('✓', -cw / 2 + 70, 3, { size: 36, color: C.white, align: 'center', base: 'middle' });
  text('Saved', -cw / 2 + 125, -8, { size: 46, color: C.ink, base: 'middle' });
  text('just now · delivered by pigeon', -cw / 2 + 127, 34, { size: 22, weight: 500, fam: MONO, color: C.muted, base: 'middle', alpha: ck });
  g.restore();
  pal('pidge', 'fly', T, fx, fy, 12, { fps: 14 });
  reset();
  label(T, t0, 'deliver.', C.white, 'rgba(255,255,255,.55)', 5);
}
function weather(T) {
  const t0 = 17;
  g.fillStyle = '#0f1630'; g.fillRect(0, 0, W, H);
  punch(T, t0);
  const str = 'LET IT SNOW', sz = 240, base = 640, top = base - measure('L', sz).asc, m = measure(str, sz, 800, SANS, -6);
  text(str, W / 2, base, { size: sz, color: C.white, align: 'center', track: -6 });
  /* snow settles on every letter top */
  let x = W / 2 - m.w / 2; const pile = cl((T - t0) * 22, 0, 22);
  for (const ch of str) {
    const w = measure(ch, sz, 800, SANS, -6).w;
    if (ch !== ' ') rrect(x + w * .06, top - pile + 2, w * .74, pile + 8, Math.min(12, pile), '#eaf6ff');
    x += w;
  }
  g.fillStyle = C.white;
  for (let i = 0; i < 420; i++) {
    const sp = 260 + hash(i) * 320, sx = hash(i * 7) * W + Math.sin(T * 2 + i) * 20, sy = (hash(i * 3) * H * 1.4 + (T - t0 + 3) * sp) % (H * 1.1) - 40;
    const z = 4 + Math.round(hash(i * 11) * 3) * 3; g.globalAlpha = .5 + hash(i * 5) * .5; g.fillRect(sx, sy, z, z);
  }
  g.globalAlpha = 1;
  pal('penguin', 'slide', T, lerp(W + 100, -100, prog(T, t0 + .2, t0 + 1)), top - pile + 6, 8, { flip: true });
  reset();
  label(T, t0, 'bring the weather.', C.white, 'rgba(255,255,255,.5)', 6);
}
let SWARM;
function swarm(T) {
  const t0 = 18;
  g.fillStyle = C.mint; g.fillRect(0, 0, W, H); grid('rgba(255,255,255,.1)', 48);
  if (!SWARM) {
    const o = document.createElement('canvas'); o.width = W; o.height = H;
    const x = o.getContext('2d'); x.font = font(400); x.letterSpacing = '-8px'; x.textAlign = 'center'; x.fillText('HELLO', W / 2, 690);
    const d = x.getImageData(0, 0, W, H).data, pts = [];
    for (let y = 0; y < H; y += 13) for (let i = 0; i < W; i += 13) if (d[(y * W + i) * 4 + 3] > 128) pts.push([i, y]);
    SWARM = pts.map((p, i) => ({ p, s: [hash(i * 3.1) * W * 1.3 - W * .15, hash(i * 5.7) * H * 1.3 - H * .15], d: hash(i * 9.3) * .35 }));
  }
  punch(T, t0);
  const ants = baked('ants').walk;
  g.imageSmoothingEnabled = false;
  for (const a of SWARM) {
    const k = E.inOut(prog(T, t0 + .05 + a.d, t0 + .85 + a.d));
    const wob = (1 - k) * 40, x = lerp(a.s[0], a.p[0], k) + Math.sin(T * 8 + a.d * 50) * wob, y = lerp(a.s[1], a.p[1], k) + Math.cos(T * 7 + a.d * 40) * wob;
    const ang = k < 1 ? Math.atan2(a.p[1] - a.s[1], a.p[0] - a.s[0]) : Math.sin(T * 3 + a.d * 20) * .4;
    g.save(); g.translate(x, y); g.rotate(ang); g.drawImage(ants[Math.floor(T * 10 + a.d * 10) % ants.length], -12, -4.5, 24, 9); g.restore();
  }
  reset();
  label(T, t0, 'swarm.', C.ink, 'rgba(23,18,31,.5)', 7);
}
/* a tiny platformer across the words of a sentence */
let LEVEL;
const PLAY = [19.5, 21.85];
function level() {
  if (LEVEL) return LEVEL;
  const [t0, t1] = PLAY;
    const ws = [['YOUR', 820], ['SITE', 690], ['IS', 560], ['A', 700], ['LEVEL', 520]], sz = 130;
    let x = 140; LEVEL = { sz, plats: [] };
    for (const [w, base] of ws) { const m = measure(w, sz, 800, SANS, -3); LEVEL.plats.push({ w, x, x1: x + m.w, base, top: base - measure('E', sz).asc }); x += m.w + 120; }
    /* path: run along each word, hop to the next */
    const P = LEVEL.plats, seg = [];
    P.forEach((p, i) => {
      seg.push({ kind: 'run', x0: i ? p.x + 30 : p.x + 40, x1: p.x1 - 34, y: p.top });
      if (P[i + 1]) seg.push({ kind: 'jump', x0: p.x1 - 34, x1: P[i + 1].x + 30, y0: p.top, y1: P[i + 1].top });
    });
    const len = s => s.kind === 'run' ? Math.abs(s.x1 - s.x0) : 260;
    const total = seg.reduce((a, s) => a + len(s), 0);
    let acc = 0; seg.forEach(s => { s.a = acc / total; acc += len(s); s.b = acc / total; });
    LEVEL.seg = seg;
    /* each coin sits over the middle of a jump, so it is taken at the jump's halfway time */
    LEVEL.coins = seg.filter(s => s.kind === 'jump').map(s => ({ x: (s.x0 + s.x1) / 2, y: Math.min(s.y0, s.y1) - 200, at: t0 + .1 + (s.a + s.b) / 2 * (t1 - t0 - .1) }));
  return LEVEL;
}
function play(T) {
  const [t0, t1] = PLAY;
  g.fillStyle = '#1b1430'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(255,255,255,' + (.2 + hash(i) * .5) + ')'; const z = hash(i * 2) > .8 ? 6 : 3; g.fillRect(hash(i * 3) * W, hash(i * 5) * 620, z, z); }
  punch(T, t0);
  const { plats, seg, coins, sz } = level();
  for (const p of plats) {
    text(p.w, p.x, p.base, { size: sz, color: C.white, track: -3 });
    g.fillStyle = C.lime; g.fillRect(p.x, p.top - 10, p.x1 - p.x, 10);
  }
  const u = prog(T, t0 + .1, t1);
  const s = seg.find(s => u <= s.b) || seg[seg.length - 1], k = cl((u - s.a) / (s.b - s.a));
  let x, y, clip;
  if (s.kind === 'run') { x = lerp(s.x0, s.x1, k); y = s.y; clip = u >= 1 ? 'happy' : 'run'; }
  else { x = lerp(s.x0, s.x1, k); y = lerp(s.y0, s.y1, k) - Math.sin(k * Math.PI) * 230; clip = k < .5 ? 'jump' : 'fall'; }
  let got = 0;
  coins.forEach((c, i) => {
    if (T >= c.at) {
      got++;
      const at = c.at, r = prog(T, at, at + .5);
      if (r < 1) text('+1', c.x, c.y - r * 80, { size: 34, fam: PIX, weight: 400, color: C.sun, align: 'center', alpha: 1 - r });
      burst(T, at, c.x, c.y, C.sun, 8, 60);
    } else pal('_coin', 'spin', T, c.x, c.y + Math.sin(T * 6 + i) * 8, 8);
  });
  pal('pix', clip, T, x, y, 9);
  reset();
  text('WORLD 1-1', 110, 120, { size: 30, fam: PIX, weight: 400, color: C.soft });
  text('COINS ' + String(got).padStart(2, '0'), W - 110, 120, { size: 30, fam: PIX, weight: 400, color: C.sun, align: 'right' });
  words([{ w: 'They', color: 'rgba(255,255,255,.5)' }, ...'turn your site into a game.'.split(' ').map(w => ({ w, color: C.white }))], T, { x: 110, y: 985, size: 100, align: 'left', t0: t0 + .04, stagger: .05, dur: .45 });
  text('08 / 08', W - 110, 985, { size: 26, weight: 600, fam: MONO, color: 'rgba(255,255,255,.5)', align: 'right' });
}

/* 22 – 26s: the numbers, one slam per beat pair */
function stats(T) {
  g.fillStyle = C.ink; g.fillRect(0, 0, W, H); grid('rgba(255,255,255,.03)', 48);
  const S4 = [
    [22, 118, 'components', C.lime, 'bitbug', 'walk'],
    [23, 23, 'superpowers', '#a996ff', 'pix', 'happy'],
    [24, 0, 'dependencies', C.coral, 'squish', 'calm'],
    [25, 1, 'line to start', C.sky, 'termi', 'typing']
  ];
  const i = Math.min(3, Math.floor(T - 22)), [t0, n, what, col, who, clip] = S4[i];
  const k = E.outExpo(prog(T, t0, t0 + .45));
  camera(lerp(1.5, 1, k), W / 2, 520, T, [22, 23, 24, 25], 22);
  const shown = n > 1 ? Math.round(n * E.outCubic(prog(T, t0, t0 + .5))) : n;
  const sz = 420, base = 640, str = String(shown), m = measure(String(n), sz, 800, SANS, -12), top = base - measure('8', sz).asc;
  g.globalAlpha = cl(k * 3);
  text(str, W / 2, base, { size: sz, color: col, align: 'center', track: -12 });
  g.globalAlpha = 1;
  const walk = who === 'bitbug' ? (T - t0) * 260 : 0;
  pal(who, clip, T, W / 2 + m.w / 2 - 70 - walk, top, 8, { flip: who === 'bitbug', sx: E.outBack(prog(T, t0 + .2, t0 + .5)), sy: E.outBack(prog(T, t0 + .2, t0 + .5)) });
  reset();
  words([what], T, { x: W / 2, y: 790, size: 92, weight: 650, color: C.white, t0: t0 + .08 });
  vignette(.6);
  flash(T, t0, col, .18, .5);
}

/* 26 – 31s: one line, any stack */
const CODE = [
  [['<', C.soft], ['h1', C.coral], ['>', C.soft]],
  [['  Hello world', C.white]],
  [['  <', C.soft], ['piix-pal', C.coral], [' pal', C.sun], ['=', C.soft], ['"bitbug"', C.lime], [' />', C.soft]],
  [['</', C.soft], ['h1', C.coral], ['>', C.soft]]
];
function code(T) {
  const t0 = 26;
  g.fillStyle = C.deep; g.fillRect(0, 0, W, H); grid('rgba(255,255,255,.03)', 48);
  const rise = E.outExpo(prog(T, t0, t0 + .6));
  camera(lerp(1.06, 1, rise), W / 2, H / 2);
  words(['One', 'line.', { w: 'Any', color: C.lime }, { w: 'stack.', color: C.lime }], T, { x: W / 2, y: 190, size: 104, t0: t0 + .05, stagger: .1 });
  /* the editor */
  const ex = 140, ey = 270 + (1 - rise) * 120, ew = 800, eh = 520;
  rrect(ex + 10, ey + 14, ew, eh, 22, '#000'); rrect(ex, ey, ew, eh, 22, '#0b0810', C.ink2, 3);
  g.save(); g.beginPath(); g.roundRect(ex, ey, ew, 58, [22, 22, 0, 0]); g.fillStyle = '#1a1522'; g.fill(); g.restore();
  [C.coral, C.sun, C.mint].forEach((d, i) => { g.beginPath(); g.arc(ex + 34 + i * 30, ey + 29, 9, 0, 7); g.fillStyle = d; g.fill(); });
  text('index.html', ex + ew / 2, ey + 30, { size: 19, weight: 400, fam: MONO, color: C.soft, align: 'center', base: 'middle' });
  const cmd = '$ npm i piixpal', ct = prog(T, t0 + .3, t0 + .9);
  text(cmd.slice(0, Math.round(cmd.length * ct)), ex + 50, ey + 120, { size: 32, weight: 600, fam: MONO, color: C.white });
  if (T > t0 + 1.0) text('+ piixpal@0.4.0   0 deps   ✓', ex + 50, ey + 168, { size: 26, weight: 400, fam: MONO, color: C.lime, alpha: prog(T, t0 + 1, t0 + 1.15) });
  const all = CODE.reduce((a, l) => a + l.reduce((b, [s]) => b + s.length, 0), 0);
  let left = Math.round(all * prog(T, t0 + 1.3, t0 + 2.6)), cy = ey + 250, lastX = ex + 50, lastY = cy;
  CODE.forEach(line => {
    let x = ex + 50;
    for (const [s, col] of line) {
      if (left <= 0) break;
      const part = s.slice(0, left); left -= part.length;
      text(part, x, cy, { size: 32, weight: 600, fam: MONO, color: col });
      x += measure(part, 32, 600, MONO).w; lastX = x; lastY = cy;
    }
    cy += 52;
  });
  if (Math.floor(T * 3) % 2 === 0 || T < t0 + 2.7) { g.fillStyle = C.lime; g.fillRect(lastX + 4, lastY - 28, 16, 34); }
  /* the page it makes */
  const bx = 980, by = 270 + (1 - rise) * 200;
  browser(bx, by, 800, 520, { bg: C.paper, url: 'localhost:3000', dots: [C.coral, C.sun, C.mint] });
  const hk = E.outExpo(prog(T, t0 + 1.6, t0 + 2));
  const hs = 110, hb = by + 330, htop = hb - measure('H', hs).asc;
  if (hk > 0) text('Hello world', bx + 70, hb + (1 - hk) * 40, { size: hs, color: C.ink, alpha: hk, track: -3 });
  rrect(bx + 70, by + 380, 520, 16, 8, C.line); rrect(bx + 70, by + 412, 420, 16, 8, C.line);
  const pop = t0 + 2.65;
  if (T > pop - .4) arrive(T, pop, bx + 140, htop, 'bitbug', 6, p => pal('bitbug', T < pop + .3 ? 'alarm' : 'walk', T, bx + 140 + cl(T - pop - .3, 0, 3) * 160, htop, 6, { sx: p, sy: p }));
  /* the ways in */
  ['HTML', 'React', 'Vue', 'Svelte', 'shadcn', 'npm'].forEach((s, i, a) => {
    const at = t0 + 3.2 + i * .2, k = E.outBack(prog(T, at, at + .35));
    if (k > 0) pill(s, W / 2 + (i - (a.length - 1) / 2) * 250, 930, { size: 34, fam: SANS, weight: 750, bg: [C.lime, C.sky, C.mint, C.sun, C.coral, '#a996ff'][i], k });
  });
  reset();
  vignette(.45);
}

/* 31 – 34s: everyone */
const BIG = [['whale', 330, C.sky], ['astronaut', 620], ['unicorn', 900], ['gpu', 1180], ['llama', 1440], ['crt', 1700]];
let PARADE;
function parade(T) {
  const t0 = 31;
  g.fillStyle = C.lime; g.fillRect(0, 0, W, H); grid('rgba(23,18,31,.07)', 48, -(T - t0) * 120);
  words(['Free.', 'Open', 'source.', { w: 'Yours.', color: C.violet }], T, { x: W / 2, y: 210, size: 128, color: C.ink, t0: t0 + .1, stagger: .14 });
  g.fillStyle = C.ink; g.fillRect(0, 900, W, 180);
  for (let x = -((T * 300) % 96); x < W; x += 96) { g.fillStyle = C.ink2; g.fillRect(x, 930, 48, 14); }
  if (!PARADE) PARADE = Object.keys(S).filter(n => n[0] !== '_' && !['fence', 'molehill', 'fireflies', 'ants', 'fish', 'bees', 'duckling'].includes(n));
  const gap = 190, speed = 640;
  PARADE.forEach((n, i) => {
    const x = (T - t0) * speed - i * gap + 300;
    if (x < -150 || x > W + 150) return;
    const clips = Object.keys(S[n].frames), clip = ['walk', 'run', 'fly', 'go', 'slide', 'swim', 'roam'].find(c => clips.includes(c)) || clips[0];
    const hop = clip === clips[0] && !['walk', 'run'].includes(clip) ? -Math.abs(Math.sin(T * 9 + i)) * 26 : 0;
    const s = Math.max(4, Math.round(124 / Math.max(S[n].w, S[n].h)));
    pal(n, clip, T + i * .13, x, 900 + hop, s);
  });
  vignette(.25);
}
function bigSprites(T) {
  const on = T >= 31 && T < 34;
  BIG.forEach(([n, x], i) => {
    const el = BIG_EL[i], at = 31.5 + i * .25, k = E.outBack(prog(T, at, at + .4));
    el.style.display = on && k > 0 ? '' : 'none';
    el._vis = true; /* drawn every frame, the observer is too slow for a frame-by-frame render */
    el.style.transform = `translate(-50%,-100%) scale(${k}) translateY(${Math.sin(T * 6 + i) * 6}px)`;
  });
}
const BIG_EL = BIG.map(([n, x]) => {
  const el = document.createElement('piix-sprite');
  el.setAttribute('name', n); el.setAttribute('scale', '8'); el.setAttribute('look', 'none'); el.setAttribute('sleep-after', '0');
  el.style.left = x + 'px'; el.style.top = '720px'; el.style.display = 'none';
  document.getElementById('big').append(el);
  return el;
});

/* 34 – 38s: the name, the line, the address */
function end(T) {
  const t0 = 34;
  g.fillStyle = C.ink; g.fillRect(0, 0, W, H); grid('rgba(198,244,50,.045)', 48, 0, -(T - t0) * 20);
  const k = E.outExpo(prog(T, t0, t0 + .8));
  camera(lerp(1.08, 1, k), W / 2, 480);
  const sz = 280, base = 520, m = measure('Piixpal', sz, 800, SANS, -12), top = base - measure('P', sz).asc;
  words([{ w: 'Piixpal', color: C.white }], T, { x: W / 2, y: base, size: sz, t0: t0 + .02, dur: .8, track: -12 });
  const px = W / 2 - m.w / 2 + 70;
  arrive(T, t0 + .7, px, top, 'bitbug', 7, p => pal('bitbug', T < t0 + 1.4 ? 'idle' : T < t0 + 2.4 ? 'look' : 'sniff', T, px, top, 7, { sx: p, sy: p }));
  words(['Tiny', 'pixel', 'creatures', 'that', { w: 'live', color: C.lime }, 'on', 'your', 'website.'], T, { x: W / 2, y: 650, size: 56, weight: 600, color: C.soft, t0: t0 + .45, stagger: .05 });
  const a = E.outBack(prog(T, t0 + 1.0, t0 + 1.4)), b = E.outBack(prog(T, t0 + 1.2, t0 + 1.6));
  if (a > 0) pill('npm i piixpal', W / 2 - 230, 790, { size: 36, bg: C.ink2, fg: C.lime, k: a, shadow: '#000' });
  if (b > 0) pill('piixpal.dvkk.dev', W / 2 + 230, 790, { size: 36, k: b, shadow: '#000' });
  if (T > t0 + 1.7) text('free & open source  ·  MIT  ·  118 components  ·  0 dependencies', W / 2, 920, { size: 24, weight: 400, fam: MONO, color: C.muted, align: 'center', alpha: prog(T, t0 + 1.7, t0 + 2.1) });
  if (a > .5) pal('pip', T < t0 + 2 ? 'idle' : 'peck', T, W / 2 - 330, 754, 6);
  if (b > .5) { const bb = Math.abs(Math.sin((T - t0) * Math.PI * 2)); pal('boing', bb > .2 ? 'air' : 'land', T, W / 2 + 380, 754 - bb * 50, 5); }
  reset();
  vignette(.55);
  flash(T, t0, C.lime, .5);
  if (T > 37.3) { g.fillStyle = `rgba(0,0,0,${E.inOut(prog(T, 37.3, 38))})`; g.fillRect(0, 0, W, H); }
}

/* ===================================================================== sound cues
 * music.mjs reads these, so every blip lands on the frame that makes it */
function cues() {
  const c = [], at = (t, kind) => c.push([+t.toFixed(3), kind]);
  [.2, .45, .7, .95, 1.2, 4.3, 4.42, 4.54, 4.66].forEach(t => at(t, 'word'));
  [4.4, 5.6, 5.85, 6.1, 6.35, 6.6, 6.85, 7.1, 28.65, 34.7].forEach(t => at(t, 'pop'));
  [9.05, 9.2, 9.35, 9.5, 9.65, 9.8, 9.95].forEach(t => at(t, 'land'));
  [0, 6, 9, 15, 21, 27, 33].forEach(col => at(8.02 + col * .032 + .3, 'block'));
  [13, 14, 15, 16, 17, 18, 19.5].forEach(t => at(t - .06, 'cut'));
  [11.78, 21.78, 25.78, 30.78].forEach(t => at(t, 'wipe'));
  [15.05, 15.2, 15.32].forEach(t => at(t, 'throw'));
  at(14.38, 'land'); at(16.45, 'ding');
  level().coins.forEach(k => at(k.at, 'coin'));
  [22, 23, 24, 25].forEach(t => at(t, 'slam'));
  for (let i = 0; i < 15; i++) at(26.3 + i * .6 / 15, 'key');
  for (let i = 0; i < 60; i++) at(27.3 + i * 1.3 / 60, 'key');
  for (let i = 0; i < 6; i++) at(29.2 + i * .2, 'chip');
  for (let i = 0; i < 6; i++) at(31.5 + i * .25, 'bigpop');
  return c.sort((a, b) => a[0] - b[0]);
}

/* ===================================================================== timeline */
const SCENES = [[0, opening], [8, title], [12, crawl], [13, nap], [14, perch], [15, thrown], [16, deliver], [17, weather], [18, swarm], [19.5, play], [22, stats], [26, code], [31, parade], [34, end]];
function draw(T) {
  reset();
  g.imageSmoothingEnabled = false;
  let s = SCENES[0][1];
  for (const [at, fn] of SCENES) if (T >= at) s = fn;
  s(T);
  reset();
  wipe(T, 12, C.ink); wipe(T, 22, C.lime); wipe(T, 26, C.violet); wipe(T, 31, C.ink);
}

