// node scripts/extension.mjs
// Readies the browser extension in extension/: copies the library it injects into extension/lib
// (the whole bundle for the panel, the core and one small file per pet), draws its pixel icons,
// and zips the lot to site/piixpal-extension.zip for the download on /components/visit.
// Run it after `node scripts/build.mjs`.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, deflateRawSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ext = join(root, 'extension');
const PETS = ['bitbug', 'pip', 'boing', 'moss', 'kitty', 'penguin', 'gecko', 'tri', 'bumble', 'shibe', 'capy', 'frog', 'duckling', 'shel', 'roomba', 'hiss'];

/* ---------- the library ---------- */
rmSync(join(ext, 'lib'), { recursive: true, force: true });
mkdirSync(join(ext, 'lib', 'c'), { recursive: true });
writeFileSync(join(ext, 'lib', 'piixpal.min.js'), readFileSync(join(root, 'piixpal.min.js')));
writeFileSync(join(ext, 'lib', 'core.min.js'), readFileSync(join(root, 'dist', 'core.min.js')));
for (const p of PETS) writeFileSync(join(ext, 'lib', 'c', p + '.min.js'), readFileSync(join(root, 'dist', 'c', p + '.min.js')));
/* the extension's version follows the library's */
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(ext, 'manifest.json'), 'utf8'));
manifest.version = pkg.version.split('-')[0] + (pkg.version.split('.').length < 3 ? '.0' : '');
writeFileSync(join(ext, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

/* ---------- icons: the lime pixel face, as PNGs ---------- */
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const png = (w, h, px) => {
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 4 + 1) + 1 + x * 4, c = px(x, y); raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = c[3]; } }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
const ART = [
  '..kkkkkkkkkk..',
  '.kGGGggggggddk.'.slice(0, 14),
  'kGGgggggggggdk',
  'kGggggggggggdk',
  'kgggkkggkkggdk',
  'kgggkwggkwggdk',
  'kgggkkggkkggdk',
  'kggggggggggg dk'.replace(' ', '').slice(0, 14),
  'kgggggkkggggdk',
  'kgggggggggggdk',
  'kggggggggggddk',
  '.kddddddddddk.',
  '..kkkkkkkkkk..'
];
const COL = { k: [23, 18, 31, 255], g: [198, 244, 50, 255], G: [239, 255, 192, 255], d: [127, 166, 28, 255], w: [255, 255, 255, 255], '.': [0, 0, 0, 0] };
mkdirSync(join(ext, 'icons'), { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const aw = 14, ah = ART.length, k = Math.max(1, Math.floor(size / Math.max(aw, ah))), ox = Math.floor((size - aw * k) / 2), oy = Math.floor((size - ah * k) / 2);
  writeFileSync(join(ext, 'icons', size + '.png'), png(size, size, (x, y) => { const ax = Math.floor((x - ox) / k), ay = Math.floor((y - oy) / k); return COL[(ART[ay] || '')[ax]] || COL['.']; }));
}

/* ---------- the zip (deflate, no dependencies) ---------- */
const files = [];
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else files.push(p); } };
walk(ext);
const locals = [], centrals = [];
let offset = 0;
for (const f of files.sort()) {
  const name = Buffer.from(relative(ext, f).split(sep).join('/')), data = readFileSync(f), z = deflateRawSync(data, { level: 9 }), crc = crc32(data);
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(0, 10);
  lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(z.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
  const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0, 8); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(0, 12);
  ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(z.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
  locals.push(lh, name, z); centrals.push(ch, name);
  offset += 30 + name.length + z.length;
}
const cd = Buffer.concat(centrals), end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
const zip = Buffer.concat([...locals, cd, end]);
writeFileSync(join(root, 'site', 'piixpal-extension.zip'), zip);
console.log(`extension/  ${files.length} files  ·  site/piixpal-extension.zip  ${(zip.length / 1024).toFixed(0)} KB  ·  v${manifest.version}`);
