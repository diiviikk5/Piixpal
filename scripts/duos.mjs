// node scripts/duos.mjs: the duo pals' art -> src/pals/duos.js
// Drawings live in scripts/duos-cast.mjs. Each character is animated by the piixpal-pal tool (blink, walk, hop…);
// the poses that need a hand (a dimmed flame, wings up, an empty cup, a sneeze…) are variants of the drawing, animated the same way.
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAST } from './duos-cast.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAL = join(root, 'skills', 'piixpal-pal', 'scripts', 'pal.mjs');
const tmp = join(root, '.git', 'tmp', 'duos'); mkdirSync(tmp, { recursive: true });

/* write over a drawing: '.' clears a pixel, ' ' leaves it */
const put = (rows, x, y, str) => { const r = rows[y].split(''); [...str].forEach((c, i) => { if (c !== ' ') r[x + i] = c; }); rows[y] = r.join(''); return rows; };
const shiftRegion = (rows, x0, x1, y0, y1, dy) => {
  const out = rows.slice(), W = rows[0].length;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const r = out[y].split(''); r[x] = '.'; out[y] = r.join(''); }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const ny = y + dy; if (ny < 0 || ny >= rows.length || x >= W) continue; const c = rows[y][x]; if (c === '.') continue; const r = out[ny].split(''); r[x] = c; out[ny] = r.join(''); }
  return out;
};

/* who is who: name in the library, gait, eye keys, the clips to keep, and variants of the drawing */
const KEEP = ['idle', 'walk', 'hop', 'happy', 'sleep', 'look', 'scared', 'squash'];
const SPEC = {
  popper: { name: 'popper', does: 'popper', gait: 'blob' },
  butter: { name: '_butter', gait: 'legs' },
  wick: { name: 'wick', does: 'wick', gait: 'blob', extra: { s: '#8b8396', p: '#ff5d8f' },
    variants: {
      dim: r => put(put(put(put(r, 0, 0, '.........'), 0, 1, '.........'), 0, 2, '....o....'), 0, 3, '...oyo...'),
      out: r => put(put(put(put(r, 0, 0, '......s..'), 0, 1, '.....s...'), 0, 2, '......s..'), 0, 3, '.........'),
      blush: r => put(r, 0, 10, '.kpwkwpk.'),
      flick: r => put(put(r, 0, 0, '...o.....'), 0, 1, '..oyo....') },
    clips: { dim: { idle: 'dim', fps: 4 }, out: { idle: 'out', fps: 3 }, blush: { idle: 'blush', fps: 4 }, flick: { idle: 'flick', fps: 4 } } },
  dusty: { name: '_dusty', gait: 'float',
    variants: { up: r => shiftRegion(shiftRegion(r, 0, 3, 2, 8, -2), 12, 15, 2, 8, -2) },
    clips: { fly: { seq: ['base', 'up'], fps: 10 } } },
  earl: { name: 'earl', does: 'earl', gait: 'blob' },
  sip: { name: '_sip', gait: 'blob', variants: { empty: r => put(r, 0, 1, 'kddddddddk  ') }, clips: { empty: { idle: 'empty', fps: 4 } } },
  dent: { name: 'dent', does: 'dent', gait: 'legs' },
  soot: { name: '_soot', gait: 'legs', variants: { sneeze: r => put(put(r, 0, 7, 'kgcgkoookgcdk'), 0, 5, 'kgg..ggg..gdk') }, clips: { sneeze: { idle: 'sneeze', fps: 4 } } },
  volt: { name: 'volt', does: 'volt', gait: 'legs' },
  nut: { name: '_nut', gait: 'legs' },
  spike: { name: 'spike', does: 'spike', gait: 'blob' },
  tumble: { name: '_tumble', gait: 'blob' },
  morel: { name: 'morel', does: 'morel', gait: 'legs' },
  ribb: { name: '_ribb', gait: 'legs', eyes: ['e', 'w'] },
  luna: { name: 'luna', does: 'luna', gait: 'float', extra: { p: '#ff7aa2' }, variants: { blush: r => put(r, 0, 7, 'kpppykkkypppdk') }, clips: { blush: { idle: 'blush', fps: 4 } } },
  pup: { name: '_pup', gait: 'legs' },
  parcel: { name: 'parcel', does: 'parcel', gait: 'blob', variants: { empty: r => { for (let y = 0; y < 5; y++) put(r, 0, y, '.......'); return r; } }, clips: { empty: { idle: 'empty', fps: 4 }, crawl: { idle: 'base', fps: 4 } } },
  maily: { name: '_maily', gait: 'blob', eyes: ['p', 'e'] },
  wink: { name: 'wink', does: 'wink', gait: 'legs' }
};
/* the shadow twin: the fox in one dark colour, with two glowing eyes */
CAST.shade = { pal: { s: '#1d1430', y: '#ffd23f' }, rows: CAST.wink.rows.map(r => r.replace(/e/g, 'y').replace(/[^.y]/g, 's')) };
SPEC.shade = { name: '_shade', gait: 'legs', eyes: ['y'] };

