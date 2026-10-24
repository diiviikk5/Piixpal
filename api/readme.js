/* README pals: an animated SVG for GitHub profiles and READMEs.
 *
 *   https://piixpal.dvkk.dev/readme?text=Hi, I'm Divik&pals=bitbug,bumble
 *
 * Your words in a pixel font, with pals living on them: walkers patrol back and forth along the
 * tops of the letters, fliers bob above, the rest sit and do their thing. Pure SVG with CSS
 * animation, so it plays anywhere an image does, GitHub included (no scripts needed).
 *
 *   text     what it says (up to 40 characters)                   default: none
 *   pals     up to 4 pal names, comma separated                    default: bitbug
 *            (or Pal Maker codes: a pal someone made at piixpal.dvkk.dev/make)
 *   repo     owner/name: adds the repo's live star count
 *   theme    auto | light | dark | lime | paper                    default: auto (works on light and dark)
 *   color    the letters' colour, hex without #
 *   size     size of one letter pixel, 2 to 12                     default: 6
 *   scale    size of one pal pixel, 2 to 6                         default: 3
 *   speed    walking speed, 0.25 to 3                              default: 1
 *   width    the image width, px                                   default: fits the text
 *   credit   0 hides the little "piixpal" in the corner
 *
 * Pal pixels come from api/_pals.json, exported from the library by scripts/readme-data.mjs. */
const PALS = require('./_pals.json');
const MAKER = require('./_maker.js');
/* a made pal, from its code: it walks, or flies if it has wings */
const made = code => {
  try {
    const m = MAKER.decode(code), sp = MAKER.sprite(m), fly = m.wings > 0, clip = fly ? 'fly' : 'walk';
    return { name: m.name, w: sp.w, h: sp.h, palette: sp.palette, frames: sp.frames[clip], fps: sp.fps[clip] || 8, fly, moves: true };
  } catch (_) { return null; }
};

/* ---------- a 5 x 7 pixel font: capitals, digits and the punctuation people use ---------- */
const G = s => s.split(' ');
const FONT = {
  A: G('.###. #...# #...# ##### #...# #...# #...#'), B: G('####. #...# #...# ####. #...# #...# ####.'),
  C: G('.###. #...# #.... #.... #.... #...# .###.'), D: G('####. #...# #...# #...# #...# #...# ####.'),
  E: G('##### #.... #.... ####. #.... #.... #####'), F: G('##### #.... #.... ####. #.... #.... #....'),
  G: G('.###. #...# #.... #.### #...# #...# .####'), H: G('#...# #...# #...# ##### #...# #...# #...#'),
  I: G('### .#. .#. .#. .#. .#. ###'), J: G('..### ...#. ...#. ...#. #..#. #..#. .##..'),
  K: G('#...# #..#. #.#.. ##... #.#.. #..#. #...#'), L: G('#.... #.... #.... #.... #.... #.... #####'),
  M: G('#...# ##.## #.#.# #.#.# #...# #...# #...#'), N: G('#...# ##..# #.#.# #..## #...# #...# #...#'),
  O: G('.###. #...# #...# #...# #...# #...# .###.'), P: G('####. #...# #...# ####. #.... #.... #....'),
  Q: G('.###. #...# #...# #...# #.#.# #..#. .##.#'), R: G('####. #...# #...# ####. #.#.. #..#. #...#'),
  S: G('.#### #.... #.... .###. ....# ....# ####.'), T: G('##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..'),
  U: G('#...# #...# #...# #...# #...# #...# .###.'), V: G('#...# #...# #...# #...# #...# .#.#. ..#..'),
  W: G('#...# #...# #...# #.#.# #.#.# #.#.# .#.#.'), X: G('#...# #...# .#.#. ..#.. .#.#. #...# #...#'),
  Y: G('#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..'), Z: G('##### ....# ...#. ..#.. .#... #.... #####'),
  0: G('.###. #...# #..## #.#.# ##..# #...# .###.'), 1: G('.#. ##. .#. .#. .#. .#. ###'),
  2: G('.###. #...# ....# ...#. ..#.. .#... #####'), 3: G('####. ....# ....# .###. ....# ....# ####.'),
  4: G('...#. ..##. .#.#. #..#. ##### ...#. ...#.'), 5: G('##### #.... ####. ....# ....# #...# .###.'),
  6: G('.###. #.... #.... ####. #...# #...# .###.'), 7: G('##### ....# ...#. ..#.. .#... .#... .#...'),
  8: G('.###. #...# #...# .###. #...# #...# .###.'), 9: G('.###. #...# #...# .#### ....# ....# .###.'),
  ' ': G('... ... ... ... ... ... ...'), '.': G('. . . . . . #'), ',': G('.. .. .. .. .. .# #.'),
  '!': G('# # # # # . #'), '?': G('.###. #...# ....# ...#. ..#.. ..... ..#..'), "'": G('# # . . . . .'),
  '"': G('#.# #.# ... ... ... ... ...'), ':': G('. # . . . # .'), ';': G('.. .# .. .. .. .# #.'),
  '-': G('.... .... .... #### .... .... ....'), '+': G('..... ..#.. ..#.. ##### ..#.. ..#.. .....'),
  '/': G('....# ...#. ...#. ..#.. .#... .#... #....'), '(': G('.# #. #. #. #. #. .#'), ')': G('#. .# .# .# .# .# #.'),
  '@': G('.###. #...# #.### #.#.# #.### #.... .####'), '#': G('.#.#. ##### .#.#. .#.#. .#.#. ##### .#.#.'),
  '&': G('.##.. #..#. .##.. .#..# #.##. #..#. .##.#'), '_': G('..... ..... ..... ..... ..... ..... #####'),
  '=': G('.... .... #### .... #### .... ....'), '<': G('...# ..#. .#.. #... .#.. ..#. ...#'), '>': G('#... .#.. ..#. ...# ..#. .#.. #...'),
  '*': G('..... #.#.# .###. ##### .###. #.#.# .....'), '★': G('..#.. ..#.. ##### .###. .#.#. #...# .....'),
  '♥': G('..... .#.#. ##### ##### .###. ..#.. .....'), '~': G('..... ..... .#..# #.##. ..... ..... .....')
};
const glyph = ch => FONT[ch] || FONT[ch.toUpperCase()] || FONT['?'];
/* lay out a line of text as runs of pixels: [{x, y, w, c}] in font pixels */
const typeset = (parts) => {
  const runs = [], chars = []; let x = 0;
  for (const { text, color } of parts) for (const ch of [...text]) {
    const g = glyph(ch);
    g.forEach((row, y) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] !== '#') continue;
        let j = i; while (j + 1 < row.length && row[j + 1] === '#') j++;
        runs.push({ x: x + i, y, w: j - i + 1, c: color }); i = j;
      }
    });
    if (/[p{L}p{N}★♥#@&]/u.test(ch)) chars.push({ x, w: g[0].length });
    x += g[0].length + 1;
  }
  return { runs, chars, w: Math.max(0, x - 1) };
};

