// Pixel UI docs: the ASCII section. One page per scene of <piix-ascii>.
const SCENES = [
  ['glow', 'ascii-glow', 'Glow horizon', 'A pale world rising from below, its atmosphere burning blue and thinning into noise.',
    'The hero background: a great curve of light at the bottom of the frame, deep blue at the rim, fading up through cyan into a field of drifting characters, all over a soft haze of the same light. Made for light pages: put your headline on top.', true],
  ['flow', 'ascii-flow', 'Liquid flow', 'A slow, domain-warped gradient that pours through the characters.',
    'Layers of noise folded into each other, so the colour flows like ink in water. The pointer pushes the current aside.'],
  ['aurora', 'ascii-aurora', 'Aurora', 'Curtains of light rippling over a starry sky.',
    'Three bands of aurora sway and shimmer above a dark horizon, with stars twinkling between them. They lift toward the pointer.'],
  ['ocean', 'ascii-ocean', 'Moonlit ocean', 'Swells rolling toward you under a full moon, and its road across the water.',
    'A real perspective sea: rows of swells come at you, and the moonlight breaks into a glittering path on the water. The moon drifts with the pointer.'],
  ['terrain', 'ascii-terrain', 'Mountain flight', 'Fly low over a ridged mountain range toward a setting sun.',
    'A ray-marched landscape: ridges and snowy peaks lit from the side, fog thickening with distance and the sun burning on the horizon, flying forward forever. The pointer banks the camera.'],
  ['galaxy', 'ascii-galaxy', 'Spiral galaxy', 'A spiral galaxy turning slowly, dust lanes and all.',
    'Logarithmic spiral arms threaded with dust, a blazing core and a scatter of twinkling stars. It drifts toward the pointer.'],
  ['planet', 'ascii-planet', 'Planet', 'A planet turning in space: continents, cloud and a lit atmosphere.',
    'Oceans and continents rotate past, clouds drift over them, the limb glows where the sunlight grazes the atmosphere. Move the pointer to move the sun.'],
  ['city', 'ascii-city', 'Night city', 'Three layers of skyline sliding past, windows switching on and off.',
    'A city at night in parallax, its windows laid on the character grid and flickering on and off as people come and go, under a moon and a few stars.'],
  ['tunnel', 'ascii-tunnel', 'Warp tunnel', 'Down an endless tunnel of light.',
    'Rings and panels rush past toward a dark centre that follows the pointer.'],
  ['rain', 'ascii-rain', 'Digital rain', 'Columns of characters falling, each at its own speed.',
    'Every column has its own speed and trail length, with a bright head and characters that keep changing as they fall.'],
  ['storm', 'ascii-storm', 'Storm', 'Storm clouds rolling by, lit from inside by lightning.',
    'Billowing clouds drift past, and every so often lightning flashes inside one of them. The pointer lights them too.'],
  ['dunes', 'ascii-dunes', 'Dunes', 'Desert dunes under a low sun, the air shimmering with heat.',
    'Four ridges of dunes, lit on their sunny side, with heat haze rippling the air and a big low sun that follows the pointer.']
];
const hero = (scene, light) => `<section style="position:relative;height:440px;display:grid;place-content:center;justify-items:center;gap:14px;text-align:center;${light ? 'background:#fff;color:#0a1a8c' : 'background:#05040a;color:#fff'}">
  <piix-ascii scene="${scene}" fill></piix-ascii>
  <h2 class="ex-h2">Build in ASCII.</h2>
  <p style="margin:0;font-size:18px;opacity:.85">A whole world behind your words.</p>
  <piix-glow-button>Get started</piix-glow-button>
</section>`;
const asciiPage = ([scene, slug, name, brief, about, light]) => ({
  slug, name, section: 'ASCII', tag: 'piix-ascii', file: 'ascii', brief, about,
  demo: `<piix-ascii scene="${scene}" height="460px"></piix-ascii>`,
  stage: { h: 460, pad: 0, light: !!light },
  controls: [['palette', 'Colours', 'palette', ''], ['chars', 'Characters', 'seg', ['', 'blocks', 'binary', 'dots'], ''], ['haze', 'Haze', 'range', [0, 1, .05, light ? .8 : .55]], ['pixel', 'Pixel', 'range', [1, 4, 1, 2]]],
  examples: [
    { name: 'As a hero', note: 'With <code>fill</code> it sits behind everything else in its section.', demo: hero(scene, light), stage: { pad: 0, block: true } },
    { name: 'Other characters', note: '<code>chars</code> swaps the character ramp: blocks, binary, or dots.',
      demo: `<div class="ex-row">\n  <piix-ascii scene="${scene}" chars="blocks" height="200px"></piix-ascii>\n  <piix-ascii scene="${scene}" chars="binary" height="200px"></piix-ascii>\n  <piix-ascii scene="${scene}" chars="dots" height="200px"></piix-ascii>\n</div>`, stage: { pad: 0, light: !!light } },
    { name: 'Repainted', note: 'Any palette, or your own colours from dark to light.',
      demo: `<div class="ex-row">\n  <piix-ascii scene="${scene}" palette="sunset" height="200px"></piix-ascii>\n  <piix-ascii scene="${scene}" palette="lime" height="200px"></piix-ascii>\n  <piix-ascii scene="${scene}" palette="#04020a,#ff3d77,#ffd23f,#ffffff" height="200px"></piix-ascii>\n</div>`, stage: { pad: 0 } }
  ],
  props: [
    ['scene', SCENES.map(s => `<code>${s[0]}</code>`).join(' '), 'glow'],
    ['palette', 'any Pixel UI palette, or your colours dark to light: <code>#0a1a8c,#2b8cff,#ffffff</code>', "the scene's own"],
    ['chars', '<code>ascii</code> <code>blocks</code> <code>binary</code> <code>dots</code>', 'ascii'],
    ['haze', 'how much soft glow behind the characters, 0 to 1', '.55'],
    ['pixel', 'size of one font pixel, in px (a character is 6 by 9 of them)', '2'],
    ['speed', '1 is normal, 0 holds still', '1'], ['height', 'when not filling: px or any CSS length', '420px'], ['fill', 'sit behind the content of the parent element', '']
  ],
  a11y: ['Announced as an image describing the scene, unless it fills a parent (then it is decoration).', 'With reduced motion it renders one still frame.', 'All in one shader: no fonts or images to download; the font is drawn by the GPU.']
});
export const ASCII_PAGES = SCENES.map(asciiPage);
