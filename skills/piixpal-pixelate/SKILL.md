---
name: piixpal-pixelate
description: Turn any existing website into a cute, good-looking pixel-art version of itself, without redesigning it. Use when someone wants their site, landing page, portfolio, docs or app "pixelated", "8-bit", "retro", "pixel art style", "cute", "playful", "more fun", or asks to add pixel characters, a mascot or pixel UI to an existing page. Works on any stack (plain HTML, React, Next.js, Vue, Svelte, Astro, Webflow/Framer embeds). Keeps the layout, copy and brand; adds a pixel skin, a few chosen Piixpal components and at most two characters.
---

# Piixpal Pixelate

Make an existing site feel pixel-crafted and charming while it stays itself: same layout, same words, same brand colours, still fast and accessible. The craft is restraint. A site with a pixel button, pixel headings and one pal reads as delightful; a site with ten pals, glitch text and a cursor trail reads as a toy.

You have two tools:
- **The skin** (`assets/pixel-skin.css`): CSS only, no JavaScript. Notched corners, hard shadows, pixel lettering for headings, pixel focus rings. Works with any framework.
- **Piixpal** (one script tag): pixel UI components and pixel characters ("pals") that live on the page. Pick from the short list in `references/components.md`; never the whole catalogue.

## Workflow

### 1. Read the site before touching it
- Find the stack and where global styles and the `<head>` live (`app/layout.tsx`, `index.html`, `_document`, `nuxt.config`, a theme file).
- Write down, from the code: the brand colours (background, text, primary/button colour), the heading and body fonts, the main sections in order (nav, hero, features, pricing, footer...), and every primary button.
- If you can run it, screenshot the main page now (`scripts/shoot.mjs <url> before.png`). This is the "before" you compare against.

### 2. Choose the level with the person (one question, if they're there)
- **Soft**: pixel headings, pixel focus and selection, dividers, one pal. Safest; right for docs, SaaS, anything serious.
- **Full**: soft + buttons, inputs, cards and badges become pixel objects. Right for portfolios, games, indie products, landing pages.
- **Party**: full + one signature moment (a pixel hero background or a dialogue box). Only when asked for "go all in".
Default to **soft** for a product or docs site, **full** for a personal or playful site.

### 3. Map the palette from the brand, never replace it
Set the skin's variables from colours the site already uses (`references/palettes.md`):
- `--px-ink`: the darkest text colour (outlines and shadows).
- `--px-paper`: the card or surface colour.
- `--px-accent`: the brand's primary button colour. One accent, used for buttons, focus and one highlighted word.
- `--px-accent-ink`: whichever of black or white reads on the accent (contrast 4.5:1 or more).
- `--px-soft`: a quiet tint for badges and code.
No brand colours at all? Pick one palette from `references/palettes.md`, not your own invention.

### 4. Install
1. Copy `assets/pixel-skin.css` into the project's global styles (or import it), and set the variables from step 3 in `:root`.
2. Load the two pixel fonts once, in the head: `<link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;600;700&family=Silkscreen&display=swap" rel="stylesheet">`. Pixelify Sans (mixed case, soft) is for headings; Silkscreen (tiny caps) only for labels, badges and buttons. A self-hosted site: download both from Google Fonts and `@font-face` them.
3. Turn it on: `data-pixel="soft"` or `data-pixel="full"` on `<html>` (in React/Next, on the `<html>` element in the root layout).
4. If you'll use components or pals, add Piixpal once, at the end of `<body>`: `<script src="https://piixpal.dvkk.dev/piixpal.min.js" defer></script>`. In React/Next/Vue the tags work as-is (they are web components); load the script with the framework's script tag (`next/script` with `strategy="afterInteractive"`).

### 5. Place things by the rules
Read `references/components.md` and follow its budget. The short version:
- **Pals: at most 2 on a page.** One where the eye lands first (the hero headline or the main button), one as a reward further down (the footer, a card). Never on body paragraphs people read, never on forms, never two near each other.
- **One signature component** at most (the "party" level only): a pixel scene behind the hero, or a dialogue box introducing the product.
- **Swap, don't add.** Turn the existing primary button into a pixel button; turn the existing section break into a pixel divider. Don't add new sections, copy or buttons.
- Leave alone: body text, navigation layout, pricing tables' numbers, legal text, forms' structure, anything inside the product's app screens.

### 6. Check it, then show it
- Run the site and screenshot the same page again (`scripts/shoot.mjs <url> after.png`), then put before and after side by side for the person.
- Check by eye: headings still readable at mobile width (pixel fonts get wide: drop `h1` size by about 15% if it wraps badly), every button still has a visible label, focus ring visible when tabbing, nothing covers a call to action, pals aren't sitting on text someone needs to read.
- Run through `references/checklist.md` before saying it's done.

## Taste rules (the difference between cute and cringe)

- **Pixel font for headings and labels only.** Body copy, inputs and long text stay in the site's own font. Never pixel-font a paragraph.
- **One accent.** The brand's primary colour, on buttons, focus and one word. No rainbow.
- **Hard shadows, no blur, no glow, no gradients added.** Pixel art has no soft light.
- **Motion is earned.** Pals move; UI doesn't wobble. No cursor trail, glitch text or shaking unless the person asks.
- **Respect the brand.** If the logo is a wordmark, leave it. Never redraw a logo in pixels unless asked.
- **Accessible by default.** Everything Piixpal adds is hidden from screen readers and stops for `prefers-reduced-motion`; keep it that way. Contrast of text on the accent stays 4.5:1 or more.
- **Fast.** One script, deferred. Don't add the WebGL components (scenes, shaders, image effects) on a page that must load instantly unless asked.

## Undo
Everything is opt-in: remove `data-pixel` from `<html>` and the Piixpal script tag, and the site is back. Say this to the person when you finish.
