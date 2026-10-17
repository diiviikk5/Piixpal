// Pixel UI docs: games and sound. Breakout, the RPG dialogue box, the handheld console and chiptune.
const SOUND = ['sound', 'make sounds even without <code>&lt;piix-chiptune&gt;</code>; <code>off</code> keeps it silent', ''];
const TONES = ['lime', 'coral', 'violet', 'sky', 'sun', 'mint', 'ink', 'paper'];

export const GAME_PAGES = [
  { slug: 'breakout', name: 'Breakout', section: 'Games & sound', tag: 'piix-breakout', file: 'breakout', needs: ['bitbug'],
    brief: 'Your words are the bricks. Press play and the text becomes a level.',
    about: "Whatever you put inside stays normal, readable content until someone presses Play. Then every word becomes a brick right where it sits: a ball comes off a paddle with a pal riding it, and each word it hits shatters into pixels of its own colour and is gone from the page. Clear them all to win; lose every ball and the words fly back into place. Words inside an element with <code>data-solid</code> are steel: the ball bounces off them, but they never break.",
    demo: `<piix-breakout pal="bitbug">
  <h2 class="ex-h2">Break every word in this heading</h2>
  <p>And this line too, <b data-solid>if</b> you can.</p>
</piix-breakout>`,
    stage: { light: true, block: true, pad: 44, hint: 'Pointer or arrow keys move, Space launches.' },
    controls: [['tone', 'Ball &amp; paddle', 'seg', TONES.slice(0, 5), 'lime'], ['speed', 'Speed', 'seg', ['0.7', '1', '1.4'], '1'], ['lives', 'Lives', 'seg', ['1', '3', '5'], '3']],
    examples: [
      { name: 'A whole section', note: 'Bold, links and different sizes all become bricks of their own colour.',
        demo: `<piix-breakout pal="kitty" tone="coral" field="170">\n  <p><b>Changelog</b></p>\n  <h2 class="ex-h2">Faster builds, <a href="#">smaller bundles</a></h2>\n  <p>Cold starts are <b>3× quicker</b>, and the core is now 29 KB gzipped.</p>\n</piix-breakout>`, stage: { light: true, block: true, pad: 36 } },
      { name: 'React to the score', note: 'Every brick, win and loss is an event.',
        demo: `<piix-breakout id="game" pal="none" tone="sky">\n  <h3 class="ex-h3">Clear this line to unlock a coupon</h3>\n</piix-breakout>\n\n<script>\n  game.addEventListener('win', e => game.querySelector('h3').textContent = 'Unlocked: PIXEL20');\n</script>`,
        stage: { light: true, block: true, pad: 36 } }
    ],
    props: [['pal', 'the pal riding the paddle, or <code>none</code>', 'bitbug'], ['lives', 'balls you get', '3'], ['speed', 'how fast the ball is, 0.5 to 2', '1'], ['tone', TONES.map(t => `<code>${t}</code>`).join(' '), 'lime'], ['field', 'room under the words for the paddle, in px', '150'], SOUND,
      ['data-solid', 'on any element inside: its words are steel and never break', '']],
    events: [['start', 'a game begins'], ['brick', 'a word breaks: <code>detail.word</code>, <code>detail.score</code>'], ['win', 'every word is gone: <code>detail.score</code>'], ['lose', 'the last ball is lost: <code>detail.score</code>']],
    methods: [['play()', 'start a new game'], ['pause()', 'pause it'], ['reset()', 'put every word back and stop']],
    a11y: ['The content is never replaced: screen readers read your words as normal, even mid-game.', 'Fully keyboard playable: Space launches, arrow keys or A/D move, Escape pauses.', 'Lives, misses and the final score are announced.', 'With reduced motion, fewer pixels fly when a word breaks.'] },

  { slug: 'rpg-box', name: 'RPG dialogue', section: 'Games & sound', tag: 'piix-rpg-box', file: 'rpg-box', needs: ['kitty'],
    brief: 'A JRPG dialogue box: a pal talks, the words type out, you pick an answer.',
    about: "Every child is one page of dialogue. The words type out letter by letter, keeping your markup (bold, links, line breaks), while the pal in the portrait talks, with a short beat after every full stop. Click, Enter or Space finishes the page or turns to the next. A <code>&lt;menu&gt;</code> of buttons becomes a choice with a blinking cursor, and <code>data-goto=\"an id\"</code> jumps to that page, so a conversation can branch. It starts typing when it scrolls into view.",
    demo: `<piix-rpg-box pal="kitty" name="Kit">
  <p>Oh! A visitor. Nobody comes down here anymore.</p>
  <p>Want to see what I've been <b>building</b>?</p>
  <menu>
    <button data-goto="tour">Show me!</button>
    <button>Maybe later</button>
  </menu>
  <p data-end>Alright. I'll be here, typing.</p>
  <p id="tour" data-clip="hop">Follow me! It's 124 pals deep.</p>
</piix-rpg-box>`,
    stage: { h: 260, narrow: true, replay: true },
    controls: [['theme', 'Theme', 'seg', ['classic', 'dark', 'paper', 'lime'], 'classic'], ['speed', 'Speed', 'seg', ['20', '40', '80'], '40'], ['pal', 'Speaker', 'seg', ['kitty', 'bitbug', 'frog', 'none'], 'kitty']],
    examples: [
      { name: 'Two speakers', note: '<code>data-pal</code> and <code>data-name</code> on a page change who says it.',
        demo: `<piix-rpg-box theme="paper" pal="bitbug" name="Bitbug" loop auto="1800">\n  <p>I crawl on headings for a living.</p>\n  <p data-name="Kit" data-pal="kitty">And I nap on paragraphs.</p>\n  <p data-clip="alarm">Wait, someone's reading this?!</p>\n</piix-rpg-box>`, stage: { light: true, narrow: true } },
      { name: 'Onboarding that branches', note: 'Listen for <code>choice</code> to act on the answer.',
        demo: `<piix-rpg-box id="guide" theme="dark" pal="frog" name="Guide">\n  <p>First time here?</p>\n  <menu>\n    <button value="new">Yes, show me around</button>\n    <button value="back" data-goto="welcome-back">No, I've been before</button>\n  </menu>\n  <p data-end>Great! Start with <b>Install</b> in the sidebar.</p>\n  <p id="welcome-back">Welcome back. New this week: <b>games</b>.</p>\n</piix-rpg-box>\n\n<script>\n  guide.addEventListener('choice', e => console.log(e.detail.value));\n</script>`,
        stage: { narrow: true } },
      { name: 'Say it from code', demo: `<piix-rpg-box id="npc" theme="lime" pal="kitty" name="Kit"><p>Click the button.</p></piix-rpg-box>\n<piix-button tone="ink" size="sm" onclick="npc.say('Saved! Your <b>progress</b> is safe.', { clip: 'hop' })">Save</piix-button>`, stage: { light: true, narrow: true } }
    ],
    props: [['pal', 'the pal in the portrait (any pal name, or <code>none</code>)', 'none'], ['name', "the speaker's name, shown on the box", ''], ['theme', '<code>classic</code> <code>dark</code> <code>paper</code> <code>lime</code>', 'classic'], ['speed', 'letters per second', '40'], ['voice', 'how high the typing blips are, 0.5 to 2', '1'], ['lines', 'the text area is at least this many lines tall', '3'], ['auto', 'turn the page by itself after this many ms', ''], ['loop', 'start again after the last page', ''], ['font', '<code>pixel</code> or <code>inherit</code> (your page font)', 'pixel'], SOUND,
      ['data-pal, data-name', 'on a page: who says this one', ''], ['data-clip', "on a page: the portrait's mood, any of that pal's clips", ''], ['data-speed', 'on a page: letters per second for it', ''], ['data-end', 'on a page: the conversation ends here', ''], ['data-goto', 'on a choice: the id of the page to jump to', '']],
    events: [['page', 'a page starts: <code>detail.index</code>, <code>detail.id</code>'], ['choice', 'an answer is picked: <code>detail.value</code>, <code>detail.label</code>, <code>detail.index</code>'], ['done', 'the conversation ends']],
    methods: [['next()', 'finish the page, or turn to the next'], ['restart()', 'from the first page'], ['say(html, { pal, name, clip })', 'say something new, right now']],
    a11y: ['Screen readers get each whole page at once through a live region, not letter by letter.', 'Choices are real buttons: arrow keys move, Enter picks, focus stays inside the box.', 'With reduced motion the words appear whole and the portrait stays still.'] },

  { slug: 'handheld', name: 'Handheld', section: 'Games & sound', tag: 'piix-handheld', file: 'handheld',
    brief: 'A pocket game console, and anything you put inside plays on its screen.',
    about: "A chunky handheld with a power light, a D-pad, A and B, Select and Start. Your content stays live, real HTML on its screen, recoloured into four LCD shades with a dot-matrix grid on top: links work, text can be selected. The D-pad scrolls and hops a cursor between links, A presses, B goes back to the top, Select changes the screen colours and Start boots it again. Every press fires a cancelable <code>press</code> event first, so you can build your own game on it.",
    demo: `<piix-handheld>
  <h3>SAVE FILE 1</h3>
  <p>Real HTML, shown in four shades of green.</p>
  <p><a href="#">Continue</a><br><a href="#">New game</a><br><a href="#">Options</a></p>
  <p>Scroll with the D-pad. Press SELECT to change the screen.</p>
</piix-handheld>`,
    stage: { h: 640, light: true, replay: true },
    controls: [['screen', 'Screen', 'seg', ['dmg', 'pocket', 'light', 'grape', 'color'], 'dmg'], ['color', 'Shell', 'seg', ['classic', 'lime', 'grape', 'ink', 'coral'], 'classic']],
    examples: [
      { name: 'Your blog, as a cartridge', note: 'Images are recoloured too.',
        demo: `<piix-handheld color="ink" screen="pocket" width="280px">\n  <img src="../site/launch-poster.jpg" alt="Piixpal launch" style="width:100%">\n  <h3>Patch notes 0.5</h3>\n  <p>Games arrived: breakout, dialogue and this very console.</p>\n  <a href="#">Read more</a>\n</piix-handheld>`, stage: { h: 560, light: true } },
      { name: 'A game of your own', note: 'Cancel the press and do your own thing with the buttons.',
        demo: `<piix-handheld id="gb" color="lime" screen="grape" boot="off" width="260px">\n  <p id="pos" style="font-size:28px;text-align:center;margin-top:40px">◆</p>\n</piix-handheld>\n\n<script>\n  let x = 0;\n  gb.addEventListener('press', e => {\n    const b = e.detail.button;\n    if (b !== 'left' && b !== 'right') return;\n    e.preventDefault();\n    x += b === 'left' ? -12 : 12;\n    pos.style.transform = 'translateX(' + x + 'px)';\n  });\n</script>`,
        stage: { h: 520, light: true } }
    ],
    props: [['screen', '<code>dmg</code> <code>pocket</code> <code>light</code> <code>grape</code> <code>color</code> (no filter)', 'dmg'], ['color', 'the shell: <code>classic</code> <code>lime</code> <code>grape</code> <code>ink</code> <code>coral</code>', 'classic'], ['width', 'any CSS length', '320px'], ['brand', 'the name on the front', 'Piixpal'], ['boot', '<code>off</code> skips the boot screen', ''], ['font', '<code>pixel</code> or <code>inherit</code> (your page font)', 'pixel'], SOUND],
    events: [['press', 'any button: <code>detail.button</code> is up, down, left, right, a, b, select or start. Cancelable.'], ['screen', 'Select changed the colours: <code>detail.screen</code>']],
    methods: [['press(button)', 'press a button from code']],
    a11y: ['Every button is a real button with a label; the screen is a scrollable region you can tab into.', 'Keyboard: arrows, X for A, Z for B, Enter for Start, C for Select.', 'The colour filter is visual only: screen readers read your content as written.', 'With reduced motion it skips the boot animation and scrolls instantly.'] },

  { slug: 'chiptune', name: 'Chiptune', section: 'Games & sound', tag: 'piix-chiptune', file: 'chiptune',
    brief: '8-bit sounds for your whole page, from one tag. No audio files.',
    about: "Drop it anywhere and the page gets sound: links and buttons blip when you hover and click them, and every Piixpal game and dialogue box starts making noise. Each sound is made on the spot with WebAudio, so there's nothing to download. It shows as a pixel speaker; clicking it mutes the whole page, and the choice is remembered. Put <code>data-sfx=\"coin\"</code> on anything to give it a sound of its own.",
    demo: `<piix-chiptune></piix-chiptune>

<piix-button data-sfx="coin">Coin</piix-button>
<piix-button tone="sky" data-sfx="jump">Jump</piix-button>
<piix-button tone="violet" data-sfx="powerup">Power up</piix-button>
<piix-button tone="coral" data-sfx="error">Error</piix-button>`,
    stage: { h: 200, light: true, hint: 'Click to hear. Browsers wait for your first click before any sound.' },
    controls: [['tone', 'Speaker', 'seg', TONES.slice(0, 5), 'lime']],
    examples: [
      { name: 'Every sound', note: 'All of them are generated, so they cost no bytes to load.',
        demo: ['hover', 'click', 'blip', 'select', 'type', 'coin', 'jump', 'bounce', 'launch', 'hit', 'break', 'powerup', 'success', 'error', 'open', 'close', 'lose', 'win', 'boot'].map(s => `<piix-button size="sm" tone="ink" data-sfx="${s}">${s}</piix-button>`).join('\n'), stage: { light: true } },
      { name: 'From your own code', note: '<code>Piixpal.sfx(name, { pitch })</code> plays a sound when something happens.',
        demo: `<piix-button tone="mint" onclick="Piixpal.sfx('success')">Save</piix-button>\n<piix-button tone="sun" onclick="Piixpal.sfx('coin', { pitch: 1.5 })">Higher coin</piix-button>`, stage: { light: true } },
      { name: 'Pinned to a corner', demo: `<piix-chiptune float="bottom-right" tone="ink"></piix-chiptune>`, show: `<p>Look at the bottom-right corner of this page.</p><piix-chiptune float="bottom-right" tone="ink"></piix-chiptune>`, stage: { light: true } }
    ],
    props: [['wire', 'what gets sound by itself: <code>hover</code>, <code>click</code>, both or <code>none</code>', 'hover click'], ['scope', 'a CSS selector: only wire things inside it', 'the whole page'], ['volume', '0 to 1', '.25'], ['float', '<code>bottom-right</code> <code>bottom-left</code> <code>top-right</code> <code>top-left</code>', ''], ['tone', "the speaker's colour", 'lime'],
      ['data-sfx', 'on any element: the sound it makes when clicked', ''], ['data-sfx-hover', 'on any element: the sound when the pointer arrives', '']],
    events: [['mute', 'the speaker was clicked: <code>detail.muted</code>']],
    methods: [['Piixpal.sfx(name, { pitch })', 'play any sound from code'], ['.muted', 'read or set the mute switch']],
    a11y: ['The speaker is a real toggle button (<code>aria-pressed</code>), and muting is remembered.', 'Nothing plays until the visitor clicks or presses a key, as browsers require.', 'Sounds are short and quiet by default; nothing loops.'] }
];

