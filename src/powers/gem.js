/* GEM: a treasure hunt across your site. Hide gems anywhere, on any page; visitors who
 * spot one click it and it flies into a little jar in the corner, which remembers every
 * gem they've found, page to page. Find them all and the jar bursts with sparkles (and,
 * if you like, hands over a reward code).
 *
 *   <piix-pal pal="gem" hunt="launch" gem="1" total="5"></piix-pal>
 *   <piix-pal pal="gem" hunt="launch" gem="2" total="5" color="#ff4d6d"></piix-pal>   …and so on
 *   reward="PIX10"   what the finder gets when the jar is full
 *   Events: piix:gem { hunt, found, total }, piix:hunt-done { hunt, reward } */

/* a cut gem, with a glint that travels across it */
const gemShape = glint => {
  const rows = ['..kkkkk..', '.kLlLlLk.', 'kLlLlLlLk', 'kkkkkkkkk', '.klllldk.', '..klldk..', '...kdk...', '....k....'];
  return glint < 0 ? rows : art.put(rows, 2 + glint, glint > 3 ? 2 : 1, ['w']);
};

/* Gem: sits and glints */
defineSprite('gem', {
  w: 9, h: 8, scale: 3, does: 'hunt',
  palette: { k: '#17121f', l: '#58c8ff', L: '#b8e6ff', d: '#2f8fc4', w: '#ffffff' },
  frames: { idle: [gemShape(-1), gemShape(-1), gemShape(-1), gemShape(0), gemShape(2), gemShape(4), gemShape(-1), gemShape(-1)] },
  fps: { idle: 8 }
});

/* the jar that collects them: glass, a lid, and one gem-coloured pixel row per gem inside */
const gemJar = (n, total) => {
  let rows = ['.kkkkkkkk.', '.kbbbbbbk.', 'kkkkkkkkkk', 'k........k', 'k........k', 'k........k', 'k........k', 'k........k', 'k........k', 'k........k', '.kkkkkkkk.'];
  rows = rows.map((r, y) => y > 2 && y < 10 ? 'k' + 'g'.repeat(8) + 'k' : r);
  const filled = Math.round(Math.min(1, total ? n / total : 0) * 7);
  for (let i = 0; i < filled; i++) rows = art.put(rows, 1, 9 - i, [i % 2 ? 'lLlLlLlL' : 'LlLlLlLl']);
  return art.put(rows, 2, 3, ['w', 'w']);
};
/* the jar: up to twelve fill levels */
defineSprite('_jar', {
  w: 10, h: 11, scale: 3,
  palette: { k: '#17121f', b: '#ff6b4a', g: '#eaf6ff', l: '#58c8ff', L: '#b8e6ff', w: '#ffffff' },
  frames: Object.fromEntries(Array.from({ length: 13 }, (_, i) => ['j' + i, [gemJar(i, 12)]]))
});

/* what each hunt has found so far, kept in the visitor's browser */
const gemLoad = hunt => { try { return JSON.parse(localStorage.getItem('piix-hunt:' + hunt)) || []; } catch (_) { return []; } };
const gemSave = (hunt, list) => { try { localStorage.setItem('piix-hunt:' + hunt, JSON.stringify(list)); } catch (_) { /* private mode */ } };

/* one jar per hunt, shared by every gem on the page */
const GEM_JARS = {};

/* a gem's own colours, from a single colour */
const gemTint = (a, color) => {
  if (!color) return;
  const pal = { ...a.spec.palette, l: color, L: mixHex(color, .55), d: mixHex(color, -.3) };
  const spec = defineSprite('_gem-' + color.replace('#', ''), { ...a.spec, palette: pal });
  a.spec = spec; a.frames = baked(spec); a._drawn = null;
};

