/* STAR: a little star who twinkles on purpose. Main-character energy. */
(() => {
  /* a five-pointed star, by point-in-polygon */
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 3.1 : 7.2, a = -Math.PI / 2 + i * Math.PI / 5;
    return [7.5 + Math.cos(a) * r, 8 + Math.sin(a) * r];
  });
  const inside = (x, y) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const body = art.outline(art.paint(15, 16, (x, y) => inside(x + .5, y + .5) ? (y < 7 && x < 7 ? 'Y' : 'y') : null));
  const glints = [[], [[1, 1], [13, 3]], [[13, 1], [1, 12], [14, 12]], [[0, 5]]];
  defineFigure('star', {
    w: 15, h: 16, fps: 3,
    tag: 'A little star who twinkles on purpose. Main-character energy.',
    palette: { k: '#17121f', y: '#ffd23f', Y: '#fff2a8', w: '#ffffff', p: '#ff9a5a' },
    frames: glints.map(g => g.reduce((rows, [x, y]) => art.put(rows, x, y, ['w']), art.compose(body, [5, 7, ['ww.ww'.replace('.', 'y')]], [5, 8, ['wwyww']], [6, 10, ['pkp'.replace(/p/g, 'y')]]))),
    eyes: [{ x: 5, y: 7, w: 2, h: 2 }, { x: 8, y: 7, w: 2, h: 2 }],
    lid: 'y'
  });
})();
