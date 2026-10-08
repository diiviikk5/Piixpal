/* MEH: a face for your feedback slider. Meh rides the thumb of a range input (or sits on
 * your star rating) and its face follows the value: furious at the bottom, meh in the
 * middle, over the moon at the top, with steam, a tear, a blush or little hearts.
 *
 *   <input type="range" min="0" max="10"><piix-pal pal="meh"></piix-pal>
 *   on="#stars"   or a group of radio buttons (star ratings), or a <select>
 *   Event: piix:mood { value, level }  (level 0…10) */

/* the face's skin: cross red at the bottom, sunny yellow in the middle, happy green at the top */
const MEH_SKIN = level => level <= 2 ? ['x', 'X', 'y'] : level >= 8 ? ['g', 'G', 'h'] : ['b', 'd', 'B'];

/* one face for one level: a round head, brows, eyes and a mouth that bends with the mood */
const mehFace = level => {
  const k = level / 10;
  const [body, shade, light] = MEH_SKIN(level);
  let rows = art.outline(art.volume(art.paint(14, 13, (x, y) => art.ellipse(x, y, 7, 6.6, 6.2, 5.8) ? body : null), body, shade, light));
  /* brows: angry slants low down, worried in the middle, raised up high */
  if (level <= 2) rows = art.compose(rows, [3, 3, ['ee_']], [3, 4, ['__e']], [9, 3, ['_ee']], [9, 4, ['e__']]);
  else if (level >= 8) rows = art.compose(rows, [3, 2, ['_ee']], [9, 2, ['ee_']]);
  /* eyes: shut tight, open, or hearts at the very top */
  if (level === 10) rows = art.compose(rows, [3, 4, ['r_r', 'rrr', '_r_']], [8, 4, ['r_r', 'rrr', '_r_']]);
  else if (level === 0) rows = art.compose(rows, [3, 5, ['eee']], [8, 5, ['eee']]);
  else rows = art.compose(rows, [4, 5, ['e', 'e']], [9, 5, ['e', 'e']]);
  /* the mouth: a frown, a flat line, a smile, a big open grin */
  const M = level <= 1 ? ['.eeee.', 'e....e'] : level <= 3 ? ['..ee..', '.e..e.'] : level <= 6 ? ['.eeee.'] : level <= 8 ? ['e....e', '.eeee.'] : ['eeeeee', 'eppppe', '.eeee.'];
  rows = art.compose(rows, [4, 8, M]);
  if (level >= 7) rows = art.compose(rows, [2, 7, ['p']], [11, 7, ['p']]);
  if (level === 0) rows = art.compose(rows, [12, 6, ['t', 't']]);
  return rows;
};

