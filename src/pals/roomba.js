/* ROOMBA: a small robot vacuum that takes its job very seriously.
 * Job: sweeps back and forth along an element, bumps the ends, stops and beeps if your
 * cursor is in the way. Poke it and it spins in confusion. */
(() => {
  const base = [
    '...kkkkkkkk...',
    '.kkmmmmmmmmkk.',
    'kmmMMmmmmmmlmk',
    'kddddddddddddk',
    '.kkkkkkkkkkkk.',
    '..k........k..'
  ];
  defineSprite('roomba', {
    w: 14, h: 6, scale: 4, does: 'sweep',
    palette: { k: '#17121f', m: '#5c5470', M: '#8f86a6', d: '#2d2838', l: '#c6f432', r: '#ff4d6d' },
    frames: {
      go: [base, art.put(base, 11, 2, ['k'])],
      beep: [art.put(base, 11, 2, ['r']), base]
    },
    fps: { go: 3, beep: 8 }
  });
})();
