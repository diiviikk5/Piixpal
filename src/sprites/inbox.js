/* INBOX: an envelope with a notification badge it cannot stop checking. */
(() => {
  const env = art.outline(art.paint(16, 13, (x, y) => {
    if (art.rrect(x, y, 1, 3, 14, 11, 1)) {
      /* the flap: a V from the top corners */
      const v = Math.abs(x - 7.5) * .62 + 3;
      return y <= v + .4 && y >= v - .6 ? 'k' : y < v ? 'E' : 'e';
    }
    return null;
  }));
  /* a red badge with a white 1 in it */
  const badge = () => art.compose(env, [12, 0, ['.rr.', 'rrrr', 'rrrr', '.rr.']], [13, 1, ['w', 'w']]);
  defineFigure('inbox', {
    w: 16, h: 13, fps: .8,
    tag: 'An envelope with a notification badge it cannot stop checking.',
    palette: { k: '#17121f', e: '#fff7ec', E: '#ffe3c2', r: '#ff4d6d', w: '#ffffff' },
    frames: [env, badge(), badge(), badge()],
    eyes: [{ x: 5, y: 8, w: 2, h: 2 }, { x: 9, y: 8, w: 2, h: 2 }],
    lid: 'e'
  });
})();
