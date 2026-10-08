/* SPROUT: a desk plant that grows while you focus. Click it for a focus timer; it grows
 * a little with every minute, blooms when the time is up, and reminds you to take a
 * break. Press "Pop out" and it leaves the page for its own little window that stays on
 * top of everything else (Chrome and Edge), or a small popup elsewhere: a desktop pet,
 * straight from a website. The timer is saved, so a reload doesn't lose your progress.
 *
 *   <piix-pal pal="sprout"></piix-pal>
 *   minutes="25"  break="5"     focus and break lengths
 *   el.ctl.open()  el.ctl.popout()      Events: piix:bloom, piix:popout */

/* the pot: terracotta, with a rim, a little face, and soil on top */
const sproutPot = (eyes = 'open') => {
  let rows = art.paint(16, 21, (x, y) => {
    if (y >= 13 && y <= 14 && x >= 2 && x <= 13) return y === 13 ? 'd' : 'R';
    if (y >= 15 && y <= 20 && x >= 3 + (y - 15) * .25 && x <= 12 - (y - 15) * .25) return 'r';
    return null;
  });
  rows = art.outline(rows);
  const E = { open: [[5, 16, ['e']], [10, 16, ['e']]], shut: [[5, 17, ['e']], [10, 17, ['e']]], happy: [[4, 16, ['.e.', 'e.e']].map((v, i) => i === 0 ? 4 : v), [9, 16, ['.e.', 'e.e']]], up: [[6, 15, ['e']], [11, 15, ['e']]] }[eyes];
  return art.compose(rows, ...E, [4, 17, ['p']], [11, 17, ['p']], [7, 18, ['ee']]);
};

/* the plant, five stages from a seed to a flower, swaying a pixel either way */
const sproutPlant = (rows, stage, sway) => {
  const s = sway;
  const parts = [
    [[7, 12, ['gg']]],
    [[8, 10, ['g', 'g']], [6 + s, 9, ['ll']], [9 + s, 9, ['ll']]],
    [[8, 6, ['g', 'g', 'g', 'g', 'g', 'g']], [5 + s, 9, ['lll']], [9 + s, 8, ['lll']], [6 + s, 6, ['ll']], [9 + s, 5, ['ll']]],
    [[8, 4, ['g', 'g', 'g', 'g', 'g', 'g', 'g', 'g']], [5 + s, 9, ['lll']], [9 + s, 8, ['lll']], [6 + s, 6, ['ll']], [9 + s, 5, ['ll']], [7 + s, 1, ['.b.', 'bbb', 'bbb']]],
    [[8, 4, ['g', 'g', 'g', 'g', 'g', 'g', 'g', 'g']], [5 + s, 9, ['lll']], [9 + s, 8, ['lll']], [6 + s, 6, ['ll']], [9 + s, 5, ['ll']], [6 + s, 0, ['.f.f.', 'ffyff', '.fff.', '..f..']]]
  ][stage];
  return art.compose(rows, ...parts);
};

/* Sprout: each stage sways; it can be happy, asleep (on a break), or away on your desktop */
defineSprite('sprout', {
  w: 16, h: 21, scale: 3, does: 'desk',
  palette: { k: '#17121f', r: '#e07b4f', R: '#c4683f', d: '#6b4226', e: '#17121f', p: '#ff9fb5', g: '#3fa34d', l: '#7bd63a', b: '#ff7aa2', f: '#ff9fb5', y: '#ffd23f' },
  frames: Object.assign(
    Object.fromEntries([0, 1, 2, 3, 4].map(n => ['s' + n, [sproutPlant(sproutPot(), n, 0), sproutPlant(sproutPot(), n, 1), sproutPlant(sproutPot(), n, 0), sproutPlant(sproutPot(), n, -1)]])),
    Object.fromEntries([0, 1, 2, 3, 4].map(n => ['h' + n, [sproutPlant(sproutPot('happy'), n, 0)]])),
    Object.fromEntries([0, 1, 2, 3, 4].map(n => ['z' + n, [sproutPlant(sproutPot('shut'), n, 0)]])),
    { away: [sproutPot('up')] }
  ),
  fps: Object.fromEntries([0, 1, 2, 3, 4].map(n => ['s' + n, 1.5]))
});