/* small previews for the index cards */
export const GAME_THUMBS = {
  'breakout': '<piix-breakout pal="bitbug" field="96" style="width:86%"><b style="font:800 22px/1.1 Bricolage Grotesque,system-ui">Break these words</b></piix-breakout>',
  'rpg-box': '<piix-rpg-box pal="kitty" name="Kit" lines="1" style="width:92%;pointer-events:none"><p>Oh! A visitor.</p></piix-rpg-box>',
  'handheld': '<piix-handheld width="84px" boot="off" style="pointer-events:none"><p>SAVE 1</p></piix-handheld>',
  'chiptune': '<piix-chiptune></piix-chiptune>'
};

/* ---------- physics: whole pages that fall apart and come back ---------- */
export const PHYSICS_PAGES = [
  { slug: 'sand', name: 'Sand', section: 'Physics', tag: 'piix-sand', file: 'sand',
    brief: 'Your text crumbles into sand, piles up, and flows back into words.',
    about: "Every letter inside is redrawn as pixels, and every pixel is a grain in a real falling-sand simulation. Brush over a word and its grains come loose: they pour down, slide off each other into piles, land on the words below and on buttons and images (those stay solid), and you can sweep the piles around with the pointer. Stop for a moment and every grain flies back to the exact pixel it came from, and the real text returns. Your markup is never changed: the words stay in the page the whole time, for selection, search and screen readers.",
    demo: `<piix-sand>
  <h2 class="ex-h2">Touch these words.</h2>
  <p>Brush over a line and it falls apart, pours down and piles up on the words below. Stop, and every grain flies home.</p>
  <piix-button tone="ink">Sand piles on me</piix-button>
</piix-sand>`,
    stage: { light: true, block: true, pad: 40, hint: 'Brush over the words' },
    controls: [['trigger', 'Trigger', 'seg', ['brush', 'click'], 'brush'], ['grain', 'Grain', 'seg', ['1', '2', '3', '4'], '2'], ['rest', 'Flows back after', 'seg', ['1', '2', '4', 'never'], '2']],
    examples: [
      { name: 'Click to collapse', note: 'With <code>trigger="click"</code> one click brings it all down; with <code>rest="never"</code> it stays down until the next click.',
        demo: `<piix-sand trigger="click" rest="never" grain="3">\n  <h2 class="ex-h2" style="color:#6b4cff">Click me.</h2>\n  <p>Once to bring it down, again to build it back.</p>\n</piix-sand>`, stage: { light: true, block: true, pad: 40 } },
      { name: 'Around images', note: 'Images, buttons, inputs and anything with <code>data-solid</code> stay put, and the sand piles on them.',
        demo: `<piix-sand brush="30">\n  <img src="../site/launch-poster.jpg" alt="" style="width:46%;float:right;margin:0 0 12px 20px">\n  <h3 class="ex-h3">Patch notes</h3>\n  <p>Brush the words to the right of the picture and watch them pour down its edge and heap on the button below.</p>\n  <p>Grains that land on letters rest on them, and fall again when those letters crumble too.</p>\n  <piix-button tone="coral" style="clear:both">Read more</piix-button>\n</piix-sand>`, stage: { light: true, block: true, pad: 40 } },
      { name: 'From your own code', note: '<code>crumble()</code> brings everything down, <code>crumble(x, y, r)</code> just one spot, <code>rebuild()</code> calls it home.',
        demo: `<piix-sand id="logo" trigger="none" rest="never" grain="3">\n  <h2 class="ex-h2">piixpal</h2>\n</piix-sand>\n<piix-button tone="ink" size="sm" onclick="logo.crumble()">Crumble</piix-button>\n<piix-button tone="lime" size="sm" onclick="logo.rebuild()">Rebuild</piix-button>`, stage: { light: true, block: true, pad: 40 } }
    ],
    props: [['trigger', '<code>brush</code>: the pointer crumbles what it touches. <code>click</code>: a click brings it all down. <code>none</code>: only from code', 'brush'], ['brush', "the brush's radius, in px", '22'], ['grain', 'the size of one grain, in px', '2'], ['rest', 'seconds of calm before it flows back, or <code>never</code>', '2'], SOUND,
      ['data-solid', 'on any element inside: it stays solid and sand piles on it (images, buttons and inputs already do)', '']],
    events: [['crumble', 'the first grains come loose'], ['rebuild', 'every grain is home and the real text is back']],
    methods: [['crumble()', 'bring everything down'], ['crumble(x, y, r)', 'crumble one spot: x and y in px from its top-left, r the radius'], ['rebuild()', 'send every grain home now']],
    a11y: ['Your text is never removed or rewritten: screen readers, selection and find-in-page see the real words the whole time.', 'Buttons, links and inputs keep working, and stay visible, while everything around them is sand.', 'With reduced motion the grains go home at once instead of flying.'] }
];
export const PHYSICS_THUMBS = {
  'sand': '<piix-sand trigger="click" rest="never" grain="3" style="width:80%"><b style="font:800 30px/1 Bricolage Grotesque,system-ui">Crumble me</b></piix-sand>'
};
