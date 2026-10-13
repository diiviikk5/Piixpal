// Pixel UI: one entry per docs page. scripts/ui-docs.mjs turns these into ui/*.html.
//
//   slug      the page: ui/<slug>.html
//   name      its title
//   tag       the element it's built from
//   file      the single-file build in dist/c (and the @component name)
//   brief     one line, for the sidebar search, the overview grid and the page head
//   about     a paragraph under the preview
//   demo      the main preview's markup (also its code, unless `code` is given)
//   stage     how the preview box looks: { h: px, light, top, pad: px }
//   controls  live controls on the main preview: [attr, label, kind, options]
//             kind: seg (buttons), palette (swatches), range ([min, max, step])
//   examples  [{ name, note, demo, code, stage }]
//   props     [attribute, what it does, default]
//   events    [name, when]
//   a11y      notes on keyboard, screen readers and reduced motion

import { SCENE_PAGES } from './ui-scenes.mjs';

export const PALETTES = ['lime', 'aurora', 'sunset', 'ocean', 'candy', 'violet', 'fire', 'gameboy', 'paper', 'mono'];
const PAL_PROP = (def) => ['palette', `the colours: ${PALETTES.map(p => `<code>${p}</code>`).join(' ')}, or your own, dark to light: <code>"#000,#6b4cff,#fff"</code>`, def];
const PX_PROP = (def) => ['pixel', 'size of one pixel, in px', String(def)];
const TONES = 'lime | coral | violet | sky | sun | mint | ink | paper';

/* ---------- backgrounds: one page per shader kind ---------- */
const BG = [
  ['mesh', 'mesh-gradient', 'Mesh gradient', 'candy', 'Soft colour blobs that drift into each other, the classic SaaS gradient, rebuilt out of pixels.',
    'Four colour fields drift on slow noise and blend into each other, then get dithered down into the palette on a pixel grid. The pointer pulls the nearest blob toward it. Calm enough to sit behind body text.'],
  ['warp', 'warp', 'Marble warp', 'aurora', 'Domain-warped noise that folds over itself like marbled paper.',
    'Noise feeding into noise feeding into noise: the classic domain-warp trick, so the colour bands fold and curl like ink on water. Busy, so it suits short sections and headers more than long reading.'],
  ['aurora', 'aurora', 'Aurora', 'aurora', 'Curtains of light rippling over a night sky.',
    'Long vertical curtains of colour sway and shimmer over a dark sky with a few stars in it. The pointer pushes the curtains aside.'],
  ['crystal', 'crystal', 'Crystal cells', 'violet', 'Glowing crystal cells whose edges catch the light.',
    'Voronoi cells that slowly shift, each lit from inside, with bright seams where they meet. Move the pointer and the nearest cell lights up.'],
  ['liquid', 'liquid-metal', 'Liquid metal', 'mono', 'A chrome surface that ripples like mercury.',
    'A height field shaded like polished metal, with sharp highlights sliding over it. In mono it is pure chrome; in a colour palette it turns into anodised metal.'],
  ['horizon', 'horizon', 'Synthwave horizon', 'sunset', 'A sun setting behind a grid that scrolls toward you forever.',
    'The retro horizon: a striped sun, a glowing perspective grid racing toward you, and haze where they meet. The pointer steers the grid.'],
  ['nebula', 'nebula', 'Nebula', 'candy', 'Deep-space gas clouds with stars twinkling through.',
    'Layered fractal noise as glowing gas, with a starfield behind it. Slow and dark, so it makes a great backdrop for white text.'],
  ['topo', 'topographic', 'Topographic', 'paper', 'Contour lines like a living map.',
    'Height lines from a slowly shifting landscape, drawn as a contour map. In paper it looks like an old survey sheet; in lime it looks like a radar screen.'],
  ['dots', 'dot-matrix', 'Dot matrix', 'lime', 'A field of dots that ripples out from the pointer.',
    'A grid of round dots whose size and colour ride a slow wave, plus a ripple that spreads from wherever the pointer is. Click-free and very calm.'],
  ['fire', 'fire', 'Fire', 'fire', 'Pixel flames licking up from the bottom.',
    'Classic demo-scene fire: turbulent noise rising and cooling as it climbs. Put it at the bottom of a section, or make a whole "hot deals" banner out of it.']
];
const bgPage = ([kind, slug, name, pal, brief, about]) => ({
  slug, name, section: 'Backgrounds', tag: 'piix-shader', file: 'shader', brief, about,
  demo: `<piix-shader kind="${kind}" height="420px"></piix-shader>`,
  stage: { h: 420, pad: 0 },
  controls: [['palette', 'Palette', 'palette', pal], ['pixel', 'Pixel', 'range', [2, 10, 1, 4]], ['dither', 'Dither', 'range', [0, 1, .1, 1]], ['speed', 'Speed', 'range', [0, 3, .25, 1]]],
  examples: [
    { name: 'Behind your content', note: 'With <code>fill</code> it sits behind everything else in the element it\'s in. Give that element <code>position: relative</code> (the shader does this for you if it\'s static).',
      demo: `<section class="ex-fill">\n  <piix-shader kind="${kind}" fill pixel="5"></piix-shader>\n  <h2>Ship it loud</h2>\n  <p>Your content sits on top.</p>\n</section>`, stage: { h: 300, pad: 0 } },
    { name: 'Other palettes', note: 'Every palette works with every background.',
      demo: `<div class="ex-row">\n  <piix-shader kind="${kind}" palette="${pal === 'ocean' ? 'candy' : 'ocean'}" height="180px"></piix-shader>\n  <piix-shader kind="${kind}" palette="${pal === 'gameboy' ? 'sunset' : 'gameboy'}" height="180px"></piix-shader>\n  <piix-shader kind="${kind}" palette="#0b0a10,#3a2a6b,#ff6b4a,#ffe8a8" height="180px"></piix-shader>\n</div>`, stage: { pad: 0 } },
    { name: 'Smooth bands', note: '<code>dither="0"</code> swaps the dither pattern for flat colour bands, like a poster.',
      demo: `<piix-shader kind="${kind}" dither="0" pixel="6" height="220px"></piix-shader>`, stage: { pad: 0 } }
  ],
  props: [
    ['kind', `<code>mesh</code> <code>warp</code> <code>aurora</code> <code>crystal</code> <code>liquid</code> <code>horizon</code> <code>nebula</code> <code>topo</code> <code>dots</code> <code>fire</code>`, 'mesh'],
    PAL_PROP(`${pal}`), PX_PROP(4),
    ['dither', '0 for flat colour bands, 1 for full dither', '1'],
    ['speed', '1 is normal, 0 holds still', '1'],
    ['height', 'when not filling: px or any CSS length', '360px'],
    ['fill', 'sit behind the content of the parent element', '']
  ],
  a11y: ['It is decoration: hidden from screen readers.', 'With reduced motion it renders one still frame.', 'It only draws while it is on screen, and every Pixel UI component shares one GPU context.']
});

