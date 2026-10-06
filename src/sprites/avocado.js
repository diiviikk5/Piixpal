/* AVOCADO: half an avocado, proudly showing off its pit. Ripe for exactly one day. */
(() => {
  const body = art.outline(art.paint(13, 16, (x, y) => {
    const top = y < 7 ? 1 - (7 - y) * .1 : 1;                 /* a pear shape: narrower on top */
    if (!art.ellipse(x, y, 6.5, 8.5, 5.8 * top, 7.2)) return null;
    if (art.ellipse(x, y, 6.5, 10.5, 2.5, 2.5)) return x < 6 && y < 10 ? 'S' : 's';
    if (art.ellipse(x, y, 6.5, 8.8, 4.6 * top, 6.1)) return 'a';
    return 'g';
  }));
  defineFigure('avocado', {
    w: 13, h: 16,
    tag: 'Half an avocado, proudly showing off its pit. Ripe for exactly one day.',
    palette: { k: '#17121f', g: '#3f7a2a', a: '#d8f08a', s: '#9a5a2e', S: '#c98a4e', w: '#ffffff' },
    frames: [art.compose(body, [3, 5, ['ww']], [3, 6, ['ww']], [8, 5, ['ww']], [8, 6, ['ww']])],
    eyes: [{ x: 3, y: 5, w: 2, h: 2 }, { x: 8, y: 5, w: 2, h: 2 }],
    lid: 'a'
  });
})();
