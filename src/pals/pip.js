/* PIP — a round little bird who loves a good button.
 * Job: perches on top of buttons and links. Hover the button and it flies off,
 * loops around, and lands on another perch when the coast is clear. */
(() => {
  const body = [
    '......kkkk....',
    '.....kyyyyk...',
    '....kyyyyyyk..',
    '....kyyyywkk..',
    '...kyyyyyykkoo',
    '..kyyyyyyyyoo.',
    'kkyyWWWyyyyk..',
    'kyyWWWWWyyyk..',
    '.kyyWWWyyyyk..',
    '..kyyyyyyyk...',
    '...kkkkkkk....',
    '....o..o......'
  ];
  const blink = art.put(body, 8, 3, ['yyk']);
  const peck = art.compose(art.shift(body, 0), [11, 4, ['k..']], [11, 5, ['koo']], [11, 6, ['_oo']]);
  const lookUp = art.compose(body, [8, 3, ['wk']], [9, 2, ['k']]);
  /* flying: legs tucked, wing up or down */
  const tucked = art.put(body, 0, 11, ['..............']);
  const wingUp = art.compose(tucked, [3, 6, ['yyy']], [3, 7, ['yyyyy']], [4, 8, ['yyy']], [2, 2, ['.kk..', 'kWWk.', 'kWWWk', '.kWWk']]);
  const wingDown = art.compose(tucked, [3, 6, ['yyy']], [3, 7, ['yyyyy']], [4, 8, ['yyy']], [3, 9, ['kWWWk']], [4, 10, ['kWk', '.k.']]);

  defineSprite('pip', {
    w: 14, h: 13, scale: 3,
    does: 'perch',
    palette: { k: '#1b1226', y: '#ffd23f', W: '#e89b12', w: '#ffffff', o: '#ff7a2f' },
    frames: {
      idle: [body, body, body, blink, body, body],
      look: [lookUp, lookUp, body],
      peck: [peck, body, peck, body],
      fly: [wingUp, wingDown]
    },
    fps: { idle: 3, look: 2, peck: 8, fly: 12 }
  });
})();
