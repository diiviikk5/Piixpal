/* COFFEE: a mug of coffee, steaming gently, quietly judging your sleep schedule. */
(() => {
  const mug = [
    '.kkkkkkkkk....',
    'kcCccccccck...',
    'kmmmmmmmmmkkkk',
    'kmwwmmmwwmkmmk',
    'kmwwmmmwwmkmmk',
    'kmpmmmmmpmkkkk',
    'kmmmmkkmmmk...',
    'kmmmmmmmmmk...',
    '.kmmmmmmmk....',
    '..kkkkkkk.....'
  ];
  const steam = [
    ['...s....s.....', '....s..s......', '...s....s.....', '....s..s......'],
    ['....s..s......', '...s....s.....', '....s..s......', '...s....s.....'],
    ['..............', '....s...s.....', '...s...s......', '....s...s.....']
  ];
  defineFigure('coffee', {
    w: 14, h: 14, fps: 3,
    tag: 'A mug of coffee, steaming gently, quietly judging your sleep schedule.',
    palette: { k: '#17121f', m: '#ff6b4a', c: '#6b3b1f', C: '#9a5a2e', w: '#ffffff', p: '#ffb3a0', s: '#c9c3d6' },
    frames: steam.map(st => st.concat(mug)),
    eyes: [{ x: 2, y: 7, w: 2, h: 2 }, { x: 7, y: 7, w: 2, h: 2 }],
    lid: 'm'
  });
})();
