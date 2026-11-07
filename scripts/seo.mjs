// Search, answer-engine and AI-crawler metadata for every public page. Run after the docs generators:
//   node scripts/seo.mjs
// It is idempotent: it owns everything between <!-- seo:start --> and <!-- seo:end --> in each page's head,
// the page <title> (the original is kept in data-orig), and it writes sitemap.xml, robots.txt, faq.html,
// llms.txt and llms-full.txt. Only pages committed to git are touched, so local drafts stay out of the index.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import vm from 'node:vm';
import { UI, SECTIONS } from './ui-data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://piixpal.dvkk.dev';
const REPO = 'https://github.com/diiviikk5/Piixpal';
const NPM = 'https://www.npmjs.com/package/piixpal';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const unesc = s => String(s).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const clip = (s, n) => s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)).replace(/[,;:·\s]+$/, '') + '…';
/* the first of these that fits in a search snippet */
const fit = (n, ...opts) => opts.find(o => o.length <= n) || clip(opts[opts.length - 1], n);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const read = f => readFileSync(join(root, f), 'utf8');

/* ---------- what exists (committed only) ---------- */
const tracked = new Set(execSync('git ls-files', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean));
const has = f => tracked.has(f) && existsSync(join(root, f));
/* last change per file, from one pass over history */
const lastmod = {};
{
  let day = '';
  for (const l of execSync('git log --format=@%cs --name-only', { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n')) {
    if (l.startsWith('@')) day = l.slice(1); else if (l && !lastmod[l]) lastmod[l] = day;
  }
}
const today = new Date().toISOString().slice(0, 10);

/* templates register in a browser script; read it in a sandbox */
const tctx = { window: {} };
vm.runInNewContext(read('templates/manifest.js'), tctx);
const TEMPLATES = tctx.window.TEMPLATES.filter(t => has(`templates/${t.slug}/index.html`));
const REG = JSON.parse(read('r/registry.json')).items.filter(i => i.type === 'registry:component');
const UIPUB = UI.filter(u => has(`ui/${u.slug}.html`));
const TOTAL = UIPUB.length + REG.length + TEMPLATES.length;
const ROUND = Math.floor(TOTAL / 50) * 50;           /* "300+" */

/* ---------- the words people search for ---------- */
const NOUN = {
  'Scenes': 'animated pixel art scene', 'Layouts': 'animated landing page layout', 'Hero sections': 'animated hero section',
  '3D & Shaders': 'WebGL shader effect', 'Image effects': 'WebGL image effect', 'Backgrounds': 'animated background',
  'ASCII': 'ASCII art animation', 'Sections': 'website section', 'Buttons': 'animated button', 'Cards': 'animated card',
  'Text': 'text animation effect', 'Media': 'media component', 'Forms': 'form component', 'Navigation': 'navigation component',
  'Overlays': 'overlay component', 'Feedback': 'feedback component', 'Data': 'data visualisation component', 'Motion': 'motion effect',
  'Physics & time': 'interactive physics effect', 'Games & sound': 'mini game component', 'Delight': 'UI micro-interaction',
};
const TECH = { webgl: 'WebGL', gsap: 'GSAP scroll', ascii: 'ASCII', pixel: 'pixel art', image: 'image', '3d': '3D', particles: 'particles', dither: 'dithered', scroll: 'scroll-driven', interactive: 'interactive' };
const techOf = t => (t.tags || []).map(x => TECH[x]).filter(Boolean);

/* ---------- FAQ: one source for the page, its schema and llms.txt ---------- */
const FAQ = [
  ['What is Piixpal?', `Piixpal is a free, open-source (MIT) library of ${ROUND}+ animated UI components and templates for websites: pixel characters ("pals") that live on your page, WebGL shader backgrounds, animated hero sections, ${TEMPLATES.length} landing-page hero templates, ASCII animations, buttons, cards, text effects and form controls. Every piece is a standard web component, so it works in plain HTML, React, Next.js, Vue, Svelte and Astro.`],
  ['Is Piixpal free for commercial use?', 'Yes. Everything is MIT-licensed: use it in personal, client and commercial projects, no attribution required, no account and no paid tier.'],
  ['How do I add Piixpal to my website?', 'Add one script tag, <script src="https://cdn.jsdelivr.net/npm/piixpal@0.4/piixpal.min.js"></script>, then use any tag, for example <h1>Hello <piix-pal pal="bitbug"></piix-pal></h1>. To load only what you use, include a single file from /dist/c/NAME.min.js instead. With a bundler: npm install piixpal.'],
  ['Does Piixpal work with React and Next.js?', 'Yes. Import the wrappers (import { PiixPal } from "piixpal/react") or add components with the shadcn CLI. They are client components, so in the Next.js App Router use them from a client component. Vue has a plugin (app.use(Piixpal) from "piixpal/vue"), and Svelte and Astro can use the plain tags.'],
  ['Can I install Piixpal components with shadcn?', 'Yes. Every component is in a shadcn registry: npx shadcn@latest add https://piixpal.dvkk.dev/r/NAME.json, then import it from @/components/piixpal/NAME. The full index is at https://piixpal.dvkk.dev/r/registry.json.'],
  ['Where can I find free animated hero section templates?', `Piixpal Templates has ${TEMPLATES.length} free landing-page heroes that actually move: live WebGL shaders, GSAP scroll-driven scenes, fire, particles and ASCII worlds. Each one is a single HTML file with no build step: copy it, change the words and ship. Browse them at https://piixpal.dvkk.dev/templates/.`],
  ['How do I add an animated shader background to a landing page?', 'Pick a background on https://piixpal.dvkk.dev/ui/ (aurora, silk, clouds, caustics, mesh gradients and more), add the script tag and place the element behind your content, for example <piix-fx kind="silk"></piix-fx>. Colours come from ten palettes or your own list of hex colours.'],
  ['What are pixel pals?', 'Pals are small animated pixel characters that live on the real elements of your page: a beetle that crawls along the outline of your heading, a bird that perches on your buttons, a cat that naps on a paragraph, a jelly that bounces on your footer. They never block clicks, they are hidden from screen readers, and they stop moving for people who prefer reduced motion.'],
  ['Will animated components slow my site down?', 'The animated components pause when they are off-screen, so a page full of them only pays for what is visible. Load only the files you use from /dist/c/, and keep the heavier WebGL backgrounds for pages where motion is the point. Everything honours prefers-reduced-motion.'],
  ['Are Piixpal components accessible?', 'Decorative pieces (pals, sprites, backgrounds) are aria-hidden and never take focus or block clicks. Interactive components such as buttons, toggles, tabs, sliders and dialogs use native elements with keyboard support, and every component documents its accessibility notes on its page.'],
  ['Can an AI coding agent use Piixpal?', 'Yes. https://piixpal.dvkk.dev/llms.txt lists every component with its tag and install command, and the piixpal-pixelate agent skill (in the GitHub repo under skills/) turns any existing site into a tasteful pixel-art version of itself in Claude Code, Cursor or Codex.'],
  ['Can I make my own pixel character?', 'Yes. The Pal Maker at https://piixpal.dvkk.dev/components/make turns a doodle, a photo, a logo or an emoji into a pal you can share as a link or one tag.'],
];

/* ---------- per-page facts ---------- */
const crumbs = (...c) => [['Piixpal', '/'], ...c];
const COMP = {
  'index': ['Animated Pixel Characters & Sprites for Websites', 'Every Piixpal character: pals that live on your page, inline pixel sprites, pixel type and superpowers. Free web components for HTML, React, Vue and shadcn.', 'Characters'],
  'pals': ['Pals: Animated Pixel Characters for Your Website', null, 'Pals'],
  'sprites': ['50 Free Animated Pixel Art Sprites', null, 'Sprites'],
  'install': ['Install Piixpal: Script Tag, npm, React, Vue, shadcn', null, 'Install'],
  'builder': ['Pal Builder: Add Pixel Characters in One Line', null, 'Builder'],
  'make': ['Pal Maker: Turn Any Image into a Pixel Character', null, 'Pal Maker'],
  '3d': ['3D Pixel Characters: Voxel Toys, Holo Cards, Snow Globe', null, '3D'],
  'agents': ['Pixel Pets for Claude Code & Codex in Your Terminal', null, 'Agent pets'],
  'crowd': ['Crowd: Hundreds of Tiny Pixel Agents on One Canvas', null, 'Crowd'],
  'powers': ['Superpowers: Pixel Pals That Do Real UI Jobs', null, 'Superpowers'],
  'readme': ['Animated Pixel Art Banner for Your GitHub README', null, 'README pals'],
  'type': ['Pixel Type: 3D Extruded Pixel Lettering', null, 'Pixel type'],
  'visit': ['Pixel Pet Browser Extension & Bookmarklet', null, 'Extension'],
  'nomad': ["Nomad's Other Window", 'Nomad, the pixel pal who walks off your page and into another window.', 'Nomad'],
};
const UISTART = {
  'index': ['Free Animated UI Components: Shaders, Heroes, Buttons', `${UIPUB.length} free animated UI components: shader backgrounds, hero sections, image effects, ASCII, buttons, cards, text effects and forms. HTML, React, shadcn.`],
  'showcase': ['Showcase: Websites Built with Pixel UI', null],
  'installation': ['Install Pixel UI: Script Tag, Single Files or npm', null],
  'looks': ['Looks: One-Line Visual Styles for Pixel UI', null],
  'palettes': ['Colour Palettes for Pixel UI Components', null],
};

function pageFor(f) {
  const url = f === 'index.html' ? '/' : '/' + f.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
  const base = { url, type: 'WebPage', image: '/site/og/default.jpg', crumbs: crumbs() };
  if (f === 'index.html') return { ...base, title: `Piixpal: Free Animated UI Components, Hero Templates & Pixel Art`, raw: true,
    desc: `${ROUND}+ free UI components: animated pixel characters, WebGL shader backgrounds, ${TEMPLATES.length} hero templates, ASCII and text effects. HTML, React, Vue, shadcn.`, home: true };
  if (f === 'faq.html') return { ...base, title: 'Piixpal FAQ: Free Animated UI Components, Answered', desc: 'How to install Piixpal, use it with React, Next.js and shadcn, find free animated hero templates and shader backgrounds, and keep it fast and accessible.', faq: true, crumbs: crumbs(['FAQ', url]) };
  let m;
  if ((m = f.match(/^components\/([\w-]+)\.html$/)) && COMP[m[1]]) {
    const [t, d, c] = COMP[m[1]];
    return { ...base, title: `${t} · Piixpal`, desc: d, image: `/site/og/c-${m[1]}.jpg`, crumbs: m[1] === 'index' ? crumbs(['Characters', url]) : crumbs(['Characters', '/components/'], [c, url]),
      list: m[1] === 'index' || m[1] === 'pals' ? REG.slice(0, 120).map(i => [i.title, `/r/${i.name}.json`, i.description]) : null };
  }
  if ((m = f.match(/^ui\/([\w-]+)\.html$/))) {
    if (UISTART[m[1]]) {
      const [t, d] = UISTART[m[1]];
      return { ...base, title: `${t} · Piixpal`, desc: d, image: `/site/og/u-${m[1]}.jpg`, crumbs: m[1] === 'index' ? crumbs(['UI components', url]) : crumbs(['UI components', '/ui/'], [cap(m[1]), url]),
        list: m[1] === 'index' ? UIPUB.map(u => [u.name, `/ui/${u.slug}`, u.brief]) : null };
    }
    const u = UI.find(x => x.slug === m[1]); if (!u) return null;
    const noun = NOUN[u.section] || 'UI component';
    let title = `${u.name}: Free ${noun.replace(/\b\w/g, c => c.toUpperCase()).replace(/\bUi\b/, 'UI').replace(/\bAscii\b/, 'ASCII').replace(/\bWebgl\b/, 'WebGL')}`;
    if ((title + ' (HTML, React) · Piixpal').length <= 66) title += ' (HTML, React)';
    return { ...base, title: `${title} · Piixpal`, desc: fit(160, `${u.brief} A free, open-source ${noun} for HTML, React, Vue and Next.js, with a live demo and copy-paste code.`, `${u.brief} A free ${noun} for HTML, React and Vue, with copy-paste code.`, `${u.brief} Free, open source, copy-paste.`, u.brief),
      image: `/site/og/u-${u.slug}.jpg`, code: { name: u.name, noun, section: u.section }, crumbs: crumbs(['UI components', '/ui/'], [u.section, `/ui/#${u.section.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`], [u.name, url]) };
  }
  if ((m = f.match(/^ui\/showcase\/([\w-]+)\.html$/))) return { ...base, keepTitle: true, desc: null, image: has(`ui/showcase/${m[1]}.jpg`) ? `/ui/showcase/${m[1]}.jpg` : base.image, crumbs: crumbs(['UI components', '/ui/'], ['Showcase', '/ui/showcase'], [cap(m[1]), url]) };
  if (f === 'templates/index.html') return { ...base, title: `${TEMPLATES.length} Free Animated Hero Section Templates (WebGL, GSAP) · Piixpal`,
    desc: `${TEMPLATES.length} free landing-page hero templates that actually move: live WebGL shaders, GSAP scroll scenes, fire, particles and ASCII worlds. One HTML file each, no build step.`,
    image: '/site/og/templates.jpg', crumbs: crumbs(['Templates', url]), list: TEMPLATES.map(t => [t.name, `/templates/${t.slug}/`, null, `/templates/${t.slug}/thumb.jpg`]) };
  if ((m = f.match(/^templates\/([\w-]+)\/index\.html$/))) {
    const t = TEMPLATES.find(x => x.slug === m[1]); if (!t) return null;
    const tech = techOf(t), techTxt = tech.length ? tech.slice(0, 3).join(', ') : 'animated';
    const kind = tech.includes('WebGL') ? 'WebGL' : tech.includes('GSAP scroll') ? 'GSAP' : tech.includes('ASCII') ? 'ASCII' : tech.includes('pixel art') ? 'Pixel Art' : 'Animated';
    return { ...base, title: `${t.name}: Free ${kind === 'Animated' ? '' : kind + ' '}Animated Hero Template · Piixpal`, template: true,
      desc: fit(160, `${t.name} is a free landing-page hero template (${techTxt}). One HTML file, no build step: copy it, change the words and ship.`, `${t.name}: a free ${techTxt} hero template. One HTML file, no build step: copy, edit, ship.`),
      image: has(`templates/${t.slug}/thumb.jpg`) ? `/templates/${t.slug}/thumb.jpg` : '/site/og/templates.jpg', imgW: 768, imgH: 480,
      code: { name: t.name, noun: 'hero section template', section: 'Templates', keywords: t.tags }, crumbs: crumbs(['Templates', '/templates/'], [t.name, url]) };
  }
  if ((m = f.match(/^templates\/([\w-]+)\/bg\.html$/))) return { noindex: true, canonical: `/templates/${m[1]}/` };
  if (f === 'stage/index.html') return { ...base, title: 'Piixpal Stage: Animate Pixel Characters into Little Plays', desc: null, image: '/site/og/stage.jpg', crumbs: crumbs(['Stage', url]) };
  if (/^(lab|video|extension|film|desktop|pet)\//.test(f) || f === '404.html') return { noindex: true };
  return null;
}

/* ---------- head block ---------- */
const abs = p => p.startsWith('http') ? p : SITE + p;
const WEBSITE = { '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: 'Piixpal', alternateName: ['Piixpal UI', 'Piixpal pixel UI'], description: 'Free animated UI components, hero templates and pixel art characters for websites.', publisher: { '@id': SITE + '/#org' }, inLanguage: 'en' };
const ORG = { '@type': 'Organization', '@id': SITE + '/#org', name: 'Piixpal', url: SITE + '/', logo: { '@type': 'ImageObject', url: SITE + '/site/og/logo.png', width: 512, height: 512 }, sameAs: [REPO, NPM] };
const LIB = { '@type': 'SoftwareSourceCode', '@id': SITE + '/#library', name: 'Piixpal', url: SITE + '/', codeRepository: REPO, license: 'https://opensource.org/licenses/MIT', programmingLanguage: ['JavaScript', 'HTML', 'CSS', 'GLSL'], runtimePlatform: 'Web browser', author: { '@id': SITE + '/#org' }, isAccessibleForFree: true,
  description: `${ROUND}+ free animated UI components and templates: pixel characters, WebGL shader backgrounds, hero sections, ASCII animations, buttons, cards and text effects, as web components for HTML, React, Vue and shadcn.`,
  keywords: 'ui components, animated ui components, free ui components, react components, shadcn components, hero section, landing page templates, webgl backgrounds, shader backgrounds, ascii animation, pixel art, web components' };

function block(f, p, title, desc) {
  if (p.noindex) return [
    '<meta name="robots" content="noindex, follow">',
    p.canonical ? `<link rel="canonical" href="${SITE}${p.canonical}">` : '',
  ].filter(Boolean).join('\n');
  const url = SITE + p.url, img = abs(p.image), og = p.imgW ? [p.imgW, p.imgH] : [1200, 630];
  const graph = [];
  if (p.home) graph.push(WEBSITE, ORG, LIB);
  graph.push({ '@type': p.faq ? 'FAQPage' : p.list ? 'CollectionPage' : 'WebPage', '@id': url + '#page', url, name: title, description: desc, isPartOf: { '@id': SITE + '/#website' }, primaryImageOfPage: { '@type': 'ImageObject', url: img }, dateModified: lastmod[f] || today, inLanguage: 'en',
    ...(p.faq ? { mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) } : {}),
    ...(p.list ? { mainEntity: { '@type': 'ItemList', numberOfItems: p.list.length, itemListElement: p.list.map(([n, u, d, im], i) => ({ '@type': 'ListItem', position: i + 1, name: n, url: abs(u), ...(im ? { image: abs(im) } : {}) })) } } : {}) });
  if (p.code) graph.push({ '@type': 'SoftwareSourceCode', '@id': url + '#code', name: `${p.code.name} (${p.code.noun})`, description: desc, url, image: img, codeRepository: REPO, license: 'https://opensource.org/licenses/MIT', programmingLanguage: ['JavaScript', 'HTML', 'CSS'], runtimePlatform: 'Web browser', isAccessibleForFree: true, isPartOf: { '@id': SITE + '/#library' }, author: { '@type': 'Organization', name: 'Piixpal', url: SITE + '/' }, genre: p.code.section,
    keywords: [p.code.noun, p.code.section.toLowerCase(), 'free', 'open source', 'web component', 'react', ...(p.code.keywords || [])].join(', ') });
  if (p.crumbs.length > 1) graph.push({ '@type': 'BreadcrumbList', itemListElement: p.crumbs.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: abs(u) })) });
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return [
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${url}">`,
    '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">',
    `<meta property="og:type" content="${p.code ? 'article' : 'website'}">`,
    '<meta property="og:site_name" content="Piixpal">',
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${img}">`,
    `<meta property="og:image:width" content="${og[0]}">`,
    `<meta property="og:image:height" content="${og[1]}">`,
    `<meta property="og:image:alt" content="${esc(title)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${img}">`,
    `<link rel="alternate" type="text/plain" title="Piixpal for AI agents" href="${SITE}/llms.txt">`,
    `<script type="application/ld+json">${ld}</script>`,
  ].join('\n');
}

