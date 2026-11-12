#!/usr/bin/env node
/* pal.mjs: make a Piixpal pal from one drawing. No dependencies (Node 18+).
 *
 *   node pal.mjs new <name> [--from blob|critter|bird|bot|ghost|shroom] [--color #hex] [--does crawl]
 *                                       start a pal file (<name>.pal.json) from an archetype
 *   node pal.mjs animate <file>         build every clip (idle, walk, hop, happy, sleep, look, scared…) from "base"
 *   node pal.mjs check <file>           is it valid? (run after every edit)
 *   node pal.mjs show <file> [clip]     draw it in the terminal; --play animates it
 *   node pal.mjs export <file> [dir]    <name>.pal.js for a website, <name>.png sheet, <name>.html live preview
 *   node pal.mjs pet <file>             make it your terminal pet for Claude Code / Codex
 *   node pal.mjs agents [--write]       show (or write) the Claude Code status line + hooks and the Codex notify setup
 *
 * The pal file: { name, w, h, scale, does, gait, palette: { ch: "#hex" }, eyes: ["e"], base: [rows], frames: {}, fps: {} }
 * "." is empty. You only have to draw "base"; `animate` writes the rest and never touches a clip you drew yourself. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';

const argv = process.argv.slice(2), cmd = argv[0];
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : d; };
const die = m => { console.error('pal: ' + m); process.exit(1); };
const SITE = 'https://piixpal.dvkk.dev';

/* ---------- archetypes: six good starting shapes. k outline, b body, d shade, h highlight, e eye, c cheek ---------- */
const ARCH = {
  blob: { gait: 'blob', does: 'bounce', base: [
    '....kkkkkk....', '..kkbbbbbbkk..', '.kbbhhbbbbbbk.', '.kbhbbbbbbbbk.', 'kbbbbbbbbbbbbk', 'kbbbebbbbebbbk', 'kbbbebbbbebbbk',
    'kbcbbbbbbbbcbk', 'kbbbbbkkbbbbdk', '.kbbbbbbbbddk.', '..kkkkkkkkkk..'] },
  critter: { gait: 'legs', does: 'crawl', base: [
    '.kk........kk.', '.kbk......kbk.', '.kbbkkkkkkbbk.', '.kbbbbbbbbbbk.', '.kbebbbbbbebk.', '.kbebbbbbbebk.', '.kbbbbkkbbbbk.',
    '.kcbbbbbbbbck.', '..kbbbbbbbdk..', '..kbbkkkkbdk..', '..kbbk..kbbk..', '...kk....kk...'] },
  bird: { gait: 'legs', does: 'perch', extra: { o: '#ff8a2f' }, base: [
    '...kkkkk....', '..kbbbbbk...', '.kbhbbbebk..', '.kbbbbbebkoo', 'kbbbbbbbbkoo', 'kbbdddbbbk..', 'kbddddbbbk..', '.kbddbbbbk..',
    '..kkkkkkk...', '...o...o....', '...o...o....'] },
  bot: { gait: 'legs', does: 'crawl', extra: { a: '#ff5d73' }, base: [
    '.....aa.....', '.....kk.....', '.kkkkkkkkkk.', '.kbbhbbbbbk.', '.kbeebbeebk.', '.kbeebbeebk.', '.kbbbbbbbbk.', '.kbbkkkkbdk.',
    '.kkkkkkkkkk.', '..kddddddk..', '..kkkkkkkk..', '..kk....kk..', '..kk....kk..'] },
  ghost: { gait: 'float', does: 'float', base: [
    '...kkkkkk...', '..kbbbbbbk..', '.kbhhbbbbbk.', '.kbhbbbbbbk.', 'kbbebbbbebbk', 'kbbebbbbebbk', 'kbbbbbbbbbbk', 'kbcbbkkbbcbk',
    'kbbbbbbbbbbk', 'kbbbbbbbbbdk', 'kbkbbkkbbkbk', '.k.kk..kk.k.'] },
  shroom: { gait: 'blob', does: 'lounge', extra: { r: '#ff5d73', w: '#fff6e6' }, base: [
    '...kkkkkk...', '.kkrrrrrrkk.', 'krrwrrrrwrrk', 'krrrrrwrrrrk', 'krwrrrrrrwrk', '.kkkkkkkkkk.', '..kbbbbbbk..', '..kbebbebk..',
    '..kbebbebk..', '..kbbkkbdk..', '..kbbbbbdk..', '...kkkkkk...'] }
};
/* which clips a behaviour plays, and which of ours stand in for them */
const NEEDS = {
  crawl: { flip: 'idle' }, bounce: { land: 'squash', held: 'scared', dizzy: 'scared' }, lounge: { rest: 'idle', swat: 'happy', purr: 'happy' },
  perch: { peck: 'look', fly: 'flap' }, follow: { fly: 'flap', perch: 'idle' }, float: { pop: 'scared' }, hang: {}, creep: { peek: 'look', hide: 'sleep' }, climb: { wag: 'happy' }
};

