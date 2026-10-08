/* GIST: an owl that gives you the TL;DR. Click it and it skims your article, eyes
 * darting along the lines, then puts on its reading glasses and hands you the key points.
 * If the browser has its own AI summarizer ready (Chrome's built-in Summarizer), Gist uses
 * it, on the device. Otherwise it picks the sentences that say the most.
 *
 *   <article>
 *     <piix-pal pal="gist"></piix-pal>
 *     …
 *   </article>
 *
 *   points="3"         how many points
 *   button="#tldr"     a real button that asks for the summary
 *   el.ctl.summarize()    Event: piix:gist { points, source: "ai" | "pick" } */

/* the owl: a round brown body, a pale feathery belly, ear tufts and folded wings */
const gistShape = by => art.outline(art.paint(13, 14, (x, y) => {
  const yy = y - by;
  if ((x === 2 || x === 3) && yy >= 1 && yy <= 2 && yy >= 4 - x) return 'b';
  if ((x === 9 || x === 10) && yy >= 1 && yy <= 2 && yy >= x - 7) return 'b';
  if (art.ellipse(x, yy, 6.5, 7.4, 5, 4.8)) {
    if (art.ellipse(x, yy, 6.5, 9.4, 2.7, 2.6)) return (x + yy) % 3 ? 'c' : 'C';
    if (x <= 2 || x >= 10) return 'B';
    return 'b';
  }
  return null;
}));

