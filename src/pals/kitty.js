/* KITTY: a black cat lounging on your element like it pays the rent.
 * Job: lies there swishing its tail. Bring the cursor close and it swats at it.
 * Leave it alone and it falls asleep. Poke it and it purrs. */
(() => {
  const rest = [
    '..k.k.............',
    '.kkkkk............',
    'kbwbbwk...........',
    'kbbpbbkkkkkkkkk...',
    'kbbbbbbbbbbbbbbk..',
    '.kbbbbbbbbbbbbbbkkk',
    '.kbbbbbbbbbbbbbbbkk',
    '.kkbbkkkkkkkkbbkk..',
    '..kkk.......kkk....'
  ].map(r => r.slice(0, 18).padEnd(18, '.'));
  const tailUp = art.compose(rest, [15, 3, ['..k', '.kk', 'k..']], [16, 5, ['..']], [16, 6, ['..']]);
  const swat = art.compose(rest, [0, 5, ['kk']], [0, 6, ['kbk']], [0, 7, ['.kk']]).map((r, i) => i >= 5 && i <= 7 ? r : r);
  const sleep = art.compose(rest, [1, 2, ['bkbbkb']]);
  const purr = art.compose(rest, [1, 2, ['bkbbkb'.replace(/k/g, 'k')]], [2, 3, ['p']]);
  defineSprite('kitty', {
    w: 18, h: 9, scale: 3, does: 'lounge',
    palette: { k: '#17121f', b: '#2b2436', w: '#c6f432', p: '#ff9cc2' },
    frames: { rest: [rest, rest, tailUp, rest], swat: [swat, rest], sleep: [sleep], purr: [purr] },
    fps: { rest: 3, swat: 7 }
  });
})();
