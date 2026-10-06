/* toy box: things you can throw around the page (do="toss") */
(() => {
  const K = '#17121f';
  /* DUCK: a rubber duck. Squeaks when it lands. Floats in spirit. */
  const duck = [
    '....kkk.....',
    '...kyyyk....',
    '...kywky....',
    '...kyyykoo..',
    '.k.kyyyykk..',
    'kykkyyyyyyk.',
    'kyyyyyyyyyyk',
    'kyyyYYYyyyyk',
    '.kyyyyyyyyk.',
    '..kkkkkkkk..'
  ].map(r => r.padEnd(12, '.').slice(0, 12));
  defineSprite('duck', {
    w: 12, h: 10, scale: 4, does: 'toss',
    toss: { bounce: .5, friction: 4, squeak: true },
    palette: { k: K, y: '#ffd23f', Y: '#e8a512', o: '#ff7a2f', w: '#ffffff' },
    frames: { idle: [duck], held: [art.put(duck, 4, 2, ['_kk'])] }
  });
})();
