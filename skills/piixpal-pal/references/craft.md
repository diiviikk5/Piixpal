# Drawing a pal that reads

Pixel characters this small work by suggestion. You have about 150 pixels. Spend them on the silhouette and the face.

## Size
| part | pixels |
|---|---|
| whole pal | 10 to 18 wide, 9 to 16 tall |
| eye | 1 wide, 2 tall (big-eyed: 2 x 2) |
| gap between eyes | 3 to 6 |
| outline | 1 |
| feet | 2 wide, 1 to 2 tall |

`animate` adds three empty rows above the head so it can jump; you don't draw them.

## The order to draw in
1. **Silhouette.** Fill the shape with `b` only. Squint: can you tell what it is? If not, exaggerate the one feature that names it (ears, beak, antenna, cap, tail). Change the outline, not the inside.
2. **Outline.** Trace it in `k`. Corners are stepped, never a single diagonal pixel hanging loose. Round things: 2-3 pixel steps at the corners.
3. **Face.** Eyes (`e`) low on the head and wide apart. A 2-pixel mouth (`kk`) one row under them, or none. Cheeks (`c`) one pixel, outside and below the eyes.
4. **Light.** One or two highlight pixels (`h`) top-left. A column or an L of shade (`d`) bottom-right. That's all the shading there is.
5. **Accent.** One extra colour for the thing that makes it itself: beak, antenna light, cap, scarf.

## Colour
- Start from one body colour: `--color` derives the rest so they agree.
- The outline is a very dark version of the body colour, not pure black. It looks softer.
- The accent should be far from the body on the colour wheel (orange beak on a yellow bird, red light on a blue robot).
- Light bodies need the dark outline; a dark body can use a lighter rim instead, but keep one or the other all the way round.

## What makes it cute (and what kills it)
| do | don't |
|---|---|
| head at least half the body | realistic proportions |
| eyes below the middle of the head | eyes high, close together |
| stubby limbs, 1 to 2 px | long thin limbs (they shimmer when it moves) |
| symmetric, or one deliberate asymmetry (a bent ear) | random asymmetry |
| flat colour with 1-2 px of light and shade | dithering, gradients, noise |

## Turning a brief into pixels
- "a frog": `critter`, green, drop the ears, raise two bumps on top for eyes and move the `e` pixels up into them, widen the mouth to 4.
- "a toaster": `bot`, drop the antenna, widen the head, two `k` slots on top, a lever accent on the side.
- "a little flame": `ghost`, warm colour, pull the top into a point (1, then 3, then 5 wide), accent a lighter core in the middle.
- "a coffee cup": `blob` squared off, a handle (3 px loop) on the right side, one curl of steam above in the accent colour.
- "a cat with a hat": `critter`, then a 2-row hat between the ears in the accent colour.

## Checking your own drawing
Run `show`, then look for:
- a row that is one character too long or short (the tool tells you which);
- an outline gap: a `b` touching `.` directly;
- eyes that vanish in the blink because nothing remains: that's fine for 1-pixel eyes, but 2-tall eyes should close to a line;
- feet that are not on the bottom row: `legs` lifts whatever is on the lowest row;
- in `walk`, a foot that detaches: make the leg at least 2 rows tall, or switch `"gait"` to `blob`.
