/* CANDLE: a little candle with a flame that never sits still. */
(() => {
  const body = [
    '....k.....',
    '.kkkkkkkk.',
    'kcCcccccck',
    'kcwwccwwck',
    'kcwwccwwck',
    'kccckkccck',
    'kcCccccccck'.slice(0, 10),
    'kcccccccck',
    'kdccccccdk',
    'kddddddddk',
    '.kkkkkkkk.'
  ];
  const flames = [
    ['....y.....', '...yyy....', '...yoy....', '..yoooy...', '...yoy....'],
    ['.....y....', '....yy....', '...yyoy...', '...yooy...', '...yoy....'],
    ['..........', '....y.....', '...yyy....', '...yoy....', '...yoy....']
  ];
  defineFigure('candle', {
    w: 10, h: 16, fps: 7,
    tag: 'A little candle with a flame that never sits still.',
    palette: { k: '#17121f', y: '#ffd23f', o: '#ff7a2f', c: '#ffe1ec', C: '#ffffff', d: '#f2b5cc', w: '#ffffff' },
    frames: flames.map(f => f.concat(body)),
    eyes: [{ x: 2, y: 8, w: 2, h: 2 }, { x: 6, y: 8, w: 2, h: 2 }],
    lid: 'c'
  });
})();
