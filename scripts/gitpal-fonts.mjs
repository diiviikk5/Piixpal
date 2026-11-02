// Turns a few fonts into plain glyph outlines for the Gitpal API (api/_gpfonts.json).
// GitHub shows README images in a sandbox that can't load web fonts, so Gitpal draws
// every letter as a path. The server has no dependencies, so the outlines are made here, once.
//   node scripts/gitpal-fonts.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = {
  script: ['caveat', 'caveat-latin-600-normal.woff'],
  serif: ['instrument-serif', 'instrument-serif-latin-400-normal.woff'],
  serifi: ['instrument-serif', 'instrument-serif-latin-400-italic.woff'],
  mono: ['jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff'],
  grotesk: ['space-grotesk', 'space-grotesk-latin-600-normal.woff'],
  display: ['unbounded', 'unbounded-latin-800-normal.woff'],
  pixel: ['pixelify-sans', 'pixelify-sans-latin-600-normal.woff']
};
const UPM = 1000;   /* every font is normalised to 1000 units per em */
const out = {};
for (const [key, [pkg, file]] of Object.entries(FONTS)) {
  const buf = readFileSync(join(root, 'node_modules', '@fontsource', pkg, 'files', file));
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const k = UPM / font.unitsPerEm;
  const glyphs = {};
  for (let c = 32; c < 127; c++) {
    const ch = String.fromCharCode(c), g = font.charToGlyph(ch);
    /* y is flipped (SVG grows down) and everything rounded to whole units: small and crisp */
    const p = g.getPath(0, 0, UPM);
    const d = p.commands.map(cm => {
      const n = v => Math.round(v);
      switch (cm.type) {
        case 'M': return `M${n(cm.x)} ${n(cm.y)}`;
        case 'L': return `L${n(cm.x)} ${n(cm.y)}`;
        case 'Q': return `Q${n(cm.x1)} ${n(cm.y1)} ${n(cm.x)} ${n(cm.y)}`;
        case 'C': return `C${n(cm.x1)} ${n(cm.y1)} ${n(cm.x2)} ${n(cm.y2)} ${n(cm.x)} ${n(cm.y)}`;
        default: return 'Z';
      }
    }).join('');
    glyphs[ch] = [Math.round(g.advanceWidth * k), d];
  }
  out[key] = { asc: Math.round(font.ascender * k), desc: Math.round(-font.descender * k), cap: Math.round((font.tables.os2 && font.tables.os2.sCapHeight || font.ascender * .7) * k), g: glyphs };
}
writeFileSync(join(root, 'api', '_gpfonts.json'), JSON.stringify(out));
console.log('api/_gpfonts.json', Object.keys(out).join(', '), (JSON.stringify(out).length / 1024).toFixed(0) + ' KB');
