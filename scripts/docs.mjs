// Generates the component docs pages (components/*.html) from one layout.
// Sprite names and taglines are read straight from src/sprites/*.js.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'components');
mkdirSync(out, { recursive: true });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- data ---------- */
const ACCENTS = ['var(--lime)', 'var(--coral)', 'var(--violet)', 'var(--sky)', 'var(--sun)', 'var(--mint)'];
const sprites = readdirSync(join(root, 'src/sprites')).filter(f => f.endsWith('.js')).sort().map((f, i) => {
  const src = readFileSync(join(root, 'src/sprites', f), 'utf8');
  const name = src.match(/defineFigure\('([\w-]+)'/)[1];
  const tag = (src.match(/tag: '([^']+)'/) || [, ''])[1].replace(/\\'/g, "'");
  return { name, tag, accent: ACCENTS[i % ACCENTS.length] };
});
const title = s => s[0].toUpperCase() + s.slice(1);

export const PALS = [
  { id: 'bitbug', does: 'crawl', accent: 'var(--lime)', lives: 'the real glyph outline of the first line of text', scared: 'cursors that get too close', poke: 'flips onto its back, legs flailing',
    desc: 'A lime beetle with one very curious antenna. Walks the actual outline of your letters, hops across spaces, stops to sniff, and bolts when your cursor gets close.',
    attrs: [['speed', 'walking speed multiplier'], ['edge', '"text" (glyph outline) or "box" (top edge)'], ['at', 'starting spot, 0–1']],
    hab: `<div class="h-text" id="d-bitbug">Hello, world.</div><piix-pal pal="bitbug" on="#d-bitbug" scale="3"></piix-pal>`, code: '<h1>\n  Hello, world.\n  <piix-pal pal="bitbug"></piix-pal>\n</h1>' },
  { id: 'boing', does: 'bounce', accent: 'var(--coral)', lives: 'the top edge of an element (footers love it)', scared: 'nothing, which is the problem', poke: 'does a big spinning jump. Drag and throw it, too',
    desc: 'A coral jelly drop with more energy than sense. Hops along, leaps at your cursor, squashes on landing and gets dizzy if you throw it too hard. Hard landings make a thud other pals react to.',
    attrs: [['energy', 'jump height multiplier'], ['at', 'starting spot, 0–1']],
    hab: `<div class="h-floor" id="d-boing"><i></i><i></i><i></i></div><piix-pal pal="boing" on="#d-boing" scale="4"></piix-pal>`, code: '<footer>\n  …\n  <piix-pal pal="boing"></piix-pal>\n</footer>' },
  { id: 'moss', does: 'mind', accent: 'var(--violet)', lives: 'a line of text, where it reads', scared: 'nothing. It is simply not interested', poke: 'turns its back on you. Three pokes and it moves',
    desc: 'A mushroom with a book and no interest in you. Reads, flips pages, dozes off. Hover nearby for a while and it glances up. Thuds nearby make it grumble.',
    attrs: [['at', 'where it sits, 0–1 (default .85)'], ['edge', '"text" or "box"']],
    hab: `<p class="h-line" id="d-moss">Some light reading for a slow afternoon.</p><piix-pal pal="moss" on="#d-moss" at=".95"></piix-pal>`, code: '<p>\n  Some light reading.\n  <piix-pal pal="moss"></piix-pal>\n</p>' },
  { id: 'lurk', does: 'peek', accent: 'var(--sky)', lives: 'behind a card, peeking over the top edge', scared: 'everything, especially you', poke: '"eep!" It ducks and pops up somewhere else',
    desc: 'Big eyes, little hands, zero courage. Ears first, then eyes, then the whole face. Its eyes follow you, but only from a safe distance.',
    attrs: [['at', 'where along the edge it first appears, 0–1']],
    hab: `<div class="h-card" id="d-lurk"><i></i><i></i><i></i></div><piix-pal pal="lurk" on="#d-lurk" scale="4"></piix-pal>`, code: '<div class="card">\n  …\n  <piix-pal pal="lurk"></piix-pal>\n</div>' },
  { id: 'thread', does: 'hang', accent: 'var(--sun)', lives: 'the bottom edge of a nav or banner', scared: 'hands reaching for it', poke: 'yo-yos on its thread',
    desc: 'A small spider on a long string. Swings when the page scrolls, zips up when you reach for it, and lowers itself back down, legs wiggling.',
    attrs: [['length', 'thread length in px (default 70)'], ['at', 'where along the edge, 0–1'], ['silk', 'thread colour']],
    hab: `<div class="h-nav" id="d-thread"><i></i><i></i><i></i><i></i></div><piix-pal pal="thread" on="#d-thread" at=".5" length="110"></piix-pal>`, code: '<nav>\n  …\n  <piix-pal pal="thread" length="90"></piix-pal>\n</nav>' },
  { id: 'pip', does: 'perch', accent: 'var(--mint)', lives: 'buttons and links. Every match of on="…" is a perch', scared: 'hovering over its perch', poke: 'takes off',
    desc: 'A round bird who loves a good button. Pecks, sings, looks around. Hover its perch and it flies a loop, then lands on the next one once the coast is clear.',
    attrs: [['on', 'selector for perches, e.g. ".btn"']],
    hab: `<div class="h-btns"><button class="h-btn lime d-pip" type="button">Sign up</button><button class="h-btn d-pip" type="button">Log in</button></div><piix-pal pal="pip" on=".d-pip"></piix-pal>`, code: '<a class="btn">Sign up</a>\n<a class="btn">Log in</a>\n<piix-pal pal="pip" on=".btn"></piix-pal>' },
  { id: 'bumble', does: 'follow', accent: 'var(--sun)', lives: 'an element it naps on, then wherever your cursor goes', scared: 'nothing, it is your biggest fan', poke: 'does a loop-the-loop',
    desc: 'A fuzzy little bee. Naps on its element until your cursor comes by, then follows you around the page, hanging back on the side you came from. Stop moving and it flies home for another nap.',
    attrs: [['at', 'where it naps, 0–1']],
    hab: `<div class="h-hive" id="d-bumble">hive</div><piix-pal pal="bumble" on="#d-bumble"></piix-pal>`, code: '<div class="hive">\n  <piix-pal pal="bumble"></piix-pal>\n</div>' },
  { id: 'shel', does: 'creep', accent: 'var(--mint)', lives: 'the top of your text, very slowly', scared: 'cursors and loud thuds', poke: 'hides in its shell, then peeks out',
    desc: 'A very slow snail with a very nice shell. Glides along your text leaving a shimmering slime trail that fades behind it. Too close and it hides until you go away.',
    attrs: [['speed', 'creeping speed multiplier'], ['edge', '"text" or "box"']],
    hab: `<p class="h-text" id="d-shel" style="font-size:34px">Slow and steady.</p><piix-pal pal="shel" on="#d-shel"></piix-pal>`, code: '<h2>\n  Slow and steady.\n  <piix-pal pal="shel"></piix-pal>\n</h2>' }
];