/* ---------- colour ---------- */
const hex2 = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, k) => toHex(hex2(a).map((v, i) => v + (hex2(b)[i] - v) * k));
/* one body colour makes the whole ramp: outline, shade, highlight, cheek */
const ramp = c => ({ k: mix(c, '#140d1f', .86), b: c, d: mix(c, '#2a1140', .3), h: mix(c, '#ffffff', .5), e: mix(c, '#140d1f', .9), c: mix(c, '#ff5d8f', .55) });

/* ---------- rows ---------- */
const blank = w => '.'.repeat(w);
const norm = (rows, w, h) => { rows = rows.map(r => r.padEnd(w, '.').slice(0, w)); while (rows.length < h) rows.unshift(blank(w)); return rows; };
const up = (rows, n) => { const w = rows[0].length; return n > 0 ? [...rows.slice(n), ...Array(n).fill(blank(w))] : [...Array(-n).fill(blank(w)), ...rows.slice(0, rows.length + n)]; };
const side = (rows, n) => rows.map(r => n > 0 ? ('.'.repeat(n) + r).slice(0, r.length) : (r + '.'.repeat(-n)).slice(-n));
const setPx = (rows, x, y, ch) => { if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) return; rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1); };
const filled = r => /[^.]/.test(r);
const bottom = rows => { for (let y = rows.length - 1; y >= 0; y--) if (filled(rows[y])) return y; return rows.length - 1; };
const top = rows => rows.findIndex(filled);

/* squash: the body sinks one pixel. The widest row in its upper part is dropped, so the outline stays whole */
const squash = (rows, keep = []) => {
  const t = top(rows), b = bottom(rows), span = b - t + 1; if (span < 5) return rows;
  let best = t + 1, bw = -1;
  for (let y = t + 1; y <= t + Math.floor(span * .6); y++) { if (keep.some(k => rows[y].includes(k))) continue; const n = rows[y].replace(/\./g, '').length; if (n >= bw && rows[y] === rows[y + 1] || n > bw) { bw = n; best = y; } }
  return [blank(rows[0].length), ...rows.slice(0, best), ...rows.slice(best + 1)];
};
/* eyes: every blob of eye pixels closes to its bottom row (two tall becomes a line), the rest takes the colour beside it */
const eyesShut = (rows, eyes, lid) => {
  const out = [...rows], W = rows[0].length, H = rows.length, seen = new Set(), isEye = (x, y) => y >= 0 && y < H && x >= 0 && x < W && eyes.includes(rows[y][x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!isEye(x, y) || seen.has(y * W + x)) continue;
    const comp = [], st = [[x, y]]; seen.add(y * W + x);
    while (st.length) { const [cx, cy] = st.pop(); comp.push([cx, cy]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (isEye(nx, ny) && !seen.has(ny * W + nx)) { seen.add(ny * W + nx); st.push([nx, ny]); } } }
    const maxY = Math.max(...comp.map(p => p[1])), tall = maxY - Math.min(...comp.map(p => p[1])) + 1;
    /* shut: the lid comes down over all of it, leaving a dark line along the bottom (the first eye key is the pupil) */
    for (const [cx, cy] of comp) setPx(out, cx, cy, cy < maxY || tall === 1 ? lid : eyes[0]);
  }
  return out;
};
/* eyes glance one pixel forward */
const eyesLook = (rows, eyes, lid) => {
  const out = [...rows], W = rows[0].length;
  for (let y = 0; y < rows.length; y++) for (let x = W - 2; x >= 0; x--) if (eyes.includes(rows[y][x]) && !eyes.includes(rows[y][x + 1]) && rows[y][x + 1] !== '.') { setPx(out, x + 1, y, rows[y][x]); if (!eyes.includes(rows[y][x - 1] || '.')) setPx(out, x, y, lid); }
  return out;
};
/* lift the foot on one side: its lowest pixels move up a row */
const liftFoot = (rows, half) => {
  const out = [...rows], b = bottom(rows), W = rows[0].length, cols = [...rows[b]].map((c, x) => c !== '.' ? x : -1).filter(x => x >= 0);
  if (!cols.length) return rows; const mid = (Math.min(...cols) + Math.max(...cols)) / 2;
  for (const x of cols) if (half < 0 ? x < mid : x > mid) { setPx(out, x, b - 1, rows[b][x]); setPx(out, x, b, '.'); }
  return out;
};
const lean = rows => { const t = top(rows), b = bottom(rows), m = Math.floor((t + b) / 2); return rows.map((r, y) => y <= m ? side([r], 1)[0] : r); };
/* the hem of a floating thing ripples */
const ripple = rows => { const b = bottom(rows); return rows.map((r, y) => y === b ? (r.slice(-1) + r.slice(0, -1)) : r); };

