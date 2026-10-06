/* mind: minds its own business. Sits on an element and reads, flips pages, dozes off.
 * Hover nearby for a while and it glances up at you. Poke it and it turns its back.
 * Poke it three times and it packs up and hops somewhere quieter. */
defineBehavior('mind', (a, [el], host) => {
  const S = a.s / 3;
  let at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .85;
  let state = 'read', timer = rnd(4, 8), stare = 0, pokes = [], hop = null, readFor = 0;
  const has = c => a.has(c);
  const go = (s, t, clip) => { state = s; timer = t; if (clip && has(clip)) a.play(clip, { reset: true }); };
  const cache = {};
  /* where to sit: on the tallest glyph under it if the element has text, else the top edge */
  const spot = r => {
    if (typeof el.piixSurface === 'function') { const x = r.l + a.w / 2 + (r.w - a.w) * at; return { x, y: el.piixSurface(x) ?? r.t }; }
    const tp = host.getAttribute('edge') !== 'box' && textProfile(el, cache);
    if (tp) {
      const x = tp.l + a.w / 2 + Math.max(0, tp.r - tp.l - a.w) * at, half = a.w * .3;
      const under = tp.segs.filter(g => g.r > x - half && g.l < x + half);
      return { x, y: under.length ? Math.min(...under.map(g => g.t)) : tp.t };
    }
    return { x: r.l + a.w / 2 + (r.w - a.w) * at, y: r.t };
  };

  return {
    tick(dt) {
      const r = rectOf(el);
      if (hop) {
        hop.p = Math.min(1, hop.p + dt / hop.d);
        const p = hop.p, q = 1 - p, s = spot(r);
        a.x = lerp(hop.x0, s.x, p);
        a.y = q * q * hop.y0 + 2 * q * p * (Math.min(hop.y0, s.y) - 50 * S) + p * p * s.y;
        a.sy = 1.1; a.sx = .92;
        if (p >= 1) { hop = null; a.sy = .82; a.sx = 1.15; hop = null; go('back', 1.2, 'back'); }
        return;
      }
      const s = spot(r);
      a.x = s.x; a.y = s.y;
      a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
      if (reduced()) { a.play('read'); return; }

      timer -= dt;
      readFor += dt;
      const close = ptr.seen && ptrDist(a.x, a.y - a.h / 2) < 110 * S;
      stare = close ? stare + dt : Math.max(0, stare - dt * 2);

      switch (state) {
        case 'read':
          a.play('read');
          if (stare > 1.1) { go('look', 1.4, 'look'); a.say('...', 1300); stare = -2; }
          else if (timer <= 0) {
            if (readFor > 18 && chance(.5)) { go('doze', rnd(5, 9), 'doze'); a.say('zz', 0); readFor = 0; }
            else go('flip', .5, 'flip');
          }
          break;
        case 'flip':
          if (timer <= 0) go('read', rnd(4, 9), 'read');
          break;
        case 'doze':
          if (close && stare > .6) { a.hush(); go('look', 1, 'look'); a.say('!', 700); stare = -2; }
          else if (timer <= 0) { a.hush(); go('read', rnd(4, 8), 'read'); }
          break;
        case 'look':
          if (timer <= 0) go('read', rnd(4, 8), 'read');
          break;
        case 'annoyed':
          if (timer <= 0) go('back', rnd(3, 4.5), 'back');
          break;
        case 'back':
          if (timer <= 0) { a.say('...', 900); go('read', rnd(4, 8), 'read'); }
          break;
      }
    },
    hear(type) {
      if (type !== 'thud' || hop || state === 'annoyed' || state === 'back' || now() - (this._heard || 0) < 2500) return;
      this._heard = now();
      a.hush(); a.say(pick(['grr', 'vein', '!?']), 900);
      go('annoyed', .8, 'annoyed');
    },
    poke() {
      if (hop) return;
      const t = now();
      pokes = pokes.filter(p => t - p < 4000).concat(t);
      a.hush();
      if (pokes.length >= 3) {
        /* that's it, moving */
        pokes = [];
        a.say('grr', 900);
        const r = rectOf(el);
        const old = at;
        at = old > .5 ? rnd(.05, .35) : rnd(.65, .95);
        a.face = at > old ? 1 : -1;
        hop = { x0: a.x, y0: a.y, p: 0, d: clamp(Math.abs(at - old) * r.w / 700, .45, .9) };
        a.play('back');
        return;
      }
      a.say(pokes.length === 1 ? '!?' : 'vein', 900);
      go('annoyed', .7, 'annoyed');
    }
  };
});