/* ---------- layout ---------- */
const GH = `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>`;
const LOGO = `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><rect width="16" height="16" rx="3" fill="#17121f"/><path fill="#c6f432" d="M4 4h8v1h1v6h-1v1H4v-1H3V5h1z"/><path fill="#17121f" d="M5 6h2v2H5zM9 6h2v2H9zM6 9h4v1H6z"/><path fill="#fff" d="M5 6h1v1H5zM9 6h1v1H9z"/></svg>`;

const sidebar = active => {
  const link = (href, label, key, extra = '') => `<a href="${href}"${key === active ? ' aria-current="page"' : ''}${extra}>${label}</a>`;
  return `<aside class="side" aria-label="Components">
    <h4>Start</h4>
    ${link('./', 'Overview', 'index')}
    ${link('../#install', 'Install', '-')}
    <h4>Components</h4>
    ${link('sprites.html', `Sprites <span class="n">${sprites.length}</span>`, 'sprites')}
    ${link('pals.html', `Pals <span class="n">${PALS.length}</span>`, 'pals')}
    ${link('type.html', 'Pixel type', 'type')}
    <h4>Sprites</h4>
    ${sprites.map(s => `<a href="sprites.html#s-${s.name}" style="--dot:${s.accent}"><i></i>${title(s.name)}</a>`).join('\n    ')}
    <h4>Pals</h4>
    ${PALS.map(p => `<a href="pals.html#${p.id}" style="--dot:${p.accent}"><i></i>${title(p.id)}</a>`).join('\n    ')}
  </aside>`;
};

