/* BUFF: a password-strength meter that lifts. Buff stands on your password field with a
 * barbell; the stronger the password, the bigger the plates. Weak ones make it strain
 * and sweat, strong ones go straight up over its head, and a really good one gets a flex
 * and a sparkle. It also spots the usual suspects: "password", "qwerty", "1234"…
 *
 *   <label>Password <input type="password"><piix-pal pal="buff"></piix-pal></label>
 *   The field gets data-strength="0…4". Event: piix:strength { score, label } */

/* the lifter: a tall round pink body, a red headband, and two strong little arms */
const buffBody = (by, arms, eyes) => {
  let rows = art.paint(18, 19, (x, y) => {
    const yy = y - by;
    if (art.ellipse(x, yy, 9, 10.6, 5, 5.6)) return yy === 7 ? 'h' : 'b';
    if (arms === 'up' && (x === 3 || x === 14) && yy >= 3 && yy <= 10) return 'b';
    if (arms === 'chest' && ((x >= 2 && x <= 3) || (x >= 14 && x <= 15)) && yy >= 11 && yy <= 13) return 'b';
    if (arms === 'flex' && (((x === 2 || x === 3) && yy >= 8 && yy <= 11) || (x === 14 && yy >= 3 && yy <= 10))) return 'b';
    return null;
  });
  rows = art.outline(art.volume(rows));
  const ey = 9 + by;
  if (eyes === 'strain') rows = art.compose(rows, [6, ey, ['e__', '_ee']], [10, ey, ['__e', 'ee_']]);
  else if (eyes === 'happy') rows = art.compose(rows, [6, ey, ['_e_', 'e_e']], [10, ey, ['_e_', 'e_e']]);
  else rows = art.compose(rows, [7, ey, ['e', 'e']], [11, ey, ['e', 'e']]);
  rows = art.compose(rows, [8, ey + 3, eyes === 'strain' ? ['eee'] : ['e.e', '.e.']]);
  return art.compose(rows, [6, 17, ['kk', 'kk']], [11, 17, ['kk', 'kk']]);
};

/* the barbell: a bar, and plates that grow with the score (0 = an empty bar) */
const buffBar = (rows, y, level, oneHand) => {
  const plate = [[0, 0], [1, 2], [2, 3], [2, 4], [3, 5]][level];
  const x0 = oneHand ? 7 : 0, x1 = 17;
  for (let x = x0; x <= x1; x++) rows = art.put(rows, x, y, ['q']);
  if (plate[0]) {
    const pw = plate[0], ph = plate[1], top = y - Math.floor(ph / 2);
    for (const px of [x0, x1 - pw + 1]) for (let dy = 0; dy < ph; dy++) rows = art.put(rows, px, top + dy, ['P'.repeat(pw)]);
  }
  return rows;
};

