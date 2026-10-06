/* DRAGON: a pocket dragon. Flaps its little wings. Breathes a little fire now and then. */
(() => {
  const body = (wing, fire) => {
    let rows = art.outline(art.paint(18, 14, (x, y) => {
      if (art.ellipse(x, y, 7, 9, 4.6, 3.6)) return y >= 10 && x >= 5 && x <= 9 ? 'c' : 'g';      /* belly */
      if (art.ellipse(x, y, 12.5, 5, 3.4, 3)) return 'g';                                         /* head */
      if (x >= 14 && x <= 15 && y >= 5 && y <= 6) return 'g';                                      /* snout */
      if (y >= 7 && y <= 9 && x >= 0 && x <= 3 && y - 7 >= 3 - x) return 'g';                      /* tail */
      if ((x === 11 || x === 13) && y === 1) return 'G';                                          /* horns */
      /* wing up or down */
      if (wing ? (y >= 1 && y <= 5 && x >= 3 && x <= 8 && y >= 6 - (x - 3) * .9) : (y >= 4 && y <= 7 && x >= 2 && x <= 6 && y <= 3 + (6 - x))) return 'G';
      if (y === 13 && (x === 5 || x === 9)) return 'g';
      return null;
    }));
    if (fire) rows = art.compose(rows, [16, 4, ['y.']], [16, 5, ['oy']], [16, 6, ['y.']]);
    return rows;
  };
  defineFigure('dragon', {
    w: 18, h: 14, fps: 5,
    tag: 'A pocket dragon. Flaps its little wings. Breathes a little fire now and then.',
    palette: { k: '#17121f', g: '#25b89a', G: '#9be0c8', c: '#fff1de', y: '#ffd23f', o: '#ff7a2f', w: '#ffffff' },
    frames: [body(1), body(0), body(1), body(0), body(1), body(0), body(1, 1), body(0, 1)],
    eyes: [{ x: 12, y: 4, w: 2, h: 2 }],
    lid: 'g'
  });
})();
