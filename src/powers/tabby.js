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

/* eyes: open, looking left or right, blinking, asleep or happy; and a little pink nose */
const tabbyEyes = (rows, oy, eyes) => {
  const y = 8 + oy;
  const E = {
    open: [[4, y, ['ew', 'ee']], [10, y, ['ew', 'ee']]],
    left: [[4, y, ['we', 'ee']], [10, y, ['we', 'ee']]],
    right: [[5, y, ['ew', 'ee']], [11, y, ['ew', 'ee']]],
    blink: [[4, y + 1, ['ee']], [10, y + 1, ['ee']]],
    sleep: [[4, y + 1, ['e..e', '.ee.']].map((v, i) => i === 0 ? 3 : v), [10, y + 1, ['e..e', '.ee.']]],
    happy: [[4, y, ['.ee.', 'e..e']].map((v, i) => i === 0 ? 3 : v), [10, y, ['.ee.', 'e..e']]]
  }[eyes];
  return art.compose(rows, ...E, [7, 11 + oy, ['pp']], [6, 12 + oy, ['e..e']], [7, 13 + oy, ['ee']]);
};

/* the loaf: a round little body tucked under the head, and a tail that flicks */
const tabbyLoaf = (eyes, tail, oy = 0) => {
  let rows = art.outline(art.paint(22, 19, (x, y) => {
    if (art.ellipse(x, y, 11, 14.6, 8.4, 3.6)) return (x % 4 === 1 && y < 15) ? 'O' : 'o';
    if (tail === 0 && x >= 19 && x <= 20 && y >= 10 && y <= 15) return 'O';
    if (tail === 1 && ((x >= 19 && x <= 20 && y >= 12 && y <= 15) || (x === 21 && y === 11))) return 'O';
    return null;
  }));
  const head = tabbyEyes(tabbyHead(0), 0, eyes);
  return art.compose(rows, ...head.map((r, i) => [2, i + oy, [r.replace(/\./g, '_')]]));
};

/* Tabby on the page: a cat loaf that blinks, flicks its tail, naps, and jumps up when you come back */
defineSprite('tabby', {
  w: 22, h: 19, scale: 3, does: 'tab',
  palette: { k: '#17121f', o: '#ffa64d', O: '#d97a1f', w: '#fff7ec', p: '#ff9fb5', e: '#17121f' },
  frames: {
    idle: [tabbyLoaf('open', 0), tabbyLoaf('open', 1), tabbyLoaf('blink', 0), tabbyLoaf('left', 1), tabbyLoaf('open', 0), tabbyLoaf('right', 1)],
    sleep: [tabbyLoaf('sleep', 0)],
    happy: [tabbyLoaf('happy', 1), tabbyLoaf('happy', 0, -1)]
  },
  fps: { idle: 1.6, happy: 6 }
});

/* the same face, 16 pixels square, for the browser tab */
const TABBY_ICON = Object.fromEntries(['open', 'left', 'right', 'blink', 'sleep', 'happy'].map(k => [k, tabbyEyes(tabbyHead(0), 0, k)]));

/* draw an icon frame, twice as big, with an optional reading-progress ring and sleepy z's */
const tabbyDraw = (g, rows, pal, progress, z) => {
  g.clearRect(0, 0, 32, 32);
  rows.forEach((r, y) => [...r].forEach((c, x) => { if (pal[c]) { g.fillStyle = pal[c]; g.fillRect(x * 2, y * 2, 2, 2); } }));
  if (progress != null) {
    /* a ring of pixels round the edge, filling clockwise from the top */
    const ring = [];
    for (let i = 0; i < 16; i++) ring.push([16 + i * 2 - 1, 0]);
    for (let i = 0; i < 16; i++) ring.push([30, i * 2]);
    for (let i = 0; i < 16; i++) ring.push([30 - i * 2, 30]);
    for (let i = 0; i < 16; i++) ring.push([0, 30 - i * 2]);
    for (let i = 0; i < 8; i++) ring.push([i * 2, 0]);
    const n = Math.round(clamp(progress, 0, 1) * ring.length);
    g.fillStyle = '#7bd63a';
    ring.slice(0, n).forEach(([x, y]) => g.fillRect(x, y, 2, 2));
  }
  if (z) { g.fillStyle = '#58c8ff'; g.fillRect(24, 2, 6, 2); g.fillRect(26, 4, 2, 2); g.fillRect(24, 6, 6, 2); }
};

