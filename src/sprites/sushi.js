/* SUSHI: a piece of salmon nigiri wearing its fish like a very good blanket. */
(() => {
  const body = art.outline(art.paint(17, 11, (x, y) => {
    /* salmon draped over the top, stripes running across */
    if (art.rrect(x, y, 1, 1, 15, 4, 2)) return (x + y) % 4 === 0 ? 'O' : 'o';
    if (art.rrect(x, y, 2, 3, 14, 9, 2)) return 'w';
    return null;
  }));
  defineFigure('sushi', {
    w: 17, h: 11,
    tag: 'A piece of salmon nigiri wearing its fish like a very good blanket.',
    palette: { k: '#17121f', o: '#ff8a5a', O: '#ffd2b8', w: '#ffffff', p: '#ffb3c0' },
    frames: [art.compose(body, [3, 8, ['p']], [13, 8, ['p']], [8, 8, ['kk']])],
    eyes: [{ x: 4, y: 5, w: 3, h: 2 }, { x: 10, y: 5, w: 3, h: 2 }],
    pupil: { w: 2, h: 2 },
    lid: 'w'
  });
})();
