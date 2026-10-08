/* TABBY: a cat who lives in your browser tab. Tabby's face becomes the page's icon,
 * blinking and looking about. Switch to another tab and it curls up asleep and the tab's
 * title asks you to come back; come back and it wakes up delighted. A little loaf of
 * Tabby sits on the page too.
 *
 *   <piix-pal pal="tabby"></piix-pal>
 *
 *   away="Come back! Tabby misses you"   what the tab says while you're gone
 *   progress          draw a reading-progress ring around the icon
 *   preview="canvas"  also draw the icon on these <canvas> elements (a close-up, say)
 * Everything is put back as it was when the tag is removed. */

/* the face: an orange tabby head, pointy ears, stripes on the forehead, a white muzzle */
const tabbyHead = oy => art.outline(art.paint(16, 16, (x, y) => {
  const yy = y - oy;
  if (yy >= 2 && yy <= 6 && ((x >= 2 && x <= 5 && x - 2 >= 5 - yy - 1) || (x >= 10 && x <= 13 && 13 - x >= 5 - yy - 1))) return (x === 3 || x === 12) && yy >= 4 ? 'p' : 'o';
  if (art.ellipse(x, yy, 8, 9.4, 6.4, 5.4)) {
    if (art.ellipse(x, yy, 8, 12, 2.8, 1.8)) return 'w';
    if ((x === 6 || x === 8 || x === 10) && yy >= 4 && yy <= 6) return 'O';
    return 'o';
  }
  return null;
}));

/* eyes: open, looking left or right, blinking, asleep or happy; and a little pink nose */
const tabbyEyes = (rows, oy, eyes) => {
  const y = 8 + oy;
  const E = {
    open: [[4, y, ['ew', 'ee']], [10, y, ['ew', 'ee']]],
    left: [[4, y, ['we', 'ee']], [10, y, ['we', 'ee']]],
    right: [[5, y, ['ew', 'ee']], [11, y, ['ew', 'ee']]],
    blink: [[4, y + 1, ['ee']], [10, y + 1, ['ee']]],
    sleep: [[4, y + 1, ['e..e', '.ee.']].map((v, i) => i === 0 ? 3 : v), [10, y + 1, ['e..e', '.ee.']]],
    happy: [[4, y, ['.ee.', 'e..e']].map((v, i) => i === 0 ? 3 : v), [10, y, ['.ee.', 'e..e']]]
  }[eyes];
  return art.compose(rows, ...E, [7, 11 + oy, ['pp']], [6, 12 + oy, ['e..e']], [7, 13 + oy, ['ee']]);
};

/* the loaf: a round little body tucked under the head, and a tail that flicks */
const tabbyLoaf = (eyes, tail, oy = 0) => {
  let rows = art.outline(art.paint(22, 19, (x, y) => {
    if (art.ellipse(x, y, 11, 14.6, 8.4, 3.6)) return (x % 4 === 1 && y < 15) ? 'O' : 'o';
    if (tail === 0 && x >= 19 && x <= 20 && y >= 10 && y <= 15) return 'O';
    if (tail === 1 && ((x >= 19 && x <= 20 && y >= 12 && y <= 15) || (x === 21 && y === 11))) return 'O';
    return null;
  }));
  const head = tabbyEyes(tabbyHead(0), 0, eyes);
  return art.compose(rows, ...head.map((r, i) => [2, i + oy, [r.replace(/\./g, '_')]]));
};

/* Tabby on the page: a cat loaf that blinks, flicks its tail, naps, and jumps up when you come back */
defineSprite('tabby', {
  w: 22, h: 19, scale: 3, does: 'tab',
  palette: { k: '#17121f', o: '#ffa64d', O: '#d97a1f', w: '#fff7ec', p: '#ff9fb5', e: '#17121f' },
  frames: {
    idle: [tabbyLoaf('open', 0), tabbyLoaf('open', 1), tabbyLoaf('blink', 0), tabbyLoaf('left', 1), tabbyLoaf('open', 0), tabbyLoaf('right', 1)],
    sleep: [tabbyLoaf('sleep', 0)],
    happy: [tabbyLoaf('happy', 1), tabbyLoaf('happy', 0, -1)]
  },
  fps: { idle: 1.6, happy: 6 }
});

/* the same face, 16 pixels square, for the browser tab */
const TABBY_ICON = Object.fromEntries(['open', 'left', 'right', 'blink', 'sleep', 'happy'].map(k => [k, tabbyEyes(tabbyHead(0), 0, k)]));

