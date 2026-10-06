/* toy box: things you can throw around the page (do="toss") */
(() => {
  const K = '#17121f';
  /* CUBE: a jelly cube. Wobbles forever after every landing. */
  const cube = [
    '.kkkkkkkkk.',
    'kGGgggggggk',
    'kGgggggggdk',
    'kggkgggkgdk',
    'kggkgggkgdk',
    'kgggggggg dk'.replace(' ', ''),
    'kggggkgggdk',
    'kgggggggddk',
    'kdddddddddk',
    '.kkkkkkkkk.'
  ];
  const wob = n => cube.map((r, i) => i < 5 ? (n > 0 ? '.' + r.slice(0, -1) : r.slice(1) + '.') : r);
  defineSprite('cube', {
    w: 11, h: 10, scale: 4, does: 'toss',
    toss: { bounce: .58, friction: 7 },
    palette: { k: K, g: '#7fe08f', G: '#c8ffd0', d: '#3fae5c' },
    frames: { idle: [cube, wob(1), cube, wob(-1), cube, cube, cube, cube], held: [wob(1), wob(-1)] },
    fps: { idle: 8, held: 10 }
  });
})();
