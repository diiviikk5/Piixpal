/* UFO: a very small visitor. Came in peace, stayed for the cursor. */
(() => {
  const base = [
    '......kkkk......',
    '....kkggggkk....',
    '...kgwwggwwgk...',
    '...kgwwggwwgk...',
    '..kkggggggggkk..',
    '.kssSSssssssssk.',
    'kssssssssssssssk',
    'kdldddldddldddlk',
    '.kkkkkkkkkkkkkk.'
  ];
  defineFigure('ufo', {
    w: 16, h: 9, fps: 4,
    tag: 'A very small visitor. Came in peace, stayed for the cursor.',
    palette: { k: '#17121f', g: '#8ff0d8', w: '#ffffff', s: '#cbc4dc', S: '#f3f0f8', d: '#8a82a3', l: '#ffd23f' },
    frames: [base, art.put(base, 0, 7, ['kdddldddldddlddk'])],
    eyes: [{ x: 5, y: 2, w: 2, h: 2 }, { x: 9, y: 2, w: 2, h: 2 }],
    lid: 'g'
  });
})();