const page = ({ key, title: t, desc, body, extra = '', fonts = '' }) => `<!doctype html>
<html lang="en">
<head>
<script>(()=>{const d=document.documentElement;d.classList.add('js');let t;try{t=localStorage.getItem('piix-theme')}catch(e){}d.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'white')})()</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t)} · Piixpal components</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#f3eee3">
<link rel="icon" href="../site/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=JetBrains+Mono:wght@400;600&family=Silkscreen&display=swap" rel="stylesheet">
${fonts}<link rel="stylesheet" href="../site/site.css">
<link rel="stylesheet" href="../site/docs.css">
</head>
<body data-page="${key}">
<!-- generated by scripts/docs.mjs, edit that instead -->
<header class="nav" id="nav">
  <div class="wrap nav-in">
    <a class="logo" href="../" aria-label="Piixpal home">${LOGO}<span>p<span class="i">ı</span><span class="i">ı</span>xpal</span></a>
    <nav class="links" aria-label="Site">
      <a href="../">Home</a>
      <a href="./" ${key !== 'home' ? 'aria-current="page"' : ''}>Components</a>
      <a href="../#api">API</a>
    </nav>
    <div class="theme" role="group" aria-label="Theme">
      <button type="button" data-theme-set="white" title="White" aria-label="White theme"><svg viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M3 0h2v1H3zM3 7h2v1H3zM0 3h1v2H0zM7 3h1v2H7zM2 2h4v4H2z"/></svg></button>
      <button type="button" data-theme-set="paper" title="Paper" aria-label="Paper theme"><svg viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 0h4v1h1v1h1v6H1zM2 3h4v1H2zM2 5h4v1H2z" fill-rule="evenodd"/></svg></button>
      <button type="button" data-theme-set="dark" title="Dark" aria-label="Dark theme"><svg viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M3 0h3v1H4v1H3v4h1v1h3v1H2V7H1V6H0V2h1V1h2z"/></svg></button>
    </div>
    <a class="btn btn-sm btn-ink" href="https://github.com/diiviikk5/Piixpal" target="_blank" rel="noopener">${GH} Star on GitHub</a>
  </div>
</header>
<div class="docs">
  ${sidebar(key)}
  <main id="top">
${body}
  </main>
</div>
${extra}
<script src="../piixpal.js"></script>
<script src="../site/site.js" defer></script>
<script src="../site/docs.js" defer></script>
</body>
</html>
`;

const codeBox = code => `<pre class="codebox"><button class="copy" type="button" data-copy="${esc(code)}">Copy</button>${esc(code)}</pre>`;
const table = (cap, rows) => `<div class="table-wrap"><table><caption>${esc(cap)}</caption><thead><tr><th>Attribute</th><th>What it does</th><th>Default</th></tr></thead><tbody>
${rows.map(([a, d, def]) => `<tr><td><code>${a}</code></td><td>${d}</td><td>${def}</td></tr>`).join('\n')}
</tbody></table></div>`;

