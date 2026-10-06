/* DONUT: a strawberry donut with sprinkles. Has a hole in its life and is fine with it. */
(() => {
  const sprinkles = { '3,2': 'y', '6,1': 'b', '10,2': 'g', '12,4': 'y', '2,5': 'b', '11,6': 'w' };
  const body = art.outline(art.paint(15, 11, (x, y) => {
    if (!art.ellipse(x, y, 7.5, 5.5, 7, 5)) return null;
    if (art.ellipse(x, y, 7.5, 5, 1.9, 1.3)) return null;
    const frosted = y < 6 || (y === 6 && (x * 3) % 5 < 2);
    if (frosted) return sprinkles[x + ',' + y] || (x < 6 && y < 3 ? 'P' : 'p');
    return y > 8 ? 'D' : 'd';
  }));
  defineFigure('donut', {
    w: 15, h: 11,
    tag: 'A strawberry donut with sprinkles. Has a hole in its life and is fine with it.',
    palette: { k: '#17121f', p: '#ff9cc2', P: '#ffd1e3', d: '#e8a65a', D: '#c98a4e', y: '#ffd23f', b: '#58c8ff', g: '#7bd63a', w: '#ffffff' },
    frames: [art.compose(body, [3, 4, ['ww']], [3, 5, ['ww']], [10, 4, ['ww']], [10, 5, ['ww']])],
    eyes: [{ x: 3, y: 4, w: 2, h: 2 }, { x: 10, y: 4, w: 2, h: 2 }],
    lid: 'p'
  });
})();
