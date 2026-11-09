// Pixel UI pages for the Liquid, Holo and Paper components (src/styles). Each sits in its usual
// section (Buttons, Cards, Text, Forms, Delight) and is marked new in the sidebar.
const LOOK = ['look', 'Look', 'seg', ['chrome', 'ink', 'water', 'honey'], 'chrome'];
const LOOK_PROP = def => ['look', '<code>chrome</code> <code>ink</code> <code>water</code> <code>honey</code>: the liquid\'s material', def];
const COLORS_PROP = ['colors', 'your own material, three colours: floor, horizon, sky (overrides look)', ''];
const HUE_PROP = ['hue', 'the projector colour, 0 to 360', '190'];
const SIZE_PROP = ['size', '<code>sm</code> <code>md</code> <code>lg</code>', 'md'];
const BTN_PROPS = [['type', '<code>button</code> <code>submit</code> <code>reset</code>', 'button'], ['href', 'makes it a link', ''], ['disabled', 'greyed out, can\'t be pressed', '']];

export const STYLE_PAGES = [
  /* ---------- buttons ---------- */
  { slug: 'liquid-button', name: 'Liquid button', section: 'Buttons', tag: 'piix-liquid-button', file: 'liquid-button', isNew: true,
    brief: 'A button made of liquid metal that reaches for your cursor.',
    about: 'Drawn on the GPU as a smooth signed distance field and shaded as a real material: chrome, glossy ink, clear water or honey, mirroring a studio with a hard horizon line. Its edge breathes; bring the pointer near and a bead of liquid stretches out toward it and joins back when you leave. Click and droplets splash out and fall back in.',
    demo: `<piix-liquid-button>Get started</piix-liquid-button>`,
    stage: { h: 260 },
    controls: [LOOK, ['size', 'Size', 'seg', ['sm', 'md', 'lg'], 'md']],
    examples: [
      { name: 'Looks', demo: `<piix-liquid-button>Chrome</piix-liquid-button>\n<piix-liquid-button look="ink">Ink</piix-liquid-button>\n<piix-liquid-button look="water">Water</piix-liquid-button>\n<piix-liquid-button look="honey">Honey</piix-liquid-button>` },
      { name: 'Your own material', note: 'Three colours: the floor it reflects, the bright horizon, the sky.', demo: `<piix-liquid-button colors="#0b2a1c,#eafff4,#4fc38a">Mint</piix-liquid-button>` },
      { name: 'Sizes', demo: `<piix-liquid-button size="sm">Small</piix-liquid-button>\n<piix-liquid-button>Medium</piix-liquid-button>\n<piix-liquid-button size="lg">Large</piix-liquid-button>` }
    ],
    props: [LOOK_PROP('chrome'), COLORS_PROP, ['text', 'label colour', 'the look\'s'], SIZE_PROP, ...BTN_PROPS],
    events: [['click', 'like any button']],
    a11y: ['A real, form-associated button: focusable, Enter and Space press it.', 'The liquid is drawn on a canvas hidden from screen readers.', 'With reduced motion it holds still.'] },

  { slug: 'holo-button', name: 'Holo button', section: 'Buttons', tag: 'piix-holo-button', file: 'holo-button', isNew: true,
    brief: 'A translucent button projected as a hologram.',
    about: 'A frosted pane in a rainbow foil frame that lights up where the pointer is, scanlines drifting through it and targeting brackets that close in on hover. Press it and the label glitches; it flickers on the first time it scrolls into view.',
    demo: `<piix-holo-button>Engage</piix-holo-button>`,
    stage: { h: 240 },
    controls: [['hue', 'Hue', 'seg', ['190', '300', '140', '40'], '190'], ['size', 'Size', 'seg', ['sm', 'md', 'lg'], 'md']],
    examples: [
      { name: 'Hues', demo: `<piix-holo-button>Engage</piix-holo-button>\n<piix-holo-button hue="300">Connect</piix-holo-button>\n<piix-holo-button hue="140">Scan</piix-holo-button>` },
      { name: 'Sizes', demo: `<piix-holo-button size="sm">Small</piix-holo-button>\n<piix-holo-button>Medium</piix-holo-button>\n<piix-holo-button size="lg">Large</piix-holo-button>` }
    ],
    props: [HUE_PROP, SIZE_PROP, ...BTN_PROPS],
    events: [['click', 'like any button']],
    a11y: ['A real, form-associated button.', 'Brackets, foil and scanlines are decoration.', 'With reduced motion there is no flicker or glitch.'] },

  { slug: 'paper-button', name: 'Paper button', section: 'Buttons', tag: 'piix-paper-button', file: 'paper-button', isNew: true,
    brief: 'Layers of cut paper, or a pen sketch that boils.',
    about: 'The cut look stacks three sheets of grainy card with real gaps between them: hover lifts the top sheet and the shadows open up, pressing squashes them flat. The sketch look is a hand-drawn outline redrawn a few times a second, the way a cartoon line boils, with hatching that scribbles in on hover.',
    demo: `<piix-paper-button>Sign up</piix-paper-button>`,
    stage: { h: 240, light: true },
    controls: [['look', 'Look', 'seg', ['cut', 'sketch'], 'cut'], ['size', 'Size', 'seg', ['sm', 'md', 'lg'], 'md']],
    examples: [
      { name: 'Sketch', demo: `<piix-paper-button look="sketch">Read more</piix-paper-button>\n<piix-paper-button look="sketch" ink="#1f4d7a">Contact</piix-paper-button>`, stage: { light: true } },
      { name: 'Colours', note: 'Three sheets, top first.', demo: `<piix-paper-button colors="#c9f2d9,#5fbf8f,#1f4d3a">Plant it</piix-paper-button>\n<piix-paper-button colors="#d8ecff,#6aa8e8,#1f3f73">Sail</piix-paper-button>`, stage: { light: true } }
    ],
    props: [['look', '<code>cut</code> <code>sketch</code>', 'cut'], ['colors', 'three sheets, top first (cut)', '#ffd8a8,#ff8a5c,#5a3d8a'], ['ink', 'line colour (sketch)', '#1d1a2b'], SIZE_PROP, ...BTN_PROPS],
    events: [['click', 'like any button']],
    a11y: ['A real, form-associated button.', 'With reduced motion the sketch line stops boiling.'] },

  /* ---------- cards ---------- */
  { slug: 'liquid-card', name: 'Liquid card', section: 'Cards', tag: 'piix-liquid-card', file: 'liquid-card', isNew: true,
    brief: 'A card whose face is liquid you can stir.',
    about: 'A glossy liquid surface on the GPU: slow swells roll across it, the pointer drags a wake through it, and a click drops a ring that spreads to the edges. The outline breathes like a drop holding its shape. Your content sits on top.',
    demo: `<piix-liquid-card>\n  <h3>Everything, forever.</h3>\n  <p>Stir the surface with your pointer. Click it.</p>\n</piix-liquid-card>`,
    stage: { h: 320 },
    controls: [['look', 'Look', 'seg', ['ink', 'chrome', 'water', 'honey'], 'ink']],
    examples: [
      { name: 'Light text on chrome', note: 'Bright materials want dark text: tone="light".', demo: `<piix-liquid-card look="chrome" tone="light">\n  <h3>Chrome</h3>\n  <p>A mirror you can stir.</p>\n</piix-liquid-card>` }
    ],
    props: [LOOK_PROP('ink'), COLORS_PROP, ['tone', '<code>dark</code> (white text) <code>light</code> (dark text)', 'dark'], ['radius', 'corner radius, px', '26']],
    a11y: ['The content is plain HTML on top; the liquid is a hidden canvas.', 'With reduced motion it holds still.'] },

  { slug: 'holo-card', name: 'Holo card', section: 'Cards', tag: 'piix-holo-card', file: 'holo-card', isNew: true,
    brief: 'A holographic trading card that tilts under your hand.',
    about: 'Like a rare foil card: it tilts toward the pointer in 3D while a rainbow foil slides across it at the angle of the light, sparkles glint in the foil, a glare follows you and faint scanlines remind you it\'s projected. On a phone, tap to wobble it.',
    demo: `<piix-holo-card style="width:250px">\n  <img src="showcase/nova.jpg" alt="">\n  <h3>Nova</h3>\n  <p>Legendary · #042</p>\n</piix-holo-card>`,
    stage: { h: 440 },
    controls: [['hue', 'Hue', 'seg', ['250', '320', '190', '30'], '250']],
    examples: [
      { name: 'Any content, any hue', demo: `<piix-holo-card hue="320" style="width:250px">\n  <h3>Ember</h3>\n  <p>Rare · #117. Put anything inside.</p>\n</piix-holo-card>` }
    ],
    props: [['hue', 'tint of the card\'s glass, 0 to 360', '250'], ['intensity', 'how strong the foil is, 0 to 1', '.7'], ['static', 'no tilt', '']],
    a11y: ['The content is plain HTML; foil, glare and sparkles are decoration.', 'With reduced motion it doesn\'t tilt.'] },

  { slug: 'paper-card', name: 'Paper card', section: 'Cards', tag: 'piix-paper-card', file: 'paper-card', isNew: true,
    brief: 'A card topped with a cut-paper diorama, or framed in pen.',
    about: 'The cut look puts a little paper diorama on top (hills, sea or city), each layer casting a shadow on the one behind and sliding at its own depth as the pointer moves. The sketch look is a boiling pen frame with a cross-hatched shadow and a strip of tape.',
    demo: `<piix-paper-card style="width:300px">\n  <h3>Weekend retreat</h3>\n  <p>Three days in the hills.</p>\n</piix-paper-card>`,
    stage: { h: 400, light: true },
    controls: [['scene', 'Scene', 'seg', ['hills', 'sea', 'city'], 'hills'], ['look', 'Look', 'seg', ['cut', 'sketch'], 'cut']],
    examples: [
      { name: 'Sea, your colours', note: 'Sky, sun, then three layers far to near.', demo: `<piix-paper-card scene="sea" colors="#d8f0ff,#ffe08a,#7cc4e8,#3f8fc2,#1f4d7a" style="width:300px">\n  <h3>Coastline</h3>\n  <p>Paper waves, layered.</p>\n</piix-paper-card>`, stage: { light: true, h: 400 } },
      { name: 'Sketch', demo: `<piix-paper-card look="sketch" style="width:300px">\n  <h3>Notes</h3>\n  <p>A pen-drawn frame that never sits still.</p>\n</piix-paper-card>`, stage: { light: true, h: 320 } }
    ],
    props: [['look', '<code>cut</code> <code>sketch</code>', 'cut'], ['scene', '<code>hills</code> <code>sea</code> <code>city</code> (cut)', 'hills'], ['colors', 'sky, sun, then three layers far to near', 'a warm dusk'], ['ink', 'line colour (sketch)', '#1d1a2b']],
    a11y: ['The scene is decoration and hidden from screen readers.', 'With reduced motion nothing slides or boils.'] },

  /* ---------- text ---------- */
  { slug: 'liquid-text', name: 'Liquid text', section: 'Text', tag: 'piix-liquid-text', file: 'liquid-text', isNew: true,
    brief: 'Words made of liquid metal that melt into the next word.',
    about: 'The letters are a liquid field on the GPU: their edges ripple, the pointer sends a wave through them, and with several words each one flows into the next like two drops merging. Shaded as chrome, ink, water or honey.',
    demo: `<piix-liquid-text words="Design|Build|Ship"></piix-liquid-text>`,
    stage: { h: 260 },
    controls: [LOOK, ['size', 'Size', 'seg', ['64', '96', '128'], '96']],
    examples: [
      { name: 'One word', demo: `<piix-liquid-text look="water">Fluid</piix-liquid-text>` },
      { name: 'Honey, slower', demo: `<piix-liquid-text look="honey" words="Slow|Sweet|Golden" every="3200"></piix-liquid-text>` }
    ],
    props: [['words', 'words to cycle, <code>|</code> between', 'the text inside'], ['every', 'ms per word', '2400'], LOOK_PROP('chrome'), COLORS_PROP, ['size', 'font size in px', '96'], ['font', 'a CSS font family', 'Bricolage Grotesque']],
    a11y: ['Screen readers get the current word as plain text, announced politely as it changes.', 'With reduced motion it shows the first word, still.'] },

  { slug: 'holo-text', name: 'Holo text', section: 'Text', tag: 'piix-holo-text', file: 'holo-text', isNew: true,
    brief: 'A headline projected as a hologram.',
    about: 'The words glow in projector light, split into cyan and magenta ghosts that drift apart and back, scanlines run through them, the beam fades toward the bottom, and now and then the projection stutters sideways. Hover to make it glitch.',
    demo: `<piix-holo-text>Signal acquired</piix-holo-text>`,
    stage: { h: 240 },
    controls: [['hue', 'Hue', 'seg', ['190', '300', '140', '40'], '190'], ['calm', 'Calm', 'seg', ['', 'calm'], '']],
    examples: [
      { name: 'Magenta, calm', demo: `<piix-holo-text hue="300" calm>Standing by</piix-holo-text>` }
    ],
    props: [HUE_PROP, ['size', 'font size in px', 'fits, up to 88'], ['calm', 'no stutters, just the glow and scanlines', '']],
    a11y: ['Announced as a heading with its plain text.', 'With reduced motion nothing drifts or glitches.'] },

  { slug: 'paper-text', name: 'Paper text', section: 'Text', tag: 'piix-paper-text', file: 'paper-text', isNew: true,
    brief: 'A headline a pen draws, then fills with cut paper.',
    about: 'When it scrolls into view a pen traces every letter, then the word fills in as stacked sheets of coloured paper, each a step behind the last, and a scribble underlines it. The pen line keeps a gentle boil. The sketch look keeps only the pen.',
    demo: `<piix-paper-text underline>Hand made</piix-paper-text>`,
    stage: { h: 260, light: true },
    controls: [['look', 'Look', 'seg', ['cut', 'sketch'], 'cut']],
    examples: [
      { name: 'Sketch', demo: `<piix-paper-text look="sketch">or just sketched</piix-paper-text>`, stage: { light: true } },
      { name: 'Colours', note: 'Top sheet first.', demo: `<piix-paper-text colors="#c9f2d9,#5fbf8f,#2f8a63,#1f4d3a" underline>Fresh</piix-paper-text>`, stage: { light: true } }
    ],
    props: [['look', '<code>cut</code> <code>sketch</code>', 'cut'], ['colors', 'top sheet, then the sheets below', '#ffd23f,#ff8a5c,#e2477a,#5a3d8a'], ['ink', 'pen colour', '#1d1a2b'], ['size', 'font size in px', '96'], ['underline', 'draw a scribbled underline', ''], ['font', 'a CSS font family', '']],
    a11y: ['Announced as a heading with its plain text.', 'With reduced motion it appears finished.'] },

  /* ---------- forms ---------- */
  { slug: 'liquid-toggle', name: 'Liquid toggle', section: 'Forms', tag: 'piix-liquid-toggle', file: 'liquid-toggle', isNew: true,
    brief: 'A switch whose knob is a drop of liquid metal.',
    about: 'Flip it and the drop stretches across the track with a tail of liquid trailing behind, then snaps back into a bead as the track darkens. A real switch for forms.',
    demo: `<piix-liquid-toggle label="Dark mode"></piix-liquid-toggle>`,
    stage: { h: 220 },
    controls: [LOOK],
    examples: [
      { name: 'In a form', demo: `<label style="display:flex;gap:12px;align-items:center;color:#fff">\n  <piix-liquid-toggle name="alerts" checked label="Alerts"></piix-liquid-toggle> Alerts\n</label>` }
    ],
    props: [['checked', 'on', ''], ['name', 'form field name (sends <code>on</code>)', ''], ['label', 'accessible name', 'Toggle'], LOOK_PROP('chrome'), COLORS_PROP],
    events: [['change', 'when it flips']],
    a11y: ['A real switch: role="switch", Space and Enter flip it, aria-checked follows it.', 'Form-associated.', 'With reduced motion it jumps without the stretch.'] },

  { slug: 'holo-input', name: 'Holo input', section: 'Forms', tag: 'piix-holo-input', file: 'holo-input', isNew: true,
    brief: 'A text field projected like a HUD.',
    about: 'A translucent field: targeting brackets lock onto it when focused, a scan line sweeps across, the label lifts into a readout, and every keystroke blips a character up out of the field. A real input underneath.',
    demo: `<piix-holo-input label="Callsign" style="width:340px"></piix-holo-input>`,
    stage: { h: 240 },
    controls: [['hue', 'Hue', 'seg', ['190', '300', '140', '40'], '190']],
    examples: [
      { name: 'Password', demo: `<piix-holo-input label="Access code" type="password" hue="300" style="width:340px"></piix-holo-input>` }
    ],
    props: [['label', 'the label', 'Input'], ['name, type, value, placeholder, required, autocomplete', 'as on <code>&lt;input&gt;</code>', ''], HUE_PROP],
    events: [['input', 'as you type'], ['change', 'when the value is committed']],
    a11y: ['A real input with a real label: autofill, forms and validation all work.', 'Blips and sweeps are decoration; with reduced motion they stop.'] },

  /* ---------- delight ---------- */
  { slug: 'paper-sticker', name: 'Paper sticker', section: 'Delight', tag: 'piix-paper-sticker', file: 'paper-sticker', isNew: true,
    brief: 'A die-cut sticker badge whose corner peels.',
    about: 'A vinyl sticker with a thick white die-cut border, stuck on at a jaunty angle. Hover and its corner curls back to show the shiny backing; click and it slaps back down. Pill, circle or star.',
    demo: `<piix-paper-sticker>New</piix-paper-sticker>`,
    stage: { h: 240, light: true },
    controls: [['shape', 'Shape', 'seg', ['pill', 'circle', 'star'], 'pill']],
    examples: [
      { name: 'Shapes and colours', demo: `<piix-paper-sticker>New</piix-paper-sticker>\n<piix-paper-sticker color="#5cffb0" shape="circle" tilt="8">50% off</piix-paper-sticker>\n<piix-paper-sticker color="#ff8ad8" shape="star" tilt="-10">Hot</piix-paper-sticker>`, stage: { light: true } }
    ],
    props: [['color', 'sticker colour', '#ffd23f'], ['ink', 'text colour', '#1d1a2b'], ['shape', '<code>pill</code> <code>circle</code> <code>star</code>', 'pill'], ['tilt', 'degrees', '-6']],
    a11y: ['Its text is plain and read as normal.', 'With reduced motion it doesn\'t peel.'] }
];
