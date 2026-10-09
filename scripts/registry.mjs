// A shadcn registry for Piixpal: one item per component, served from /r/ on the site.
//
//   npx shadcn@latest add https://piixpal.dvkk.dev/r/bitbug.json
//
// Each item drops a small React component into the project (plus a shared loader in
// lib/piixpal.ts). The component loads only its own file from the CDN, once.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const SITE = process.env.PIIX_SITE || 'https://piixpal.dvkk.dev';
const CDN = `https://cdn.jsdelivr.net/npm/piixpal@${pkg.version}/`;
const { PALS } = await import('./docs.mjs');
const { POWERS } = await import('./powers-data.mjs');

/* one-line descriptions, shared with the docs */
const docs = readFileSync(join(root, 'scripts/docs.mjs'), 'utf8');
const BRIEF = JSON.parse(docs.match(/const BRIEF = (\{[^\n]*\});/)[1]);
const sprites = readdirSync(join(root, 'src/sprites')).filter(f => f.endsWith('.js')).map(f => {
  const src = readFileSync(join(root, 'src/sprites', f), 'utf8');
  return { name: src.match(/defineFigure\('([\w-]+)'/)[1], tag: (src.match(/tag: '([^']+)'/) || [, ''])[1].replace(/\\'/g, "'") };
});

const Pascal = s => s.split(/[-_]/).map(w => w[0].toUpperCase() + w.slice(1)).join('');
const first = d => (String(d || '').match(/^[\s\S]*?[.!?](?=\s|$)/) || [String(d || '')])[0].replace(/<[^>]+>/g, '');

/* the shared loader every component uses */
const LIB = `import type * as React from "react";

/* Piixpal loader, from the Piixpal shadcn registry (${SITE}).
 * Loads a component's file from the CDN once, in the browser only. */
const CDN = ${JSON.stringify(CDN)};
const loading = new Map<string, Promise<void>>();

/** load one component ("bitbug"), the engine alone ("core"), or everything ("all") */
export function loadPiixpal(name: string = "all"): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const src = name === "all" ? CDN + "piixpal.min.js" : name === "core" ? CDN + "dist/core.min.js" : CDN + "dist/c/" + name + ".min.js";
  if (!loading.has(src)) {
    loading.set(src, new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { loading.delete(src); reject(new Error("Piixpal could not load " + src)); };
      document.head.appendChild(s);
    }));
  }
  return loading.get(src)!;
}

export type PiixProps = Omit<React.HTMLAttributes<HTMLElement>, "color"> & Record<string, string | number | boolean | undefined>;

/** React props to custom-element attributes: true becomes "", false and undefined are dropped */
export function piixAttrs(props: PiixProps): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === false || v == null) continue;
    out[k === "className" ? "class" : k] = v === true ? "" : String(v);
  }
  return out;
}
`;

/* one component file */
const component = ({ name, Comp, tag, attr, load }) => `"use client";
/* ${Comp}, from the Piixpal shadcn registry. Options: ${SITE}/components/ */
import * as React from "react";
import { loadPiixpal, piixAttrs, type PiixProps } from "@/lib/piixpal";

export function ${Comp}(props: PiixProps) {
  React.useEffect(() => { loadPiixpal(${JSON.stringify(load)}); }, []);
  return React.createElement(${JSON.stringify(tag)}, ${attr ? `{ ${JSON.stringify(attr[0])}: ${JSON.stringify(attr[1])}, ...piixAttrs(props) }` : 'piixAttrs(props)'});
}

export default ${Comp};
`;

