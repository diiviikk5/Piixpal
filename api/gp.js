/* Gitpal: animated, live components for GitHub READMEs.
 *
 *   ![](https://piixpal.dvkk.dev/gp/signature?name=Divik)
 *
 * Every component is an SVG drawn on request. GitHub shows README images in a sandbox
 * (no scripts, no web fonts), so all motion is CSS/SMIL inside the SVG and every letter
 * is drawn as a path from api/_gpfonts.json. Shared options:
 *   theme   dark | light | auto (follows the viewer's system)        default: dark
 *   accent  hex colour without #                                     default per component
 *   width   image width in px                                        default per component
 *
 * Components: signature, aurora, terminal, type, orbit, constellation, clock, glitch, divider, wave */
const FONTS = require('./_gpfonts.json');
const store = require('./_store.js');

/* ---------- small helpers ---------- */
const HEX = /^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
const color = (v, d) => (v && HEX.test(v) ? '#' + v : d);
const num = (v, d, lo, hi) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const str = (v, d, max = 60) => { const s = String(v == null || v === '' ? d : v).replace(/[^\x20-\x7e]/g, '').slice(0, max); return s; };
const r1 = v => Math.round(v * 10) / 10;
const hashStr = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rng = seed => () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) ^ Math.imul(seed ^ (seed >>> 13), 3266489909)) >>> 0) / 4294967296;
const THEMES = {
  dark: { bg: '#0d1117', fg: '#e6edf3', dim: '#7d8590', line: '#30363d', card: '#161b22' },
  light: { bg: '#ffffff', fg: '#1f2328', dim: '#656d76', line: '#d0d7de', card: '#f6f8fa' }
};
/* colours as CSS variables, so theme=auto can swap them with a media query */
const themeCSS = (q, extra = '') => {
  const t = q.theme === 'light' ? 'light' : 'dark', a = THEMES[t], b = THEMES.light;
  const vars = o => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  return `svg{${vars(a)};${extra}}` + (q.theme === 'auto' ? `@media (prefers-color-scheme:light){svg{${vars(b)}}}` : '');
};

/* lay out a line of text as glyph paths: [{ d, x, w, ch }], total width, at font size `size` */
const layout = (font, text, size, track = 0) => {
  const F = FONTS[font], k = size / 1000;
  let x = 0;
  const out = [];
  for (const ch of text) {
    const g = F.g[ch] || F.g['?'];
    out.push({ d: g[1], x, w: g[0] * k, ch });
    x += g[0] * k + track;
  }
  return { glyphs: out, width: Math.max(0, x - track), k, asc: F.asc * k, desc: F.desc * k, cap: F.cap * k };
};
/* one <path> per glyph, placed at (x0, baseline) */
const glyphPaths = (L, x0, y0, attrs = i => '') => L.glyphs.map((g, i) => g.d ? `<path d="${g.d}" transform="translate(${r1(x0 + g.x)} ${r1(y0)}) scale(${L.k})"${attrs(i, g)}/>` : '').join('');
/* the whole line as one group */
const textGroup = (L, x0, y0, attrs = '') => `<g${attrs}>${glyphPaths(L, x0, y0)}</g>`;
/* fit text to a width: shrink the size until it fits */
const fit = (font, text, size, maxW, track = 0) => { let L = layout(font, text, size, track); if (L.width > maxW) L = layout(font, text, size * maxW / L.width, track * maxW / L.width); return L; };

