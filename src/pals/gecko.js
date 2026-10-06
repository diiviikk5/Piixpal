/* GECKO: a tiny lizard with sticky feet.
 * Job: walks the whole border of a card: along the top, down the side, upside-down
 * underneath and back up. Freezes when watched. Poke it and it sprints the other way. */
(() => {
  const A = [
    '....k.....k...',
    '....kk....kk..',
    '..kkggGgggggk.',
    'kkgggggggggggk',
    '..kkggGggggwk.',
    '...kk....kk...',
    '...k.....k....'
  ];
  const B = [
    '...k.....k....',
    '...kk....kk...',
    '..kkggGgggggk.',
    'kkgggggggggggk',
    '..kkggGggggwk.',
    '....kk....kk..',
    '....k.....k...'
  ];
  const fix = rows => art.put(rows, 11, 2, ['wk']);
  const wag = art.put(fix(A), 0, 2, ['k.', '.k', 'k.']);
  defineSprite('gecko', {
    w: 14, h: 7, scale: 3, does: 'climb',
    palette: { k: '#17121f', g: '#7bd63a', G: '#d2ff8a', w: '#ffffff' },
    frames: { walk: [fix(A), fix(B)], idle: [fix(A)], wag: [fix(A), wag] },
    fps: { walk: 10, wag: 8 }
  });
})();