const items = [];
const add = (name, title, description, tag, attr, load) => {
  const Comp = Pascal(name);
  items.push({
    name, title, description,
    tag, attr, load,
    json: {
      $schema: 'https://ui.shadcn.com/schema/registry-item.json',
      name, type: 'registry:component', title, description,
      registryDependencies: [`${SITE}/r/piixpal.json`],
      files: [{ path: `registry/piixpal/${name}.tsx`, type: 'registry:component', target: `components/piixpal/${name}.tsx`, content: component({ name, Comp, tag, attr, load }) }]
    }
  });
};
for (const p of PALS) add(p.id, Pascal(p.id), BRIEF[p.id] || first(p.desc), 'piix-pal', ['pal', p.id], p.id);
for (const p of POWERS) {
  if (p.kind === 'element') add(p.id, Pascal(p.id), BRIEF[p.id] || first(p.desc), p.tag, null, p.id);
  else add(p.id, Pascal(p.id), BRIEF[p.id] || first(p.desc), 'piix-pal', ['pal', p.id], p.id);
}
for (const s of sprites) if (!items.some(i => i.name === s.name)) add(s.name, Pascal(s.name), s.tag, 'piix-sprite', ['name', s.name], s.name);
add('crowd', 'Crowd', 'Hundreds of tiny agents on one canvas: they wander, swarm your cursor, or spell a word.', 'piix-crowd', null, 'core');
add('pixel-type', 'PixelType', 'Any font as chunky extruded pixel blocks that pals can walk on.', 'piix-type', null, 'core');

const out = join(root, 'r');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const base = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'piixpal', type: 'registry:lib', title: 'Piixpal',
  description: 'The shared loader for Piixpal components: loads each one from the CDN, once, in the browser.',
  files: [{ path: 'registry/lib/piixpal.ts', type: 'registry:lib', target: 'lib/piixpal.ts', content: LIB }]
};
writeFileSync(join(out, 'piixpal.json'), JSON.stringify(base, null, 2));
for (const it of items) writeFileSync(join(out, it.name + '.json'), JSON.stringify(it.json, null, 2));
/* the index, so tools can list everything */
writeFileSync(join(out, 'registry.json'), JSON.stringify({
  $schema: 'https://ui.shadcn.com/schema/registry.json',
  name: 'piixpal', homepage: SITE,
  items: [{ name: 'piixpal', type: 'registry:lib', title: 'Piixpal', description: base.description }, ...items.map(i => ({ name: i.name, type: 'registry:component', title: i.title, description: i.description }))]
}, null, 2));
console.log(`r/  ${items.length} components + the loader`);

/* llms.txt: a plain list AI coding tools can read to use Piixpal correctly */
const line = it => `- ${it.title}: ${it.description} Tag: <${it.tag}${it.attr ? ` ${it.attr[0]}="${it.attr[1]}"` : ''}>. shadcn: npx shadcn@latest add ${SITE}/r/${it.name}.json`;
writeFileSync(join(root, 'llms.txt'), `# Piixpal

> Pixel characters that live on your website: drop-in web components, zero dependencies, free and open source (MIT).

## Install (pick one)
- Script tag: <script src="https://cdn.jsdelivr.net/npm/piixpal@${pkg.version.split('.').slice(0, 2).join('.')}/piixpal.min.js"></script> then use the tags anywhere.
- One component only: <script src="https://cdn.jsdelivr.net/npm/piixpal@${pkg.version.split('.').slice(0, 2).join('.')}/dist/c/NAME.min.js"></script>
- npm: npm install piixpal; React: import { PiixPal } from "piixpal/react"; <PiixPal pal="bitbug" />. Vue: app.use(Piixpal) from "piixpal/vue". Anything else: import "piixpal" in browser code.
- shadcn: npx shadcn@latest add ${SITE}/r/NAME.json, then import { Name } from "@/components/piixpal/NAME".
- No markup: <script src="…/piixpal.min.js" data-pals="bitbug@h1, boing@footer"></script>

## Rules
- A pal lives on the element it is placed inside (or on="css selector"). It never blocks clicks.
- box="selector" keeps any pal inside one element.
- Pals are browser-only; in Next.js use the React wrappers or shadcn components (they are client components).
- Docs and live demos: ${SITE}/components/

## Components
${items.map(line).join('\n')}
`);
console.log('llms.txt');
