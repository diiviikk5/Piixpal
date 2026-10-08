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

/* the sentences of a text, line by line (so a heading never glues onto its paragraph), tidied */
const gistSentences = text => text.split(/\n+/)
  .flatMap(line => line.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [])
  .map(s => s.trim()).filter(s => s.split(' ').length >= 5);

/* pick the sentences that matter most: the words they share with the rest, where they sit, how long they run */
const gistPick = (sents, n) => {
  const words = s => s.toLowerCase().match(/[a-zÀ-ɏ']{3,}/g) || [];
  const freq = new Map();
  sents.forEach(s => words(s).forEach(w => { if (!GIST_STOP.has(w)) freq.set(w, (freq.get(w) || 0) + 1); }));
  const top = Math.max(1, ...freq.values());
  return sents.map((s, i) => {
    const ws = words(s).filter(w => !GIST_STOP.has(w));
    let sc = ws.reduce((t, w) => t + freq.get(w) / top, 0) / Math.pow(Math.max(ws.length, 1), .45);
    if (i === 0) sc *= 1.35;
    if (s.length > 260) sc *= .7;
    return { s, i, sc };
  }).sort((p, q) => q.sc - p.sc).slice(0, n).sort((p, q) => p.i - q.i).map(o => o.s);
};

