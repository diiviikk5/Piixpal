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

