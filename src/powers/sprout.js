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

