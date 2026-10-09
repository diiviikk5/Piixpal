/* PLUG: an offline indicator with feelings. When the connection drops, a little power
 * plug slides into the corner, unplugged and sad, sparks fizzing off its prongs, with a
 * note saying you're offline. When the connection comes back, a socket pops up, Plug
 * hops in with a zap, says so, and slides away again.
 *
 *   <piix-pal pal="plug"></piix-pal>
 *   always     stay in the corner (happily plugged in) even when online
 *   Events: piix:offline, piix:online */

/* the plug: a rounded body with a face, two brass prongs, and a curly cable */
const plugShape = (face, by = 0) => {
  let rows = art.paint(16, 12, (x, y) => {
    const yy = y - by;
    if (art.rrect(x, yy, 3, 2, 11, 10, 3)) return 'b';
    return null;
  });
  rows = art.outline(art.volume(rows));
  rows = art.compose(rows, [13, 4 + by, ['yyy']], [13, 8 + by, ['yyy']]);
  rows = art.compose(rows, [0, 7 + by, ['qq_']], [0, 8 + by, ['_q']], [1, 9 + by, ['qq']]);
  const F = {
    sad: [[5, 5 + by, ['e_e']].map((v, i) => i ? v : 5), [9, 5 + by, ['e_e']], [6, 8 + by, ['_ee_'.slice(0, 4)]], [6, 9 + by, ['e__e']]],
    happy: [[5, 5 + by, ['_e_', 'e_e']], [9, 5 + by, ['_e_', 'e_e']], [6, 8 + by, ['e__e', '_ee_']]],
    zap: [[5, 5 + by, ['eee']], [9, 5 + by, ['eee']], [7, 8 + by, ['ee', 'ee']]]
  }[face];
  rows = art.compose(rows, ...F);
  if (face === 'sad') rows = art.compose(rows, [12, 2 + by, ['t', 't']]);
  return rows;
};