/* ---------- sprites ---------- */
const spritesBody = `<header class="doc-head">
  <div class="crumbs"><a href="./">Components</a><span>/</span><span>Sprites</span></div>
  <h1>Sprites</h1>
  <p>${sprites.length} small characters that sit inline, like an image. Their eyes follow the cursor, they blink, breathe a pixel, hop when you click them and nap when nobody's around. Pick one, copy the tag, paste it anywhere.</p>
  <div class="pills"><span class="pill">${sprites.length} sprites</span><span class="pill">inline, no positioning</span><span class="pill">eyes follow the cursor</span><span class="pill">one tag</span></div>
</header>

<section class="doc-sec" id="customise" aria-labelledby="customise-h">
  <h2 id="customise-h">Customise</h2>
  <p>Pick a sprite from the grid below or the list, then tune it. The tag updates as you go.</p>
  <div class="custom" id="custom">
    <div class="c-stage" id="c-stage" data-bg="paper">
      <span class="c-name" id="c-name">mochi</span>
      <div class="c-bgs" role="group" aria-label="Background">
        <button type="button" data-bg="paper" aria-pressed="true" style="background:#f3eee3" aria-label="Paper"></button>
        <button type="button" data-bg="ink" aria-pressed="false" style="background:#17121f" aria-label="Ink"></button>
        <button type="button" data-bg="lime" aria-pressed="false" style="background:#c6f432" aria-label="Lime"></button>
        <button type="button" data-bg="violet" aria-pressed="false" style="background:#6b4cff" aria-label="Violet"></button>
      </div>
      <piix-sprite id="c-sprite" name="mochi" size="140"></piix-sprite>
    </div>
    <div class="c-panel">
      <div class="c-controls">
        <label class="ctl wide"><span>Sprite</span><select id="c-pick" class="sel">${sprites.map(s => `<option value="${s.name}">${title(s.name)}</option>`).join('')}</select></label>
        <label class="ctl"><span>Size</span><input type="range" id="c-size" min="40" max="220" step="4" value="140"><output id="c-size-o">140</output></label>
        <label class="ctl"><span>Hue</span><input type="range" id="c-hue" min="0" max="350" step="10" value="0"><output id="c-hue-o">0°</output></label>
        <div class="ctl wide"><span>Eyes</span>
          <div class="seg" id="c-look" role="group" aria-label="Where the eyes look">
            <button type="button" data-look="mouse" aria-pressed="true">Follow cursor</button>
            <button type="button" data-look="wander" aria-pressed="false">Wander</button>
            <button type="button" data-look="none" aria-pressed="false">Ahead</button>
          </div>
        </div>
        <div class="ctl wide"><span>Extras</span>
          <div class="toggles">
            <label><input type="checkbox" id="c-shy"> shy</label>
            <label><input type="checkbox" id="c-tilt"> tilt</label>
            <label><input type="checkbox" id="c-still"> still</label>
            <label><input type="checkbox" id="c-nap"> nap fast</label>
          </div>
        </div>
      </div>
      <pre class="c-code" id="c-code"></pre>
    </div>
  </div>
</section>

<section class="doc-sec" id="all" aria-labelledby="all-h">
  <h2 id="all-h">All sprites</h2>
  <p>Click a sprite to see it hop. Copy grabs the tag; Customise loads it into the panel above.</p>
  <div class="sgrid">
${sprites.map(s => `    <article class="scard" id="s-${s.name}" style="--accent:${s.accent}">
      <div class="s-stage"><piix-sprite name="${s.name}" scale="6"></piix-sprite></div>
      <div class="s-body">
        <h3>${title(s.name)} <small>${s.name}</small></h3>
        <p>${esc(s.tag)}</p>
        <div class="s-actions"><button type="button" class="dark" data-copy="${esc(`<piix-sprite name="${s.name}"></piix-sprite>`)}">Copy</button><button type="button" data-pick="${s.name}">Customise</button></div>
      </div>
    </article>`).join('\n')}
  </div>
</section>

<section class="doc-sec" id="attributes" aria-labelledby="attr-h">
  <h2 id="attr-h">Attributes</h2>
  <p>All optional. Size snaps to whole sprite pixels, so they always stay crisp.</p>
  ${table('<piix-sprite>', [
    ['name', `which sprite: ${sprites.map(s => `<code>${s.name}</code>`).join(' ')}`, 'mochi'],
    ['size', 'width in CSS px (rounded to whole sprite pixels)', '5 × width'],
    ['scale', 'or set the size of one sprite pixel directly', '5'],
    ['hue', 'recolour by rotating the hue, in degrees', '0'],
    ['look', '<code>mouse</code> follows the cursor, <code>wander</code> looks around, <code>none</code> looks ahead', 'mouse'],
    ['shy', 'leans away when the cursor gets close', 'off'],
    ['tilt', 'leans toward the cursor', 'off'],
    ['still', 'no breathing or hopping', 'off'],
    ['sleep-after', 'seconds without input before it naps; 0 = never', '25'],
    ['aria-label', 'give it one if it means something; otherwise it is hidden from screen readers', '–']
  ])}
</section>

<section class="doc-sec" id="own" aria-labelledby="own-h">
  <h2 id="own-h">Draw your own</h2>
  <p>A sprite is a few strings of pixels plus where its eyes are. Eyes are drawn live on top, so blinking and looking around come free.</p>
  ${codeBox(`Piixpal.figure('blob', {
  w: 8, h: 6,
  palette: { k: '#17121f', b: '#c6f432', w: '#ffffff' },
  frames: [[
    '.kkkkkk.',
    'kbbbbbbk',
    'kbwbbwbk',
    'kbwbbwbk',
    'kbbbbbbk',
    '.kkkkkk.'
  ]],
  eyes: [{ x: 2, y: 2, w: 1, h: 2 }, { x: 5, y: 2, w: 1, h: 2 }],
  lid: 'b'
});

// <piix-sprite name="blob"></piix-sprite>`)}
</section>`;

/* ---------- pals ---------- */
const palsBody = `<header class="doc-head">
  <div class="crumbs"><a href="./">Components</a><span>/</span><span>Pals</span></div>
  <h1>Pals</h1>
  <p>Pals live <em>on</em> your page. Each one has a job: something it lives on, something that scares it, something that happens when you poke it. Put one inside an element and it figures out the rest. They notice each other, too.</p>
  <div class="pills"><span class="pill">${PALS.length} pals</span><span class="pill">reads text outlines</span><span class="pill">never blocks clicks</span><span class="pill">reduced-motion aware</span></div>
