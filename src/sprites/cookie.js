/* COOKIE: a chocolate chip cookie with one bite missing. It knows who did it. */
(() => {
  const chips = [[3, 3], [8, 4], [2, 8], [6, 9], [9, 8], [5, 2]];
  const body = art.outline(art.paint(13, 13, (x, y) => {
    if (!art.ellipse(x, y, 6.5, 6.5, 5.6, 5.6)) return null;
    if (art.ellipse(x, y, 11.5, 1.5, 3.2, 3.2)) return null;      /* the bite */
    if (chips.some(([cx, cy]) => cx === x && cy === y)) return 'c';
    return (x + y) % 7 === 0 ? 'C' : 'b';
  }));
  defineFigure('cookie', {
    w: 13, h: 13,
    tag: 'A chocolate chip cookie with one bite missing. It knows who did it.',
    palette: { k: '#17121f', b: '#e8a65a', C: '#f6c487', c: '#4a2a1a', w: '#ffffff', m: '#17121f' },
    frames: [art.compose(body, [3, 5, ['ww']], [3, 6, ['ww']], [7, 5, ['ww']], [7, 6, ['ww']], [5, 8, ['mm']])],
    eyes: [{ x: 3, y: 5, w: 2, h: 2 }, { x: 7, y: 5, w: 2, h: 2 }],
    lid: 'b'
  });
})();
