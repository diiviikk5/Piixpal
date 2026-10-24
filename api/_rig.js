// generated from src/rig.js by scripts/build.mjs, edit that instead
/* ---------- the Pal Maker's smooth pals: anything you draw, any image, any emoji ----------
 * A body (brush strokes, filled shapes, a picture, an emoji, or all of them) gets a vector rig:
 * eyes that blink and look about, a mouth with moods, arms with mitts, legs that walk, wings
 * that flap, a hat, a sticker outline. Every frame is an SVG string, so the browser rasterises
 * it into a crisp sprite and the server can put the very same frames in a README banner.
 *
 * The code: byte 2, then deflate-raw of [meta length u16][meta JSON][strokes][image bytes].
 * Art lives in a 256 x 256 box; b = the body's bounds inside it, measured by the editor. */
const RIG = (() => {
  /* every list is append only: indices are stored in codes */
  const EYES = ['none', 'dot', 'round', 'anime', 'googly', 'shades', 'sleepy', 'cyclops'];
  const MOUTHS = ['none', 'smile', 'grin', 'cat', 'o', 'fang', 'tongue', 'flat'];
  const LEGS = ['none', 'sticks', 'chubby', 'boots', 'bug', 'tentacles'];
  const ARMS = ['none', 'sticks', 'noodle', 'chubby'];
  const WINGS = ['none', 'feather', 'bat', 'fairy'];
  const HATS = ['none', 'party', 'crown', 'tophat', 'beanie', 'cap', 'halo', 'horns', 'bow', 'flower', 'antenna', 'headphones', 'sprout', 'wizard'];
  const OUTLINES = ['none', 'sticker', 'ink', 'glow'];
  const DOES = ['crawl', 'bounce', 'climb', 'follow', 'perch', 'hang', 'creep', 'drop', 'lounge', 'slide', 'toss', 'float'];

  /* ---------- the code ---------- */
  const b64 = bytes => {
    let s = '';
    for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    const t = typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
    return t.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const unb64 = str => {
    const t = String(str).replace(/-/g, '+').replace(/_/g, '/');
    const s = typeof atob === 'function' ? atob(t + '==='.slice((t.length + 3) % 4)) : Buffer.from(t, 'base64').toString('binary');
    return Uint8Array.from(s, c => c.charCodeAt(0));
  };
  const stream = async (bytes, Kind, fmt) => {
    const out = await new Response(new Blob([bytes]).stream().pipeThrough(new Kind(fmt))).arrayBuffer();
    return new Uint8Array(out);
  };
  /* deflate in the browser with CompressionStream, on the server with zlib */
  const zip = async bytes => typeof CompressionStream === 'function' ? stream(bytes, CompressionStream, 'deflate-raw') : new Uint8Array(require('zlib').deflateRawSync(bytes, { level: 9 }));
  const unzip = async bytes => typeof require === 'function' && typeof window === 'undefined' ? new Uint8Array(require('zlib').inflateRawSync(bytes)) : stream(bytes, DecompressionStream, 'deflate-raw');

  const encode = async m => {
    const meta = {
      n: m.name, c: m.colors, e: m.emoji || undefined, b: m.bounds.map(Math.round),
      ey: [m.eyes.style, m.eyes.x, m.eyes.y, m.eyes.r, m.eyes.gap].map(Math.round), mo: [m.mouth.style, m.mouth.x, m.mouth.y, m.mouth.w].map(Math.round),
      ch: m.cheeks ? 1 : 0, lg: [m.legs, Math.round(m.legLen)], ar: m.arms, wg: m.wings,
      ht: [m.hat.style, m.hat.x, m.hat.y, m.hat.size, m.hat.rot].map(Math.round), ol: m.outline, ik: m.ink, lc: m.limb, px: m.pixel, d: m.does, s: m.size,
      ib: m.image ? m.image.box.map(Math.round) : undefined, it: m.image ? m.image.type : undefined
    };
    const mj = new TextEncoder().encode(JSON.stringify(meta));
    const parts = [new Uint8Array([mj.length >> 8, mj.length & 255]), mj];
    const st = [m.strokes.length >> 8, m.strokes.length & 255];
    for (const s of m.strokes) {
      const n = s.pts.length >> 1;
      st.push((s.c & 15) | (s.fill ? 16 : 0) | (s.erase ? 32 : 0), Math.max(1, Math.min(255, Math.round(s.w))), n >> 8, n & 255);
      for (const v of s.pts) st.push(Math.max(0, Math.min(255, Math.round(v))));
    }
    parts.push(new Uint8Array(st));
    if (m.image) parts.push(m.image.bytes);
    const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) { all.set(p, o); o += p.length; }
    const z = await zip(all), out = new Uint8Array(z.length + 1);
    out[0] = 2; out.set(z, 1);
    return b64(out);
  };

  const decode = async code => {
    const raw = unb64(code);
    if (raw[0] !== 2) throw new Error('not a smooth pal code');
    const b = await unzip(raw.subarray(1));
    const ml = (b[0] << 8) | b[1];
    const meta = JSON.parse(new TextDecoder().decode(b.subarray(2, 2 + ml)));
    let i = 2 + ml;
    const ns = (b[i] << 8) | b[i + 1]; i += 2;
    const strokes = [];
    for (let k = 0; k < ns && i < b.length; k++) {
      const f = b[i], w = b[i + 1], n = (b[i + 2] << 8) | b[i + 3]; i += 4;
      strokes.push({ c: f & 15, fill: !!(f & 16), erase: !!(f & 32), w, pts: Array.from(b.subarray(i, i + n * 2)) });
      i += n * 2;
    }
    const img = i < b.length ? b.subarray(i) : null;
    const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
    const ey = meta.ey || [], mo = meta.mo || [], ht = meta.ht || [], lg = meta.lg || [];
    return {
      v: 2, name: String(meta.n || 'pal').slice(0, 24), colors: (meta.c || ['#c6f432']).slice(0, 16).map(String), emoji: meta.e ? String(meta.e).slice(0, 8) : '',
      bounds: (meta.b || [48, 48, 208, 208]).map(v => num(v, 128)), strokes,
      eyes: { style: num(ey[0], 2), x: num(ey[1], 110), y: num(ey[2], 110), r: num(ey[3], 14), gap: num(ey[4], 40) },
      mouth: { style: num(mo[0], 1), x: num(mo[1], 130), y: num(mo[2], 150), w: num(mo[3], 22) },
      cheeks: !!meta.ch, legs: num(lg[0], 1), legLen: num(lg[1], 34), arms: num(meta.ar, 1), wings: num(meta.wg, 0),
      hat: { style: num(ht[0], 0), x: num(ht[1], 128), y: num(ht[2], 50), size: num(ht[3], 70), rot: num(ht[4], 0) },
      outline: num(meta.ol, 1), ink: String(meta.ik || '#1b1226'), limb: String(meta.lc || meta.ik || '#1b1226'), pixel: num(meta.px, 0),
      does: DOES.includes(meta.d) ? meta.d : 'crawl', size: Math.max(32, Math.min(240, num(meta.s, 96))),
      image: img && img.length ? { bytes: img, box: (meta.ib || [0, 0, 256, 256]).map(v => num(v, 0)), type: meta.it === 'png' ? 'png' : 'webp' } : null
    };
  };

  /* ---------- drawing it: one frame is one SVG ---------- */
  const f = n => Math.round(n * 10) / 10;
  const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  /* a smooth path through stroke points (midpoint quadratics) */
  const pathOf = (pts, close) => {
    const n = pts.length >> 1;
    if (n === 1) return `M${pts[0]} ${pts[1]}l.01 0`;
    let d = `M${pts[0]} ${pts[1]}`;
    for (let k = 1; k < n - 1; k++) {
      const x = pts[k * 2], y = pts[k * 2 + 1], nx = pts[k * 2 + 2], ny = pts[k * 2 + 3];
      d += `Q${x} ${y} ${f((x + nx) / 2)} ${f((y + ny) / 2)}`;
    }
    d += `L${pts[n * 2 - 2]} ${pts[n * 2 - 1]}`;
    return close ? d + 'Z' : d;
  };
  const b64img = m => {
    if (!m.image) return '';
    if (!m._img) m._img = `data:image/${m.image.type};base64,` + b64(m.image.bytes).replace(/-/g, '+').replace(/_/g, '/');
    return m._img;
  };
  /* the body: picture, emoji, then strokes; erase strokes cut through all of it */
  const bodySVG = (m, uid) => {
    let s = '';
    if (m.image) { const [x, y, w, h] = m.image.box; s += `<image href="${b64img(m)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`; }
    if (m.emoji) s += `<text x="128" y="136" font-size="210" text-anchor="middle" dominant-baseline="middle" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${esc(m.emoji)}</text>`;
    const erase = m.strokes.filter(t => t.erase);
    for (const t of m.strokes) {
      if (t.erase) continue;
      const c = m.colors[t.c] || m.colors[0], d = pathOf(t.pts, t.fill);
      s += t.fill ? `<path d="${d}" fill="${c}" stroke="${c}" stroke-width="${t.w}" stroke-linejoin="round"/>` : `<path d="${d}" fill="none" stroke="${c}" stroke-width="${t.w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    if (!erase.length) return s;
    return `<mask id="e${uid}" maskUnits="userSpaceOnUse" x="-64" y="-64" width="384" height="384"><rect x="-64" y="-64" width="384" height="384" fill="#fff"/>${erase.map(t => `<path d="${pathOf(t.pts)}" fill="none" stroke="#000" stroke-width="${t.w}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</mask><g mask="url(#e${uid})">${s}</g>`;
  };

  /* geometry shared by every frame */
  const geo = m => {
    const [x0, y0, x1, y1] = m.bounds, bw = Math.max(8, x1 - x0), bh = Math.max(8, y1 - y0), cx = (x0 + x1) / 2;
    const L = m.legs ? Math.max(8, m.legLen) : 0, A = Math.max(14, Math.min(54, bh * .32));
    const side = Math.max(m.arms ? A + 12 : 0, m.wings ? bw * .42 + 16 : 0, 14);
    let top = y0 - 22;
    if (m.hat.style) top = Math.min(top, m.hat.y - m.hat.size * (HATS[m.hat.style] === 'tophat' || HATS[m.hat.style] === 'wizard' ? 1.25 : 1) - 18);
    if (m.wings) top = Math.min(top, y0 - bw * .2 - 16);
    const half = Math.max(bw / 2 + side, Math.abs(m.hat.x - cx) + m.hat.size * .7) + 8;
    const box = [f(cx - half), f(top), f(half * 2), f(y1 + L + 3 - top)];
    return { x0, y0, x1, y1, bw, bh, cx, L, A, box, foot: y1 + L };
  };

  /* eyes, in a mood; look: -1..1 sideways, t: frame phase for googly pupils */
  const eyesSVG = (m, mood, look, t) => {
    const st = EYES[m.eyes.style], { x, y, r, gap } = m.eyes, ink = m.ink;
    if (st === 'none') return '';
    const pts = st === 'cyclops' ? [[x + gap / 2, y]] : [[x, y], [x + gap, y]];
    const sw = f(Math.max(1.6, r * .2));
    const lid = (ex, ey, up) => `<path d="M${f(ex - r * .8)} ${f(ey)}Q${f(ex)} ${f(ey + (up ? -r * .9 : r * .7))} ${f(ex + r * .8)} ${f(ey)}" fill="none" stroke="${ink}" stroke-width="${f(Math.max(2, r * .28))}" stroke-linecap="round"/>`;
    if (st === 'shades' && mood !== 'dizzy') {
      const a = pts[0], z = pts[pts.length - 1], h = r * 1.25;
      return `<path d="M${f(a[0] - r * 1.3)} ${f(y - h / 2)}H${f(z[0] + r * 1.3)}V${f(y)}Q${f(z[0] + r * 1.2)} ${f(y + h * .9)} ${f(z[0])} ${f(y + h * .7)}Q${f((a[0] + z[0]) / 2 + r * .3)} ${f(y + h * .6)} ${f((a[0] + z[0]) / 2)} ${f(y + h * .1)}Q${f((a[0] + z[0]) / 2 - r * .3)} ${f(y + h * .6)} ${f(a[0])} ${f(y + h * .7)}Q${f(a[0] - r * 1.2)} ${f(y + h * .9)} ${f(a[0] - r * 1.3)} ${f(y)}Z" fill="${ink}"/>`
        + `<path d="M${f(a[0] - r * .6)} ${f(y - h * .2)}l${f(r * .5)} 0M${f(z[0] - r * .6)} ${f(y - h * .2)}l${f(r * .5)} 0" stroke="#fff" stroke-opacity=".7" stroke-width="${f(r * .18)}" stroke-linecap="round"/>`;
    }
    return pts.map(([ex, ey], i) => {
      if (mood === 'shut' || (st === 'sleepy' && mood !== 'happy' && mood !== 'wide' && mood !== 'dizzy')) return lid(ex, ey, false);
      if (mood === 'happy') return lid(ex, ey + r * .3, true);
      if (mood === 'dizzy') return `<path d="M${f(ex)} ${f(ey)}m${f(-r * .2)} 0a${f(r * .2)} ${f(r * .2)} 0 1 1 ${f(r * .4)} 0a${f(r * .45)} ${f(r * .45)} 0 1 1 ${f(-r * .9)} 0a${f(r * .7)} ${f(r * .7)} 0 1 1 ${f(r * 1.4)} 0" fill="none" stroke="${ink}" stroke-width="${f(r * .16)}" stroke-linecap="round"/>`;
      const big = mood === 'wide' ? 1.2 : 1, pr = mood === 'wide' ? .32 : .55;
      if (st === 'dot') return `<ellipse cx="${f(ex + look * r * .15)}" cy="${f(ey)}" rx="${f(r * .5 * big)}" ry="${f(r * .7 * big)}" fill="${ink}"/><circle cx="${f(ex + look * r * .15 + r * .15)}" cy="${f(ey - r * .3)}" r="${f(r * .14)}" fill="#fff"/>`;
      if (st === 'anime') return `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="${f(r * .72 * big)}" ry="${f(r * 1.05 * big)}" fill="${ink}"/><ellipse cx="${f(ex + r * .22 + look * r * .1)}" cy="${f(ey - r * .38)}" rx="${f(r * .26)}" ry="${f(r * .32)}" fill="#fff"/><circle cx="${f(ex - r * .25)}" cy="${f(ey + r * .4)}" r="${f(r * .12)}" fill="#fff"/>`;
      if (st === 'googly') {
        /* the pupil rolls about with each frame, and hangs at the bottom */
        const a = Math.PI / 2 + Math.sin(t * 2.3 + i * 1.7) * 1.1 + look * .6, R = r * 1.1;
        return `<circle cx="${f(ex)}" cy="${f(ey)}" r="${f(R * big)}" fill="#fff" stroke="${ink}" stroke-width="${sw}"/><circle cx="${f(ex + Math.cos(a) * R * .45)}" cy="${f(ey + Math.sin(a) * R * .45)}" r="${f(R * pr)}" fill="${ink}"/>`;
      }
      /* round (and sleepy when awake, and cyclops) */
      const rr = st === 'cyclops' ? r * 1.4 : r;
      return `<circle cx="${f(ex)}" cy="${f(ey)}" r="${f(rr * big)}" fill="#fff" stroke="${ink}" stroke-width="${sw}"/><circle cx="${f(ex + look * rr * .35)}" cy="${f(ey + rr * .05)}" r="${f(rr * pr)}" fill="${ink}"/><circle cx="${f(ex + look * rr * .35 + rr * .2)}" cy="${f(ey - rr * .2)}" r="${f(rr * .16)}" fill="#fff"/>`;
    }).join('');
  };

  const mouthSVG = (m, mood) => {
    let st = MOUTHS[m.mouth.style];
    if (st === 'none') return '';
    if (mood === 'happy') st = 'grin';
    else if (mood === 'wide') st = 'o';
    else if (mood === 'shut' && st !== 'flat') st = 'smallo';
    else if (mood === 'dizzy') st = 'wavy';
    const { x, y } = m.mouth, w = m.mouth.w, ink = m.ink, sw = f(Math.max(2, w * .13));
    const smile = `<path d="M${f(x - w / 2)} ${f(y)}Q${f(x)} ${f(y + w * .55)} ${f(x + w / 2)} ${f(y)}" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"/>`;
    if (st === 'smile') return smile;
    if (st === 'grin') return `<path d="M${f(x - w / 2)} ${f(y)}Q${f(x)} ${f(y + w * .95)} ${f(x + w / 2)} ${f(y)}Z" fill="#3b0d1e" stroke="${ink}" stroke-width="${f(sw * .7)}" stroke-linejoin="round"/><ellipse cx="${f(x)}" cy="${f(y + w * .32)}" rx="${f(w * .22)}" ry="${f(w * .12)}" fill="#ff6f8e"/>`;
    if (st === 'cat') return `<path d="M${f(x - w / 2)} ${f(y)}q${f(w / 4)} ${f(w * .4)} ${f(w / 2)} 0q${f(w / 4)} ${f(w * .4)} ${f(w / 2)} 0" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (st === 'o') return `<ellipse cx="${f(x)}" cy="${f(y + w * .15)}" rx="${f(w * .2)}" ry="${f(w * .26)}" fill="#3b0d1e" stroke="${ink}" stroke-width="${f(sw * .6)}"/>`;
    if (st === 'smallo') return `<ellipse cx="${f(x)}" cy="${f(y + w * .1)}" rx="${f(w * .1)}" ry="${f(w * .12)}" fill="${ink}"/>`;
    if (st === 'wavy') return `<path d="M${f(x - w / 2)} ${f(y)}q${f(w / 6)} ${f(-w * .2)} ${f(w / 3)} 0t${f(w / 3)} 0t${f(w / 3)} 0" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"/>`;
    if (st === 'fang') return smile + `<path d="M${f(x + w * .12)} ${f(y + w * .22)}l${f(w * .12)} ${f(w * .3)}l${f(w * .1)} ${f(-w * .32)}Z" fill="#fff" stroke="${ink}" stroke-width="${f(sw * .4)}" stroke-linejoin="round"/>`;
    if (st === 'tongue') return `<path d="M${f(x)} ${f(y + w * .22)}q${f(w * .02)} ${f(w * .45)} ${f(w * .2)} ${f(w * .3)}q${f(w * .06)} ${f(-w * .2)} ${f(-w * .02)} ${f(-w * .36)}Z" fill="#ff6f8e" stroke="${ink}" stroke-width="${f(sw * .5)}"/>` + smile;
    return `<path d="M${f(x - w * .4)} ${f(y + w * .1)}H${f(x + w * .4)}" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"/>`;
  };

  const cheeksSVG = m => {
    if (!m.cheeks || !m.eyes.style) return '';
    const { x, y, r, gap } = m.eyes;
    return `<ellipse cx="${f(x - r * .55)}" cy="${f(y + r * 1.45)}" rx="${f(r * .7)}" ry="${f(r * .42)}" fill="#ff7aa2" opacity=".55"/><ellipse cx="${f(x + gap + r * .55)}" cy="${f(y + r * 1.45)}" rx="${f(r * .7)}" ry="${f(r * .42)}" fill="#ff7aa2" opacity=".55"/>`;
  };

  /* legs from two hips, each at an angle (radians, + = forward) */
  const legsSVG = (m, g, a1, a2, t) => {
    const st = LEGS[m.legs];
    if (st === 'none') return '';
    const { x0, bw, y1, L } = g, ink = m.ink, lc = m.limb;
    const hips = [[x0 + bw * .34, y1 - 6], [x0 + bw * .66, y1 - 6]];
    if (st === 'bug') {
      return [.2, .4, .6, .8].map((p, i) => {
        const hx = x0 + bw * p, a = (i % 2 ? a1 : a2) * .8, kx = hx + Math.sin(a) * L * .5 - 6, ky = y1 + L * .35, ex = hx + Math.sin(a) * L + 4, ey = y1 + L;
        return `<path d="M${f(hx)} ${f(y1 - 6)}L${f(kx)} ${f(ky)}L${f(ex)} ${f(ey)}" fill="none" stroke="${lc}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      }).join('');
    }
    if (st === 'tentacles') {
      return [.2, .4, .6, .8].map((p, i) => {
        const hx = x0 + bw * p, w = Math.sin(t * 2 + i * 1.6) * 8;
        return `<path d="M${f(hx)} ${f(y1 - 8)}q${f(w)} ${f(L * .5)} ${f(-w * .5)} ${f(L * .75)}t${f(w * .8)} ${f(L * .25 + 6)}" fill="none" stroke="${lc}" stroke-width="${f(Math.max(6, bw * .07))}" stroke-linecap="round"/>`;
      }).join('');
    }
    return hips.map(([hx, hy], i) => {
      const a = i ? a2 : a1, ex = hx + Math.sin(a) * (L + 6), ey = hy + Math.cos(a) * (L + 6);
      const thick = st === 'chubby' ? Math.max(10, bw * .13) : 5.5;
      let s = st === 'chubby'
        ? `<path d="M${f(hx)} ${f(hy)}L${f(ex)} ${f(ey - thick * .3)}" stroke="${ink}" stroke-width="${f(thick + 5)}" stroke-linecap="round"/><path d="M${f(hx)} ${f(hy)}L${f(ex)} ${f(ey - thick * .3)}" stroke="${lc}" stroke-width="${f(thick)}" stroke-linecap="round"/>`
        : `<path d="M${f(hx)} ${f(hy)}L${f(ex)} ${f(ey - 3)}" stroke="${lc}" stroke-width="${thick}" stroke-linecap="round"/>`;
      if (st === 'boots') s += `<path d="M${f(ex - 7)} ${f(ey - 9)}h11q${f(9)} 0 ${f(9)} 9H${f(ex - 7)}Z" fill="#ff5d73" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>`;
      else if (st === 'sticks') s += `<ellipse cx="${f(ex + 3)}" cy="${f(ey - 2.5)}" rx="7.5" ry="4" fill="${lc}"/>`;
      return s;
    }).join('');
  };

  /* arms from the shoulders: pose name and a swing */
  const armsSVG = (m, g, pose, swing, front) => {
    const st = ARMS[m.arms];
    if (st === 'none') return '';
    const { x0, x1, y0, bh, A } = g, ink = m.ink, lc = m.limb, sy = y0 + bh * .56;
    const sh = [[x0 + 5, sy, -1], [x1 - 5, sy, 1]];
    const ang = { down: [.35, .35], up: [2.6, 2.6], out: [1.5, 1.5], wave: [.35, 2.5 + swing * .5], cover: null }[pose] || [.35, .35];
    return sh.map(([x, y, side], i) => {
      let ex, ey, cx, cy;
      if (pose === 'cover') {
        /* hands over the eyes */
        const e = m.eyes, tx = i ? e.x + (EYES[e.style] === 'cyclops' ? e.gap / 2 : e.gap) : e.x;
        ex = tx; ey = e.y + 2; cx = x + side * A * .5; cy = y + A * .2;
        if (!front) return '';
      } else {
        if (front) return '';
        const a = ang[i] + (pose === 'down' ? (i ? swing : -swing) * .5 : 0);
        ex = x + side * Math.sin(a) * A; ey = y + Math.cos(a) * A;
        cx = st === 'noodle' ? (x + ex) / 2 + side * 10 : (x + ex) / 2; cy = st === 'noodle' ? (y + ey) / 2 - 8 : (y + ey) / 2;
      }
      const thick = st === 'chubby' ? 10 : 4.5;
      const line = st === 'chubby'
        ? `<path d="M${f(x)} ${f(y)}Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)}" fill="none" stroke="${ink}" stroke-width="${thick + 4.5}" stroke-linecap="round"/><path d="M${f(x)} ${f(y)}Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)}" fill="none" stroke="${lc}" stroke-width="${thick}" stroke-linecap="round"/>`
        : `<path d="M${f(x)} ${f(y)}Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)}" fill="none" stroke="${lc}" stroke-width="${thick}" stroke-linecap="round"/>`;
      /* a round white mitt, the old cartoon way */
      return line + (st === 'chubby' ? '' : `<circle cx="${f(ex)}" cy="${f(ey)}" r="6.5" fill="#fff" stroke="${ink}" stroke-width="2.5"/>`);
    }).join('');
  };

  const wingsSVG = (m, g, up) => {
    const st = WINGS[m.wings];
    if (st === 'none') return '';
    const { x0, x1, y0, bw, bh } = g, ink = m.ink, wy = y0 + bh * .3, W = bw * .42 + 10, H = W * .55;
    const one = (x, side) => {
      const r = (up ? -38 : 12) * side;
      let s;
      if (st === 'bat') s = `<path d="M0 0C${f(W * .3)} ${f(-H)} ${f(W * .8)} ${f(-H * 1.1)} ${f(W)} ${f(-H * .5)}C${f(W * .8)} ${f(-H * .1)} ${f(W * .7)} ${f(H * .1)} ${f(W * .55)} ${f(H * .25)}C${f(W * .45)} 0 ${f(W * .35)} 0 ${f(W * .25)} ${f(H * .3)}C${f(W * .15)} ${f(H * .05)} ${f(W * .05)} ${f(H * .1)} 0 ${f(H * .2)}Z" fill="#3a2a55" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
      else if (st === 'fairy') s = `<ellipse cx="${f(W * .5)}" cy="${f(-H * .45)}" rx="${f(W * .55)}" ry="${f(H * .5)}" fill="#aee4ff" fill-opacity=".6" stroke="#6cc3f5" stroke-width="2.5"/><ellipse cx="${f(W * .35)}" cy="${f(H * .35)}" rx="${f(W * .35)}" ry="${f(H * .32)}" fill="#ffc6ec" fill-opacity=".6" stroke="#f59ad6" stroke-width="2.5"/>`;
      else s = `<path d="M0 0C${f(W * .2)} ${f(-H * 1.1)} ${f(W * 1.05)} ${f(-H * 1.1)} ${f(W)} ${f(-H * .2)}C${f(W * .85)} ${f(H * .25)} ${f(W * .55)} ${f(H * .35)} 0 ${f(H * .3)}Z" fill="#fff" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M${f(W * .35)} ${f(-H * .1)}l${f(W * .4)} ${f(-H * .15)}M${f(W * .3)} ${f(H * .12)}l${f(W * .45)} ${f(-H * .05)}" stroke="${ink}" stroke-width="2" stroke-linecap="round" opacity=".5"/>`;
      return `<g transform="translate(${f(x)} ${f(wy)}) scale(${side} 1) rotate(${r * side})">${s}</g>`;
    };
    return one(x0 + bw * .2, -1) + one(x1 - bw * .2, 1);
  };

  const hatSVG = (m, t) => {
    const st = HATS[m.hat.style];
    if (st === 'none') return '';
    const { x, y, size: S, rot } = m.hat, ink = m.ink, sw = f(Math.max(2, S * .04));
    let s = '';
    if (st === 'party') s = `<path d="M${f(-S * .32)} 0L0 ${f(-S * .95)}L${f(S * .32)} 0Z" fill="#ff5d9e" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/><path d="M${f(-S * .22)} ${f(-S * .3)}L${f(S * .25)} ${f(-S * .22)}M${f(-S * .12)} ${f(-S * .6)}L${f(S * .14)} ${f(-S * .55)}" stroke="#ffe66d" stroke-width="${f(S * .07)}" stroke-linecap="round"/><circle cx="0" cy="${f(-S * .97)}" r="${f(S * .1)}" fill="#ffe66d" stroke="${ink}" stroke-width="${sw}"/>`;
    else if (st === 'crown') s = `<path d="M${f(-S * .45)} 0V${f(-S * .5)}L${f(-S * .22)} ${f(-S * .25)}L0 ${f(-S * .6)}L${f(S * .22)} ${f(-S * .25)}L${f(S * .45)} ${f(-S * .5)}V0Z" fill="#ffd23f" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/><circle cx="0" cy="${f(-S * .16)}" r="${f(S * .07)}" fill="#ff5d73"/><circle cx="${f(-S * .27)}" cy="${f(-S * .13)}" r="${f(S * .05)}" fill="#4cc9f0"/><circle cx="${f(S * .27)}" cy="${f(-S * .13)}" r="${f(S * .05)}" fill="#4cc9f0"/>`;
    else if (st === 'tophat') s = `<rect x="${f(-S * .55)}" y="${f(-S * .1)}" width="${f(S * 1.1)}" height="${f(S * .12)}" rx="${f(S * .05)}" fill="#1b1226" stroke="${ink}" stroke-width="${sw}"/><rect x="${f(-S * .34)}" y="${f(-S * 1.0)}" width="${f(S * .68)}" height="${f(S * .92)}" rx="${f(S * .04)}" fill="#1b1226" stroke="${ink}" stroke-width="${sw}"/><rect x="${f(-S * .34)}" y="${f(-S * .3)}" width="${f(S * .68)}" height="${f(S * .14)}" fill="#ff5d73"/>`;
    else if (st === 'beanie') s = `<path d="M${f(-S * .5)} 0Q${f(-S * .5)} ${f(-S * .75)} 0 ${f(-S * .75)}Q${f(S * .5)} ${f(-S * .75)} ${f(S * .5)} 0Z" fill="#4cc9f0" stroke="${ink}" stroke-width="${sw}"/><rect x="${f(-S * .54)}" y="${f(-S * .16)}" width="${f(S * 1.08)}" height="${f(S * .22)}" rx="${f(S * .08)}" fill="#3a86ff" stroke="${ink}" stroke-width="${sw}"/><circle cx="0" cy="${f(-S * .8)}" r="${f(S * .14)}" fill="#fff" stroke="${ink}" stroke-width="${sw}"/>`;
    else if (st === 'cap') s = `<path d="M${f(-S * .45)} 0Q${f(-S * .45)} ${f(-S * .6)} 0 ${f(-S * .6)}Q${f(S * .45)} ${f(-S * .6)} ${f(S * .45)} 0Z" fill="#ff5d73" stroke="${ink}" stroke-width="${sw}"/><path d="M${f(S * .3)} ${f(-S * .04)}Q${f(S * .75)} ${f(-S * .1)} ${f(S * .85)} ${f(S * .06)}L${f(S * .3)} ${f(S * .06)}Z" fill="#c9184a" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/><circle cx="0" cy="${f(-S * .6)}" r="${f(S * .06)}" fill="#c9184a"/>`;
    else if (st === 'halo') s = `<ellipse cx="0" cy="${f(-S * .35 - Math.sin(t * 2) * 3)}" rx="${f(S * .45)}" ry="${f(S * .13)}" fill="none" stroke="#ffd23f" stroke-width="${f(S * .09)}"/>`;
    else if (st === 'horns') s = `<path d="M${f(-S * .4)} 0Q${f(-S * .55)} ${f(-S * .45)} ${f(-S * .3)} ${f(-S * .6)}Q${f(-S * .32)} ${f(-S * .25)} ${f(-S * .15)} 0Z" fill="#ff5d3a" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/><path d="M${f(S * .4)} 0Q${f(S * .55)} ${f(-S * .45)} ${f(S * .3)} ${f(-S * .6)}Q${f(S * .32)} ${f(-S * .25)} ${f(S * .15)} 0Z" fill="#ff5d3a" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    else if (st === 'bow') s = `<path d="M0 ${f(-S * .2)}L${f(-S * .4)} ${f(-S * .45)}V${f(S * .05)}Z M0 ${f(-S * .2)}L${f(S * .4)} ${f(-S * .45)}V${f(S * .05)}Z" fill="#ff7aa8" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/><circle cx="0" cy="${f(-S * .2)}" r="${f(S * .1)}" fill="#ff4f8b" stroke="${ink}" stroke-width="${sw}"/>`;
    else if (st === 'flower') s = `<path d="M0 0V${f(-S * .3)}" stroke="#3fa34d" stroke-width="${f(S * .06)}"/>` + [0, 72, 144, 216, 288].map(a => `<circle cx="${f(Math.cos(a * Math.PI / 180) * S * .16)}" cy="${f(-S * .45 + Math.sin(a * Math.PI / 180) * S * .16)}" r="${f(S * .13)}" fill="#fff" stroke="${ink}" stroke-width="${f(sw * .7)}"/>`).join('') + `<circle cx="0" cy="${f(-S * .45)}" r="${f(S * .1)}" fill="#ffd23f" stroke="${ink}" stroke-width="${f(sw * .7)}"/>`;
    else if (st === 'antenna') { const w = Math.sin(t * 2.5) * S * .12; s = `<path d="M0 0Q${f(w * .3)} ${f(-S * .35)} ${f(w)} ${f(-S * .65)}" fill="none" stroke="${ink}" stroke-width="${f(sw * 1.2)}" stroke-linecap="round"/><circle cx="${f(w)}" cy="${f(-S * .7)}" r="${f(S * .12)}" fill="#ff5d73" stroke="${ink}" stroke-width="${sw}"/>`; }
    else if (st === 'headphones') s = `<path d="M${f(-S * .5)} ${f(S * .1)}Q${f(-S * .5)} ${f(-S * .6)} 0 ${f(-S * .6)}Q${f(S * .5)} ${f(-S * .6)} ${f(S * .5)} ${f(S * .1)}" fill="none" stroke="${ink}" stroke-width="${f(S * .08)}"/><rect x="${f(-S * .62)}" y="${f(-S * .05)}" width="${f(S * .22)}" height="${f(S * .32)}" rx="${f(S * .08)}" fill="#6b4cff" stroke="${ink}" stroke-width="${sw}"/><rect x="${f(S * .4)}" y="${f(-S * .05)}" width="${f(S * .22)}" height="${f(S * .32)}" rx="${f(S * .08)}" fill="#6b4cff" stroke="${ink}" stroke-width="${sw}"/>`;
    else if (st === 'sprout') { const w = Math.sin(t * 2) * 4; s = `<path d="M0 0Q${f(w)} ${f(-S * .3)} 0 ${f(-S * .45)}" fill="none" stroke="#3fa34d" stroke-width="${f(S * .06)}" stroke-linecap="round"/><path d="M0 ${f(-S * .42)}Q${f(-S * .35 + w)} ${f(-S * .7)} ${f(-S * .4 + w)} ${f(-S * .4)}Q${f(-S * .15)} ${f(-S * .3)} 0 ${f(-S * .42)}Z M0 ${f(-S * .42)}Q${f(S * .35 + w)} ${f(-S * .75)} ${f(S * .42 + w)} ${f(-S * .5)}Q${f(S * .2)} ${f(-S * .3)} 0 ${f(-S * .42)}Z" fill="#7bd36b" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>`; }
    else if (st === 'wizard') s = `<path d="M${f(-S * .55)} 0Q0 ${f(-S * .12)} ${f(S * .55)} 0Q0 ${f(S * .12)} ${f(-S * .55)} 0Z" fill="#5a3fd6" stroke="${ink}" stroke-width="${sw}"/><path d="M${f(-S * .35)} ${f(-S * .02)}L${f(S * .05)} ${f(-S * 1.05)}Q${f(S * .2)} ${f(-S * .9)} ${f(S * .28)} ${f(-S * .75)}L${f(S * .35)} ${f(-S * .02)}Z" fill="#6b4cff" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/><path d="M${f(-S * .05)} ${f(-S * .45)}l${f(S * .04)} ${f(S * .08)}l${f(S * .09)} ${f(S * .01)}l${f(-S * .07)} ${f(S * .06)}l${f(S * .02)} ${f(S * .09)}l${f(-S * .08)} ${f(-S * .05)}l${f(-S * .08)} ${f(S * .05)}l${f(S * .02)} ${f(-S * .09)}l${f(-S * .07)} ${f(-S * .06)}l${f(S * .09)} ${f(-S * .01)}Z" fill="#ffd23f"/>`;
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">${s}</g>`;
  };

  const filterSVG = (m, uid) => {
    const st = OUTLINES[m.outline];
    if (st === 'none') return '';
    const r = st === 'sticker' ? 5 : st === 'glow' ? 4 : 3, c = st === 'sticker' ? '#ffffff' : st === 'glow' ? '#c6f432' : m.ink;
    const shadow = st === 'sticker' ? `<feGaussianBlur in="o" stdDeviation="2.5" result="bl"/><feOffset in="bl" dy="3" result="sh"/><feComponentTransfer in="sh" result="sh2"><feFuncA type="linear" slope=".35"/></feComponentTransfer>` : '';
    const blur = st === 'glow' ? `<feGaussianBlur in="o" stdDeviation="4" result="o"/>` : '';
    return `<filter id="o${uid}" x="-30%" y="-30%" width="160%" height="160%"><feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="d"/><feFlood flood-color="${c}"/><feComposite in2="d" operator="in" result="o"/>${blur}${shadow}<feMerge>${shadow ? '<feMergeNode in="sh2"/>' : ''}<feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  };

  /* just the body, in its 256 box: the editor measures its bounds from this */
  const bodySheet = m => `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${bodySVG(m, 'b')}</svg>`;

  let uidN = 0;
  /* one frame */
  const frameSVG = (m, p = {}, opt = {}) => {
    const g = m._g || (m._g = geo(m));
    const { mood = 'open', look = 1, legA = [0, 0], arms = 'down', swing = 0, bob = 0, sq = 0, tilt = 0, up = false, t = 0, flip = false } = p;
    const uid = (opt.uid || 'p') + (uidN++ % 1e6);
    const [bx, by, bw, bh] = opt.box || g.box;
    /* the body squashes round its feet; everything bobs and tilts round the ground point */
    const body = `<g transform="translate(${f(g.cx)} ${f(g.y1)}) scale(${f(1 + sq * .6)} ${f(1 - sq)}) translate(${f(-g.cx)} ${f(-g.y1)})">${bodySVG(m, uid)}${cheeksSVG(m)}${eyesSVG(m, mood, look, t)}${mouthSVG(m, mood)}</g>`;
    const ch = wingsSVG(m, g, up) + legsSVG(m, g, legA[0], legA[1], t) + body + armsSVG(m, g, arms, swing, false) + armsSVG(m, g, arms, swing, true) + hatSVG(m, t);
    const flt = filterSVG(m, uid);
    let inner = `<g transform="translate(0 ${f(-bob)}) rotate(${f(tilt)} ${f(g.cx)} ${f(g.foot)})"${flt ? ` filter="url(#o${uid})"` : ''}>${ch}</g>`;
    if (flip) inner = `<g transform="rotate(180 ${f(bx + bw / 2)} ${f(by + bh / 2)})">${inner}</g>`;
    if (opt.inner) return (flt ? `<defs>${flt}</defs>` : '') + inner;
    const W = opt.w || bw, H = opt.h || bh;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(W)}" height="${f(H)}" viewBox="${bx} ${by} ${bw} ${bh}">${flt ? `<defs>${flt}</defs>` : ''}${inner}</svg>`;
  };

  /* every clip the behaviours ask for, as poses */
  const poses = m => {
    const walk = [0, 1, 2, 3].map(k => {
      const a = Math.sin(k * Math.PI / 2) * .45;
      return { legA: [a, -a], swing: a, bob: k % 2 ? 3 : 0, tilt: Math.sin(k * Math.PI / 2) * 3, t: k };
    });
    const fly = [0, 1].map(k => ({ up: !k, legA: [.3, -.1], arms: 'out', bob: k ? 0 : 4, t: k }));
    const happy = [0, 1].map(k => ({ mood: 'happy', arms: 'up', bob: k ? 6 : 0, sq: k ? -.06 : .04, legA: [k ? -.3 : 0, k ? .3 : 0], t: k }));
    const scared = [0, 1].map(k => ({ mood: 'wide', arms: 'up', tilt: k ? 3 : -3, t: k * 3 }));
    const air = { mood: 'wide', arms: 'out', legA: [-.5, .5], up: true, sq: -.08 };
    const stand = { t: 0 }, blink = { mood: 'shut' }, back = { look: -1, t: 1 };
    const out = {
      idle: [stand, { sq: .025, t: 1 }, stand, blink], walk, run: walk, wiggle: walk, swim: fly,
      look: [stand, back, back, stand], peek: [stand], blink: [blink], hide: [{ mood: 'shut', arms: 'cover', sq: .08 }],
      hop: [air], jump: [air], rise: [air], air: [air], fall: [{ ...air, arms: 'up' }], up: [air],
      land: [{ sq: .14, legA: [-.3, .3] }], landed: [stand], sit: [stand], rest: [{ mood: 'shut', sq: .05 }], perch: [stand], hold: [stand],
      held: [{ mood: 'wide', arms: 'up', legA: [-.25, .3], t: 2 }, { mood: 'wide', arms: 'up', legA: [.3, -.25], t: 4 }],
      fly, happy, cheer: happy, purr: happy, wag: happy,
      wave: [0, 1].map(k => ({ mood: 'happy', arms: 'wave', swing: k ? 1 : -1, t: k })),
      scared, nervous: scared, alarm: scared, shy: [{ mood: 'shut', arms: 'cover' }], cover: [{ mood: 'shut', arms: 'cover' }],
      dizzy: [0, 1, 2].map(k => ({ mood: 'dizzy', tilt: [-6, 0, 6][k], t: k * 2 })), pop: [{ mood: 'dizzy', arms: 'out' }],
      flip: [0, 1].map(k => ({ mood: 'shut', legA: [k ? .5 : -.5, k ? -.5 : .5], arms: 'out', flip: true, t: k })),
      sleep: [{ mood: 'shut', sq: .04 }, { mood: 'shut', sq: .07, t: 1 }],
      peck: [stand, { tilt: 12 }], swat: [{ arms: 'wave', swing: 1, tilt: 6 }, stand], snap: [{ mood: 'wide', tilt: 10 }], click: [{ tilt: 8 }],
      slide: [{ mood: 'happy', tilt: 70, legA: [.4, .4], arms: 'out' }], roll: [{ mood: 'dizzy', arms: 'out' }]
    };
    const fps = { idle: 2.5, walk: 8, run: 12, wiggle: 8, look: 2, fly: 9, swim: 5, happy: 5, cheer: 6, wave: 5, purr: 4, wag: 6, scared: 14, nervous: 10, alarm: 14, dizzy: 6, flip: 8, sleep: 1.2, held: 6, peck: 4, swat: 6 };
    return { clips: out, fps };
  };

  /* register a code as a real sprite: rasterise every frame (async) and hand over canvases */
  const cache = {}, busy = {};
  const raster = (svg, W, H, res, blocks) => new Promise(ok => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(W * res); c.height = Math.round(H * res);
      const g = c.getContext('2d');
      if (blocks > 0) {
        /* the pixel look: draw it small, then blow it up without smoothing */
        const sw = Math.max(4, Math.round(W * 3 / blocks)), sh = Math.max(4, Math.round(H * 3 / blocks)), t = document.createElement('canvas');
        t.width = sw; t.height = sh;
        t.getContext('2d').drawImage(img, 0, 0, sw, sh);
        g.imageSmoothingEnabled = false;
        g.drawImage(t, 0, 0, c.width, c.height);
      } else g.drawImage(img, 0, 0, c.width, c.height);
      ok(c);
    };
    img.onerror = () => ok(document.createElement('canvas'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const nameOf = code => { let h = 5381; for (let i = 0; i < code.length; i++) h = (h * 33 + code.charCodeAt(i)) >>> 0; return 'mk-' + h.toString(36); };
  const register = code => {
    code = String(code || '').trim();
    /* a short id (from a share link): fetch its code, register that, and answer to this name too */
    if (code.length < 16) {
      const name = 'mk-id-' + code.replace(/\W/g, '');
      if (!busy[name]) busy[name] = fetch('https://piixpal.dvkk.dev/api/pal?id=' + encodeURIComponent(code)).then(r => (r.ok ? r.text() : Promise.reject(new Error('no pal ' + code)))).then(real => {
        real = real.trim();
        const alias = () => { if (SPRITES[target]) SPRITES[name] = SPRITES[target]; else setTimeout(alias, 60); };
        const target = smooth(real) ? register(real) : MAKER.register(real);
        alias();
      }).catch(e => console.warn('[piixpal]', e.message));
      return name;
    }
    const name = nameOf(code);
    if (cache[name]) return name;
    if (!busy[name]) busy[name] = (async () => {
      const m = await decode(code), g = geo(m), { clips, fps } = poses(m);
      /* logical units: the pal is m.size px tall at scale 3 */
      const S = 3, k = m.size / g.box[3], W = Math.max(4, Math.round(g.box[2] * k / S)), H = Math.max(4, Math.round(g.box[3] * k / S));
      const res = Math.min(4, S * (window.devicePixelRatio || 1));
      const seen = new Map(), canvases = {};
      for (const [clip, list] of Object.entries(clips)) {
        canvases[clip] = await Promise.all(list.map(p => {
          const svg = frameSVG(m, p, { w: W * res, h: H * res, uid: 'r' });
          const key = JSON.stringify(p);
          if (!seen.has(key)) seen.set(key, raster(svg, W, H, res, m.pixel));
          return seen.get(key);
        }));
      }
      defineSprite(name, { w: W, h: H, scale: S, res, does: m.does, palette: {}, frames: clips, canvases, fps });
      SPRITES[name].label = m.name;
      cache[name] = true;
    })().catch(e => { console.warn('[piixpal] that make= code is broken', e); busy[name] = 'broken'; });
    return name;
  };
  const ready = name => !!cache[name];
  /* a smooth pal's code starts with byte 2: its second base64 letter is g..v (a pixel pal's, byte 1, is Q..f) */
  const smooth = code => /^A[g-v]/.test(String(code));

  return { EYES, MOUTHS, LEGS, ARMS, WINGS, HATS, OUTLINES, DOES, encode, decode, geo, frameSVG, poses, register, ready, smooth, nameOf, pathOf, bodySheet, raster };
})();

module.exports = RIG;
