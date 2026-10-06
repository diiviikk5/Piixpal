/* MOSS — a mushroom with a book. Has no interest in you whatsoever.
 * Job: sits on an element and reads. Dozes off sometimes. Glances up if you hover too long.
 * Poke it and it turns its back on you. Keep poking and it moves somewhere quieter. */
(() => {
  const cap = [
    '....kkkkkkkk....',
    '..kkvvvvvvvvkk..',
    '.kvvVVvvvvwwvvk.',
    'kvvVVvvvvvwwvvvk',
    'kvwwvvvvvvvvvvvk',
    'kvwwvvvvvwwvvvvk',
    'kkkkkkkkkkkkkkkk'
  ];
  const face = {
    read: ['..kbbbbbbbbbbk..', '..kbkkbbbbkkbk..'],
    look: ['..kbbbbbbbbbbk..', '..kbwkbbbbwkbk..'],
    cross: ['..kbkbbbbbbkbk..', '..kbbkbbbbkbbk..'],
    doze: ['..kbbbbbbbbbbk..', '..kbbbbbbbbbbk..'],
    back: ['..kbbbbbbbbbbk..', '..kbbbbbbbbbbk..']
  };
  const book = [
    '.kkkkkkkkkkkkkk.',
    'bkRRRRRRRRRRRRkb',
    'bkRyyyyyRRRRRRkb',
    '.kRRRRRRRRRRRRk.',
    '.kkkkkkkkkkkkkk.'
  ];
  const bookLow = [
    '..kbbbbbbbbbbk..',
    '.kkkkkkkkkkkkkk.',
    'bkRRRRRRRRRRRRkb',
    'bkRyyyyyRRRRRRkb',
    '.kkkkkkkkkkkkkk.'
  ];
  const back = [
    '..kbbbbbbbbbbk..',
    '..kbbbbbbbbbbk..',
    '.bkbbbbbbbbbbkb.',
    '..kbbbbbbbbbbk..',
    '..kbbbbbbbbbbk..'
  ];
  const legs = ['...kbbbbbbbbk...', '..kkkk....kkkk..'];
  const moss = (f, b = book) => cap.concat(face[f], b, legs);
  /* page flip: a corner of paper pops up over the book */
  const flip = (n) => art.put(moss('read'), 7, 8, n ? ['_ww'] : ['ww_']);

  defineSprite('moss', {
    w: 16, h: 16, scale: 3,
    does: 'mind',
    palette: {
      k: '#1b1226', v: '#8a6bff', V: '#cbbcff', w: '#fffdf5', b: '#ffe6c4',
      R: '#25b89a', y: '#ffd23f'
    },
    frames: {
      read: [moss('read'), moss('read'), moss('read'), moss('read'), moss('read'), moss('read')],
      flip: [flip(0), flip(1), moss('read')],
      look: [moss('look', bookLow)],
      doze: [moss('doze', bookLow)],
      annoyed: [moss('cross', bookLow)],
      back: [cap.concat(face.back, back, legs)]
    },
    fps: { read: 1, flip: 7, doze: 1 }
  });
})();
