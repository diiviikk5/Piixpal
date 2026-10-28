/* PLAY: short animated plays starring your pals, made in Piixpal Stage.   @component play
 *
 *   <piix-play scene="1.eJy…"></piix-play>                         plays in its own box
 *   <piix-play scene="1.eJy…" over="#signup" play="#signup:submit"></piix-play>
 *                                                                    plays on top of your page
 *
 * Make one at piixpal.dvkk.dev/stage: puppeteer pals with the mouse, give them lines,
 * emotes and entrances, then copy the tag. One renderer draws the studio, your site and
 * the exported video, so what you made is exactly what plays.
 *
 *   scene    the scene code Stage gives you (or plain JSON)
 *   src      or the URL of a scene .json
 *   play     visible | load | click | hover | none                    default: visible (over: load)
 *            "selector:event" plays when that element fires it       e.g. "#signup:submit"
 *            "event:name" plays on a window event                    e.g. "event:cart-empty"
 *   over     CSS selector: play on top of that element, no backdrop
 *   loop     start again when it ends
 *   after    hold | hide       what stays when it ends                default: hold (over: hide)
 *   speed    playback rate                                           default: 1
 *
 *   el.play()  el.pause()  el.stop()  el.seek(seconds)
 *   events: piix:play-start, piix:play-end
 *
 * Scene data: { v:1, title, ar, len, bg, ground, cast:[{ id, pal|make, s, hue, face }],
 *   k:{ id:{ p:[[t,x,y]…], e:[[t,'say',text,d] [t,'emote',icon,d] [t,'act',clip,d]
 *   [t,'jump',h] [t,'face',±1] [t,'show'] [t,'hide']] } }, fx:[[t,'shake'|'flash'|'confetti',d]] }
 * x and y are fractions of the stage; sizes are pixels on a 960-wide stage. */

const SC_W = 960;
/* which clip a pal walks with and which it rests in, where its own names don't say */
const SC_ROLES = {
  pip: { move: 'fly' }, pidge: { move: 'fly' }, sparrows: { idle: 'sit', move: 'fly' }, bumble: { idle: 'fly', move: 'fly' },
  bees: { idle: 'fly', move: 'fly' }, plane: { idle: 'fly', move: 'fly' }, frog: { idle: 'sit', move: 'jump' }, polly: { move: 'hop' },
  boing: { move: 'air' }, tri: { move: 'roll' }, fish: { idle: 'swim', move: 'swim' }, kitty: { idle: 'rest' }, shibe: { idle: 'rest' },
  capy: { idle: 'look' }, moss: { idle: 'look' }, para: { idle: 'landed', move: 'fall' }, rocket: { move: 'burn' },
  roomba: { idle: 'go', move: 'go' }, fetch: { move: 'run' }, pix: { move: 'run' }, beep: { move: 'run' }, scrolly: { move: 'run' },
  balloon: { move: 'idle' }, termi: { idle: 'idle' }, sprout: { idle: 's0' }, meh: { idle: 'm0' }, hatch: { idle: 'egg0' }
};
const SC_MOVE = ['walk', 'run', 'fly', 'swim', 'go', 'roll'];
const SC_IDLE = ['idle', 'sit', 'rest', 'calm', 'look'];
const SC_AIR = ['jump', 'air', 'hop'];
const scRoles = spec => {
  const clips = Object.keys(spec.frames || spec.canvases || {});
  const r = SC_ROLES[spec.name] || {};
  const has = c => clips.includes(c);
  const idle = has(r.idle) ? r.idle : SC_IDLE.find(has) || clips[0];
  const move = has(r.move) ? r.move : SC_MOVE.find(has) || idle;
  const air = SC_AIR.find(has) || null;
  return { idle, move, air, acts: clips.filter(c => c !== idle && c !== move), clips, walks: move !== idle };
};

/* ---------- small maths ---------- */
const scHash = n => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };
const scEase = u => u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
/* last item at or before t in a list sorted by [0] */
const scAt = (list, t) => {
  let lo = 0, hi = list.length - 1, best = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (list[m][0] <= t) { best = m; lo = m + 1; } else hi = m - 1; }
  return best;
};