/* ---------- animate: every clip from the one drawing ---------- */
function animate(p, force) {
  if (!p.base) die('the file needs a "base" drawing (an array of rows)');
  const eyes = p.eyes || ['e'];
  /* room to jump: three empty rows above the head */
  let rows = p.base.map(String), W = Math.max(...rows.map(r => r.length));
  rows = rows.map(r => r.padEnd(W, '.'));
  while (top(rows) > 0 && !filled(rows[0])) rows.shift();
  const H = rows.length + 3; rows = norm(rows, W, H);
  p.w = W; p.h = H;
  /* the lid: the colour most often touching an eye */
  const cnt = {};
  rows.forEach((r, y) => [...r].forEach((c, x) => { if (eyes.includes(c)) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (rows[y + dy] || '')[x + dx]; if (n && n !== '.' && !eyes.includes(n)) cnt[n] = (cnt[n] || 0) + 1; } }));
  /* ...but not the outline: skip the darkest colour when there is another */
  const lum = k => hex2(p.palette[k] || '#000').reduce((a, v) => a + v, 0);
  const cand = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(e => e[0]), dark = [...cand].sort((a, b) => lum(a) - lum(b))[0];
  const lid = p.lid || cand.find(k => k !== dark || cand.length === 1) || 'b';
  const B = rows, shut = eyesShut(B, eyes, lid), sq = squash(B, eyes), look = eyesLook(B, eyes, lid), gait = p.gait || 'legs';
  const walk = gait === 'legs' ? [liftFoot(B, -1), B, liftFoot(B, 1), B] : gait === 'float' ? [B, ripple(up(B, 1)), up(B, 1), ripple(B)] : [sq, B, up(B, 1), B];
  const auto = {
    idle: [B, B, B, B, shut, B, B, sq, B, B], walk, hop: [sq, up(B, 2), up(B, 3), up(B, 2), sq],
    happy: [up(shut, 2), sq, up(shut, 2), sq], sleep: [squash(shut, eyes), squash(shut, eyes), shut, shut], look: [look, look, look, B],
    scared: [side(up(B, 1), -1), side(up(B, 1), 1)], squash: [sq, sq, B], flap: gait === 'legs' ? [up(liftFoot(liftFoot(B, -1), 1), 1), up(B, 2)] : [up(B, 1), up(sq, 1)]
  };
  const FPS = { idle: 4, walk: gait === 'float' ? 4 : 7, hop: 12, happy: 8, sleep: 2, look: 3, scared: 14, squash: 8, flap: 9 };
  const drawn = new Set(Object.keys(p.frames || {}).filter(c => !(p.auto || []).includes(c)));   /* clips you made by hand */
  p.frames = Object.fromEntries(Object.entries(p.frames || {}).filter(([c]) => drawn.has(c)).map(([c, fr]) => [c, fr.map(f => norm(f, W, H))]));
  p.fps = p.fps || {}; p.auto = [];
  const put = (name, frames, fps) => { if (drawn.has(name) && !force) return; p.frames[name] = frames; p.fps[name] = p.fps[name] && drawn.has(name) ? p.fps[name] : fps; p.auto.push(name); };
  for (const [name, frames] of Object.entries(auto)) put(name, frames, FPS[name]);
  /* the names the chosen behaviour asks for */
  for (const [want, from] of Object.entries(NEEDS[p.does] || {})) put(want, p.frames[from], p.fps[from]);
  p.start = 'idle';
  return p;
}

