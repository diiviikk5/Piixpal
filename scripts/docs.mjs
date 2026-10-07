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
  return { name, tag, accent: ACCENTS[i % ACCENTS.length], big: f.startsWith('big-') };
});
const title = s => s[0].toUpperCase() + s.slice(1);
const bigs = sprites.filter(s => s.big), smalls = sprites.filter(s => !s.big);

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
    hab: `<p class="h-text" id="d-shel" style="font-size:34px">Slow and steady.</p><piix-pal pal="shel" on="#d-shel"></piix-pal>`, code: '<h2>\n  Slow and steady.\n  <piix-pal pal="shel"></piix-pal>\n</h2>' },
  /* ----- more characters ----- */
  { id: 'gecko', does: 'climb', accent: 'var(--lime)', lives: 'the whole border of a box, upside-down underneath included', scared: 'being watched (it freezes)', poke: 'sprints the other way round',
    desc: 'A tiny lizard with sticky feet. Walks along the top of your card, down the side, upside-down along the bottom and back up the other side.',
    attrs: [['speed', 'walking speed multiplier'], ['at', 'starting point around the border, 0–1']],
    hab: '<div class="h-card" id="d-gecko"><i></i><i></i><i></i></div><piix-pal pal="gecko" on="#d-gecko"></piix-pal>', code: '<div class="card">\n  …\n  <piix-pal pal="gecko"></piix-pal>\n</div>' },
  { id: 'mole', does: 'pop', accent: 'var(--coral)', lives: 'underneath any edge, popping up at random spots', scared: 'nothing, which is its downfall', poke: 'bonk! Stars, then back underground. Fires piix:bonk with a count',
    desc: 'Whack-a-mole for your website. Pops up through an edge, has a look around and ducks. Click it while it is up.',
    attrs: [['piix:bonk', 'event with detail.count, for keeping score']],
    hab: '<div class="h-floor" id="d-mole"><i></i><i></i><i></i></div><piix-pal pal="mole" on="#d-mole"></piix-pal>', code: '<section>\n  …\n  <piix-pal pal="mole"></piix-pal>\n</section>' },
  { id: 'balloon', does: 'float', accent: 'var(--coral)', lives: 'a string tied to the top of an element', scared: 'sharp clicks', poke: 'pops (and thuds), then slowly re-inflates',
    desc: 'A balloon with a face, tied to your element. Sways on its string, drifts in the breeze of your cursor and the scroll.',
    attrs: [['length', 'string length in px'], ['at', 'where it is tied, 0–1'], ['silk', 'string colour']],
    hab: '<div class="h-floor" id="d-balloon"><i></i><i></i><i></i></div><piix-pal pal="balloon" on="#d-balloon" at=".5" length="110"></piix-pal>', code: '<div class="cta">\n  …\n  <piix-pal pal="balloon"></piix-pal>\n</div>' },
  { id: 'para', does: 'drop', accent: 'var(--sky)', lives: 'the top of your text, after a parachute jump', scared: 'heights, oddly', poke: 'goes back up for another jump',
    desc: 'A tiny parachutist who waits until your section scrolls into view, then floats down from the top of the screen, lands, folds the chute and waves.',
    attrs: [['at', 'landing spot, 0–1']],
    hab: '<p class="h-text" id="d-para" style="font-size:34px">Landing zone</p><piix-pal pal="para" on="#d-para"></piix-pal>', code: '<h2>\n  Landing zone\n  <piix-pal pal="para"></piix-pal>\n</h2>' },
  { id: 'roomba', does: 'sweep', accent: 'var(--violet)', lives: 'the top of an element, back and forth', scared: 'cursors in its path (it beeps)', poke: 'spins in confusion',
    desc: 'A small robot vacuum that takes its job very seriously. Glides, bumps the ends, stops and beeps if your cursor is in the way.',
    attrs: [['speed', 'cleaning speed multiplier']],
    hab: '<div class="h-floor" id="d-roomba"><i></i><i></i><i></i></div><piix-pal pal="roomba" on="#d-roomba"></piix-pal>', code: '<footer>\n  …\n  <piix-pal pal="roomba"></piix-pal>\n</footer>' },
  { id: 'kitty', does: 'lounge', accent: 'var(--violet)', lives: 'your text, like it pays the rent', scared: 'nothing. It swats', poke: 'purrs (hearts)',
    desc: 'A black cat lounging on your element. Swishes its tail, swats at the cursor when it gets close, dozes off when ignored.',
    attrs: [['at', 'where it lies, 0–1'], ['edge', '"text" or "box"']],
    hab: '<p class="h-text" id="d-kitty" style="font-size:34px">Nap spot</p><piix-pal pal="kitty" on="#d-kitty"></piix-pal>', code: '<h2>\n  Nap spot\n  <piix-pal pal="kitty"></piix-pal>\n</h2>' },

  { id: 'hiss', does: 'crawl', accent: 'var(--lime)', lives: "the glyph outline of your text, in waves", scared: "cursors (it hurries off)", poke: "flips over",
    desc: "A long green snake who slithers along your headings and flicks its tongue at the air.",
    attrs: [["speed","slithering speed"]],
    hab: "<div class=\"h-text\" id=\"d-hiss\">Hello, world.</div><piix-pal pal=\"hiss\" on=\"#d-hiss\"></piix-pal>", code: "<h1>\n  Hello, world.\n  <piix-pal pal=\"hiss\"></piix-pal>\n</h1>" },
  { id: 'pinch', does: 'crawl', accent: 'var(--coral)', lives: "your headings, walking sideways", scared: "cursors", poke: "flips onto its back",
    desc: "A little crab who only knows how to walk sideways, which suits a line of text just fine. Snaps its claws while it thinks.",
    attrs: [["speed","scuttling speed"]],
    hab: "<div class=\"h-text\" id=\"d-pinch\">Sideways.</div><piix-pal pal=\"pinch\" on=\"#d-pinch\"></piix-pal>", code: "<h1>\n  Sideways.\n  <piix-pal pal=\"pinch\"></piix-pal>\n</h1>" },
  { id: 'shibe', does: 'lounge', accent: 'var(--sun)', lives: "your text. Such lounge", scared: "nothing. Very brave", poke: "happy face, tongue out",
    desc: "A very good shiba lying on your element, tail wagging. Swats at the cursor, naps when ignored.",
    attrs: [["at","where it lies, 0–1"]],
    hab: "<p class=\"h-text\" id=\"d-shibe\" style=\"font-size:34px\">Much nap</p><piix-pal pal=\"shibe\" on=\"#d-shibe\"></piix-pal>", code: "<h2>\n  Much nap\n  <piix-pal pal=\"shibe\"></piix-pal>\n</h2>" },
  { id: 'capy', does: 'mind', accent: 'var(--sun)', lives: "a line of text, unbothered", scared: "absolutely nothing", poke: "calmly turns to face the other way",
    desc: "A capybara with a yuzu on its head. Blinks slowly, dozes, minds its own business completely.",
    attrs: [["at","where it sits, 0–1"]],
    hab: "<p class=\"h-line\" id=\"d-capy\">Some light reading for a slow afternoon.</p><piix-pal pal=\"capy\" on=\"#d-capy\" at=\".95\"></piix-pal>", code: "<p>\n  Unbothered.\n  <piix-pal pal=\"capy\"></piix-pal>\n</p>" },
  { id: 'peeper', kind: 'play', does: 'guard', accent: 'var(--sky)', where: 'input', lives: "a form field", scared: "seeing your password", poke: "a heart (or a polite \"...\")",
    desc: "A fluffball that guards your inputs. Its eyes follow the caret as you type, it covers them for password fields, and it cheers or sweats when the field is valid or not.",
    attrs: [["on","the input (or put it inside the label / wrapper)"]],
    hab: "<div class=\"h-form\"><input id=\"d-peeper\" type=\"email\" placeholder=\"type an email…\" required></div><piix-pal pal=\"peeper\" on=\"#d-peeper\"></piix-pal>", code: "<label>\n  Email <input type=\"email\" required>\n  <piix-pal pal=\"peeper\"></piix-pal>\n</label>" },
  { id: 'scrolly', kind: 'play', does: 'progress', accent: 'var(--lime)', where: 'body', lives: "a reading-progress bar at the bottom of the screen", scared: "nothing, it loves a long read", poke: "scrolls you back to the top",
    desc: "A tiny runner on a reading-progress bar. It keeps pace as you scroll, idles when you stop, and celebrates when you reach the end. It is running along the bottom of this page right now.",
    attrs: [["side","\"bottom\" or \"top\""],["color","bar colour"]],
    hab: "<p class=\"h-line\" style=\"bottom:auto;top:40px\">Scroll this page: Scrolly runs along the bar at the bottom of your screen.</p><piix-pal pal=\"scrolly\"></piix-pal>", code: "<piix-pal pal=\"scrolly\"></piix-pal>" },
  { id: 'echo', kind: 'play', does: 'mimic', accent: 'var(--lime)', where: 'body', lives: "the whole page, half a second behind you", scared: "nothing", poke: "cannot be poked: it never catches clicks",
    desc: "Your cursor’s little shadow. Replays the exact path your cursor took and clicks wherever you clicked, half a second late. Stop and it catches up and dances.",
    attrs: [["delay","seconds behind (default 0.5)"],["box","CSS selector to only follow inside one element"]],
    hab: "<p class=\"h-line\" style=\"bottom:auto;top:40px\">Move around and click inside this box: Echo follows you half a second late.</p><piix-pal pal=\"echo\" box=\".habitat\"></piix-pal>", code: "<piix-pal pal=\"echo\"></piix-pal>" },
  { id: 'snip', kind: 'play', does: 'select', accent: 'var(--sun)', where: 'p', lives: "a block of text", scared: "nothing", poke: "a heart",
    desc: "A highlighter pen with opinions. Select text inside its element and it hops to the end of your selection, nib up. Copy it and it shows you a clipboard.",
    attrs: [["on","the text to watch (on=\"body\" watches the whole page)"]],
    hab: "<p class=\"h-line\" id=\"d-snip\" style=\"bottom:70px\">Select a few words in this sentence, then copy them.</p><piix-pal pal=\"snip\" on=\"#d-snip\"></piix-pal>", code: "<article>\n  …\n  <piix-pal pal=\"snip\"></piix-pal>\n</article>" },
  { id: 'beep', kind: 'play', does: 'captcha', accent: 'var(--coral)', where: 'label', lives: "next to an \"I’m not a robot\" checkbox", scared: "being found out", poke: "a nervous \"?\"",
    desc: "A small robot with a big secret. Sweats when your cursor comes near the checkbox. Tick it and Beep panics and runs off, then sneaks back, embarrassed.",
    attrs: [["on","the checkbox or the label that holds it"]],
    hab: "<label class=\"h-captcha\" id=\"d-beep\"><input type=\"checkbox\"> I’m not a robot<piix-pal pal=\"beep\"></piix-pal></label>", code: "<label>\n  <input type=\"checkbox\"> I’m not a robot\n  <piix-pal pal=\"beep\"></piix-pal>\n</label>" },
  { id: 'router', kind: 'play', does: 'signal', accent: 'var(--mint)', lives: "the top of an element", scared: "losing signal", poke: "a heart at full bars",
    desc: "A little Wi-Fi router whose signal is your cursor. The closer you get, the more bars it shows. Wander off and it loses signal and frowns.",
    attrs: [["at","where it sits, 0–1"]],
    hab: "<div class=\"h-floor\" id=\"d-router\"><i></i><i></i><i></i></div><piix-pal pal=\"router\" on=\"#d-router\" at=\".5\"></piix-pal>", code: "<piix-pal pal=\"router\"></piix-pal>" },
  { id: 'termi', kind: 'play', does: 'type', accent: 'var(--lime)', lives: "the top of an element", scared: "nothing, it has root", poke: "skips to the next line",
    desc: "A tiny terminal who types for you: lines appear in a little terminal bubble, character by character, forever.",
    attrs: [["lines","what to type, separated by |"],["speed","typing speed"]],
    hab: "<div class=\"h-floor\" id=\"d-termi\"><i></i><i></i><i></i></div><piix-pal pal=\"termi\" on=\"#d-termi\" lines=\"npm i piixpal|added 1 package|✓ pals deployed\"></piix-pal>", code: "<piix-pal pal=\"termi\"\n  lines=\"git push|deploying…|✓ live\"></piix-pal>" },
  { id: 'frog', kind: 'play', does: 'snap', accent: 'var(--lime)', lives: "the top of an element", scared: "nothing. It is hungry", poke: "hops along",
    desc: "A frog convinced your cursor is a fly. Buzz close and its tongue snaps out at you; hold still at the tip and you are caught.",
    attrs: [["at","where it sits, 0–1"]],
    hab: "<div class=\"h-floor\" id=\"d-frog\"><i></i><i></i><i></i></div><piix-pal pal=\"frog\" on=\"#d-frog\"></piix-pal>", code: "<piix-pal pal=\"frog\"></piix-pal>" },
  { id: 'penguin', kind: 'play', does: 'slide', accent: 'var(--sky)', lives: "any long element", scared: "nothing", poke: "slips and spins",
    desc: "A penguin who has discovered your element is slippery. Waddles, flops onto its belly and slides, gets up and does it again.",
    attrs: [["edge","\"text\" or \"box\""]],
    hab: "<div class=\"h-floor\" id=\"d-penguin\"><i></i><i></i><i></i></div><piix-pal pal=\"penguin\" on=\"#d-penguin\" edge=\"box\"></piix-pal>", code: "<piix-pal pal=\"penguin\"></piix-pal>" },
  { id: 'rocket', kind: 'play', does: 'launch', accent: 'var(--coral)', where: '.btn', lives: "your Deploy button", scared: "nothing. It was born for this", poke: "3, 2, 1, lift-off",
    desc: "Ship it. Click the rocket: it counts down, blasts off the top of the screen in a trail of smoke, then lands back on its retro-rockets.",
    attrs: [["at","where it sits, 0–1"]],
    hab: "<div class=\"h-btns\"><span class=\"h-btn lime\" id=\"d-rocket\">Deploy</span></div><piix-pal pal=\"rocket\" on=\"#d-rocket\"></piix-pal>", code: "<button class=\"deploy\">\n  Deploy\n  <piix-pal pal=\"rocket\"></piix-pal>\n</button>" },

  /* ----- the toy box (do="toss") ----- */
  { id: 'ball', kind: 'toy', does: 'toss', accent: 'var(--coral)', lives: 'wherever it lands: headings, paragraphs, buttons, cards', scared: 'nothing', poke: 'a little kick into the air',
    desc: 'A beach ball. Bouncy, rolly, slightly smug. Rolls a long way. Drag and throw it, or bat it with a fast swipe of the cursor.',
    attrs: [['land', 'CSS selector for surfaces it can land on'], ['at', 'starting spot, 0–1'], ['box', 'CSS selector to keep it inside one element (leave out to roam the whole page)']],
    hab: '<p class="h-text" id="d-ball" style="font-size:30px">Throw me</p><piix-pal pal="ball" on="#d-ball" box=".habitat"></piix-pal>', code: '<h2>\n  Throw me\n  <piix-pal pal="ball"></piix-pal>\n</h2>' },
  { id: 'duck', kind: 'toy', does: 'toss', accent: 'var(--sun)', lives: 'wherever it lands: headings, paragraphs, buttons, cards', scared: 'nothing', poke: 'a little kick into the air',
    desc: 'A rubber duck. Squeaks when it lands. Drag and throw it, or bat it with a fast swipe of the cursor.',
    attrs: [['land', 'CSS selector for surfaces it can land on'], ['at', 'starting spot, 0–1'], ['box', 'CSS selector to keep it inside one element (leave out to roam the whole page)']],
    hab: '<p class="h-text" id="d-duck" style="font-size:30px">Throw me</p><piix-pal pal="duck" on="#d-duck" box=".habitat"></piix-pal>', code: '<h2>\n  Throw me\n  <piix-pal pal="duck"></piix-pal>\n</h2>' },
  { id: 'dice', kind: 'toy', does: 'toss', accent: 'var(--sky)', lives: 'wherever it lands: headings, paragraphs, buttons, cards', scared: 'nothing', poke: 'a little kick into the air',
    desc: 'Lands on a random face, every time. Every throw is a decision. Drag and throw it, or bat it with a fast swipe of the cursor.',
    attrs: [['land', 'CSS selector for surfaces it can land on'], ['at', 'starting spot, 0–1'], ['box', 'CSS selector to keep it inside one element (leave out to roam the whole page)']],
    hab: '<p class="h-text" id="d-dice" style="font-size:30px">Throw me</p><piix-pal pal="dice" on="#d-dice" box=".habitat"></piix-pal>', code: '<h2>\n  Throw me\n  <piix-pal pal="dice"></piix-pal>\n</h2>' },
  { id: 'pebble', kind: 'toy', does: 'toss', accent: 'var(--line-2)', lives: 'wherever it lands: headings, paragraphs, buttons, cards', scared: 'nothing', poke: 'a little kick into the air',
    desc: 'A heavy little rock. Does not bounce. Lands with a thud every other pal hears. Drag and throw it, or bat it with a fast swipe of the cursor.',
    attrs: [['land', 'CSS selector for surfaces it can land on'], ['at', 'starting spot, 0–1'], ['box', 'CSS selector to keep it inside one element (leave out to roam the whole page)']],
    hab: '<p class="h-text" id="d-pebble" style="font-size:30px">Throw me</p><piix-pal pal="pebble" on="#d-pebble" box=".habitat"></piix-pal>', code: '<h2>\n  Throw me\n  <piix-pal pal="pebble"></piix-pal>\n</h2>' },
  { id: 'cube', kind: 'toy', does: 'toss', accent: 'var(--mint)', lives: 'wherever it lands: headings, paragraphs, buttons, cards', scared: 'nothing', poke: 'a little kick into the air',
    desc: 'A jelly cube. Bounces high and wobbles after every landing. Drag and throw it, or bat it with a fast swipe of the cursor.',
    attrs: [['land', 'CSS selector for surfaces it can land on'], ['at', 'starting spot, 0–1'], ['box', 'CSS selector to keep it inside one element (leave out to roam the whole page)']],
    hab: '<p class="h-text" id="d-cube" style="font-size:30px">Throw me</p><piix-pal pal="cube" on="#d-cube" box=".habitat"></piix-pal>', code: '<h2>\n  Throw me\n  <piix-pal pal="cube"></piix-pal>\n</h2>' },
  { id: 'can', kind: 'toy', does: 'toss', accent: 'var(--coral)', lives: 'wherever it lands: headings, paragraphs, buttons, cards', scared: 'nothing', poke: 'a little kick into the air',
    desc: 'A soda can. Rolls off the edge of everything. Drag and throw it, or bat it with a fast swipe of the cursor.',
    attrs: [['land', 'CSS selector for surfaces it can land on'], ['at', 'starting spot, 0–1'], ['box', 'CSS selector to keep it inside one element (leave out to roam the whole page)']],
    hab: '<p class="h-text" id="d-can" style="font-size:30px">Throw me</p><piix-pal pal="can" on="#d-can" box=".habitat"></piix-pal>', code: '<h2>\n  Throw me\n  <piix-pal pal="can"></piix-pal>\n</h2>' },

  /* ----- groups: one tag, a whole crew ----- */
  { id: 'ducks', kind: 'group', does: 'parade', accent: 'var(--sun)', lives: 'the top of an element', scared: 'thuds', poke: 'a duckling hops; the mother starts a quack chorus',
    desc: 'A mother duck and her ducklings. The little ones follow her exact path, so when she turns round they file back past each other.',
    attrs: [['count', 'number of ducklings (default 4)']],
    hab: '<div class="h-floor" id="d-ducks"><i></i><i></i><i></i></div><piix-pal pal="ducks" on="#d-ducks"></piix-pal>', code: '<piix-pal pal="ducks" count="4"></piix-pal>' },
  { id: 'ants', kind: 'group', does: 'march', accent: 'var(--coral)', lives: 'the top edge of an element', scared: 'the cursor (they scatter)', poke: 'they all jump',
    desc: 'A marching line of ants, some carrying crumbs. Bring the cursor close and the nearby ones scatter, then hurry back into line.',
    attrs: [['count', 'number of ants (default 7)'], ['speed', 'marching speed']],
    hab: '<div class="h-floor" id="d-ants"><i></i><i></i><i></i></div><piix-pal pal="ants" on="#d-ants" count="9"></piix-pal>', code: '<piix-pal pal="ants" count="9"></piix-pal>' },
  { id: 'fish', kind: 'group', does: 'school', accent: 'var(--sky)', lives: 'inside an element, like a tank', scared: 'the cursor (it is a shark)', poke: 'that fish darts off',
    desc: 'A school of fish that flock inside any box: they stay close, line up, avoid bumping, turn at the glass and flee your cursor.',
    attrs: [['count', 'number of fish (default 7)']],
    hab: '<div class="h-tank" id="d-fish"></div><piix-pal pal="fish" on="#d-fish" count="9"></piix-pal>', code: '<div class="tank">\n  <piix-pal pal="fish" count="9"></piix-pal>\n</div>' },
  { id: 'sparrows', kind: 'group', does: 'wire', accent: 'var(--sun)', lives: 'an edge, like a telephone wire', scared: 'the cursor brushing past', poke: 'the whole row loops the sky and lands back',
    desc: 'A row of birds on a wire. Run the cursor along the row and they hop up one after another, like a wave.',
    attrs: [['count', 'number of birds (default 6)']],
    hab: '<div class="h-wire" id="d-sparrows"></div><piix-pal pal="sparrows" on="#d-sparrows" count="7"></piix-pal>', code: '<hr>\n<piix-pal pal="sparrows" on="hr" count="7"></piix-pal>' },
  { id: 'choir', kind: 'group', does: 'choir', accent: 'var(--violet)', lives: 'the top of an element, in a row', scared: 'nothing, they are performers', poke: 'that singer takes a solo; again to rejoin',
    desc: 'A choir who sway and sing in perfect time from a shared score. They glance at the cursor when it is near.',
    attrs: [['count', 'number of singers (default 4)'], ['bpm', 'tempo (default 96)']],
    hab: '<div class="h-floor" id="d-choir"><i></i><i></i><i></i></div><piix-pal pal="choir" on="#d-choir"></piix-pal>', code: '<piix-pal pal="choir" count="4" bpm="96"></piix-pal>' },
  { id: 'fireflies', kind: 'group', does: 'glow', accent: 'var(--sun)', lives: 'the air around an element', scared: 'clicks (they scatter)', poke: 'they burst away and drift back',
    desc: 'Soft blinking lights drifting around an element. Hover it and they gather round your cursor. Lovely on dark sections.',
    attrs: [['count', 'number of fireflies (default 9)']],
    hab: '<div class="h-night" id="d-fireflies"></div><piix-pal pal="fireflies" on="#d-fireflies" count="12"></piix-pal>', code: '<section class="dark">\n  <piix-pal pal="fireflies" count="12"></piix-pal>\n</section>' },
  { id: 'sheep', kind: 'group', does: 'count', accent: 'var(--mint)', lives: 'the top of an element, with a fence in the middle', scared: 'nothing, they are sleepy', poke: 'hearts',
    desc: 'Sheep trot along and jump the fence one at a time, forever. The fence keeps count. Made for loading states.',
    attrs: [['count', 'number of sheep (default 3)'], ['speed', 'trotting speed']],
    hab: '<div class="h-floor" id="d-sheep"><i></i><i></i><i></i></div><piix-pal pal="sheep" on="#d-sheep"></piix-pal>', code: '<div class="loading">\n  <piix-pal pal="sheep"></piix-pal>\n</div>' },
  { id: 'bees', kind: 'group', does: 'beeline', accent: 'var(--sun)', lives: 'around their hive element, then after your cursor', scared: 'nothing', poke: 'toggles the chase',
    desc: 'Worker bees buzzing round their hive. Come close and they follow your cursor in single file, each chasing the bee in front.',
    attrs: [['count', 'number of bees (default 6)'], ['at', 'where the hive is, 0–1']],
    hab: '<div class="h-hive" id="d-bees">hive</div><piix-pal pal="bees" on="#d-bees"></piix-pal>', code: '<div class="hive">\n  <piix-pal pal="bees"></piix-pal>\n</div>' }
];

