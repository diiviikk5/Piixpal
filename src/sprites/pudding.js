/* PUDDING: a caramel pudding on a plate. Cannot stop jiggling. */
(() => {
  const base = [
    '....kkkkkk....',
    '..kkcccccckk..',
    '.kcCCccccccck.',
    'kucccuucccuuuk',
    'kuuuuuuuuuuuuk',
    'kuuwwuuuuwwuuk',
    'kuuwwuuuuwwuuk',
    'kupuuukkuuupuk',
    'kduuuuuuuuuudk',
    'kdduuuuuuuuddk',
    '.kkkkkkkkkkkk.',
    'kssssssssssssk',
    '.kkkkkkkkkkkk.'
  ];
  /* jiggle: the caramel top slides a pixel one way, then the other */
  const jig = n => base.map((r, i) => i < 3 ? (n > 0 ? '.' + r.slice(0, -1) : r.slice(1) + '.') : r);
  defineFigure('pudding', {
    w: 14, h: 13, fps: 5,
    tag: 'A caramel pudding on a plate. Cannot stop jiggling.',
    palette: { k: '#17121f', c: '#b85c1f', C: '#e8964a', u: '#ffe08a', d: '#f0c25a', w: '#ffffff', p: '#ffb3a0', s: '#ece6f5' },
    frames: [base, base, jig(1), base, jig(-1), base, base, base],
    eyes: [{ x: 3, y: 5, w: 2, h: 2 }, { x: 9, y: 5, w: 2, h: 2 }],
    lid: 'u'
  });
})();