/* ---------- the FAQ page ---------- */
function faqPage() {
  const home = read('index.html').replace(/\n?<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, '');
  const nav = (home.match(/<header class="nav"[\s\S]*?<\/header>/) || [''])[0].replace('href="#top"', 'href="./"').replace(/ aria-current="page"/g, '');
  const headTop = home.slice(0, home.search(/<title[ >]/));
  const tail = home.slice(home.indexOf('<!-- Vercel Web Analytics'), home.indexOf('</head>'));
  return `${headTop}<title>FAQ · Piixpal</title>
<meta name="description" content="">
<link rel="icon" href="site/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=JetBrains+Mono:wght@400;600&family=Silkscreen&display=swap" rel="stylesheet">
<link rel="stylesheet" href="site/site.css">
<style>
  .faq{max-width:780px;margin:0 auto;padding:150px 24px 120px}
  .faq .kick{font:400 12px/1 Silkscreen,monospace;letter-spacing:.1em;text-transform:uppercase;opacity:.65}
  .faq h1{font:800 clamp(40px,7vw,72px)/1 'Bricolage Grotesque',sans-serif;letter-spacing:-.03em;margin:14px 0 18px}
  .faq .lede{font-size:19px;line-height:1.55;opacity:.8;margin:0 0 56px}
  .faq article{padding:28px 0;border-top:2px dashed color-mix(in srgb,currentColor 18%,transparent)}
  .faq h2{font:700 24px/1.2 'Bricolage Grotesque',sans-serif;letter-spacing:-.01em;margin:0 0 10px}
  .faq p{font-size:17px;line-height:1.65;margin:0;opacity:.85}
  .faq code{font:500 .86em 'JetBrains Mono',monospace;background:color-mix(in srgb,currentColor 8%,transparent);padding:.1em .35em;border-radius:3px;word-break:break-word}
  .faq .go{display:flex;flex-wrap:wrap;gap:12px;margin-top:56px}
</style>
${tail}</head>
<body data-page="faq">
<!-- generated by scripts/seo.mjs, edit the FAQ list there -->
${nav}
<main class="faq">
  <span class="kick">Questions, answered</span>
  <h1>Piixpal FAQ</h1>
  <p class="lede">Piixpal is ${ROUND}+ free, open-source animated UI components and templates: pixel characters, shader backgrounds, hero sections, ASCII art, buttons and text effects. Here is what people ask most.</p>
${FAQ.map(([q, a]) => `  <article><h2>${esc(q)}</h2><p>${esc(a).replace(/(https:\/\/piixpal\.dvkk\.dev(\/[^\s,)]*[^\s,.)])?)/g, (u) => `<a href="${u.replace(SITE, '') || '/'}">${u.replace('https://', '')}</a>`).replace(/(&lt;[\s\S]*?&gt;(?:[^&]*?&lt;\/[\w-]+&gt;)?)/g, '<code>$1</code>')}</p></article>`).join('\n')}
  <div class="go"><a class="btn btn-lime" href="ui/">Browse UI components</a><a class="btn" href="templates/">Hero templates</a><a class="btn" href="components/">Pixel characters</a><a class="btn" href="components/install.html">Install</a></div>
</main>
<script src="site/site.js" defer></script>
</body>
</html>
`;
}