/* ---------- compile: precompute what each frame needs to look up ---------- */
const scSpec = c => {
  if (c.make) {
    if (!c._name) { try { c._name = Piixpal.make(c.make); } catch (e) { c._name = null; } }
    const s = c._name && SPRITES[c._name];
    return s && (s.frames || s.canvases) ? s : null;
  }
  return SPRITES[c.pal] || null;
};
const scPos = (p, t) => {
  if (!p.length) return [.5, .84];
  const i = scAt(p, t);
  if (i < 0) return [p[0][1], p[0][2]];
  if (i >= p.length - 1) return [p[i][1], p[i][2]];
  const a = p[i], b = p[i + 1], u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
  return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
};
const scCompile = scene => {
  const ar = scene.ar || 16 / 9, len = Math.max(.5, scene.len || 6);
  const actors = (scene.cast || []).map(c => {
    const tr = (scene.k && scene.k[c.id]) || {};
    const p = (tr.p || []).slice().sort((a, b) => a[0] - b[0]);
    const e = (tr.e || []).slice().sort((a, b) => a[0] - b[0]);
    /* which way it faces: turn toward where it's heading, unless a face event says otherwise */
    const faces = [];
    let f = c.face || 1;
    for (let t = 0; t <= len + 1e-6; t += 1 / 30) {
      const a = scPos(p, t - 1 / 30), b = scPos(p, t + 1 / 30);
      const vx = (b[0] - a[0]) * SC_W * 15;
      if (Math.abs(vx) > 45 && Math.sign(vx) !== f) { f = Math.sign(vx); faces.push([t, f]); }
    }
    for (const ev of e) if (ev[1] === 'face') faces.push([ev[0], ev[2] < 0 ? -1 : 1]);
    faces.sort((a, b) => a[0] - b[0]);
    const vis = e.filter(ev => ev[1] === 'show' || ev[1] === 'hide');
    return { c, p, e, faces, vis, startHidden: !!vis.length && vis[0][1] === 'show' };
  });
  return { scene, ar, len, bg: scene.bg || 'none', ground: scene.ground || .84, actors, fx: (scene.fx || []).slice().sort((a, b) => a[0] - b[0]) };
};

/* ---------- state: where everything is at time t (pure, so scrubbing is free) ---------- */
const scSpeed = (A, t, ar) => {
  const a = scPos(A.p, t - .05), b = scPos(A.p, t + .05);
  return Math.hypot((b[0] - a[0]) * SC_W, (b[1] - a[1]) * SC_W / ar) * 10;
};
const scActorAt = (comp, A, t, pokes) => {
  const spec = scSpec(A.c);
  if (!spec) return null;
  const R = A.roles && A.roles.spec === spec ? A.roles : (A.roles = Object.assign(scRoles(spec), { spec }));
  const [x, y] = scPos(A.p, t);
  const fi = scAt(A.faces, t), face = fi < 0 ? (A.c.face || 1) : A.faces[fi][1];
  /* in and out: a little pop */
  let vis = A.startHidden ? 0 : 1;
  const vi = scAt(A.vis, t);
  if (vi >= 0) {
    const [t0, kind] = A.vis[vi], u = clamp((t - t0) / (kind === 'show' ? .32 : .22), 0, 1);
    vis = kind === 'show' ? (u < .7 ? scEase(u / .7) * 1.14 : 1.14 - .14 * scEase((u - .7) / .3)) : 1 - scEase(u);
  }
  if (vis <= 0) return null;
  const moving = scSpeed(A, t, comp.ar) > 26;
  let clip = moving ? R.move : R.idle, ct = t, oy = 0, sx = 1, sy = 1, say = null, emote = null;
  for (const ev of A.e) {
    const [t0, type] = ev;
    if (t0 > t) break;
    if (type === 'act' && t < t0 + (ev[3] || 1.2) && R.clips.includes(ev[2])) { clip = ev[2]; ct = t - t0; }
    else if (type === 'jump' && t < t0 + .56) {
      const u = (t - t0) / .56, h = (ev[2] || 1) * 46;
      oy = -4 * h * u * (1 - u);
      if (u < .1) { sx = 1.14; sy = .86; } else if (u > .9) { sx = 1.1; sy = .9; } else { sx = .93; sy = 1.08; }
      if (R.air && clip !== ev[2]) { clip = R.air; ct = t - t0; }
    } else if (type === 'say' && t < t0 + (ev[3] || 2)) { say = { text: String(ev[2] || ''), k: (t - t0) * 34, t0 }; emote = null; }
    else if (type === 'emote' && t < t0 + (ev[3] || 1.2)) { emote = { icon: ev[2], t0 }; say = null; }
  }
  /* a pal poked on a playing scene hops and hearts */
  const pk = pokes && pokes[A.c.id];
  if (pk != null && t >= pk && t < pk + .5) { const u = (t - pk) / .5; oy += -4 * 22 * u * (1 - u); if (!say) emote = { icon: 'heart', t0: pk }; }
  /* pals with no walk cycle bob along instead of sliding */
  if (moving && !R.walks && !oy) oy = -Math.abs(Math.sin(t * 13)) * 4;
  const all = baked(spec), frames = all[clip] || all[R.idle];
  const fps = (spec.fps && spec.fps[clip]) || 6;
  const img = frames[Math.floor(Math.max(0, ct) * fps) % frames.length];
  return { A, spec, img, x, y, face, oy, sx, sy, vis, say, emote, hue: A.c.hue || 0, s: A.c.s || spec.scale || 4 };
};
const scState = (comp, t, pokes) => comp.actors.map(A => scActorAt(comp, A, t, pokes)).filter(Boolean).sort((a, b) => a.y - b.y);

