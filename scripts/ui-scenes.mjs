// Pixel UI docs: the Scenes and Layouts pages (merged into ui-data.mjs).
const PX_PROP = def => ['pixel', 'size of one pixel, in px', String(def)];

/* ---------- scenes: one page per illustrated place ---------- */
const SCENES = [
  ['sakura', 'sakura', 'Sakura grove', 'A cherry tree in full bloom over a misty forest, with a lantern and a bench.',
    'Pink canopy, a dark twisting trunk, a teal forest dissolving into fog, and petals drifting down in pixel flakes. The lantern flickers and lights the bench. Move the pointer across it and the falling petals lean into the wind.'],
  ['alps', 'alps', 'Alpine hills', 'Snow peaks behind rolling green hills, pines and valley mist.',
    'A vintage travel-poster landscape: a jagged snow range, a low bank of cloud, and four layers of rolling hills, each lit on one side and shaded on the other, with mist pooling in the valleys and a scatter of pines. The layers slide apart as the pointer moves, so it feels deep.'],
  ['lake', 'lake', 'Sunset lake', 'A flat-colour sunset over a lake, with a boat drifting across.',
    'Vector-poster style: a huge sun, two layers of soft green hills and a lake that mirrors all of it through gentle ripples. A tiny rower crosses the water. Move the pointer up and down and the sun rises and sets with you.'],
  ['galaxy', 'galaxy', 'Galaxy', 'A spiral galaxy with planets in orbit; the pointer tilts it.',
    'A golden core, spiral arms of dust and light, six planets on their orbits (two with rings, all lit from the core) and the odd shooting star. The pointer tilts the whole disk toward you.'],
  ['rays', 'riso-rays', 'Riso rays', 'A two-ink riso print: light bursting from the horizon under a crescent moon.',
    'Only two colours, blue ink on warm paper, like a risograph print. Rays of light burst up from a vanishing point on the horizon while the ground streams toward you. The vanishing point follows the pointer.'],
  ['vortex', 'riso-vortex', 'Riso vortex', 'A two-ink riso print of the sky swirling round a lone street lamp.',
    'The same two inks: the night sky spirals round a single street lamp, and the ground fans out beneath it. The swirl drifts toward the pointer.'],
  ['train', 'train-window', 'Train window', 'A train window with the countryside rushing past.',
    'Look out of a train: clouds and far mountains crawl, the hills roll by faster, a fence whips past and telegraph poles flash through the frame with their wires sagging between them. The carriage sways and bumps over every rail joint. Move the pointer to look around. With <code>sky="none"</code> the carriage wall disappears and the window floats on your own page.'],
  ['poppies', 'poppies', 'Poppy field', 'A stormy sky over a field of red poppies blowing in the wind.',
    'A painterly storm, a bright band of light on the horizon and a field of poppies that sway and shed petals across the sky. The pointer sets the wind.'],
  ['castle', 'castle', 'Castle', 'A pixel castle on a hill at night, windows flickering and a flag waving.',
    'Towers, battlements and a flag in the wind, under a full moon and drifting clouds. Windows flicker on and off as people move about inside; hover near them and more of them light up. Fireflies drift over the hill.'],
  ['vista', 'vista', 'Anime vista', 'A summer sky with towering clouds, a snowy peak and grass in the breeze.',
    'Big sunlit cumulus clouds with warm undersides, a snowy peak in the haze, and long grass waving in the foreground. Everything slides a little with the pointer.']
];
const scenePage = ([kind, slug, name, brief, about]) => ({
  slug, name, section: 'Scenes', tag: 'piix-scene', file: 'scene', brief, about,
  demo: `<piix-scene kind="${kind}" height="460px"></piix-scene>`,
  stage: { h: 460, pad: 0 },
  controls: [['palette', 'Colours', 'palette', ''], ['sky', 'Sky', 'seg', ['', 'none'], ''], ['fade', 'Fade', 'seg', ['', 'top', 'bottom', 'both'], ''], ['levels', 'Levels', 'range', [2, 12, 1, 6]], ['pixel', 'Pixel', 'range', [2, 10, 1, 4]]],
  examples: [
    { name: 'As a hero', note: 'Give <a href="hero.html">Hero</a> a <code>scene</code> and your content sits on top of it.',
      demo: `<piix-hero scene="${kind}" height="440px">\n  <p class="eyebrow">Now open</p>\n  <h1>Somewhere new</h1>\n  <p>A whole place, drawn in pixels, behind your words.</p>\n  <piix-glow-button>Explore</piix-glow-button>\n</piix-hero>`, stage: { pad: 0, replay: true } },
    { name: 'On a normal page', note: '<code>sky="none"</code> cuts the sky out, so your page shows through. Add <code>fade</code> to dissolve an edge.',
      demo: `<piix-scene kind="${kind}" sky="none" height="280px"></piix-scene>`, stage: { pad: 0, light: true } },
    { name: 'Repainted', note: 'Give it a <code>palette</code> and the whole scene is redrawn in those colours.',
      demo: `<div class="ex-row">\n  <piix-scene kind="${kind}" palette="gameboy" height="180px"></piix-scene>\n  <piix-scene kind="${kind}" palette="sunset" height="180px"></piix-scene>\n  <piix-scene kind="${kind}" palette="paper" height="180px"></piix-scene>\n</div>`, stage: { pad: 0 } },
    { name: 'Fewer colours', note: '<code>levels</code> sets how many shades each colour channel gets. 2 or 3 is very retro.',
      demo: `<piix-scene kind="${kind}" levels="3" pixel="5" height="240px"></piix-scene>`, stage: { pad: 0 } }
  ],
  props: [
    ['kind', '<code>sakura</code> <code>alps</code> <code>lake</code> <code>galaxy</code> <code>rays</code> <code>vortex</code> <code>train</code> <code>poppies</code> <code>castle</code> <code>vista</code>', 'sakura'],
    ['sky', '<code>none</code> makes the sky see-through', ''],
    ['fade', '<code>top</code> <code>bottom</code> <code>both</code>: dissolve that edge in dithered pixels', ''],
    ['palette', 'repaint it in a palette instead of its own colours', ''],
    ['levels', 'shades per colour channel, 2 to 16', '6'],
    PX_PROP(4), ['dither', '0 for flat colour, 1 for full dither', '1'], ['speed', '1 is normal, 0 holds still', '1'],
    ['height', 'when not filling: px or any CSS length', '480px'], ['fill', 'sit behind the content of the parent element', '']
  ],
  a11y: ["Announced as an image with a description of the scene, unless it fills a parent (then it's decoration).", 'With reduced motion it renders one still frame.', 'Drawn entirely in a shader: no images to download, and it compiles in the background so the page never stalls.']
});

