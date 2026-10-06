/* SHIBE: a very good shiba, lying on your element. Such lounge. Very nap.
 * Job: wags its tail, swats at the cursor when it gets close, naps, and gets happy
 * when you poke it. */
(() => {
  const dog = (tail = 0, eyes = 'open', paw = false, tongue = false) => {
    const rows = art.outline(art.paint(20, 11, (x, y) => {
      if ((x >= 2 && x <= 3 && y >= 1 && y <= 3 && x - 2 <= y - 1) || (x >= 7 && x <= 8 && y >= 1 && y <= 3 && 8 - x <= y - 1)) return 'o';  /* ears */
      if (art.ellipse(x, y, 5, 6, 3.9, 3.4)) return y >= 7 || (x <= 3 && y >= 6) ? 'c' : 'o';                                  /* head */
      if (art.rrect(x, y, 7, 6, 17, 9, 2)) return y === 9 ? 'c' : 'o';                                                           /* body */
      if (art.ellipse(x, y, 17.5, 4.5 + tail, 1.6, 1.6)) return art.ellipse(x, y, 17.5, 4.5 + tail, .8, .8) ? 'c' : 'o';         /* curly tail */
      if (paw && x <= 1 && y >= 8 && y <= 9) return 'c';
      return null;
    }));
    let out = rows;
    if (eyes === 'open') out = art.compose(out, [3, 5, ['k']], [6, 5, ['k']]);
    else if (eyes === 'shut') out = art.compose(out, [2, 5, ['kk']], [6, 5, ['kk']]);
    else out = art.compose(out, [2, 5, ['k']], [3, 4, ['k']], [4, 5, ['k']], [5, 5, ['k']], [6, 4, ['k']], [7, 5, ['k']]);   /* happy ^ ^ */
    out = art.put(out, 4, 7, ['kk']);
    if (tongue) out = art.put(out, 4, 8, ['pp']);
    return out;
  };
  defineSprite('shibe', {
    w: 20, h: 11, scale: 3, does: 'lounge',
    palette: { k: '#17121f', o: '#e8913f', c: '#fff1de', p: '#ff7aa8' },
    frames: {
      rest: [dog(0), dog(-1), dog(0), dog(1)],
      swat: [dog(0, 'open', true), dog(0)],
      sleep: [dog(0, 'shut')],
      purr: [dog(-1, 'happy', false, true), dog(1, 'happy', false, true)]
    },
    fps: { rest: 6, swat: 7, purr: 8 }
  });
})();
