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

/* light up the word being spoken (CSS Custom Highlight API, where the browser has it) */
let pollyStyled = false;
const pollyMark = range => {
  if (!window.CSS || !CSS.highlights || typeof Highlight === 'undefined') return;
  if (!pollyStyled) {
    pollyStyled = true;
    const st = document.createElement('style');
    st.textContent = '::highlight(piix-read){background-color:#c6f432;color:#17121f}';
    document.head.appendChild(st);
  }
  if (range) CSS.highlights.set('piix-read', new Highlight(range)); else CSS.highlights.delete('piix-read');
};

/* a voice that speaks the page's language (or the one asked for) */
const pollyVoice = (lang, want) => {
  const vs = speechSynthesis.getVoices();
  if (want) { const v = vs.find(v => v.name.toLowerCase().includes(want.toLowerCase())); if (v) return v; }
  const L = (lang || 'en').toLowerCase();
  return vs.find(v => v.lang.toLowerCase() === L && v.localService) || vs.find(v => v.lang.toLowerCase().startsWith(L.slice(0, 2))) || null;
};

/* read: speak the element, standing on each word as it's said */
defineBehavior('read', (a, [el], host) => {
  const S = a.s / 3;
  const can = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  let map = null, chunks = [], ci = 0, word = -1, state = 'idle', from = null, hop = 1, guessT = 0, gotBoundary = false, chunkT = 0, userScrolled = 0;
  const btn = host.getAttribute('button') ? document.querySelector(host.getAttribute('button')) : null;
  const rate = +host.getAttribute('rate') || 1, pitch = +host.getAttribute('pitch') || 1.15;
  const label = t => { if (btn) btn.setAttribute('aria-pressed', String(t)); };
  const onScroll = () => { userScrolled = now(); };
  addEventListener('wheel', onScroll, { passive: true });
  addEventListener('touchmove', onScroll, { passive: true });
  const speak = (k, fromChar = 0) => {
    const c = chunks[k];
    if (!c) return finish(true);
    ci = k;
    const u = new SpeechSynthesisUtterance(c.text.slice(fromChar));
    const v = pollyVoice(document.documentElement.lang, host.getAttribute('voice'));
    if (v) u.voice = v;
    u.lang = (v && v.lang) || document.documentElement.lang || 'en';
    u.rate = rate; u.pitch = pitch;
    u.onboundary = e => { if (e.name && e.name !== 'word') return; gotBoundary = true; word = c.start + fromChar + e.charIndex; };
    u.onstart = () => { chunkT = 0; guessT = 0; gotBoundary = false; word = c.start + fromChar; };
    u.onend = () => { if (state === 'reading' && u === cur) speak(k + 1); };
    u.onerror = e => { if (state === 'reading' && u === cur && e.error !== 'interrupted' && e.error !== 'canceled') finish(false); };
    cur = u;
    speechSynthesis.speak(u);
  };
  let cur = null;
  const read = () => {
    if (!can) { a.say('x', 1200); uiAnnounce('This browser cannot read aloud'); return; }
    if (state === 'paused') { state = 'reading'; label(true); speak(ci, Math.max(0, word - chunks[ci].start)); return; }
    map = pollyText(el);
    chunks = pollyChunks(map.text);
    if (!chunks.length) return;
    speechSynthesis.cancel();
    state = 'reading'; label(true); word = 0;
    host.dispatchEvent(new CustomEvent('piix:read-start', { bubbles: true }));
    speak(0);
  };
  const pause = () => { if (state !== 'reading') return; state = 'paused'; cur = null; speechSynthesis.cancel(); label(false); };
  const finish = done => {
    state = 'idle'; cur = null; word = -1; pollyMark(null); label(false);
    if (can) speechSynthesis.cancel();
    from = { x: a.x, y: a.y }; hop = 0;
    if (done) a.say('heart', 1200);
    host.dispatchEvent(new CustomEvent('piix:read-end', { bubbles: true, detail: { done } }));
  };
  const toggle = () => state === 'reading' ? pause() : read();
  if (btn) btn.addEventListener('click', toggle);
  let lastWord = -2;

  return {
    awake: () => state !== 'idle' || hop < 1,
    read, pause, stop: () => finish(false),
    tick(dt) {
      /* no word timings from this voice? walk the words at a speaking pace instead */
      if (state === 'reading') {
        chunkT += dt;
        if (!gotBoundary && chunkT > .6 && map) {
          guessT += dt * 14 * rate;
          const c = chunks[ci];
          if (c) {
            let i = Math.min(c.start + c.text.length - 1, c.start + Math.floor(guessT));
            while (i > c.start && !/\s/.test(map.text[i - 1])) i--;
            word = Math.max(word, i);
          }
        }
      }
      const range = state !== 'idle' && map && word >= 0 ? pollyRange(map, word) : null;
      let target;
      const rr = range && range.getClientRects()[0];
      if (rr) target = { x: rr.left + scrollX + rr.width / 2, y: rr.top + scrollY + 2 * S };
      else {
        /* waiting: perched on the very first word */
        const first = pollyRange(map || (map = pollyText(el)), 0), fr = first && first.getClientRects()[0];
        if (fr) target = { x: fr.left + scrollX + a.w * .4, y: fr.top + scrollY + 2 * S };
        else { const r = rectOf(el); target = { x: r.l + a.w / 2, y: r.t }; }
      }
      if (word !== lastWord) {
        lastWord = word;
        if (range) pollyMark(range);
        from = { x: a.x || target.x, y: a.y || target.y }; hop = 0;
        /* keep the word on screen, unless the reader is scrolling themselves */
        if (rr && state === 'reading' && now() - userScrolled > 2500 && (rr.bottom > innerHeight - 70 || rr.top < 70) && !boxOf(host)) {
          scrollBy({ top: rr.top - innerHeight * .4, behavior: reduced() ? 'auto' : 'smooth' });
        }
      }
      if (hop < 1) {
        hop = Math.min(1, hop + dt / (reduced() ? .01 : .16));
        a.x = lerp(from.x, target.x, hop);
        a.y = lerp(from.y, target.y, hop) - Math.sin(Math.PI * hop) * Math.min(24 * S, 8 * S + Math.abs(target.y - from.y) * .4);
        a.face = target.x < from.x ? -1 : 1;
        a.play('hop');
      } else {
        a.x = target.x; a.y = target.y;
        a.play(state === 'reading' ? 'talk' : 'idle');
      }
      if (state === 'idle' && ptr.seen && a.near(20 * S)) a.say('note', 600);
    },
    poke: toggle,
    destroy() {
      if (state !== 'idle') { speechSynthesis.cancel(); pollyMark(null); }
      if (btn) btn.removeEventListener('click', toggle);
      removeEventListener('wheel', onScroll); removeEventListener('touchmove', onScroll);
    }
  };
});
