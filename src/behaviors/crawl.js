/* crawl: walk along the top of an element's text, hop over gaps and letter steps,
 * stop to sniff and look around, scurry away from the cursor, flip over when poked.
 *
 * Surface, in order of preference:
 *   1. el.piixSurface(x)         (e.g. <piix-type> exposes the real letter contour)
 *   2. the first line of text    (real glyph tops, unless edge="box")
 *   3. the element's top edge */
/* Per-glyph contour of an element's first line of text: [{l, r, t}] in doc coords.
 * Each glyph's real ink top is measured with canvas metrics, so a pal climbs onto
 * a tall "T", steps down to an "e" and hops across spaces. Cached until layout moves. */
const measureCtx = document.createElement('canvas').getContext('2d');
const glyphTop = (ch, font) => {
  measureCtx.font = font;
  const m = measureCtx.measureText(ch);
  return [m.fontBoundingBoxAscent || 0, m.actualBoundingBoxAscent || 0];
};
const textProfile = (el, cache) => {
  const box = el.getBoundingClientRect();
  const key = [box.left, box.top, box.width, box.height, scrollX, scrollY, document.fonts.status].join();
  if (cache.key === key) return cache.v;
  const segs = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const rg = document.createRange();
  let top = null, n, count = 0;
  outer: while ((n = walk.nextNode())) {
    const p = n.parentElement;
    if (!p || p.closest('piix-pal')) continue;
    const cs = getComputedStyle(p);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const txt = n.data;
    for (let i = 0; i < txt.length && count < 400; i++, count++) {
      rg.setStart(n, i); rg.setEnd(n, i + 1);
      const r = rg.getClientRects()[0];
      if (!r || r.width < .5) continue;
      if (top === null) top = r.top;
      if (r.top - top > r.height * .6) break outer;   /* reached the second line */
      if (/\s/.test(txt[i])) continue;              /* spaces are gaps */
      const [fa, ga] = glyphTop(txt[i], font);
      segs.push({ l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY + (fa - ga) });
    }
  }
  /* glue neighbours into runs so tiny kerning gaps don't count as holes */
  for (let i = 1; i < segs.length; i++) if (segs[i].l - segs[i - 1].r < 2) segs[i - 1].r = segs[i].l;
  const v = segs.length ? { l: segs[0].l, r: segs[segs.length - 1].r, t: Math.min(...segs.map(s => s.t)), segs } : null;
  cache.key = key; cache.v = v;
  return v;
};
const segAt = (segs, x) => { for (const s of segs) if (x >= s.l && x <= s.r) return s.t; return null; };

