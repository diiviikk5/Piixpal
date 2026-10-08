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

