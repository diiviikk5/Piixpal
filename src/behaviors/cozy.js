/* cozy: sits on top of an element and is simply content. Blinks, sways to a tune nobody
 * else hears, dozes off when left alone. Bring the cursor close and she blushes and looks
 * at you; poke her and she beams, arms up, and a little heart floats off. Poke while she
 * naps and she wakes with a start. at="0..1" picks where along the top edge she sits. */
defineBehavior('cozy', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .8;
  let state = 'idle', timer = rnd(3, 6), calm = 0, near = 0;
  const go = (s, t, clip) => { state = s; timer = t; a.play(clip || s, { reset: true }); };
  const cache = {};
  /* where to sit: on the letters if the element has text, else its top edge */
  const spot = r => {
    if (typeof el.piixSurface === 'function') { const x = r.l + a.w / 2 + (r.w - a.w) * at; return { x, y: el.piixSurface(x) ?? r.t }; }
    const tp = host.getAttribute('edge') !== 'box' && textProfile(el, cache);
    if (tp) {
      const x = tp.l + a.w / 2 + Math.max(0, tp.r - tp.l - a.w) * at, half = a.w * .3;
      const under = tp.segs.filter(g => g.r > x - half && g.l < x + half);
      return { x, y: under.length ? Math.min(...under.map(g => g.t)) : tp.t };
    }
    return { x: r.l + a.w / 2 + Math.max(0, r.w - a.w) * at, y: r.t };
  };

  return {
    tick(dt) {
      const r = rectOf(el);
      const p = spot(r);
      a.x = p.x; a.y = p.y;
      a.sx = lerp(a.sx, 1, .18); a.sy = lerp(a.sy, 1, .18);
      if (reduced()) { a.play('idle'); return; }

      timer -= dt;
      const close = ptr.seen && ptrDist(a.x, a.y - a.h / 2) < 120 * S;
      near = close ? near + dt : 0;
      calm = close ? 0 : calm + dt;

      switch (state) {
        case 'idle':
          if (near > .5) { a.face = ptr.x < a.x ? -1 : 1; go('blush', 2.2); a.say('heart', 1200); }
          else if (calm > 22) { go('sleep', rnd(8, 14)); a.say('zz', 0); }
          else if (timer <= 0) chance(.55) ? go('sway', rnd(3, 5)) : go('look', 1.4);
          break;
        case 'sway': case 'look':
          if (near > .5) { go('blush', 2.2); a.say('heart', 1200); }
          else if (timer <= 0) go('idle', rnd(3, 7));
          break;
        case 'blush':
          if (timer <= 0) close ? (timer = 1.2) : go('idle', rnd(3, 6));
          break;
        case 'happy':
          if (timer <= 0) go('idle', rnd(3, 6));
          break;
        case 'sleep':
          if (near > 1.2 || timer <= 0) { a.hush(); calm = 0; go('idle', rnd(3, 6), 'look'); setTimeout(() => state === 'idle' && a.play('idle'), 900); }
          break;
      }
    },
    poke() {
      a.hush();
      calm = 0;
      if (state === 'sleep') { a.say('!?', 900); a.sy = 1.2; a.sx = .88; go('happy', 1, 'scared'); return; }
      a.sy = .84; a.sx = 1.14;
      a.say(pick(['heart', 'star', 'note']), 1100);
      go('happy', 1.6);
    }
  };
});
