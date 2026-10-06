/* LOAF: a ginger cat in its most efficient shape. Ears twitch when you're not looking. */
(() => {
  const base = [
    '.kk....kk.......',
    '.kok..kok.......',
    '.kbbbbbbbk......',
    'kbbbbbbbbbkkkkk.',
    'kbwwbbwwbbsbsbbk',
    'kbwwbbwwbbbbbbbk',
    'kbbbkpkbbbsbsbbk',
    'kbbbbbbbbbbbbbbk',
    'kdbbbbbbbbbbbdkk',
    '.kkkkkkkkkkkkkk.'
  ];
  defineFigure('loaf', {
    w: 16, h: 10, fps: 1.5,
    tag: 'A ginger cat in its most efficient shape. Ears twitch when you are not looking.',
    palette: { k: '#17121f', b: '#ffa94d', s: '#e07a1f', d: '#d9822b', o: '#ff9cc2', p: '#ff7aa8', w: '#ffffff' },
    frames: [base, base, base, art.put(base, 6, 0, ['...', 'kkk'])],
    eyes: [{ x: 2, y: 4, w: 2, h: 2 }, { x: 6, y: 4, w: 2, h: 2 }],
    lid: 'b'
  });
})();
