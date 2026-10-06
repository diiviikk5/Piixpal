/* sweep: a robot vacuum. Glides along the top of an element and back, bumps at the
 * ends, stops and beeps when the cursor blocks the way, spins when poked. */
defineBehavior('sweep', (a, [el], host) => {
  const S = a.s / 4;
  const speed = 46 * S * (+host.getAttribute('speed') || 1);
  let frac = rnd(.2, .8), dir = chance(.5) ? 1 : -1, state = 'go', timer = 0, spin = 0;
  a.cv.style.transformOrigin = '50% 70%';
  return {
    tick(dt) {
      const r = rectOf(el);
      const L = r.l + a.w / 2, R = r.r - a.w / 2, span = Math.max(1, R - L);
      a.x = L + span * frac; a.y = r.t; a.face = dir;
      if (reduced()) return;
      timer -= dt;
      if (spin > 0) { spin -= dt; a.rot = (1 - spin / .8) * 720; if (spin <= 0) a.rot = 0; return; }
      const ahead = ptr.seen && Math.abs(ptr.y - (a.y - a.h / 2)) < 40 * S && (ptr.x - a.x) * dir > 0 && (ptr.x - a.x) * dir < 60 * S;
      if (state === 'go') {
        a.play('go');
        if (ahead) { state = 'beep'; timer = .9; a.play('beep'); a.say('!', 600); }
        frac += dir * speed * dt / span;
        if (frac <= 0 || frac >= 1) { frac = clamp(frac, 0, 1); dir = -dir; a.sx = .8; a.sy = 1.15; a.say(chance(.3) ? '!' : null, 400); }
      } else if (state === 'beep' && timer <= 0) {
        if (ahead) dir = -dir;
        state = 'go';
      }
      a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
    },
    poke() { spin = .8; a.say('?', 800); },
    hear(type) { if (type === 'thud') { spin = .8; } }
  };
});
