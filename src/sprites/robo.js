/* ROBO: a tiny robot head. Its antenna light blinks when it's thinking (always). */
(() => {
  const base = [
    '......rr......',
    '......kk......',
    '..kkkkkkkkkk..',
    '.kmmmmmmmmmmk.',
    '.kmMMmmmmmmmk.',
    'kkmwwwmmwwwmkk',
    'kkmwwwmmwwwmkk',
    '.kmmmmmmmmmmk.',
    '.kmmmkkkkmmmk.',
    '.kmmmmmmmmmmk.',
    '..kkkkkkkkkk..'
  ];
  defineFigure('robo', {
    w: 14, h: 11, fps: 2,
    tag: 'A tiny robot head. The antenna light means it is thinking. It is always thinking.',
    palette: { k: '#17121f', m: '#b8c4e0', M: '#eef2ff', w: '#e9fff7', r: '#ff4d6d', y: '#c6f432' },
    frames: [base, art.put(base, 6, 0, ['yy'])],
    eyes: [{ x: 3, y: 5, w: 3, h: 2 }, { x: 8, y: 5, w: 3, h: 2 }],
    pupil: { w: 2, h: 2 },
    lid: 'm'
  });
})();