/* ---------- check ---------- */
function check(p) {
  const errs = [], warn = [];
  if (!/^[a-z][a-z0-9-]{1,23}$/.test(p.name || '')) errs.push('name: lowercase letters, digits and dashes, 2 to 24 long');
  if (!p.palette || !Object.keys(p.palette).length) errs.push('palette is missing');
  for (const [k, v] of Object.entries(p.palette || {})) { if (k.length !== 1 || k === '.') errs.push(`palette key "${k}" must be one character (not ".")`); if (!/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) errs.push(`palette ${k}: "${v}" is not a hex colour`); }
  if (!p.frames || !p.frames.idle) errs.push('no "idle" clip: run `pal.mjs animate` first');
  const used = new Set();
  for (const [clip, frames] of Object.entries(p.frames || {})) {
    if (!Array.isArray(frames) || !frames.length) { errs.push(`clip ${clip} has no frames`); continue; }
    frames.forEach((f, i) => {
      if (f.length !== p.h) errs.push(`${clip}[${i}] has ${f.length} rows, the pal is ${p.h} tall`);
      f.forEach((r, y) => { if (r.length !== p.w) errs.push(`${clip}[${i}] row ${y} is ${r.length} wide, the pal is ${p.w}`); for (const ch of r) { if (ch !== '.') { used.add(ch); if (!p.palette[ch]) errs.push(`${clip}[${i}] row ${y}: "${ch}" is not in the palette`); } } });
    });
  }
  if (p.w > 32 || p.h > 32) warn.push(`${p.w}x${p.h} is big for a pal: 10 to 18 pixels a side reads best`);
  if (p.w < 6 || p.h < 6) warn.push('very small: under 6 pixels there is no room for a face');
  const colours = Object.keys(p.palette || {}).length;
  if (colours > 8) warn.push(`${colours} colours: 4 to 6 look more like one character`);
  for (const k of Object.keys(p.palette || {})) if (!used.has(k)) warn.push(`palette "${k}" is never used`);
  if (p.does && !NEEDS[p.does] && !['crawl', 'bounce', 'lounge', 'perch', 'follow', 'float', 'hang', 'creep', 'climb'].includes(p.does)) warn.push(`"${p.does}" is not a behaviour this tool prepares clips for (it may still work)`);
  if (!(p.eyes || ['e']).some(e => used.has(e))) warn.push('no eye pixels found (palette key "e", or list yours in "eyes"): it cannot blink');
  return { errs: [...new Set(errs)].slice(0, 12), warn };
}

/* ---------- terminal drawing: two pixels per character cell ---------- */
const cell = (t, u) => t && u ? `\x1b[38;2;${hex2(t).join(';')};48;2;${hex2(u).join(';')}m▀\x1b[0m` : t ? `\x1b[38;2;${hex2(t).join(';')}m▀\x1b[0m` : u ? `\x1b[38;2;${hex2(u).join(';')}m▄\x1b[0m` : ' ';
const draw = (p, rows) => { const out = []; for (let y = 0; y < rows.length; y += 2) { let s = ''; for (let x = 0; x < p.w; x++) s += cell(p.palette[rows[y][x]], p.palette[(rows[y + 1] || '')[x]]); out.push(s); } return out; };

/* ---------- png ---------- */
const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
/* one row per clip, one cell per frame, on a dark card */
function sheet(p, S = 6) {
  const clips = Object.keys(p.frames), cols = Math.max(...clips.map(c => p.frames[c].length)), pad = 2;
  const cw = (p.w + pad) * S, ch = (p.h + pad) * S, W = cols * cw + pad * S, H = clips.length * ch + pad * S, buf = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { buf[i * 4] = 23; buf[i * 4 + 1] = 18; buf[i * 4 + 2] = 31; buf[i * 4 + 3] = 255; }
  clips.forEach((c, cy) => p.frames[c].forEach((rows, cx) => rows.forEach((r, y) => [...r].forEach((k, x) => {
    const col = p.palette[k]; if (!col) return; const [R, G, B] = hex2(col);
    for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) { const i = ((cy * ch + (y + pad) * S + dy) * W + cx * cw + (x + pad) * S + dx) * 4; buf[i] = R; buf[i + 1] = G; buf[i + 2] = B; }
  }))));
  return png(W, H, buf);
}

