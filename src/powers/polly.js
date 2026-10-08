/* POLLY: a parrot that reads your page out loud, hopping along the words as it says
 * them, each word lighting up as it goes. Uses the browser's own speech (no account, no
 * download, works offline in most browsers).
 *
 *   <article>
 *     <piix-pal pal="polly"></piix-pal>
 *     …your words…
 *   </article>
 *
 *   button="#listen"   a real button that starts and pauses it (good for keyboards)
 *   rate="1"  pitch="1.15"  voice="Samantha"   how it sounds
 *   el.ctl.read()  el.ctl.pause()  el.ctl.stop()        Events: piix:read-start, piix:read-end */

/* the parrot: a green body, a red head, a big yellow beak and a blue tail */
const pollyShape = (by, open, wings) => art.outline(art.paint(13, 15, (x, y) => {
  const yy = y - by;
  if (art.ellipse(x, yy, 7.4, 3.8, 2.9, 2.8)) return 'r';
  if (x >= 10 && x <= 11 && yy >= 3 && yy <= (open ? 4 : 5)) return 'Y';
  if (open && x === 10 && yy === 6) return 'Y';
  if (art.ellipse(x, yy, 6.2, 8.4, 3.4, 4)) return x < 5 || (wings && yy < 8) ? 'G' : 'g';
  if (x >= 2 && x <= 3 && yy >= 10 && yy <= 13 && yy - 10 >= 3 - x) return 'b';
  return null;
}));

/* its eye and feet */
const pollyFace = (rows, by, eyes) => {
  rows = eyes === 'shut' ? art.put(rows, 8, 3 + by, ['ee']) : eyes === 'happy' ? art.compose(rows, [8, 3 + by, ['_e_', 'e_e']]) : art.compose(rows, [8, 3 + by, ['we']]);
  return art.compose(rows, [5, 13, ['o.o']], [5, 14, ['o.o']]);
};

