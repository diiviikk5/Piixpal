# The short list

Pick from here only. Full catalogue: https://piixpal.dvkk.dev/components/ (don't browse it for this job; these are the ones that make a real site better).

## Budget per page

| Level | Pals | UI swaps | Signature |
|---|---|---|---|
| soft | 1 | dividers, focus | none |
| full | 2 | + buttons, toggles, tooltips, toasts | none |
| party | 2 | same as full | 1 |

## Pals (the characters)

A pal is one tag. It lives on the element you point it at and never blocks clicks.

| Pal | Put it on | Why it works |
|---|---|---|
| `bitbug` | the hero `h1` | crawls along the real outline of the letters: the first thing people notice |
| `pip` | the primary button(s), `on=".btn-primary"` | perches on buttons, hops to another when you hover: draws the eye to the CTA |
| `kitty` | a card or the footer | lounges and swats the cursor; a calm reward lower down |
| `thread` | the bottom of the nav | a spider dangling on a thread; good on minimal sites |
| `boing` | the footer | bounces; good for playful sites |
| `scrolly` | a reading-progress bar on articles | runs along as you read; for blogs and docs |

```html
<piix-pal pal="bitbug" on="h1"></piix-pal>
<piix-pal pal="pip" on=".btn-primary"></piix-pal>
```
Options worth knowing: `scale="3"` (pixel size, 2–6), `hue="40"` (recolour to fit the brand), `on="selector"`.

Never: pals on body text, inside forms, on small mobile nav, more than two on a page.

## UI swaps (replace what's there)

| Instead of | Use | Notes |
|---|---|---|
| the primary button | `<piix-button tone="lime">Get started</piix-button>` | or just the skin's `.px-btn` class on the existing button (no JS) |
| a section break / `<hr>` | `<piix-divider from="#17121f" to="#ffffff" kind="wave"></piix-divider>` | between two differently coloured sections; `kind`: wave, mountains, stairs, dissolve |
| a dark-mode switch | `<piix-toggle>Dark mode</piix-toggle>` | a pal walks across to flip it; keeps the site's own dark-mode logic via its `change` event |
| an icon-button title | `<piix-tooltip tip="Copy link">…</piix-tooltip>` | wrap the existing button |
| "Saved" / "Copied" feedback | `Piixpal.toast('Copied')` | replaces alert() or a custom toast |
| a checkbox in settings | `<piix-checkbox>` | only on playful sites |

These are real form controls: they focus, work with the keyboard and submit with forms.

## Signature (party level only, one)

| Component | Where | Cost |
|---|---|---|
| `<piix-scene kind="sakura" fill>` | behind the hero, as its background layer | WebGL; skip on pages that must load instantly |
| `<piix-rpg-box pal="kitty" name="Kit">` | a short product intro or an onboarding hello | plain DOM, cheap |
| `<piix-pixel-image src="team.jpg">` | one photo (team, about) turned into dithered pixels with a lens | WebGL, needs a same-origin or CORS image |

## Never for this job
Cursor trails, glitch or melt text, quake/shake, the sword, weather, the platformer, games: they're fun on Piixpal's own site and wrong on someone's real product unless they ask.
