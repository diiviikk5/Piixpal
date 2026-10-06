/* CLOUD: a little cloud with a light, cheerful drizzle. */
(() => {
  const base = [
    '.....kkkk.......',
    '...kkccCCk.kk...',
    '..kccccCCCkcck..',
    '.kccccccccccCCk.',
    'kcccccccccccccck',
    'kcccccccccccccck',
    'kcpccccKKccccpck',
    'kdccccccccccccdk',
    '.kddddddddddddk.',
    '..kkkkkkkkkkkk..'
  ];
  defineFigure('cloud', {
    w: 16, h: 12, fps: 3,
    tag: 'A little cloud with a light, cheerful drizzle.',
    palette: { k: '#17121f', c: '#f4f6ff', C: '#ffffff', d: '#c9d0ea', p: '#ffb3c7', K: '#17121f', b: '#58c8ff' },
    frames: [
      base.concat(['....b......b....', '................']),
      base.concat(['.......b.......b', '....b......b....']),
      base.concat(['................', '.......b.......b'])
    ],
    eyes: [{ x: 4, y: 4, w: 2, h: 2 }, { x: 10, y: 4, w: 2, h: 2 }],
    lid: 'c'
  });
})();
