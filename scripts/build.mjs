// Builds Piixpal from src/ fragments.
//
//   piixpal.js / piixpal.min.js     everything in one drop-in file
//   dist/core.min.js                just the engine (elements, physics, renderers)
//   dist/c/<name>.min.js            one pal or sprite; loads the shared core by itself if needed
//
// The core is one function that returns its toolkit (Piixpal._k). Components are plain
// fragments that destructure that toolkit, so any number of files share one engine.
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const CDN = 'https://cdn.jsdelivr.net/gh/diiviikk5/Piixpal@main/dist/';

const dir = d => existsSync(join(src, d))
  ? readdirSync(join(src, d)).filter(f => f.endsWith('.js')).sort().map(f => join(d, f))
  : [];
const read = f => `/* ---- ${f.split(sep).join('/')} ---- */\n` + readFileSync(join(src, f), 'utf8').trim();

/* listed on every call, so a long-running dev server picks up new files */
const CORE_LIST = () => ['core.js', 'icons.js', 'ui.js', 'text.js', 'drag.js', ...dir('elements'), 'boot.js'].filter(f => existsSync(join(src, f)));
const COMPONENT_LIST = () => [...dir('behaviors'), ...dir('pals'), ...dir('sprites'), ...dir('powers')];

/* everything the core declares at the top level becomes part of the shared toolkit */
const coreNames = () => {
  const names = new Set();
  for (const f of CORE_LIST()) for (const m of readFileSync(join(src, f), 'utf8').matchAll(/^(?:const|let|var|class|function)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  return [...names];
};

const header = version => `/*! Piixpal v${version} | tiny pixel creatures that live on your website | MIT
 *  https://github.com/diiviikk5/Piixpal
 */`;

const coreFn = names => `function piixCore() {
${CORE_LIST().map(read).join('\n\n')}

Piixpal._k = { ${names.join(', ')} };
return Piixpal._k;
}`;

export function bundle() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const names = coreNames();
  const code = `${header(pkg.version)}
(() => {
'use strict';
const VERSION = '${pkg.version}';
const K = (window.Piixpal && window.Piixpal._k) || (${coreFn(names)})();
const { ${names.join(', ')} } = K;

${COMPONENT_LIST().map(read).join('\n\n')}

K.start(document.currentScript);
})();
`;
  return { code, files: CORE_LIST().length + COMPONENT_LIST().length, names };
}

/* just the engine */
function coreBundle(version, names) {
  return `${header(version)}
(() => {
'use strict';
const VERSION = '${version}';
if (window.Piixpal && window.Piixpal._k) return;
const K = (${coreFn(names)})();
K.start(document.currentScript);
})();
`;
}

/* one component: its own fragments, plus a tiny loader that fetches the core once */
function componentBundle(version, names, files, name) {
  return `/*! Piixpal ${name} v${version} | MIT | https://github.com/diiviikk5/Piixpal */
(() => {
'use strict';
const me = document.currentScript;
const run = K => {
const { ${names.join(', ')} } = K;
${files.map(read).join('\n\n')}
K.start(me);
};
if (window.Piixpal && window.Piixpal._k) return run(window.Piixpal._k);
const base = me && me.src ? me.src.replace(/c\\/[^/]+$/, '') : '${CDN}';
window.__piixCore = window.__piixCore || new Promise((ok, no) => {
  const s = document.createElement('script');
  s.src = base + 'core.min.js'; s.onload = () => ok(window.Piixpal._k); s.onerror = no;
  document.head.appendChild(s);
});
window.__piixCore.then(run);
})();
`;
}

/* which source files does each component need? */
export function components() {
  const behaviorFile = {};
  for (const f of dir('behaviors')) for (const m of readFileSync(join(src, f), 'utf8').matchAll(/defineBehavior\('(\w+)'/g)) behaviorFile[m[1]] = f;
  const out = {};
  for (const f of [...dir('pals'), ...dir('sprites'), ...dir('powers')]) {
    const text = readFileSync(join(src, f), 'utf8');
    const needs = [...new Set([...text.matchAll(/does: '(\w+)'/g)].map(m => behaviorFile[m[1]]).filter(Boolean))];
    const power = f.startsWith('powers');
    /* names starting with _ are crew-only (coins, balloons…): they ship inside their pal's file */
    for (const m of text.matchAll(/define(Sprite|Figure)\('([\w-]+)'/g)) if (m[2][0] !== '_') out[m[2]] = { kind: power ? 'power' : m[1] === 'Sprite' ? 'pal' : 'sprite', files: [...needs, f] };
    /* elements that aren't pals declare themselves with a "@component name" line */
    for (const m of text.matchAll(/@component ([\w-]+)/g)) out[m[1]] = { kind: 'power', files: [...needs, f] };
  }
  return out;
}

export function build() {
  const { code, files } = bundle();
  writeFileSync(join(root, 'piixpal.js'), code);
  return { files, bytes: Buffer.byteLength(code) };
}

export async function minify() {
  let esbuild;
  try { esbuild = await import('esbuild'); } catch (_) { return null; }
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const { code, names } = bundle();
  const min = c => esbuild.transform(c, { minify: true, legalComments: 'inline', target: 'es2019' }).then(r => r.code);
  writeFileSync(join(root, 'piixpal.min.js'), await min(code));
  /* dist: the engine on its own, and one file per component */
  rmSync(join(root, 'dist'), { recursive: true, force: true });
  mkdirSync(join(root, 'dist', 'c'), { recursive: true });
  writeFileSync(join(root, 'dist', 'core.min.js'), await min(coreBundle(pkg.version, names)));
  const comps = components();
  for (const [name, c] of Object.entries(comps)) writeFileSync(join(root, 'dist', 'c', name + '.min.js'), await min(componentBundle(pkg.version, names, c.files, name)));
  writeFileSync(join(root, 'dist', 'components.json'), JSON.stringify(Object.fromEntries(Object.entries(comps).map(([n, c]) => [n, c.kind])), null, 1));
  return { bytes: Buffer.byteLength(await min(code)), count: Object.keys(comps).length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = build();
  console.log(`piixpal.js      ${r.files} fragments  ${(r.bytes / 1024).toFixed(1)} KB`);
  const m = await minify();
  if (m) {
    const { gzipSync } = await import('node:zlib');
    const gz = f => (gzipSync(readFileSync(join(root, f))).length / 1024).toFixed(1);
    console.log(`piixpal.min.js  ${(m.bytes / 1024).toFixed(1)} KB  (${gz('piixpal.min.js')} KB gzipped)`);
    console.log(`dist/core.min.js  ${gz('dist/core.min.js')} KB gzipped · dist/c/*  ${m.count} components (e.g. kitty ${gz('dist/c/kitty.min.js')} KB gzipped)`);
  }
}