/* ---------- files ---------- */
const load = f => { if (!f) die('which pal file?'); try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { die(`cannot read ${f}: ${e.message}`); } };
/* a pal file is written the way you draw it: every row on its own line */
const save = (f, p) => {
  const rowsArr = a => '[\n      ' + a.map(r => JSON.stringify(r)).join(',\n      ') + '\n    ]';
  const order = ['name', 'w', 'h', 'scale', 'does', 'gait', 'eyes', 'lid', 'start', 'palette'];
  let s = '{\n' + order.filter(k => p[k] !== undefined).map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(p[k])}`).join(',\n');
  if (p.base) s += ',\n  "base": [\n    ' + p.base.map(r => JSON.stringify(r)).join(',\n    ') + '\n  ]';
  if (p.frames) s += ',\n  "frames": {\n' + Object.entries(p.frames).map(([c, fr]) => `    ${JSON.stringify(c)}: [${fr.map(rowsArr).join(', ')}]`).join(',\n') + '\n  }';
  if (p.fps) s += ',\n  "fps": ' + JSON.stringify(p.fps);
  if (p.auto) s += ',\n  "auto": ' + JSON.stringify(p.auto);
  fs.writeFileSync(f, s + '\n}\n');
};
/* what the library and the terminal pet read: no drawing notes, just the pal */
const spec = p => ({ w: p.w, h: p.h, scale: p.scale || 4, does: p.does || 'crawl', start: 'idle', palette: p.palette, frames: p.frames, fps: p.fps });
const report = p => { const { errs, warn } = check(p); warn.forEach(w => console.log('  note: ' + w)); if (errs.length) { errs.forEach(e => console.error('  error: ' + e)); process.exit(1); } };
const PET = path.join(os.homedir(), '.piixpal-pet');

/* ---------- commands ---------- */
if (cmd === 'new') {
  const name = argv[1]; if (!name || name.startsWith('--')) die('new <name>');
  const from = flag('from', 'blob'), a = ARCH[from]; if (!a) die(`--from one of: ${Object.keys(ARCH).join(', ')}`);
  const color = flag('color', { blob: '#7ddc6a', critter: '#ffb054', bird: '#ffd23f', bot: '#8fb8ff', ghost: '#e9e4ff', shroom: '#f3e2c4' }[from]);
  const all = { ...ramp(color), ...(a.extra || {}) }, usedCh = new Set(a.base.join(''));
  const p = animate({ name, scale: 4, does: flag('does', a.does), gait: a.gait, eyes: ['e'], palette: Object.fromEntries(Object.entries(all).filter(([k]) => usedCh.has(k))), base: a.base });
  const f = name + '.pal.json'; if (fs.existsSync(f) && !flag('force')) die(`${f} exists (use --force)`);
  save(f, p); report(p);
  console.log(`wrote ${f}  (${p.w}x${p.h}, ${Object.keys(p.frames).length} clips, does: ${p.does})\n`); draw(p, p.frames.idle[0]).forEach(l => console.log('  ' + l));
  console.log(`\nedit "base" and "palette" in ${f}, then: node pal.mjs animate ${f}`);
} else if (cmd === 'animate') {
  const f = argv[1], p = animate(load(f), !!flag('force')); save(f, p); report(p);
  console.log(`${f}: ${Object.keys(p.frames).length} clips (${p.auto.length} made for you: ${p.auto.join(', ')})`);
} else if (cmd === 'check') {
  const p = load(argv[1]); report(p); console.log(`ok: ${p.name}, ${p.w}x${p.h}, ${Object.keys(p.palette).length} colours, clips: ${Object.keys(p.frames).join(', ')}`);
} else if (cmd === 'show') {
  const p = load(argv[1]); report(p);
  const only = argv[2] && !argv[2].startsWith('--') ? argv[2] : null;
  if (flag('play')) {
    const clip = only || 'idle', fr = p.frames[clip] || die(`no clip "${clip}"`); let i = 0; const n = Math.ceil(p.h / 2);
    process.stdout.write('\x1b[?25l' + '\n'.repeat(n + 1));
    const tick = () => { process.stdout.write(`\x1b[${n + 1}A` + draw(p, fr[i++ % fr.length]).map(l => '  ' + l + '\x1b[K').join('\n') + `\n  ${clip} ${i % fr.length + 1}/${fr.length}\x1b[K\n`); };
    tick(); const t = setInterval(tick, 1000 / (p.fps[clip] || 6));
    const stop = () => { clearInterval(t); process.stdout.write('\x1b[?25h'); process.exit(0); };
    process.on('SIGINT', stop); setTimeout(stop, (+flag('seconds', 6)) * 1000);
  } else for (const [clip, fr] of Object.entries(p.frames)) {
    if (only && clip !== only) continue;
    console.log(`\n  ${clip}  (${fr.length} frames, ${p.fps[clip] || 6} fps)`);
    const cells = fr.slice(0, 8).map(r => draw(p, r));
    for (let y = 0; y < cells[0].length; y++) console.log('  ' + cells.map(c => c[y]).join('  '));
  }
} else if (cmd === 'export') {
  const p = load(argv[1]); report(p);
  const dir = argv[2] && !argv[2].startsWith('--') ? argv[2] : '.'; fs.mkdirSync(dir, { recursive: true });
  const js = `/* ${p.name}: a Piixpal pal. Load after piixpal.js, then use <piix-pal pal="${p.name}"></piix-pal> inside any element.\n * Made with the piixpal-pal skill. ${SITE} */\n(function(){var S=${JSON.stringify(spec(p))};function go(){if(!window.Piixpal||!Piixpal.sprite)return false;Piixpal.sprite(${JSON.stringify(p.name)},S);` +
    `document.querySelectorAll('piix-pal[pal="${p.name}"]').forEach(function(e){var n=e.nextSibling,q=e.parentNode;if(q){q.removeChild(e);q.insertBefore(e,n)}});return true}` +
    `if(!go()){var t=setInterval(function(){if(go())clearInterval(t)},50);setTimeout(function(){clearInterval(t)},10000)}})();\n`;
  fs.writeFileSync(path.join(dir, p.name + '.pal.js'), js);
  fs.writeFileSync(path.join(dir, p.name + '.png'), sheet(p));
  fs.writeFileSync(path.join(dir, p.name + '.html'), `<!doctype html><meta charset="utf-8"><title>${p.name} · a Piixpal pal</title>
<style>body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#f3eee3;color:#17121f;display:grid;place-items:center;min-height:100vh}main{width:min(92vw,720px);padding:40px 0}
h1{font-size:clamp(48px,9vw,96px);letter-spacing:-.04em;margin:0 0 40px;line-height:1}.card{background:#fff;border-radius:18px;padding:28px;margin:24px 0;box-shadow:0 0 0 2px #17121f,6px 6px 0 #17121f}
.btn{display:inline-block;padding:14px 22px;border-radius:12px;background:#c6f432;font-weight:700;box-shadow:0 0 0 2px #17121f}footer{margin-top:60px;padding:30px;background:#17121f;color:#fff;border-radius:18px}img{image-rendering:pixelated;max-width:100%;border-radius:12px}</style>
<main><h1>Hello, ${p.name}.</h1><div class="card"><p>This is a test page. ${p.name} lives on the things here.</p><a class="btn" href="#">A button</a></div>
<div class="card"><p>Every clip, one row each:</p><img src="${p.name}.png" alt="sprite sheet"></div><footer>The footer.</footer></main>
<script src="${SITE}/piixpal.min.js"></script><script src="${p.name}.pal.js"></script>
<script>addEventListener('load',function(){setTimeout(function(){Piixpal.add(${JSON.stringify(p.name)},'${p.does === 'perch' ? '.btn' : p.does === 'bounce' ? 'footer' : p.does === 'lounge' || p.does === 'float' || p.does === 'hang' ? '.card' : 'h1'}')},300)})</script>\n`);
  console.log(`wrote ${p.name}.pal.js, ${p.name}.png, ${p.name}.html in ${path.resolve(dir)}\n\non a website:\n  <script src="${SITE}/piixpal.min.js"></script>\n  <script src="${p.name}.pal.js"></script>\n  <h1>Hello <piix-pal pal="${p.name}"></piix-pal></h1>`);
} else if (cmd === 'pet') {
  const p = load(argv[1]); report(p);
  fs.mkdirSync(path.join(PET, 'pals'), { recursive: true });
  fs.writeFileSync(path.join(PET, 'pals', p.name + '.json'), JSON.stringify(spec(p)));
  let cfg = {}; try { cfg = JSON.parse(fs.readFileSync(path.join(PET, 'config.json'), 'utf8')); } catch { /* first time */ }
  fs.writeFileSync(path.join(PET, 'config.json'), JSON.stringify({ ...cfg, pal: p.name, make: undefined }));
  const pm = path.join(PET, 'pet.mjs');
  const done = () => console.log(`${p.name} is your terminal pet now.\n\n  node "${pm}"            run it in a pane beside Claude Code or Codex\n  node pal.mjs agents      put it in Claude Code's status line and wire up notifications`);
  if (fs.existsSync(pm) && !flag('update')) done();
  else fetch(SITE + '/pet.mjs').then(r => r.ok ? r.text() : Promise.reject(new Error(r.status))).then(t => { fs.writeFileSync(pm, t); done(); })
    .catch(e => { console.log(`saved the pal, but could not download the pet (${e.message}). Get it yourself:\n  curl -fsSL ${SITE}/pet.mjs -o "${pm}"`); });
} else if (cmd === 'agents') {
  const pm = path.join(PET, 'pet.mjs').replace(/\\/g, '/'), run = `node "${pm}"`;
  const want = { statusLine: { type: 'command', command: `${run} statusline` }, hooks: { Notification: [{ hooks: [{ type: 'command', command: `${run} notify wait` }] }], Stop: [{ hooks: [{ type: 'command', command: `${run} notify done` }] }] } };
  const cs = path.join(os.homedir(), '.claude', 'settings.json'), cx = path.join(os.homedir(), '.codex', 'config.toml'), toml = `notify = ["node", "${pm}", "notify"]`;
  if (!flag('write')) {
    console.log(`Claude Code: merge into ${cs}\n\n${JSON.stringify(want, null, 2)}\n\nCodex: add to ${cx}\n\n${toml}\n\nThen run the pet in a pane beside your agent:\n  ${run}\n\n(node pal.mjs agents --write does the merging for you; it keeps a .bak of each file)`);
  } else {
    let s = {}; if (fs.existsSync(cs)) { try { s = JSON.parse(fs.readFileSync(cs, 'utf8')); } catch { die(`${cs} is not valid JSON; fix it or merge by hand`); } fs.copyFileSync(cs, cs + '.bak'); }
    const had = s.statusLine && !/pet\.mjs/.test(s.statusLine.command || '');
    if (!had) s.statusLine = want.statusLine;
    s.hooks = s.hooks || {};
    for (const ev of ['Notification', 'Stop']) { s.hooks[ev] = (s.hooks[ev] || []).filter(h => !JSON.stringify(h).includes('pet.mjs')); s.hooks[ev].push(want.hooks[ev][0]); }
    fs.mkdirSync(path.dirname(cs), { recursive: true }); fs.writeFileSync(cs, JSON.stringify(s, null, 2) + '\n');
    console.log(`Claude Code: ${had ? 'you already have a status line, left it alone; ' : 'status line set; '}Notification and Stop hooks added (${cs})`);
    if (fs.existsSync(path.dirname(cx))) {
      const t = fs.existsSync(cx) ? fs.readFileSync(cx, 'utf8') : '';
      if (/^\s*notify\s*=/m.test(t)) console.log(`Codex: config.toml already has a notify line, left it alone. To use the pet:\n  ${toml}`);
      else { if (t) fs.copyFileSync(cx, cx + '.bak'); fs.writeFileSync(cx, toml + '\n' + t); console.log(`Codex: notify set (${cx})`); }
    } else console.log('Codex: not installed here, skipped');
    console.log(`\nNow run the pet in a pane beside your agent:\n  ${run}`);
  }
} else {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\* ?/, '').replace(/^ \* ?/gm, ''));
}
