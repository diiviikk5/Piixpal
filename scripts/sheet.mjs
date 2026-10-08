// Contact sheet: renders every frame of the pals and sprites in the given files to a PNG,
// so pixel art can be checked without a browser.
//
//   node scripts/sheet.mjs src/powers/pix.js [more files…] [--out sheet.png] [--scale 6]
//
// Each sprite gets a row: every clip's frames left to right, drawn on white and on ink.
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import vm from 'node:vm';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const outFile = opt('--out', 'sheet.png');
const S = +opt('--scale', 6);
const files = args;
if (!files.length) { console.log('usage: node scripts/sheet.mjs <files…> [--out sheet.png] [--scale 6]'); process.exit(1); }

/* the art helpers, lifted straight out of core.js so the sheet matches the real thing */
const core = readFileSync(new URL('../src/core.js', import.meta.url), 'utf8');
const artSrc = core.slice(core.indexOf('const art = {'), core.indexOf('Piixpal.art = art;')) +
  core.slice(core.indexOf('Object.assign(art, {'));
const bigSrc = (readFileSync(new URL('../src/elements/sprite.js', import.meta.url), 'utf8').match(/const BIG = [^\n]+/) || ['const BIG = {};'])[0];

const sprites = [];
const dummy = () => new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : dummy(), apply: () => dummy(), construct: () => dummy() });
const ctx = {
  console, Math, JSON, Object, Array, String, Number, Set, Map, Symbol, Promise, Error,
  defineSprite: (name, spec) => { sprites.push({ name, kind: 'pal', spec }); return spec; },
  defineFigure: (name, spec) => { sprites.push({ name, kind: 'sprite', spec }); return spec; },
  defineBehavior: () => {}, define: () => {}, ELEMENTS: {}, ICONS: {}, SPRITES: {}, FIGURES: {},
  clamp: (v, a, b) => Math.min(b, Math.max(a, v)), lerp: (a, b, k) => a + (b - a) * k,
  rnd: (a, b) => a + Math.random() * (b - a), pick: a => a[0], chance: () => false,
  document: dummy(), window: dummy(), navigator: dummy(), localStorage: dummy(), matchMedia: dummy(),
  addEventListener() {}, removeEventListener() {}, HTMLElement: class {}, customElements: dummy(), Piixpal: {}
};
vm.createContext(ctx);
vm.runInContext(artSrc + '\n' + bigSrc + '\nthis.art = art; this.BIG = BIG;', ctx);
for (const f of files) {
  try { vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f }); }
  catch (e) { console.warn(`${f}: stopped early (${e.message}); showing what was defined`); }
}

/* lay out: one row per sprite, each frame drawn twice (on white, on ink) */
const hex = h => { h = h.replace('#', ''); if (h.length <= 4) h = [...h].map(c => c + c).join(''); const n = parseInt(h.padEnd(8, 'f'), 16); return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; };
const rowsOf = sp => sp.kind === 'pal' ? Object.entries(sp.spec.frames).flatMap(([clip, fr]) => fr.map(f => ({ clip, rows: f }))) : sp.spec.frames.map(f => ({ clip: 'f', rows: f }));
const G = 4 * S, list = sprites.map(sp => ({ sp, frames: rowsOf(sp) }));
const W = Math.max(...list.map(({ sp, frames }) => frames.length * (sp.spec.w * S + G) * 2 + G)) + G;
const H = list.reduce((h, { sp }) => h + sp.spec.h * S + G * 2, G);
const px = new Uint8Array(W * H * 4).fill(255);
const fill = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (x < 0 || y < 0 || x >= W || y >= H) continue; const i = (y * W + x) * 4; const a = c[3] / 255; px[i] = px[i] * (1 - a) + c[0] * a; px[i + 1] = px[i + 1] * (1 - a) + c[1] * a; px[i + 2] = px[i + 2] * (1 - a) + c[2] * a; } };
let y = G;
for (const { sp, frames } of list) {
  const { w, h, palette } = sp.spec, pal = {};
  for (const k in palette) pal[k] = hex(palette[k]);
  frames.forEach(({ rows }, i) => {
    for (const bg of [0, 1]) {
      const x0 = G + (i * 2 + bg) * (w * S + G);
      fill(x0 - 2, y - 2, w * S + 4, h * S + 4, bg ? [23, 18, 31, 255] : [236, 233, 226, 255]);
      const pad = h - rows.length;
      rows.forEach((r, ry) => { for (let x = 0; x < r.length && x < w; x++) { const c = pal[r[x]]; if (c) fill(x0 + x * S, y + (ry + pad) * S, S, S, c); } });
    }
  });
  y += h * S + G * 2;
}

/* minimal PNG encoder */
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let r = 0; r < H; r++) { raw[r * (W * 4 + 1)] = 0; Buffer.from(px.buffer, r * W * 4, W * 4).copy(raw, r * (W * 4 + 1) + 1); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
writeFileSync(outFile, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log(`${outFile}: ${list.map(({ sp, frames }) => `${sp.name} (${frames.length})`).join(', ')}`);
