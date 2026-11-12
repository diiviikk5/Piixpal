---
name: piixpal-pal
description: Create a custom animated pixel character ("pal") from a plain-language description, and put it to work: living on a website (Piixpal), or as a terminal pet that watches Claude Code or Codex. Use when someone asks for a pixel mascot, pixel character, sprite, pet, buddy, "pal", a tamagotchi-style companion, a character for their site's header/footer/buttons, or a pet for their coding agent or terminal. You draw one frame; the bundled tool animates it (blink, breathe, walk, hop, sleep, look, scared), checks it, previews it and exports it.
---

# Piixpal Pal

Make a small pixel character that feels alive, from a description, in a few minutes. The whole method is: **draw one good frame, let the tool animate it, look at it, fix what looks wrong.**

A pal is a text file. Each character is a pixel, each letter a colour:

```
"palette": { "k": "#2c1d24", "b": "#ffb054", "e": "#2a1a22", "c": "#ff8274" },
"base": [
  "..kk......kk..",
  ".kbbk....kbbk.",
  ".kbcbkkkkbcbk.",
  ".kbbbbbbbbbbk.",
  ".kbbebbbbebbk.",     <- "e" is an eye: the tool knows how to blink it
  ".kbbebbbbebbk.",
  ".kbcbbkkbbcbk.",
  ...
```

Everything goes through `scripts/pal.mjs` (Node 18+, no install).

## Workflow

### 1. Get the brief (one question at most)
You need: **what it is** (a frog, a toaster, a ghost with a hat), **its one or two colours**, and **where it will live** (website, terminal pet, or both). If they gave a description, start; don't interview.

### 2. Start from the closest archetype
```
node scripts/pal.mjs new <name> --from <archetype> --color <#hex> [--does <behaviour>]
```
| archetype | shape | moves by | good for |
|---|---|---|---|
| `blob` | round drop | little hops | slimes, fruit, planets, anything round |
| `critter` | head with ears, four stub feet | stepping | cats, dogs, bears, foxes, frogs |
| `bird` | side view, beak, two legs | stepping | birds, ducks, chicks, penguins |
| `bot` | antenna, square head, legs | stepping | robots, appliances, boxes with faces |
| `ghost` | dome with a wavy hem | floating | ghosts, jellyfish, clouds, flames |
| `shroom` | cap on a stalk | bobbing | mushrooms, plants, hats-on-things, lamps |

`--color` is the body colour; outline, shade, highlight and cheek are derived from it so they always match. It writes `<name>.pal.json` already animated, and prints the pal.

### 3. Make it theirs: edit `base` and `palette`
Open the `.pal.json` and redraw the `base` rows into the character asked for. This is the creative step; read `references/craft.md` first. The rules that matter most:
- **Keep it 10 to 18 pixels a side.** Small is what makes it read as a character.
- **Silhouette first.** Ears, tail, hat, antenna: one feature that tells you what it is in black-on-white.
- **Every row the same width.** `.` is empty.
- **Eyes use the key `e`** (or list yours in `"eyes"`), two pixels tall, and sit low and wide apart: that is what makes it cute.
- **4 to 6 colours.** One dark outline (`k`), body, shade, a highlight, one accent.
- Sprites face **right**; the library mirrors them when they turn.

Then rebuild the animations from the new drawing:
```
node scripts/pal.mjs animate <name>.pal.json
```
Set `"gait"` to match the body: `legs` (steps with its feet), `blob` (hops), `float` (drifts, hem ripples).

### 4. Look at it. Every time.
```
node scripts/pal.mjs show <name>.pal.json          every clip, drawn in the terminal
node scripts/pal.mjs check <name>.pal.json         errors and notes
node scripts/pal.mjs export <name>.pal.json out    out/<name>.png: the sheet, one row per clip
```
Read the PNG sheet (it is an image you can open) and judge it honestly: does the silhouette read? Is the outline unbroken in every frame? Does the blink look like a blink? Fix `base` and re-run `animate`. Two or three passes is normal; one pass is rarely good.

### 5. Hand-finish only what needs it
The automatic clips are right for most pals. When a clip needs a special pose (wings up, a wagging tail, a yawn), add it yourself under `"frames"`, same size as the others: `animate` never overwrites a clip you drew (it lists the ones it owns under `"auto"`). See `references/format.md` for the clips each behaviour plays.

### 6. Deliver it where they want it
**On a website**
```
node scripts/pal.mjs export <name>.pal.json <dir>
```
gives `<name>.pal.js` (the pal), `<name>.png` (the sheet) and `<name>.html` (a live test page: open it). Usage:
```html
<script src="https://piixpal.dvkk.dev/piixpal.min.js"></script>
<script src="<name>.pal.js"></script>
<h1>Hello <piix-pal pal="<name>"></piix-pal></h1>
```
The pal lives on the element it is inside. `do="..."` on the tag overrides its behaviour.

**As a terminal pet for Claude Code / Codex**
```
node scripts/pal.mjs pet <name>.pal.json      saves it and makes it the active pet
node scripts/pal.mjs agents                   shows the Claude Code status line + hooks and the Codex notify line
node scripts/pal.mjs agents --write           writes them (keeps a .bak; never replaces an existing status line)
```
Then the person runs the pet in a pane beside their agent. Ask before `--write`: it edits their settings. Details and troubleshooting: `references/agents.md`.

## What good looks like
- Recognisable at a glance at actual size, not only zoomed in.
- The outline is closed in every frame of every clip.
- It blinks, breathes and moves without any part popping or tearing.
- `check` prints no errors, and no notes you can't explain.
- The person saw it (the sheet, the terminal drawing, or the test page) before you said it was done.

## Don't
- Don't draw big (over ~20 px): it stops being a pal and the animations get muddy.
- Don't use more than 8 colours, gradients, or anti-aliasing.
- Don't hand-write all the frames. Draw `base`, run `animate`, then touch up.
- Don't copy an existing character (a named game, film or brand mascot). Make an original one in that spirit.
