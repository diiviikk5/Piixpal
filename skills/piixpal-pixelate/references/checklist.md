# Before you say it's done

- [ ] Layout, copy, links and logo are unchanged (diff shows only: the skin, `data-pixel`, the script tag, the chosen tags and button swaps).
- [ ] Pixel font only on headings, labels and buttons; paragraphs, inputs and long text in the site's own font.
- [ ] At most 2 pals; none on body text, forms or the mobile nav.
- [ ] One accent colour; text on it has contrast 4.5:1 or more.
- [ ] No blur, glow or gradients were added.
- [ ] h1 still fits at 375 px wide (pixel fonts are wide; shrink about 15% if it wraps into 4+ lines).
- [ ] Tab through the page: every focusable thing shows the pixel focus ring.
- [ ] With `prefers-reduced-motion: reduce` the pals sit still (Piixpal does this itself; don't override it).
- [ ] Nothing new blocks a click: the primary CTA is clickable with the pal on it.
- [ ] The script is loaded once, deferred, at the end of `<body>`.
- [ ] Before/after screenshots shown to the person, plus how to undo it (remove `data-pixel` and the script tag).