/* ---------- a pal frame as runs of same-coloured pixels ---------- */
const palRuns = (pal, rows) => {
  const out = [], pad = pal.h - rows.length;
  rows.forEach((row, y) => {
    for (let i = 0; i < row.length; i++) {
      const c = pal.palette[row[i]];
      if (!c) continue;
      let j = i; while (j + 1 < row.length && pal.palette[row[j + 1]] === c) j++;
      out.push({ x: i, y: y + pad, w: j - i + 1, c }); i = j;
    }
  });
  return out;
};
const rects = (runs, s, ox = 0, oy = 0) => runs.map(r => `<rect x="${ox + r.x * s}" y="${oy + r.y * s}" width="${r.w * s}" height="${s}" fill="${r.c}"/>`).join('');

const THEMES = {
  auto: { bg: null, ink: '#c6f432', shadow: '#17121f' },
  light: { bg: '#f3eee3', ink: '#17121f', shadow: null },
  dark: { bg: '#0b0a10', ink: '#f2eef8', shadow: null },
  lime: { bg: '#c6f432', ink: '#17121f', shadow: null },
  paper: { bg: '#fbf8f1', ink: '#6b4cff', shadow: '#17121f' }
};
const num = (v, d, a, b) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
const hex = v => (v && /^[0-9a-f]{3,8}$/i.test(v) ? '#' + v : null);

