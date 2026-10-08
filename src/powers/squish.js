/* SQUISH: a marshmallow that minds your character limit. It sits on the corner of a text
 * box, perfectly comfy, until the text gets near the limit; then it starts getting
 * squashed, sweats, shows how many characters are left, and at the limit it's flat as a
 * pancake. Delete a few and it pops back up.
 *
 *   <textarea maxlength="140"></textarea><piix-pal pal="squish"></piix-pal>
 *   limit="280"   if the field has no maxlength
 *   Event: piix:limit { length, limit, left } */

/* the marshmallow: a soft pink-white cube with a face */
const squishShape = (face, color = 'b') => {
  let rows = art.outline(art.volume(art.paint(13, 12, (x, y) => art.rrect(x, y, 1, 1, 11, 10, 3) ? color : null), color, color === 'b' ? 'd' : 'D', color === 'b' ? 'B' : 'R'));
  const F = {
    calm: [[4, 4, ['e___e']], [5, 7, ['eee']]],
    worry: [[4, 4, ['e___e']], [5, 7, ['_e_']], [10, 2, ['t', 't']]],
    panic: [[3, 4, ['e_e_e_e'].map(s => s.slice(0, 7))], [4, 5, ['_e___e'.slice(0, 6)]], [5, 7, ['eee', 'e_e']], [10, 2, ['t', 't']], [1, 3, ['t']]],
    flat: [[3, 5, ['ee___ee']], [5, 7, ['eee']]]
  }[face];
  return art.compose(rows, ...F, [2, 6, ['p']], [10, 6, ['p']]);
};

