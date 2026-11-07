# Palettes

## From the brand (always first)
Run `node scripts/palette.mjs <brand-hex> [background-hex]` to get the five skin variables from one brand colour: it picks the ink (a very dark shade of the brand, or the site's text colour), the accent's text colour by contrast, and a soft tint. Paste its output into `:root`.

By hand:
- `--px-ink`: the site's darkest text colour. If that's pure black, use #17121f (pixel art looks better with a tinted black).
- `--px-accent`: the primary button colour, unchanged.
- `--px-accent-ink`: #17121f or #ffffff, whichever contrasts more with the accent.
- `--px-paper`: the card/surface colour (often #ffffff).
- `--px-soft`: the accent mixed 85% toward the paper.

## When there's no brand
Pick one; don't invent.

| Name | ink | paper | accent | accent-ink | soft | Feel |
|---|---|---|---|---|---|---|
| Lime (Piixpal) | #17121f | #ffffff | #c6f432 | #17121f | #f3eee3 | fresh, techy |
| Bubblegum | #2b1b3d | #fff8fb | #ff5c9d | #ffffff | #ffe3ef | cute, soft |
| Arcade | #10122b | #f6f7ff | #3d5afe | #ffffff | #e3e7ff | retro game |
| Sunset | #2d1606 | #fffaf2 | #ff7a1a | #2d1606 | #ffe8d1 | warm, friendly |
| Mint | #0f2420 | #f6fffb | #25b89a | #ffffff | #d8f5ee | calm, clean |
| Gameboy | #0f380f | #e0f8d0 | #306230 | #e0f8d0 | #c4e6b0 | nostalgic (green screen) |

Dark sites: swap paper and ink roles (paper = the dark surface, ink = a near-black that's darker still, used for shadows; text stays the site's own).
