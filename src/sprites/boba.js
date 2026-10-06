/* BOBA: a cup of milk tea with a straw and a lot of pearls. Chewy personality. */
(() => {
  const top = [
    '........kk..',
    '.......kk...',
    '......kk....',
    '..kkkkkkkk..',
    '.klllllllk..'.replace('k..', 'lk.'),
    'kkkkkkkkkkkk',
    '.kttttttttk.',
    '.ktwwttwwtk.',
    '.ktwwttwwtk.',
    '.ktttkktttk.',
    '.kttttttttk.'
  ];
  const pearls = [
    ['..kbtbbtbk..', '..kbbtbbbk..', '..kbbbbbbk..', '...kkkkkk...'],
    ['..kbbtbtbk..', '..kbtbbbbk..', '..kbbbbbbk..', '...kkkkkk...']
  ];
  defineFigure('boba', {
    w: 12, h: 15, fps: 1.5,
    tag: 'A cup of milk tea with a straw and a lot of pearls. Chewy personality.',
    palette: { k: '#17121f', l: '#fff7ec', t: '#e8c39e', b: '#4a2a1a', w: '#ffffff' },
    frames: pearls.map(p => top.concat(p)),
    eyes: [{ x: 3, y: 7, w: 2, h: 2 }, { x: 7, y: 7, w: 2, h: 2 }],
    lid: 't'
  });
})();