</header>
${PALS.map(p => `
<section class="doc-sec" id="${p.id}" aria-labelledby="${p.id}-h" style="--accent:${p.accent}">
  <h2 id="${p.id}-h">${title(p.id)} <span class="pal-no">do="${p.does}"</span></h2>
  <p>${p.desc}</p>
  <div class="pal-doc">
    <div class="habitat">${p.hab}</div>
    <div class="info">
      <dl class="kv">
        <dt>lives on</dt><dd>${p.lives}</dd>
        <dt>scared of</dt><dd>${p.scared}</dd>
        <dt>poke it</dt><dd>${p.poke}</dd>
        ${p.attrs.map(([a, d]) => `<dt>${a}</dt><dd>${d}</dd>`).join('\n        ')}
      </dl>
      ${codeBox(p.code)}
    </div>
  </div>
</section>`).join('\n')}`;

/* ---------- type ---------- */
const typeBody = `<header class="doc-head">
  <div class="crumbs"><a href="./">Components</a><span>/</span><span>Pixel type</span></div>
  <h1>Pixel type</h1>
  <p><code>&lt;piix-type&gt;</code> turns any font into chunky blocks with an extruded shadow. Pixels rain in on load, lift around the cursor and ripple when clicked. Pals can walk on it: it exposes the real letter outline.</p>
</header>
<section class="doc-sec" id="customise" aria-labelledby="t-h">
  <h2 id="t-h">Customise</h2>
  <p>Click the letters for a ripple. The bug walks the actual tops of the blocks.</p>
  <div class="custom">
    <div class="c-stage" id="t-stage" data-bg="paper" style="padding:40px 28px">
      <span class="c-name">piix-type</span>
      <div style="width:100%"><piix-type id="t-demo" text="hello" rows="18" cell="12" shade="#c6f432" fit></piix-type></div>
      <piix-pal pal="bitbug" on="#t-demo"></piix-pal>
    </div>
    <div class="c-panel">
      <div class="c-controls">
        <label class="ctl wide"><span>Text</span><input type="text" id="t-text" value="hello" maxlength="14" spellcheck="false"></label>
        <label class="ctl"><span>Block</span><input type="range" id="t-cell" min="4" max="18" value="12"><output id="t-cell-o">12</output></label>
        <label class="ctl"><span>Depth</span><input type="range" id="t-depth" min="0" max="3" step=".5" value="1"><output id="t-depth-o">1</output></label>
        <label class="ctl"><span>Gap</span><input type="range" id="t-gap" min="0" max=".4" step=".02" value=".1"><output id="t-gap-o">.1</output></label>
        <div class="ctl wide"><span>Shape</span>
          <div class="seg" id="t-shape" role="group" aria-label="Block shape">
            <button type="button" data-v="square" aria-pressed="true">Square</button>
            <button type="button" data-v="dot" aria-pressed="false">Dot</button>
            <button type="button" data-v="round" aria-pressed="false">Round</button>
            <button type="button" data-v="plus" aria-pressed="false">Plus</button>
            <button type="button" data-v="diamond" aria-pressed="false">Diamond</button>
          </div>
        </div>
        <label class="ctl wide"><span>Font</span><select id="t-font" class="sel">
          <option value="">Bricolage Grotesque (page font)</option>
          <option value="'Geist Mono', monospace">Geist Mono</option>
          <option value="'Silkscreen', monospace">Silkscreen</option>
          <option value="'Instrument Serif', serif">Instrument Serif</option>
          <option value="'Pacifico', cursive">Pacifico</option>
        </select></label>
        <div class="ctl wide"><span>Shadow</span>
          <div class="seg" id="t-shade" role="group" aria-label="Shadow colour">
            <button type="button" data-v="#c6f432" aria-pressed="true">Lime</button>
            <button type="button" data-v="#ff6b4a" aria-pressed="false">Coral</button>
            <button type="button" data-v="#6b4cff" aria-pressed="false">Violet</button>
            <button type="button" data-v="" aria-pressed="false">None</button>
          </div>
        </div>
        <div class="ctl wide"><span>Replay</span><div><button class="btn btn-sm" type="button" id="t-replay">Rain it in again</button></div></div>
      </div>
      <pre class="c-code" id="t-code"></pre>
    </div>
  </div>
