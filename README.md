<div align="center">

<a href="https://piixpal.dvkk.dev"><img src="https://piixpal.dvkk.dev/site/readme/hero.png" alt="Piixpal: tiny pixel creatures that live on your website" width="100%"></a>

<h1>Piixpal</h1>

<p><b>Tiny pixel creatures that live on your website.</b></p>

<p>They crawl on your headings, nap on your paragraphs, perch on your buttons, deliver your toasts<br>and turn your page into a game. 118 drop-in web components. Zero dependencies.</p>

<p>
<a href="https://www.npmjs.com/package/piixpal"><img src="https://img.shields.io/npm/v/piixpal?color=c6f432&labelColor=17121f&style=flat-square" alt="npm version"></a>
<a href="https://www.npmjs.com/package/piixpal"><img src="https://img.shields.io/npm/dm/piixpal?color=c6f432&labelColor=17121f&style=flat-square" alt="npm downloads"></a>
<a href="https://www.jsdelivr.com/package/npm/piixpal"><img src="https://img.shields.io/jsdelivr/npm/hm/piixpal?color=c6f432&labelColor=17121f&style=flat-square" alt="jsDelivr hits"></a>
<img src="https://img.shields.io/badge/dependencies-0-c6f432?labelColor=17121f&style=flat-square" alt="zero dependencies">
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-c6f432?labelColor=17121f&style=flat-square" alt="MIT license"></a>
</p>

<p>
<a href="https://piixpal.dvkk.dev"><b>Website</b></a> ·
<a href="https://piixpal.dvkk.dev/components/"><b>Components</b></a> ·
<a href="https://piixpal.dvkk.dev/components/powers"><b>Superpowers</b></a> ·
<a href="https://piixpal.dvkk.dev/components/install"><b>Install</b></a> ·
<a href="https://piixpal.dvkk.dev/components/builder"><b>Builder</b></a>
</p>

</div>

<br>

## Quick start

Paste one line, then put a pal inside anything:

```html
<script src="https://cdn.jsdelivr.net/npm/piixpal@0.4/piixpal.min.js"></script>

<h1>
  Hello world
  <piix-pal pal="bitbug"></piix-pal>
</h1>
```

