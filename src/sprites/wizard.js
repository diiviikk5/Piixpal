/* WIZARD: a very small wizard whose hat does most of the work. Sparkles on request. */
(() => {
  const body = art.outline(art.paint(16, 18, (x, y) => {
    /* a tall, slightly bent hat */
    if (y <= 7 && Math.abs(x + .5 - (8 + (7 - y) * .25)) <= y * .55 + .6) return (x + y) % 5 === 0 ? 'S' : 'h';
    if (y === 8 && x >= 2 && x <= 13) return 'h';
    if (art.ellipse(x, y, 8, 11, 3.6, 2.8)) return 'f';                                        /* face */
    if (art.ellipse(x, y, 8, 15, 4.8, 2.8)) return y < 14 ? 'w' : 'r';                        /* beard + robe */
    return null;
  }));
  const sparkle = pts => pts.reduce((r, [x, y]) => art.put(r, x, y, ['S']), body);
  defineFigure('wizard', {
    w: 16, h: 18, fps: 3,
    tag: 'A very small wizard whose hat does most of the work. Sparkles on request.',
    palette: { k: '#17121f', h: '#6b4cff', S: '#ffd23f', f: '#ffd9b5', w: '#f3f0fa', r: '#6b4cff' },
    frames: [body, sparkle([[1, 2], [14, 6]]), sparkle([[0, 6], [15, 1]]), body],
    eyes: [{ x: 6, y: 10, w: 1, h: 2 }, { x: 9, y: 10, w: 1, h: 2 }],
    lid: 'f'
  });
})();
