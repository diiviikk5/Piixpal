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

/* the browser's own AI, if it's there and ready (never starts a download on its own) */
const gistAI = async (text, context) => {
  try {
    if (!('Summarizer' in self)) return null;
    if ((await Summarizer.availability()) !== 'available') return null;
    const sm = await Summarizer.create({ type: 'key-points', format: 'plain-text', length: 'short', sharedContext: context });
    const out = await sm.summarize(text.slice(0, 6000));
    if (sm.destroy) sm.destroy();
    const pts = String(out).split(/\n+/).map(l => l.replace(/^[\s*•\-–\d.)]+/, '').trim()).filter(Boolean);
    return pts.length ? pts.slice(0, 6) : null;
  } catch (_) { return null; }
};

/* the summary card: TL;DR, the points, where they came from, Copy and Close */
const gistCard = (points, source, close) => {
  const card = uiCard({ tip: true, width: 340, attrs: { role: 'dialog', 'aria-label': 'Summary' } });
  const copy = uiEl('button', { cls: 'ghost', text: 'Copy', attrs: { type: 'button' } });
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(points.map(p => '• ' + p).join('\n')); copy.textContent = 'Copied'; } catch (_) { copy.textContent = 'Press Ctrl+C'; }
  });
  card.append(
    uiEl('h4', { text: 'TL;DR' }),
    uiEl('ul', {}, ...points.map(p => uiEl('li', { text: p }))),
    uiEl('p', { text: source === 'ai' ? 'Summarised on your device by your browser’s built-in AI.' : 'The sentences that say the most, picked by Gist.', style: 'margin-top:8px;font-size:12px;color:#6c6477' }),
    uiEl('div', { cls: 'row' }, copy, uiEl('button', { text: 'Close', attrs: { type: 'button' }, on: { click: close } }))
  );
  return card;
};

/* tldr: skim the element, then hand over the gist */
defineBehavior('tldr', (a, [el], host) => {
  const S = a.s / 3;
  const boxEl = boxOf(host);
  const n = clamp(+host.getAttribute('points') || 3, 1, 6);
  const btn = host.getAttribute('button') ? document.querySelector(host.getAttribute('button')) : null;
  let state = 'idle', t = 0, card = null, result = null, hop = 0;
  const close = () => { uiClose(card); card = null; state = 'idle'; a.say('heart', 700); };
  const summarize = async () => {
    if (state === 'skim') return;
    if (card) { close(); return; }
    state = 'skim'; t = 0; result = null; a.say('...', 1400);
    const text = (el.innerText || el.textContent || '').trim();
    const ai = await gistAI(text, document.title);
    result = ai ? { points: ai, source: 'ai' } : { points: gistPick(gistSentences(text), n), source: 'pick' };
  };
  const esc = e => { if (e.key === 'Escape' && card) close(); };
  addEventListener('keydown', esc);
  if (btn) btn.addEventListener('click', summarize);

  return {
    awake: () => state !== 'idle' || !!card,
    summarize,
    tick(dt) {
      const r = surfaceOf(el) || rectOf(el);
      const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .96;
      a.x = r.l + a.w / 2 + Math.max(0, (r.r - r.l) - a.w) * at; a.y = r.t;
      t += dt;
      if (state === 'skim') {
        a.play('skim');
        /* skim for a moment at least, then present */
        if (result && t > (reduced() ? 0 : 1.1)) {
          state = 'present';
          if (!result.points.length) { a.say('?', 1000); state = 'idle'; return; }
          card = gistCard(result.points, result.source, close);
          uiAnnounce('Summary: ' + result.points.join(' '));
          host.dispatchEvent(new CustomEvent('piix:gist', { bubbles: true, detail: result }));
          hop = .3;
        }
      } else if (state === 'present') a.play('present');
      else a.play('idle');
      hop = Math.max(0, hop - dt);
      a.oy = -Math.sin(Math.PI * hop / .3) * 8 * S;
      if (card) {
        const B = boxEl ? rectOf(boxEl) : null;
        uiPlace(card, a.x, a.y - a.h - 2 * S, B ? { area: B, under: a.y + 2 * S } : { under: a.y + 2 * S });
      }
      if (state === 'idle' && ptr.seen && a.near(20 * S)) a.say('...', 500);
    },
    poke: summarize,
    destroy() { removeEventListener('keydown', esc); if (btn) btn.removeEventListener('click', summarize); if (card) card.remove(); }
  };
});