/* ---------- run over every committed page ---------- */
writeFileSync(join(root, 'faq.html'), faqPage());
tracked.add('faq.html');
const pages = [...tracked].filter(f => f.endsWith('.html') && existsSync(join(root, f)));
const indexed = [];
let n = 0;
for (const f of pages) {
  const p = pageFor(f); if (!p) continue;
  let h = read(f);
  if (!/<head[^>]*>/.test(h)) continue;
  h = h.replace(/\n?<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, '');
  const tm = h.match(/<title(?: data-orig="([^"]*)")?>([^<]*)<\/title>/);
  const orig = tm ? unesc(tm[1] ?? tm[2]) : '';
  if (p.noindex) {
    if (tm && tm[1] != null) h = h.replace(tm[0], `<title>${esc(orig)}</title>`);
  } else {
    const title = p.keepTitle || !p.title ? orig : p.title;
    const dm = h.match(/<meta name="description" content="([^"]*)">\n?/);
    const desc = p.desc || (dm && unesc(dm[1])) || p.title || orig;
    if (dm) h = h.replace(dm[0], '');
    h = h.replace(/<meta (?:property="og:|name="twitter:)[^>]*>\n?/g, '');
    if (tm) h = h.replace(tm[0], title === orig ? `<title>${esc(orig)}</title>` : `<title data-orig="${esc(orig)}">${esc(title)}</title>`);
    p._title = title; p._desc = desc;
  }
  const b = `<!-- seo:start -->\n${block(f, p, p._title, p._desc)}\n<!-- seo:end -->`;
  /* right after the title (or the viewport meta when a page has no title) */
  h = h.replace(/(<title[^>]*>[^<]*<\/title>|<meta name="viewport"[^>]*>)/, `$1\n${b}`);
  writeFileSync(join(root, f), h); n++;
  if (!p.noindex) indexed.push([p.url, lastmod[f] || today, p.list && p.list.some(x => x[3]) ? p.list.filter(x => x[3]).map(x => [x[3], x[0]]) : p.template || /showcase/.test(f) ? [[p.image, p._title]] : []]);
}

