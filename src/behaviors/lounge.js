/* lounge: lies on an element swishing its tail. Swats at the cursor when it comes close,
 * dozes off when ignored, purrs when poked. */
defineBehavior('lounge', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .2;
  const cache = {};
  let state = 'rest', timer = 0, calm = 0;
  const spot = () => {
    const tp = host.getAttribute('edge') !== 'box' && textProfile(el, cache);
    if (tp) {
      const x = tp.l + a.w / 2 + Math.max(0, tp.r - tp.l - a.w) * at, half = a.w * .35;
      const under = tp.segs.filter(g => g.r > x - half && g.l < x + half);
      return { x, y: under.length ? Math.min(...under.map(g => g.t)) : tp.t };
    }
    const r = rectOf(el); return { x: r.l + a.w / 2 + (r.w - a.w) * at, y: r.t };
  };
  return {
    tick(dt) {
      const s = spot();
      a.x = s.x; a.y = s.y;
      if (reduced()) { a.play('rest'); return; }
      const d = ptr.seen ? ptrDist(a.x, a.y - a.h / 2) : 1e9;
      calm = d < 160 * S ? 0 : calm + dt;
      timer -= dt;
      if (state === 'sleep') {
        a.play('sleep');
        if (d < 50 * S) { state = 'rest'; a.hush(); a.say('!', 600); }
        return;
      }
      if (state === 'purr') { a.play('purr'); if (timer <= 0) state = 'rest'; return; }
      if (d < 75 * S) {
        /* face the cursor and swat */
        a.face = ptr.x < a.x ? 1 : -1;
        a.play('swat');
        if (chance(dt * 1.2)) a.say(pick(['!', 'grr']), 400);
      } else {
        a.play('rest');
        if (calm > 9) { state = 'sleep'; a.say('zz', 0); }
      }
    },
    poke() {
      a.hush();
      state = 'purr'; timer = 2; a.say('heart', 1200);
    }
  };
});
