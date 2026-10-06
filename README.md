<div align="center">

# Piixpal

**Tiny pixel creatures that live on your website.**

They crawl on your headings, nap on your paragraphs, perch on your buttons and bounce on your footer.
One script tag. Zero dependencies. Free and open source (MIT).

</div>

```html
<script src="https://cdn.jsdelivr.net/gh/diiviikk5/Piixpal@main/piixpal.min.js"></script>

<h1>
  Hello world
  <piix-pal pal="bitbug"></piix-pal>
</h1>
```

That's it. The bug finds the outline of your letters and starts walking.

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

Pals notice each other, too. A hard landing from Boing makes Moss grumble, Lurk duck, Pip take off
and Bitbug run. Two Bitbugs that meet share a little heart and turn around.

## Sprites

Sprites are simpler: they sit inline like an image, wherever you paste them.

```html
<piix-sprite name="mochi"></piix-sprite>
<piix-sprite name="gloop" size="200" color="#6b4cff"></piix-sprite>
```

Their eyes follow the cursor, they blink, breathe a pixel, hop when clicked and nap when ignored.

- **12 small sprites:** mochi, toast, robo, cloud, ufo, egg, loaf, onigiri, cactus, planet, candle, pudding
- **8 big sprites** (ghost-scale, recolourable with `color`): gloop, hops, tofu, inky, mumu, spud, fluff, flick

Every sprite can render three ways with `render`:

| `render` | Look |
| --- | --- |
| `pixel` | flat, crisp blocks (small sprites' default) |
| `dots` | LED dot-matrix |
| `voxel` | chunky 3D blocks that turn toward the cursor in perspective (big sprites' default) |

Other attributes: `size`, `scale`, `depth` (voxel extrusion), `color`, `eye`, `hue`, `look="mouse|wander|none"`,
`shy`, `tilt` (`no-shy` / `no-tilt` on big ones), `still`, `sleep-after`.

Browse and customise them all on the components pages (`components/sprites.html`).

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
| `pal` | `bitbug` `boing` `moss` `lurk` `thread` `pip` `bumble` `shel` | `bitbug` |
| `on` | CSS selector for what to live on. Several matches give Pip more perches | parent element |
| `do` | swap the behaviour: `crawl` `bounce` `mind` `peek` `hang` `perch` `follow` `creep` | the pal's own |
| `at` | where along the element, `0` (left) to `1` (right) | random |
| `scale` | size of one sprite pixel in CSS pixels | 3 or 4 |
| `fixed-scale` | don't shrink a notch on phones | off |
| `hue` | recolour by rotating the hue, in degrees (live) | `0` |
| `edge` | `text` walks glyph outlines, `box` walks the element's top edge | `text` |
| `speed` | crawl speed multiplier | `1` |
| `energy` | bounce energy multiplier | `1` |
| `length` | thread length in px (hang) | `70` |

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
```

- `src/core.js`: loop, pointer, overlay layer, sprite baker, `Actor`
- `src/pals/*.js`: the characters (art + clips)
- `src/behaviors/*.js`: what they do
- `src/elements/type.js`: `<piix-type>`
- `src/elements/sprite.js`: `<piix-sprite>` (pixel, dots and voxel renderers)
- `src/sprites/*.js`: the sprites (`big-*` are the big 3D ones)
- `src/boot.js`: `<piix-pal>`
- `lab/`: sprite lab and a playground page

## License

MIT. Use it anywhere. A star on GitHub is plenty.
