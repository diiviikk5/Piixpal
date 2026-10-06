/* TOAST: a slice of toast with a pat of butter slowly giving up. */
(() => {
  const base = [
    '..kkkk..kkkk..',
    '.kcccckkcccck.',
    'kcttttyyttttck',
    'kcttttyyttttck',
    'kcttwwttwwttck',
    'kcttwwttwwttck',
    'kctpttkkttptck',
    'kcttttttttttck',
    'kcttttttttttck',
    'kcttttttttttck',
    '.kcccccccccck.',
    '..kkkkkkkkkk..'
  ];
  defineFigure('toast', {
    w: 14, h: 12, fps: 1,
    tag: 'A slice of toast with a pat of butter slowly giving up.',
    palette: { k: '#17121f', c: '#c97a35', t: '#ffdca0', y: '#fff36b', w: '#ffffff', p: '#ffa06b' },
    frames: [base, art.put(base, 7, 4, ['y']), art.compose(base, [7, 4, ['y']], [7, 5, ['y']])],
    eyes: [{ x: 4, y: 4, w: 2, h: 2 }, { x: 8, y: 4, w: 2, h: 2 }],
    lid: 't'
  });
})();
