/* GULP: a pelican for your file drop zone. Drag a file anywhere over the page and Gulp
 * perks up and watches it; bring it over the drop zone and it opens its beak wide; let
 * go and it gulps the file down, pouch bulging, then tells you what it swallowed. Works
 * with a plain <input type="file"> too (picking files from the dialog).
 *
 *   <div id="drop">Drop files here</div>
 *   <piix-pal pal="gulp" on="#drop" accept></piix-pal>
 *   accept   let the zone take drops by itself (skip if your own code already handles them)
 *   Event: piix:gulp { files } */

/* the pelican: a white body, a long neck, and that famous beak with its pouch */
const gulpShape = ({ beak = 'shut', by = 0, eyes = 'open', step = 0 }) => {
  let rows = art.paint(19, 15, (x, y) => {
    const yy = y - by;
    if (art.ellipse(x, yy, 11.4, 3, 2.3, 2.1)) return 'w';
    if (art.ellipse(x, yy, 10.6, 6, 1.5, 2.8)) return 'w';
    if (art.ellipse(x, yy, 6.8, 9.6, 5.2, 3.4)) return art.ellipse(x, yy, 6, 9, 3.4, 1.9) ? 'W' : 'w';
    if (x >= 1 && x <= 2 && yy >= 8 && yy <= 10) return 'W';
    /* the beak: shut, opening wide, or with a full pouch */
    if (beak === 'shut' && ((yy === 3 && x >= 13 && x <= 18) || (yy === 4 && x >= 13 && x <= 17))) return yy === 3 ? 'o' : 'O';
    if (beak === 'open' && ((yy === 1 + Math.round((18 - x) / 3) - 1 && x >= 13 && x <= 18) || (x >= 13 && x <= 17 && yy >= 4 && yy <= 8 - Math.round((x - 13) / 2)))) return yy <= 3 ? 'o' : 'O';
    if (beak === 'full' && ((yy === 3 && x >= 13 && x <= 18) || art.ellipse(x, yy, 15, 6, 2.6, 2.6))) return yy === 3 ? 'o' : 'O';
    return null;
  });
  rows = art.outline(rows);
  if (beak === 'open') rows = art.compose(rows, [14, 5 + by, ['kk', 'kkk'.slice(0, 2)]]);
  rows = art.compose(rows, eyes === 'happy' ? [10, 2 + by, ['_e_', 'e_e']] : eyes === 'shut' ? [11, 3 + by, ['ee']] : [11, 2 + by, ['e']]);
  const L = [[[5, 13], [8, 13]], [[4, 13], [9, 12]], [[6, 12], [8, 13]]][step];
  for (const [lx, ly] of L) rows = art.put(rows, lx, ly, ['o', 'o'].slice(0, 15 - ly));
  return rows;
};

/* Gulp: waits, watches, opens up, gulps, and looks very pleased */
defineSprite('gulp', {
  w: 19, h: 15, scale: 3, does: 'dropzone',
  palette: { k: '#17121f', w: '#ffffff', W: '#d9dce8', o: '#ffb347', O: '#ff9a2f', e: '#17121f' },
  frames: {
    idle: [gulpShape({}), gulpShape({}), gulpShape({ eyes: 'shut' }), gulpShape({})],
    look: [gulpShape({ by: -1 })],
    open: [gulpShape({ beak: 'open', by: -1 }), gulpShape({ beak: 'open', by: -1, step: 1 })],
    full: [gulpShape({ beak: 'full' }), gulpShape({ beak: 'full', by: -1 })],
    happy: [gulpShape({ eyes: 'happy' }), gulpShape({ eyes: 'happy', by: -1, step: 2 })]
  },
  fps: { idle: 2, open: 6, full: 5, happy: 5 }
});

/* a file, flying into the beak (crew only) */
defineSprite('_file', {
  w: 8, h: 10, scale: 3,
  palette: { k: '#17121f', w: '#fffdf5', W: '#e9e2d0', b: '#58c8ff' },
  frames: { idle: [['kkkkk...', 'kwwwkk..', 'kwwwkWk.', 'kwwwkkkk', 'kwbbbbwk', 'kwwwwwwk', 'kwbbbbwk', 'kwwwwwwk', 'kwbbwwwk', 'kkkkkkkk']] }
});

/* a file size people can read */
const gulpSize = n => n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB';

