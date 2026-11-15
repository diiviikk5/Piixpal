/* Pal Genetics: breed two pals into a new one.
 * A pal's genes are its Pal Maker drawing and traits: body shape, colour patches, eyes, mouth,
 * legs, wings, what it does, cheeks and outline. A child blends its parents' silhouettes (signed
 * distance fields, mixed), inherits colour in patches from each, takes every trait from one parent
 * or the other, and now and then mutates. Every child is a real pal code: it works as
 * <piix-pal make="…"> anywhere, and opens in the Pal Maker. */
(() => {
  const root = document.getElementById('gx');
  const K = window.Piixpal && Piixpal._k, M = K && K.MAKER;
  if (!root || !M) return;
  const { EYES, MOUTHS, LEGS, WINGS, DOES } = M;
  const NURSERY = 'piix-nursery';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- a seeded random, so the same parents and seed always make the same child ---------- */
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

  /* ---------- colour helpers ---------- */
  const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const hex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const hueShift = (h, deg) => {
    let [r, g, b] = rgb(h).map(v => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let H = 0, S = 0;
    if (d) { S = d / (1 - Math.abs(2 * l - 1)); H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; }
    H = ((H * 60 + deg) % 360 + 360) % 360;
    const C = (1 - Math.abs(2 * l - 1)) * S, X = C * (1 - Math.abs((H / 60) % 2 - 1)), m = l - C / 2;
    const [a, bb, c] = H < 60 ? [C, X, 0] : H < 120 ? [X, C, 0] : H < 180 ? [0, C, X] : H < 240 ? [0, X, C] : H < 300 ? [X, 0, C] : [C, 0, X];
    return hex([(a + m) * 255, (bb + m) * 255, (c + m) * 255]);
  };
  const near = (pal, h) => { const [r, g, b] = rgb(h); let best = 0, bd = 1e9; pal.forEach((p, i) => { const [R, G, B] = rgb(p), d = (R - r) ** 2 + (G - g) ** 2 + (B - b) ** 2; if (d < bd) { bd = d; best = i; } }); return best; };

  /* ---------- founders: eight pals to start a family tree with ---------- */
  const founder = (name, w, h, inside, [base, light, shade], t) => {
    const px = new Uint8Array(w * h), I = (x, y) => x >= 0 && y >= 0 && x < w && y < h && inside(x, y);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!I(x, y)) continue;
      px[y * w + x] = (!I(x + 1, y) || !I(x, y + 1) || !I(x, y + 2)) ? 3 : (!I(x - 1, y) || !I(x, y - 1)) && y < h * .6 && x < w * .6 ? 2 : 1;
    }
    return { name, w, h, colors: [base, light, shade], ink: '#1b1226', px, outline: true, cheeks: true, scale: 4, ...t };
  };
  const E = (x, y) => (x * x + y * y) <= 1;
  const RR = (x, y, x0, y0, x1, y1, r) => { if (x < x0 || x > x1 || y < y0 || y > y1) return false; const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r); return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + .5; };
  const FOUNDERS = [
    founder('mochi', 14, 12, (x, y) => y >= 1 && E((x + .5 - 7) / 6.6, (y + .5 - 7) / 5.6), ['#c6f432', '#efffc0', '#7fa61c'],
      { eyes: { style: 3, x: 7, y: 4, gap: 4 }, mouth: { style: 2, x: 8, y: 8 }, legs: 1, wings: 0, does: 'crawl' }),
    founder('tuft', 14, 13, (x, y) => (y >= 3 && x >= 1 && x <= 12 && !(y === 3 && (x === 1 || x === 12)) && !(y === 12 && (x === 1 || x === 12))) || (y < 3 && ((x >= 2 && x <= 4 && y >= 3 - (x - 1)) || (x >= 9 && x <= 11 && y >= x - 9))), ['#ff9a3c', '#ffd29a', '#d0662a'],
      { eyes: { style: 2, x: 6, y: 6, gap: 4 }, mouth: { style: 3, x: 7, y: 9 }, legs: 4, wings: 0, does: 'lounge' }),
    founder('plum', 12, 14, (x, y) => (y < 7 ? E((x + .5 - 6) / 5.6, (y + .5 - 7) / 6.4) : x >= 1 && x <= 10 && !(y === 13 && x % 3 === 1)), ['#9b7bff', '#d6c8ff', '#6a4bd6'],
      { eyes: { style: 4, x: 4, y: 4, gap: 4 }, mouth: { style: 4, x: 6, y: 8 }, legs: 0, wings: 0, does: 'float', cheeks: false }),
    founder('zip', 13, 11, (x, y) => E((x + .5 - 6) / 5.4, (y + .5 - 6.2) / 4.8) || (x >= 11 && y >= 5 && y <= 6), ['#ffd23f', '#fff2a8', '#e0a21a'],
      { eyes: { style: 1, x: 8, y: 4, gap: 0 }, mouth: { style: 1, x: 10, y: 6 }, legs: 2, wings: 1, does: 'bounce', cheeks: true }),
    founder('pebble', 18, 9, (x, y) => E((x + .5 - 9) / 8.8, (y + .5 - 6) / 6) && y >= 1, ['#a9b0bd', '#dfe3ea', '#737a88'],
      { eyes: { style: 6, x: 9, y: 3, gap: 4 }, mouth: { style: 0, x: 0, y: 0 }, legs: 3, wings: 0, does: 'creep', cheeks: false }),
    founder('ember', 12, 15, (x, y) => E((x + .5 - 6) / 5.4, (y + .5 - 9.6) / 5.4) || (y < 6 && Math.abs(x + .5 - 6 - (6 - y) * .35) < y * .8), ['#ff6b4a', '#ffc06a', '#c83a2a'],
      { eyes: { style: 5, x: 4, y: 8, gap: 4 }, mouth: { style: 5, x: 6, y: 11 }, legs: 0, wings: 2, does: 'bounce', cheeks: false }),
    founder('capy', 17, 11, (x, y) => RR(x, y, 0, 4, 13, 10, 3) || RR(x, y, 9, 1, 16, 7, 2.2) || (y === 0 && x === 11), ['#b07a4a', '#d9a877', '#8a5a32'],
      { eyes: { style: 1, x: 13, y: 3, gap: 0 }, mouth: { style: 1, x: 15, y: 5 }, legs: 1, wings: 0, does: 'lounge', cheeks: true }),
    founder('bloop', 14, 12, (x, y) => E((x + .5 - 7) / 6.6, (y + .5 - 6) / 5.4) || (y >= 9 && x >= 1 && x <= 12 && x % 3 !== 0), ['#ff7aa8', '#ffc6da', '#d24a7e'],
      { eyes: { style: 3, x: 4, y: 3, gap: 5 }, mouth: { style: 2, x: 6, y: 6 }, legs: 0, wings: 0, does: 'slide' })
  ].map(m => ({ code: M.encode(m), gen: 0, from: null }));

  /* ---------- the body as a signed distance field: negative inside, positive outside ---------- */
  const field = m => {
    const { w, h, px } = m, sd = new Float32Array(w * h);
    let L = w, R = -1, T = h, B = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[y * w + x]) { L = Math.min(L, x); R = Math.max(R, x); T = Math.min(T, y); B = Math.max(B, y); }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const inn = !!px[y * w + x];
      let d = 1e9;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!!px[j * w + i] !== inn) d = Math.min(d, (i - x) ** 2 + (j - y) ** 2);
      sd[y * w + x] = (inn ? -1 : 1) * (Math.sqrt(d) - .5);
    }
    return { sd, L, R, T, B, cw: R - L + 1, ch: B - T + 1 };
  };
  /* the parent's field, sampled where the child's (x, y) lands on it */
  const sample = (m, f, u, v, outside) => {
    const x = f.L + u * f.cw - .5, y = f.T + v * f.ch - .5;
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= m.w || yi >= m.h) return { d: outside, c: 0 };
    return { d: f.sd[yi * m.w + xi], c: m.px[yi * m.w + xi] };
  };

  /* ---------- breed ---------- */
  const breed = (pa, pb, seed) => {
    const A = M.decode(pa.code), B = M.decode(pb.code), r = rng(seed), fa = field(A), fb = field(B);
    const t = .3 + r() * .4;                      /* how much of B's shape */
    const mut = [];
    let cw = Math.round(fa.cw + (fb.cw - fa.cw) * t), ch = Math.round(fa.ch + (fb.ch - fa.ch) * t);
    if (r() < .05) { const k = r() < .5 ? .8 : 1.2; cw = Math.round(cw * k); ch = Math.round(ch * (2 - k) * .5 + ch * .5); mut.push('shape'); }
    cw = Math.max(6, Math.min(24, cw)); ch = Math.max(5, Math.min(20, ch));
    const w = cw + 2, h = ch + 1, px = new Uint8Array(w * h);
    /* colour patches: a soft split across the body, at a random angle */
    const ang = r() * Math.PI * 2, dx = Math.cos(ang), dy = Math.sin(ang), wob = r() * 6, cut = (t - .5) * .6;
    const colors = [], map = new Map(), from = { A: 0, B: 0 };
    const slot = (who, P, c) => {
      const key = who + c;
      if (!map.has(key)) {
        const col = P.colors[c - 1] || P.colors[0];
        map.set(key, colors.length < 15 ? (colors.push(col), colors.length) : near(colors, col) + 1);
      }
      return map.get(key);
    };
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const u = (x + .5) / cw, v = (y + .5) / ch;
      const sa = sample(A, fa, u, v, 3), sb = sample(B, fb, u, v, 3);
      const scale = (cw + ch) / ((fa.cw + fa.ch) * (1 - t) + (fb.cw + fb.ch) * t);
      if (sa.d * (1 - t) * scale + sb.d * t * scale > 0) continue;
      const side = (u - .5) * dx + (v - .5) * dy + Math.sin(u * wob + v * 2) * .06;
      let who = side < cut ? 'A' : 'B';
      if (who === 'A' && !sa.c) who = 'B';
      if (who === 'B' && !sb.c) who = sa.c ? 'A' : 'B';
      const c = who === 'A' ? sa.c : sb.c;
      from[who]++;
      px[y * w + x + 1] = slot(who, who === 'A' ? A : B, c || 1);
    }
    /* keep the biggest piece, so nothing floats loose */
    const seen = new Uint8Array(w * h);
    let best = [];
    for (let i = 0; i < w * h; i++) {
      if (!px[i] || seen[i]) continue;
      const part = [], st = [i]; seen[i] = 1;
      while (st.length) { const j = st.pop(); part.push(j); const x = j % w, y = (j / w) | 0; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + a, yy = y + b, k = yy * w + xx; if (xx >= 0 && yy >= 0 && xx < w && yy < h && px[k] && !seen[k]) { seen[k] = 1; st.push(k); } } }
      if (part.length > best.length) best = part;
    }
    const keep = new Set(best);
    for (let i = 0; i < w * h; i++) if (px[i] && !keep.has(i)) px[i] = 0;
    /* a colour mutation: one parent's whole family of colours shifts hue */
    if (r() < .08) { const sh = (r() < .5 ? -1 : 1) * (40 + r() * 80); for (let i = 0; i < colors.length; i++) colors[i] = hueShift(colors[i], sh); mut.push('colour'); }

    /* traits: each from one parent, sometimes a mutation */
    const genes = {};
    const take = (key, get, choices) => {
      if (r() < .025) { genes[key] = 'mut'; mut.push(key); return choices[(r() * choices.length) | 0]; }
      const who = r() < .5 ? 'A' : 'B';
      genes[key] = who;
      return get(who === 'A' ? A : B);
    };
    const idx = list => list.map((_, i) => i);
    const eyesFrom = r() < .5 ? 'A' : 'B', P = eyesFrom === 'A' ? A : B, f = eyesFrom === 'A' ? fa : fb;
    const eyeStyle = take('eyes', p => p.eyes.style, idx(EYES).slice(1));
    if (genes.eyes !== 'mut' && genes.eyes !== eyesFrom) genes.eyes = eyesFrom;
    const eyeStyleFinal = genes.eyes === 'mut' ? eyeStyle : P.eyes.style || 1;
    const mouthStyle = take('mouth', p => p.mouth.style, idx(MOUTHS));
    const legs = take('legs', p => p.legs, idx(LEGS));
    const wings = take('wings', p => p.wings, idx(WINGS));
    const does = take('does', p => p.does, DOES);
    const cheeks = take('cheeks', p => p.cheeks, [true, false]);
    const outline = take('outline', p => p.outline, [true, false]);
    const ink = (r() < .5 ? A : B).ink;
    /* place the face where the eye parent had it, then make sure it's on the body */
    const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && px[y * w + x];
    const put = (ex, ey) => [Math.round((ex - f.L + .5) / f.cw * cw - .5) + 1, Math.round((ey - f.T + .5) / f.ch * ch - .5)];
    let [ex, ey] = put(P.eyes.x, P.eyes.y);
    let gap = Math.max(P.eyes.gap ? 3 : 0, Math.round(P.eyes.gap / f.cw * cw));
    const ew = 2;
    for (let n = 0; n < 12 && !(inside(ex, ey) && inside(ex + gap + ew - 1, ey + 1)); n++) {
      ex += ex + gap / 2 < w / 2 ? 1 : -1; ey += ey < h * .35 ? 1 : 0;
      if (n > 6 && gap > 2) gap--;
    }
    const mp = genes.mouth === 'B' ? B : A, mf = genes.mouth === 'B' ? fb : fa;
    let [mx, my] = [Math.round((mp.mouth.x - mf.L + .5) / mf.cw * cw - .5) + 1, Math.round((mp.mouth.y - mf.T + .5) / mf.ch * ch - .5)];
    if (!mp.mouth.style || !inside(mx, my)) { mx = ex + Math.max(1, gap >> 1); my = Math.min(h - 2, ey + 3); }
    my = Math.max(my, ey + 2);
    for (let n = 0; n < 8 && !inside(mx, my); n++) my--;

    const name = (A.name.slice(0, Math.ceil(A.name.length / 2)) + B.name.slice(Math.floor(B.name.length / 2))).slice(0, 12);
    const child = {
      name, w, h, colors: colors.length ? colors : A.colors.slice(), ink, px, outline, cheeks,
      eyes: { style: eyeStyleFinal, x: Math.max(0, ex), y: Math.max(0, ey), gap },
      mouth: { style: mouthStyle, x: Math.max(0, mx), y: Math.max(0, my) },
      legs, wings, does, scale: Math.round((A.scale + B.scale) / 2) || 4
    };
    const total = from.A + from.B || 1;
    return {
      code: M.encode(child), name, gen: Math.max(pa.gen, pb.gen) + 1, from: [A.name, B.name],
      report: { shape: Math.round((1 - t) * 100), colour: Math.round(from.A / total * 100), genes, mut, does }
    };
  };

  /* ---------- drawing a pal into a canvas, animated ---------- */
  const art = new Map();
  const spriteOf = code => { if (!art.has(code)) art.set(code, M.sprite(M.decode(code))); return art.get(code); };
  const views = new Set();
  const draw = (cv, code, size, clip = 'idle') => {
    const sp = spriteOf(code), Z = Math.max(1, Math.floor(size / Math.max(sp.w, sp.h)));
    cv.width = sp.w * Z; cv.height = sp.h * Z;
    const v = { cv, sp, Z, clip, i: 0, t: 0 };
    cv._v = v; views.add(v);
    paint(v);
    return v;
  };
  const paint = v => {
    const rows = (v.sp.frames[v.clip] || v.sp.frames.idle)[v.i % (v.sp.frames[v.clip] || v.sp.frames.idle).length];
    const g = v.cv.getContext('2d');
    g.clearRect(0, 0, v.cv.width, v.cv.height);
    const top = v.sp.h - rows.length;
    rows.forEach((r, y) => [...r].forEach((c, x) => { const col = v.sp.palette[c]; if (col) { g.fillStyle = col; g.fillRect(x * v.Z, (y + top) * v.Z, v.Z, v.Z); } }));
  };
  let last = 0;
  const loop = t => {
    const dt = Math.min(.1, (t - last) / 1000); last = t;
    for (const v of views) {
      if (!v.cv.isConnected) { views.delete(v); continue; }
      if (reduce) continue;
      v.t += dt;
      const fps = (v.sp.fps && v.sp.fps[v.clip]) || 3;
      if (v.t > 1 / fps) { v.t = 0; v.i++; paint(v); }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  const setClip = (cv, clip) => { if (cv._v && cv._v.clip !== clip) { cv._v.clip = clip; cv._v.i = 0; paint(cv._v); } };

  /* ---------- state ---------- */
  const load = () => { try { return JSON.parse(localStorage.getItem(NURSERY)) || []; } catch (_) { return []; } };
  const save = () => { try { localStorage.setItem(NURSERY, JSON.stringify(nursery.slice(0, 24))); } catch (_) { /* private mode */ } };
  let nursery = load(), parents = [FOUNDERS[0], FOUNDERS[6]], active = 0, kid = null, seed = (Math.random() * 1e9) | 0;

  /* ---------- markup ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HEART = '<svg viewBox="0 0 8 7" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 0h2v1h2V0h2v1h1v2H7v1H6v1H5v1H3V5H2V4H1V3H0V1h1z"/></svg>';
  const EGG = '<svg viewBox="0 0 12 14" shape-rendering="crispEdges" aria-hidden="true"><path fill="#1b1226" d="M4 0h4v1h1v1h1v2h1v3h1v5h-1v1h-1v1H2v-1H1v-1H0V7h1V4h1V2h1V1h1z"/><path fill="#fff7e6" d="M4 1h4v1h1v2h1v3h1v5h-1v1H2v-1H1V7h1V4h1V2h1z"/><path fill="#ffd23f" d="M3 6h1v1h1v1h1V7h1V6h1v1h1v1h1v1H9v1H8V9H7v1H6V9H5v1H4V9H3V8H2V7h1z"/><path fill="#e8dcc4" d="M9 9h1v3H9v1H3v-1h6z"/></svg>';
  root.innerHTML = `
  <div class="gx-lab">
    <div class="gx-parents">
      <button class="gx-slot" data-slot="0" type="button" aria-pressed="true"><span class="gx-who">Parent A</span><canvas></canvas><b></b><small></small></button>
      <div class="gx-mid">
        <button class="btn btn-heart gx-breed" type="button">${HEART}<span>Breed</span></button>
        <button class="gx-swap" type="button" title="Swap parents" aria-label="Swap parents">⇄</button>
      </div>
      <button class="gx-slot" data-slot="1" type="button" aria-pressed="false"><span class="gx-who">Parent B</span><canvas></canvas><b></b><small></small></button>
    </div>
    <div class="gx-pool">
      <div class="gx-pool-h"><b>Gene pool</b><span>Pick a pal for <em class="gx-for">Parent A</em></span></div>
      <div class="gx-tiles gx-founders"></div>
      <div class="gx-pool-h gx-nh" hidden><b>Your nursery</b><button class="gx-clear" type="button">Clear</button></div>
      <div class="gx-tiles gx-nursery"></div>
    </div>
  </div>
  <section class="gx-out" aria-live="polite" hidden>
    <div class="gx-child">
      <div class="gx-crib"><span class="gx-egg">${EGG}</span><canvas></canvas><span class="gx-gen"></span></div>
      <div class="gx-info">
        <h3 class="gx-name"></h3>
        <p class="gx-line"></p>
        <ul class="gx-genes"></ul>
        <div class="gx-acts">
          <button class="btn btn-lime btn-sm gx-keep" type="button">Keep in nursery</button>
          <button class="btn btn-sm gx-again" type="button">Breed again</button>
          <button class="btn btn-sm gx-asparent" type="button">Make it a parent</button>
        </div>
      </div>
    </div>
    <div class="gx-use">
      <div class="gx-ledge" id="gx-ledge"><span>your website</span></div>
      <div class="gx-tag"><code class="gx-code"></code><div><button class="btn btn-sm gx-copy" type="button"><span data-label>Copy tag</span></button><a class="btn btn-sm btn-ghost gx-open" target="_blank" rel="noopener">Open in Pal Maker ↗</a></div></div>
    </div>
  </section>`;
  const $ = s => root.querySelector(s);

  const tile = (p, i, kind) => `<button class="gx-tile" type="button" data-kind="${kind}" data-i="${i}" title="${esc(M.decode(p.code).name)}${p.gen ? ' · gen ' + p.gen : ''}"><canvas></canvas><span>${esc(M.decode(p.code).name)}</span>${p.gen ? `<i>G${p.gen}</i>` : ''}</button>`;
  const renderPool = () => {
    $('.gx-founders').innerHTML = FOUNDERS.map((p, i) => tile(p, i, 'f')).join('');
    $('.gx-nursery').innerHTML = nursery.map((p, i) => tile(p, i, 'n')).join('');
    $('.gx-nh').hidden = !nursery.length;
    root.querySelectorAll('.gx-tile').forEach(b => draw(b.querySelector('canvas'), (b.dataset.kind === 'f' ? FOUNDERS : nursery)[+b.dataset.i].code, 52));
  };
  const renderParents = () => {
    root.querySelectorAll('.gx-slot').forEach((b, i) => {
      const p = parents[i], m = M.decode(p.code);
      draw(b.querySelector('canvas'), p.code, 120);
      b.querySelector('b').textContent = m.name;
      b.querySelector('small').textContent = p.gen ? `generation ${p.gen}` : 'founder';
      b.setAttribute('aria-pressed', i === active);
    });
    $('.gx-for').textContent = active ? 'Parent B' : 'Parent A';
  };

  const TRAIT = { eyes: 'Eyes', mouth: 'Mouth', legs: 'Legs', wings: 'Wings', does: 'Behaviour', cheeks: 'Cheeks', outline: 'Outline' };
  const value = (k, m) => k === 'eyes' ? EYES[m.eyes.style] : k === 'mouth' ? MOUTHS[m.mouth.style] : k === 'legs' ? LEGS[m.legs] : k === 'wings' ? WINGS[m.wings] : k === 'does' ? m.does : k === 'cheeks' ? (m.cheeks ? 'rosy' : 'plain') : (m.outline ? 'inked' : 'none');
  const showKid = (hatch = true) => {
    const out = $('.gx-out'), m = M.decode(kid.code), [na, nb] = kid.from, R = kid.report;
    out.hidden = false;
    $('.gx-name').textContent = m.name;
    $('.gx-gen').textContent = 'gen ' + kid.gen;
    $('.gx-line').innerHTML = `Child of <b class="gx-a">${esc(na)}</b> and <b class="gx-b">${esc(nb)}</b>. ${R.mut.length ? `<span class="gx-m">✨ Mutated: ${R.mut.map(k => (TRAIT[k] || k).toLowerCase()).join(', ')}</span>` : 'No mutations this time.'}`;
    const bar = (label, a) => `<li class="gx-bar"><span>${label}</span><div><i style="width:${a}%"></i></div><em>${a}% ${esc(na)} · ${100 - a}% ${esc(nb)}</em></li>`;
    $('.gx-genes').innerHTML = bar('Shape', R.shape) + bar('Colour', R.colour) +
      Object.keys(TRAIT).map(k => { const g = R.genes[k]; return `<li class="gx-g gx-${g === 'mut' ? 'm' : g === 'A' ? 'a' : 'b'}"><span>${TRAIT[k]}</span><b>${esc(value(k, m))}</b><em>${g === 'mut' ? '✨ mutation' : g === 'A' ? 'from ' + esc(na) : 'from ' + esc(nb)}</em></li>`; }).join('');
    const tag = `<piix-pal make="${kid.code}"></piix-pal>`;
    $('.gx-code').textContent = tag;
    $('.gx-open').href = 'make.html#' + kid.code;
    $('.gx-keep').disabled = nursery.some(n => n.code === kid.code);
    $('.gx-keep').textContent = $('.gx-keep').disabled ? 'In your nursery' : 'Keep in nursery';
    /* the live one, on the ledge */
    const ledge = $('#gx-ledge');
    ledge.querySelectorAll('piix-pal').forEach(p => p.remove());
    ledge.parentElement.querySelectorAll('piix-pal').forEach(p => p.remove());
    const live = document.createElement('piix-pal');
    live.setAttribute('make', kid.code); live.setAttribute('on', '#gx-ledge');
    ledge.after(live);
    const crib = $('.gx-crib'), cv = crib.querySelector('canvas');
    draw(cv, kid.code, 170, 'happy');
    crib.classList.remove('hatch', 'born');
    if (hatch && !reduce) {
      void crib.offsetWidth;
      crib.classList.add('hatch');
      setTimeout(() => { crib.classList.remove('hatch'); crib.classList.add('born'); setTimeout(() => { crib.classList.remove('born'); setClip(cv, 'idle'); }, 1400); }, 1100);
    } else setClip(cv, 'idle');
  };
  const doBreed = (hatch = true) => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    kid = breed(parents[0], parents[1], hash(parents[0].code + parents[1].code) ^ seed);
    showKid(hatch);
    if (hatch && innerWidth < 900) $('.gx-out').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  /* ---------- events ---------- */
  root.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('gx-slot')) { active = +b.dataset.slot; renderParents(); return; }
    if (b.classList.contains('gx-tile')) {
      const p = (b.dataset.kind === 'f' ? FOUNDERS : nursery)[+b.dataset.i];
      parents[active] = p; active = active ? 0 : 1; renderParents(); return;
    }
    if (b.classList.contains('gx-swap')) { parents.reverse(); renderParents(); return; }
    if (b.classList.contains('gx-breed') || b.classList.contains('gx-again')) { doBreed(); return; }
    if (b.classList.contains('gx-keep') && kid) {
      nursery.unshift({ code: kid.code, gen: kid.gen, from: kid.from }); nursery = nursery.slice(0, 24); save(); renderPool(); showKid(false); return;
    }
    if (b.classList.contains('gx-asparent') && kid) {
      if (!nursery.some(n => n.code === kid.code)) { nursery.unshift({ code: kid.code, gen: kid.gen, from: kid.from }); save(); renderPool(); }
      parents[active] = nursery.find(n => n.code === kid.code); active = active ? 0 : 1; renderParents();
      root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); return;
    }
    if (b.classList.contains('gx-clear')) { nursery = []; save(); renderPool(); return; }
    if (b.classList.contains('gx-copy') && kid) {
      const l = b.querySelector('[data-label]');
      try { await navigator.clipboard.writeText($('.gx-code').textContent); l.textContent = 'Copied!'; } catch (_) { l.textContent = 'Select and copy'; }
      setTimeout(() => { l.textContent = 'Copy tag'; }, 1500);
    }
  });
  root.addEventListener('pointerover', e => { const c = e.target.closest('.gx-slot,.gx-tile,.gx-crib'); if (c) setClip(c.querySelector('canvas'), 'happy'); });
  root.addEventListener('pointerout', e => { const c = e.target.closest('.gx-slot,.gx-tile,.gx-crib'); if (c && !c.contains(e.relatedTarget)) setClip(c.querySelector('canvas'), 'idle'); });

  renderPool();
  renderParents();
  Piixpal._genetics = { breed, FOUNDERS };
})();
