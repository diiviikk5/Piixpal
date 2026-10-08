/* SCOUT: an onboarding tour guide. Scout hops from element to element, stands on each
 * one and holds up its flag while a spotlight and a card explain what it's for.
 *
 *   <button data-tour="Start a new project here">New</button>   mark the stops…
 *   <input data-tour="Search everything" data-tour-step="2">     (ordered by data-tour-step, then the page)
 *   <piix-pal pal="scout"></piix-pal>                             …and click Scout to begin
 *
 *   steps="#new: Start here | #search: Find anything"   or list the stops on the tag
 *   start="auto"     begin by itself, once per visitor
 *   el.ctl.start([{ el, text, title }])   el.ctl.end()
 *   Keyboard: → next, ← back, Esc ends. Events: piix:tour-step { index, total }, piix:tour-end { done } */

/* the explorer from the hat down: pith helmet, brim, face, backpack, shirt and belt */
const scoutShape = by => art.outline(art.paint(17, 17, (x, y) => {
  const yy = y - by;
  if (art.ellipse(x, yy, 7.5, 3.6, 4.7, 2.7) && yy <= 4) return 'h';
  if (yy === 5 && x >= 2 && x <= 13) return 'H';
  if (art.ellipse(x, yy, 7.5, 7.6, 3.7, 2.6)) return 'f';
  if (x >= 2 && x <= 4 && yy >= 9 && yy <= 13) return 'b';
  if (x >= 5 && x <= 10 && yy >= 10 && yy <= 13) return yy === 12 ? 'B' : 'g';
  return null;
}));

/* eyes and rosy cheeks: open, shut, or happy little arches */
const scoutFace = (rows, by, eyes) => {
  const ey = 7 + by;
  if (eyes === 'happy') rows = art.compose(rows, [7, ey, ['_e_', 'e_e']], [10, ey, ['_e_', 'e_e']]);
  else if (eyes === 'shut') rows = art.compose(rows, [8, ey + 1, ['e']], [10, ey + 1, ['e']]);
  else rows = art.compose(rows, [8, ey, ['e', 'e']], [10, ey, ['e', 'e']]);
  return art.compose(rows, [6, ey + 2, ['p']], [11, ey + 2, ['p']]);
};

