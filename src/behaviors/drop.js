/* drop: waits until its element scrolls into view, then parachutes down from the top
 * of the screen, swaying, and lands on it. Folds the chute, waves. Click to jump again. */
defineBehavior('drop', (a, [el], host) => {
  const S = a.s / 3;
  const cache = {};
  let state = 'wait', x = 0, sway = rnd(0, 6), timer = 0, vy = 0;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : rnd(.25, .75);
  const spot = () => {
    const tp = textProfile(el, cache);
    if (tp) { const x = tp.l + (tp.r - tp.l) * at; return { x, y: segAt(tp.segs, x) ?? tp.t }; }
    const r = rectOf(el); return { x: r.l + r.w * at, y: r.t };
  };
  a.node.style.visibility = 'hidden';

  return {
    awake: () => true,
    tick(dt, t) {
      const s = spot();
      if (state === 'wait') {
        const r = rectOf(el);
        if (r.t < scrollY + innerHeight * .8 && r.b > scrollY) {
          state = 'fall'; x = s.x + rnd(-40, 40) * S; a.y = Math.min(scrollY - 10, s.y - 200 * S);
          a.node.style.visibility = ''; a.play('fall');
          if (reduced()) { a.y = s.y; a.x = s.x; state = 'landed'; a.play('landed'); }
        }
        return;
      }
      if (state === 'fall') {
        sway += dt * 2.2;
        x = lerp(x, s.x, 1 - Math.exp(-.8 * dt));
        a.x = x + Math.sin(sway) * 18 * S;
        a.rot = Math.cos(sway) * 10;
        a.y += 70 * S * dt;
        if (a.y >= s.y) { a.y = s.y; a.rot = 0; state = 'landed'; timer = .8; a.play('landed'); a.sy = .8; a.sx = 1.2; }
        return;
      }
      a.x = s.x; a.y = s.y;
      a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
      timer -= dt;
      if (state === 'landed' && timer <= 0) { state = 'wave'; timer = 2.4; a.play('wave'); a.say('hi', 1400); }
      else if (state === 'wave' && timer <= 0) { state = 'stand'; a.play('landed'); }
      else if (state === 'launch') {
        vy -= 1200 * S * dt; a.y += vy * dt;
      }
    },
    poke() {
      if (state === 'fall') return;
      state = 'fall'; a.play('fall'); a.say('!', 600);
      a.y = Math.min(scrollY - 10, a.y - 220 * S); x = a.x;
    }
  };
});