The bug finds the real outline of your letters and starts walking. Every component on the
[components pages](https://piixpal.dvkk.dev/components/) has a live demo and a copy button.

<table>
<tr>
<td width="50%"><a href="https://piixpal.dvkk.dev/components/powers"><img src="https://piixpal.dvkk.dev/site/readme/powers.png" alt="Superpowers: a platformer, snow on letters, toasts by pigeon, a pull-chain"></a></td>
<td width="50%"><a href="https://piixpal.dvkk.dev/components/sprites"><img src="https://piixpal.dvkk.dev/site/readme/sprites.png" alt="Big 3D sprites"></a></td>
</tr>
<tr>
<td align="center"><b>Superpowers</b>: they leave the page</td>
<td align="center"><b>Sprites</b>: inline, like an image</td>
</tr>
<tr>
<td colspan="2"><a href="https://piixpal.dvkk.dev/components/powers"><img src="https://piixpal.dvkk.dev/site/readme/docs.png" alt="The docs: every component with a live demo and its code"></a></td>
</tr>
<tr>
<td colspan="2" align="center"><b>The docs</b>: every component, live, with the code to copy right beside it</td>
</tr>
</table>

## Install

Pick whatever suits your site. Every option works on its own.

**Script tag** (no build step):

```html
<script src="https://cdn.jsdelivr.net/npm/piixpal@0.4/piixpal.min.js"></script>
```

or just the components you use, each 1–6 KB (the shared engine loads itself, once):

```html
<script src="https://cdn.jsdelivr.net/npm/piixpal@0.4/dist/c/bitbug.min.js"></script>
```

**npm**

```bash
npm install piixpal
```

```jsx
import { PiixPal } from "piixpal/react";   // also piixpal/vue and piixpal/svelte

<h1>Hello <PiixPal pal="bitbug" /></h1>
```

**shadcn**: add a component to your project as a file you own

```bash
npx shadcn@latest add https://piixpal.dvkk.dev/r/bitbug.json
```

**No markup** (Webflow, Framer, WordPress, Shopify): say what goes where on the script tag

```html
<script src="https://cdn.jsdelivr.net/npm/piixpal@0.4/piixpal.min.js"
  data-pals="bitbug@h1, boing@footer, pip@.button"></script>
```

**With AI**: point your assistant at [`llms.txt`](https://piixpal.dvkk.dev/llms.txt), a plain list of every component and how to add it.

The [Builder](https://piixpal.dvkk.dev/components/builder) writes the no-markup line for you, and the
[bookmarklet](https://piixpal.dvkk.dev/components/install#bookmarklet) drops pals onto any website you're looking at.

## What's inside

| | | |
| --- | --- | --- |
| **42 pals** | characters that live on your page: crawlers, bouncers, peekers, toys you can throw, whole crews in one tag | [browse →](https://piixpal.dvkk.dev/components/pals) |
| **23 superpowers** | pals that step out of the page, do real interface jobs, or turn your site into a game | [browse →](https://piixpal.dvkk.dev/components/powers) |
| **49 sprites** | inline characters, 30 small pixel ones and 19 big 3D ones, in six render styles | [browse →](https://piixpal.dvkk.dev/components/sprites) |
| **Crowd** | hundreds of tiny agents on one canvas: they wander, swarm or spell a word | [try →](https://piixpal.dvkk.dev/components/crowd) |
| **Pixel type** | any font as chunky extruded blocks that pals can walk on | [try →](https://piixpal.dvkk.dev/components/type) |

---

## The pals

Every pal is an original character with a job: something it lives on, something that scares it, something that happens when you poke it.

| Pal | Does | Lives on | Poke it and… |
| --- | --- | --- | --- |
| **Bitbug**, a lime beetle with one curious antenna | `crawl` | the real glyph outline of your text: climbs tall letters, hops across spaces | it flips onto its back, legs flailing |
| **Boing**, a coral jelly drop with more energy than sense | `bounce` | the top of any element (footers love it) | it does a big jump. Drag and throw it, too |
| **Moss**, a mushroom who'd rather be reading | `mind` | a line of text, where it reads, flips pages and dozes | it turns its back on you. Three pokes and it moves |
| **Lurk**, big eyes, little hands, zero courage | `peek` | behind a card, peeking over the edge | "eep!" It ducks and pops up somewhere else |
| **Thread**, a small spider on a long string | `hang` | the bottom edge of a nav or banner. Swings when you scroll | it yo-yos |
| **Pip**, a round bird who loves a good button | `perch` | your buttons. Hover one and it flies to the next | it takes off |
| **Bumble**, a fuzzy bee | `follow` | naps on its element, then follows your cursor around the page and flies home when you stop | loop-the-loop |
| **Shel**, a very slow snail | `creep` | the top of your text, leaving a shimmering slime trail | it hides in its shell |

More characters:

| Pal | Does | |
| --- | --- | --- |
| **Gecko** | `climb` | walks the whole border of a card, upside-down underneath too |
| **Mole** | `pop` | whack-a-mole along any edge; fires `piix:bonk` with a count |
| **Balloon** | `float` | tied to your element, sways in the cursor's breeze, pops and re-inflates |
| **Para** | `drop` | parachutes in when its section scrolls into view |
| **Roomba** | `sweep` | cleans along an element, beeps at the cursor |
| **Kitty** | `lounge` | lounges, swats the cursor, naps, purrs |

### Toy box (`do="toss"`)

`ball` `duck` `dice` `pebble` `cube` `can`: grab and throw them. They land on real elements
(headings, paragraphs, buttons, cards), roll off edges onto whatever is below, and can be batted with a
fast cursor swipe. Dice land on a random face; the pebble thuds so loudly other pals react. `land="css"`
sets what counts as a surface.

### Groups: one tag, a whole crew

| Pal | Does | |
| --- | --- | --- |
| `ducks` | `parade` | a mother duck and ducklings who follow her exact path (`count`) |
| `ants` | `march` | a marching line carrying crumbs; scatters and regroups |
| `fish` | `school` | a flocking school inside any box; flees the cursor |
| `sparrows` | `wire` | birds on a wire that hop in a ripple |
| `choir` | `choir` | singers in perfect time, solos on click (`bpm`) |
| `fireflies` | `glow` | blinking lights that gather round the cursor |
| `sheep` | `count` | jump the fence one by one; the fence keeps count |
| `bees` | `beeline` | follow your cursor in single file |

### New ways to play

Pals that react to what people actually do on your site:

| Pal | Does | |
| --- | --- | --- |
| **Peeper** | `guard` | sits on a form field: eyes follow the caret, covers them for passwords, cheers or sweats on validation |
| **Scrolly** | `progress` | a reading-progress bar with a runner who celebrates at the end of the page |
| **Echo** | `mimic` | a copycat cursor: replays your path and clicks half a second late |
| **Snip** | `select` | a highlighter that hops to your text selection and shows a clipboard when you copy |
| **Beep** | `captcha` | guards an "I'm not a robot" checkbox; panics and flees when you tick it |
| **Router** | `signal` | Wi-Fi bars that measure how close your cursor is |
| **Termi** | `type` | a tiny terminal that types out `lines="a|b|c"` |
| **Frog** | `snap` | tongue snaps at your cursor like it's a fly |
| **Penguin** | `slide` | waddles, then belly-slides along an element |
| **Rocket** | `launch` | click: countdown, lift-off with smoke, retro-rocket landing |

Plus **Hiss** (a snake, `crawl`), **Pinch** (a crab that walks sideways, `crawl`), **Shibe** (a shiba, `lounge`)
and **Capy** (a capybara with a yuzu on its head, `mind`).

Pals notice each other, too. A hard landing from Boing makes Moss grumble, Lurk duck, Pip take off
and Bitbug run. Two Bitbugs that meet share a little heart and turn around.

## Superpowers

Pals that step out of the page, do real interface jobs, or turn your site into a game. One tag each.

**Beyond the page**

| | |
| --- | --- |
| **Polly** `pal="polly"` | reads your page aloud, hopping along each word as it is spoken (Web Speech API, words light up) |
| **Gist** `pal="gist"` | an owl that sums up your article in a few key points (the browser's on-device AI when it is ready, a sentence picker otherwise) |
| **Tabby** `pal="tabby"` | a cat that lives in your browser tab's icon, naps while you're away and wakes when you're back |
| **Sprout** `pal="sprout"` | a focus-timer plant that pops out into its own always-on-top window (Document Picture-in-Picture) |
| **Nomad** `pal="nomad"` | a traveller who walks between your browser windows (BroadcastChannel) |

**Pals with jobs**

| | |
| --- | --- |
| **Bulb** `pal="bulb"` | a pull-chain light switch for dark mode, with rope physics |
| **Pidge** `Piixpal.toast("Saved!")` | toast notifications, delivered by pigeon |
| **Plane** `pal="plane"` | tows your announcement banner (a real link) across the page |
| **Fetch** `pal="fetch"` | runs off on every `fetch()` and XHR and brings back the response; `Piixpal.busy(promise)` |
| **Scout** `pal="scout"` | onboarding tours from `data-tour` attributes, with a spotlight |
| **Drone** `pal="drone"` | flies the product picture into your cart |
| **Crumb** `pal="crumb"` | eats your cookie banner when someone accepts or rejects |
| **Buff** `pal="buff"` | a password-strength meter that lifts heavier as the password gets stronger |
| **Meh** `pal="meh"` | a face on your rating slider, from furious to delighted |
| **Squish** `pal="squish"` | a marshmallow that gets squashed as text nears the character limit |
| **Gulp** `pal="gulp"` | a pelican that gulps down files dropped on your drop zone |
| **Plug** `pal="plug"` | shows up when the connection drops, plugs back in when it returns |
| **Avatar** `<piix-avatar seed="mia">` | a unique animated pixel avatar for any name |

**Play your site**

| | |
| --- | --- |
| **Pix** `pal="pix"` | play your page as a platformer: every line of text is a platform, coins hide on buttons |
| **Weather** `<piix-weather kind="snow">` | snow that settles on the real shape of your letters, plus rain, leaves and petals |
| **Gem** `pal="gem"` | a treasure hunt across your whole site, with a reward code |
| **Hatch** `pal="hatch"` | every visitor hatches their own one-of-a-kind pet |
| **Stickers** `<piix-stickers>` | a sheet of stickers visitors peel off and stick anywhere |

Any pal can be kept inside one element with `box="selector"`.

## Sprites

Sprites are simpler: they sit inline like an image, wherever you paste them.

```html
<piix-sprite name="mochi"></piix-sprite>
<piix-sprite name="gloop" size="200" color="#6b4cff"></piix-sprite>
```

Their eyes follow the cursor, they blink, breathe a pixel, hop when clicked and nap when ignored.

- **30 small sprites:** mochi, toast, robo, cloud, ufo, egg, loaf, onigiri, cactus, planet, candle, pudding, coffee, boba, cookie, cherries, donut, avocado, sushi, star, prompty, floppy, inbox, modem, heart, token, alien, wizard, dragon, battery
- **19 big 3D sprites** (recolourable with `color`): gloop, hops, tofu, inky, mumu, spud, fluff, flick, whale, bolt, gpu, server, brain, crt, keycap, llama, elephant, astronaut, unicorn

Every sprite can render three ways with `render`:

| `render` | Look |
| --- | --- |
| `pixel` | flat, crisp blocks (small sprites' default) |
| `dots` | LED dot-matrix |
| `halftone` | shaded sub-dots |
| `dither` | 1-bit Bayer grain |
| `ascii` | one character per pixel |
| `voxel` | chunky 3D blocks that turn toward the cursor in perspective (big sprites' default) |

Other attributes: `size`, `scale`, `depth` (voxel extrusion), `color`, `eye`, `hue`, `look="mouse|wander|none"`,
`shy`, `tilt` (`no-shy` / `no-tilt` on big ones), `still`, `sleep-after`.

Browse and customise them all on the [sprites page](https://piixpal.dvkk.dev/components/sprites).

## Crowd

```html
<piix-crowd mode="form" text="HELLO" count="200"></piix-crowd>
```

A stage of tiny agents, hundreds of them on one canvas, depth-sorted on a 2.5D floor.
`crowd`: they wander, wave and high-five. `swarm`: they flock after the cursor. `form`: they spell `text`.
Click the floor to drop one in; grab one and throw it. `scatter()` knocks everyone flying.

## Usage

Put a pal **inside** the element it should live on:

```html
<footer>
  …
  <piix-pal pal="boing"></piix-pal>
</footer>
```

or point at it from anywhere with `on`:

```html
<piix-pal pal="pip" on=".btn"></piix-pal>   <!-- every .btn is a perch -->
```

### Attributes

All optional.

| Attribute | What it does | Default |
| --- | --- | --- |
| `pal` | which pal: any name from the [components pages](https://piixpal.dvkk.dev/components/) | `bitbug` |
| `on` | CSS selector for what to live on. Several matches give Pip more perches | parent element |
| `do` | swap the behaviour (`crawl`, `bounce`, `mind`, `peek`, `hang`, `perch`…) | the pal's own |
| `at` | where along the element, `0` (left) to `1` (right) | random |
| `scale` | size of one sprite pixel in CSS pixels | 3 or 4 |
| `fixed-scale` | don't shrink a notch on phones | off |
| `hue` | recolour by rotating the hue, in degrees (live) | `0` |
| `edge` | `text` walks glyph outlines, `box` walks the element's top edge | `text` |
| `speed` | crawl speed multiplier | `1` |
| `energy` | bounce energy multiplier | `1` |
| `length` | thread length in px (hang) | `70` |
| `box` | CSS selector: keep the pal inside that element | off |

### Events and methods

```js
const pal = document.querySelector('piix-pal');
pal.addEventListener('piix:ready', e => console.log(e.detail.pal));
pal.addEventListener('piix:poke', () => console.log('ow'));
pal.poke();          // poke it from code
```

Pals sit on one overlay layer above your page. If you have a sticky header, tuck them under it:

```css
:root { --piix-z: 40; }   /* lower than your header's z-index */
```

## `<piix-type>`: pixel lettering pals can walk on

```html
<piix-type text="piixpal" rows="22" cell="14" shade="#c6f432" fit></piix-type>
<piix-pal pal="bitbug" on="piix-type"></piix-pal>
```

Any font, rasterised into chunky blocks with an extruded shadow. Pixels rain in on load, lift off
their shadow around the cursor, and ripple when clicked or when a pal lands on them.

| Attribute | What it does | Default |
| --- | --- | --- |
| `text` | the text; `\|` for a line break | element text |
| `rows` | rasterising resolution (letter height in pixels) | `18` |
| `cell` | size of one block in CSS px | `8` |
| `fit` | shrink blocks to fit the container width | off |
| `color` / `shade` | block colour / shadow colour | `currentColor` / none |
| `shape` | `square` `dot` (dot-matrix) `round` `plus` `diamond` | `square` |
| `depth` | shadow depth in blocks | `1` |
| `gap` | gap between blocks, as a fraction of a block | `0.1` |
| `font` / `weight` | font family / weight to rasterise | inherited / `800` |
| `align` | `left` `center` `right` for multi-line text | `left` |
| `intro` | `none` to skip the rain-in | on |

## Draw your own pal

Sprites are plain strings. Each character is a palette key and `.` is transparent.

```js
Piixpal.sprite('blip', {
  w: 6, h: 4, scale: 4,
  does: 'crawl',
  palette: { k: '#17121f', g: '#c6f432' },
  frames: {
    walk: [['.kkkk.', 'kgkgkk', 'kggggk', '.k..k.'],
           ['.kkkk.', 'kgkgkk', 'kggggk', 'k..k..']]
  },
  fps: { walk: 8 }
});
```

```html
<piix-pal pal="blip"></piix-pal>
```

Behaviours ask for clips by name (`walk`, `idle`, `hop`…) and skip the ones a pal doesn't have,
so any pal can borrow any behaviour. `Piixpal.art` has helpers (`compose`, `put`, `flipV`, `flipH`,
`shift`, `swap`, `trim`) for building frames from parts instead of copy-pasting grids.

## Good manners

- **Never blocks clicks.** Pals only catch pointer events on their own pixels.
- **Respects `prefers-reduced-motion`.** Pals sit still and stay put.
- **Decorative.** The overlay is `aria-hidden`; `<piix-type>` keeps a real `aria-label`.
- **Cheap.** One shared `requestAnimationFrame` loop; pals far off-screen skip their updates.
- **Framework-agnostic.** Standard custom elements: plain HTML, React, Vue, Svelte, Astro, Webflow and Framer embeds.

## Develop

```bash
npm run dev     # http://localhost:5173, rebuilds piixpal.js on every request
npm run build   # concatenates src/ into piixpal.js (+ piixpal.min.js)
npm run docs    # regenerates components/*.html
npm run registry  # regenerates the shadcn registry (r/) and llms.txt
```

- `src/core.js`: loop, pointer, overlay layer, sprite baker, `Actor`
- `src/pals/*.js`: the characters (art + clips)
- `src/behaviors/*.js`: what they do
- `src/elements/type.js`: `<piix-type>`
- `src/elements/sprite.js`: `<piix-sprite>` (pixel, dots and voxel renderers)
- `src/sprites/*.js`: the sprites (`big-*` are the big 3D ones)
- `src/boot.js`: `<piix-pal>`
- `src/powers/*.js`: the superpowers
- `src/ui.js`: accessible cards for pals that need real words (toasts, tours)
- `lab/`: test pages

## Originals only

Every character here is drawn from scratch. Themes nod to tech, AI and internet culture (a GPU, a server rack, a chat
bubble that is always thinking, a startup unicorn, a captcha robot), but none copy a company's logo or mascot or any
copyrighted character, so they're safe to use anywhere.

## Contributing

Issues and pull requests are welcome. New pals are especially welcome: draw one with `Piixpal.sprite` (see above), give it a behaviour, and open a PR. Run `npm run dev` and `node scripts/sheet.mjs src/pals/yours.js` to check your art.

## License

MIT. Use it anywhere, free forever. A star on GitHub is plenty.