/* ---------- backdrops: pixel scenery drawn from code, crisp at any size ---------- */
const scRand = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const scBand = (g, w, y0, y1, a, b) => {
  /* fill y0..y1 with a, dithering into b over the last rows */
  for (let y = y0; y < y1; y++) {
    const k = (y - y0) / Math.max(1, y1 - y0);
    for (let x = 0; x < w; x++) {
      const d = k > .72 && ((x + y) % 2 === 0 || (k > .86 && (x % 2 === 0)));
      g.fillStyle = d ? b : a; g.fillRect(x, y, 1, 1);
    }
  }
};
const scSky = (g, w, gy, cols) => { const n = cols.length - 1, step = gy / n; for (let i = 0; i < n; i++) scBand(g, w, Math.round(i * step), Math.round((i + 1) * step), cols[i], cols[i + 1]); };
const scHills = (g, w, base, amp, col, seed, freq = 1) => {
  g.fillStyle = col;
  for (let x = 0; x < w; x++) {
    const h = base - amp * (.55 + .3 * Math.sin(x / w * 6.3 * freq + seed) + .15 * Math.sin(x / w * 17 * freq + seed * 2));
    g.fillRect(x, Math.round(h), 1, 999);
  }
};
const SC_BACKDROPS = {
  none: null,
  paper(g, w, h, gy) {
    g.fillStyle = '#f3eee3'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ddd4c2'; for (let y = 3; y < gy; y += 7) for (let x = 3; x < w; x += 7) g.fillRect(x, y, 1, 1);
    g.fillStyle = '#17121f'; g.fillRect(0, gy, w, 1);
    g.fillStyle = '#e9e1d0'; g.fillRect(0, gy + 1, w, h);
  },
  void(g, w, h, gy) {
    g.fillStyle = '#0e0c13'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2433'; for (let y = 3; y < h; y += 7) for (let x = 3; x < w; x += 7) g.fillRect(x, y, 1, 1);
    g.fillStyle = '#c6f432'; g.fillRect(0, gy, w, 1);
  },
  meadow(g, w, h, gy, r) {
    scSky(g, w, gy, ['#5ab8ff', '#7cc8ff', '#a6dcff', '#d2efff']);
    g.fillStyle = '#fff3a8'; const sx = Math.round(w * .82), sy = Math.round(gy * .24), R = Math.max(5, Math.round(h * .06));
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (x * x + y * y <= R * R) g.fillRect(sx + x, sy + y, 1, 1);
    scHills(g, w, gy - 2, gy * .3, '#9fd38a', 1.3, .8);
    scHills(g, w, gy, gy * .16, '#6dbb5c', 4.1, 1.4);
    g.fillStyle = '#4fa043'; g.fillRect(0, gy, w, h);
    g.fillStyle = '#3d8636'; g.fillRect(0, gy, w, 1);
    for (let i = 0; i < w / 3; i++) {
      const x = Math.floor(r() * w), y = gy + 2 + Math.floor(r() * (h - gy - 2));
      g.fillStyle = r() < .12 ? pick2(r, ['#ffe16b', '#ff8fb0', '#ffffff']) : '#5cb14f'; g.fillRect(x, y, 1, 1);
      if (r() < .25) { g.fillStyle = '#3d8636'; g.fillRect(x, y - 1, 1, 1); }
    }
  },
  sunset(g, w, h, gy) {
    scSky(g, w, gy, ['#2b1a4f', '#6b2f7a', '#d4467a', '#ff8a5c', '#ffc26b']);
    const cx = Math.round(w * .5), cy = Math.round(gy * .78), R = Math.round(h * .2);
    for (let y = -R; y <= 0; y++) {
      if (y > -R * .45 && ((-y) % 4 === 1 || (-y) % 4 === 2 && y > -R * .2)) continue;
      for (let x = -R; x <= R; x++) if (x * x + y * y <= R * R) { g.fillStyle = y < -R * .5 ? '#fff0a0' : '#ffb56b'; g.fillRect(cx + x, cy + y, 1, 1); }
    }
    scHills(g, w, gy, gy * .14, '#3a1d4a', 2.2, 1.2);
    g.fillStyle = '#24132f'; g.fillRect(0, gy, w, h);
    g.fillStyle = '#ff7aa8'; for (let y = gy + 2, k = 1; y < h; y += k, k++) g.fillRect(0, y, w, 1);
    for (let i = -8; i <= 8; i++) for (let y = gy; y < h; y++) { const x = Math.round(cx + i * (y - gy + 3) * 1.6 * w / 320); if (x >= 0 && x < w) g.fillRect(x, y, 1, 1); }
  },
  night(g, w, h, gy, r) {
    scSky(g, w, gy, ['#070a1f', '#0f1640', '#1d2a66', '#33407a']);
    const mx = Math.round(w * .18), my = Math.round(gy * .22), R = Math.max(5, Math.round(h * .055));
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (x * x + y * y <= R * R && (x - 3) ** 2 + (y + 2) ** 2 > R * R * .8) { g.fillStyle = '#fff6d8'; g.fillRect(mx + x, my + y, 1, 1); }
    let x = 0;
    while (x < w) {
      const bw = 8 + Math.floor(r() * 16), bh = Math.round(gy * (.18 + r() * .32));
      g.fillStyle = r() < .5 ? '#151a3d' : '#1b2150'; g.fillRect(x, gy - bh, bw, bh);
      for (let yy = gy - bh + 3; yy < gy - 2; yy += 4) for (let xx = x + 2; xx < x + bw - 2; xx += 3) if (r() < .32) { g.fillStyle = r() < .8 ? '#ffd76b' : '#7fe0ff'; g.fillRect(xx, yy, 1, 2); }
      x += bw + Math.floor(r() * 3);
    }
    g.fillStyle = '#0c1030'; g.fillRect(0, gy, w, h);
    g.fillStyle = '#2b3570'; g.fillRect(0, gy, w, 1);
  },
  room(g, w, h, gy) {
    g.fillStyle = '#ffe7c2'; g.fillRect(0, 0, w, gy);
    g.fillStyle = '#ffd9a6'; for (let x = 0; x < w; x += 10) g.fillRect(x, 0, 4, gy);
    const wx = Math.round(w * .62), wy = Math.round(gy * .16), ww = Math.round(w * .24), wh = Math.round(gy * .46);
    g.fillStyle = '#7a4a2a'; g.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
    scSkyRect(g, wx, wy, ww, wh);
    g.fillStyle = '#7a4a2a'; g.fillRect(wx + (ww >> 1), wy, 1, wh); g.fillRect(wx, wy + (wh >> 1), ww, 1);
    g.fillStyle = '#c96f3b'; g.fillRect(0, gy - 3, w, 3);
    g.fillStyle = '#b06a3e'; g.fillRect(0, gy, w, h);
    g.fillStyle = '#995a33'; for (let y = gy + 4; y < h; y += 5) g.fillRect(0, y, w, 1);
    for (let y = gy, k = 0; y < h; y += 5, k++) for (let x = (k % 2) * 17; x < w; x += 34) g.fillRect(x, y, 1, 5);
    const rx = Math.round(w * .2), rw = Math.round(w * .3);
    g.fillStyle = '#e2445c'; g.fillRect(rx, gy + 3, rw, Math.max(3, Math.round((h - gy) * .35)));
    g.fillStyle = '#ffd36b'; g.fillRect(rx + 2, gy + 4, rw - 4, 1);
  },
  stage(g, w, h, gy) {
    g.fillStyle = '#1a0f1f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a1830'; for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 2, gy);
    const cw = Math.round(w * .13);
    for (const side of [0, 1]) for (let x = 0; x < cw; x++) {
      const fold = (Math.sin(x / cw * 9.5) + 1) / 2;
      g.fillStyle = fold > .7 ? '#e0324f' : fold > .3 ? '#b5183a' : '#7d0f2a';
      const xx = side ? w - 1 - x : x;
      const sag = Math.round(Math.sin(x / cw * Math.PI * .5) * gy * .1);
      g.fillRect(xx, 0, 1, gy - sag);
    }
    g.fillStyle = '#b5183a'; g.fillRect(0, 0, w, Math.round(h * .07));
    g.fillStyle = '#e0324f'; for (let x = 0; x < w; x += 8) g.fillRect(x, Math.round(h * .07), 4, 2);
    g.fillStyle = '#ffd36b'; g.fillRect(0, Math.round(h * .07) + 2, w, 1);
    g.fillStyle = '#8a5530'; g.fillRect(0, gy, w, h);
    g.fillStyle = '#6e4225'; for (let y = gy + 3; y < h; y += 4) g.fillRect(0, y, w, 1);
    g.fillStyle = '#c98a4b'; g.fillRect(0, gy, w, 1);
  }
};
const pick2 = (r, a) => a[Math.floor(r() * a.length)];
const scSkyRect = (g, x, y, w, h) => { const c = ['#7cc8ff', '#a6dcff', '#d2efff']; for (let i = 0; i < h; i++) { g.fillStyle = c[Math.min(2, Math.floor(i / h * 3))]; g.fillRect(x, y + i, w, 1); } g.fillStyle = '#fff'; g.fillRect(x + 3, y + 4, 6, 2); g.fillRect(x + 5, y + 3, 3, 1); };
/* the moving parts: clouds drift, stars twinkle, the stage light breathes */
const SC_LIVE = {
  meadow: (g, P, w, h, gy, t) => scClouds(g, P, w, gy, t, '#ffffff'),
  sunset: (g, P, w, h, gy, t) => scClouds(g, P, w, gy * .55, t, '#ffb0c8'),
  night(g, P, w, h, gy, t) {
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(scHash(i * 7 + 1) * w), y = Math.floor(scHash(i * 13 + 5) * gy * .7);
      const tw = Math.sin(t * (1.5 + scHash(i) * 3) + i) > .2;
      g.fillStyle = tw ? '#ffffff' : '#7d88c9'; g.fillRect(x * P, y * P, P, P);
    }
  },
  stage(g, P, w, h, gy, t) {
    const a = .1 + .03 * Math.sin(t * 1.7);
    g.fillStyle = `rgba(255,238,170,${a})`;
    g.beginPath(); g.moveTo(w * P * .44, 0); g.lineTo(w * P * .56, 0); g.lineTo(w * P * .74, gy * P + 30 * P); g.lineTo(w * P * .26, gy * P + 30 * P); g.fill();
  }
};
const scClouds = (g, P, w, gy, t, col) => {
  g.fillStyle = col;
  for (let i = 0; i < 4; i++) {
    const cw = 14 + Math.floor(scHash(i + 3) * 16), sp = 2 + scHash(i + 9) * 3;
    const x = ((scHash(i + 1) * (w + cw) + t * sp) % (w + cw * 2)) - cw, y = Math.floor(gy * (.1 + scHash(i + 5) * .3));
    const X = Math.round(x) * P, Y = y * P;
    g.fillRect(X, Y + 2 * P, cw * P, 3 * P);
    g.fillRect(X + 3 * P, Y, (cw - 7) * P, 2 * P);
    g.fillRect(X + 5 * P, Y - P, Math.max(2, cw - 12) * P, P);
  }
};
const scBgCache = new Map();
const scBackdrop = (name, W, H, ground) => {
  const P = Math.max(2, Math.round(W / 320)), w = Math.ceil(W / P), h = Math.ceil(H / P), gy = Math.round(h * ground);
  const key = name + w + 'x' + h + ':' + gy;
  let c = scBgCache.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = w; c.height = h;
    SC_BACKDROPS[name](c.getContext('2d'), w, h, gy, scRand(7));
    if (scBgCache.size > 12) scBgCache.clear();
    scBgCache.set(key, c);
  }
  return { c, P, w, h, gy };
};

