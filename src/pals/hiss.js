/* HISS: a long green snake who slithers along your text and tastes the air.
 * Job: crawls the glyph outline like Bitbug, but in waves. Flicks its tongue. */
(() => {
  const snake = (phase, tongue = false, eye = 'open') => {
    const rows = art.outline(art.paint(18, 8, (x, y) => {
      if (art.ellipse(x, y, 14.5, 3.5, 2.6, 2.1)) return 'g';                       /* head */
      if (x >= 1 && x <= 12) {
        const c = 4 + Math.round(Math.sin((x + phase) * .85) * 1.2);               /* the wave */
        if (y === c || y === c - 1) return (x + phase) % 4 < 2 ? 'g' : 'G';
      }
      return null;
    }));
    let out = art.compose(rows, [15, 2, [eye === 'open' ? 'w' : 'k']]);
    out = art.put(out, 16, 2, [eye === 'open' ? 'k' : 'g']);
    if (tongue) out = art.put(out, 17, 4, ['r']);
    return out;
  };
  defineSprite('hiss', {
    w: 18, h: 8, scale: 3, does: 'crawl',
    palette: { k: '#17121f', g: '#4fc46a', G: '#2f9a4a', w: '#ffffff', r: '#ff4d6d' },
    frames: {
      walk: [snake(0), snake(1), snake(2), snake(3)],
      idle: [snake(0), snake(0), snake(0, false, 'shut')],
      look: [snake(1), snake(1, true)],
      sniff: [snake(0, true), snake(0), snake(0, true)],
      alarm: [snake(2, true), snake(3, true)],
      hop: [snake(2)],
      flip: [art.trim(art.flipV(snake(0, true, 'shut'))), art.trim(art.flipV(snake(2, true, 'shut')))]
    },
    fps: { walk: 8, idle: 1.5, sniff: 6, alarm: 12, flip: 10 }
  });
})();
