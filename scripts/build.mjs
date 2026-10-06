// Concatenates src/ fragments into one drop-in file: piixpal.js
// Every fragment shares one closure, so helpers in core.js are visible everywhere.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');

const dir = d => existsSync(join(src, d))
  ? readdirSync(join(src, d)).filter(f => f.endsWith('.js')).sort().map(f => join(d, f))
  : [];

export function bundle() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const order = [
    'core.js',
    'icons.js',
    ...dir('behaviors'),
    ...dir('pals'),
    ...dir('elements'),
    'boot.js'
  ].filter(f => existsSync(join(src, f)));

  const body = order
    .map(f => `/* ---- ${f.split(sep).join('/')} ---- */\n` + readFileSync(join(src, f), 'utf8').trim())
    .join('\n\n');

  const code = `/*! Piixpal v${pkg.version} | tiny pixel creatures that live on your website | MIT
 *  https://github.com/diiviikk5/Piixpal
 *
 *    <script src="piixpal.js"></script>
 *    <h1>Hello <piix-pal pal="bitbug"></piix-pal></h1>
 */
(() => {
'use strict';
if (window.Piixpal) return;
const VERSION = '${pkg.version}';

${body}
})();
`;
  return { code, files: order.length };
}

export function build() {
  const { code, files } = bundle();
  writeFileSync(join(root, 'piixpal.js'), code);
  return { files, bytes: Buffer.byteLength(code) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = build();
  console.log(`piixpal.js  ${r.files} fragments  ${(r.bytes / 1024).toFixed(1)} KB`);
}
