# The pal file

`<name>.pal.json`. You edit `palette`, `base` and the few settings; `animate` writes `frames`, `fps`, `w`, `h`, `auto`.

```json
{
  "name": "tofu",
  "scale": 4,
  "does": "crawl",
  "gait": "legs",
  "eyes": ["e"],
  "palette": { "k": "#2c1d24", "b": "#ffb054", "d": "#bf804e", "e": "#2a1a22", "c": "#ff8274" },
  "base": ["..kk......kk..", ".kbbk....kbbk.", "..."],
  "frames": { "idle": [[...rows], [...rows]], "walk": [...] },
  "fps": { "idle": 4, "walk": 7 },
  "auto": ["idle", "walk", "hop", "..."]
}
```

| field | meaning |
|---|---|
| `name` | lowercase letters, digits, dashes. It is the `pal="..."` name |
| `scale` | screen pixels per pal pixel on a website (3 to 5) |
| `does` | the behaviour on a website (below) |
| `gait` | how `animate` makes it move: `legs`, `blob`, `float` |
| `eyes` | palette keys that are eye pixels (default `["e"]`). Add the white of the eye here too if it has one |
| `lid` | palette key the eye closes to (default: the colour touching the eyes) |
| `palette` | one character each, `#rgb`, `#rrggbb` or `#rrggbbaa`. `.` is always empty |
| `base` | the one drawing. Rows, top to bottom, all the same width, facing right |
| `frames` | every clip: a list of frames, each a list of rows, all `w` x `h` |
| `fps` | frames per second for each clip |
| `auto` | the clips `animate` owns and will rebuild. A clip not listed here is yours and is left alone |

## The clips `animate` makes
| clip | what happens |
|---|---|
| `idle` | stands, blinks once, breathes once |
| `walk` | `legs`: feet lift in turn. `blob`: small hops. `float`: bobs, hem ripples |
| `hop` | crouch, up, peak, down, land |
| `happy` | two bounces with its eyes shut |
| `sleep` | eyes shut, slow breathing |
| `look` | glances forward |
| `scared` | up on its toes, shaking |
| `squash` | a landing |
| `flap` | a two-frame lift, for flying behaviours |

Run `animate --force` to rebuild even the clips you drew.

## Behaviours (`does`) and the clips they play
`animate` adds the extra names a behaviour asks for, pointing at the clips above.

| `does` | what the pal does on a page | put the tag inside | clips it plays |
|---|---|---|---|
| `crawl` | walks along the outline of the text | a heading | walk, idle, hop, flip |
| `bounce` | bounces on top of an element; can be thrown | a footer, a card | idle, land, held, dizzy |
| `lounge` | lies on an element, naps, swats the cursor | a paragraph, a card | rest, sleep, swat, purr |
| `perch` | sits on buttons, flies between them | or `on=".btn"` | idle, look, peck, fly |
| `follow` | flies after the cursor, rests when it stops | anything | fly, happy, perch, sleep |
| `float` | hovers, tied to an element | a card | idle, pop |
| `hang` | dangles from the bottom edge | a nav bar | idle, scared |
| `creep` | sneaks along, hides when watched | a heading | walk, idle, peek, hide |
| `climb` | climbs up and round the sides | a card | walk, idle, wag |

A missing clip is skipped, never an error, so any pal can try any behaviour: `<piix-pal pal="tofu" do="bounce">`.

## Drawing a clip yourself
Add it to `frames` with the same width and height as the others (copy a frame from `idle` and change it), give it an `fps`, and keep its name out of `auto`. Good ones to hand-draw:
- `fly` for a bird: wings up, wings down;
- `swat` or `wag`: one limb or the tail in two positions;
- `sleep` with a `z`: one accent pixel that moves up a row each frame.

Then `check`. If a frame is the wrong size, the message names the clip, the frame and the row.

## Using the exported pal on a website
```html
<script src="https://piixpal.dvkk.dev/piixpal.min.js"></script>
<script src="tofu.pal.js"></script>

<h1>Hello <piix-pal pal="tofu"></piix-pal></h1>          <!-- lives on the h1 -->
<piix-pal pal="tofu" do="perch" on=".btn"></piix-pal>     <!-- one pal, every .btn a perch -->
```
From code: `Piixpal.add('tofu', 'h1')`. In React or Next.js, load both scripts with the framework's script component (after interactive) and use the tag as is.