/* dropzone: watch files being dragged about, open up over the zone, gulp what lands */
defineBehavior('dropzone', (a, [zone], host) => {
  const S = a.s / 3;
  const accept = host.hasAttribute('accept');
  const input = zone.matches('input[type=file]') ? zone : zone.querySelector('input[type=file]');
  const file = recruit(a, '_file');
  file.node.style.opacity = '0';
  let dragging = false, over = false, gx = 0, gy = 0, moodT = 0, mood = '', fly = -1, from = null, card = null, cardT = 0;
  const hasFiles = e => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
  const onOver = e => {
    if (!hasFiles(e)) return;
    dragging = true; gx = e.clientX + scrollX; gy = e.clientY + scrollY;
    over = zone.contains(e.target);
    if (over && accept) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
  };
  const onLeave = e => { if (!e.relatedTarget) { dragging = false; over = false; } };
  const swallow = (files, x, y) => {
    const list = [...(files || [])];
    dragging = false; over = false;
    if (!list.length) return;
    from = { x, y }; fly = 0;
    host.dispatchEvent(new CustomEvent('piix:gulp', { bubbles: true, detail: { files: list } }));
    if (card) uiClose(card);
    card = uiCard({ tip: true, width: 260, attrs: { role: 'status' } });
    card.append(uiEl('h4', { text: 'Gulp!' }), uiEl('p', { text: list.slice(0, 3).map(f => `${f.name} (${gulpSize(f.size)})`).join(', ') + (list.length > 3 ? ` and ${list.length - 3} more` : '') }));
    card.style.visibility = 'hidden'; cardT = 3.4;
    uiAnnounce(`Got ${list.length} file${list.length > 1 ? 's' : ''}`);
  };
  const onDrop = e => { if (zone.contains(e.target) && hasFiles(e)) { if (accept) e.preventDefault(); swallow(e.dataTransfer.files, e.clientX + scrollX, e.clientY + scrollY); } else { dragging = false; over = false; } };
  const onPick = () => { const r = rectOf(input || zone); swallow(input.files, r.l + r.w / 2, r.t + r.h / 2); };
  addEventListener('dragover', onOver, true);
  addEventListener('dragleave', onLeave, true);
  addEventListener('drop', onDrop, true);
  if (input) input.addEventListener('change', onPick);

  return {
    crew: [file],
    tick(dt) {
      const r = rectOf(zone);
      const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .88;
      a.x = r.l + a.w / 2 + Math.max(0, r.w - a.w) * at; a.y = r.t;
      if (fly >= 0) {
        /* the file arcs into the open beak and the pouch fills */
        fly = Math.min(1, fly + dt / (reduced() ? .01 : .45));
        const mx = a.x + a.face * a.w * .35, my = a.y - a.h * .55;
        file.x = lerp(from.x, mx, fly); file.y = lerp(from.y, my, fly) - Math.sin(Math.PI * fly) * 50 * S;
        file.sx = file.sy = 1 - fly * .6; file.node.style.opacity = '1';
        a.play('open');
        if (fly >= 1) { fly = -1; file.node.style.opacity = '0'; mood = 'full'; moodT = 1; a.sy = 1.15; a.sx = .9; }
      } else if (moodT > 0) {
        moodT -= dt;
        a.play(mood);
        if (moodT <= 0 && mood === 'full') { mood = 'happy'; moodT = 1.4; a.say('heart', 1000); }
      } else if (dragging) {
        a.face = gx < a.x ? -1 : 1;
        a.play(over ? 'open' : 'look');
      } else a.play('idle');
      a.sx = lerp(a.sx, 1, .15); a.sy = lerp(a.sy, 1, .15);
      if (card) {
        cardT -= dt;
        uiPlace(card, a.x, a.y - a.h - 2, { under: a.y + 2, area: boxOf(host) ? rectOf(boxOf(host)) : undefined });
        card.style.visibility = fly >= 0 ? 'hidden' : '';
        if (cardT <= 0) { uiClose(card); card = null; }
      }
    },
    poke() { a.say(dragging ? '!' : '?', 700); },
    destroy() {
      removeEventListener('dragover', onOver, true); removeEventListener('dragleave', onLeave, true); removeEventListener('drop', onDrop, true);
      if (input) input.removeEventListener('change', onPick);
      if (card) card.remove();
    }
  };
});
