/* bounce: hop happily along the top of an element. Leaps at the cursor if it hovers
 * close. Grab it and throw it; it squashes on landing and gets dizzy if you overdo it.
 * Click (without dragging) for a big jump. */
defineBehavior('bounce', (a, [el], host) => {
  const S = a.s / 4;
  const G = 2400 * S;                       /* gravity, px/s² */
  const energy = +host.getAttribute('energy') || 1;
  let vx = 0, vy = 0, state = 'air', wait = 0, placed = false, spin = 0;
  let sq = 0, sqv = 0;                      /* squash spring: + is tall, - is flat */
  let dizzy = 0, combo = 0;

  /* pixel lettering has a real outline; over its gaps you fall to the bottom */
  const floor = r => typeof el.piixSurface === 'function' ? (el.piixSurface(a.x) ?? r.b) : r.t;
  const jump = (power = 1, toward = null) => {
    vy = -rnd(560, 760) * Math.sqrt(S) * power * energy;
    vx = toward != null ? clamp((toward - a.x) * 1.6, -380 * S, 380 * S) : rnd(-110, 110) * S;
    if (Math.abs(vx) > 8) a.face = vx > 0 ? 1 : -1;
    sqv += 9; state = 'air';
  };

  return {
    tick(dt) {
      const r = rectOf(el);
      if (!placed) {
        const at = host.getAttribute('at');
        a.x = r.l + r.w * (at != null ? clamp(+at, 0, 1) : rnd(.2, .8));
        a.y = floor(r) - 200 * S; state = 'air'; placed = true;
      }
      if (reduced()) { a.y = floor(r); a.play('idle'); return; }
      if (state === 'held') return;

      const L = r.l + a.w / 2, R = r.r - a.w / 2;
      if (state === 'air') {
        vy += G * dt;
        a.x += vx * dt; a.y += vy * dt;
        if (a.x < L) { a.x = L; vx = Math.abs(vx) * .7; sqv -= 4; }
        if (a.x > R) { a.x = R; vx = -Math.abs(vx) * .7; sqv -= 4; }
        spin *= Math.pow(.2, dt);
        a.rot += spin * dt;
        a.play(vy < 0 ? 'rise' : 'air');
        sq = lerp(sq, clamp(Math.abs(vy) / 2600, 0, .22), .3);
        if (a.y >= floor(r)) {
          const impact = vy;
          a.y = floor(r); a.rot = 0; spin = 0;
          if (typeof el.piixImpact === 'function') el.piixImpact(a.x, a.y, clamp(impact / 1200, .3, 1.6));
          if (impact > 520 * Math.sqrt(S)) shout(a, 'thud', 170 * S * clamp(impact / 1200, .6, 1.8));
          sq = -clamp(impact / 2200, .12, .42); sqv = 0;
          if (impact > 2100 * Math.sqrt(S) || combo > 2) {
            dizzy = 2.2; combo = 0; a.say('star', 1800); a.play('dizzy');
            state = 'ground'; wait = 2.2; vx = 0;
          } else if (impact > 600 * Math.sqrt(S)) {
            /* a bouncy landing keeps some of its speed */
            vy = -impact * .45; vx *= .8; state = 'air'; a.play('land');
          } else {
            state = 'ground'; wait = rnd(.15, .9); vx = 0; combo = 0;
            a.play('land');
          }
        }
      } else {
        a.y = floor(r);
        a.x = clamp(a.x, L, R);
        wait -= dt;
        if (dizzy > 0) { dizzy -= dt; a.play('dizzy'); }
        else if (wait < .1) a.play('land');
        else a.play('idle');
        /* the cursor is a toy */
        const d = ptrDist(a.x, a.y - a.h / 2);
        if (dizzy <= 0 && ptr.seen && d < 170 * S && ptr.y < a.y && wait > .05 && chance(dt * 5)) {
          jump(clamp((a.y - ptr.y) / (200 * S), .8, 1.5), ptr.x); a.say(chance(.5) ? 'heart' : 'note', 700);
        } else if (wait <= 0 && dizzy <= 0) {
          jump(chance(.15) ? 1.35 : rnd(.55, 1));
        }
      }

      /* squash & stretch spring */
      sqv += (-sq * 260 - sqv * 14) * dt;
      sq += sqv * dt;
      a.sy = 1 + sq; a.sx = 1 - sq * .7;
    },
    grab(e) {
      const was = state;
      drag(a, e, {
        move: (x, y) => { state = 'held'; a.x = x; a.y = y + a.h * .35; a.rot = 0; a.play('held'); },
        end: ({ moved, vx: tx, vy: ty }) => {
          if (!moved) {
            if (was === 'held') return;
            if (state === 'ground' || state === 'air') { jump(1.6); spin = (chance(.5) ? 1 : -1) * 720; a.say('!', 600); }
            return;
          }
          vx = tx; vy = ty; state = 'air';
          spin = clamp(tx * .9, -900, 900);
          if (Math.hypot(tx, ty) > 1600) { combo = 3; a.say('!?', 800); }
        }
      });
    },
    poke() { jump(1.6); }
  };
});
