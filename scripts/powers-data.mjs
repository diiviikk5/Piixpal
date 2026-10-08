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
  },
  {
    id: 'weather', fam: 'play', accent: 'var(--sky)', kind: 'element', tag: 'piix-weather', where: 'body', query: 'kind=snow', tall: true,
    uses: 'the real outline of your letters, measured glyph by glyph',
    support: 'every modern browser · switches itself off for reduced motion',
    try: 'wait for the snow to pile up on the letters, then swipe the cursor through it',
    desc: 'Pixel weather that knows where your text is. Snow settles on the real shape of each letter, piles up, rounds off, slides over the edges and falls through the gaps between words. Swipe through it to brush it off. Rain splashes on whatever it hits; leaves and petals come to rest on your headings until you wave them away. Moving the cursor stirs the air.',
    attrs: [['kind', 'snow, rain, leaves or petals (default snow)'], ['amount', '0–3, how much falls (default 1)'], ['land', 'CSS selector for what it settles on'], ['box', 'keep it inside one element; put the tag inside any element (not &lt;body&gt;) and it stays in there too']],
    api: 'el.clear()',
    hab: '<p class="h-text" style="bottom:auto;top:96px;font-size:56px">Let it snow</p><div class="h-btns" style="bottom:22px;gap:10px"><button type="button" class="h-btn" data-call="#d-wx:setAttribute" data-args=\'["kind","snow"]\'>Snow</button><button type="button" class="h-btn" data-call="#d-wx:setAttribute" data-args=\'["kind","rain"]\'>Rain</button><button type="button" class="h-btn" data-call="#d-wx:setAttribute" data-args=\'["kind","leaves"]\'>Leaves</button><button type="button" class="h-btn" data-call="#d-wx:setAttribute" data-args=\'["kind","petals"]\'>Petals</button></div><piix-weather id="d-wx" kind="snow" amount="2"></piix-weather>',
    code: '<!-- the whole page -->\n<piix-weather kind="snow"></piix-weather>\n\n<!-- or just inside one element -->\n<header class="hero">\n  <h1>Happy holidays</h1>\n  <piix-weather kind="snow" amount="2"></piix-weather>\n</header>'
  },
  {
    id: 'pidge', fam: 'jobs', accent: 'var(--violet)', kind: 'pal', does: 'courier', where: 'body',
    uses: 'a JavaScript call from anywhere: <code>Piixpal.toast("Saved!")</code>',
    support: 'every modern browser · notes are announced to screen readers',
    try: 'press the buttons; hover a note to keep it open',
    desc: 'Toast notifications, delivered by pigeon. Call <code>Piixpal.toast()</code> from anywhere and Pidge flies in with an envelope, the note pops open in the corner, and it perches on top of the pile until every note has been read, then flies off. Hovering a note pauses it, errors get a red stamp, and each note is announced to screen readers.',
    attrs: [['type', '<code>{ type: "ok" | "error" | "info" }</code>'], ['title', '<code>{ title: "Mia" }</code> a bold first line'], ['time', '<code>{ time: 6000 }</code> ms on screen, 0 = until dismissed (default 4200)']],
    api: 'Piixpal.toast(msg, opts)  el.ctl.toast(msg, opts)  el.ctl.clear()',
    hab: '<div class="h-btns" style="top:26px;bottom:auto;justify-content:flex-start;padding-left:22px;gap:10px;flex-wrap:wrap;right:22px"><button type="button" class="h-btn lime" data-call="#d-pidge:toast" data-args=\'["Saved your changes",{"type":"ok"}]\'>Save</button><button type="button" class="h-btn" data-call="#d-pidge:toast" data-args=\'["Could not reach the server",{"type":"error","title":"Upload failed"}]\'>Fail</button><button type="button" class="h-btn" data-call="#d-pidge:toast" data-args=\'["Mia liked your post",{"type":"info"}]\'>Notify</button></div><piix-pal pal="pidge" id="d-pidge"></piix-pal>',
    code: '<script src="https://cdn.jsdelivr.net/gh/diiviikk5/Piixpal@main/dist/c/pidge.min.js"></script>\n<script>\n  Piixpal.toast("Saved!", { type: "ok" });\n</script>'
  },
  {
    id: 'plane', fam: 'jobs', accent: 'var(--coral)', kind: 'pal', does: 'banner', where: 'body', query: 'text=v2 is out',
    uses: 'a banner link towed across the top of your page',
    support: 'every modern browser · parks instead of flying for reduced motion',
    try: 'hover the banner to hold the plane still; click the plane for a loop',
    desc: 'Announcements, by air. A little propeller plane tows your banner across the top of the page, letters rippling in the wind. The banner is a real link, and the plane hangs about while you hover it so it is easy to click. It flies once per visit unless you ask for more.',
    attrs: [['text', 'what the banner says'], ['href', 'makes the banner a link'], ['top', 'px from the top of the screen (default 90)'], ['repeat', 'seconds between passes, 0 = once (default 0)'], ['always', 'fly on every page view, not once per session']],
    api: 'el.ctl.fly()',
    hab: '<p class="h-line" style="bottom:40px">Banners are real links, so they work with keyboards and screen readers too.</p><piix-pal pal="plane" text="Piixpal v0.4 is out →" top="34" repeat="1.5" always></piix-pal>',
    code: '<piix-pal pal="plane"\n  text="v2 is out! Read the post →"\n  href="/blog/v2"></piix-pal>'
  },
  {
    id: 'fetch', fam: 'jobs', accent: 'var(--sun)', kind: 'pal', does: 'fetchdog', where: 'footer',
    uses: 'every <code>fetch()</code> and <code>XMLHttpRequest</code> on the page (so axios too)',
    support: 'every modern browser · it only watches, it never changes a request',
    try: 'press Fetch for a real request, or Slow job; Broken link comes back with a sock',
    desc: 'A loading indicator that plays fetch. Whenever your page sends a request, the dog perks up and races off; when the response arrives it trots back with a bone. A request that fails? It comes back with a sock and a puzzled look. Requests that finish in a blink just make it spin. For any other async work there is <code>Piixpal.busy(promise)</code>.',
    attrs: [['match', 'only count requests whose URL contains this, e.g. <code>/api/</code>'], ['at', 'where it sits on its element, 0–1']],
    api: 'Piixpal.busy(promise)',
    hab: '<div class="h-btns" style="top:26px;bottom:auto;gap:10px"><button type="button" class="h-btn lime" onclick="fetch(\'../dist/components.json?\'+Date.now())">Fetch</button><button type="button" class="h-btn" onclick="Piixpal.busy(new Promise(r=>setTimeout(r,2200)))">Slow job</button><button type="button" class="h-btn" onclick="fetch(\'../nothing-here-\'+Date.now()).catch(()=>{})">Broken link</button></div><div class="h-floor" id="d-fetch"><i></i><i></i><i></i></div><piix-pal pal="fetch" on="#d-fetch" at=".5"></piix-pal>',
    code: '<footer>\n  …\n  <piix-pal pal="fetch" match="/api/"></piix-pal>\n</footer>'
  },
  {
    id: "scout",
    fam: "jobs",
    accent: "var(--mint)",
    kind: "pal",
    does: "tour",
    where: "header",
    uses: "<code>data-tour</code> attributes on your own elements",
    support: "every modern browser · keyboard: → next, ← back, Esc ends",
    try: "click Scout to start the tour",
    desc: "Onboarding, guided by a tiny explorer. Mark the stops with <code>data-tour=\"what this is\"</code>; Scout hops from one to the next, stands on each and raises its flag while a spotlight dims everything else and a card explains. Keyboard friendly, announced to screen readers, and it can start by itself once per visitor.",
    attrs: [["data-tour","on any element: the text for that stop (<code>data-tour-step</code> to order, <code>data-tour-title</code> for a heading)"],["steps","or list the stops on the tag: <code>#new: Start here | #search: Find anything</code>"],["start","\"auto\" begins by itself, once per visitor"]],
    api: "el.ctl.start(steps?)  el.ctl.next()  el.ctl.back()  el.ctl.end()",
    events: "piix:tour-step, piix:tour-end",
    hab: "<div class=\"h-nav\" style=\"height:64px\"><i></i></div><button type=\"button\" class=\"h-btn lime\" style=\"position:absolute;left:70px;top:12px\" data-tour=\"Start a new project here\" data-tour-step=\"1\">+ New</button><input class=\"h-search\" aria-label=\"Search\" placeholder=\"Search…\" style=\"left:178px;top:14px\" data-tour=\"Search every project and file\" data-tour-step=\"2\"><span class=\"h-avatar\" style=\"right:20px;top:14px\" data-tour=\"Your profile and settings\" data-tour-step=\"3\">MK</span><p class=\"h-line\" style=\"bottom:auto;top:118px\">Click Scout to take the tour.</p><div class=\"h-floor\" id=\"d-scout\"><i></i><i></i><i></i></div><piix-pal pal=\"scout\" on=\"#d-scout\" at=\".12\"></piix-pal>",
    code: "<button data-tour=\"Start a new project here\">New</button>\n<input data-tour=\"Search everything\">\n\n<header>\n  <piix-pal pal=\"scout\"></piix-pal>\n</header>"
  },
  {
    id: "drone",
    fam: "jobs",
    accent: "var(--sky)",
    kind: "pal",
    does: "cart",
    where: "#cart",
    tall: true,
    uses: "your own \"add to cart\" buttons and the product pictures next to them",
    support: "every modern browser · it only adds an animation, your cart logic is untouched",
    try: "add a few things to the cart",
    desc: "Fly-to-cart, by quadcopter. Click any add-to-cart button and the drone swoops down, lifts a copy of the product picture off its card, flies it over to your cart and drops it in. The cart bounces, its counter goes up, and an event tells your app. No picture? It carries a little cardboard box instead.",
    attrs: [["on","your cart icon (the drone lives next to it)"],["from","which buttons send it (default <code>.add-to-cart, [data-add-to-cart]</code>)"],["count","a number in the cart to add one to (default <code>.count, [data-count]</code>)"]],
    events: "piix:delivered { button } on the pal and the cart",
    hab: "<span class=\"h-cart\" id=\"d-cart\">Cart <b class=\"count\">0</b></span><div class=\"prods\"><div class=\"prod\" data-product><img src=\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2016%2016'%20shape-rendering%3D'crispEdges'%3E%3Crect%20width%3D'16'%20height%3D'16'%20fill%3D'%23fff3d6'%2F%3E%3Cpath%20fill%3D'%23ff4d6d'%20d%3D'M4%203h3v1h2V3h3l3%203-2%202-1-1v7H5V7L4%208%202%206z'%2F%3E%3C%2Fsvg%3E\" alt=\"Pixel tee\"><button type=\"button\" class=\"h-btn add-to-cart\">Add tee</button></div><div class=\"prod\" data-product><img src=\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2016%2016'%20shape-rendering%3D'crispEdges'%3E%3Crect%20width%3D'16'%20height%3D'16'%20fill%3D'%23eef6ff'%2F%3E%3Cpath%20fill%3D'%2358c8ff'%20d%3D'M3%204h8v8H3z'%2F%3E%3Cpath%20fill%3D'%2358c8ff'%20d%3D'M11%206h3v4h-3V9h2V7h-2z'%2F%3E%3C%2Fsvg%3E\" alt=\"Mug\"><button type=\"button\" class=\"h-btn add-to-cart\">Add mug</button></div><div class=\"prod\" data-product><img src=\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2016%2016'%20shape-rendering%3D'crispEdges'%3E%3Crect%20width%3D'16'%20height%3D'16'%20fill%3D'%23f3ffe0'%2F%3E%3Cpath%20fill%3D'%238ac926'%20d%3D'M3%209V7l2-2h5l2%202v2z'%2F%3E%3Cpath%20fill%3D'%235c8a12'%20d%3D'M10%209h4v1h-4z'%2F%3E%3C%2Fsvg%3E\" alt=\"Cap\"><button type=\"button\" class=\"h-btn add-to-cart\">Add cap</button></div></div><piix-pal pal=\"drone\" on=\"#d-cart\"></piix-pal>",
    code: "<a id=\"cart\">Cart <b class=\"count\">0</b></a>\n\n<article data-product>\n  <img src=\"tee.png\" alt=\"Pixel tee\">\n  <button class=\"add-to-cart\">Add to cart</button>\n</article>\n\n<piix-pal pal=\"drone\" on=\"#cart\"></piix-pal>"
  },
  {
    id: "crumb",
    fam: "jobs",
    accent: "var(--sun)",
    kind: "pal",
    does: "munch",
    where: "#cookie-banner",
    uses: "your cookie banner and its own Accept / Reject buttons",
    support: "every modern browser · your banner code runs untouched",
    try: "press Accept or Reject, then Bring it back",
    desc: "The cookie banner everyone has, finally fun. Crumb the mouse sits on your banner sniffing at it. The moment a visitor presses Accept or Reject, it tucks in and eats the whole thing, bite by jagged bite, crumbs flying, then pats its belly and waddles off. Your own buttons still do their job: Crumb eats a stand-in copy, so your code can hide the real banner straight away.",
    attrs: [["on","the banner (or put the tag inside it)"],["at","where it sits on the banner, 0–1 (default .82)"]],
    events: "piix:eaten",
    hab: "<button type=\"button\" class=\"h-btn\" style=\"position:absolute;left:18px;top:18px\" onclick=\"const h=this.closest('.habitat');h.querySelector('.h-cookie').style.display='';const p=h.querySelector('piix-pal');p.replaceWith(p.cloneNode(true))\">Bring it back</button><div class=\"h-cookie\" id=\"d-cookie\"><p>We use cookies to remember your theme. That is all.</p><button type=\"button\" class=\"h-btn lime\" onclick=\"this.closest('.h-cookie').style.display='none'\">Accept</button><button type=\"button\" class=\"h-btn\" onclick=\"this.closest('.h-cookie').style.display='none'\">Reject</button></div><piix-pal pal=\"crumb\" on=\"#d-cookie\"></piix-pal>",
    code: "<div id=\"cookie-banner\">\n  We use cookies…\n  <button>Accept</button>\n  <button>Reject</button>\n  <piix-pal pal=\"crumb\"></piix-pal>\n</div>"
  },
  {
    id: "polly",
    fam: "beyond",
    accent: "var(--lime)",
    kind: "pal",
    does: "read",
    where: "article",
    uses: "the speech built into your browser (Web Speech API) and CSS Custom Highlights",
    support: "Chrome, Edge, Safari and Firefox speak · word-by-word highlighting where the browser supports it",
    try: "press Listen (turn your sound on)",
    desc: "Read-aloud for any page, with a guide you can watch. Polly speaks your text with the voice built into the browser and hops along the words as it says them, each one lighting up. It reads in sentence-sized pieces so long articles never cut off, keeps the current line on screen, and pauses and resumes right where it was. Hook it to a real button and it is keyboard friendly too.",
    attrs: [["on","what to read (or put the tag inside it)"],["button","a real button that starts and pauses it"],["rate","speaking speed (default 1)"],["pitch","voice pitch (default 1.15, a bit parrot)"],["voice","part of a voice name to prefer, e.g. \"Samantha\""]],
    api: "el.ctl.read()  el.ctl.pause()  el.ctl.stop()",
    events: "piix:read-start, piix:read-end { done }",
    hab: "<button type=\"button\" class=\"h-btn lime\" id=\"d-listen\" style=\"position:absolute;left:22px;bottom:22px\">Listen</button><article class=\"h-article\" id=\"d-polly\"><h4>A short story</h4><p>Once there was a parrot who loved words. It read every page it could find, out loud, hopping from word to word so nobody lost their place.</p></article><piix-pal pal=\"polly\" on=\"#d-polly\" button=\"#d-listen\"></piix-pal>",
    code: "<button id=\"listen\">Listen</button>\n\n<article>\n  <piix-pal pal=\"polly\" button=\"#listen\"></piix-pal>\n  <h1>My post</h1>\n  <p>…</p>\n</article>"
  }
  // new powers go above this line
];
