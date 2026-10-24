/* tumble: get about by tipping over your own corners, one side at a time. Made for triangles.
 * Rolls along the top of an element, toward the cursor if it comes near (and waves when it gets
 * there), otherwise strolls now and then, or dances. Click it and it deploys: a spinning leap,
 * "BUILDING" on the way up, "READY" when it lands. Grab it and throw it. */
const TUMBLE_TAG = (a, text, dot, ms) => {
  /* a little pixel status pill in the speech bubble: a coloured dot and a word */
  const s = Math.max(2, Math.round(a.s * .7)), c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = `400 8px ${KIT_FONT}`;
  c.width = Math.ceil(g.measureText(text).width) + 9; c.height = 9;
  g.font = `400 8px ${KIT_FONT}`; g.textBaseline = 'top'; g.imageSmoothingEnabled = false;
  g.fillStyle = dot; g.fillRect(0, 3, 3, 3); g.fillRect(1, 2, 1, 5); g.fillRect(-0, 3, 3, 3);
  g.fillStyle = '#17121f'; g.fillText(text, 6, 1);
  c.style.width = c.width * s + 'px'; c.style.height = c.height * s + 'px';
  clearTimeout(a._bt);
  a.bub.replaceChildren(c); a.bub.classList.add('on');
  if (ms) a._bt = setTimeout(() => a.bub.classList.remove('on'), ms);
};
defineBehavior('tumble', (a, [el], host) => {
  const S = a.s / 3;
  const G = 2600 * S;
  let state = 'sit', placed = false, wait = rnd(.6, 1.6), dir = 1, todo = 0;
  let k = 0, px0 = 0, py0 = 0;          /* a roll: progress 0..1 and the corner it pivots on */
  let vx = 0, vy = 0, spin = 0, sq = 0, sqv = 0, dizzy = 0, waved = 0, mood = '', moodT = 0, deploying = false;
  let bored = rnd(7, 12);
  /* it rolls along the tops of the letters (the tallest ones: a flat line suits a triangle), and stays over the text */
  const tc = {};
  const span = r => { const tp = TEXTY.test(el.tagName) ? textProfile(el, tc) : null; return tp ? { l: tp.l, r: tp.r, t: tp.t } : { l: r.l, r: r.r, t: r.t }; };
  const floor = r => typeof el.piixSurface === 'function' ? (el.piixSurface(a.x) ?? r.b) : span(r).t;
  /* one side of the triangle, in px: the distance a single roll covers */
  const side = () => a.spec.base ? a.spec.base * a.s : a.w * (15 / 17) / .866 * .98;
  const startRoll = d => { dir = d; state = 'roll'; k = 0; px0 = a.x + dir * side() / 2; py0 = a.y; };
  const leap = (power = 1) => { vy = -rnd(620, 780) * Math.sqrt(S) * power; vx = rnd(-60, 60) * S; spin = (chance(.5) ? 1 : -1) * 600; state = 'air'; sqv += 8; };
  const feel = (clip, t) => { mood = clip; moodT = t; };
  const deploy = () => {
    if (state !== 'sit') return;
    deploying = true; leap(1.5); spin = (chance(.5) ? 1 : -1) * 720;
    TUMBLE_TAG(a, 'BUILDING', '#f5a524', 0);
    sfx('launch', host);
  };
  return {
    tick(dt) {
      const r = rectOf(el), sp = span(r);
      if (!placed) { a.x = sp.l + (sp.r - sp.l) * (+host.getAttribute('at') || rnd(.25, .75)); a.y = floor(r) - 160 * S; state = 'air'; placed = true; }
      if (reduced()) { a.y = floor(r); a.rot = 0; a.play('idle'); return; }
      if (state === 'held') return;
      const half = side() / 2, L = sp.l + half, R = Math.max(L, sp.r - half);
      if (state === 'air') {
        vy += G * dt; a.x += vx * dt; a.y += vy * dt; a.rot += spin * dt; spin *= Math.pow(.3, dt);
        a.x = clamp(a.x, L, R);
        a.play('air');
        if (a.y >= floor(r)) {
          const hit = vy;
          a.y = floor(r); a.rot = 0; spin = 0; vx = 0;
          sq = -clamp(hit / 2400, .1, .4); sqv = 0;
          if (deploying) {
            /* it shipped */
            deploying = false;
            TUMBLE_TAG(a, 'READY', '#22c55e', 1800);
            feel('cheer', 1.6); sfx('success', host);
            host.dispatchEvent(new CustomEvent('piix:deploy', { bubbles: true }));
          } else if (hit > 2000 * Math.sqrt(S)) { dizzy = 1.8; a.say('star', 1500); }
          if (hit > 500 * Math.sqrt(S)) shout(a, 'thud', 150 * S);
          state = 'sit'; wait = rnd(.6, 1.4);
        }
      } else if (state === 'roll') {
        /* tipping over: slow to lift, then it falls the rest of the way */
        k = Math.min(1, k + dt / .42);
        const e = k * k * (1.6 - .6 * k), th = e * 2.0944;
        a.x = px0 - dir * half * Math.cos(th); a.y = py0 - half * Math.sin(th);
        a.rot = dir * th * 57.2958;
        a.play('roll');
        if (k >= 1) {
          /* a full third of a turn lands it on its next side, which looks exactly like the last one */
          a.x = px0 + dir * half; a.y = floor(r); a.rot = 0;
          sq = -.16; sqv = 0;
          if (--todo > 0 && a.x + dir * side() >= L && a.x + dir * side() <= R) startRoll(dir);
          else { state = 'sit'; wait = rnd(.5, 1.6); }
        }
      } else {
        a.y = floor(r); a.x = clamp(a.x, L, R);
        dizzy -= dt; moodT -= dt; waved -= dt;
        const near = ptr.seen && Math.abs(ptr.x - a.x) < 320 * S && ptr.y > r.t - 260 * S && ptr.y < r.b + 60 * S;
        /* a little dance when nobody's around: it sways in time */
        a.rot = mood === 'dance' && moodT > 0 ? Math.sin(moodT * 10) * 5 : 0;
        a.play(dizzy > 0 ? 'dizzy' : moodT > 0 ? mood : near && Math.abs(ptr.x - a.x) > a.w * .3 ? (ptr.x < a.x ? 'left' : 'right') : 'idle');
        if (!near && moodT <= 0 && (bored -= dt) <= 0) { feel('dance', 2.4); bored = rnd(9, 15); wait = 2.6; }
        if ((wait -= dt) <= 0 && dizzy <= 0 && moodT <= 0) {
          const s = side();
          if (near && Math.abs(ptr.x - a.x) > s * .9) {
            /* roll over to the cursor */
            const d = ptr.x < a.x ? -1 : 1;
            todo = Math.max(1, Math.min(4, Math.round(Math.abs(ptr.x - a.x) / s)));
            if (a.x + d * s >= L && a.x + d * s <= R) startRoll(d); else wait = .4;
          } else if (near) {
            /* it got to you: a wave, now and then */
            if (waved <= 0) { feel('wave', 1.3); waved = 5; } else feel('happy', .8);
            wait = rnd(.8, 1.4);
          } else {
            /* a stroll on its own: a few tumbles one way, turning back at the edges */
            const d = a.x - s * 1.5 < L ? 1 : a.x + s * 1.5 > R ? -1 : chance(.5) ? 1 : -1;
            todo = 1 + Math.floor(rnd(0, 3));
            if (a.x + d * s >= L && a.x + d * s <= R) startRoll(d);
            wait = rnd(1.5, 3.5);
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
          if (!moved) { if (was === 'sit') { state = 'sit'; deploy(); } else state = 'air'; return; }
          vx = tx; vy = ty; spin = clamp(tx, -900, 900); state = 'air';
        }
      });
    },
    poke() { deploy(); }
  };
});
