# piixpal-pixelate

An agent skill that turns any existing website into a cute, good-looking pixel-art version of itself, without redesigning it. It keeps the layout, copy and brand colours, then adds:

- a CSS-only pixel skin (notched corners, hard shadows, pixel headings, pixel focus rings) that works on any stack;
- a few chosen pixel components from [Piixpal](https://piixpal.dvkk.dev), swapped in for what's already there;
- at most two pixel characters, placed where they help.

Restraint is the point: the skill carries the taste rules (pixel font for headings only, one accent, no glow, two pals max) so the result reads as crafted, not as a toy.

## Install

Claude Code:
```bash
git clone https://github.com/diiviikk5/Piixpal /tmp/piixpal && cp -r /tmp/piixpal/skills/piixpal-pixelate ~/.claude/skills/
```
Other agents that read `SKILL.md` folders (Cursor, Codex, etc.): copy the folder into their skills directory.

## Use

> "Make my site pixel art, but keep it tasteful"
> "Add a pixel mascot and pixel buttons to this landing page"

Undo any time: remove `data-pixel` from `<html>` and the Piixpal script tag.

## What's inside

| File | What it is |
|---|---|
| `SKILL.md` | the workflow and taste rules |
| `assets/pixel-skin.css` | the drop-in skin |
| `references/components.md` | the short list of Piixpal parts and the per-page budget |
| `references/palettes.md` | brand-to-pixel palette mapping, six fallback palettes |
| `references/checklist.md` | the pre-delivery checks |
| `scripts/palette.mjs` | five skin variables from one brand colour, with a contrast check |
| `scripts/shoot.mjs` | before/after screenshots |

MIT.
