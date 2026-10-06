/* CACTUS: a potted cactus who blooms when it's in a good mood. Do not hug. */
(() => {
  const body = [
    '....kkkkkkkk....',
    '...kgGggggggk...',
    '...kgGggggggk.k.',
    '.k.kgwwggwwgkkgk',
    'kgkkgwwggwwgkkgk',
    'kgkkgggkkgggkkgk',
    'kggggggggggggggk',
    '.kkkggggggggkkk.',
    '...kggggggggk...',
    '..kkkkkkkkkkkk..',
    '..kooooooooook..',
    '...kooooooook...',
    '...kodoooodok...',
    '....kkkkkkkk....'
  ];
  defineFigure('cactus', {
    w: 16, h: 15, fps: .5,
    tag: 'A potted cactus who blooms when it is in a good mood. Do not hug.',
    palette: { k: '#17121f', g: '#4fc46a', G: '#9be57a', w: '#ffffff', o: '#e8784a', d: '#c45a30', f: '#ff7aa8' },
    frames: [['................'].concat(body), ['.......ff.......'].concat(art.put(body, 6, 0, ['_kffk_']))],
    eyes: [{ x: 5, y: 4, w: 2, h: 2 }, { x: 9, y: 4, w: 2, h: 2 }],
    lid: 'g'
  });
})();