const svg = (w, h, css, body, title) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img"${title ? ` aria-label="${title.replace(/[<>&"]/g, '')}"` : ''}><style>${css}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>${body}</svg>`;

/* ---------- components ---------- */
const C = {};

/* signature: your name, traced in ink and filled, with a flourish underneath */
C.signature = q => {
  const name = str(q.name, 'Your Name', 32), ink = color(q.accent, null);
  const L = fit('script', name, num(q.size, 96, 30, 160), 860);
  const W = Math.round(Math.max(L.width + 80, num(q.width, 0, 0, 1200))), H = Math.round(L.asc + L.desc + 60);
  const x0 = (W - L.width) / 2, y0 = 30 + L.asc;
  const n = L.glyphs.filter(g => g.d).length, per = 2.2 / Math.max(n, 1), T = 2.2 + 1.4 + 3.4;
  let i = 0;
  const paths = glyphPaths(L, x0, y0, (_, g) => g.d ? ` class="s" pathLength="1" style="animation-delay:${r1(per * i++ * 100) / 100}s"` : '');
  const fy = y0 + L.desc * .45, fx1 = x0 - 10, fx2 = x0 + L.width + 16;
  const flourish = `<path class="f" pathLength="1" d="M${r1(fx1)} ${r1(fy)} C ${r1(fx1 + L.width * .3)} ${r1(fy + 18)}, ${r1(fx1 + L.width * .7)} ${r1(fy - 14)}, ${r1(fx2)} ${r1(fy - 4)}"/>`;
  const css = themeCSS(q, `--ink:${ink || 'var(--fg)'}`) + `
.s{fill:var(--ink);fill-opacity:0;stroke:var(--ink);stroke-width:${r1(1.1 / L.k)}px;stroke-dasharray:1;stroke-dashoffset:1;animation:draw ${T}s ease-in-out infinite}
.f{fill:none;stroke:var(--ink);stroke-width:2.2;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:flo ${T}s ease-in-out infinite}
@keyframes draw{0%{stroke-dashoffset:1;fill-opacity:0}${r1(2.2 / T * 100 * .55)}%{stroke-dashoffset:0;fill-opacity:0}${r1((2.2 + 1) / T * 100)}%{fill-opacity:1;stroke-dashoffset:0}88%{fill-opacity:1;opacity:1}97%,100%{fill-opacity:1;opacity:0}}
@keyframes flo{0%,${r1(2.2 / T * 100)}%{stroke-dashoffset:1}${r1(3.3 / T * 100)}%,88%{stroke-dashoffset:0;opacity:1}97%,100%{stroke-dashoffset:0;opacity:0}}`;
  return svg(W, H, css, paths + flourish, name);
};

/* aurora: a hero banner, your name in a serif over slow northern lights, with film grain */
C.aurora = q => {
  const W = num(q.width, 1000, 500, 1400), H = num(q.height, 300, 180, 500);
  const name = str(q.name, 'Your Name', 30), sub = str(q.sub, 'builder of things', 70), a = color(q.accent, '#7c5cff');
  const L = fit('serif', name, H * .42, W * .8), S = fit('grotesk', sub.toUpperCase(), H * .055, W * .7, H * .012);
  const cx = W / 2, by = H * .58;
  const blobs = [[a, .25, .35, 18], ['#22d3ee', .7, .3, 23], ['#f472b6', .5, .75, 27], [a, .85, .7, 21]].map(([c, x, y, d], i) =>
    `<ellipse class="b b${i}" cx="${W * x}" cy="${H * y}" rx="${W * .28}" ry="${H * .32}" fill="${c}"/>`).join('');
  const css = themeCSS(q) + `
.b{opacity:.55;transform-box:fill-box;transform-origin:center}
.b0{animation:m0 18s ease-in-out infinite alternate}.b1{animation:m1 23s ease-in-out infinite alternate}
.b2{animation:m2 27s ease-in-out infinite alternate}.b3{animation:m3 21s ease-in-out infinite alternate}
@keyframes m0{to{transform:translate(${W * .18}px,${H * .1}px) scale(1.3,.8)}}@keyframes m1{to{transform:translate(${-W * .2}px,${H * .18}px) scale(.8,1.25)}}
@keyframes m2{to{transform:translate(${W * .15}px,${-H * .25}px) scale(1.25)}}@keyframes m3{to{transform:translate(${-W * .22}px,${-H * .1}px) scale(.9,1.3)}}
.n{fill:#fff}.sh{animation:sh 6s ease-in-out infinite}@keyframes sh{0%,100%{transform:translateX(${-W}px)}55%,60%{transform:translateX(${W}px)}}
.sub{fill:#fff;opacity:.72}.in{animation:in 1.6s cubic-bezier(.2,.8,.2,1) both}@keyframes in{from{opacity:0;transform:translateY(14px)}}`;
  const body = `<defs><filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${H * .16}"/></filter>
<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .09 0"/></filter>
<clipPath id="r"><rect width="${W}" height="${H}" rx="18"/></clipPath>
<linearGradient id="g" x1="0" x2="1"><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="tm">${textGroup(L, cx - L.width / 2, by, ' fill="#fff"')}</mask></defs>
<g clip-path="url(#r)"><rect width="${W}" height="${H}" fill="#07070c"/><g filter="url(#bl)">${blobs}</g>
<rect width="${W}" height="${H}" filter="url(#gr)"/>
<g class="in">${textGroup(L, cx - L.width / 2, by, ' class="n"')}<g mask="url(#tm)"><rect class="sh" width="${W}" height="${H}" fill="url(#g)"/></g>
${textGroup(S, cx - S.width / 2, by + H * .16, ' class="sub"')}</g></g>`;
  return svg(W, H, css, body, name);
};

/* terminal: a window that types out commands and their answers, then starts over */
C.terminal = q => {
  const W = num(q.width, 760, 420, 1200), a = color(q.accent, '#3fb950');
  /* lines: "cmd>output|cmd>output" */
  const pairs = str(q.lines, 'whoami>a developer who ships|cat stack.txt>typescript  rust  postgres|echo $status>building something weird', 400)
    .split('|').slice(0, 6).map(p => { const [c, o = ''] = p.split('>'); return [c.trim(), o.trim()]; });
  const title = str(q.title, '~/' + (q.user ? str(q.user, '', 30) : 'about'), 40);
  const fs = 15, lh = 26, top = 54, pad = 22, H = top + pairs.length * lh * 2 + 18;
  const cps = 18;                                      /* characters typed per second */
  let t = .6, body = '';
  const total = pairs.reduce((s, [c]) => s + .35 + c.length / cps + .55, .6) + 3.5;
  pairs.forEach(([cmd, out], i) => {
    const y1 = top + i * lh * 2 + fs, y2 = y1 + lh;
    const P = layout('mono', '$', fs), Cm = layout('mono', cmd, fs), O = layout('mono', out, fs);
    const cx = pad + P.width + fs * .6;
    const tEnd = t + cmd.length / cps;
    const k = v => r1(v / total * 1000) / 1000;
    /* the typed command is revealed by a clip rect that grows a character at a time */
    const steps = Math.max(1, cmd.length), vals = [0], times = [0];
    for (let s = 0; s <= steps; s++) { vals.push(r1(Cm.width * s / steps + (s === steps ? 2 : 0))); times.push(k(t + s / cps)); }
    vals.push(vals[vals.length - 1], 0); times.push(.985, 1);
    body += `<clipPath id="c${i}"><rect x="${cx}" y="${y1 - fs}" height="${fs * 1.5}" width="0"><animate attributeName="width" dur="${r1(total)}s" repeatCount="indefinite" calcMode="discrete" values="${vals.join(';')}" keyTimes="${times.join(';')}"/></rect></clipPath>`;
    const show = (t0) => `<animate attributeName="opacity" dur="${r1(total)}s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;${k(t0)};.985"/>`;
    body += `<g opacity="0">${show(t - .3)}${textGroup(P, pad, y1, ` fill="${a}"`)}</g>`;
    body += textGroup(Cm, cx, y1, ` fill="var(--fg)" clip-path="url(#c${i})"`);
    body += `<g opacity="0">${show(tEnd + .3)}${textGroup(O, pad, y2, ' fill="var(--dim)"')}</g>`;
    t = tEnd + .9;
  });
  /* the caret rides along after the last line */
  const css = themeCSS(q) + `.cur{animation:bl 1s steps(1) infinite}@keyframes bl{50%{opacity:0}}`;
  const T = layout('grotesk', title, 12.5);
  const chrome = `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="var(--card)" stroke="var(--line)"/>
<path d="M1 38H${W - 1}" stroke="var(--line)"/>${['#ff5f57', '#febc2e', '#28c840'].map((c, i) => `<circle cx="${22 + i * 20}" cy="19.5" r="6" fill="${c}"/>`).join('')}
${textGroup(T, W / 2 - T.width / 2, 24, ' fill="var(--dim)"')}`;
  const cur = `<rect class="cur" x="${pad}" y="${H - 22}" width="9" height="15" fill="${a}"/>`;
  return svg(W, H, css, chrome + body + cur, 'terminal');
};

/* type: a sentence whose last words keep changing, typed and deleted */
C.type = q => {
  const pre = str(q.prefix, 'I build', 40), words = str(q.words, 'web apps|weird games|open source|tiny tools', 200).split('|').slice(0, 8).map(w => w.trim()).filter(Boolean);
  const font = ['serif', 'grotesk', 'mono', 'display', 'pixel'].includes(q.font) ? q.font : 'grotesk';
  const size = num(q.size, 46, 18, 90), a = color(q.accent, '#58a6ff');
  const P = layout(font, pre + ' ', size), Ws = words.map(w => layout(font, w, size));
  const maxW = Math.max(...Ws.map(w => w.width)), W = Math.round(num(q.width, P.width + maxW + 40, 200, 1400)), H = Math.round(P.asc + P.desc + 24);
  const y0 = 12 + P.asc, x0 = Math.max(10, (W - P.width - maxW) / 2), wx = x0 + P.width;
  const seg = 3.2, T = seg * words.length;
  let body = textGroup(P, x0, y0, ' fill="var(--fg)"');
  Ws.forEach((L, i) => {
    const n = Math.max(1, words[i].length), s0 = i * seg, typeT = Math.min(1.1, n * .07), holdEnd = s0 + seg - .7;
    const vals = [0], times = [0];
    for (let c = 0; c <= n; c++) { vals.push(r1(L.width * c / n)); times.push(r1((s0 + .1 + typeT * c / n) / T * 1000) / 1000); }
    for (let c = n - 1; c >= 0; c--) { vals.push(r1(L.width * c / n)); times.push(r1((holdEnd + .45 * (n - c) / n) / T * 1000) / 1000); }
    vals.push(0); times.push(1);
    body += `<clipPath id="w${i}"><rect x="${wx}" y="0" height="${H}" width="0"><animate attributeName="width" dur="${T}s" repeatCount="indefinite" calcMode="discrete" values="${vals.join(';')}" keyTimes="${times.join(';')}"/></rect></clipPath>`;
    body += textGroup(L, wx, y0, ` fill="${a}" clip-path="url(#w${i})"`);
  });
  body += `<rect class="cur" x="${wx}" y="${y0 - P.cap}" width="${Math.max(2, size * .06)}" height="${P.cap * 1.25}" fill="${a}"/>`;
  const css = themeCSS(q) + `.cur{animation:bl 1s steps(1) infinite}@keyframes bl{50%{opacity:0}}`;
  return svg(W, H, css, body, pre + ' ' + words.join(', '));
};

/* orbit: your stack, circling a glowing core in a tilted ring */
C.orbit = q => {
  const items = str(q.items, 'TypeScript|Rust|React|Go|Postgres|Docker|Figma|Python', 300).split('|').map(s => s.trim()).filter(Boolean).slice(0, 12);
  const W = num(q.width, 820, 400, 1200), H = num(q.height, 340, 220, 600), a = color(q.accent, '#a371f7');
  const cx = W / 2, cy = H / 2, rx = W * .4, ry = H * .3, dur = num(q.speed, 24, 6, 120);
  const center = str(q.name, '', 20), N = layout('display', center || '{ }', H * .09);
  const ring = (k, o) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx * k}" ry="${ry * k}" fill="none" stroke="var(--line)" stroke-opacity="${o}" stroke-dasharray="2 6"/>`;
  /* the path starts at the front (bottom) of the ellipse */
  const path = `M${cx} ${cy + ry} A${rx} ${ry} 0 1 1 ${cx} ${cy - ry} A${rx} ${ry} 0 1 1 ${cx} ${cy + ry}`;
  const pills = items.map((it, i) => {
    const L = layout('grotesk', it, 14), pw = L.width + 26, off = r1(-dur * i / items.length);
    const anim = `<animateMotion dur="${dur}s" repeatCount="indefinite" begin="${off}s" path="${path}"/>`;
    const depth = (attr, v) => `<animate attributeName="${attr}" dur="${dur}s" repeatCount="indefinite" begin="${off}s" values="${v}" keyTimes="0;.5;1" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1"/>`;
    return `<g>${anim}<g>${`<animateTransform attributeName="transform" type="scale" dur="${dur}s" repeatCount="indefinite" begin="${off}s" values="1;.62;1" keyTimes="0;.5;1" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1"/>`}${depth('opacity', '1;.35;1')}
<rect x="${-pw / 2}" y="-15" width="${pw}" height="30" rx="15" fill="var(--card)" stroke="${a}" stroke-opacity=".55"/>${textGroup(L, -L.width / 2, 5, ' fill="var(--fg)"')}</g></g>`;
  }).join('');
  const css = themeCSS(q) + `.core{animation:pu 3s ease-in-out infinite;transform-origin:${cx}px ${cy}px}@keyframes pu{50%{transform:scale(1.08);opacity:.75}}`;
  const body = `<defs><radialGradient id="cg"><stop offset="0" stop-color="${a}" stop-opacity=".9"/><stop offset=".35" stop-color="${a}" stop-opacity=".35"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient></defs>
${ring(1, .9)}${ring(.6, .5)}<circle class="core" cx="${cx}" cy="${cy}" r="${H * .3}" fill="url(#cg)"/>
${textGroup(N, cx - N.width / 2, cy + N.cap / 2, ' fill="var(--fg)"')}${pills}`;
  return svg(W, H, css, body, 'stack: ' + items.join(', '));
};

/* constellation: your real GitHub year as a night sky. Every day you contributed is a star,
   brighter for busier days; streaks join up into constellations; a shooting star now and then */
const contributions = async user => {
  const r = await fetch(`https://github.com/users/${encodeURIComponent(user)}/contributions`, { headers: { 'user-agent': 'piixpal-gitpal' } });
  if (!r.ok) throw new Error('github ' + r.status);
  const html = await r.text();
  const days = [];
  for (const m of html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"[^>]*?data-level="(\d)"|data-level="(\d)"[^>]*?data-date="(\d{4}-\d{2}-\d{2})"/g)) days.push([m[1] || m[4], +(m[2] || m[3])]);
  days.sort((x, y) => x[0] < y[0] ? -1 : 1);
  const tm = html.match(/([\d,]+)\s+contributions?\s+in the last year/);
  return { days, total: tm ? tm[1] : null };
};
C.constellation = async q => {
  const user = /^[a-zA-Z0-9-]{1,39}$/.test(q.user || '') ? q.user : null;
  const W = num(q.width, 900, 500, 1400), H = num(q.height, 260, 160, 500), a = color(q.accent, '#ffd479');
  let data = { days: [], total: null };
  if (user) { try { data = await contributions(user); } catch (e) { /* show an empty sky */ } }
  const R = rng(hashStr(user || 'sky')), weeks = Math.ceil(data.days.length / 7) || 53;
  const px = (W - 60) / weeks, py = (H - 70) / 7;
  const stars = data.days.map(([d, lv], i) => {
    const w = Math.floor(i / 7), dw = i % 7;
    return { x: 30 + w * px + (R() - .5) * px * .8, y: 34 + dw * py + (R() - .5) * py * .7, lv, i };
  });
  /* constellations: link each active day to the next active day nearby, while a streak lasts */
  const act = stars.filter(s => s.lv > 0);
  let lines = '';
  for (let i = 1; i < act.length; i++) {
    const p = act[i - 1], c = act[i];
    if (c.i - p.i <= 2 && Math.hypot(c.x - p.x, c.y - p.y) < px * 3.2 && (p.lv + c.lv) >= 4)
      lines += `<line x1="${r1(p.x)}" y1="${r1(p.y)}" x2="${r1(c.x)}" y2="${r1(c.y)}"/>`;
  }
  const dots = stars.map(s => {
    if (!s.lv) return R() < .35 ? `<circle cx="${r1(s.x)}" cy="${r1(s.y)}" r=".7" fill="var(--dim)" opacity=".35"/>` : '';
    const rr = .9 + s.lv * .85, d = r1(2 + R() * 4), dl = r1(-R() * 6);
    return `<circle class="t" cx="${r1(s.x)}" cy="${r1(s.y)}" r="${r1(rr)}" style="animation-duration:${d}s;animation-delay:${dl}s"/>` +
      (s.lv >= 3 ? `<circle cx="${r1(s.x)}" cy="${r1(s.y)}" r="${r1(rr * 3.2)}" fill="url(#halo)"/>` : '');
  }).join('');
  const label = data.total ? `${data.total} contributions in the last year` : user ? `@${user}` : 'add ?user=yourname';
  const Lb = layout('grotesk', label, 13), U = layout('serifi', user ? '@' + user : 'constellation', 20);
  const css = themeCSS(q) + `
.t{fill:${a};animation:tw 4s ease-in-out infinite}@keyframes tw{0%,100%{opacity:1}50%{opacity:.35}}
.ln{stroke:${a};stroke-opacity:.28;stroke-width:.8;stroke-dasharray:3 3;animation:fl 30s linear infinite}@keyframes fl{to{stroke-dashoffset:-120}}
.ss{animation:ss 9s ease-in infinite}@keyframes ss{0%,78%{transform:translate(0,0);opacity:0}80%{opacity:1}90%,100%{transform:translate(${-W * .35}px,${H * .45}px);opacity:0}}`;
  const body = `<defs><radialGradient id="halo"><stop offset="0" stop-color="${a}" stop-opacity=".35"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
<linearGradient id="st" x1="1" x2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="14" fill="var(--bg)" stroke="var(--line)"/>
<g class="ln">${lines}</g>${dots}
<g class="ss"><line x1="${W * .82}" y1="${H * .12}" x2="${W * .82 + 70}" y2="${H * .12 - 46}" stroke="url(#st)" stroke-width="1.6" transform="rotate(0)"/></g>
${textGroup(U, 30, H - 20, ' fill="var(--fg)"')}${textGroup(Lb, W - 30 - Lb.width, H - 22, ' fill="var(--dim)"')}`;
  return svg(W, H, css, body, label);
};

/* clock: what time it is where you are, right now: the sky, the sun or moon, and a guess
   at what you're doing. Drawn fresh for every visitor */
const SKY = [[0, '#05060f', '#0b1030'], [5, '#0b1030', '#2a2350'], [6.5, '#ff9a76', '#3b4a8c'], [8, '#8ec5ff', '#d9f0ff'], [16.5, '#7db7ff', '#ffe2b8'], [18.5, '#ff7a59', '#4b2b6b'], [20, '#1a1440', '#0b0f2a'], [24, '#05060f', '#0b1030']];
const lerpC = (x, y, k) => { const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const A = p(x), B = p(y); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const STATUS = [[0, 'probably asleep'], [2, 'up way too late'], [5, 'asleep, hopefully'], [7, 'making coffee'], [9, 'deep in code'], [12, 'out for lunch'], [13, 'shipping things'], [17, 'reviewing PRs'], [19, 'side-project hours'], [22, 'one more commit']];
C.clock = q => {
  const W = num(q.width, 520, 360, 900), H = 170;
  let tz = String(q.tz || 'UTC');
  let parts;
  try { parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'long' }).formatToParts(new Date()); }
  catch (e) { tz = 'UTC'; parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'long' }).formatToParts(new Date()); }
  const get = t => (parts.find(p => p.type === t) || {}).value;
  const hh = +get('hour') % 24, mm = +get('minute'), h = hh + mm / 60;
  let s = 0; while (s < SKY.length - 2 && SKY[s + 1][0] <= h) s++;
  const k = (h - SKY[s][0]) / (SKY[s + 1][0] - SKY[s][0]), top = lerpC(SKY[s][1], SKY[s + 1][1], k), bot = lerpC(SKY[s][2], SKY[s + 1][2], k);
  const day = h >= 6 && h < 18.5, night = !day;
  const u = day ? (h - 6) / 12.5 : ((h >= 18.5 ? h - 18.5 : h + 5.5) / 11.5);
  const ax = W * .62 + (W * .32) * u, ay = H * .78 - Math.sin(u * Math.PI) * H * .55;
  const name = str(q.name, '', 24);
  const status = (STATUS.filter(x => x[0] <= hh).pop() || STATUS[0])[1];
  const tl = layout('display', `${get('hour')}:${get('minute')}`, 46), nl = layout('serifi', (name ? name + ', ' : '') + get('weekday'), 19), sl = layout('grotesk', status, 13.5);
  const light = !night && h > 7.5 && h < 17;
  const ink = light ? '#0d1117' : '#ffffff';
  const R = rng(7);
  const stars = night ? Array.from({ length: 40 }, () => `<circle class="tw" cx="${r1(R() * W)}" cy="${r1(R() * H * .7)}" r="${r1(.5 + R())}" style="animation-delay:${r1(-R() * 4)}s"/>`).join('') : '';
  const css = `.tw{fill:#fff;animation:tw 3s ease-in-out infinite}@keyframes tw{50%{opacity:.25}}.cl{animation:dr 40s linear infinite}@keyframes dr{to{transform:translateX(${W + 200}px)}}
.orb{animation:gl 4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes gl{50%{transform:scale(1.15);opacity:.8}}`;
  const body = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="${day ? '#fff3c4' : '#dfe7ff'}" stop-opacity=".9"/><stop offset="1" stop-color="${day ? '#ffd166' : '#9fb3ff'}" stop-opacity="0"/></radialGradient>
<clipPath id="cp"><rect width="${W}" height="${H}" rx="16"/></clipPath></defs>
<g clip-path="url(#cp)"><rect width="${W}" height="${H}" fill="url(#sky)"/>${stars}
<circle class="orb" cx="${r1(ax)}" cy="${r1(ay)}" r="34" fill="url(#glow)"/>
<circle cx="${r1(ax)}" cy="${r1(ay)}" r="13" fill="${day ? '#fff6d6' : '#eef2ff'}"/>${night ? `<circle cx="${r1(ax + 6)}" cy="${r1(ay - 4)}" r="11" fill="${bot}" opacity=".85"/>` : ''}
${day ? `<g class="cl" opacity=".75"><g transform="translate(-160 ${H * .3})"><ellipse rx="34" ry="11" fill="#fff"/><ellipse cx="18" cy="-6" rx="20" ry="11" fill="#fff"/></g></g>` : ''}
${textGroup(tl, 26, 74, ` fill="${ink}"`)}${textGroup(nl, 28, 106, ` fill="${ink}" opacity=".85"`)}
<rect x="26" y="122" width="${sl.width + 22}" height="26" rx="13" fill="${ink}" opacity=".12"/>${textGroup(sl, 37, 140, ` fill="${ink}" opacity=".9"`)}</g>`;
  return svg(W, H, css, body, `${get('hour')}:${get('minute')} ${status}`);
};

/* glitch: your name in heavy type, slipping out of register in bursts */
C.glitch = q => {
  const name = str(q.name, 'YOUR NAME', 24).toUpperCase(), a = color(q.accent, '#00f0ff'), b = color(q.accent2, '#ff2a6d');
  const L = fit('display', name, num(q.size, 84, 30, 140), 900);
  const W = Math.round(num(q.width, L.width + 60, 200, 1400)), H = Math.round(L.cap + 60), x0 = (W - L.width) / 2, y0 = 30 + L.cap;
  const slices = [[10, 30], [45, 15], [70, 22], [20, 50]];
  const css = themeCSS(q) + `
.r{fill:${b};mix-blend-mode:screen;animation:g1 3.2s steps(1) infinite}.c{fill:${a};mix-blend-mode:screen;animation:g2 3.2s steps(1) infinite}.m{fill:var(--fg)}
.cut{animation:g3 3.2s steps(1) infinite}
@keyframes g1{0%,86%,100%{transform:none;clip-path:inset(0)}88%{transform:translate(-6px,2px);clip-path:inset(${slices[0][0]}% 0 ${slices[0][1]}% 0)}91%{transform:translate(5px,-1px);clip-path:inset(${slices[1][0]}% 0 ${slices[1][1]}% 0)}94%{transform:translate(-3px,0);clip-path:inset(0)}}
@keyframes g2{0%,86%,100%{transform:none;clip-path:inset(0)}88%{transform:translate(6px,-2px);clip-path:inset(${slices[2][0]}% 0 ${slices[2][1]}% 0)}91%{transform:translate(-5px,1px);clip-path:inset(${slices[3][0]}% 0 ${slices[3][1]}% 0)}94%{transform:translate(3px,0);clip-path:inset(0)}}
@keyframes g3{0%,87%,100%{transform:none}89%{transform:translateX(12px)}92%{transform:translateX(-8px)}}`;
  const body = `<g class="cut">${textGroup(L, x0, y0, ' class="r"')}${textGroup(L, x0, y0, ' class="c"')}${textGroup(L, x0, y0, ' class="m"')}</g>`;
  return svg(W, H, css, body, name);
};

/* divider: a line between sections, but alive */
C.divider = q => {
  const W = num(q.width, 900, 200, 1400), H = 40, a = color(q.accent, '#58a6ff'), style = q.style || 'wave', m = H / 2;
  let body = '', css = themeCSS(q);
  if (style === 'pulse') {
    const beat = x => `L${x} ${m} L${x + 10} ${m - 3} L${x + 16} ${m} L${x + 22} ${m + 14} L${x + 30} ${m - 17} L${x + 38} ${m + 6} L${x + 44} ${m}`;
    let d = `M0 ${m}`; for (let x = 60; x < W - 60; x += 220) d += beat(x); d += ` L${W} ${m}`;
    body = `<path d="${d}" fill="none" stroke="var(--line)" stroke-width="1.5"/><path class="p" d="${d}" pathLength="1" fill="none" stroke="${a}" stroke-width="2.2" stroke-linecap="round"/>`;
    css += `.p{stroke-dasharray:.07 .93;animation:run 3s linear infinite;filter:drop-shadow(0 0 4px ${a})}@keyframes run{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}`;
  } else if (style === 'dots') {
    const n = Math.floor(W / 22);
    body = Array.from({ length: n }, (_, i) => `<circle cx="${11 + i * 22}" cy="${m}" r="3" fill="${a}" style="animation-delay:${r1(i * .06)}s"/>`).join('');
    css += `circle{opacity:.2;animation:dt 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes dt{20%{opacity:1;transform:scale(1.6)}40%{opacity:.2;transform:none}}`;
  } else {
    const wv = (amp, ph) => { let d = ''; for (let x = 0; x <= W + 120; x += 10) d += (x ? 'L' : 'M') + x + ' ' + r1(m + Math.sin(x / 60 + ph) * amp); return d; };
    body = `<g class="w1"><path d="${wv(7, 0)}" fill="none" stroke="${a}" stroke-width="2"/></g><g class="w2"><path d="${wv(5, 2)}" fill="none" stroke="${a}" stroke-opacity=".4" stroke-width="1.5"/></g>`;
    css += `.w1{animation:mv 4s linear infinite}.w2{animation:mv 7s linear infinite reverse}@keyframes mv{to{transform:translateX(${r1(-Math.PI * 2 * 60)}px)}}`;
  }
  return svg(W, H, css, `<defs><linearGradient id="fd"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".15" stop-color="#fff"/><stop offset=".85" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="fm"><rect width="${W}" height="${H}" fill="url(#fd)"/></mask></defs><g mask="url(#fm)">${body}</g>`, 'divider');
};

/* wave: a counter of everyone who waved at you. The image links to /gp/wave?user=you&hit=1,
   which counts the wave and sends the visitor straight back to your profile */
C.wave = async q => {
  const user = /^[a-zA-Z0-9-]{1,39}$/.test(q.user || '') ? q.user : 'octocat';
  let n = null;
  if (store.enabled()) { try { n = +(await store.cmd(['GET', 'wave:' + user.toLowerCase()])) || 0; } catch (e) { n = null; } }
  const a = color(q.accent, '#ffb000');
  const msg = n == null ? 'wave at me' : `${n.toLocaleString('en-US')} ${n === 1 ? 'person' : 'people'} waved`;
  const L = layout('grotesk', msg, 16), S = layout('grotesk', 'click to wave back', 11.5);
  const W = Math.round(L.width + 96), H = 54;
  const css = themeCSS(q) + `.h{transform-origin:24px 34px;animation:wv 2.4s ease-in-out infinite}@keyframes wv{0%,60%,100%{transform:rotate(0)}10%,30%{transform:rotate(16deg)}20%,40%{transform:rotate(-8deg)}}`;
  /* a little drawn hand, so it doesn't depend on emoji fonts */
  const hand = `<g class="h"><path d="M17 37c-3-4-6-9-4-11 2-1 4 1 6 4l-4-12c-1-3 3-4 4-1l3 9-3-12c-1-3 3-4 4-1l3 12-1-10c0-3 4-3 4 0l2 12 1-7c1-3 4-2 4 1l-1 11c-1 6-6 10-11 9-3 0-5-2-7-4z" fill="${a}"/></g>`;
  const body = `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="27" fill="var(--card)" stroke="var(--line)"/>${hand}
${textGroup(L, 52, 27, ' fill="var(--fg)"')}${textGroup(S, 52, 42, ' fill="var(--dim)"')}`;
  return svg(W, H, css, body, msg);
};

/* ---------- the handler ---------- */
const CACHE = { clock: 'public, max-age=0, s-maxage=60', constellation: 'public, max-age=0, s-maxage=3600', wave: 'no-cache, max-age=0, s-maxage=5' };
module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://x'), q = Object.fromEntries(url.searchParams);
  const name = String(q.c || '').toLowerCase();
  /* a wave: count it, then straight back to the profile it came from */
  if (name === 'wave' && q.hit) {
    const user = /^[a-zA-Z0-9-]{1,39}$/.test(q.user || '') ? q.user : null;
    if (user && store.enabled()) { try { await store.cmd(['INCR', 'wave:' + user.toLowerCase()]); } catch (e) { /* still go back */ } }
    res.statusCode = 302;
    res.setHeader('location', user ? `https://github.com/${user}` : 'https://piixpal.dvkk.dev/gitpal/');
    res.setHeader('cache-control', 'no-store');
    return res.end();
  }
  const make = C[name];
  if (!make) { res.statusCode = 404; res.setHeader('content-type', 'text/plain'); return res.end('Unknown Gitpal component. See https://piixpal.dvkk.dev/gitpal/'); }
  try {
    const out = await make(q);
    res.setHeader('content-type', 'image/svg+xml; charset=utf-8');
    res.setHeader('cache-control', CACHE[name] || 'public, max-age=3600, s-maxage=86400');
    res.setHeader('access-control-allow-origin', '*');
    res.end(out);
  } catch (e) {
    res.statusCode = 500; res.setHeader('content-type', 'text/plain'); res.end('Gitpal could not draw that: ' + e.message);
  }
};
module.exports.C = C;
