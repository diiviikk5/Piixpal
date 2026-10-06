/* LURK — big eyes, little hands, zero courage.
 * Job: hides behind an element and peeks over its edge. Eyes follow you from a distance;
 * come close and it ducks. Pops up somewhere else along the edge a moment later. */
(() => {
  const head = [
    '...kk......kk...',
    '..kpuk....kupk..',
    '..kuuukkkkuuuk..',
    '.kuuuuuuuuuuuuk.',
    '.kuuwwwuuwwwuuk.',
    '.kuuwwwuuwwwuuk.',
    '.kuuwwwuuwwwuuk.',
    '.kuuuuuuuuuuuuk.',
    'khhhkuuuuuukhhhk',
    'kkkkkkkkkkkkkkkk'
  ];
  /* pupil position inside each 3x3 eye (eyes start at col 4 and col 9, row 4) */
  const pupil = (dx, dy) => art.compose(head, [4 + dx, 4 + dy, ['k']], [9 + dx, 4 + dy, ['k']]);
  const shut = art.compose(head, [4, 4, ['uuu', 'kkk', 'uuu']], [9, 4, ['uuu', 'kkk', 'uuu']]);
  const wide = art.compose(head, [4, 4, ['www', 'wkw', 'www']], [9, 4, ['www', 'wkw', 'www']], [2, 3, ['k']], [13, 3, ['k']]);

  defineSprite('lurk', {
    w: 16, h: 10, scale: 4,
    does: 'peek',
    palette: { k: '#1b1226', u: '#58c8ff', h: '#2f97d6', w: '#ffffff', p: '#ff9cc2' },
    frames: {
      c: [pupil(1, 1)],
      l: [pupil(0, 1)],
      r: [pupil(2, 1)],
      u: [pupil(1, 0)],
      ul: [pupil(0, 0)],
      ur: [pupil(2, 0)],
      d: [pupil(1, 2)],
      blink: [shut],
      eep: [wide]
    }
  });
})();