/* ---------- text: one page per effect ---------- */
const TX = [
  ['shine', 'shine-text', 'Shine text', 'lime', 'A dithered band of colour that sweeps across the words.', 'A wide band of light slides through the letters every few seconds, stepping through the palette in dithered pixels. Good for one word in a headline.'],
  ['reveal', 'reveal-text', 'Reveal text', 'aurora', 'Words that resolve out of a mosaic when they scroll into view.', 'The words start as big chunky blocks and resolve, pixel size by pixel size, into crisp letters the first time they come on screen.'],
  ['glitch', 'glitch-text', 'Glitch text', 'candy', 'Colour split and slipping rows, in bursts.', 'Every so often the text tears: rows slip sideways, the colour channels split apart, and blocks of noise flash through. Between bursts it holds still, so it stays readable.'],
  ['wave', 'wave-text', 'Wave text', 'ocean', 'Letters that ripple like a flag.', 'The words ride a travelling wave, pixel column by pixel column, and the colour follows the crest. Hover and the wave grows.'],
  ['melt', 'melt-text', 'Melt text', 'fire', 'Letters that drip and melt down the page.', 'Columns of the letters slide down at different speeds and drip, then pull themselves back up. A bit unhinged, in a good way.'],
  ['scan', 'scan-text', 'Scan text', 'aurora', 'A scanline that sweeps down, lighting the letters as it passes.', 'A bright scanline rolls down through the words like an old CRT, lighting up each row as it passes and leaving a dithered afterglow.']
];
const txPage = ([effect, slug, name, pal, brief, about]) => ({
  slug, name, section: 'Text', tag: 'piix-text', file: 'text', brief, about,
  demo: `<h1 class="ex-h1"><piix-text effect="${effect}"${pal === 'lime' ? '' : ` palette="${pal}"`}>Pixel perfect</piix-text></h1>`,
  code: `<h1>\n  <piix-text effect="${effect}"${pal === 'lime' ? '' : ` palette="${pal}"`}>Pixel perfect</piix-text>\n</h1>`,
  stage: { h: 260 },
  controls: [['palette', 'Palette', 'palette', pal], ['pixel', 'Pixel', 'range', [1, 6, 1, 2]]],
  examples: [
    { name: 'One word in a headline', note: 'It takes the font, size and weight of wherever you put it, so it drops straight into your own heading.',
      demo: `<h2 class="ex-h2">Build something <piix-text effect="${effect}" palette="sunset">loud</piix-text></h2>` },
    { name: 'Chunkier pixels', demo: `<h2 class="ex-h2"><piix-text effect="${effect}" pixel="4" palette="${pal === 'candy' ? 'gameboy' : 'candy'}">Big pixels</piix-text></h2>` }
  ],
  props: [
    ['effect', '<code>shine</code> <code>reveal</code> <code>glitch</code> <code>wave</code> <code>melt</code> <code>scan</code>', 'shine'],
    PAL_PROP('lime'), PX_PROP(2)
  ],
  a11y: ['The real words stay in the page, so screen readers, search engines and copy-paste all see normal text.', 'With reduced motion the effect holds on a readable frame.', 'One line of text: it doesn\'t wrap.']
});