/* ---------- layouts: scenes mixed into ordinary pages ---------- */
const LAYOUTS = [
  { slug: 'horizon-band', name: 'Horizon band', brief: 'A clean page with a landscape rising along the bottom of the hero.',
    about: 'The hero is your normal page: plain background, your type, your buttons. Only the bottom third is pixel art, and because the sky is cut out, the mountains rise straight out of your own background colour.',
    demo: `<section class="lay-band">
  <div class="lay-copy">
    <p class="lay-kicker">Summit · Trail planner</p>
    <h2>Plan the climb. Enjoy the view.</h2>
    <p>Routes, weather and elevation in one calm place.</p>
    <piix-button tone="ink">Start planning</piix-button>
  </div>
  <piix-scene kind="alps" sky="none" height="260px"></piix-scene>
</section>` },
  { slug: 'window', name: 'Window', brief: 'A train window onto the countryside, set into a normal page.',
    about: 'The train window with its wall cut out becomes a window you can drop next to your copy. The rest of the page stays ordinary, so the window is the one thing that moves.',
    demo: `<section class="lay-split">
  <div class="lay-copy">
    <p class="lay-kicker">Slow rail</p>
    <h2>Six hours, no signal.</h2>
    <p>The long way through the hills, for people who need it.</p>
    <piix-button tone="sky">Book a seat</piix-button>
  </div>
  <piix-scene kind="train" sky="none" height="340px"></piix-scene>
</section>` },
  { slug: 'split-hero', name: 'Split hero', brief: 'Copy on one side, a framed scene on the other.',
    about: 'Classic SaaS layout, but the product shot is a living scene in a chunky pixel frame. Works with any scene; here, the castle for a game launch.',
    demo: `<section class="lay-split dark">
  <div class="lay-copy">
    <p class="lay-kicker">Out now on every platform</p>
    <h2>Keep the castle lit.</h2>
    <p>A cosy night-watch game about lanterns, ghosts and good neighbours.</p>
    <piix-glow-button palette="sunset">Play free</piix-glow-button>
  </div>
  <div class="lay-frame"><piix-scene kind="castle" height="340px"></piix-scene></div>
</section>` },
  { slug: 'fade-into-page', name: 'Fade into page', brief: 'A scene that dissolves into the content below it.',
    about: 'Put the scene at the top and set <code>fade="bottom"</code>: its last third breaks up into dithered pixels, so it melts into whatever comes next. No hard edge, no gradient banding.',
    demo: `<section class="lay-fade">
  <piix-scene kind="galaxy" fade="bottom" height="300px"></piix-scene>
  <div class="lay-copy center">
    <h2>Orbit</h2>
    <p>Satellite data for the rest of us.</p>
  </div>
</section>` },
  { slug: 'scene-cards', name: 'Scene cards', brief: 'Cards with a little living scene as their header.',
    about: "Blog posts, destinations, playlists: each card gets a small scene instead of a stock photo. They only draw while they're on screen, and they all share one GPU context.",
    demo: `<div class="lay-cards">
  <article><piix-scene kind="lake" height="140px"></piix-scene><h3>Still water</h3><p>Lo-fi for slow mornings.</p></article>
  <article><piix-scene kind="sakura" height="140px"></piix-scene><h3>Petal season</h3><p>Soft piano and rain.</p></article>
  <article><piix-scene kind="poppies" height="140px"></piix-scene><h3>Storm front</h3><p>Big drums, bigger skies.</p></article>
</div>` },
  { slug: 'riso-editorial', name: 'Riso editorial', brief: 'A two-ink print look for a magazine or a portfolio.',
    about: 'Pair the riso scenes with a serif and the same two inks everywhere else, and the whole page feels printed. The scene is the cover image; the rest is plain HTML and CSS.',
    demo: `<section class="lay-riso">
  <piix-scene kind="rays" height="300px"></piix-scene>
  <div class="lay-copy">
    <p class="lay-kicker">Issue 07 · Night roads</p>
    <h2>The long way home</h2>
    <p>Essays on driving after dark, printed in two inks.</p>
  </div>
</section>` }
];
const layoutPage = l => ({ ...l, section: 'Layouts', tag: 'piix-scene', file: 'scene', stage: { pad: 0, light: true, h: 380, block: true },
  a11y: ['Your copy is ordinary HTML: headings, paragraphs, real buttons.', 'The scenes are described for screen readers, or hidden when they are decoration.'] });

export const SCENE_PAGES = [...SCENES.map(scenePage), ...LAYOUTS.map(layoutPage)];
