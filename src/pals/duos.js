/* DUOS: the cast of the ten pairs (behaviours in src/behaviors/duos.js), drawn as smooth vector characters,
 * not pixels: rounded shapes, soft shading, glossy eyes, a clean outline. Every pose is drawn at the screen's
 * real resolution the first time a character is used, so they stay crisp at any size.
 *   popper · Butter    wick · Dusty    earl · Sip    dent · Soot    volt · bolts
 *   spike · Tumble     morel · Ribb    luna · Pup    parcel · the mailbox    wink · its shadow */
(() => {
  const OL = '#2a2233', LW = .62;
  /* ---------- drawing kit: local units, feet at (0, 0), up is negative y ---------- */
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
  const ell = (g, x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), rot, 0, Math.PI * 2); };
  const lin = (g, y0, y1, a, b) => { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, a); q.addColorStop(1, b); return q; };
  const fs = (g, fill, line = OL, w = LW) => { g.fillStyle = fill; g.fill(); if (line) { g.lineWidth = w; g.lineJoin = g.lineCap = 'round'; g.strokeStyle = line; g.stroke(); } };
  const st = (g, col, w = LW) => { g.lineWidth = w; g.lineJoin = g.lineCap = 'round'; g.strokeStyle = col; g.stroke(); };
  const shine = (g, x, y, rx, ry, a = .55) => { ell(g, x, y, rx, ry, -.5); g.fillStyle = `rgba(255,255,255,${a})`; g.fill(); };
  /* eyes: open (glossy), blink (a closed line), happy (^ ^), wide, closed tight (> <), looking (pupils shifted) */
  const eyes = (g, x, y, sep, r, p, col = OL, glow) => {
    for (const s of [-1, 1]) {
      const cx = x + s * sep / 2;
      if (p.e === 'blink' || p.e === 'sleep') { g.beginPath(); g.moveTo(cx - r, y); g.quadraticCurveTo(cx, y + r * .7, cx + r, y); st(g, col, LW * .9); continue; }
      if (p.e === 'happy') { g.beginPath(); g.moveTo(cx - r, y + r * .3); g.quadraticCurveTo(cx, y - r * 1.1, cx + r, y + r * .3); st(g, col, LW * .9); continue; }
      if (p.e === 'tight') { g.beginPath(); g.moveTo(cx - r * s * -1 - r * .2, y - r * .6); g.lineTo(cx + r * .2 * s, y); g.lineTo(cx - r * s * -1 - r * .2, y + r * .6); st(g, col, LW * .9); continue; }
      const k = p.e === 'wide' ? 1.25 : 1, lx = p.e === 'look' ? r * .45 : 0;
      ell(g, cx + lx, y, r * .82 * k, r * k); g.fillStyle = glow || col; g.fill();
      ell(g, cx + lx - r * .28, y - r * .38, r * .3 * k, r * .3 * k); g.fillStyle = '#fff'; g.fill();
      ell(g, cx + lx + r * .3, y + r * .4, r * .14, r * .14); g.fillStyle = 'rgba(255,255,255,.7)'; g.fill();
    }
  };
  const cheeks = (g, x, y, sep, r, a = .55, col = '255,120,150') => { for (const s of [-1, 1]) { ell(g, x + s * sep / 2, y, r * 1.2, r * .75); g.fillStyle = `rgba(${col},${a})`; g.fill(); } };
  const mouth = (g, x, y, w, p, col = OL) => {
    g.beginPath();
    if (p.m === 'open' || p.e === 'happy') { g.moveTo(x - w / 2, y - w * .1); g.quadraticCurveTo(x, y + w * .9, x + w / 2, y - w * .1); g.closePath(); fs(g, '#7a2a3a', col, LW * .8); return; }
    if (p.m === 'o' || p.e === 'wide') { ell(g, x, y + w * .15, w * .26, w * .32); fs(g, '#7a2a3a', col, LW * .8); return; }
    if (p.e === 'sleep') { g.moveTo(x - w * .25, y); g.lineTo(x + w * .25, y); st(g, col, LW * .8); return; }
    g.moveTo(x - w / 2, y); g.quadraticCurveTo(x, y + w * .55, x + w / 2, y); st(g, col, LW * .85);
  };
  const feet = (g, xs, y, w, h, col, p) => xs.forEach((x, i) => { rr(g, x - w / 2, y - h - (p.step && (i ? p.step > 0 : p.step < 0) ? .9 : 0), w, h, h / 2); fs(g, col); });

  /* ---------- poses: every character gets the same clips; a few add their own ---------- */
  const N = {};
  const CLIPS = base => ({
    idle: [N, N, N, N, { e: 'blink' }, N, N, { sq: .35 }, N, N].map(o => ({ ...base, ...o })),
    walk: [{ step: -1, up: .5 }, { step: 0 }, { step: 1, up: .5 }, { step: 0 }].map(o => ({ ...base, ...o })),
    hop: [{ sq: .7 }, { up: 2.4, sq: -.3 }, { up: 3.6, sq: -.2 }, { up: 2.2 }, { sq: .7 }].map(o => ({ ...base, ...o })),
    happy: [{ e: 'happy', up: 1.6 }, { e: 'happy', sq: .45 }].map(o => ({ ...base, ...o })),
    sleep: [{ e: 'sleep', sq: .2 }, { e: 'sleep', sq: .35 }, { e: 'sleep', sq: .35 }, { e: 'sleep', sq: .2 }].map(o => ({ ...base, ...o })),
    look: [{ e: 'look' }, { e: 'look' }, { e: 'look' }, N].map(o => ({ ...base, ...o })),
    scared: [{ e: 'wide', up: .7, dx: -.5 }, { e: 'wide', up: .7, dx: .5 }].map(o => ({ ...base, ...o })),
    squash: [{ sq: .9 }, { sq: .9 }, N].map(o => ({ ...base, ...o }))
  });
  const FPS = { idle: 4, walk: 7, hop: 11, happy: 7, sleep: 2, look: 3, scared: 14, squash: 8 };

  /* a drawn sprite: canvases are made on first use, one per distinct pose */
  const drawn = ({ w, h, scale = 4, does, draw, base = {}, extra = {}, fps = {}, only }) => {
    const clips = only ? Object.fromEntries(Object.entries(only)) : { ...CLIPS(base), ...extra };
    const spec = { w, h, scale, palette: {}, frames: clips, fps: { ...FPS, ...fps }, start: 'idle' };
    if (does) spec.does = does;
    let cache = null;
    Object.defineProperty(spec, 'canvases', { enumerable: false, get() {
      if (cache) return cache;
      const res = spec.res, seen = new Map(); cache = {};
      for (const [clip, list] of Object.entries(clips)) cache[clip] = list.map(p => {
        const key = JSON.stringify(p); if (seen.has(key)) return seen.get(key);
        const c = document.createElement('canvas'); c.width = Math.ceil(w * res); c.height = Math.ceil(h * res);
        const g = c.getContext('2d'); g.scale(res, res); g.translate(w / 2 + (p.dx || 0), h - .4 - (p.up || 0));
        const sq = p.sq || 0; g.scale(1 + sq * .1, 1 - sq * .12);
        draw(g, p); seen.set(key, c); return c;
      });
      return cache;
    } });
    spec.res = Math.min(8, Math.ceil(scale * (window.devicePixelRatio || 1)));
    return spec;
  };

  /* ---------- 1. POP ---------- */
  defineSprite('popper', drawn({ w: 24, h: 20, does: 'popper', draw(g, p) {
    rr(g, -9.5, -14, 19, 13, 4.5); fs(g, lin(g, -14, -1, '#f6f8fc', '#b7c0d0'));
    rr(g, -6.6, -14.6, 5, 1.8, .9); fs(g, '#3a3448'); rr(g, 1.6, -14.6, 5, 1.8, .9); fs(g, '#3a3448');
    shine(g, -6, -11.4, 2.4, 1);
    const lv = p.sq > .5 ? 2.2 : 0; rr(g, 9.3, -10 + lv, 2.2, 1.6, .8); fs(g, '#ff5d73'); rr(g, 9.4, -11.5, .8, 6, .4); fs(g, '#8a90a0', OL, .4);
    feet(g, [-6, 6], 0, 3.2, 1.6, '#55506a', p);
    eyes(g, 0, -8, 6.6, .95, p); cheeks(g, 0, -6.3, 10.2, .9); mouth(g, 0, -5.9, 2.2, p);
  } }));
  defineSprite('_butter', drawn({ w: 15, h: 18, draw(g, p) {
    const body = () => { g.beginPath(); g.moveTo(-5.6, -1.5); g.lineTo(-5.6, -9.5); g.arc(-2.6, -9.7, 3.1, Math.PI, 0); g.arc(2.6, -9.7, 3.1, Math.PI, 0); g.lineTo(5.6, -1.5); g.quadraticCurveTo(5.6, -.6, 4.6, -.6); g.lineTo(-4.6, -.6); g.quadraticCurveTo(-5.6, -.6, -5.6, -1.5); };
    body(); fs(g, '#c98a4e');
    g.save(); g.translate(0, -6); g.scale(.78, .8); g.translate(0, 6); body(); g.fillStyle = lin(g, -12, 0, '#fff2c8', '#ffd98e'); g.fill(); g.restore();
    rr(g, -2.4, -12.4, 4.8, 2.3, .8); fs(g, '#fff6a8', '#c9a54a', .45); shine(g, -1.2, -11.8, 1, .4, .8);
    feet(g, [-2.4, 2.4], .4, 1.6, 1.2, '#c98a4e', p);
    eyes(g, 0, -6.2, 4.2, .75, p); cheeks(g, 0, -4.8, 6.8, .7); mouth(g, 0, -4.5, 1.6, p);
  } }));

  /* ---------- 2. GLOW ---------- */
  const flame = (g, f) => {
    if (f === 'out') { g.beginPath(); g.moveTo(0, -12.6); g.bezierCurveTo(1.6, -14, -1.4, -15.2, .4, -16.8); g.bezierCurveTo(1.8, -18, -.4, -18.8, .6, -20); st(g, 'rgba(140,130,150,.7)', .5); return; }
    const hgt = f === 'dim' ? 2.2 : 4.6, wd = f === 'dim' ? 1.4 : 2.2, lean = f === 'flick' ? -1.2 : 0, y = -13;
    const q = g.createRadialGradient(0, y - hgt / 2, 0, 0, y - hgt / 2, hgt * 1.9); q.addColorStop(0, `rgba(255,200,90,${f === 'dim' ? .25 : .45})`); q.addColorStop(1, 'rgba(255,200,90,0)');
    g.fillStyle = q; g.fillRect(-9, y - hgt * 3, 18, hgt * 4);
    g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(-wd, y - hgt * .3, -wd * .6 + lean, y - hgt * .8, lean, y - hgt); g.bezierCurveTo(wd * .6 + lean, y - hgt * .8, wd, y - hgt * .3, 0, y);
    g.fillStyle = lin(g, y - hgt, y, '#fff3a0', '#ff8a2f'); g.fill();
    g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(-wd * .45, y - hgt * .25, lean * .5, y - hgt * .6, lean * .5, y - hgt * .65); g.bezierCurveTo(wd * .3, y - hgt * .4, wd * .45, y - hgt * .2, 0, y); g.fillStyle = '#fffbe6'; g.fill();
  };
  defineSprite('wick', drawn({ w: 14, h: 26, does: 'wick', base: { f: 'lit' },
    extra: { dim: CLIPS({ f: 'dim' }).idle, out: CLIPS({ f: 'out', e: 'sleep' }).sleep, blush: CLIPS({ f: 'lit', blush: 1 }).idle, flick: CLIPS({ f: 'flick' }).idle },
    fps: { dim: 4, out: 2, blush: 4, flick: 4 }, draw(g, p) {
      ell(g, 0, -1.6, 5.4, 1.6); fs(g, '#e0b040'); rr(g, -4, -3, 8, 1.6, .8); fs(g, '#f4cf6a');
      rr(g, -3.4, -12.4, 6.8, 9.6, 1.8); fs(g, lin(g, -12.4, -3, '#fffaf0', '#ead7bd'));
      g.beginPath(); g.moveTo(-2.6, -12.4); g.quadraticCurveTo(-2.4, -10, -1.6, -10.4); g.quadraticCurveTo(-1, -12, 1.6, -12.4); g.fillStyle = '#fffdf6'; g.fill();
      g.beginPath(); g.moveTo(0, -12.4); g.lineTo(0, -13.2); st(g, OL, .5);
      flame(g, p.f);
      eyes(g, 0, -8.2, 2.9, .62, p); cheeks(g, 0, -6.9, 4.8, p.blush ? .9 : .65, p.blush ? .9 : .5); mouth(g, 0, -6.6, 1.3, p);
    } }));
  defineSprite('_dusty', drawn({ w: 20, h: 17, base: { wing: 0 }, extra: { fly: [{ wing: 0 }, { wing: 1 }] }, fps: { fly: 12 }, draw(g, p) {
    const up = p.wing ? -.55 : 0;
    for (const s of [-1, 1]) {
      g.save(); g.translate(s * 2.2, -7.6); g.rotate(s * (.35 + up));
      ell(g, s * 4.2, -1.6, 4.6, 3.6, s * .3); fs(g, lin(g, -5, 2, '#f7ecd8', '#d9c4a0'));
      ell(g, s * 4.4, -1.4, 1.5, 1.3); g.fillStyle = '#c39a6b'; g.fill();
      ell(g, s * 2.6, 2.4, 2.6, 2, s * .5); fs(g, '#e4d2b2');
      g.restore();
    }
    ell(g, 0, -6.4, 3.6, 4.8); fs(g, lin(g, -11, -2, '#c7b8a8', '#8f7e70'));
    ell(g, 0, -10.2, 3.2, 1.6); g.fillStyle = '#efe6da'; g.fill();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 1, -11); g.quadraticCurveTo(s * 2.4, -14, s * 3.6, -14.6); st(g, OL, .45); ell(g, s * 3.6, -14.6, .6, .6); g.fillStyle = OL; g.fill(); }
    eyes(g, 0, -7.4, 3.2, .85, p); cheeks(g, 0, -5.8, 5.4, .65); mouth(g, 0, -5.4, 1.3, p);
  } }));

  /* ---------- 3. BREW ---------- */
  defineSprite('earl', drawn({ w: 26, h: 20, does: 'earl', draw(g, p) {
    g.beginPath(); g.moveTo(6.4, -6); g.bezierCurveTo(9.2, -6.4, 9.6, -9.6, 11.6, -11.4); g.lineTo(12.6, -10.6); g.bezierCurveTo(11, -8.6, 10.6, -4.4, 6.6, -3.4); g.closePath(); fs(g, '#57c7b6');
    g.beginPath(); g.arc(-7.4, -7.4, 3, Math.PI * .5, Math.PI * 1.5); st(g, OL, 2.2); g.beginPath(); g.arc(-7.4, -7.4, 3, Math.PI * .5, Math.PI * 1.5); st(g, '#57c7b6', 1.1);
    ell(g, 0, -6.8, 7.6, 6.2); fs(g, lin(g, -13, -.6, '#8be3d4', '#3a9a8c'));
    ell(g, 0, -12.6, 4.4, 1.5); fs(g, '#6fd6c6'); ell(g, 0, -14.4, 1.3, 1.1); fs(g, '#ffd23f');
    ell(g, 0, -.9, 4.6, 1.1); fs(g, '#3a9a8c');
    shine(g, -4, -9.4, 2.2, 1.2);
    eyes(g, 0, -7, 6, .95, p); cheeks(g, 0, -5.2, 9.4, .85); mouth(g, 0, -4.9, 2, p);
  } }));
  const cup = (g, p) => {
    g.beginPath(); g.arc(5.6, -5.4, 2.1, -Math.PI * .5, Math.PI * .5); st(g, OL, 1.8); g.beginPath(); g.arc(5.6, -5.4, 2.1, -Math.PI * .5, Math.PI * .5); st(g, '#fff6ea', .8);
    ell(g, 0, -1.1, 6.6, 1.4); fs(g, '#ffd23f');
    g.beginPath(); g.moveTo(-5.4, -9.4); g.lineTo(5.4, -9.4); g.bezierCurveTo(5.2, -4, 4.4, -1.8, 2.6, -1.8); g.lineTo(-2.6, -1.8); g.bezierCurveTo(-4.4, -1.8, -5.2, -4, -5.4, -9.4); g.closePath(); fs(g, lin(g, -9.4, -1.8, '#ffffff', '#ecdcc6'));
    ell(g, 0, -9.4, 5.4, 1.3); fs(g, p.empty ? '#e5d3bd' : lin(g, -10.5, -8.2, '#c98a4e', '#9a5a2a'));
    eyes(g, 0, -6, 3.8, .72, p); cheeks(g, 0, -4.6, 6.2, .7); mouth(g, 0, -4.3, 1.4, p);
  };
  defineSprite('_sip', drawn({ w: 17, h: 15, extra: { empty: CLIPS({ empty: 1 }).idle }, fps: { empty: 4 }, draw: cup }));

  /* ---------- 4. QUEST ---------- */
  defineSprite('dent', drawn({ w: 18, h: 24, does: 'dent', draw(g, p) {
    rr(g, 5.4, -16.6, 1.6, 9.6, .6); fs(g, lin(g, -16, -7, '#ffffff', '#c9d2e4')); rr(g, 3.8, -7.6, 4.8, 1.2, .5); fs(g, '#e0b040'); rr(g, 5.6, -6.4, 1.2, 2.2, .5); fs(g, '#8a5a2a');
    feet(g, [-2.2, 2.2], 0, 2.2, 3, '#77809a', p);
    rr(g, -4.2, -9, 8.4, 6.6, 2.2); fs(g, lin(g, -9, -2.4, '#6f8ff0', '#3a58c0')); rr(g, -4.2, -5.2, 8.4, 1.1, .4); fs(g, '#e0b040', OL, .4);
    g.beginPath(); g.moveTo(-.4, -17.6); g.bezierCurveTo(-4, -21, 2, -22.4, 3.6, -19.6); g.bezierCurveTo(2.4, -20.4, 1, -19, .6, -17.6); g.closePath(); fs(g, lin(g, -22, -17, '#ff7a8a', '#d8304a'));
    rr(g, -4.8, -17.8, 9.6, 9, 4.4); fs(g, lin(g, -17.8, -8.8, '#e8eef8', '#9aa4bc'));
    rr(g, -3.8, -14.4, 7.6, 2.4, 1.2); fs(g, '#1e1b2a', null);
    shine(g, -2.6, -16, 1.6, .7);
    eyes(g, 0, -13.2, 3.4, .55, p, OL, '#ffd23f');
  } }));
  defineSprite('_soot', drawn({ w: 24, h: 20, extra: { sneeze: [{ e: 'tight', m: 'o' }, { e: 'tight', m: 'o', sq: .3 }] }, fps: { sneeze: 6 }, draw(g, p) {
    g.beginPath(); g.moveTo(5.4, -3.2); g.bezierCurveTo(9, -2, 10, -5.4, 9.6, -7.6); st(g, OL, 2.2); g.beginPath(); g.moveTo(5.4, -3.2); g.bezierCurveTo(9, -2, 10, -5.4, 9.6, -7.6); st(g, '#5cbf45', 1.1);
    g.beginPath(); g.moveTo(9.6, -7.6); g.lineTo(8.4, -9.6); g.lineTo(11, -9); g.closePath(); fs(g, '#b98cff', OL, .45);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 4.4, -9); g.quadraticCurveTo(s * 9.4, -13.4, s * 9.2, -8.6); g.quadraticCurveTo(s * 8, -9.6, s * 7.2, -7.6); g.quadraticCurveTo(s * 6.2, -8.4, s * 5, -6.6); g.closePath(); fs(g, lin(g, -13, -6, '#d4b8ff', '#9a6ae8')); }
    feet(g, [-3, 3], 0, 2.8, 1.8, '#4ea83a', p);
    ell(g, 0, -7, 6.4, 6.6); fs(g, lin(g, -14, -.4, '#a8ee7c', '#4ea83a'));
    ell(g, 0, -4.4, 3.9, 3.6); g.fillStyle = '#ffe8a8'; g.fill();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 2.2, -12.6); g.lineTo(s * 3.4, -15.6); g.lineTo(s * 4.4, -12); g.closePath(); fs(g, '#fff3cf'); }
    shine(g, -3.4, -10.6, 1.8, .9);
    eyes(g, 0, -8.6, 5, .95, p); cheeks(g, 0, -6.8, 8.4, .8); mouth(g, 0, -6.4, 2, p);
    if (p.e === 'tight') { for (const s of [-1, 1]) { ell(g, s * .7, -7.2, .25, .25); g.fillStyle = OL; g.fill(); } }
  } }));

  /* ---------- 5. PULL ---------- */
  defineSprite('volt', drawn({ w: 20, h: 26, does: 'volt', draw(g, p) {
    g.beginPath(); g.arc(0, -19.6, 3.6, Math.PI, 0); st(g, OL, 3.2); g.beginPath(); g.arc(0, -19.6, 3.6, Math.PI, Math.PI * 1.5); st(g, '#ff4d6d', 1.9); g.beginPath(); g.arc(0, -19.6, 3.6, Math.PI * 1.5, 0); st(g, '#4d8dff', 1.9);
    rr(g, -4.3, -20.2, 1.8, 1.6, .3); fs(g, '#e8eef8', OL, .4); rr(g, 2.5, -20.2, 1.8, 1.6, .3); fs(g, '#e8eef8', OL, .4);
    feet(g, [-2.4, 2.4], 0, 2.4, 2.4, '#8c95a8', p);
    for (const s of [-1, 1]) { rr(g, s * 5.2 - 1, -8.6, 2, 4, 1); fs(g, '#aab3c8'); }
    rr(g, -4.6, -9.4, 9.2, 7.6, 2.6); fs(g, lin(g, -9.4, -1.8, '#e3e8f2', '#9aa4bc')); ell(g, 0, -6, 1.1, 1.1); fs(g, '#ffd23f', OL, .4);
    rr(g, -6.2, -18.4, 12.4, 9.4, 3.4); fs(g, lin(g, -18.4, -9, '#f4f7fc', '#aab3c8'));
    rr(g, -4.8, -17, 9.6, 6.6, 2.4); fs(g, '#1e2433', OL, .45);
    eyes(g, 0, -14, 4.6, .8, p, '#7dffcf', '#7dffcf'); g.beginPath(); g.moveTo(-1, -12); g.quadraticCurveTo(0, -11.2, 1, -12); st(g, '#7dffcf', .45);
    shine(g, -4.2, -17.4, 1.6, .6);
  } }));
  defineSprite('_nut', drawn({ w: 10, h: 14, draw(g, p) {
    rr(g, -1.5, -5.6, 3, 5, .8); fs(g, lin(g, -5, 0, '#cfd6e2', '#8a93a6')); for (let y = -4.6; y < -.5; y += 1.2) { g.beginPath(); g.moveTo(-1.5, y); g.lineTo(1.5, y + .5); st(g, OL, .35); }
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; g.lineTo(Math.cos(a) * 4, -8.6 + Math.sin(a) * 3.4); } g.closePath(); fs(g, lin(g, -12, -5, '#f0f3f8', '#9aa4b8'));
    shine(g, -1.6, -10, 1.2, .5);
    eyes(g, 0, -8.6, 2.8, .55, p); cheeks(g, 0, -7.6, 4.4, .5); mouth(g, 0, -7.4, 1, p);
  } }));

  /* ---------- 6. RODEO ---------- */
  defineSprite('spike', drawn({ w: 20, h: 26, does: 'spike', draw(g, p) {
    g.beginPath(); g.moveTo(-4.6, -4.4); g.lineTo(4.6, -4.4); g.lineTo(3.6, -.2); g.lineTo(-3.6, -.2); g.closePath(); fs(g, lin(g, -4.4, 0, '#e08a5a', '#b05a30')); rr(g, -5.2, -5.6, 10.4, 1.6, .6); fs(g, '#e8946a');
    for (const s of [-1, 1]) { rr(g, s * 5.6 - 1.4, -13 + (s > 0 ? 1.4 : 0), 2.8, 5.6, 1.4); fs(g, '#5cbf63'); rr(g, s * 3.4 - .2 * s - 1, -9 + (s > 0 ? 1.4 : 0), 3, 2.2, 1); fs(g, '#5cbf63', null); }
    rr(g, -3.8, -16, 7.6, 11, 3.8); fs(g, lin(g, -16, -5, '#8ae58a', '#3c8f48'));
    for (const [x, y] of [[-2.4, -14], [2.2, -12.4], [-2.8, -8], [2.6, -7.4], [0, -6]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + .5, y - .5); st(g, '#e8ffd8', .35); }
    ell(g, 0, -16.2, 6.4, 1.4); fs(g, '#a8683a'); rr(g, -3, -19.6, 6, 3.6, 1.4); fs(g, lin(g, -19.6, -16, '#c88a5a', '#8a5226')); rr(g, -3, -17.2, 6, .9, .3); fs(g, '#ff4d6d', null);
    eyes(g, 0, -12.2, 3.4, .68, p); cheeks(g, 0, -10.7, 5.6, .65); mouth(g, 0, -10.4, 1.5, p);
  } }));
  defineSprite('_tumble', drawn({ w: 14, h: 14, draw(g, p) {
    ell(g, 0, -6.4, 5.8, 5.8); fs(g, 'rgba(232,196,138,.92)');
    for (let i = 0; i < 9; i++) { const a = i * 1.3; g.beginPath(); g.ellipse(Math.cos(a) * 1.2, -6.4 + Math.sin(a) * 1.2, 4.6, 2.2 + (i % 3) * .5, a, 0, Math.PI * 1.4); st(g, i % 2 ? '#a8783e' : '#7a5228', .45); }
    eyes(g, 0, -6.8, 3.2, .6, p); mouth(g, 0, -5.2, 1.2, p);
  } }));

  /* ---------- 7. HEX ---------- */
  defineSprite('morel', drawn({ w: 22, h: 28, does: 'morel', draw(g, p) {
    g.beginPath(); g.moveTo(6.8, -.4); g.lineTo(6.8, -14); st(g, OL, 1.6); g.beginPath(); g.moveTo(6.8, -.4); g.lineTo(6.8, -14); st(g, '#a8683a', .8);
    const q = g.createRadialGradient(6.8, -15, 0, 6.8, -15, 3.4); q.addColorStop(0, 'rgba(125,255,207,.9)'); q.addColorStop(1, 'rgba(125,255,207,0)'); g.fillStyle = q; g.fillRect(3, -19, 8, 8);
    ell(g, 6.8, -15, 1.3, 1.3); fs(g, '#bfffe8', OL, .45);
    feet(g, [-2, 2], 0, 2, 1.4, '#e5d3bd', p);
    rr(g, -4, -10, 8, 9.6, 3.4); fs(g, lin(g, -10, -.4, '#fffaf0', '#e5d3bd'));
    g.beginPath(); g.moveTo(-8.6, -9.6); g.quadraticCurveTo(-3, -12, 0, -21); g.quadraticCurveTo(2.2, -24.6, 4.6, -24); g.quadraticCurveTo(2, -22, 3, -18); g.quadraticCurveTo(4.4, -12, 8.6, -9.6); g.quadraticCurveTo(0, -8.2, -8.6, -9.6); g.closePath(); fs(g, lin(g, -24, -9, '#b88cff', '#5d36b0'));
    for (const [x, y, r] of [[-2.6, -12.6, .7], [1.8, -15.6, .55], [3.4, -11.6, .5]]) { ell(g, x, y, r, r); g.fillStyle = '#ffe066'; g.fill(); }
    eyes(g, 0, -6, 3.6, .7, p); cheeks(g, 0, -4.4, 5.8, .65); mouth(g, 0, -4.1, 1.5, p);
  } }));
  defineSprite('_ribb', drawn({ w: 16, h: 14, draw(g, p) {
    feet(g, [-4, 4], .2, 3, 1.2, '#3f9a3a', p);
    ell(g, 0, -4.6, 6.6, 4.6); fs(g, lin(g, -9, 0, '#8ee07a', '#3f9a3a'));
    ell(g, 0, -3.2, 4.2, 2.6); g.fillStyle = '#e8f7b8'; g.fill();
    for (const s of [-1, 1]) { ell(g, s * 3.2, -8.4, 2.6, 2.4); fs(g, '#7ad668'); ell(g, s * 3.2, -8.5, 1.8, 1.7); g.fillStyle = '#fff'; g.fill(); }
    const pe = p.e === 'happy' || p.e === 'blink' || p.e === 'sleep' || p.e === 'tight' ? p : { ...p, e: p.e === 'wide' ? 'wide' : p.e === 'look' ? 'look' : 'open' };
    eyes(g, 0, -8.4, 6.4, .9, pe); cheeks(g, 0, -5.4, 8.4, .7);
    g.beginPath(); g.moveTo(-3, -5.6); g.quadraticCurveTo(0, -3.8, 3, -5.6); st(g, OL, .55);
  } }));

  /* ---------- 8. HOWL ---------- */
  defineSprite('luna', drawn({ w: 20, h: 20, does: 'luna', extra: { blush: CLIPS({ blush: 1 }).idle }, fps: { blush: 4 }, draw(g, p) {
    const q = g.createRadialGradient(0, -9, 5, 0, -9, 10); q.addColorStop(0, 'rgba(255,240,180,.45)'); q.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = q; g.fillRect(-10, -20, 20, 20);
    ell(g, 0, -9, 7.6, 7.6); fs(g, lin(g, -16.6, -1.4, '#fffbe6', '#f0d27a'));
    for (const [x, y, r] of [[3.6, -13, 1.4], [4.6, -6.4, .9], [-4.6, -12.8, .8]]) { ell(g, x, y, r, r * .85); g.fillStyle = 'rgba(214,180,90,.5)'; g.fill(); }
    eyes(g, -.6, -9, 5, .8, p.e ? p : { ...p, e: 'blink' }); cheeks(g, -.6, -7.2, 8.2, p.blush ? 1.1 : .8, p.blush ? .95 : .5); mouth(g, -.6, -6.8, 1.6, p);
  } }));
  defineSprite('_pup', drawn({ w: 22, h: 20, draw(g, p) {
    g.beginPath(); g.moveTo(4.4, -3); g.bezierCurveTo(9, -3.4, 10, -8, 8.6, -10); g.bezierCurveTo(8, -7.6, 6.6, -6, 4.4, -5.6); g.closePath(); fs(g, lin(g, -10, -3, '#aab1c4', '#6c7488'));
    ell(g, 0, -4, 5.2, 4.2); fs(g, lin(g, -8, 0, '#a2a9bc', '#6c7488'));
    ell(g, 0, -2.6, 2.8, 2.6); g.fillStyle = '#eef1f7'; g.fill();
    feet(g, [-2.6, 2.6], 0, 2.4, 1.6, '#c9cfdc', p);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 1.6, -14.4); g.lineTo(s * 4, -18.6); g.lineTo(s * 4.8, -12.8); g.closePath(); fs(g, '#8b93a8'); g.beginPath(); g.moveTo(s * 2.6, -14.4); g.lineTo(s * 3.9, -16.8); g.lineTo(s * 4.2, -13.6); g.closePath(); g.fillStyle = '#ffb3c7'; g.fill(); }
    ell(g, 0, -11, 5.4, 4.8); fs(g, lin(g, -16, -6, '#c4cada', '#8b93a8'));
    ell(g, 0, -9, 2.8, 2); g.fillStyle = '#f4f6fa'; g.fill(); ell(g, 0, -10, .9, .65); g.fillStyle = OL; g.fill();
    eyes(g, 0, -12, 4.4, .78, p); cheeks(g, 0, -9.6, 7.6, .65); mouth(g, 0, -8.6, 1.3, p);
  } }));

  /* ---------- 9. POST ---------- */
  const envelope = (g, x, y, k = 1) => {
    g.save(); g.translate(x, y); g.rotate(-.12); g.scale(k, k);
    rr(g, -3.4, -2.3, 6.8, 4.6, .6); fs(g, '#ffffff');
    g.beginPath(); g.moveTo(-3.4, -2.3); g.lineTo(0, .3); g.lineTo(3.4, -2.3); st(g, OL, .45);
    g.beginPath(); g.arc(0, .2, .75, 0, Math.PI * 2); g.fillStyle = '#ff4d6d'; g.fill();
    g.restore();
  };
  defineSprite('parcel', drawn({ w: 22, h: 18, does: 'parcel', base: { letter: 1 }, extra: { empty: CLIPS({ letter: 0 }).idle, crawl: CLIPS({ letter: 1 }).idle }, fps: { empty: 4, crawl: 4 }, draw(g, p) {
    g.beginPath(); g.moveTo(-9, -.4); g.quadraticCurveTo(-9.4, -2.4, -6, -2.6); g.lineTo(4.6, -2.6); g.quadraticCurveTo(6, -6.6, 7.6, -7.6); g.quadraticCurveTo(9.6, -8, 9.6, -5); g.quadraticCurveTo(9.6, -.4, 6, -.4); g.closePath(); fs(g, lin(g, -8, 0, '#ffd09a', '#f0954a'));
    for (const s of [0, 1]) { g.beginPath(); g.moveTo(6.6 + s * 1.6, -7.2); g.lineTo(6 + s * 2.6, -10.6); st(g, OL, .45); }
    ell(g, -.6, -7, 5.2, 5); fs(g, lin(g, -12, -2, '#d99a5a', '#9b5f30'));
    g.beginPath(); for (let a = 0; a < 9.4; a += .2) { const r = 4.4 - a * .42; g.lineTo(-.6 + Math.cos(a) * r, -7 + Math.sin(a) * r); } st(g, '#6e3e1a', .5);
    shine(g, -2.6, -10.2, 1.4, .6, .45);
    eyes(g, 7.4, -10.4, 2.6, .55, p); cheeks(g, 8.3, -5.2, 2.2, .5); mouth(g, 8.4, -4.4, 1.1, p);
    if (p.letter) envelope(g, -.8, -13.4);
  } }));
  defineSprite('_maily', drawn({ w: 18, h: 24, draw(g, p) {
    rr(g, -1, -9, 2, 9, .6); fs(g, '#8a5a3a');
    rr(g, 5.4, -18.6, .8, 6, .3); fs(g, '#55506a', OL, .35); g.beginPath(); g.moveTo(6.2, -18.6); g.lineTo(9.4, -17.6); g.lineTo(6.2, -16.4); g.closePath(); fs(g, '#ff4d6d', OL, .4);
    g.beginPath(); g.roundRect ? g.roundRect(-6.4, -19.4, 12.8, 10.6, [6.4, 6.4, 1.4, 1.4]) : g.rect(-6.4, -19.4, 12.8, 10.6); fs(g, lin(g, -19.4, -8.8, '#7da6ff', '#2f52c0'));
    shine(g, -3.6, -17.2, 2, .9);
    const open = p.e === 'happy' || p.sq > .5;
    rr(g, -3.2, -12.4, 6.4, open ? 2.2 : 1, .5); fs(g, '#1c2238', null);
    eyes(g, 0, -15, 5.2, .8, p); cheeks(g, 0, -13.2, 8.2, .7);
  } }));

  /* ---------- 10. ECHO ---------- */
  const fox = (dark) => (g, p) => {
    const c = dark ? { o1: '#2a1d3e', o2: '#140d22', w: '#2a1d3e', tip: '#2a1d3e', ear: '#140d22' } : { o1: '#ffa760', o2: '#e0601e', w: '#fff3e0', tip: '#fff8ee', ear: '#3a2016' };
    const L = dark ? null : OL;
    g.beginPath(); g.moveTo(3.6, -2.4); g.bezierCurveTo(10, -2, 11.4, -7, 9.4, -11.4); g.bezierCurveTo(8.6, -8, 6.4, -5.8, 3.6, -5.4); g.closePath(); fs(g, lin(g, -11, -2, c.o1, c.o2), L);
    g.beginPath(); g.moveTo(9.4, -11.4); g.bezierCurveTo(10.6, -9, 10.2, -8, 9.4, -7.2); g.bezierCurveTo(8.8, -8.4, 8.8, -10, 9.4, -11.4); g.fillStyle = c.tip; g.fill();
    ell(g, 0, -4, 5, 4.2); fs(g, lin(g, -8, 0, c.o1, c.o2), L);
    ell(g, 0, -3, 2.6, 2.6); g.fillStyle = c.w; g.fill();
    feet(g, [-2.4, 2.4], 0, 2.2, 1.6, dark ? c.o2 : '#3a2016', p);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 1.4, -14.6); g.lineTo(s * 4.6, -19.6); g.lineTo(s * 5.4, -13); g.closePath(); fs(g, c.o1, L); g.beginPath(); g.moveTo(s * 3.6, -17.6); g.lineTo(s * 4.6, -19.6); g.lineTo(s * 5, -16.8); g.closePath(); g.fillStyle = c.ear; g.fill(); }
    ell(g, 0, -11.2, 5.8, 4.8); fs(g, lin(g, -16, -6, c.o1, c.o2), L);
    g.beginPath(); g.moveTo(-5.6, -10.4); g.quadraticCurveTo(-2.6, -7, 0, -7.8); g.quadraticCurveTo(2.6, -7, 5.6, -10.4); g.quadraticCurveTo(2.6, -9.8, 0, -10.6); g.quadraticCurveTo(-2.6, -9.8, -5.6, -10.4); g.fillStyle = c.w; g.fill();
    ell(g, 0, -9.4, .8, .6); g.fillStyle = dark ? c.o2 : OL; g.fill();
    if (dark) { eyes(g, 0, -12, 4.6, .78, p, '#ffd23f', '#ffd23f'); return; }
    eyes(g, 0, -12, 4.6, .78, p); cheeks(g, 0, -10, 8.4, .65); mouth(g, 0, -8.6, 1.3, p);
  };
  defineSprite('wink', drawn({ w: 24, h: 22, does: 'wink', draw: fox(false) }));
  defineSprite('_shade', drawn({ w: 24, h: 22, draw: fox(true) }));

  /* ---------- props ---------- */
  defineSprite('_chute', drawn({ w: 18, h: 12, only: { idle: [N] }, draw(g) {
    for (const x of [-6.6, -2.2, 2.2, 6.6]) { g.beginPath(); g.moveTo(x, -6.6); g.lineTo(0, 0); st(g, OL, .35); }
    g.beginPath(); g.moveTo(-8, -6.4); g.quadraticCurveTo(0, -16, 8, -6.4); g.quadraticCurveTo(6, -7.6, 4, -6.4); g.quadraticCurveTo(2, -7.6, 0, -6.4); g.quadraticCurveTo(-2, -7.6, -4, -6.4); g.quadraticCurveTo(-6, -7.6, -8, -6.4); g.closePath(); fs(g, lin(g, -12, -6, '#ff8a9a', '#e0405a'));
    g.save(); g.clip(); for (const x of [-3.2, 3.2]) { g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(x - 1.1, -14, 2.2, 8); } g.restore();
    g.beginPath(); g.moveTo(-8, -6.4); g.quadraticCurveTo(0, -16, 8, -6.4); st(g, OL, LW);
  } }));
  defineSprite('_steam', drawn({ w: 8, h: 10, only: { idle: [{ k: 0 }, { k: 1 }] }, fps: { idle: 4 }, draw(g, p) {
    for (const s of [-1, 1]) { g.beginPath(); const o = (p.k ? 1 : -1) * s * .6; g.moveTo(s * 1.6, -.5); g.bezierCurveTo(s * 1.6 + 1.6 + o, -3, s * 1.6 - 1.6 - o, -5.4, s * 1.6 + o, -8.6); st(g, 'rgba(255,255,255,.85)', .7); }
  } }));
  defineSprite('_puff', drawn({ w: 12, h: 10, only: { idle: [{ k: 0 }, { k: 1 }] }, fps: { idle: 10 }, draw(g, p) {
    const s = p.k ? 1.1 : .9;
    for (const [x, y, r, c] of [[-3, -4, 3.4 * s, '#ff7a2f'], [1.2, -5, 3.8 * s, '#ff9a3f'], [3.8, -3.4, 2.6 * s, '#ff7a2f'], [0, -5, 2.2 * s, '#ffe066']]) { ell(g, x, y, r, r * .9); g.fillStyle = c; g.fill(); }
  } }));
  defineSprite('_sparkle', drawn({ w: 10, h: 10, only: { idle: [{ k: 0 }, { k: 1 }] }, fps: { idle: 10 }, draw(g, p) {
    const star = (x, y, r, c) => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr2 = i % 2 ? r * .35 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } g.closePath(); g.fillStyle = c; g.fill(); };
    star(0, -5, p.k ? 4 : 3, '#ffe066'); star(p.k ? -3 : 3, p.k ? -8 : -2, 1.4, '#ffffff'); star(p.k ? 3 : -3, p.k ? -2 : -8, 1, '#bfffe8');
  } }));
  defineSprite('_letter', drawn({ w: 9, h: 7, only: { idle: [N] }, draw(g) { envelope(g, 0, -3.2); } }));
})();