/* ---------- drawing ---------- */
const scBox = (g, x, y, w, h, u, fill = '#fffdf5', ink = '#1b1226') => {
  g.fillStyle = ink;
  g.fillRect(x + u, y, w - 2 * u, h); g.fillRect(x, y + u, w, h - 2 * u);
  g.fillStyle = fill;
  g.fillRect(x + u, y + u, w - 2 * u, h - 2 * u);
};
const scWrap = (g, text, max) => {
  const out = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (g.measureText(t).width > max && line) { out.push(line); line = word; } else line = t;
    }
    out.push(line);
  }
  return out;
};
const scBubble = (g, st, X, Y, k, W, font, ox) => {
  const u = Math.max(2, Math.round(3 * k)), pad = Math.round(9 * k);
  const pop = clamp(((st.say || st.emote).t0 != null ? (st._t - (st.say || st.emote).t0) : 1) / .12, 0, 1);
  let w, h, draw;
  if (st.say) {
    const fs = Math.max(10, Math.round(15 * k));
    g.font = `700 ${fs}px ${font}`;
    const lines = scWrap(g, st.say.text, 250 * k), lh = Math.round(fs * 1.3);
    w = Math.ceil(Math.max(...lines.map(l => g.measureText(l).width))) + pad * 2; h = lines.length * lh + pad * 2 - Math.round(fs * .3);
    draw = (bx, by) => {
      g.fillStyle = '#1b1226'; g.textBaseline = 'top';
      let left = Math.floor(st.say.k);
      lines.forEach((l, i) => { if (left <= 0) return; g.fillText(l.slice(0, left), bx + pad, by + pad + i * lh); left -= l.length + 1; });
    };
  } else {
    const ic = ICONS[st.emote.icon] ? (bakeIcon(st.emote.icon), iconCache[st.emote.icon]) : null;
    if (!ic) return;
    const s = Math.max(2, Math.round(3 * k));
    w = ic.width * s + pad * 1.6; h = ic.height * s + pad * 1.6;
    draw = (bx, by) => { g.imageSmoothingEnabled = false; g.drawImage(ic, Math.round(bx + (w - ic.width * s) / 2), Math.round(by + (h - ic.height * s) / 2), ic.width * s, ic.height * s); };
  }
  w = Math.round(w); h = Math.round(h);
  const tail = Math.round(8 * k);
  let bx = Math.round(X - w / 2), by = Math.round(Y - h - tail);
  bx = clamp(bx, ox + 4, ox + W - w - 4);
  g.save();
  const sc = pop < 1 ? .4 + .6 * scEase(pop) : 1;
  if (sc !== 1) { g.translate(X, Y); g.scale(sc, sc); g.translate(-X, -Y); }
  scBox(g, bx, by, w, h, u);
  /* stepped tail, pointing at the speaker */
  const tx = clamp(Math.round(X - u), bx + u * 2, bx + w - u * 4);
  for (let i = 0; i < 3; i++) {
    const tw = (3 - i) * u;
    g.fillStyle = '#1b1226'; g.fillRect(tx - (i ? 0 : 0), by + h - u + i * u, tw + u, u + 1);
    g.fillStyle = '#fffdf5'; if (i < 2) g.fillRect(tx + u, by + h - u + i * u - 1, tw - u, u);
  }
  draw(bx, by);
  g.restore();
};
/* draw the whole scene at time t into a 2d context.
   o: { W, H, dpr, x, y (where the stage sits, css px), backdrop, font, pokes, under(g, list), over(g, list) } */