async function stars(repo) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '')) return null;
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}`, { headers: { 'User-Agent': 'piixpal-readme', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) } });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j.stargazers_count === 'number' ? j.stargazers_count : null;
  } catch (_) { return null; }
}

async function render(q) {
  const T = THEMES[q.theme] || THEMES.auto;
  const ink = hex(q.color) || T.ink, gold = '#ffd23f';
  const fs = Math.round(num(q.size, 6, 2, 12)), ps = Math.round(num(q.scale, 3, 2, 6)), speed = num(q.speed, 1, .25, 3);
  /* the words, and the star count after them */
  const text = String(q.text || '').slice(0, 40);
  const parts = text ? [{ text, color: ink }] : [];
  if (q.repo) {
    const n = await stars(q.repo);
    if (n !== null) parts.push({ text: (text ? '  ' : '') + '★ ' + n.toLocaleString('en-US'), color: gold });
  }
  const type = typeset(parts);
  /* the pals: up to four, known ones only */
  const pals = [], names = [];
  for (const raw of String(q.pals || q.pal || 'bitbug').split(',').map(s => s.trim()).filter(Boolean)) {
    if (pals.length >= 4) break;
    const p = PALS[raw.toLowerCase()] || (raw.length > 20 ? made(raw) : null);
    if (p) { pals.push(p); names.push(p.name || raw.toLowerCase()); }
  }
  if (!pals.length) { pals.push(PALS.bitbug); names.push('bitbug'); }
  const tallest = Math.max(...pals.map(p => p.h * ps + (p.fly ? 26 : 0)));
  /* layout: pals stand on the top edge of the letters */
  const textW = type.w * fs, textH = 7 * fs;
  const W = Math.round(num(q.width, Math.max(textW + 80, 420), 200, 1400));
  const pad = 20, top = pad + tallest + 6, H = top + (type.runs.length ? textH : 0) + pad + (q.credit === '0' ? 6 : 16);
  const tx = Math.round((W - textW) / 2), ty = top;
  /* where they live: along the letters, or along a line where the letters would be */
  const L = type.runs.length ? tx : pad, R = type.runs.length ? tx + textW : W - pad;
  let css = '', body = '';
  pals.forEach((p, i) => {
    const pw = p.w * ps, ph = p.h * ps, n = p.frames.length, T = (n / p.fps).toFixed(3);
    const groundY = ty - ph, flyY = groundY - 22;
    /* the frames take turns being visible: frame k shows for its slice of every cycle */
    css += `@keyframes f${i}{0%{visibility:visible}${(100 / n).toFixed(3)}%,100%{visibility:hidden}}.f${i}{visibility:hidden;animation:f${i} ${T}s step-end infinite}`;
    const frames = p.frames.map((rows, k) => `<g class="f${i}" style="animation-delay:-${((n - k) * T / n).toFixed(3)}s">${rects(palRuns(p, rows), ps)}</g>`).join('');
    if (p.moves) {
      /* patrol: walk to one end, turn round, walk back; each pal at its own pace and place */
      const x0 = L, x1 = Math.max(L, R - pw), dist = Math.max(1, x1 - x0);
      const dur = (dist / ((p.fly ? 70 : 42) * speed * ps / 3) * 2).toFixed(2), phase = -(dur * (i * .37 % 1)).toFixed(2), y = p.fly ? flyY : groundY;
      css += `@keyframes w${i}{0%{transform:translate(${x0}px,${y}px)}50%{transform:translate(${x1}px,${y}px)}100%{transform:translate(${x0}px,${y}px)}}`
        + `@keyframes s${i}{0%{transform:scale(1,1)}50%{transform:scale(-1,1)}}`
        + `.w${i}{animation:w${i} ${dur}s linear ${phase}s infinite}.s${i}{transform-box:fill-box;transform-origin:center;animation:s${i} ${dur}s step-end ${phase}s infinite}`;
      if (p.fly) css += `@keyframes b${i}{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}.b${i}{animation:b${i} 1.6s ease-in-out infinite}`;
      body += `<g class="w${i}"><g class="${p.fly ? 'b' + i : ''}"><g class="s${i}">${frames}</g></g></g>`;
    } else {
      /* sitters: settled along the letters, each in its own spot */
      const spot = pals.length === 1 ? .78 : (i + .5) / pals.length;
      /* on a letter, never over a gap */
      let x = Math.round(L + (R - L - pw) * spot);
      if (type.chars.length) {
        const c = type.chars.reduce((b, c) => Math.abs(tx + (c.x + c.w / 2) * fs - x - pw / 2) < Math.abs(tx + (b.x + b.w / 2) * fs - x - pw / 2) ? c : b);
        x = Math.round(tx + (c.x + c.w / 2) * fs - pw / 2);
      }
      body += `<g transform="translate(${x},${groundY})">${frames}</g>`;
    }
  });
  const shadow = T.shadow ? `<g transform="translate(${tx + Math.max(1, fs / 3)},${ty + Math.max(1, fs / 3)})">${rects(type.runs.map(r => ({ ...r, c: T.shadow })), fs)}</g>` : '';
  const words = `<g transform="translate(${tx},${ty})">${rects(type.runs, fs)}</g>`;
  /* the little credit in the corner, in the same pixel font */
  const credit = q.credit === '0' ? '' : (() => { const c = typeset([{ text: 'PIIXPAL', color: T.bg ? (T.ink + '88') : '#8a8a96' }]); return `<g transform="translate(${W - c.w * 2 - 10},${H - 7 * 2 - 8})">${rects(c.runs, 2)}</g>`; })();
  const label = (text || 'Piixpal pals') + (names.length ? ` with ${names.join(', ')}` : '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" role="img" aria-label="${label.replace(/[<&"]/g, '')}"><title>${label.replace(/[<&]/g, '')}</title>`
    + `<style>${css}@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}</style>`
    + (T.bg ? `<rect width="${W}" height="${H}" rx="12" fill="${T.bg}"/>` : '')
    + shadow + words + body + credit + `</svg>`;
}

module.exports = async (req, res) => {
  const q = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  let svg;
  try { svg = await render(q); } catch (e) { svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="40"><text x="10" y="25" font-family="monospace" font-size="12">piixpal: ${String(e.message).replace(/[<&]/g, '')}</text></svg>`; }
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  /* cached hard at the edge, so a viral README doesn't mean a request per view */
  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(svg);
};
module.exports.render = render;