defineBehavior('crawl', (a, [el], host) => {
  const mode = host.getAttribute('edge') || (typeof el.piixSurface === 'function' ? 'surface' : 'text');
  const S = a.s / 3;                      /* everything scales with the sprite */
  const speed = 30 * S * (+host.getAttribute('speed') || 1);
  const step = 2.5 * a.s;                 /* bigger than this and it hops instead */
  const reach = 34 * a.s;                 /* how far it will hop across a gap */
  let box = null, state = 'walk', timer = rnd(2, 4), hop = null, placed = false;
  const cache = {};

  const lane = () => {
    if (mode === 'surface') { const r = rectOf(el); return { l: r.l, r: r.r, t: r.t }; }
    if (mode === 'text') { const t = textProfile(el, cache); if (t) return t; }
    const r = rectOf(el); return { l: r.l, r: r.r, t: r.t };
  };
  const surf = x => {
    if (x < box.l + a.w * .3 || x > box.r - a.w * .3) return null;
    if (mode === 'surface') return el.piixSurface(x);
    return box.segs ? segAt(box.segs, x) : box.t;
  };
  const go = (st, t, clip, opt) => { state = st; timer = t; if (clip) a.play(clip, opt); };
  const startHop = (x1, y1) => {
    const hgt = Math.max(10 * S, a.y - y1 + 8 * S);
    hop = { x0: a.x, y0: a.y, x1, y1, p: 0, d: clamp(.28 + Math.abs(x1 - a.x) / 500, .28, .6), yc: Math.min(a.y, y1) - hgt * 1.4 };
    a.play('hop');
  };
  /* look ahead for somewhere to land; null if there's nowhere */
  const landing = from => {
    for (let dx = 2; dx < reach; dx += 2) {
      const x = from + a.face * dx, y = surf(x);
      if (y != null && Math.abs(y - a.y) < reach * 1.4) return [x + a.face * a.w * .15, surf(x + a.face * a.w * .15) ?? y];
    }
    return null;
  };
  const turn = () => { a.face = -a.face; };
  const move = v => {
    const nx = a.x + a.face * v * move.dt;
    const ny = surf(nx);
    if (ny != null && Math.abs(ny - a.y) <= step) { a.x = nx; a.y = ny; return; }
    const land = ny != null ? [nx + a.face * a.w * .2, surf(nx + a.face * a.w * .2) ?? ny] : landing(a.x);
    if (land && land[1] != null) startHop(land[0], land[1]);
    else if (state === 'scurry') turn();
    else { turn(); go('look', rnd(.6, 1.2), 'look'); }
  };

  return {
    tick(dt) {
      box = lane();
      if (!placed) {
        const at = host.getAttribute('at');
        a.x = box.l + (box.r - box.l) * (at != null ? clamp(+at, 0, 1) : rnd(.15, .85));
        a.y = surf(a.x) ?? box.t; a.face = chance(.5) ? 1 : -1;
        a.play('walk'); placed = true;
      }
      if (reduced()) { a.y = surf(a.x) ?? box.t; a.play('idle'); return; }
      move.dt = dt;

      /* mid-hop */
      if (hop) {
        hop.p = Math.min(1, hop.p + dt / hop.d);
        const p = hop.p, q = 1 - p;
        a.x = lerp(hop.x0, hop.x1, p);
        a.y = q * q * hop.y0 + 2 * q * p * hop.yc + p * p * hop.y1;
        a.sy = 1.08; a.sx = .94;
        if (p >= 1) { hop = null; a.y = surf(a.x) ?? a.y; a.sy = .8; a.sx = 1.15; a.play(state === 'flip' ? 'flip' : 'walk'); }
        return;
      }
      a.sx = lerp(a.sx, 1, .25); a.sy = lerp(a.sy, 1, .25);

      /* the ground moved under us (resize, reflow, text changed) */
      const g = surf(a.x);
      if (g == null) { a.x = clamp(a.x, box.l + a.w * .3, box.r - a.w * .3); a.y = surf(a.x) ?? box.t; }
      else if (Math.abs(g - a.y) > step) a.y = g;

      /* someone's coming */
      const scared = ptr.seen && ptrDist(a.x, a.y - a.h / 2) < 46 * S + a.w * .5;
      if (scared && (state === 'walk' || state === 'idle' || state === 'look' || state === 'sniff')) {
        go('alarm', .32, 'alarm'); a.say('!', 650);
      }

      timer -= dt;
      switch (state) {
        case 'walk':
          a.play('walk', { fps: 10 });
          move(speed);
          if (timer <= 0) {
            const r = Math.random();
            if (r < .4) go('sniff', rnd(1, 1.8), 'sniff');
            else if (r < .75) go('look', rnd(1.2, 2.2), 'look', { reset: true });
            else go('idle', rnd(1, 2.4), 'idle');
          }
          break;
        case 'alarm':
          if (timer <= 0) { a.face = ptr.x > a.x ? -1 : 1; go('scurry', rnd(.9, 1.4)); }
          break;
        case 'scurry':
          a.play('walk', { fps: 20 });
          move(speed * 3.4);
          if (timer <= 0) go('walk', rnd(2, 4));
          break;
        case 'flip':
          a.play('flip');
          if (timer <= 0) { a.rot = 0; startHop(a.x + a.face * 4 * S, a.y); go('walk', rnd(2, 4)); }
          break;
        default: /* idle, look, sniff */
          if (timer <= 0) { if (state === 'look' && chance(.4)) turn(); go('walk', rnd(3, 7), 'walk'); }
      }
    },
    poke() {
      if (state === 'flip' || hop) return;
      a.hush(); a.say(pick(['!?', 'grr', '!']), 900);
      startHop(a.x, a.y);
      go('flip', rnd(1.4, 2));
      a.play('flip');
    }
  };
});
