/* SQUISH: a marshmallow that minds your character limit. It sits on the corner of a text
 * box, perfectly comfy, until the text gets near the limit; then it starts getting
 * squashed, sweats, shows how many characters are left, and at the limit it's flat as a
 * pancake. Delete a few and it pops back up.
 *
 *   <textarea maxlength="140"></textarea><piix-pal pal="squish"></piix-pal>
 *   limit="280"   if the field has no maxlength
 *   Event: piix:limit { length, limit, left } */

/* the marshmallow: a soft pink-white cube with a face */
const squishShape = (face, color = 'b') => {
  let rows = art.outline(art.volume(art.paint(13, 12, (x, y) => art.rrect(x, y, 1, 1, 11, 10, 3) ? color : null), color, color === 'b' ? 'd' : 'D', color === 'b' ? 'B' : 'R'));
  const F = {
    calm: [[4, 4, ['e___e']], [5, 7, ['eee']]],
    worry: [[4, 4, ['e___e']], [5, 7, ['_e_']], [10, 2, ['t', 't']]],
    panic: [[3, 4, ['e_e_e_e'].map(s => s.slice(0, 7))], [4, 5, ['_e___e'.slice(0, 6)]], [5, 7, ['eee', 'e_e']], [10, 2, ['t', 't']], [1, 3, ['t']]],
    flat: [[3, 5, ['ee___ee']], [5, 7, ['eee']]]
  }[face];
  return art.compose(rows, ...F, [2, 6, ['p']], [10, 6, ['p']]);
};

/* Squish: comfy, worried, panicking, and flattened */
defineSprite('squish', {
  w: 13, h: 12, scale: 3, does: 'limit',
  palette: { k: '#17121f', b: '#fff0f4', d: '#f2c2cf', B: '#ffffff', r: '#ff8fa3', D: '#e5637e', R: '#ffc4cf', e: '#17121f', p: '#ff9fb5', t: '#58c8ff' },
  frames: { calm: [squishShape('calm')], worry: [squishShape('worry')], panic: [squishShape('panic', 'r')], flat: [squishShape('flat', 'r')] }
});

/* limit: get squashed as the text gets near its limit */
defineBehavior('limit', (a, [el], host) => {
  const S = a.s / 3;
  const field = el.matches && el.matches('textarea,input') ? el : el.querySelector('textarea,input') || el;
  const max = () => +host.getAttribute('limit') || (field.maxLength > 0 ? field.maxLength : 280);
  let squash = 0, warned = 0, lastLeft = null;
  const update = () => {
    const len = (field.value || '').length, lim = max(), left = lim - len;
    if (left !== lastLeft) {
      lastLeft = left;
      host.dispatchEvent(new CustomEvent('piix:limit', { bubbles: true, detail: { length: len, limit: lim, left } }));
      /* tell screen readers at a few points, not on every key */
      const step = left <= 0 ? 3 : left <= lim * .05 ? 2 : left <= lim * .2 ? 1 : 0;
      if (step > warned) uiAnnounce(left <= 0 ? 'Character limit reached' : `${left} characters left`);
      warned = step;
    }
    return { len, lim, left };
  };
  field.addEventListener('input', update);

  return {
    tick(dt) {
      const r = rectOf(field);
      a.x = r.r - a.w * .7; a.y = r.t + 2 * S;
      const { len, lim, left } = update();
      const k = len / lim;
      /* squashed from 60% full, flat at 100% */
      const want = clamp((k - .6) / .4, 0, 1);
      squash = reduced() ? want : lerp(squash, want, 1 - Math.exp(-10 * dt));
      a.sy = 1 - squash * .62; a.sx = 1 + squash * .55;
      a.play(k >= 1 ? 'flat' : k >= .9 ? 'panic' : k >= .7 ? 'worry' : 'calm');
      if (k >= .8 && document.activeElement === field) { if (!a._lastSaid || a._lastSaid !== left) { a.say('#' + Math.max(0, left), 0); a._lastSaid = left; } }
      else if (a._lastSaid != null) { a.hush(); a._lastSaid = null; }
      a.ox = k >= 1 ? rnd(-1, 1) * S : 0;
    },
    poke() { a.say('heart', 700); },
    destroy() { field.removeEventListener('input', update); }
  };
});