/* the page's icon links, found or made, remembered so they can be put back */
const tabbyLinks = () => {
  let els = [...document.querySelectorAll('link[rel~="icon"]')];
  let made = false;
  if (!els.length) { const l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); els = [l]; made = true; }
  return { els, old: els.map(l => [l.getAttribute('href'), l.getAttribute('type'), l.getAttribute('sizes')]), made };
};

/* tab: live in the favicon, nap when the tab is hidden, wake up when you're back */
let tabbyOwner = null;
defineBehavior('tab', (a, [el], host) => {
  const S = a.s / 3;
  const owner = !tabbyOwner;
  if (owner) tabbyOwner = host;
  const pal = Object.fromEntries(Object.entries(a.spec.palette));
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const g = cv.getContext('2d');
  const links = owner ? tabbyLinks() : null;
  const away = host.getAttribute('away') || 'Come back! Tabby misses you';
  let previews = [];
  try { previews = host.getAttribute('preview') ? [...document.querySelectorAll(host.getAttribute('preview'))].filter(c => c.getContext) : []; } catch (_) { /* bad selector */ }
  let face = 'open', faceT = 0, blinkT = rnd(1.5, 4), lookT = rnd(3, 6), key = '', savedTitle = null, wake = 0, hop = 0, zT = 0;
  let clock = 0;
  const progress = () => host.hasAttribute('progress') ? scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) : null;
  const paint = (f, z) => {
    const k = f + (z ? 'z' : '') + (host.hasAttribute('progress') ? Math.round(progress() * 40) : '');
    if (k === key) return;
    key = k;
    tabbyDraw(g, TABBY_ICON[f], pal, progress(), z);
    if (links) { const url = cv.toDataURL('image/png'); links.els.forEach(l => { l.type = 'image/png'; l.removeAttribute('sizes'); l.href = url; }); }
    for (const p of previews) { const pg = p.getContext('2d'); pg.imageSmoothingEnabled = false; pg.clearRect(0, 0, p.width, p.height); pg.drawImage(cv, 0, 0, p.width, p.height); }
  };
  /* hidden tabs get no animation frames, so naps run on a slow timer */
  const nap = () => { zT++; paint('sleep', zT % 2); if (zT === 2 && owner) { savedTitle = document.title; document.title = away; } };
  const onVis = () => {
    if (document.hidden) { zT = 0; clearInterval(clock); clock = setInterval(nap, 1000); paint('sleep', false); }
    else {
      clearInterval(clock);
      if (savedTitle != null && owner) document.title = savedTitle;
      if (zT >= 2) { wake = 2.4; hop = .4; a.say('heart', 1400); }
      savedTitle = null; zT = 0;
    }
  };
  document.addEventListener('visibilitychange', onVis);
  paint('open');

  return {
    awake: () => true,
    tick(dt) {
      const r = surfaceOf(el) || rectOf(el);
      const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .5;
      a.x = r.l + a.w / 2 + Math.max(0, (r.r - r.l) - a.w) * at; a.y = r.t;
      hop = Math.max(0, hop - dt); a.oy = -Math.sin(Math.PI * hop / .4) * 14 * S;
      if (wake > 0) { wake -= dt; face = 'happy'; a.play('happy'); }
      else {
        faceT += dt; blinkT -= dt; lookT -= dt;
        if (blinkT < 0) { face = 'blink'; if (blinkT < -.15) { blinkT = rnd(2, 5); face = 'open'; } }
        else if (lookT < 0) { face = pick(['left', 'right']); if (lookT < -1.2) { lookT = rnd(3, 7); face = 'open'; } }
        else face = 'open';
        a.play('idle');
      }
      paint(face, false);
    },
    poke() { wake = 1.2; hop = .4; a.say('heart', 900); },
    destroy() {
      clearInterval(clock);
      document.removeEventListener('visibilitychange', onVis);
      if (savedTitle != null && owner) document.title = savedTitle;
      if (links) {
        if (links.made) links.els[0].remove();
        else links.els.forEach((l, i) => { const [h, t, s] = links.old[i]; h == null ? l.removeAttribute('href') : l.setAttribute('href', h); t == null ? l.removeAttribute('type') : l.setAttribute('type', t); s == null ? l.removeAttribute('sizes') : l.setAttribute('sizes', s); });
      }
      if (owner) tabbyOwner = null;
    }
  };
});