const scDraw = (g, comp, t, o = {}) => {
  const W = o.W, H = o.H, dpr = o.dpr || 1, X0 = o.x || 0, Y0 = o.y || 0, k = W / SC_W;
  const font = o.font || 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!o.keep) g.clearRect(X0 - 2, Y0 - 2, W + 4, H + 4);
  g.save();
  /* camera shake */
  for (const f of comp.fx) {
    if (f[0] > t) break;
    if (f[1] === 'shake' && t < f[0] + (f[2] || .5)) { const u = (t - f[0]) / (f[2] || .5), a = (f[3] || 1) * 9 * k * (1 - u); g.translate(Math.round((scHash(Math.floor(t * 40)) - .5) * 2 * a), Math.round((scHash(Math.floor(t * 40) + 99) - .5) * 2 * a)); }
  }
  const bgName = o.backdrop === false ? 'none' : comp.bg;
  const bg = SC_BACKDROPS[bgName] ? scBackdrop(bgName, W, H, comp.ground) : null;
  if (bg) {
    g.imageSmoothingEnabled = false;
    g.drawImage(bg.c, X0, Y0, bg.w * bg.P, bg.h * bg.P);
    if (SC_LIVE[bgName]) { g.save(); g.beginPath(); g.rect(X0, Y0, W, H); g.clip(); g.translate(X0, Y0); SC_LIVE[bgName](g, bg.P, bg.w, bg.h, bg.gy, t); g.restore(); }
  }
  const list = scState(comp, t, o.pokes);
  if (o.under) o.under(g, list);
  /* soft contact shadows, when there's a floor */
  if (bg) for (const st of list) {
    /* on the ground below the pal, smaller and fainter the higher it is */
    const lift = Math.max(0, (comp.ground - st.y) * H - st.oy * k) / H;
    if (lift > .45 || st.y > comp.ground + .08) continue;
    const near = 1 - lift / .45, px = Math.max(1, Math.round(st.s * k)), sw = st.spec.w * px * .42 * st.vis * (.5 + .5 * near);
    g.fillStyle = `rgba(10,6,20,${(.22 * near).toFixed(3)})`;
    g.beginPath(); g.ellipse(X0 + st.x * W, Y0 + Math.max(st.y, lift ? comp.ground : st.y) * H - px * .5, sw, Math.max(1.5, px * 1.2 * (.6 + .4 * near)), 0, 0, 6.29); g.fill();
  }
  for (const st of list) {
    const px = Math.max(1, Math.round(st.s * k)), w = st.spec.w * px, h = st.spec.h * px;
    const fx = Math.round((X0 + st.x * W) * dpr) / dpr, fy = Math.round((Y0 + st.y * H + st.oy * k) * dpr) / dpr;
    g.save();
    g.translate(fx, fy);
    g.scale(st.face * st.sx * st.vis, st.sy * st.vis);
    if (st.hue) g.filter = `hue-rotate(${st.hue}deg)`;
    g.imageSmoothingEnabled = !!st.spec.res && st.spec.res > 1;
    g.drawImage(st.img, -w / 2, -h, w, h);
    g.restore();
    st._top = fy - h * st.sy * st.vis; st._w = w; st._h = h; st._x = fx; st._y = fy;
  }
  for (const st of list) if (st.say || st.emote) { st._t = t; scBubble(g, st, st._x, st._top - 2 * k, k, W, font, X0); }
  /* effects over everything */
  for (const f of comp.fx) {
    if (f[0] > t) break;
    const d = f[2] || (f[1] === 'confetti' ? 2.6 : .4), u = (t - f[0]) / d;
    if (u >= 1) continue;
    if (f[1] === 'flash') { g.fillStyle = `rgba(255,255,255,${(1 - u) * .85})`; g.fillRect(X0, Y0, W, H); }
    if (f[1] === 'confetti') {
      const cols = ['#c6f432', '#ff4d6d', '#3fc8ff', '#ffc93f', '#b18cff', '#ffffff'], T = t - f[0];
      for (let i = 0; i < 170; i++) {
        const r1 = scHash(i * 3 + f[0] * 100), r2 = scHash(i * 5 + 7), r3 = scHash(i * 11 + 3);
        const vx = (r1 - .5) * 820, vy = -(420 + r2 * 620);
        const px = W * .5 + (r3 - .5) * W * .5 + vx * T * k * .9, py = H * .62 + (vy * T + 700 * T * T) * k;
        if (py > H + 10) continue;
        const s = Math.max(3, Math.round((5 + r2 * 5) * k)), flip = Math.abs(Math.sin(T * (6 + r1 * 8) + i));
        g.globalAlpha = u > .7 ? (1 - u) / .3 : 1;
        g.fillStyle = cols[i % cols.length];
        g.fillRect(Math.round(X0 + px), Math.round(Y0 + py), s, Math.max(1, Math.round(s * flip)));
      }
      g.globalAlpha = 1;
    }
  }
  if (o.over) o.over(g, list);
  g.restore();
  return list;
};

