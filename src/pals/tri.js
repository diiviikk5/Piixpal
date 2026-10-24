/* TRI: a glossy little triangle that gets about by tumbling over its own corners. */
(() => {
  const W = 17, H = 15;
  /* the body: a triangle with a sheen down its left edge and a darker base */
  const body = () => art.outline(art.paint(W, H, (x, y) => {
    const hw = (y + 1) / H * 8.5;
    if (x < 8 - hw + .5 || x > 8 + hw - .5) return null;
    const fromLeft = x - (8 - hw);
    if (fromLeft < 2.2 && y > 2 && y < 12) return 'B';
    if (y >= 12) return 'd';
    return 'b';
  }), 'r');
  /* faces, drawn onto the body: e = eye white, p = pupil, m = mouth */
  const face = (kind, look = 0) => {
    let r = body();
    const L = 5 + look, R = 10 + look;
    if (kind === 'open') r = art.compose(r, [L, 8, ['ee', 'ep', 'ee']], [R, 8, ['ee', 'pe', 'ee']], [8, 12, ['m']]);
    else if (kind === 'look') r = art.compose(r, [L, 8, ['ee', look < 0 ? 'pe' : 'ep', 'ee']], [R, 8, ['ee', look < 0 ? 'pe' : 'ep', 'ee']], [8 + look, 12, ['m']]);
    else if (kind === 'blink') r = art.compose(r, [L, 9, ['ee']], [R, 9, ['ee']], [8, 12, ['m']]);
    else if (kind === 'squint') r = art.compose(r, [L, 9, ['e.']], [L + 1, 10, ['e']], [R + 1, 9, ['e']], [R, 10, ['e']], [7, 12, ['mmm']]);
    else if (kind === 'wide') r = art.compose(r, [L, 7, ['ee', 'ep', 'ee', 'ee']], [R, 7, ['ee', 'pe', 'ee', 'ee']], [8, 12, ['m']]);
    else if (kind === 'happy') r = art.compose(r, [L, 8, ['.e.', 'e.e']], [R - 1, 8, ['.e.', 'e.e']], [7, 11, ['m.m']], [8, 12, ['m']]);
    else if (kind === 'dizzy') r = art.compose(r, [L, 8, ['e.e', '.e.', 'e.e']], [R - 1, 8, ['e.e', '.e.', 'e.e']], [7, 12, ['mmm']]);
    return r;
  };
  defineSprite('tri', {
    w: W, h: H, scale: 3,
    does: 'tumble',
    palette: { b: '#18181b', B: '#3f3f46', d: '#09090b', r: '#8a8a96', e: '#ffffff', p: '#09090b', m: '#ffffff' },
    frames: {
      idle: [face('open'), face('open'), face('open'), face('blink')],
      left: [face('look', -1)], right: [face('look', 1)],
      roll: [face('squint')], air: [face('wide')], happy: [face('happy')], dizzy: [face('dizzy')]
    },
    fps: { idle: 2.5 }
  });
})();