export const UI = [
  ...SCENE_PAGES,
  /* ---------- sections ---------- */
  { slug: 'hero', name: 'Hero', section: 'Sections', tag: 'piix-hero', file: 'hero', needs: ['shader'],
    brief: 'A whole hero section on a GPU pixel background that dissolves in.',
    about: 'Any of the ten backgrounds, with a vignette and scanlines over the top. When it scrolls into view the background dissolves in pixel by pixel, then your content rises in after it. Put anything inside: headings, paragraphs and buttons get hero-sized type and are centred for you.',
    demo: `<piix-hero kind="horizon" height="520px">
  <p class="eyebrow">New · v1.0</p>
  <h1>Build something loud</h1>
  <p>One line of HTML and your landing page glows.</p>
  <piix-glow-button>Get started</piix-glow-button>
</piix-hero>`,
    stage: { h: 520, pad: 0, replay: true },
    controls: [['kind', 'Background', 'seg', ['mesh', 'warp', 'aurora', 'crystal', 'liquid', 'horizon', 'nebula', 'topo', 'dots', 'fire'], 'horizon'], ['palette', 'Palette', 'palette', ''], ['align', 'Align', 'seg', ['center', 'left'], 'center']],
    examples: [
      { name: 'Left aligned', demo: `<piix-hero kind="nebula" align="left" height="420px">\n  <p class="eyebrow">Changelog</p>\n  <h1>Faster than ever</h1>\n  <p>Every component now shares one GPU context.</p>\n</piix-hero>`, stage: { pad: 0, replay: true } },
      { name: 'With pixel type', note: 'Mix in <a href="shine-text.html">Shine text</a> for the key word.', demo: `<piix-hero kind="mesh" palette="candy" height="420px">\n  <h1>Make it <piix-text effect="shine" palette="sunset">pop</piix-text></h1>\n  <p>Shaders, dithered into your palette.</p>\n</piix-hero>`, stage: { pad: 0, replay: true } }
    ],
    props: [
      ['kind', 'which <a href="mesh-gradient.html">background</a>: <code>mesh</code> <code>warp</code> <code>aurora</code> <code>crystal</code> <code>liquid</code> <code>horizon</code> <code>nebula</code> <code>topo</code> <code>dots</code> <code>fire</code>', 'mesh'],
      PAL_PROP("the background's own"), PX_PROP(5),
      ['align', '<code>center</code> or <code>left</code>', 'center'],
      ['height', 'any CSS length', 'min(88vh, 780px)']
    ],
    a11y: ['Your content is ordinary HTML in the page.', 'With reduced motion there is no dissolve: it\'s just there.'] },

  { slug: 'divider', name: 'Divider', section: 'Sections', tag: 'piix-divider', file: 'divider',
    brief: 'A moving pixel edge between two sections, instead of a hard line.',
    about: 'One section\'s colour flows into the next across a living edge: rolling waves, a mountain ridge, stepped stairs, drips or a dithered fade. A thin line of light runs along it, and it lifts a little under the pointer. Set <code>from</code> and <code>to</code> to the two sections\' backgrounds.',
    demo: `<piix-divider kind="wave" from="#17121f" to="#f3eee3"></piix-divider>`,
    stage: { h: 280, pad: 0, split: true },
    controls: [['kind', 'Kind', 'seg', ['wave', 'mountains', 'stairs', 'drip', 'dissolve'], 'wave'], ['palette', 'Line', 'palette', 'lime'], ['pixel', 'Pixel', 'range', [2, 12, 1, 6]]],
    examples: [
      { name: 'Between two sections', demo: `<section style="background:#17121f;color:#fff">…</section>\n<piix-divider kind="mountains" from="#17121f" to="#f3eee3"></piix-divider>\n<section style="background:#f3eee3">…</section>`, stage: { pad: 0, split: true }, show: `<piix-divider kind="mountains" from="#17121f" to="#f3eee3"></piix-divider>` },
      { name: 'Flipped', note: '<code>flip</code> turns it upside down, for going back from light to dark.', demo: `<piix-divider kind="drip" from="#f3eee3" to="#17121f" flip palette="candy"></piix-divider>`, stage: { pad: 0, split: true, flip: true } }
    ],
    props: [
      ['kind', '<code>wave</code> <code>mountains</code> <code>stairs</code> <code>drip</code> <code>dissolve</code>', 'wave'],
      ['from', 'the colour above', '#17121f'], ['to', 'the colour below', '#f3eee3'],
      ['palette', 'the line of light along the edge', 'lime'],
      ['height', 'px or any CSS length', '120px'], PX_PROP(6), ['flip', 'turn it upside down', '']
    ],
    a11y: ['Decoration: hidden from screen readers.', 'Holds still with reduced motion.'] },

  { slug: 'marquee', name: 'Marquee', section: 'Sections', tag: 'piix-marquee', file: 'marquee',
    brief: 'An endless row of logos whose ends dissolve into dithered pixels.',
    about: 'Logos, words, anything: they slide past in a loop with no seam. Instead of a blurry fade the ends break up into a pixel dither. Hover to pause it.',
    demo: `<piix-marquee>
  <span class="logo">◆ Acme</span>
  <span class="logo">▲ Globex</span>
  <span class="logo">● Initech</span>
  <span class="logo">■ Umbrella</span>
  <span class="logo">✦ Hooli</span>
  <span class="logo">⬢ Vandelay</span>
</piix-marquee>`,
    stage: { h: 200 },
    controls: [['speed', 'Speed', 'range', [10, 160, 10, 40]], ['gap', 'Gap', 'range', [16, 120, 8, 48]], ['fade', 'Fade', 'range', [0, 200, 8, 96]]],
    examples: [
      { name: 'Two rows, opposite ways', demo: `<piix-marquee speed="30">…</piix-marquee>\n<piix-marquee speed="30" reverse>…</piix-marquee>`,
        show: `<div style="display:grid;gap:22px;width:100%"><piix-marquee speed="30"><span class="logo">Fast</span><span class="logo">Tiny</span><span class="logo">Pixel</span><span class="logo">Free</span><span class="logo">Open</span></piix-marquee><piix-marquee speed="30" reverse><span class="logo">Dither</span><span class="logo">Shader</span><span class="logo">GPU</span><span class="logo">Retro</span><span class="logo">Loud</span></piix-marquee></div>` }
    ],
    props: [['speed', 'pixels a second', '40'], ['gap', 'px between items', '48'], ['fade', 'px of dithered fade at each end', '96'], ['reverse', 'scroll the other way', '']],
    a11y: ['The copies it makes for the loop are hidden from screen readers and can\'t be tabbed to.', 'Holds still with reduced motion.', 'Pauses while the pointer is over it.'] },

  /* ---------- buttons ---------- */
  { slug: 'glow-button', name: 'Glow button', section: 'Buttons', tag: 'piix-glow-button', file: 'glow-button',
    brief: 'A button with light chasing round its pixel border.',
    about: 'A band of light runs round the pixel border, drawn on the GPU and dithered into the palette. Hover and a spotlight follows the pointer across the face; click and a ring ripples out from where you clicked.',
    demo: `<piix-glow-button>Get started</piix-glow-button>`,
    stage: { h: 240 },
    controls: [['palette', 'Palette', 'palette', 'lime'], ['size', 'Size', 'seg', ['sm', 'md', 'lg'], 'md'], ['pixel', 'Pixel', 'range', [2, 6, 1, 3]]],
    examples: [
      { name: 'Palettes', demo: `<piix-glow-button palette="sunset">Launch</piix-glow-button>\n<piix-glow-button palette="candy">Join</piix-glow-button>\n<piix-glow-button palette="ocean">Deploy</piix-glow-button>\n<piix-glow-button palette="gameboy">Play</piix-glow-button>` },
      { name: 'Sizes', demo: `<piix-glow-button size="sm">Small</piix-glow-button>\n<piix-glow-button>Medium</piix-glow-button>\n<piix-glow-button size="lg">Large</piix-glow-button>` },
      { name: 'In a form', note: 'It submits and resets the form it\'s in, like a real button.', demo: `<form onsubmit="event.preventDefault(); this.querySelector('output').value = 'Sent!'">\n  <piix-glow-button type="submit">Send</piix-glow-button>\n  <piix-glow-button type="reset" palette="mono" size="sm">Reset</piix-glow-button>\n  <output></output>\n</form>` },
      { name: 'Disabled', demo: `<piix-glow-button disabled>Sold out</piix-glow-button>` }
    ],
    props: [PAL_PROP('lime'), ['size', '<code>sm</code> <code>md</code> <code>lg</code>', 'md'], ['type', '<code>button</code> <code>submit</code> <code>reset</code>', 'button'], ['disabled', 'greyed out, can\'t be pressed', ''], PX_PROP(3)],
    events: [['click', 'like any button']],
    a11y: ['It is a real button: focusable, Enter and Space press it, and it is announced as a button.', 'Form-associated: it submits and resets its form.', 'With reduced motion the light holds still.'] },

  { slug: 'button', name: 'Pixel button', section: 'Buttons', tag: 'piix-button', file: 'button',
    brief: 'A chunky pixel button that presses down into its shadow, with a pal on top.',
    about: 'Stepped pixel corners, an ink frame and a hard shadow it sinks into when pressed. Hover sends a puff of pixels off its corners. Give it a pal and a little character sits on its top edge, looks round when you hover, and hops when you click.',
    demo: `<piix-button pal="bitbug">Get started</piix-button>`,
    stage: { h: 240, light: true },
    controls: [['tone', 'Tone', 'seg', ['lime', 'coral', 'violet', 'sky', 'sun', 'mint', 'ink', 'paper'], 'lime'], ['size', 'Size', 'seg', ['sm', 'md', 'lg'], 'md'], ['pal', 'Pal', 'seg', ['', 'bitbug', 'pip', 'frog', 'kitty'], '']],
    examples: [
      { name: 'Tones', demo: `<piix-button>Lime</piix-button>\n<piix-button tone="coral">Coral</piix-button>\n<piix-button tone="violet">Violet</piix-button>\n<piix-button tone="sky">Sky</piix-button>\n<piix-button tone="ink">Ink</piix-button>`, stage: { light: true } },
      { name: 'With a pal', demo: `<piix-button tone="coral" pal="frog">Deploy</piix-button>\n<piix-button tone="sky" pal="pip">Subscribe</piix-button>`, stage: { light: true } },
      { name: 'Disabled', demo: `<piix-button disabled>Not yet</piix-button>`, stage: { light: true } }
    ],
    props: [['tone', TONES.split(' | ').map(t => `<code>${t}</code>`).join(' '), 'lime'], ['size', '<code>sm</code> <code>md</code> <code>lg</code>', 'md'], ['pal', 'a pal to sit on top: bitbug, pip, frog, kitty…', ''], ['type', '<code>button</code> <code>submit</code> <code>reset</code>', 'button'], ['disabled', 'greyed out', '']],
    events: [['click', 'like any button']],
    a11y: ['A real, form-associated button.', 'The pal is decoration and hidden from screen readers.'] },

  /* ---------- cards ---------- */
  { slug: 'glow-card', name: 'Glow card', section: 'Cards', tag: 'piix-glow-card', file: 'glow-card',
    brief: 'A card lit from inside, with light running round its border.',
    about: 'A dark pixel card with a band of light chasing round its edge and a spotlight that follows your pointer under the content. It tilts a little toward the pointer, and a click sends a ring out across it. Put anything inside.',
    demo: `<piix-glow-card>
  <h3>Realtime</h3>
  <p>Everything updates the moment it changes, on every device.</p>
</piix-glow-card>`,
    stage: { h: 340 },
    controls: [['palette', 'Palette', 'palette', 'violet'], ['tilt', 'Tilt', 'seg', ['', 'none'], ''], ['pixel', 'Pixel', 'range', [2, 6, 1, 3]]],
    examples: [
      { name: 'A feature grid', demo: `<div class="ex-grid">\n  <piix-glow-card palette="lime"><h3>Zero deps</h3><p>One script tag. No build step.</p></piix-glow-card>\n  <piix-glow-card palette="sunset"><h3>On the GPU</h3><p>Shaders on a pixel grid.</p></piix-glow-card>\n  <piix-glow-card palette="ocean"><h3>Accessible</h3><p>Real elements, real focus.</p></piix-glow-card>\n</div>` },
      { name: 'Pricing', demo: `<piix-glow-card palette="candy">\n  <p class="eyebrow">Pro</p>\n  <h3 class="price">$0<small>/forever</small></h3>\n  <p>Every component, every palette, MIT licensed.</p>\n  <piix-glow-button palette="candy">Get it</piix-glow-button>\n</piix-glow-card>` }
    ],
    props: [PAL_PROP('violet'), ['tilt', '<code>none</code> keeps it flat', ''], PX_PROP(3)],
    a11y: ['Your content is ordinary HTML.', 'No tilt and no moving light with reduced motion.'] },

  /* ---------- text ---------- */
  ...TX.map(txPage),
  { slug: 'counter', name: 'Counter', section: 'Text', tag: 'piix-stat', file: 'stat',
    brief: 'A big number that counts up in pixel type when it scrolls into view.',
    about: 'The number rolls up from zero the first time it\'s on screen, in chunky pixel digits with a hard shadow, and each digit flickers as it changes. Whatever you put inside is the label under it.',
    demo: `<piix-stat value="12480" suffix="+">teams building with it</piix-stat>`,
    stage: { h: 260, replay: true },
    controls: [['tone', 'Tone', 'seg', ['lime', 'coral', 'violet', 'sky', 'sun', 'mint', 'paper'], 'lime'], ['duration', 'Duration', 'range', [.4, 4, .2, 1.6]]],
    examples: [
      { name: 'A stats row', demo: `<div class="ex-grid">\n  <piix-stat value="12480" suffix="+">teams</piix-stat>\n  <piix-stat value="99.98" decimals="2" suffix="%" tone="sky">uptime</piix-stat>\n  <piix-stat value="2.4" decimals="1" prefix="$" suffix="M" tone="coral">saved</piix-stat>\n</div>`, stage: { replay: true } }
    ],
    props: [['value', 'the number', ''], ['prefix', 'before it, like <code>$</code>', ''], ['suffix', 'after it, like <code>+</code> or <code>%</code>', ''], ['decimals', 'digits after the point', '0'], ['duration', 'seconds to count', '1.6'], ['tone', TONES.split(' | ').map(t => `<code>${t}</code>`).join(' '), 'lime']],
    a11y: ['Screen readers get the final number and the label straight away.', 'With reduced motion it shows the final number.'] },

  /* ---------- media ---------- */
  { slug: 'pixel-image', name: 'Pixel image', section: 'Media', tag: 'piix-pixel-image', file: 'pixel-image',
    brief: 'Any picture, dithered, mosaicked or halftoned on the GPU, with a lens.',
    about: 'Shows your image as dithered pixels in the palette, as a mosaic, or as halftone dots. Move the pointer over it and a lens shows the real picture underneath; hover a mosaic and it resolves. It crops like <code>object-fit: cover</code>, and keeps the image\'s shape if you don\'t give it a height.',
    demo: `<piix-pixel-image src="../site/launch-poster.jpg" alt="The Piixpal launch film" height="380px"></piix-pixel-image>`,
    stage: { h: 380, pad: 0 },
    controls: [['effect', 'Effect', 'seg', ['dither', 'mosaic', 'halftone'], 'dither'], ['palette', 'Palette', 'palette', 'mono'], ['pixel', 'Pixel', 'range', [2, 10, 1, 3]], ['lens', 'Lens', 'seg', ['', 'none'], '']],
    examples: [
      { name: 'Three effects', demo: `<div class="ex-grid">\n  <piix-pixel-image src="../site/readme/hero.png" alt="" palette="gameboy"></piix-pixel-image>\n  <piix-pixel-image src="../site/readme/hero.png" alt="" effect="mosaic"></piix-pixel-image>\n  <piix-pixel-image src="../site/readme/hero.png" alt="" effect="halftone" palette="paper"></piix-pixel-image>\n</div>`, stage: { pad: 16 } }
    ],
    props: [['src', 'the image (on your site, or served with CORS)', ''], ['alt', 'what it shows, for screen readers', ''], ['effect', '<code>dither</code> <code>mosaic</code> <code>halftone</code>', 'dither'], PAL_PROP('mono'), PX_PROP(3), ['lens', '<code>none</code> turns the lens off', ''], ['height', 'any CSS length', "the image's own shape"]],
    a11y: ['Announced as an image with your <code>alt</code> text.', 'With reduced motion the lens still works but nothing animates on its own.'] },

  /* ---------- forms ---------- */
  { slug: 'input', name: 'Input', section: 'Forms', tag: 'piix-input', file: 'input',
    brief: 'A text field whose pixel border lights up as you type.',
    about: 'A dark pixel field. Focus it and light starts running round its border; every key sends a little ring out from the caret. Whatever you put inside is its label.',
    demo: `<piix-input name="email" type="email" placeholder="you@site.com">Email</piix-input>`,
    stage: { h: 240, narrow: true },
    controls: [['palette', 'Palette', 'palette', 'lime']],
    examples: [
      { name: 'A sign-up form', demo: `<form class="ex-form" onsubmit="event.preventDefault(); this.querySelector('output').value = JSON.stringify(Object.fromEntries(new FormData(this)))">\n  <piix-input name="name" placeholder="Ada">Name</piix-input>\n  <piix-input name="email" type="email" required placeholder="you@site.com" palette="candy">Email</piix-input>\n  <piix-glow-button type="submit">Join</piix-glow-button>\n  <output></output>\n</form>`, stage: { narrow: true } }
    ],
    props: [['name, type, value, placeholder, required, disabled, autocomplete, maxlength', 'the same as on an <code>&lt;input&gt;</code>', ''], PAL_PROP('lime'), PX_PROP(3)],
    events: [['input', 'every keystroke'], ['change', 'when the value is committed']],
    a11y: ['Labelled by its content.', 'Form-associated with real validation: <code>required</code> and <code>type="email"</code> block submit like a native field.'] },

  { slug: 'checkbox', name: 'Checkbox', section: 'Forms', tag: 'piix-checkbox', file: 'checkbox',
    brief: 'A pixel checkbox whose tick draws itself in, block by block.',
    about: 'A chunky pixel box. Tick it and the check mark draws itself in, block by block, with a puff of pixels; untick and it un-draws.',
    demo: `<piix-checkbox checked>Send me updates</piix-checkbox>`,
    stage: { h: 200, light: true },
    controls: [['tone', 'Tone', 'seg', ['lime', 'coral', 'violet', 'sky', 'sun', 'mint'], 'lime']],
    examples: [{ name: 'A list', demo: `<div style="display:grid;gap:12px">\n  <piix-checkbox checked>Pixel corners</piix-checkbox>\n  <piix-checkbox tone="coral">Hard shadows</piix-checkbox>\n  <piix-checkbox tone="sky" disabled>Rounded corners</piix-checkbox>\n</div>`, stage: { light: true } }],
    props: [['checked', 'ticked', ''], ['tone', 'the box colour when ticked', 'lime'], ['name', 'the form field name', ''], ['value', 'sent when ticked', 'on'], ['disabled', 'can\'t be ticked', '']],
    events: [['change', 'when it is ticked or unticked']],
    a11y: ['Announced as a checkbox; Space ticks it.', 'Form-associated.'] },

  { slug: 'toggle', name: 'Toggle', section: 'Forms', tag: 'piix-toggle', file: 'toggle',
    brief: 'A pixel switch: a pal walks across to flip it.',
    about: 'The knob is a pal standing in the track. Switch it and the pal walks to the other end, turns, and the track lights up behind it.',
    demo: `<piix-toggle checked>Dark mode</piix-toggle>`,
    stage: { h: 200, light: true },
    controls: [['pal', 'Pal', 'seg', ['bitbug', 'pinch', 'penguin', 'kitty'], 'bitbug'], ['tone', 'Tone', 'seg', ['lime', 'coral', 'violet', 'sky'], 'lime']],
    examples: [{ name: 'Settings', demo: `<div style="display:grid;gap:14px">\n  <piix-toggle checked>Notifications</piix-toggle>\n  <piix-toggle pal="pinch" tone="coral">Sound</piix-toggle>\n  <piix-toggle pal="penguin" tone="sky" disabled>Beta features</piix-toggle>\n</div>`, stage: { light: true } }],
    props: [['checked', 'on', ''], ['pal', 'who flips it', 'bitbug'], ['tone', 'the colour when on', 'lime'], ['name', 'the form field name', ''], ['value', 'sent when on', 'on'], ['disabled', 'can\'t be flipped', '']],
    events: [['change', 'when it flips'], ['piix:toggle', '<code>detail.checked</code>']],
    a11y: ['Announced as a switch; Space and Enter flip it.', 'Form-associated.'] },

  /* ---------- navigation ---------- */
  { slug: 'tabs', name: 'Tabs', section: 'Navigation', tag: 'piix-tabs', file: 'tabs',
    brief: 'Tabs whose highlight slides across with a dithered pixel trail.',
    about: 'Each child with a <code>label</code> becomes a tab. Pick one and the lit block slides over on the GPU, leaving a trail of dithered pixels behind it.',
    demo: `<piix-tabs>
  <div label="Overview"><p>Everything you need to ship a loud landing page.</p></div>
  <div label="Install"><p>One script tag, or npm install piixpal.</p></div>
  <div label="Examples"><p>Heroes, pricing, dashboards, 404 pages.</p></div>
  <div label="Pricing"><p>Free. Forever. MIT.</p></div>
</piix-tabs>`,
    stage: { h: 260, narrow: true, top: true },
    controls: [['palette', 'Palette', 'palette', 'lime']],
    props: [['selected', 'which tab is open, from 0', '0'], PAL_PROP('lime'), PX_PROP(3)],
    events: [['change', '<code>detail.index</code> and <code>detail.label</code>']],
    a11y: ['A proper tab list: arrow keys, Home and End move between tabs.', 'The highlight jumps instead of sliding with reduced motion.'] },

  /* ---------- feedback ---------- */
  { slug: 'loader', name: 'Loader', section: 'Feedback', tag: 'piix-loader', file: 'loader',
    brief: 'Little pixel spinners drawn on the GPU.',
    about: 'A ring that chases its tail, pixels in orbit, a snake running round a square, equaliser bars, and rings pulsing out.',
    demo: `<piix-loader size="96"></piix-loader>`,
    stage: { h: 240 },
    controls: [['kind', 'Kind', 'seg', ['ring', 'orbit', 'snake', 'bars', 'pulse'], 'ring'], ['palette', 'Palette', 'palette', 'lime'], ['pixel', 'Pixel', 'range', [2, 6, 1, 3]]],
    examples: [{ name: 'Every kind', demo: `<piix-loader></piix-loader>\n<piix-loader kind="orbit" palette="candy"></piix-loader>\n<piix-loader kind="snake" palette="sunset"></piix-loader>\n<piix-loader kind="bars" palette="ocean"></piix-loader>\n<piix-loader kind="pulse" palette="violet"></piix-loader>` }],
    props: [['kind', '<code>ring</code> <code>orbit</code> <code>snake</code> <code>bars</code> <code>pulse</code>', 'ring'], PAL_PROP('lime'), ['size', 'px', '48'], ['label', 'what\'s loading', 'Loading'], PX_PROP(3)],
    a11y: ['Announced as a status: "Loading", or your label.'] },

  { slug: 'progress', name: 'Progress', section: 'Feedback', tag: 'piix-progress', file: 'progress',
    brief: 'A segmented progress bar with a pal running along the front.',
    about: 'Blocks fill in one segment at a time and a pal runs along the leading edge, keeping pace. At 100% it stops and cheers. Leave out the value and it\'s indeterminate: the pal paces back and forth.',
    demo: `<piix-progress value="40"></piix-progress>`,
    stage: { h: 220, light: true, narrow: true },
    controls: [['value', 'Value', 'range', [0, 100, 5, 'none']], ['pal', 'Pal', 'seg', ['pix', 'bitbug', 'penguin', 'frog'], 'pix'], ['tone', 'Tone', 'seg', ['lime', 'coral', 'violet', 'sky'], 'lime']],
    examples: [{ name: 'Working…', note: 'No value: indeterminate.', demo: `<piix-progress pal="penguin" tone="sky" label="Uploading"></piix-progress>`, stage: { light: true, narrow: true } }],
    props: [['value', 'how far, 0 to max (leave out for "working…")', ''], ['max', 'the end', '100'], ['pal', 'who runs', 'pix'], ['tone', 'the fill colour', 'lime'], ['segments', 'how many blocks', '20'], ['label', 'what\'s loading, for screen readers', 'Loading']],
    a11y: ['Announced as a progress bar with its value.'] },

  /* ---------- motion ---------- */
  { slug: 'reveal', name: 'Reveal', section: 'Motion', tag: 'piix-reveal', file: 'reveal',
    brief: 'Content that dissolves in, pixel by pixel, when it scrolls into view.',
    about: 'Wrap anything. Until it\'s on screen it hides under a layer the colour of the page; then that layer breaks up into pixels and falls away, with a glowing edge where it\'s dissolving. Once it\'s done the GPU rests.',
    demo: `<piix-reveal pattern="dither">
  <div class="shot">Your screenshot</div>
</piix-reveal>`,
    stage: { h: 340, replay: true, narrow: true },
    controls: [['pattern', 'Pattern', 'seg', ['dither', 'rain', 'scan', 'spiral'], 'dither'], ['palette', 'Edge', 'palette', 'lime'], ['duration', 'Duration', 'range', [.4, 3, .1, 1.1]], ['pixel', 'Pixel', 'range', [3, 14, 1, 6]]],
    examples: [{ name: 'Staggered', note: 'Use <code>delay</code> to stagger a grid.', demo: `<div class="ex-grid">\n  <piix-reveal><div class="shot">one</div></piix-reveal>\n  <piix-reveal pattern="rain" delay=".2"><div class="shot">two</div></piix-reveal>\n  <piix-reveal pattern="spiral" delay=".4"><div class="shot">three</div></piix-reveal>\n</div>`, stage: { replay: true } }],
    props: [['pattern', '<code>dither</code> <code>rain</code> <code>scan</code> <code>spiral</code>', 'dither'], ['color', 'what it dissolves out of', 'the background behind it'], ['palette', 'the glowing edge', 'lime'], ['duration', 'seconds', '1.1'], ['delay', 'seconds to wait once it\'s on screen', '0'], PX_PROP(6)],
    events: [['piix:revealed', 'when it has finished']],
    a11y: ['The content is in the page the whole time, so screen readers read it straight away.', 'With reduced motion it is simply shown.'] },

  { slug: 'cursor', name: 'Cursor trail', section: 'Motion', tag: 'piix-cursor', file: 'cursor',
    brief: 'A pixel comet, or a soft glow, that follows the pointer across the page.',
    about: 'One tag anywhere on the page. <code>trail</code> leaves a comet of dithered pixels that fade as they fall away; <code>glow</code> is a soft pixel halo. It never gets in the way of clicks and rests the GPU when the pointer is still. <strong>It is running on this page right now:</strong> move your pointer.',
    demo: `<piix-cursor></piix-cursor>`,
    stage: { h: 220, hint: 'Move your pointer anywhere on the page.' },
    controls: [['kind', 'Kind', 'seg', ['trail', 'glow'], 'trail'], ['palette', 'Palette', 'palette', 'lime'], ['size', 'Size', 'range', [.5, 3, .25, 1]]],
    global: true,
    props: [['kind', '<code>trail</code> <code>glow</code>', 'trail'], PAL_PROP('lime'), ['size', 'how big, 0.5 to 3', '1'], PX_PROP(4)],
    a11y: ['Decoration: hidden from screen readers and never catches clicks.', 'Off on touch screens and with reduced motion.'] },

  /* ---------- backgrounds ---------- */
  ...BG.map(bgPage)
];

export const SECTIONS = ['Scenes', 'Layouts', 'Backgrounds', 'Sections', 'Buttons', 'Cards', 'Text', 'Media', 'Forms', 'Navigation', 'Feedback', 'Motion'];

/* ---------- the newer components, and looks on the frame components ---------- */
import { MORE_PAGES, LOOK_PROP, LOOK_CONTROL, looksExample } from './ui-more.mjs';
const LOOKED = { 'glow-button': ['Get started', ''], 'glow-card': ['<h3>Realtime</h3><p>Live on every device.</p>', ''], input: ['Email', ' placeholder="you@site.com"'] };
for (const u of UI) if (LOOKED[u.slug]) {
  u.controls = [LOOK_CONTROL, ...(u.controls || [])];
  u.props = [LOOK_PROP, ...u.props];
  u.examples = [looksExample(u.tag, ...LOOKED[u.slug]), ...(u.examples || [])];
}
UI.push(...MORE_PAGES);
SECTIONS.splice(SECTIONS.indexOf('Navigation') + 1, 0, 'Overlays');
SECTIONS.splice(SECTIONS.indexOf('Feedback') + 1, 0, 'Data');
