/* CAPY: a capybara with a yuzu on its head. Famously, completely unbothered.
 * Job: minds its own business on your text. Blinks slowly. Dozes. Poke it and it turns
 * round, very calmly, to face the other way. */
(() => {
  const capy = (eyes = 'chill', back = false) => {
    let rows = art.outline(art.paint(20, 12, (x, y) => {
      if (art.ellipse(x, y, 15, 1.4, 1.5, 1.3)) return 'y';                                   /* the yuzu */
      if (x === 16 && y === 0) return 'l';
      if (art.ellipse(x, y, 8, 8, 7.4, 3.6)) return y >= 10 ? 'd' : 'b';                     /* body */
      if (art.rrect(x, y, 11, 3, 18, 9, 2)) return x >= 17 ? 'd' : 'b';                      /* head + snout */
      if (art.ellipse(x, y, 12, 3, 1, 1)) return 'd';                                         /* ear */
      if (y === 11 && (x === 4 || x === 6 || x === 11 || x === 13)) return 'd';               /* feet */
      return null;
    }));
    if (back) return art.flipH(rows);
    if (eyes === 'chill') rows = art.put(rows, 14, 5, ['kk']);
    if (eyes === 'open') rows = art.compose(rows, [14, 4, ['wk']], [14, 5, ['kk']]);
    if (eyes === 'shut') rows = art.put(rows, 14, 6, ['kk']);
    if (eyes === 'cross') rows = art.compose(rows, [13, 4, ['kk']], [14, 5, ['kk']]);
    return art.put(rows, 17, 7, ['k']);
  };
  defineSprite('capy', {
    w: 20, h: 12, scale: 3, does: 'mind',
    palette: { k: '#17121f', b: '#b07a4a', d: '#8a5a32', y: '#ffc23f', l: '#4fc46a', w: '#ffffff' },
    frames: {
      read: [capy(), capy(), capy(), capy(), capy('shut'), capy()],
      flip: [capy('shut'), capy()],
      look: [capy('open')],
      doze: [capy('shut')],
      annoyed: [capy('cross')],
      back: [capy('chill', true)]
    },
    fps: { read: 1, flip: 4, doze: 1 }
  });
})();
