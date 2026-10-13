// Pixel UI docs: the newer components (overlays, data, slider, keycaps) and the looks.
const PX = def => ['pixel', 'size of one pixel, in px', String(def)];
const LOOKS = ['glow', 'chrome', 'glass', 'riso', 'crt'];
export const LOOK_PROP = ['look', LOOKS.map(l => `<code>${l}</code>`).join(' ') + ': the whole style. See <a href="looks.html">Looks</a>', 'glow'];
export const LOOK_CONTROL = ['look', 'Look', 'seg', LOOKS, 'glow'];

/* the same component in every look, over a scene so glass has something to frost */
export const looksExample = (tag, inner, attrs = '') => ({
  name: 'Looks', note: 'One attribute changes the whole style. Glass blurs whatever is behind it, so it shines over a scene or a photo.',
  demo: `<div class="ex-scene">\n  <piix-scene kind="vista" fill></piix-scene>\n${LOOKS.map(l => `  <${tag} look="${l}"${attrs}>${inner}</${tag}>`).join('\n')}\n</div>`,
  stage: { pad: 0, block: true }
});

export const MORE_PAGES = [
  /* ---------- overlays ---------- */
  { slug: 'dialog', name: 'Dialog', section: 'Overlays', tag: 'piix-dialog', file: 'dialog',
    brief: 'A modal that dissolves in, pixel by pixel, in any look.',
    about: "It's the browser's own <code>&lt;dialog&gt;</code> underneath, so focus is trapped inside, Escape closes it and focus goes back where it came from. The panel is drawn on the GPU and dissolves in over a dithered backdrop. Anything with <code>data-piix-open=\"its id\"</code> opens it; anything inside with <code>data-close</code> closes it, and so does clicking the backdrop.",
    demo: `<piix-glow-button data-piix-open="deploy">Deploy</piix-glow-button>

<piix-dialog id="deploy">
  <h2>Deploy to production?</h2>
  <p>This publishes 14 changes. You can roll back at any time.</p>
  <piix-glow-button data-close>Deploy now</piix-glow-button>
</piix-dialog>`,
    stage: { h: 220 },
    examples: [
      { name: 'Frosted glass', note: 'With <code>look="glass"</code> the page behind blurs through the panel.',
        demo: `<piix-glow-button look="glass" data-piix-open="glassy">Open</piix-glow-button>\n\n<piix-dialog id="glassy" look="glass">\n  <h2>Frosted</h2>\n  <p>Everything behind me is blurred, the rim and the glare are pixels.</p>\n  <piix-glow-button look="glass" data-close>Lovely</piix-glow-button>\n</piix-dialog>`,
        show: `<div class="ex-scene"><piix-scene kind="sakura" fill></piix-scene><piix-glow-button look="glass" data-piix-open="glassy">Open</piix-glow-button></div><piix-dialog id="glassy" look="glass"><h2>Frosted</h2><p>Everything behind me is blurred, the rim and the glare are pixels.</p><piix-glow-button look="glass" data-close>Lovely</piix-glow-button></piix-dialog>`, stage: { pad: 0, block: true } },
      { name: 'Terminal', demo: `<piix-glow-button look="crt" data-piix-open="term">Run</piix-glow-button>\n\n<piix-dialog id="term" look="crt">\n  <h2>rm -rf node_modules?</h2>\n  <p>This frees 1.2 GB. It also means a long npm install.</p>\n  <piix-glow-button look="crt" data-close>yes, do it</piix-glow-button>\n</piix-dialog>` }
    ],
    props: [['open', 'open it; or call <code>.show()</code> and <code>.close()</code>', ''], LOOK_PROP, ['palette', 'the colours of the light', "violet, or the look's own"], ['width', 'any CSS length', '520px'], PX(3)],
    events: [['open', 'when it opens'], ['close', 'when it closes, however that happened']],
    a11y: ['A real modal dialog: focus is trapped inside and Escape closes it.', 'It is labelled by its first heading.', 'Focus goes back to whatever opened it.', 'With reduced motion it simply appears.'] },

  { slug: 'toast', name: 'Toast', section: 'Overlays', tag: 'piix-toaster', file: 'toast',
    brief: 'Notifications with a pixel fuse that burns down while they are up.',
    about: 'Call <code>Piixpal.toast()</code> from anywhere. Toasts step in from the corner, stack up, and along the bottom a thin pixel fuse burns down with a spark at its tip. When it runs out the toast wipes away. Hover or focus one and the fuse stops. Add a <code>&lt;piix-toaster&gt;</code> if you want to choose the corner or the theme.',
    demo: `<piix-glow-button onclick="Piixpal.toast('Your changes are live.', { tone: 'ok', title: 'Deployed', action: { label: 'View site' } })">Success</piix-glow-button>
<piix-glow-button palette="sunset" onclick="Piixpal.toast('That card was declined.', { tone: 'error', title: 'Payment failed' })">Error</piix-glow-button>
<piix-glow-button palette="ocean" onclick="Piixpal.toast('Copied to clipboard')">Info</piix-glow-button>`,
    code: `Piixpal.toast('Copied to clipboard');

Piixpal.toast('Your changes are live.', {
  tone: 'ok',            // info | ok | warn | error
  title: 'Deployed',
  duration: 4.5,         // seconds; 0 stays until closed
  action: { label: 'View site', onClick: () => open('/') }
});`,
    stage: { h: 200 },
    examples: [
      { name: 'Light, at the top', note: 'One toaster per page sets where and how they show.',
        demo: `<piix-toaster position="top" theme="light"></piix-toaster>`, show: '<p style="margin:0;opacity:.7">Set on the page: <code>&lt;piix-toaster position="top" theme="light"&gt;</code></p>' }
    ],
    props: [['tone', '<code>info</code> <code>ok</code> <code>warn</code> <code>error</code>', 'info'], ['title', 'a bold first line', ''], ['duration', 'seconds before it burns out; 0 keeps it', '4.5'], ['action', '<code>{ label, onClick }</code>: a button in the toast', ''],
      ['position (toaster)', '<code>bottom-right</code> <code>bottom-left</code> <code>top-right</code> <code>top-left</code> <code>bottom</code> <code>top</code>', 'bottom-right'], ['theme (toaster)', '<code>dark</code> <code>light</code>', 'dark']],
    a11y: ['Errors are announced straight away; everything else politely.', 'Hover or focus pauses the timer, so nobody loses a toast while reading it.', 'Every toast can be dismissed with its close button.'] },

  { slug: 'tooltip', name: 'Tooltip', section: 'Overlays', tag: 'piix-tooltip', file: 'tooltip',
    brief: 'A pixel speech bubble that types its words out.',
    about: 'Wrap anything. On hover or focus a bubble with a stepped pixel tail pops up and the text types itself in behind a blinking block cursor. It flips below when there is no room above, floats over everything so it never gets clipped, and Escape hides it.',
    demo: `<piix-tooltip tip="Copy link">
  <piix-button tone="paper" size="sm">Share</piix-button>
</piix-tooltip>
<piix-tooltip tip="Saved for later" theme="light">
  <piix-button tone="sun" size="sm">Bookmark</piix-button>
</piix-tooltip>`,
    stage: { h: 220 },
    props: [['tip', 'the words', ''], ['side', '<code>top</code> <code>bottom</code>', 'top'], ['theme', '<code>dark</code> <code>light</code>', 'dark'], ['delay', 'ms before it shows', '150']],
    a11y: ['The tip describes the element inside (<code>aria-describedby</code>), so screen readers read it.', 'It shows on keyboard focus too, and Escape hides it.', 'With reduced motion the words appear at once.'] },

  /* ---------- data ---------- */
  { slug: 'chart', name: 'Chart', section: 'Data', tag: 'piix-chart', file: 'chart',
    brief: 'Small dithered area, line and bar charts, drawn on the GPU.',
    about: "An area chart's fill fades out in a dither instead of a gradient, with the line on top in the brightest colour; bars are stepped columns shaded from the top. It sweeps in from the left the first time it's on screen. Hover it and a crosshair snaps to the nearest point and shows the label and value.",
    demo: `<piix-chart values="12,18,14,24,30,26,38,34,42,48,44,56"
  labels="Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec" suffix="k"></piix-chart>`,
    stage: { h: 300, narrow: false, block: false },
    controls: [['kind', 'Kind', 'seg', ['area', 'line', 'bars'], 'area'], ['palette', 'Palette', 'palette', 'lime'], ['pixel', 'Pixel', 'range', [2, 6, 1, 3]]],
    examples: [
      { name: 'Bars', demo: `<piix-chart kind="bars" values="4,7,5,9,12,8,14" labels="Mon,Tue,Wed,Thu,Fri,Sat,Sun" palette="sunset"></piix-chart>` },
      { name: 'In a stat card', demo: `<div class="ex-stat">\n  <small>Revenue</small>\n  <strong>$48.2k</strong>\n  <piix-chart kind="line" values="3,4,4,6,5,8,9,8,11,13" height="70px" palette="ocean"></piix-chart>\n</div>` }
    ],
    props: [['values', 'the numbers, comma separated (up to 256)', ''], ['labels', 'a label for each', ''], ['kind', '<code>area</code> <code>line</code> <code>bars</code>', 'area'], ['suffix', 'after each value, like % or ms', ''], ['min', 'where the axis starts', '0'], ['palette', 'its colours', 'lime'], ['height', 'px or any CSS length', '220px'], PX(3)],
    a11y: ['Screen readers get the numbers as a table, plus a one-line summary.', 'With reduced motion it is drawn at full height straight away.'] },

  { slug: 'flap-board', name: 'Flap board', section: 'Data', tag: 'piix-flap', file: 'flap',
    brief: 'A split-flap board, like a station departures sign. It can count down too.',
    about: 'Every tile riffles through the alphabet, flap by flap, until it lands on its letter, a beat after the one before. Change the text and it flips again. With a <code>countdown</code> it shows days, hours, minutes and seconds and keeps ticking: made for launch pages.',
    demo: `<piix-flap text="NOW BOARDING" length="13"></piix-flap>`,
    stage: { h: 200, replay: true },
    controls: [['theme', 'Theme', 'seg', ['dark', 'light', 'amber'], 'dark']],
    examples: [
      { name: 'Launch countdown', demo: `<piix-flap countdown="2026-12-31T00:00:00" theme="amber"></piix-flap>` },
      { name: 'Live text', note: 'Set <code>text</code> from your code and it flips to the new words.', demo: `<piix-flap id="gate" text="GATE 12" length="8" theme="light"></piix-flap>\n<piix-button tone="ink" size="sm" onclick="gate.setAttribute('text', gate.getAttribute('text') === 'GATE 12' ? 'DELAYED' : 'GATE 12')">Change</piix-button>`, stage: { light: true } }
    ],
    props: [['text', "what it says: letters, digits, spaces and : . - / ! ? ' &amp; +", ''], ['length', 'pad it to this many tiles', ''], ['countdown', 'a date and time to count down to', ''], ['theme', '<code>dark</code> <code>light</code> <code>amber</code>', 'dark'], ['font-size', '(CSS) sets the size of the tiles', 'clamp(22px, 5vw, 56px)']],
    a11y: ['Screen readers get the words, not the flapping.', 'A countdown is a timer and is not announced every second.', 'With reduced motion the tiles change without flipping.'] },

  /* ---------- forms ---------- */
  { slug: 'slider', name: 'Slider', section: 'Forms', tag: 'piix-slider', file: 'slider',
    brief: 'A range input whose track is lit on the GPU.',
    about: 'The filled part of the track glows through the palette with a slow shimmer; the head is a bright pixel block with a halo, and dragging it fast throws sparks behind it. While you drag or focus it, the value floats above the head.',
    demo: `<piix-slider name="volume" value="64" suffix="%">Volume</piix-slider>`,
    stage: { h: 200, narrow: true },
    controls: [['palette', 'Palette', 'palette', 'lime']],
    examples: [{ name: 'Steps and a range', demo: `<piix-slider value="40" min="0" max="200" step="10" suffix="ms" palette="candy">Delay</piix-slider>`, stage: { narrow: true } }],
    props: [['value, min, max, step', 'as on a range input', '50, 0, 100, 1'], ['name', 'the form field name', ''], ['suffix', 'shown after the value', ''], ['palette', 'the colours of the light', 'lime'], ['disabled', '', ''], PX(3)],
    events: [['input', 'while it moves'], ['change', 'when you let go, or after a key press']],
    a11y: ['A real slider: arrow keys, Page Up/Down, Home and End move it.', 'Screen readers hear its label, value and suffix.', 'Form-associated: it submits and resets with its form.'] },

  /* ---------- text ---------- */
  { slug: 'keycap', name: 'Keycap', section: 'Text', tag: 'piix-kbd', file: 'kbd',
    brief: 'Pixel keycaps that press down when you press the real key.',
    about: 'Chunky keycaps with a lit top and a skirt underneath, for shortcut hints, onboarding and docs. Press that key on your keyboard and the cap goes down with you. Symbols like ⌘ ⇧ ⌥ ↵ and words like esc, ctrl and shift know which key they are.',
    demo: `<p>Press <piix-kbd>⌘</piix-kbd> <piix-kbd>K</piix-kbd> to search, <piix-kbd>esc</piix-kbd> to close.</p>`,
    stage: { h: 180, light: true },
    controls: [['theme', 'Theme', 'seg', ['light', 'dark', 'lime'], 'light'], ['size', 'Size', 'seg', ['sm', 'md', 'lg'], 'md']],
    examples: [{ name: 'Arrow keys', note: 'Try them.', demo: `<piix-kbd theme="dark">↑</piix-kbd>\n<piix-kbd theme="dark">←</piix-kbd>\n<piix-kbd theme="dark">↓</piix-kbd>\n<piix-kbd theme="dark">→</piix-kbd>` }],
    props: [['key', 'the key to listen for, if the label is not it', 'its label'], ['theme', '<code>light</code> <code>dark</code> <code>lime</code>', 'light'], ['size', '<code>sm</code> <code>md</code> <code>lg</code>', 'md']],
    a11y: ['It is a <code>&lt;kbd&gt;</code> element, read as keyboard text.'] }
];
