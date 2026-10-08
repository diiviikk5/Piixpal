// Superpowers: pals that reach past the page, do real jobs, or turn the page into a game.
// Rendered by scripts/docs.mjs into components/powers.html.
//
// Each entry: id, fam (beyond | jobs | play), accent, kind ('pal' or 'element' + tag),
// does, uses (what it taps into), support, try, desc, attrs [[name, what]], api, events,
// hab (live demo, kept inside its box), code (what to paste), where (for data-pals), tall.

export const FAMILIES = [
  ['beyond', 'Beyond the page', 'They leave the page: into your browser tab, your other windows, your desktop and your speakers.'],
  ['jobs', 'Pals with jobs', 'Real interface work, done by pals: notifications, tours, uploads, passwords, carts, cookie banners, theme switches.'],
  ['play', 'Play your site', 'Your page becomes a game: a platformer, a treasure hunt, weather, stickers, and a pet that belongs to each visitor.']
];

export const POWERS = [
  {
    id: 'bulb', fam: 'jobs', accent: 'var(--sun)', kind: 'pal', does: 'cord', where: 'body',
    uses: 'your theme: a class or attribute on &lt;html&gt; (or any element)',
    support: 'every modern browser · mouse and touch',
    try: 'pull the chain down and let go, or just click the bulb',
    desc: 'A pull-chain light switch for dark mode. A beaded chain hangs from the top of the screen with a little bulb on the end; pull it and the lights go out. Real rope physics, a bulb that glows while the lights are on, and a moth that keeps it company. It reads your theme, so if your own switch changes it, the bulb follows.',
    attrs: [['toggle', '<code>class:dark</code> (default) or an attribute cycle like <code>data-theme:dark|light</code>; the first value is lights-off'], ['target', 'what to toggle (default &lt;html&gt;)'], ['at', 'where across the screen it hangs, 0–1 (default .9)'], ['length', 'chain length in px (default 120)'], ['top', 'px from the top, to clear a sticky header']],
    events: 'piix:toggle { dark, value }',
    hab: '<div class="h-nav"><i></i><i></i><i></i></div><p class="h-text" style="bottom:56px">Lights?</p><piix-pal pal="bulb" target=".habitat" at=".8" top="46" length="96"></piix-pal>',
    code: '<!-- anywhere: it hangs from the top of the screen -->\n<piix-pal pal="bulb" toggle="data-theme:dark|light"></piix-pal>'
  },
  {
    id: 'pix', fam: 'play', accent: 'var(--lime)', kind: 'pal', does: 'player', tall: true, where: 'h1',
    uses: 'your page as a level: every line of text, button, image and card is a platform',
    support: 'every modern browser · keyboard, touch pad and gamepad',
    try: 'click Pix, then run with ← → and jump with ↑ or Space (jump again in the air to flip)',
    desc: 'Play your website. Pix is a tiny hero who runs and jumps on your real content: each line of a paragraph is its own one-way platform, so you can hop up through a page line by line. Coins hide on your links and buttons; bump a button from below and its coin pops out. The camera follows while you play, Escape hands the page back.',
    attrs: [['coins', 'how many coins to hide, 0 for none (default 10)'], ['land', 'CSS selector for what counts as a platform'], ['play', '"keys" lets the arrow keys start a game too']],
    api: 'el.ctl.start()  el.ctl.stop()', events: 'piix:play, piix:coin, piix:win, piix:stop',
    hab: '<div class="lv"><h4 class="lv-h" id="d-pix" style="left:26px;top:178px">Play me</h4><p class="lv-p" style="left:196px;top:92px;width:220px">Every line of text is a platform. Bump the buttons from below.</p><button type="button" class="h-btn lime lv-b" style="left:40px;top:292px">Jump</button><button type="button" class="h-btn lv-b" style="left:236px;top:236px">Coin</button><button type="button" class="h-btn lv-b" style="left:340px;top:176px">Higher</button></div><piix-pal pal="pix" on="#d-pix" coins="5"></piix-pal>',
    code: '<h1>\n  Welcome to my site\n  <piix-pal pal="pix"></piix-pal>\n</h1>'
  }
  // new powers go above this line
];