const kinds = { pal: PALS.filter(p => !p.kind), play: PALS.filter(p => p.kind === 'play'), toy: PALS.filter(p => p.kind === 'toy'), group: PALS.filter(p => p.kind === 'group') };

/* ---------- layout ---------- */
const GH = `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>`;
const LOGO = `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><rect width="16" height="16" rx="3" fill="#17121f"/><path fill="#c6f432" d="M4 4h8v1h1v6h-1v1H4v-1H3V5h1z"/><path fill="#17121f" d="M5 6h2v2H5zM9 6h2v2H9zM6 9h4v1H6z"/><path fill="#fff" d="M5 6h1v1H5zM9 6h1v1H9z"/></svg>`;

const sidebar = active => {
  const link = (href, label, key, extra = '') => `<a href="${href}"${key === active ? ' aria-current="page"' : ''}${extra}>${label}</a>`;
  return `<aside class="side" aria-label="Components">
    <h4>Start</h4>
    ${link('./', 'Overview', 'index')}
    ${link('install.html', 'Install', 'install')}
    ${link('builder.html', 'Builder', 'builder')}
    <h4>Components</h4>
    ${link('sprites.html', `Sprites <span class="n">${sprites.length}</span>`, 'sprites')}
    ${link('pals.html', `Pals <span class="n">${PALS.length}</span>`, 'pals')}
    ${link('crowd.html', 'Crowd <span class="n">3</span>', 'crowd')}
    ${link('type.html', 'Pixel type', 'type')}
    <h4>Big sprites</h4>
    ${bigs.map(s => `<a href="sprites.html#s-${s.name}" style="--dot:${s.accent}"><i></i>${title(s.name)}</a>`).join('\n    ')}
    <h4>Sprites</h4>
    ${smalls.map(s => `<a href="sprites.html#s-${s.name}" style="--dot:${s.accent}"><i></i>${title(s.name)}</a>`).join('\n    ')}
    <h4>Pals</h4>
    ${kinds.pal.map(p => `<a href="pals.html#${p.id}" style="--dot:${p.accent}"><i></i>${title(p.id)}</a>`).join('\n    ')}
    <h4>New ways to play</h4>
    ${kinds.play.map(p => `<a href="pals.html#${p.id}" style="--dot:${p.accent}"><i></i>${title(p.id)}</a>`).join('\n    ')}
    <h4>Toy box</h4>
    ${kinds.toy.map(p => `<a href="pals.html#${p.id}" style="--dot:${p.accent}"><i></i>${title(p.id)}</a>`).join('\n    ')}
    <h4>Groups</h4>
    ${kinds.group.map(p => `<a href="pals.html#${p.id}" style="--dot:${p.accent}"><i></i>${title(p.id)}</a>`).join('\n    ')}
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

const spriteCard = s => `    <article class="scard${s.big ? ' big' : ''}" id="s-${s.name}" style="--accent:${s.accent}">
      <div class="s-stage"><piix-sprite name="${s.name}" scale="6"></piix-sprite></div>
      <div class="s-body">
        <h3>${title(s.name)} <small>${s.big ? 'big · 3d' : s.name}</small></h3>
        <p>${esc(s.tag)}</p>
        <div class="s-actions"><button type="button" class="dark" data-copy="${esc(`<piix-sprite name="${s.name}"></piix-sprite>`)}">Copy</button><button type="button" data-pick="${s.name}">Customise</button></div>
      </div>
    </article>`;
const CDN_ALL = 'https://cdn.jsdelivr.net/gh/diiviikk5/Piixpal@main/piixpal.min.js';
const CDN_ONE = n => `https://cdn.jsdelivr.net/gh/diiviikk5/Piixpal@main/dist/c/${n}.min.js`;
/* every way to add one component, as tabs: like a UI library's install box */
const installTabs = (name, kind, markup, where = 'h1') => {
  const tag = kind === 'sprite' ? 'piix-sprite' : 'piix-pal', attr = kind === 'sprite' ? 'name' : 'pal';
  const Comp = kind === 'sprite' ? 'PiixSprite' : 'PiixPal';
  const tabs = [
    ['HTML', `<!-- once, anywhere on the page -->\n<script src="${CDN_ALL}"></script>\n\n${markup}`],
    ['Single file', `<!-- just ${name} (the shared engine loads itself, once) -->\n<script src="${CDN_ONE(name)}"></script>\n\n${markup}`],
    ['No markup', kind === 'sprite'
      ? `<script src="${CDN_ONE(name)}"\n  data-pals="${name}@${where}"></script>`
      : `<!-- attaches itself to the first ${where}: nothing else to add -->\n<script src="${CDN_ONE(name)}"\n  data-pals="${name}@${where}"></script>`],
    ['JS', `await import("${CDN_ONE(name)}");\nPiixpal.add("${name}", "${where}");`],
    ['React', `import { ${Comp} } from "piixpal/react"; // or copy wrappers/react.jsx\n\n<h1>\n  Hello\n  <${Comp} ${attr}="${name}" />\n</h1>`],
    ['Vue', `// main.js: app.use(Piixpal) from "piixpal/vue"\n\n<h1>\n  Hello\n  <${tag} ${attr}="${name}" />\n</h1>`],
    ['Svelte', `<script>import Piixpal from "piixpal/svelte";</script>\n<Piixpal />\n\n<h1>Hello <${tag} ${attr}="${name}"></${tag}></h1>`]
  ];
  return `<div class="tabs" data-tabs>
  <div class="tab-bar" role="tablist">${tabs.map(([t], i) => `<button type="button" role="tab" aria-selected="${i === 0}">${t}</button>`).join('')}</div>
  ${tabs.map(([, code], i) => `<pre class="codebox tab-pane"${i ? ' hidden' : ''}><button class="copy" type="button" data-copy="${esc(code)}">Copy</button>${esc(code)}</pre>`).join('\n  ')}
</div>`;
};
const codeBox = code => `<pre class="codebox"><button class="copy" type="button" data-copy="${esc(code)}">Copy</button>${esc(code)}</pre>`;
const table = (cap, rows) => `<div class="table-wrap"><table><caption>${esc(cap)}</caption><thead><tr><th>Attribute</th><th>What it does</th><th>Default</th></tr></thead><tbody>
${rows.map(([a, d, def]) => `<tr><td><code>${a}</code></td><td>${d}</td><td>${def}</td></tr>`).join('\n')}
</tbody></table></div>`;

/* ---------- sprites ---------- */
const spritesBody = `<header class="doc-head">
  <div class="crumbs"><a href="./">Components</a><span>/</span><span>Sprites</span></div>
  <h1>Sprites</h1>
  <p>${sprites.length} characters that sit inline, like an image: ${bigs.length} big 3D ones and ${smalls.length} small pixel ones. Their eyes follow the cursor, they blink, breathe a pixel, hop when you click them and nap when nobody's around. Pick one, copy the tag, paste it anywhere.</p>
  <div class="pills"><span class="pill">${sprites.length} sprites</span><span class="pill">pixel · dots · halftone · dither · ascii · 3D</span><span class="pill">inline, no positioning</span><span class="pill">eyes follow the cursor</span><span class="pill">one tag</span></div>
</header>

<section class="doc-sec" id="customise" aria-labelledby="customise-h">
  <h2 id="customise-h">Customise</h2>
  <p>Pick a sprite from the grid below or the list, then tune it. The tag updates as you go.</p>
  <div class="custom" id="custom">
    <div class="c-stage" id="c-stage" data-bg="paper">
      <span class="c-name" id="c-name">gloop</span>
      <div class="c-bgs" role="group" aria-label="Background">
        <button type="button" data-bg="paper" aria-pressed="true" style="background:#f3eee3" aria-label="Paper"></button>
        <button type="button" data-bg="ink" aria-pressed="false" style="background:#17121f" aria-label="Ink"></button>
        <button type="button" data-bg="lime" aria-pressed="false" style="background:#c6f432" aria-label="Lime"></button>
        <button type="button" data-bg="violet" aria-pressed="false" style="background:#6b4cff" aria-label="Violet"></button>
      </div>
      <piix-sprite id="c-sprite" name="gloop" size="176"></piix-sprite>
    </div>
    <div class="c-panel">
      <div class="c-controls">
        <label class="ctl wide"><span>Sprite</span><select id="c-pick" class="sel">${sprites.map(s => `<option value="${s.name}">${title(s.name)}</option>`).join('')}</select></label>
        <label class="ctl"><span>Size</span><input type="range" id="c-size" min="40" max="260" step="4" value="176"><output id="c-size-o">176</output></label>
        <div class="ctl wide"><span>Render</span>
          <div class="seg" id="c-render" role="group" aria-label="Render style">
            <button type="button" data-render="" aria-pressed="true">Default</button>
            <button type="button" data-render="pixel" aria-pressed="false">Pixel</button>
            <button type="button" data-render="dots" aria-pressed="false">Dots</button>
            <button type="button" data-render="halftone" aria-pressed="false">Halftone</button>
            <button type="button" data-render="dither" aria-pressed="false">Dither</button>
            <button type="button" data-render="ascii" aria-pressed="false">ASCII</button>
            <button type="button" data-render="voxel" aria-pressed="false">3D voxel</button>
          </div>
        </div>
        <label class="ctl"><span>Depth</span><input type="range" id="c-depth" min="1" max="6" value="2"><output id="c-depth-o">2</output></label>
        <label class="ctl"><span>Colour</span><input type="color" id="c-color" value="#ff6b4a"><button type="button" class="mini" id="c-color-x">reset</button></label>
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

<section class="doc-sec" id="big" aria-labelledby="big-h">
  <h2 id="big-h">Big sprites</h2>
  <p>Bold, ghost-scale characters for heroes, empty states and 404s. They render as chunky 3D blocks that turn toward your cursor, lean in, flinch when you get close, and take any colour with <code>color="…"</code>. Try <code>render="pixel"</code> or <code>render="dots"</code> for a flat or dot-matrix look.</p>
  <div class="sgrid">
${bigs.map(spriteCard).join('\n')}
  </div>
</section>

<section class="doc-sec" id="all" aria-labelledby="all-h">
  <h2 id="all-h">Sprites</h2>
  <p>Small inline characters. Click one to see it hop. Copy grabs the tag; Customise loads it into the panel above.</p>
  <div class="sgrid">
${smalls.map(spriteCard).join('\n')}
  </div>
</section>

<section class="doc-sec" id="attributes" aria-labelledby="attr-h">
  <h2 id="attr-h">Attributes</h2>
  <p>All optional. Size snaps to whole sprite pixels, so they always stay crisp.</p>
  ${table('<piix-sprite>', [
    ['name', `which sprite: ${sprites.map(s => `<code>${s.name}</code>`).join(' ')}`, 'mochi'],
    ['size', 'width in CSS px (rounded to whole sprite pixels)', '5 × width'],
    ['scale', 'or set the size of one sprite pixel directly', '5'],
    ['render', '<code>pixel</code> flat blocks, <code>dots</code> LED dot-matrix, <code>halftone</code> shaded sub-dots, <code>dither</code> 1-bit grain, <code>ascii</code> characters, <code>voxel</code> chunky 3D that turns toward the cursor', 'pixel (big: voxel)'],
    ['depth', 'voxel extrusion, in sprite pixels', '3 (big: 2)'],
    ['color', 'body colour for big sprites; shade and highlight are derived from it', 'its own'],
    ['eye', 'pupil colour', 'its own'],
    ['hue', 'recolour by rotating the hue, in degrees', '0'],
    ['look', '<code>mouse</code> follows the cursor, <code>wander</code> looks around, <code>none</code> looks ahead', 'mouse'],
    ['shy', 'leans away when the cursor gets close (<code>no-shy</code> turns it off on big ones)', 'off (big: on)'],
    ['tilt', 'leans toward the cursor (<code>no-tilt</code> turns it off)', 'off (big: on)'],
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
const palSection = p => `
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
      ${installTabs(p.id, 'pal', p.code, p.where || (p.kind === 'group' || p.does === 'bounce' || p.does === 'sweep' || p.does === 'pop' ? 'footer' : p.does === 'perch' ? '.btn' : p.does === 'peek' || p.does === 'climb' ? '.card' : p.does === 'hang' ? 'nav' : 'h1'))}
    </div>
  </div>
</section>`;
const family = (id, name, blurb, list) => `
<section class="doc-sec family" id="${id}" aria-labelledby="${id}-h">
  <h2 id="${id}-h" class="fam-h">${name} <span class="pill">${list.length}</span></h2>
  <p>${blurb}</p>
</section>${list.map(palSection).join('\n')}`;
const palsBody = `<header class="doc-head">
  <div class="crumbs"><a href="./">Components</a><span>/</span><span>Pals</span></div>
  <h1>Pals</h1>
  <p>Pals live <em>on</em> your page. Each one has a job: something it lives on, something that scares it, something that happens when you poke it. Put one inside an element and it figures out the rest. They notice each other, too.</p>
  <div class="pills"><span class="pill">${kinds.pal.length} characters</span><span class="pill">${kinds.play.length} interactions</span><span class="pill">${kinds.toy.length} toys</span><span class="pill">${kinds.group.length} groups</span><span class="pill">never blocks clicks</span></div>
</header>
${family('characters', 'Characters', 'One pal, one job. Crawlers, peekers, perchers, sweepers and loungers.', kinds.pal)}
${family('play', 'New ways to play', 'Pals that react to what people actually do on your site: typing, passwords, selecting and copying text, scrolling, ticking a checkbox, clicking a deploy button.', kinds.play)}
${family('toys', 'Toy box', 'Things to throw around the page. They land on real elements, roll off edges onto whatever is below, and can be batted with a fast swipe. Try throwing one onto another pal.', kinds.toy)}
${family('groups', 'Groups', 'One tag, a whole crew: families, flocks, lines and choirs that move and react together.', kinds.group)}`;

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

/* ---------- crowd ---------- */
const crowdBody = `<header class="doc-head">
  <div class="crumbs"><a href="./">Components</a><span>/</span><span>Crowd</span></div>
  <h1>Crowd</h1>
  <p><code>&lt;piix-crowd&gt;</code> is a stage full of tiny agents, hundreds of them on one canvas. They wander and high-five, flock after your cursor, or walk into place to spell a word. Click the floor to drop one in; grab one and throw it.</p>
  <div class="pills"><span class="pill">3 modes</span><span class="pill">up to 600 agents</span><span class="pill">one canvas, 60fps</span><span class="pill">drag + throw</span></div>
</header>
<section class="doc-sec" id="customise" aria-labelledby="cr-h">
  <h2 id="cr-h">Play</h2>
  <p>Switch modes, change the crowd size, type a word for the formation.</p>
  <div class="crowd-box">
    <piix-crowd id="cr-demo" mode="crowd" count="90" text="HELLO" height="440"></piix-crowd>
    <div class="c-controls crowd-ctl">
      <div class="ctl wide"><span>Mode</span>
        <div class="seg" id="cr-mode" role="group" aria-label="Mode">
          <button type="button" data-v="crowd" aria-pressed="true">Crowd</button>
          <button type="button" data-v="swarm" aria-pressed="false">Swarm</button>
          <button type="button" data-v="form" aria-pressed="false">Formation</button>
        </div>
      </div>
      <label class="ctl"><span>Count</span><input type="range" id="cr-count" min="10" max="400" step="10" value="90"><output id="cr-count-o">90</output></label>
      <label class="ctl wide"><span>Word</span><input type="text" id="cr-text" value="HELLO" maxlength="10" spellcheck="false"></label>
    </div>
    <pre class="c-code" id="cr-code"></pre>
  </div>
</section>
<section class="doc-sec" id="modes" aria-labelledby="crm-h">
  <h2 id="crm-h">Modes</h2>
  <dl class="kv">
    <dt>crowd</dt><dd>They wander between little waypoints, stop to wave, and high-five when two meet. The cursor parts the crowd.</dd>
    <dt>swarm</dt><dd>They flock across the floor after your cursor, keeping a little personal space.</dd>
    <dt>form</dt><dd>They walk into position to spell <code>text</code>. Click the floor to scatter them; they regroup.</dd>
  </dl>
</section>
<section class="doc-sec" id="attributes" aria-labelledby="cra-h">
  <h2 id="cra-h">Attributes</h2>
  ${table('<piix-crowd>', [
    ['mode', '<code>crowd</code> <code>swarm</code> <code>form</code>', 'crowd'],
    ['count', 'how many agents (up to 600)', '70 (form: 160)'],
    ['text', 'the word to spell in form mode', 'HELLO'],
    ['height', 'stage height in px (or size it with CSS)', '420'],
    ['scale', 'size of one agent pixel', '3']
  ])}
  <p style="margin-top:18px">Method: <code>scatter()</code> knocks everyone flying.</p>
</section>`;

/* ---------- overview ---------- */
const pick = n => sprites.slice(0, n).map(s => `<piix-sprite name="${s.name}" scale="4"></piix-sprite>`).join('');
const indexBody = `<header class="doc-head">
  <div class="crumbs"><span>Components</span></div>
  <h1>Components</h1>
  <p>${sprites.length + PALS.length + 4} components, every one a plain web component. One script tag, then copy any tag from these pages into your HTML, React, Vue, Svelte, Astro, Webflow or Framer project.</p>
</header>
<section class="doc-sec" aria-label="Component families">
  <div class="ov">
    <a href="sprites.html" style="--accent:var(--lime)"><div class="ov-art">${sprites.slice(0, 3).map(s => `<piix-sprite name="${s.name}" scale="4" look="mouse"></piix-sprite>`).join('')}</div><h3>Sprites <span>${sprites.length}</span></h3><p>Small inline characters. Eyes follow the cursor, they blink, breathe, hop and nap. Paste anywhere, like an image.</p></a>
    <a href="pals.html" style="--accent:var(--coral)"><div class="ov-art" id="ov-pals"><span style="font:780 30px var(--f-sans);letter-spacing:-.03em" id="ov-word">live here</span></div><h3>Pals <span>${PALS.length}</span></h3><p>Characters that live on your page: they crawl on headings, bounce on footers, peek over cards, perch on buttons.</p></a>
    <a href="crowd.html" style="--accent:var(--sky)"><div class="ov-art"><piix-crowd mode="crowd" count="26" height="140" scale="2" style="width:100%"></piix-crowd></div><h3>Crowd <span>3</span></h3><p>Hundreds of tiny agents on one stage. They wander and high-five, swarm your cursor, or spell a word.</p></a>
    <a href="pals.html#toys" style="--accent:var(--sun)"><div class="ov-art"><span style="font:780 30px var(--f-sans);letter-spacing:-.03em" id="ov-toys">toy box</span></div><h3>Toys + groups <span>${kinds.toy.length + kinds.group.length}</span></h3><p>Throwable toys that land on your page, and whole crews in one tag: ducks, ants, fish, a choir, fireflies.</p></a>
    <a href="type.html" style="--accent:var(--violet)"><div class="ov-art"><div style="width:80%"><piix-type text="abc" rows="14" cell="6" shade="#c6f432" fit intro="none"></piix-type></div></div><h3>Pixel type <span>1</span></h3><p>Any font as chunky extruded blocks that rain in, lift around the cursor and ripple. Pals can walk on it.</p></a>
  </div>
  <piix-pal pal="bitbug" on="#ov-word" scale="3"></piix-pal>
  <piix-pal pal="dice" on="#ov-toys"></piix-pal>
</section>
<section class="doc-sec" aria-labelledby="ins-h">
  <h2 id="ins-h">Install once</h2>
  <p>Then every tag on these pages just works.</p>
  ${codeBox('<script src="https://cdn.jsdelivr.net/gh/diiviikk5/Piixpal@main/piixpal.min.js"></script>')}
</section>`;

/* ---------- install ---------- */
const BOOKMARKLET = `javascript:(()=>{if(window.Piixpal&&Piixpal.add){Piixpal.clear();}const go=()=>{const q=s=>document.querySelector(s);const h=q('h1')||q('h2');if(h)Piixpal.add('bitbug',h);const p=q('main p')||q('p');if(p)Piixpal.add('moss',p);Piixpal.add('pip','a,button');const f=q('footer')||q('nav')||q('header');if(f)Piixpal.add('boing',f);Piixpal.add('bees','body');};if(window.Piixpal&&Piixpal.add)return go();const s=document.createElement('script');s.src='${CDN_ALL}';s.onload=go;s.onerror=()=>alert('This site blocks outside scripts, so the pals cannot visit. Try another site!');document.head.appendChild(s);})();`;
const installBody = `<header class="doc-head">
  <div class="crumbs"><a href="./">Components</a><span>/</span><span>Install</span></div>
  <h1>Install</h1>
  <p>Pick whatever suits your site. Nothing to download, no build step, no account. Every option below works on its own.</p>
</header>

<section class="doc-sec" id="cdn" aria-labelledby="i1"><h2 id="i1">1. Everything, one tag</h2>
  <p>All ${sprites.length + PALS.length + 4} components in one file (about 40 KB gzipped), served free by jsDelivr. Then use any tag from these pages.</p>
  ${codeBox(`<script src="${CDN_ALL}"></script>\n\n<h1>Hello <piix-pal pal="bitbug"></piix-pal></h1>`)}
</section>

<section class="doc-sec" id="single" aria-labelledby="i2"><h2 id="i2">2. Just the ones you use</h2>
  <p>Every pal and sprite has its own tiny file (1–4 KB). The shared engine loads itself the first time, once, however many you add.</p>
  ${codeBox(`<script src="${CDN_ONE('kitty')}"></script>\n<script src="${CDN_ONE('gloop')}"></script>\n\n<h2>Nap spot <piix-pal pal="kitty"></piix-pal></h2>\n<piix-sprite name="gloop"></piix-sprite>`)}
</section>

<section class="doc-sec" id="nomarkup" aria-labelledby="i3"><h2 id="i3">3. No markup at all</h2>
  <p>For Webflow, Framer, WordPress, Shopify, Squarespace, Notion sites: anywhere with a "custom code" box. Say which pal goes where, right on the script tag. Format: <code>name@css-selector</code>, comma separated, optional <code>?attr=value</code>.</p>
  ${codeBox(`<script src="${CDN_ALL}"\n  data-pals="bitbug@h1, boing@footer, pip@.button, moss@p?at=.9"></script>`)}
  <p style="margin-top:14px">Not sure what to pick? The <a href="builder.html">Builder</a> writes this line for you.</p>
</section>

<section class="doc-sec" id="js" aria-labelledby="i4"><h2 id="i4">4. From JavaScript</h2>
  ${codeBox(`Piixpal.add("bitbug", "h1");                 // a pal on the first h1\nPiixpal.add("pip", ".btn");                  // every .btn is a perch\nPiixpal.add("gloop", "#hero", { size: 220 }); // sprites go inside the element\nPiixpal.add("kitty", someElement);           // or pass an element\n\nPiixpal.list();   // everything registered\nPiixpal.clear();  // remove them all`)}
</section>

<section class="doc-sec" id="frameworks" aria-labelledby="i5"><h2 id="i5">5. React, Next.js, Vue, Svelte, Astro</h2>
  <p>Pals are standard web components, so plain tags work everywhere once the script is loaded. The wrappers just load it for you.</p>
  <div class="tabs" data-tabs>
    <div class="tab-bar" role="tablist"><button type="button" role="tab" aria-selected="true">React / Next</button><button type="button" role="tab" aria-selected="false">Vue</button><button type="button" role="tab" aria-selected="false">Svelte</button><button type="button" role="tab" aria-selected="false">Astro</button></div>
    ${[
      `// copy wrappers/react.jsx + wrappers/load.js, or (soon) npm i piixpal\nimport { PiixPal, PiixSprite, PiixCrowd } from "piixpal/react";\n\nexport default function Hero() {\n  return (\n    <h1>\n      Hello <PiixPal pal="bitbug" />\n      <PiixSprite name="gloop" size={200} />\n    </h1>\n  );\n}`,
      `// main.js\nimport Piixpal from "piixpal/vue";\ncreateApp(App).use(Piixpal).mount("#app");\n\n// vite.config.js\nvue({ template: { compilerOptions: { isCustomElement: t => t.startsWith("piix-") } } })\n\n<!-- any template -->\n<h1>Hello <piix-pal pal="bitbug" /></h1>`,
      `<script>\n  import Piixpal from "piixpal/svelte";\n</script>\n\n<Piixpal />\n<h1>Hello <piix-pal pal="bitbug"></piix-pal></h1>`,
      `<!-- in your layout's <head> -->\n<script is:inline src="${CDN_ALL}"></script>\n\n<h1>Hello <piix-pal pal="bitbug"></piix-pal></h1>`
    ].map((code, i) => `<pre class="codebox tab-pane"${i ? ' hidden' : ''}><button class="copy" type="button" data-copy="${esc(code)}">Copy</button>${esc(code)}</pre>`).join('\n    ')}
  </div>
</section>

<section class="doc-sec" id="selfhost" aria-labelledby="i6"><h2 id="i6">6. Host it yourself</h2>
  <p>Download <a href="https://raw.githubusercontent.com/diiviikk5/Piixpal/main/piixpal.min.js" download>piixpal.min.js</a> (or anything in <code>dist/</code>) and point a script tag at your copy. MIT licensed, no tracking, works offline. An npm package is on the way.</p>
</section>

<section class="doc-sec" id="bookmarklet" aria-labelledby="i7"><h2 id="i7">Try it on any website</h2>
  <p>Drag this button to your bookmarks bar, open any website, and click it. Pals move in for a visit (only on your screen, nothing is changed). Some sites block outside scripts; they will tell you.</p>
  <p><a class="btn btn-lime bookmarklet" href="${esc(BOOKMARKLET)}" onclick="event.preventDefault();alert('Drag me to your bookmarks bar, then click me on any website.')">Piixpal visit</a></p>
</section>`;

/* ---------- builder ---------- */
const builderBody = `<header class="doc-head">
  <div class="crumbs"><a href="./">Components</a><span>/</span><span>Builder</span></div>
  <h1>Builder</h1>
  <p>Tick the pals you want, choose where each one lives, watch them move in below, then copy one line into your site. No markup needed.</p>
</header>
<div class="builder">
  <div class="b-list" id="b-list" aria-label="Pick pals"></div>
  <div class="b-right">
    <div class="b-site" id="b-site">
      <div class="b-nav" data-where="nav"><b>yoursite</b><span class="b-link">Work</span><span class="b-link">About</span><span class="btn btn-sm b-btn">Contact</span></div>
      <h1 class="b-h1" data-where="h1">Make something lovely</h1>
      <p class="b-p" data-where="p">A short paragraph about what you do, where your pals can nap and read.</p>
      <div class="b-row"><span class="btn btn-lime b-btn">Get started</span><span class="btn b-btn">Learn more</span></div>
      <div class="b-card" data-where=".card"><b>A card</b><span>Things hide behind cards.</span></div>
      <div class="b-foot" data-where="footer">footer</div>
    </div>
    <div class="b-out">
      <div class="seg" id="b-mode" role="group" aria-label="Output"><button type="button" data-v="one" aria-pressed="true">One tag, lightest files</button><button type="button" data-v="all" aria-pressed="false">Everything bundle</button></div>
      <pre class="c-code" id="b-code"></pre>
    </div>
  </div>
</div>
<script>window.PIIX_BUILDER = ${JSON.stringify(PALS.map(p => ({ id: p.id, kind: p.kind || 'pal', does: p.does })).concat(sprites.map(s => ({ id: s.name, kind: 'sprite', big: s.big }))))};</script>`;

const pages = [
  ['index.html', { key: 'index', title: 'Components', desc: 'Every Piixpal component: sprites, pals and pixel type.', body: indexBody }],
  ['sprites.html', { key: 'sprites', title: 'Sprites', desc: `${sprites.length} inline pixel sprites with cursor-following eyes. Copy a tag, paste it anywhere.`, body: spritesBody }],
  ['pals.html', { key: 'pals', title: 'Pals', desc: 'Pixel characters that live on your page: crawl, bounce, peek, perch, hang, follow, creep.', body: palsBody }],
  ['install.html', { key: 'install', title: 'Install', desc: 'Every way to add Piixpal to a site: one tag, single files, no-markup, JS, React, Vue, Svelte, bookmarklet.', body: installBody }],
  ['builder.html', { key: 'builder', title: 'Builder', desc: 'Pick pals, choose where they live, copy one line.', body: builderBody }],
  ['crowd.html', { key: 'crowd', title: 'Crowd', desc: 'A stage of hundreds of tiny agents: crowd, swarm and formation modes.', body: crowdBody }],
  ['type.html', { key: 'type', title: 'Pixel type', desc: 'Chunky extruded pixel lettering that pals can walk on.', body: typeBody, fonts: '<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@800&family=Instrument+Serif&family=Pacifico&display=swap" rel="stylesheet">\n' }]
];
for (const [file, p] of pages) writeFileSync(join(out, file), page(p));
console.log(`components/  ${pages.length} pages, ${sprites.length} sprites, ${PALS.length} pals`);
