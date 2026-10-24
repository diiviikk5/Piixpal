/* TRI: the Vercel triangle as a pixel pal (a fan tribute, not affiliated with Vercel). It gets
 * about by tumbling over its own corners, waves with its little gloved hands, dances when it's
 * bored, and when you click it, it deploys: a spin, a landing, and "READY". */
(() => {
  const W = 25, H = 20, BASE = 19, CX = 12, TOP = 4;
  /* the triangle: pure black with a glint at the apex and a sheen down its left edge, a soft rim
     so it still shows on a dark page */
  const tri = () => art.paint(W, H, (x, y) => {
    if (y < TOP) return null;
    const hw = (y - TOP + 1) / (H - TOP) * (BASE / 2);
    if (x < CX - hw + .5 || x > CX + hw - .5) return null;
    const fromL = x - (CX - hw);
    if (fromL < 1.6 && y > TOP + 2 && y < H - 3) return 'B';
    return 'b';
  });
  /* arms: a thin black line ending in a round white glove. Left-arm points; the right is mirrored */
  const ARMS = {
    down: { line: [[6, 12], [5, 13], [4, 14], [3, 15]], hand: [1, 15] },
    out: { line: [[6, 11], [5, 11], [4, 11], [3, 11]], hand: [1, 10] },
    up: { line: [[6, 11], [5, 10], [4, 9], [4, 8]], hand: [3, 6] },
    high: { line: [[7, 10], [7, 9], [6, 8], [6, 7]], hand: [5, 5] },
    flap: { line: [[6, 11], [5, 10], [4, 10], [3, 9]], hand: [1, 8] },
    none: null
  };
  const arm = (rows, pose, right) => {
    const A = ARMS[pose];
    if (!A) return rows;
    const fx = x => right ? W - 1 - x : x;
    for (const [x, y] of A.line) rows = art.put(rows, fx(x), y, ['k']);
    const [hx, hy] = A.hand;
    /* a glove is a 2 x 2 white blob with a grey outline below it */
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) rows = art.put(rows, fx(hx + dx), hy + dy, ['w']);
    rows = art.put(rows, fx(hx + (right ? 1 : 0)), hy + 2, ['g']);
    return rows;
  };
  /* faces: e = eye white, p = pupil, m = mouth */
  const EYE_L = 9, EYE_R = 14, EYE_Y = 10;
  const face = (rows, kind) => {
    const L = EYE_L, R = EYE_R, y = EYE_Y, pill = ['ee', 'ee', 'ee'];
    if (kind === 'open') return art.compose(rows, [L, y, pill], [R, y, pill], [12, y + 4, ['m']]);
    if (kind === 'left') return art.compose(rows, [L - 1, y, pill], [R - 1, y, pill], [10, y + 4, ['m']]);
    if (kind === 'right') return art.compose(rows, [L + 1, y, pill], [R + 1, y, pill], [14, y + 4, ['m']]);
    if (kind === 'blink') return art.compose(rows, [L, y + 2, ['ee']], [R, y + 2, ['ee']], [12, y + 4, ['m']]);
    if (kind === 'squint') return art.compose(rows, [L, y + 1, ['e.']], [L + 1, y + 2, ['e']], [R + 1, y + 1, ['e']], [R, y + 2, ['e']], [11, y + 4, ['mmm']]);
    if (kind === 'wide') return art.compose(rows, [L, y - 1, ['ee', 'ee', 'ee', 'ee']], [R, y - 1, ['ee', 'ee', 'ee', 'ee']], [12, y + 4, ['m']], [12, y + 5, ['m']]);
    if (kind === 'happy') return art.compose(rows, [L - 1, y + 1, ['.e.', 'e.e']], [R - 1, y + 1, ['.e.', 'e.e']], [11, y + 4, ['m.m']], [12, y + 5, ['m']]);
    if (kind === 'dizzy') return art.compose(rows, [L - 1, y, ['e.e', '.e.', 'e.e']], [R - 1, y, ['e.e', '.e.', 'e.e']], [11, y + 4, ['mmm']]);
    return rows;
  };
  const make = (kind, l, r) => art.outline(arm(arm(face(tri(), kind), l), r, true), 'r');
  defineSprite('tri', {
    w: W, h: H, scale: 4, base: BASE,
    does: 'tumble',
    palette: { b: '#000000', B: '#1d1d22', G: '#000000', r: '#5c5c66', e: '#ffffff', p: '#000000', m: '#ffffff', k: '#000000', w: '#ffffff', g: '#b4b4bf' },
    frames: {
      idle: [make('open', 'down', 'down'), make('open', 'down', 'down'), make('open', 'down', 'down'), make('blink', 'down', 'down')],
      left: [make('left', 'down', 'down')], right: [make('right', 'down', 'down')],
      roll: [make('squint', 'none', 'none')],
      air: [make('wide', 'out', 'out'), make('wide', 'flap', 'flap')],
      happy: [make('happy', 'down', 'down')],
      wave: [make('happy', 'down', 'high'), make('happy', 'down', 'up')],
      cheer: [make('happy', 'high', 'high'), make('happy', 'up', 'up')],
      dance: [make('happy', 'up', 'down'), make('open', 'out', 'out'), make('happy', 'down', 'up'), make('open', 'out', 'out')],
      dizzy: [make('dizzy', 'out', 'down'), make('dizzy', 'down', 'out')]
    },
    fps: { idle: 2.5, air: 10, wave: 6, cheer: 6, dance: 5, dizzy: 4 }
  });
})();
