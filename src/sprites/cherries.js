/* CHERRIES: two cherries on one stem. Inseparable. Four eyes, one opinion. */
(() => {
  const body = art.outline(art.paint(15, 14, (x, y) => {
    if (art.ellipse(x, y, 4, 9.5, 3.4, 3.4) || art.ellipse(x, y, 11, 9.5, 3.4, 3.4)) return (x === 3 || x === 10) && y === 8 ? 'R' : 'r';
    /* two stems meeting at the top, plus a leaf */
    if ((y >= 1 && y <= 5) && (x === Math.round(7 - (y - 1) * .7) || x === Math.round(7 + (y - 1) * .9))) return 'g';
    if (y >= 0 && y <= 1 && x >= 8 && x <= 10) return 'G';
    return null;
  }));
  defineFigure('cherries', {
    w: 15, h: 14, fps: 1,
    tag: 'Two cherries on one stem. Inseparable. Four eyes, one opinion.',
    palette: { k: '#17121f', r: '#ff3d5a', R: '#ffb3c0', g: '#4a7a2a', G: '#7bd63a', w: '#ffffff' },
    frames: [body],
    /* dot eyes, two per cherry; they look up and down */
    eyes: [{ x: 2, y: 8, w: 1, h: 2 }, { x: 5, y: 8, w: 1, h: 2 }, { x: 9, y: 8, w: 1, h: 2 }, { x: 12, y: 8, w: 1, h: 2 }],
    lid: 'r'
  });
})();
