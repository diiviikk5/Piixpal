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

/* the words to read: every visible text node in the element, and where each one starts */
const pollyText = el => {
  const nodes = [];
  let text = '';
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: n => {
      const p = n.parentElement;
      if (!p || p.closest('piix-pal,script,style,noscript,[aria-hidden=true]')) return NodeFilter.FILTER_REJECT;
      return n.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  /* a heading and the paragraph after it are two sentences, even without a full stop */
  const block = n => n.parentElement.closest('p,h1,h2,h3,h4,h5,h6,li,dt,dd,td,th,blockquote,figcaption,button,label,div');
  let prev = null;
  for (let n; (n = walk.nextNode());) {
    const b = block(n);
    if (text && prev && b !== prev && !/[.!?…:;]\s*$/.test(text)) text = text.replace(/\s*$/, '. ');
    else if (text && !/\s$/.test(text)) text += ' ';
    nodes.push({ node: n, start: text.length });
    text += n.data;
    prev = b;
  }
  return { text, nodes };
};

/* sentence-sized pieces: long speech gets cut off by some browsers */
const pollyChunks = text => {
  const out = [];
  const re = /[^.!?…]+[.!?…]*["')\]]*\s*/g;
  for (let m; (m = re.exec(text));) {
    if (!m[0].trim()) continue;
    const last = out[out.length - 1];
    if (last && last.text.length + m[0].length < 160) last.text += m[0];
    else out.push({ start: m.index, text: m[0] });
  }
  return out;
};

/* the word at a character index, as a Range on the page */
const pollyRange = (map, i) => {
  let k = map.nodes.length - 1;
  while (k > 0 && map.nodes[k].start > i) k--;
  const { node, start } = map.nodes[k];
  let a = clamp(i - start, 0, node.data.length), b = a;
  while (a > 0 && !/\s/.test(node.data[a - 1])) a--;
  while (b < node.data.length && !/\s/.test(node.data[b])) b++;
  if (b <= a) return null;
  const r = document.createRange();
  r.setStart(node, a); r.setEnd(node, b);
  return r;
};

