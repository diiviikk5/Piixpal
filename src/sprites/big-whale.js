/* WHALE (big): a friendly whale who surfaces now and then for a little spout. */
(() => {
  const body = art.volume(art.paint(28, 18, (x, y) => {
    if (y < 4) return null;
    if (art.ellipse(x, y, 12, 12, 11.6, 6.4)) return y > 13 && x < 18 ? 'B' : 'b';
    /* the tail rises off to the right and splits into a fluke */
    if (x >= 20 && x <= 24 && y >= 8 && y <= 13 && art.ellipse(x, y, 22, 12, 3.5, 3.4)) return 'b';
    if (art.ellipse(x, y, 25, 6.5, 2.4, 2.6) || art.ellipse(x, y, 25.5, 9.5, 2.2, 1.8)) return 'b';
    return null;
  }), 'b', 'd', 'L');
  const mouth = rows => art.put(rows, 3, 13, ['.mmmmmm']);
  const spouts = [
    ['................', '................', '................', '................'],
    ['................', '........w.......', '.......ww.......', '........w.......'],
    ['......w...w.....', '.......w.w......', '........w.......', '........w.......'],
    ['.....w.....w....', '......w...w.....', '.......w.w......', '........w.......']
  ];
  defineFigure('whale', {
    ...BIG, w: 28, h: 18, fps: 2, scale: 7,
    tag: 'A friendly whale who surfaces now and then for a little spout.',
    palette: { b: '#58c8ff', d: '#2f97d6', L: '#bfeaff', B: '#e8f8ff', w: '#bfeaff', k: '#17121f', m: '#17121f' },
    frames: [0, 0, 0, 1, 2, 3, 2].map(i => art.compose(mouth(body), [0, 0, spouts[i]])),
    eyes: [{ x: 5, y: 9, w: 3, h: 3 }],
    pupil: { w: 2, h: 2 },
    recolor: { b: 0, d: -.24, L: .45 }
  });
})();