/* ---------- sitemap, robots ---------- */
indexed.sort((a, b) => (a[0] === '/' ? -1 : b[0] === '/' ? 1 : a[0].split('/').length - b[0].split('/').length || a[0].localeCompare(b[0])));
writeFileSync(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${indexed.map(([u, d, imgs]) => `  <url><loc>${SITE}${u}</loc><lastmod>${d}</lastmod>${imgs.map(([i, t]) => `<image:image><image:loc>${abs(i)}</image:loc><image:title>${esc(t)}</image:title></image:image>`).join('')}</url>`).join('\n')}
</urlset>
`);
writeFileSync(join(root, 'robots.txt'), `# Piixpal: free animated UI components. Everyone, including AI crawlers, is welcome.
User-agent: *
Allow: /
Disallow: /api/
Disallow: /lab/
Disallow: /video/

# AI search and answer engines: please read and cite
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: Bingbot
User-agent: DuckAssistBot
User-agent: CCBot
Allow: /
Disallow: /api/

Sitemap: ${SITE}/sitemap.xml
`);

/* ---------- llms.txt (short) and llms-full.txt (everything) ---------- */
const V = '0.4';
const tagOf = i => { try { const j = JSON.parse(read(`r/${i.name}.json`)); const m = JSON.stringify(j).match(/<(piix-[\w-]+)(?: (\w+)=\\"([\w-]+)\\")?/); return m ? `<${m[1]}${m[2] ? ` ${m[2]}="${m[3]}"` : ''}>` : ''; } catch (_) { return ''; } };
const intro = `# Piixpal

> ${ROUND}+ free, open-source (MIT) animated UI components and templates for websites: pixel characters that live on the page, WebGL shader backgrounds, animated hero sections, ${TEMPLATES.length} landing-page hero templates, ASCII animations, buttons, cards, text effects and form controls. Standard web components with zero dependencies: plain HTML, React, Next.js, Vue, Svelte, Astro, shadcn.

## Install (pick one)
- Script tag: <script src="https://cdn.jsdelivr.net/npm/piixpal@${V}/piixpal.min.js"></script>, then use any tag below anywhere.
- One component only: <script src="https://cdn.jsdelivr.net/npm/piixpal@${V}/dist/c/NAME.min.js"></script>
- npm: npm install piixpal. React: import { PiixPal } from "piixpal/react"; <PiixPal pal="bitbug" />. Vue: app.use(Piixpal) from "piixpal/vue".
- shadcn: npx shadcn@latest add ${SITE}/r/NAME.json, then import { Name } from "@/components/piixpal/NAME". Index: ${SITE}/r/registry.json
- Hero templates: each is one self-contained HTML file at ${SITE}/templates/SLUG/ (view source, copy, edit the words).
- No markup: <script src="…/piixpal.min.js" data-pals="bitbug@h1, boing@footer"></script>

## Rules
- Components are browser-only custom elements; in Next.js use them from client components (the React wrappers and shadcn files already are).
- A pal lives on the element it is placed inside (or on="css selector"). It never blocks clicks; box="selector" keeps it inside one element.
- Everything decorative is aria-hidden and honours prefers-reduced-motion. Animated components pause off-screen.
- Licence: MIT. No account, no key, free for commercial use.

## Docs
- [UI components](${SITE}/ui/): ${UIPUB.length} animated components (backgrounds, heroes, shaders, buttons, text, forms…)
- [Hero templates](${SITE}/templates/): ${TEMPLATES.length} full landing-page heroes
- [Pixel characters](${SITE}/components/): pals, sprites, superpowers, 3D
- [Install](${SITE}/components/install): every way to add Piixpal
- [FAQ](${SITE}/faq)
- [Full list for agents](${SITE}/llms-full.txt)
- [Source](${REPO})
`;
const uiLines = SECTIONS.map(s => { const l = UIPUB.filter(u => u.section === s); return l.length ? `\n### ${s}\n` + l.map(u => `- [${u.name}](${SITE}/ui/${u.slug}): ${u.brief} Tag: <${u.tag}>. File: dist/c/${u.file || u.slug}.min.js`).join('\n') : ''; }).join('\n');
const charLines = REG.map(i => `- [${i.title}](${SITE}/r/${i.name}.json): ${i.description} ${tagOf(i) ? `Tag: ${tagOf(i)}.` : ''} shadcn: npx shadcn@latest add ${SITE}/r/${i.name}.json`).join('\n');
const tplLines = TEMPLATES.map(t => `- [${t.name}](${SITE}/templates/${t.slug}/): ${techOf(t).join(', ') || 'animated'} hero. Background only: ${SITE}/templates/${t.slug}/bg.js`).join('\n');
writeFileSync(join(root, 'llms.txt'), intro + `
## UI components (${UIPUB.length})
${UIPUB.map(u => `- [${u.name}](${SITE}/ui/${u.slug}): ${u.brief}`).join('\n')}

## Hero templates (${TEMPLATES.length})
${TEMPLATES.map(t => `- [${t.name}](${SITE}/templates/${t.slug}/)`).join('\n')}

## Characters (${REG.length})
${REG.map(i => `- ${i.title}: ${i.description}`).join('\n')}
`);
writeFileSync(join(root, 'llms-full.txt'), intro + `
## UI components (${UIPUB.length}), by section
${uiLines}

## Hero templates (${TEMPLATES.length})
${tplLines}

## Characters and superpowers (${REG.length})
${charLines}

## FAQ
${FAQ.map(([q, a]) => `### ${q}\n${a}`).join('\n\n')}
`);
console.log(`seo: ${n} pages, ${indexed.length} in sitemap, ${TOTAL} components+templates (${ROUND}+)`);