/* props: drawn frame by frame */
const PROPS = {
  _chute: { w: 13, h: 8, palette: { k: '#3a2416', r: '#ff5d73', w: '#fff6ea' }, frames: { idle: [['...kkkkkkk...', '.kkrrwwwrrkk.', 'krrrwwwwwrrrk', 'kkkkkkkkkkkkk', '.k...k.k...k.', '..k..k.k..k..', '...k.k.k.k...', '....kkkkk....']] } },
  _steam: { w: 5, h: 7, palette: { w: '#ffffff' }, frames: { idle: [['..w..', '.w...', '..w..', '...w.', '..w..', '.w...', '.....'], ['...w.', '..w..', '.w...', '..w..', '...w.', '..w..', '.....']] }, fps: { idle: 4 } },
  _puff: { w: 7, h: 6, palette: { y: '#ffe066', o: '#ff7a2f' }, frames: { idle: [['..y....', '.yoy.y.', 'yoooyoy', '.ooooo.', '..ooo..', '...o...'], ['....y..', '.y.yoy.', 'yoyoooy', '.ooooo.', '..ooo..', '...o...']] }, fps: { idle: 10 } },
  _sparkle: { w: 7, h: 7, palette: { y: '#ffe066', w: '#ffffff' }, frames: { idle: [['...w...', '...y...', '.......', 'wy.w.yw', '.......', '...y...', '...w...'], ['.......', '.y...y.', '..w.w..', '...y...', '..w.w..', '.y...y.', '.......']] }, fps: { idle: 10 } },
  _letter: { w: 7, h: 5, palette: { k: '#33261c', l: '#ffffff', r: '#ff4d6d' }, frames: { idle: [['kkkkkkk', 'kklllkk', 'klkrklk', 'klllllk', 'kkkkkkk']] } }
};

const anim = (id, base, s, pal) => {
  const used = new Set(base.join('')), f = join(tmp, id + '.pal.json');
  writeFileSync(f, JSON.stringify({ name: id, scale: 4, does: 'crawl', gait: s.gait, eyes: s.eyes || ['e'], palette: Object.fromEntries(Object.entries(pal).filter(([k]) => used.has(k))), base }));
  execFileSync(process.execPath, [PAL, 'animate', f], { stdio: 'pipe' });
  return JSON.parse(readFileSync(f, 'utf8'));
};

let out = `/* generated by scripts/duos.mjs from scripts/duos-cast.mjs: edit the drawings there, not here.
 * DUOS: ten pairs of pals that share a spot and get on with each other (or don't). One tag brings the pair:
 *   popper (and Butter) · wick (and Dusty) · earl (and Sip) · dent (and Soot) · volt (and the bolts)
 *   spike (and Tumble) · morel (and Ribb) · luna (and Pup) · parcel (and the mailbox) · wink (and its shadow)
 * The behaviours are in src/behaviors/duos.js. */\n`;
let n = 0;
for (const [key, s] of Object.entries(SPEC)) {
  const c = CAST[key], pal = { ...c.pal, ...(s.extra || {}) }, id = key;
  const A = anim(id, c.rows.slice(), s, pal);
  const frames = {}, fps = {};
  for (const k of KEEP) if (A.frames[k]) { frames[k] = A.frames[k]; fps[k] = A.fps[k]; }
  const V = {};
  /* a pose with empty rows on top comes back shorter: pad it to the character's height, feet on the same line */
  const fit = P => { for (const k in P.frames) P.frames[k] = P.frames[k].map(f => [...Array(Math.max(0, A.h - f.length)).fill('.'.repeat(A.w)), ...f.map(r => r.padEnd(A.w, '.').slice(0, A.w))].slice(-A.h)); return P; };
  for (const [vn, fn] of Object.entries(s.variants || {})) V[vn] = fit(anim(id + '-' + vn, fn(c.rows.slice()), s, pal));
  for (const [cn, def] of Object.entries(s.clips || {})) {
    if (def.seq) frames[cn] = def.seq.map(v => (v === 'base' ? A : V[v]).frames.idle[0]);
    else frames[cn] = (def.idle === 'base' ? A : V[def.idle]).frames.idle;
    fps[cn] = def.fps;
  }
  /* every colour any clip uses */
  const usedAll = new Set(Object.values(frames).flat(2).join(''));
  const palette = Object.fromEntries(Object.entries(pal).filter(([k]) => usedAll.has(k)));
  const head = s.does ? "{ does: '" + s.does + "' }" : '{}';
  out += "defineSprite('" + s.name + "', Object.assign(" + head + ', ' + JSON.stringify({ w: A.w, h: A.h, scale: 4, start: 'idle', palette, frames, fps }) + '));\n';
  n++;
}
for (const [name, p] of Object.entries(PROPS)) out += "defineSprite('" + name + "', " + JSON.stringify({ scale: 4, start: 'idle', ...p }) + ');\n';
writeFileSync(join(root, 'src', 'pals', 'duos.js'), out);
rmSync(tmp, { recursive: true, force: true });
console.log(`src/pals/duos.js  ${n} characters, ${Object.keys(PROPS).length} props  ${(out.length / 1024).toFixed(0)} KB`);
