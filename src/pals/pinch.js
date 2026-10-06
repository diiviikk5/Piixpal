/* PINCH: a little crab who only knows how to walk sideways, which suits text just fine.
 * Job: scuttles along your headings, snapping its claws. Flips over when poked. */
(() => {
  const crab = (legs, claws = 'open', eyes = 'open') => {
    const rows = art.outline(art.paint(16, 10, (x, y) => {
      if (art.ellipse(x, y, 8, 6, 5.6, 2.9)) return y < 5 ? 'R' : 'r';
      if (art.ellipse(x, y, 2, 3.2, 1.7, 1.7) || art.ellipse(x, y, 14, 3.2, 1.7, 1.7)) return 'r';  /* claws */
      if ((x === 2 || x === 13) && y >= 4 && y <= 5) return 'r';
      if ((x === 6 || x === 9) && y >= 1 && y <= 3) return y === 1 ? 'w' : 'r';                      /* eye stalks */
      if (y === 9 && legs.includes(x)) return 'r';
      return null;
    }));
    let out = art.compose(rows, [6, 1, [eyes === 'open' ? 'k' : 'r']], [9, 1, [eyes === 'open' ? 'k' : 'r']]);
    if (claws === 'open') out = art.compose(out, [1, 2, ['.']], [14, 2, ['.']]);
    return art.put(out, 7, 6, ['kk']);
  };
  const A = [4, 6, 9, 11], B = [3, 7, 8, 12];
  defineSprite('pinch', {
    w: 16, h: 10, scale: 3, does: 'crawl',
    palette: { k: '#17121f', r: '#ff5b3a', R: '#ff9a7a', w: '#ffffff' },
    frames: {
      walk: [crab(A), crab(B)],
      idle: [crab(A), crab(A, 'shut'), crab(A), crab(A, 'open', 'shut')],
      look: [crab(A, 'shut'), crab(A)],
      sniff: [crab(A, 'shut'), crab(A), crab(A, 'shut')],
      alarm: [crab(B), crab(A)],
      hop: [crab([5, 10])],
      flip: [art.trim(art.flipV(crab(A))), art.trim(art.flipV(crab(B)))]
    },
    fps: { walk: 10, idle: 2, look: 3, sniff: 6, alarm: 14, flip: 10 }
  });
})();