/* ---------- scene codes: JSON, deflated, base64url, "1." in front ---------- */
const scB64 = {
  enc: bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec: str => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
};
const scPipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
const scEncode = async scene => '1.' + scB64.enc(await scPipe(new TextEncoder().encode(JSON.stringify(scene)), new CompressionStream('deflate-raw')));
const scDecode = async code => {
  code = String(code || '').trim();
  if (code[0] === '{') return JSON.parse(code);
  if (code.startsWith('1.')) return JSON.parse(new TextDecoder().decode(await scPipe(scB64.dec(code.slice(2)), new DecompressionStream('deflate-raw'))));
  throw new Error('not a scene code');
};

/* ---------- <piix-play> ---------- */
class PiixPlayElement extends HTMLElement {
  static get observedAttributes() { return ['scene', 'src', 'over', 'play']; }
  connectedCallback() {
    if (!this._root) {
      this._root = this.attachShadow({ mode: 'open' });
      this._root.innerHTML = '<style>:host{display:block;position:relative;width:100%;-webkit-tap-highlight-color:transparent}:host([over]){display:none}canvas{display:block;width:100%;height:100%;image-rendering:pixelated}</style>';
      this._cv = document.createElement('canvas');
      this._root.appendChild(this._cv);
      this._cv.addEventListener('pointerdown', e => this._poke(e));
    }
    this._t = 0; this._on = false; this._pokes = {};
    this._load();
  }
  disconnectedCallback() { this._halt(); this._unwire(); if (this._ov) { this._ov.remove(); this._ov = null; } }
  attributeChangedCallback(n, a, b) { if (a !== b && this._root && this.isConnected) { this._halt(); this._unwire(); this._load(); } }
  async _load() {
    const id = this._lid = (this._lid || 0) + 1;
    let scene = null;
    try {
      if (this.getAttribute('scene')) scene = await scDecode(this.getAttribute('scene'));
      else if (this.getAttribute('src')) scene = await (await fetch(this.getAttribute('src'))).json();
      else { const js = this.querySelector('script[type="application/json"]'); if (js) scene = JSON.parse(js.textContent); }
    } catch (e) { console.warn('[piixpal] that scene could not be read', this, e); }
    if (id !== this._lid || !scene) return;
    this.scene = scene;
    this._comp = scCompile(scene);
    this.style.aspectRatio = this.hasAttribute('over') ? '' : String(this._comp.ar);
    if (!this.hasAttribute('over')) {
      if (!this._ro) { this._ro = new ResizeObserver(() => this._paint()); this._ro.observe(this); }
      this._paint();
    }
    this._wire();
  }
  get duration() { return this._comp ? this._comp.len : 0; }
  get currentTime() { return this._t; }
  /* where to draw: our own box, or the viewport over the target */
  _frame() {
    const over = this.getAttribute('over');
    if (!over) {
      const r = this.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      const W = Math.round(r.width) || 1, H = Math.round(W / this._comp.ar);
      if (this._cv.width !== Math.round(W * dpr) || this._cv.height !== Math.round(H * dpr)) { this._cv.width = Math.round(W * dpr); this._cv.height = Math.round(H * dpr); }
      return { cv: this._cv, W, H, x: 0, y: 0, dpr };
    }
    const el = document.querySelector(over);
    if (!el) return null;
    if (!this._ov) {
      this._ov = document.createElement('canvas');
      this._ov.setAttribute('aria-hidden', 'true');
      this._ov.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147482100';
      document.body.appendChild(this._ov);
    }
    const dpr = Math.min(2, devicePixelRatio || 1), vw = innerWidth, vh = innerHeight;
    if (this._ov.width !== Math.round(vw * dpr) || this._ov.height !== Math.round(vh * dpr)) { this._ov.width = Math.round(vw * dpr); this._ov.height = Math.round(vh * dpr); }
    const r = el.getBoundingClientRect();
    /* the scene keeps its shape: fit it to the element's width, sitting on the element's bottom edge */
    const W = r.width, H = W / this._comp.ar;
    return { cv: this._ov, W, H, x: r.left, y: r.bottom - H, dpr, clearAll: true };
  }
  _font() { return getComputedStyle(this).getPropertyValue('--piix-play-font').trim() || undefined; }
  _paint() {
    if (!this._comp) return;
    const f = this._frame();
    if (!f) return;
    const g = f.cv.getContext('2d');
    if (f.clearAll) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, f.cv.width, f.cv.height); }
    scDraw(g, this._comp, this._t, { W: f.W, H: f.H, x: f.x, y: f.y, dpr: f.dpr, font: this._font(), pokes: this._pokes, backdrop: !this.hasAttribute('over'), keep: f.clearAll });
    /* not started yet and waiting for a click: say so */
    if (!this._on && this._t === 0 && !this.hasAttribute('over') && (this._mode() === 'click' || reduced())) this._badge(g, f);
  }
  _badge(g, f) {
    const s = Math.max(28, Math.round(f.W * .07)), x = f.W / 2, y = f.H / 2;
    g.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
    scBox(g, Math.round(x - s / 2), Math.round(y - s / 2), s, s, Math.max(2, Math.round(s / 14)), '#c6f432');
    g.fillStyle = '#1b1226'; g.beginPath(); g.moveTo(x - s * .14, y - s * .2); g.lineTo(x + s * .2, y); g.lineTo(x - s * .14, y + s * .2); g.fill();
  }
  _mode() { return this.getAttribute('play') || (this.hasAttribute('over') ? 'load' : 'visible'); }
  _wire() {
    const mode = this._mode(), go = () => this.play(true);
    this._offs = [];
    const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); this._offs.push(() => el.removeEventListener(ev, fn, opt)); };
    /* reduced motion: a box waits for a click; a scene over the page doesn't run at all */
    if (reduced()) { if (!this.hasAttribute('over')) on(this, 'click', () => this._on ? this.pause() : this.play()); return; }
    if (mode === 'load') { if (document.readyState === 'complete') go(); else on(window, 'load', go, { once: true }); }
    else if (mode === 'visible') {
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { if (!this._ended || this.hasAttribute('loop')) this.play(); }
        else if (this._on && this.hasAttribute('loop')) this.pause();
      }), { threshold: .35 });
      io.observe(this.hasAttribute('over') ? document.querySelector(this.getAttribute('over')) || this : this);
      this._offs.push(() => io.disconnect());
    } else if (mode === 'click') on(this, 'click', () => this._on ? this.pause() : this.play(this._ended));
    else if (mode === 'hover') on(this, 'pointerenter', () => this.play(this._ended));
    else if (mode.startsWith('event:')) on(window, mode.slice(6), go);
    else if (mode !== 'none' && mode.includes(':')) {
      const i = mode.lastIndexOf(':'), sel = mode.slice(0, i), ev = mode.slice(i + 1);
      /* delegated, so it works for elements rendered later */
      on(document, ev, e => { if (e.target.closest && e.target.closest(sel)) go(); }, true);
    }
  }
  _unwire() { (this._offs || []).forEach(f => f()); this._offs = []; }
  play(restart) {
    if (!this._comp) return;
    if (restart || this._ended) { this._t = 0; this._ended = false; this._pokes = {}; }
    if (this._on) return;
    this._on = true;
    this._tick = dt => {
      this._t += dt * (+this.getAttribute('speed') || 1);
      if (this._t >= this._comp.len) {
        if (this.hasAttribute('loop')) { this._t %= this._comp.len; this._pokes = {}; }
        else { this._t = this._comp.len; this._paint(); this._end(); return; }
      }
      this._paint();
    };
    sub(this._tick);
    this.dispatchEvent(new CustomEvent('piix:play-start', { bubbles: true }));
  }
  pause() { this._halt(); }
  stop() { this._halt(); this._t = 0; this._ended = false; if (this._ov) { this._ov.remove(); this._ov = null; } else this._paint(); }
  seek(s) { this._t = clamp(+s || 0, 0, this.duration); this._paint(); }
  _halt() { if (this._on) { this._on = false; unsub(this._tick); } }
  _end() {
    this._halt(); this._ended = true;
    const after = this.getAttribute('after') || (this.hasAttribute('over') ? 'hide' : 'hold');
    if (after === 'hide') { if (this._ov) { this._ov.remove(); this._ov = null; } else { const g = this._cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this._cv.width, this._cv.height); } }
    this.dispatchEvent(new CustomEvent('piix:play-end', { bubbles: true }));
  }
  _poke(e) {
    if (!this._comp || !this._on) return;
    const r = this.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const hit = scHit(this._comp, this._t, r.width, r.width / this._comp.ar, x, y);
    if (hit) { this._pokes[hit] = this._t; e.stopPropagation(); }
  }
}
/* which pal is under (x, y) on a W×H stage */
const scHit = (comp, t, W, H, x, y) => {
  const k = W / SC_W, list = scState(comp, t);
  for (let i = list.length - 1; i >= 0; i--) {
    const st = list[i], px = Math.max(1, Math.round(st.s * k)), w = st.spec.w * px, h = st.spec.h * px;
    const cx = st.x * W, by = st.y * H + st.oy * k;
    if (x > cx - w / 2 - 4 && x < cx + w / 2 + 4 && y > by - h - 4 && y < by + 4) return st.A.c.id;
  }
  return null;
};
define('piix-play', PiixPlayElement);
ELEMENTS.play = 'piix-play';
Piixpal.stage = { compile: scCompile, state: scState, draw: scDraw, hit: scHit, encode: scEncode, decode: scDecode, roles: scRoles, pos: scPos, backdrops: Object.keys(SC_BACKDROPS), W: SC_W };