/* the timer: focus, then a break; saved, so reloads and pop-outs share it */
const SPROUT_KEY = 'piix-sprout';
const sproutState = () => {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SPROUT_KEY)); } catch (_) { /* private mode */ }
  return Object.assign({ mode: 'focus', left: null, running: false, at: 0, blooms: 0 }, s || {});
};
const sproutSave = s => { try { localStorage.setItem(SPROUT_KEY, JSON.stringify(s)); } catch (_) { /* private mode */ } };
/* how much time is left right now, in seconds, given the lengths */
const sproutLeft = (s, mins) => {
  const total = (s.mode === 'focus' ? mins.focus : mins.rest) * 60;
  const left = s.left == null ? total : s.left;
  return s.running ? Math.max(0, left - (Date.now() - s.at) / 1000) : left;
};
/* which plant to show: it grows through the focus time, and stays in bloom over the break */
const sproutStage = (s, mins) => {
  if (s.mode === 'rest') return 4;
  const total = mins.focus * 60, done = 1 - sproutLeft(s, mins) / total;
  return s.left == null && !s.running ? 1 : Math.min(4, 1 + Math.floor(done * 3.999));
};
const sproutClock = sec => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/* a little two-note chime, made on the spot */
const sproutChime = win => {
  try {
    const A = win.AudioContext || win.webkitAudioContext, ac = new A();
    [660, 990].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, ac.currentTime + i * .16);
      g.gain.exponentialRampToValueAtTime(.08, ac.currentTime + i * .16 + .02);
      g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + i * .16 + .3);
      o.connect(g).connect(ac.destination); o.start(ac.currentTime + i * .16); o.stop(ac.currentTime + i * .16 + .32);
    });
    setTimeout(() => ac.close(), 900);
  } catch (_) { /* no audio */ }
};

/* the desk: Sprout big, the clock, and Start / Reset (and Pop out), in any document */
const SPROUT_CSS = `
.sp{display:grid;justify-items:center;gap:8px;padding:10px 6px 4px;font:600 13px/1.3 ${UI_FONT};color:${UI_INK}}
.sp canvas{image-rendering:pixelated;width:96px;height:126px}
.sp .t{font:800 30px/1 ${UI_MONO};letter-spacing:.04em}
.sp .m{font:700 11px/1 ${UI_MONO};text-transform:uppercase;letter-spacing:.08em;color:#6c6477}
.sp .row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:4px}
.sp button{font:700 13px/1 ${UI_FONT};padding:9px 12px;border:0;background:${UI_INK};color:${UI_PAPER};cursor:pointer;box-shadow:0 3px 0 rgba(27,18,38,.3)}
.sp button.ghost{background:transparent;color:${UI_INK};box-shadow:inset 0 0 0 2px ${UI_INK}}
.sp button:focus-visible{outline:3px solid #6b4cff;outline-offset:2px}`;
const sproutScene = (root, win, mins, onPop) => {
  const doc = root.ownerDocument;
  const st0 = doc.createElement('style'); st0.textContent = SPROUT_CSS;
  const box = doc.createElement('div'); box.className = 'sp';
  const cv = doc.createElement('canvas'); cv.width = 16; cv.height = 21;
  const g = cv.getContext('2d');
  const mode = doc.createElement('div'); mode.className = 'm';
  const time = doc.createElement('div'); time.className = 't'; time.setAttribute('role', 'timer');
  const row = doc.createElement('div'); row.className = 'row';
  const btn = (text, ghost, fn) => { const b = doc.createElement('button'); b.type = 'button'; b.textContent = text; if (ghost) b.className = 'ghost'; b.addEventListener('click', fn); row.appendChild(b); return b; };
  const go = btn('Start', false, () => {
    const s = sproutState();
    if (s.running) { s.left = sproutLeft(s, mins); s.running = false; }
    else { if (s.left == null) s.left = (s.mode === 'focus' ? mins.focus : mins.rest) * 60; s.running = true; s.at = Date.now(); }
    sproutSave(s);
  });
  btn('Reset', true, () => sproutSave({ mode: 'focus', left: null, running: false, at: 0, blooms: sproutState().blooms }));
  if (onPop) btn('Pop out', true, onPop);
  box.append(cv, mode, time, row);
  root.append(st0, box);
  const frames = baked(SPRITES.sprout);
  let raf = 0, t = 0, last = '';
  const loop = () => {
    t++;
    const s = sproutState();
    let left = sproutLeft(s, mins);
    if (s.running && left <= 0) {
      /* time's up: a bloom and a break, or back to work */
      if (s.mode === 'focus') { s.blooms++; s.mode = 'rest'; sproutChime(win); root.dispatchEvent(new CustomEvent('piix:bloom', { bubbles: true })); }
      else s.mode = 'focus';
      s.left = null; s.running = false; sproutSave(s); left = sproutLeft(s, mins);
    }
    const stage = sproutStage(s, mins);
    const clip = s.mode === 'rest' ? (s.running ? 'z' + stage : 'h' + stage) : 's' + stage;
    const f = frames[clip][Math.floor(t / 40) % frames[clip].length];
    const key = clip + f + sproutClock(left) + s.running;
    if (key !== last) {
      last = key;
      g.clearRect(0, 0, 16, 21); g.drawImage(f, 0, 0);
      time.textContent = sproutClock(left);
      mode.textContent = s.mode === 'focus' ? (s.running ? 'focus · growing' : 'focus') : 'break · rest your eyes';
      go.textContent = s.running ? 'Pause' : 'Start';
    }
    raf = win.requestAnimationFrame(loop);
  };
  loop();
  return { destroy() { win.cancelAnimationFrame(raf); st0.remove(); box.remove(); } };
};

