// generated from src/maker.js by scripts/build.mjs, edit that instead
/* ---------- the Pal Maker's pals: one drawing, packed into a code, animated by rule ----------
 * Somebody draws a pal (a pixel grid, facing right) and picks its eyes, mouth, legs, wings and
 * what it does. All of that packs into a short code that travels in a link:
 *
 *   <piix-pal make="AQwM…"></piix-pal>          Piixpal.make('AQwM…')  ->  'mk-1x9z'
 *
 * From that one drawing this works out every clip the behaviours ask for: walking legs, blinks,
 * hops, flaps, a dizzy spin, sleep, a happy face, a scared one. Pure functions apart from
 * register(), so the server (api/_maker.js, written by the build) draws the very same pal. */
const MAKER = (() => {
  /* what a made pal can do; append only, the index is stored in codes */
  const DOES = ['crawl', 'bounce', 'climb', 'follow', 'perch', 'hang', 'creep', 'drop', 'lounge', 'slide', 'toss', 'float'];
  const EYES = ['none', 'dot', 'tall', 'round', 'big', 'shine', 'line'];
  const MOUTHS = ['none', 'dot', 'smile', 'cat', 'open', 'fang'];
  const LEGS = ['none', 'stubs', 'long', 'bug', 'feet'];
  const WINGS = ['none', 'small', 'bat'];

  /* ---------- the code: bytes in base64url ---------- */
  const b64 = bytes => {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    const t = typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
    return t.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const unb64 = str => {
    const t = String(str).replace(/-/g, '+').replace(/_/g, '/');
    const s = typeof atob === 'function' ? atob(t + '==='.slice((t.length + 3) % 4)) : Buffer.from(t, 'base64').toString('binary');
    return Uint8Array.from(s, c => c.charCodeAt(0));
  };
  const rgb = h => { const n = parseInt(String(h).replace('#', '').padEnd(6, '0').slice(0, 6), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const hex = (r, g, b) => '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  const clampI = (v, a, b) => Math.min(b, Math.max(a, v | 0));

  /* a fresh pal: a little lime blob, so the maker never opens on nothing */
  const blank = () => {
    const w = 14, h = 12, px = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x + .5 - 7) / 6.6, dy = (y + .5 - 7) / 5.6;
      if (dx * dx + dy * dy <= 1 && y >= 1) px[y * w + x] = y < 4 && x < 8 ? 2 : (x > 10 || y > 9) ? 3 : 1;
    }
    return {
      name: 'blob', w, h, colors: ['#c6f432', '#efffc0', '#7fa61c'], ink: '#1b1226', px,
      outline: true, cheeks: true, eyes: { style: 3, x: 7, y: 4, gap: 4 }, mouth: { style: 2, x: 8, y: 8 },
      legs: 1, wings: 0, does: 'crawl', scale: 4
    };
  };

  const encode = m => {
    const out = [1, m.w, m.h, m.colors.length];
    for (const c of m.colors) out.push(...rgb(c));
    out.push(...rgb(m.ink), (m.outline ? 1 : 0) | (m.cheeks ? 2 : 0));
    out.push(m.eyes.style, m.eyes.x, m.eyes.y, m.eyes.gap, m.mouth.style, m.mouth.x, m.mouth.y);
    out.push(m.legs, m.wings, Math.max(0, DOES.indexOf(m.does)), m.scale);
    const name = [...String(m.name || '').slice(0, 16)].map(c => c.charCodeAt(0) & 127);
    out.push(name.length, ...name);
    /* pixels as runs: one byte each, how many (1-16) and which colour (0 is empty) */
    const n = m.w * m.h;
    for (let i = 0; i < n;) {
      let j = i;
      while (j + 1 < n && j - i < 15 && m.px[j + 1] === m.px[i]) j++;
      out.push(((j - i) << 4) | (m.px[i] & 15));
      i = j + 1;
    }
    return b64(out);
  };

  const decode = code => {
    const b = unb64(code);
    let i = 0;
    const u = () => b[i++] || 0;
    if (u() !== 1) throw new Error('not a pal code');
    const w = clampI(u(), 4, 32), h = clampI(u(), 4, 32), nc = clampI(u(), 1, 15), colors = [];
    for (let k = 0; k < nc; k++) colors.push(hex(u(), u(), u()));
    const ink = hex(u(), u(), u()), flags = u();
    const eyes = { style: u() % EYES.length, x: u(), y: u(), gap: u() };
    const mouth = { style: u() % MOUTHS.length, x: u(), y: u() };
    const legs = u() % LEGS.length, wings = u() % WINGS.length, does = DOES[u()] || 'crawl', scale = clampI(u(), 1, 8);
    const nl = u();
    let name = '';
    for (let k = 0; k < nl; k++) name += String.fromCharCode(u());
    const px = new Uint8Array(w * h);
    for (let p = 0; p < w * h && i < b.length;) {
      const r = u(), len = (r >> 4) + 1, c = r & 15;
      for (let k = 0; k < len && p < w * h; k++) px[p++] = c <= nc ? c : 0;
    }
    return { name: name.replace(/[^\w .!?'-]/g, '') || 'pal', w, h, colors, ink, px, outline: !!(flags & 1), cheeks: !!(flags & 2), eyes, mouth, legs, wings, does, scale };
  };

  /* ---------- drawing it ---------- */
  /* user colours are A..O; system keys: k ink, w eye white, m mouth, c cheek, v wing */
  const KEYS = 'ABCDEFGHIJKLMNO';
  const put = (rows, x, y, patch) => {
    patch.forEach((p, j) => {
      const ry = y + j;
      if (ry < 0 || ry >= rows.length) return;
      const r = rows[ry].split('');
      for (let q = 0; q < p.length; q++) if (p[q] !== '_' && x + q >= 0 && x + q < r.length) r[x + q] = p[q];
      rows[ry] = r.join('');
    });
    return rows;
  };
  const mirror = patch => patch.map(r => [...r].reverse().join(''));
  /* one eye in each mood; '_' keeps whatever is drawn underneath */
  const eye = (style, mood) => {
    const S = {
      dot: { open: ['k'], wide: ['k'] },
      tall: { open: ['k', 'k'], wide: ['k', 'k'] },
      round: { open: ['wk', 'wk'], back: ['kw', 'kw'], wide: ['ww', 'wk'] },
      big: { open: ['www', 'wkk', 'wkk'], back: ['www', 'kkw', 'kkw'], wide: ['www', 'wkw', 'www'] },
      shine: { open: ['wk', 'kk'], back: ['kw', 'kk'], wide: ['wk', 'kk'] },
      line: { open: ['kk'], wide: ['k_', 'k_'] }
    }[style];
    if (!S) return null;
    const ew = S.open[0].length, eh = S.open.length;
    const low = Array.from({ length: eh }, (_, j) => (j === eh - 1 ? 'k' : '_').repeat(ew));
    if (mood === 'open') return S.open;
    if (mood === 'back') return S.back || S.open;
    if (mood === 'wide') return S.wide;
    if (mood === 'shut') return low;
    if (mood === 'happy') return ew >= 3 ? ['_k_', 'k_k', '___'].slice(0, Math.max(2, eh)) : ew === 2 ? (eh >= 2 ? ['kk', '__'] : ['kk']) : (eh >= 2 ? ['k', '_'] : ['k']);
    if (mood === 'dizzy') return ew >= 3 ? ['k_k', '_k_', 'k_k'] : ew === 2 ? (eh >= 2 ? ['k_', '_k'] : ['k_']) : S.open;
    return S.open;
  };
  const mouthPatch = (style, mood) => {
    if (!style) return null;
    if (mood === 'open') return ['kk', 'mm'];
    return { dot: ['k'], smile: ['k_k', '_k_'], cat: ['_k_k_', 'k_k_k'], open: ['kk', 'mm'], fang: ['kkk', '_w_'] }[MOUTHS[style]];
  };

  /* the body: grid -> rows of keys */
  const body = m => Array.from({ length: m.h }, (_, y) => Array.from({ length: m.w }, (_, x) => { const c = m.px[y * m.w + x]; return c ? KEYS[c - 1] : '.'; }).join(''));
  /* how far down the drawing goes, and where its bottom row is */
  const bounds = m => {
    let L = m.w, R = -1, B = -1, T = m.h;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.px[y * m.w + x]) { L = Math.min(L, x); R = Math.max(R, x); B = Math.max(B, y); T = Math.min(T, y); }
    if (R < 0) return { L: 0, R: m.w - 1, B: m.h - 1, T: 0, bl: 0, br: m.w - 1 };
    let bl = m.w, br = -1;
    for (let x = 0; x < m.w; x++) if (m.px[B * m.w + x]) { bl = Math.min(bl, x); br = Math.max(br, x); }
    return { L, R, B, T, bl, br };
  };

  /* a face on the body, in a mood */
  const face = (m, rows, mood) => {
    const st = EYES[m.eyes.style], e = eye(st, mood);
    if (m.cheeks && m.eyes.style) {
      const ew = (eye(st, 'open') || [''])[0].length, eh = (eye(st, 'open') || []).length;
      put(rows, m.eyes.x - 1, m.eyes.y + eh, ['c']);
      put(rows, m.eyes.x + m.eyes.gap + ew, m.eyes.y + eh, ['c']);
    }
    if (e) { put(rows, m.eyes.x, m.eyes.y, e); put(rows, m.eyes.x + m.eyes.gap, m.eyes.y, e); }
    const mp = mouthPatch(m.mouth.style, mood === 'happy' || mood === 'wide' ? 'open' : '');
    if (mp) put(rows, m.mouth.x, m.mouth.y, mp);
    return rows;
  };

  /* legs: rows added below the body, in a pose */
  const legRows = (m, pose) => {
    const kind = LEGS[m.legs];
    if (kind === 'none') return [];
    const { bl, br } = bounds(m), span = br - bl + 1, W = m.w;
    const row = cols => { const r = Array(W).fill('.'); for (const c of cols) if (c >= 0 && c < W) r[c] = 'k'; return r.join(''); };
    const a = bl + Math.max(1, Math.round(span * .25)) - (span < 5 ? 1 : 0), b = br - Math.max(1, Math.round(span * .25)) + (span < 5 ? 1 : 0);
    if (pose === 'tuck') return kind === 'bug' ? [row(range(bl + 1, br - 1, 2))] : [row([a, b])];
    if (kind === 'stubs' || kind === 'long') {
      const n = kind === 'long' ? 3 : 2;
      return Array.from({ length: n }, (_, j) => {
        const lean = j === n - 1 ? 1 : 0;
        if (pose === 'a') return row([a - lean, b + lean]);
        if (pose === 'b') return row([a + lean, b - lean]);
        return row([a, b]);
      });
    }
    if (kind === 'feet') {
      if (pose === 'a') return [row([a, b]), row([a - 1, a, b, b + 1])];
      if (pose === 'b') return [row([a, b]), row([a, a + 1, b - 1, b])];
      return [row([a, b]), row([a - 1, a, b - 1, b])];
    }
    /* bug: three pairs, like the bitbug */
    const at = range(bl + 1, br - 1, Math.max(2, Math.floor(span / 3)));
    if (pose === 'a') return [row(at), row(at.map(x => x - 1))];
    if (pose === 'b') return [row(at), row(at.map(x => x + 1))];
    return [row(at), row(at)];
  };
  const range = (a, b, step) => { const out = []; for (let x = a; x <= b; x += step) out.push(x); return out.length ? out : [a]; };

  /* a frame: the body with a face, legs and wings, then the outline round it all */
  const frame = (m, { mood = 'open', legs = 'stand', up = null, bob = 0, flip = false, nudge = 0 } = {}) => {
    const headroom = WINGS[m.wings] === 'none' ? 0 : 3;
    let rows = body(m);
    face(m, rows, mood);
    rows = Array(headroom).fill('.'.repeat(m.w)).concat(rows);
    if (headroom) {
      /* wings on the back (the left: pals face right), flapping up into the rows above */
      const { L, R, T } = bounds(m), wx = L + Math.round((R - L) * .3);
      const kind = WINGS[m.wings];
      const small = up ? ['.vv', 'vvv', '.v.'] : ['...', 'vvv', '.vv'];
      const bat = up ? ['v...v', 'vv.vv', '.vvv.'] : ['.....', '.vvv.', 'vv.vv'];
      put(rows, wx - 1, T + (up ? 0 : 2), (kind === 'bat' ? bat : small).map(r => r.replace(/\./g, '_')));
    }
    const trim = r => { while (r.length && !/[^.]/.test(r[r.length - 1])) r.pop(); return r; };
    /* the outline goes round the body, face and wings; legs hang below it in ink */
    let pad = 0;
    trim(rows);
    if (m.outline) {
      const W = m.w + 2, H = rows.length + 2, src = rows, at = (x, y) => (src[y - 1] || '')[x - 1] || '.';
      rows = trim(Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => {
        const c = at(x, y);
        if (c !== '.') return c;
        return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const n = at(x + dx, y + dy); return n !== '.' && n !== 'k'; }) ? 'k' : '.';
      }).join('')));
      pad = 1;
    }
    rows = rows.concat(legRows(m, legs).map(r => '.'.repeat(pad) + r + '.'.repeat(pad)));
    if (nudge) rows = rows.map(r => nudge > 0 ? '.' + r.slice(0, -1) : r.slice(1) + '.');
    if (flip) rows = trim(rows.slice().reverse());
    /* a bob lifts the whole frame: frames stand on their bottom row */
    const w = rows[0] ? rows[0].length : m.w;
    if (bob) rows = rows.concat(Array(bob).fill('.'.repeat(w)));
    return rows;
  };

  /* every clip the behaviours might ask for */
  const sprite = m => {
    const legsMove = LEGS[m.legs] !== 'none', winged = WINGS[m.wings] !== 'none';
    const F = o => frame(m, o);
    const stand = F(), blink = F({ mood: 'shut' }), back = F({ mood: 'back' });
    const walk = legsMove ? [F({ legs: 'a' }), F({ legs: 'b', bob: 0 })] : [stand, F({ bob: 1 })];
    const air = F({ mood: 'wide', legs: 'tuck', up: true });
    const fly = winged ? [F({ legs: 'tuck', up: true }), F({ legs: 'tuck', up: false })] : [F({ legs: 'tuck' }), F({ legs: 'tuck', bob: 1 })];
    const happy = [F({ mood: 'happy' }), F({ mood: 'happy', bob: 1 })];
    const scared = [F({ mood: 'wide', nudge: 1 }), F({ mood: 'wide', nudge: -1 })];
    const dizzy = [F({ mood: 'dizzy' }), F({ mood: 'dizzy', nudge: 1 })];
    const sleep = [blink, F({ mood: 'shut', bob: 1 })];
    const frames = {
      idle: [stand, stand, stand, blink], walk, run: walk, wiggle: walk, swim: fly,
      look: [stand, back, back, stand], peek: [stand], blink: [blink], hide: [F({ mood: 'shut', legs: 'tuck' })],
      hop: [air], jump: [air], rise: [air], air: [air], fall: [air], up: [air],
      land: [F({ legs: 'tuck' })], landed: [stand], sit: [stand], rest: [stand], perch: [stand], held: [F({ mood: 'wide', legs: 'a' })], hold: [stand],
      fly, happy, cheer: happy, wave: happy, purr: happy, wag: happy,
      scared, nervous: scared, alarm: scared, shy: [blink], cover: [blink],
      dizzy, pop: dizzy, flip: [F({ mood: 'shut', legs: 'a', flip: true }), F({ mood: 'shut', legs: 'b', flip: true })],
      sleep, peck: [stand, F({ nudge: 1 })], swat: [F({ nudge: 1 }), stand], snap: [F({ mood: 'wide', nudge: 1 })], click: [F({ nudge: 1 })],
      slide: [F({ mood: 'happy', legs: 'tuck' })], roll: [F({ mood: 'dizzy', legs: 'tuck' })]
    };
    const w = Math.max(...Object.values(frames).flat().map(r => Math.max(...r.map(x => x.length)))), h = Math.max(...Object.values(frames).flat().map(r => r.length));
    const palette = { k: m.ink, w: '#ffffff', m: '#ff5d73', c: '#ff9ab8', v: '#eef6ff' };
    m.colors.forEach((c, i) => { palette[KEYS[i]] = c; });
    return {
      w, h, scale: m.scale, does: m.does, palette, frames,
      fps: { idle: 3, walk: 8, run: 12, wiggle: 8, look: 2, fly: 10, swim: 6, happy: 5, cheer: 6, wave: 5, purr: 4, wag: 6, scared: 14, nervous: 10, alarm: 14, dizzy: 6, pop: 8, flip: 10, sleep: 1.4, peck: 4, swat: 6 }
    };
  };

  /* register a code as a real sprite, once; returns its name */
  const seen = {};
  const register = code => {
    code = String(code || '').trim();
    if (seen[code]) return seen[code];
    let hsh = 5381;
    for (let i = 0; i < code.length; i++) hsh = (hsh * 33 + code.charCodeAt(i)) >>> 0;
    const name = 'mk-' + hsh.toString(36);
    const m = decode(code);
    defineSprite(name, sprite(m));
    SPRITES[name].label = m.name;
    return (seen[code] = name);
  };

  return { DOES, EYES, MOUTHS, LEGS, WINGS, KEYS, blank, encode, decode, sprite, frame, bounds, register };
})();

module.exports = MAKER;
