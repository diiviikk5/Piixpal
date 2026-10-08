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

/* Polly: perches, talks (beak open and shut), flaps up to the next word */
defineSprite('polly', {
  w: 13, h: 15, scale: 3, does: 'read',
  palette: { k: '#17121f', r: '#ff4d6d', g: '#3fbf5f', G: '#2a8f45', Y: '#ffd23f', b: '#58c8ff', w: '#ffffff', e: '#17121f', o: '#9a93a6' },
  frames: {
    idle: [pollyFace(pollyShape(0), 0, 'open'), pollyFace(pollyShape(0), 0, 'open'), pollyFace(pollyShape(0), 0, 'shut'), pollyFace(pollyShape(0), 0, 'open')],
    talk: [pollyFace(pollyShape(0, true), 0, 'open'), pollyFace(pollyShape(0), 0, 'open')],
    hop: [pollyFace(pollyShape(-1, false, true), -1, 'open')],
    happy: [pollyFace(pollyShape(0), 0, 'happy'), pollyFace(pollyShape(-1, true, true), -1, 'happy')]
  },
  fps: { idle: 2, talk: 7, happy: 4 }
});