/* desk: sit on the page, open the timer, and pop out to the desktop */
defineBehavior('desk', (a, [el], host) => {
  const S = a.s / 3;
  const mins = { focus: clamp(+host.getAttribute('minutes') || 25, .1, 180), rest: clamp(+host.getAttribute('break') || 5, .1, 60) };
  let card = null, scene = null, pip = null, pipScene = null, bob = 0;
  const close = () => { if (scene) scene.destroy(); scene = null; uiClose(card); card = null; };
  const popout = async () => {
    close();
    try {
      let w = null;
      if (window.documentPictureInPicture) w = await documentPictureInPicture.requestWindow({ width: 230, height: 300 });
      else w = window.open('', 'piix-sprout', 'popup,width=240,height=320');
      if (!w) { a.say('x', 900); return; }
      pip = w;
      w.document.title = 'Sprout';
      w.document.body.style.cssText = 'margin:0;display:grid;place-items:center;min-height:100vh;background:#fbf6e9';
      pipScene = sproutScene(w.document.body, w, mins);
      host.dispatchEvent(new CustomEvent('piix:popout', { bubbles: true }));
      w.addEventListener('pagehide', () => { if (pipScene) pipScene.destroy(); pipScene = null; pip = null; a.say('heart', 900); });
    } catch (_) { a.say('x', 900); }
  };
  const open = () => {
    if (pip) { try { pip.focus(); } catch (_) { /* gone */ } return; }
    if (card) { close(); return; }
    card = uiCard({ tip: true, width: 220, attrs: { role: 'dialog', 'aria-label': 'Sprout, a focus timer' } });
    card.append(uiEl('button', { cls: 'x', text: '×', attrs: { type: 'button', 'aria-label': 'Close' }, on: { click: close } }));
    const can = !!(window.documentPictureInPicture || window.open);
    scene = sproutScene(card, window, mins, can ? popout : null);
  };
  /* a click (not a pointerdown) opens it: popups and pop-outs need a real click */
  a.cv.addEventListener('click', open);
  const esc = e => { if (e.key === 'Escape' && card) close(); };
  addEventListener('keydown', esc);

  return {
    open, popout,
    awake: () => true,
    tick(dt) {
      const r = surfaceOf(el) || rectOf(el);
      const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .5;
      a.x = r.l + a.w / 2 + Math.max(0, (r.r - r.l) - a.w) * at; a.y = r.t;
      const s = sproutState(), stage = sproutStage(s, mins);
      if (pip) a.play('away');
      else if (s.mode === 'rest') a.play(s.running ? 'z' + stage : 'h' + stage);
      else a.play('s' + stage);
      bob += dt;
      if (card) {
        const B = boxOf(host) ? rectOf(boxOf(host)) : null;
        uiPlace(card, a.x, a.y - a.h, B ? { area: B, under: a.y + 2 } : { under: a.y + 2 });
      }
      if (!card && !pip && ptr.seen && a.near(16 * S) && Math.floor(bob) % 4 === 0) a.say('leaf', 500);
    },
    poke() { /* opening happens on click */ },
    destroy() { close(); removeEventListener('keydown', esc); a.cv.removeEventListener('click', open); if (pip) try { pip.close(); } catch (_) { /* gone */ } }
  };
});