</section>
<section class="doc-sec" id="attributes" aria-labelledby="ta-h">
  <h2 id="ta-h">Attributes</h2>
  ${table('<piix-type>', [
    ['text', 'the text; <code>|</code> for a line break', 'element text'],
    ['rows', 'rasterising resolution: letter height in blocks', '18'],
    ['cell', 'size of one block in CSS px', '8'],
    ['fit', 'shrink blocks to fit the container width', 'off'],
    ['color / shade', 'block colour / shadow colour', 'currentColor / none'],
    ['depth', 'shadow depth, in blocks', '1'],
    ['gap', 'gap between blocks, as a fraction of a block', '0.1'],
    ['shape', '<code>square</code> <code>dot</code> <code>round</code> <code>plus</code> <code>diamond</code>: how each block is drawn', 'square'],
    ['font / weight', 'font family and weight to rasterise; any loaded font works', 'inherited / 800'],
    ['align', '<code>left</code> <code>center</code> <code>right</code> for multi-line text', 'left'],
    ['intro', '<code>none</code> skips the rain-in', 'on']
  ])}
  <p style="margin-top:18px">Methods: <code>replay()</code> rains it in again. Pals use <code>piixSurface(x)</code> to find the letter tops and <code>piixImpact(x, y)</code> to send a ripple when they land.</p>
</section>`;

/* ---------- overview ---------- */
const pick = n => sprites.slice(0, n).map(s => `<piix-sprite name="${s.name}" scale="4"></piix-sprite>`).join('');
const indexBody = `<header class="doc-head">
  <div class="crumbs"><span>Components</span></div>
  <h1>Components</h1>
  <p>Everything in Piixpal is a plain web component. One script tag, then copy any tag from these pages into your HTML, React, Vue, Svelte, Astro, Webflow or Framer project.</p>
</header>
<section class="doc-sec" aria-label="Component families">
  <div class="ov">
    <a href="sprites.html" style="--accent:var(--lime)"><div class="ov-art">${sprites.slice(0, 3).map(s => `<piix-sprite name="${s.name}" scale="4" look="mouse"></piix-sprite>`).join('')}</div><h3>Sprites <span>${sprites.length}</span></h3><p>Small inline characters. Eyes follow the cursor, they blink, breathe, hop and nap. Paste anywhere, like an image.</p></a>
    <a href="pals.html" style="--accent:var(--coral)"><div class="ov-art" id="ov-pals"><span style="font:780 30px var(--f-sans);letter-spacing:-.03em" id="ov-word">live here</span></div><h3>Pals <span>${PALS.length}</span></h3><p>Characters that live on your page: they crawl on headings, bounce on footers, peek over cards, perch on buttons.</p></a>
    <a href="type.html" style="--accent:var(--violet)"><div class="ov-art"><div style="width:80%"><piix-type text="abc" rows="14" cell="6" shade="#c6f432" fit intro="none"></piix-type></div></div><h3>Pixel type <span>1</span></h3><p>Any font as chunky extruded blocks that rain in, lift around the cursor and ripple. Pals can walk on it.</p></a>
  </div>
  <piix-pal pal="bitbug" on="#ov-word" scale="3"></piix-pal>
</section>
<section class="doc-sec" aria-labelledby="ins-h">
  <h2 id="ins-h">Install once</h2>
  <p>Then every tag on these pages just works.</p>
  ${codeBox('<script src="https://cdn.jsdelivr.net/gh/diiviikk5/Piixpal@main/piixpal.min.js"></script>')}
</section>`;

const pages = [
  ['index.html', { key: 'index', title: 'Components', desc: 'Every Piixpal component: sprites, pals and pixel type.', body: indexBody }],
  ['sprites.html', { key: 'sprites', title: 'Sprites', desc: `${sprites.length} inline pixel sprites with cursor-following eyes. Copy a tag, paste it anywhere.`, body: spritesBody }],
  ['pals.html', { key: 'pals', title: 'Pals', desc: 'Pixel characters that live on your page: crawl, bounce, peek, perch, hang, follow, creep.', body: palsBody }],
  ['type.html', { key: 'type', title: 'Pixel type', desc: 'Chunky extruded pixel lettering that pals can walk on.', body: typeBody, fonts: '<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@800&family=Instrument+Serif&family=Pacifico&display=swap" rel="stylesheet">\n' }]
];
for (const [file, p] of pages) writeFileSync(join(out, file), page(p));
console.log(`components/  ${pages.length} pages, ${sprites.length} sprites, ${PALS.length} pals`);
