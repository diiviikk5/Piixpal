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

/* the face: two big eye discs, pupils looking about, a little beak, and glasses for reading */
const gistFace = (rows, by, look, glasses) => {
  rows = art.compose(rows, [3, 4 + by, ['www', 'www']], [7, 4 + by, ['www', 'www']], [6, 6 + by, ['Y']]);
  const px = { l: 0, c: 1, r: 2 }[look];
  if (look === 'shut') rows = art.compose(rows, [3, 5 + by, ['eee']], [7, 5 + by, ['eee']]);
  else if (look === 'happy') rows = art.compose(rows, [3, 4 + by, ['_e_', 'e_e']], [7, 4 + by, ['_e_', 'e_e']]);
  else rows = art.compose(rows, [3 + px, 4 + by, ['e', 'e']], [7 + px, 4 + by, ['e', 'e']]);
  if (glasses) rows = art.compose(rows, [2, 3 + by, ['kkkkkkkkkk']], [2, 6 + by, ['k___k_k___k']]);
  return art.compose(rows, [5, 13, ['Y.Y']]);
};

/* Gist: blinks, skims (eyes darting), thinks, and presents with its glasses on */
defineSprite('gist', {
  w: 13, h: 14, scale: 3, does: 'tldr',
  palette: { k: '#17121f', b: '#a0673a', B: '#7a4a28', c: '#f0d2ad', C: '#d9b088', w: '#ffffff', e: '#17121f', Y: '#ffb347' },
  frames: {
    idle: [gistFace(gistShape(0), 0, 'c'), gistFace(gistShape(0), 0, 'c'), gistFace(gistShape(0), 0, 'shut'), gistFace(gistShape(0), 0, 'c')],
    skim: [gistFace(gistShape(0), 0, 'l'), gistFace(gistShape(0), 0, 'c'), gistFace(gistShape(0), 0, 'r'), gistFace(gistShape(0), 0, 'c')],
    present: [gistFace(gistShape(0), 0, 'c', true), gistFace(gistShape(-1), -1, 'c', true)],
    happy: [gistFace(gistShape(0), 0, 'happy'), gistFace(gistShape(-1), -1, 'happy')]
  },
  fps: { idle: 2, skim: 9, present: 2, happy: 5 }
});

/* small words that say nothing on their own */
const GIST_STOP = new Set(('the and for are but not you all any can had her was one our out has have his how its may new now old see two way who did get let put say she too use that with this from they will would there their what about which when your said each than then them these some could into more other were been like just only over also very such most even much many make made well back where after before while because should through being both does here those under same why yet ever often upon still between however again every across within without around another really something').split(' '));

