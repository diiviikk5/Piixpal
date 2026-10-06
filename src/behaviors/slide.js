/* slide: waddle a little, flop onto the belly and slide along the element, get up
 * at the far end, turn round and do it again. Poke it and it slips and spins. */
defineBehavior('slide', (a, [el], host) => {
  const S = a.s / 3;
  let frac = rnd(.1, .4), dir = 1, state = 'walk', v = 0, timer = rnd(1, 2.4), spin = 0;
  const cache = {};
  const surf = () => {
    const tp = host.getAttribute('edge') !== 'box' && textProfile(el, cache);
    return tp ? { l: tp.l, r: tp.r, t: tp.t } : (r => ({ l: r.l, r: r.r, t: r.t }))(rectOf(el));
  };
  return {
    tick(dt) {
      const r = surf(), span = Math.max(1, r.r - r.l - a.w);
      a.y = r.t;
      if (!reduced()) {
        timer -= dt;
        if (state === 'walk') {
          a.play('walk'); frac += dir * 16 * S * dt / span;
          if (timer <= 0) { state = 'slide'; v = rnd(170, 240) * S; a.sy = .7; a.sx = 1.3; }
        } else if (state === 'slide') {
          a.play('slide'); frac += dir * v * dt / span; v *= Math.exp(-.9 * dt);
          if (v < 20 * S) { state = 'rest'; timer = .7; a.play('idle'); }
        } else if (state === 'rest' && timer <= 0) { state = 'walk'; timer = rnd(1, 2.4); }
        if (frac >= 1 || frac <= 0) { frac = clamp(frac, 0, 1); dir = -dir; if (state === 'slide') { state = 'rest'; timer = .9; a.play('idle'); a.say(pick(['!', 'note']), 600); } }
        if (spin > 0) { spin -= dt; a.rot = (1 - spin / .7) * 360 * dir; if (spin <= 0) a.rot = 0; }
      }
      a.face = dir;
      a.x = r.l + a.w / 2 + span * frac;
      a.sx = lerp(a.sx, 1, .15); a.sy = lerp(a.sy, 1, .15);
    },
    poke() { spin = .7; a.say('!?', 600); state = 'slide'; v = 120 * S; },
    hear(type) { if (type === 'thud') { state = 'slide'; v = 150 * S; } }
  };
});
