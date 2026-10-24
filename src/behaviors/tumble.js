/* tumble: get about by tipping over your own corners, one side at a time. Made for triangles.
 * Rolls along the top of an element, toward the cursor if it comes near, otherwise now and
 * then on a whim. Click for a spinning leap; grab it and throw it. */
defineBehavior('tumble', (a, [el], host) => {
  const S = a.s / 3;
  const G = 2600 * S;
  let state = 'sit', placed = false, wait = rnd(.6, 1.6), dir = 1, todo = 0;
  let k = 0, px0 = 0, py0 = 0;          /* a roll: progress 0..1 and the corner it pivots on */
  let vx = 0, vy = 0, spin = 0, sq = 0, sqv = 0, dizzy = 0, happy = 0;
  /* it rolls along the tops of the letters (the tallest ones: a flat line suits a triangle), and stays over the text */
  const tc = {};
  const span = r => { const tp = TEXTY.test(el.tagName) ? textProfile(el, tc) : null; return tp ? { l: tp.l, r: tp.r, t: tp.t } : { l: r.l, r: r.r, t: r.t }; };
  const floor = r => typeof el.piixSurface === 'function' ? (el.piixSurface(a.x) ?? r.b) : span(r).t;
  /* one side of the triangle, in px: the distance a single roll covers */
  const side = () => a.w * (15 / 17) / .866 * .98;
  const startRoll = d => {
    dir = d; state = 'roll'; k = 0;
    px0 = a.x + dir * side() / 2; py0 = a.y;
  };
  const leap = (power = 1) => { vy = -rnd(620, 780) * Math.sqrt(S) * power; vx = rnd(-60, 60) * S; spin = (chance(.5) ? 1 : -1) * 600; state = 'air'; sqv += 8; };
  return {
    tick(dt) {
      const r = rectOf(el);
      const sp = span(r);
      if (!placed) { a.x = sp.l + (sp.r - sp.l) * (+host.getAttribute('at') || rnd(.25, .75)); a.y = floor(r) - 160 * S; state = 'air'; placed = true; }
      if (reduced()) { a.y = floor(r); a.rot = 0; a.play('idle'); return; }
      if (state === 'held') return;
      const L = sp.l + a.w / 2, R = Math.max(sp.l + a.w / 2, sp.r - a.w / 2);
      if (state === 'air') {
        vy += G * dt; a.x += vx * dt; a.y += vy * dt; a.rot += spin * dt; spin *= Math.pow(.3, dt);
        a.x = clamp(a.x, L, R);
        a.play('air');
        if (a.y >= floor(r)) {
          const hit = vy;
          a.y = floor(r); a.rot = 0; spin = 0; vx = 0;
          sq = -clamp(hit / 2400, .1, .4); sqv = 0;
          if (hit > 2000 * Math.sqrt(S)) { dizzy = 1.8; a.say('star', 1500); }
          if (hit > 500 * Math.sqrt(S)) shout(a, 'thud', 150 * S);
          state = 'sit'; wait = rnd(.4, 1.2);
        }
      } else if (state === 'roll') {
        /* tipping over: slow to lift, then it falls the rest of the way */
        k = Math.min(1, k + dt / .42);
        const e = k * k * (1.6 - .6 * k), th = e * 2.0944, half = side() / 2;
        a.x = px0 - dir * half * Math.cos(th); a.y = py0 - half * Math.sin(th);
        a.rot = dir * th * 57.2958;
        a.play('roll');
        if (k >= 1) {
          /* a full third of a turn lands it on its next side, which looks exactly like the last one */
          a.x = px0 + dir * half; a.y = floor(r); a.rot = 0;
          sq = -.16; sqv = 0;
          if (--todo > 0 && a.x + dir * side() > L && a.x + dir * side() < R) startRoll(dir);
          else { state = 'sit'; wait = rnd(.5, 1.6); }
        }
      } else {
        a.y = floor(r); a.x = clamp(a.x, L, R);
        dizzy -= dt; happy -= dt;
        const near = ptr.seen && Math.abs(ptr.x - a.x) < 320 * S && ptr.y > r.t - 260 * S && ptr.y < r.b + 60 * S;
        a.play(dizzy > 0 ? 'dizzy' : happy > 0 ? 'happy' : near && Math.abs(ptr.x - a.x) > a.w * .3 ? (ptr.x < a.x ? 'left' : 'right') : 'idle');
        if ((wait -= dt) <= 0 && dizzy <= 0) {
          const s = side();
          if (near && Math.abs(ptr.x - a.x) > s * .9) {
            /* roll over to the cursor */
            const d = ptr.x < a.x ? -1 : 1;
            todo = Math.max(1, Math.min(4, Math.round(Math.abs(ptr.x - a.x) / s)));
            if (a.x + d * s > L && a.x + d * s < R) startRoll(d); else wait = .4;
          } else if (near) {
            happy = .9; wait = rnd(.8, 1.4);
            if (chance(.5)) a.say('heart', 800);
          } else {
            /* a stroll on its own: a few tumbles one way, turning back at the edges */
            const d = a.x - s * 1.5 < L ? 1 : a.x + s * 1.5 > R ? -1 : chance(.5) ? 1 : -1;
            todo = 1 + Math.floor(rnd(0, 3));
            startRoll(d); wait = rnd(1.5, 3.5);
          }
        }
      }
      /* squash & stretch */
      sqv += (-sq * 260 - sqv * 14) * dt; sq += sqv * dt;
      a.sy = 1 + sq; a.sx = 1 - sq * .6;
    },
    hear(type) { if (type === 'thud' && state === 'sit') leap(.6); },
    grab(e) {
      const was = state;
      drag(a, e, {
        move: (x, y) => { state = 'held'; a.x = x; a.y = y + a.h * .4; a.rot = 0; a.play('air'); },
        end: ({ moved, vx: tx, vy: ty }) => {
          if (!moved) { if (was !== 'air') { leap(1.4); a.say('!', 600); } else state = 'air'; return; }
          vx = tx; vy = ty; spin = clamp(tx, -900, 900); state = 'air';
        }
      });
    },
    poke() { if (state === 'sit') leap(1.4); }
  };
});
