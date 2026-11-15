/* DUOS: ten pairs of pals that share an element and live a little story together, over and over.
 * Put the tag inside the element they should live on (or on="selector"); the partner comes along.
 *   popper  a toaster launches Butter, who parachutes back and climbs in again
 *   wick    a shy candle, and Dusty the moth who keeps flying too close and blowing her out
 *   earl    a fussy teapot pours for Sip, who steams and hiccups and drinks it all
 *   dent    a very small knight charges Soot the dragon, who only wants a hug (and sneezes)
 *   volt    a magnet-headed robot can't stop the bolts piling onto his head
 *   spike   a cactus cowboy lassos Tumble the tumbleweed and gets dragged off
 *   morel   a mushroom wizard turns Ribb the frog into things; Ribb is not amused
 *   luna    the moon floats over your element, and Pup howls at her until she blushes
 *   parcel  a snail delivers a letter to the mailbox, very slowly
 *   wink    a fox whose shadow keeps wandering off without it
 * Everything is a loop with a little randomness; poke either character to set something off. */

/* a thin line in the layer (a lasso, a stream of tea) */
const duoLine = (a, col) => {
  const d = document.createElement('div');
  d.className = 'thread';
  d.style.width = Math.max(1, Math.round(a.s / 2)) + 'px';
  d.style.color = col; d.style.opacity = '0';
  a.node.parentNode.insertBefore(d, a.node);
  return d;
};
const duoDraw = (d, x1, y1, x2, y2, on = true) => {
  if (!on) { d.style.opacity = '0'; return; }
  const dx = x2 - x1, dy = y2 - y1;
  d.style.opacity = '.95';
  d.style.height = Math.round(Math.hypot(dx, dy)) + 'px';
  d.style.transform = `translate3d(${Math.round(x1 - origin.x)}px,${Math.round(y1 - origin.y)}px,0) rotate(${(Math.atan2(-dx, dy) * 57.2958).toFixed(1)}deg)`;
};
const duoShow = (c, on) => { c.node.style.visibility = on ? '' : 'hidden'; };
const duoAt = (host, d) => host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : d;
const duoSpot = (el, at) => { const r = rectOf(el); return { x: r.l + r.w * at, y: r.t, r }; };
/* a point on an arc from p to q, k from 0 to 1, peaking h above the straight line */
const duoArc = (p, q, k, h) => ({ x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k) - Math.sin(k * Math.PI) * h });
const duoFeet = c => { c.cv.style.transformOrigin = '50% 100%'; };

/* 1. POP: Popper the toaster launches Butter; she floats down on a parachute and climbs back in */
defineBehavior('popper', (a, [el], host) => {
  const S = a.s / 3, at = duoAt(host, .3);
  const b = recruit(a, '_butter'), chute = recruit(a, '_chute');
  duoFeet(b); duoShow(b, false); duoShow(chute, false);
  let st = 'in', timer = rnd(1.5, 3), bx = 0, by = 0, vx = 0, vy = 0;
  return {
    crew: [b, chute],
    tick(dt, t) {
      const s = duoSpot(el, at);
      a.x = s.x; a.y = s.y;
      if (reduced()) { a.play('idle'); duoShow(b, true); b.x = a.x + (a.w + b.w) / 2; b.y = s.y; b.play('idle'); return; }
      timer -= dt;
      if (st === 'in') {
        a.play(timer < .45 ? 'squash' : 'idle');
        if (timer <= 0) {
          /* POP: aim for a spot on the element, high enough to open the chute */
          const tx = clamp(rnd(s.r.l + 30 * S, s.r.r - 30 * S), s.r.l + b.w, s.r.r - b.w);
          bx = a.x; by = a.y - a.h * .5; vy = -560 * S; vx = (tx - bx) / 2.2;
          st = 'up'; duoShow(b, true); b.play('scared'); a.say('!', 500);
        }
      } else if (st === 'up') {
        a.play('happy');
        vy += 900 * S * dt; bx += vx * dt; by += vy * dt; b.rot += 620 * dt;
        if (vy > 0) { st = 'chute'; b.rot = 0; duoShow(chute, true); b.play('look'); }
      } else if (st === 'chute') {
        a.play('idle');
        by += 55 * S * dt; bx += (vx * .35 + Math.sin(t / 320) * 26 * S) * dt;
        b.rot = Math.sin(t / 320) * 9;
        if (by >= s.y) { by = s.y; st = 'walk'; duoShow(chute, false); b.rot = 0; b.say('hi', 800); }
      } else if (st === 'walk') {
        b.play('walk');
        b.face = a.x > bx ? 1 : -1; bx += b.face * 55 * S * dt;
        if (Math.abs(bx - a.x) < 6 * S) { st = 'hop'; timer = .4; }
      } else if (st === 'hop') {
        b.play('hop');
        const k = 1 - timer / .4; bx = lerp(bx, a.x, .25); by = s.y - Math.sin(k * Math.PI) * 46 * S;
        if (timer <= 0) { st = 'in'; duoShow(b, false); timer = rnd(4, 8); }
      }
      b.x = bx; b.y = by;
      chute.x = bx + Math.sin(t / 320) * 2 * S; chute.y = by - b.h + 3 * S; chute.rot = b.rot * .6;
    },
    poke(e, c) {
      if (c === b) { b.say('heart', 900); return; }
      if (st === 'in') timer = Math.min(timer, .45); else a.say('?', 600);
    }
  };
});

/* 2. GLOW: Wick the candle and Dusty the moth, who keeps getting too close */
defineBehavior('wick', (a, [el], host) => {
  const S = a.s / 3, at = duoAt(host, .5);
  const d = recruit(a, '_dusty');
  let st = 'court', timer = 0, th = 0, R = 90, flick = 0;
  return {
    crew: [d],
    tick(dt, t) {
      const s = duoSpot(el, at);
      a.x = s.x; a.y = s.y;
      const fx = a.x, fy = a.y - a.h + 4 * S;
      if (reduced()) { a.play('idle'); d.play('fly'); d.x = fx + 40 * S; d.y = fy; return; }
      timer -= dt;
      if (st === 'court') {
        /* round and round, a little closer every lap */
        th += dt * (2 + 50 / R); R = Math.max(14, R - dt * 7);
        d.x = fx + Math.cos(th) * R * 1.35 * S; d.y = fy + Math.sin(th) * R * .55 * S + d.h * .5;
        d.face = -Math.sin(th) > 0 ? 1 : -1; d.play('fly');
        flick -= dt; if (flick <= 0) flick = rnd(.15, .5);
        a.play(R < 34 ? 'blush' : flick < .1 ? 'flick' : 'idle');
        if (R < 34 && chance(dt * .6)) a.say('heart', 700);
        if (R <= 14) { st = 'oops'; timer = 2.8; a.play('out'); a.say('!?', 900); d.say('sweat', 1500); }
      } else if (st === 'oops') {
        /* he blew her out: he sulks on the ledge beside her */
        a.play('out');
        d.x = lerp(d.x, fx + a.w * .9, .08); d.y = lerp(d.y, s.y, .08); d.face = -1; d.play('sleep');
        if (timer <= 0) { st = 'relight'; timer = .9; a.say('star', 900); }
      } else if (st === 'relight') {
        a.play('happy');
        if (timer <= 0) { st = 'court'; R = 95; th = 0; d.say('heart', 900); }
      }
    },
    poke(e, c) {
      if (c === d) { R = 110; d.say('!', 500); return; }
      if (st === 'oops') timer = 0; else { a.say('heart', 900); R = Math.min(R, 30); }
    }
  };
});

/* 3. BREW: Earl the teapot pours for Sip, who steams, hiccups and drinks it all */
defineBehavior('earl', (a, [el], host) => {
  const S = a.s / 3, at = duoAt(host, .35);
  const cup = recruit(a, '_sip'), steam = recruit(a, '_steam'), tea = duoLine(a, '#b8733c');
  duoFeet(a); duoShow(steam, false);
  let st = 'wait', timer = rnd(1.5, 3), full = 0, hic = 0;
  return {
    crew: [cup, steam],
    tick(dt) {
      const s = duoSpot(el, at);
      a.x = s.x; a.y = s.y;
      cup.x = a.x + (a.w + cup.w) / 2 + 10 * S; cup.y = s.y;
      if (reduced()) { a.play('idle'); cup.play('idle'); return; }
      timer -= dt;
      let rot = 0;
      if (st === 'wait') { a.play('idle'); if (timer <= 0) { st = 'tilt'; timer = .5; a.say('note', 800); } }
      else if (st === 'tilt') { rot = 34 * (1 - timer / .5); if (timer <= 0) { st = 'pour'; timer = 1.6; } }
      else if (st === 'pour') { rot = 34; full = Math.min(1, full + dt / 1.4); if (timer <= 0) { st = 'back'; timer = .5; } }
      else if (st === 'back') { rot = 34 * (timer / .5); if (timer <= 0) { st = 'proud'; timer = 1.2; a.play('happy'); } }
      else if (st === 'proud') { if (timer <= 0) { st = 'wait'; timer = rnd(6, 9); } }
      a.rot = rot;
      /* the stream: from the spout, turned with the pot, to the cup */
      if (st === 'pour') {
        const r = rot / 57.2958, px = a.w * .47, py = -a.h * .62;
        duoDraw(tea, a.x + px * Math.cos(r) - py * Math.sin(r), a.y + px * Math.sin(r) + py * Math.cos(r), cup.x, cup.y - cup.h * .82);
      } else duoDraw(tea, 0, 0, 0, 0, false);
      /* the cup: full, steaming, hiccuping, slowly sipped empty */
      if (st !== 'pour') full = Math.max(0, full - dt / 9);
      duoShow(steam, full > .3);
      steam.x = cup.x - 2 * S; steam.y = cup.y - cup.h + 2 * S;
      hic -= dt;
      if (full > .3 && hic <= -1 && chance(dt * .35)) { hic = .45; cup.say('!', 400); }
      cup.play(hic > 0 ? 'hop' : full > .2 ? 'idle' : 'empty');
    },
    poke(e, c) {
      if (c === cup) { cup.say('heart', 900); return; }
      if (st === 'wait') timer = 0;
    },
    destroy() { tea.remove(); }
  };
});

/* 4. QUEST: Sir Dent charges Soot the dragon; Soot hugs him, then sneezes */
defineBehavior('dent', (a, [el], host) => {
  const S = a.s / 3, at = duoAt(host, .15);
  const dr = recruit(a, '_soot'), puff = recruit(a, '_puff');
  duoShow(puff, false);
  let st = 'ready', timer = rnd(1, 2.5), x = null, hop = 0;
  return {
    crew: [dr, puff],
    tick(dt) {
      const s = duoSpot(el, at), r = s.r;
      const home = s.x, lair = Math.min(r.r - dr.w / 2, home + Math.max(160 * S, r.w * .55));
      if (x == null) x = home;
      dr.x = lair; dr.y = s.y; dr.face = -1;
      if (reduced()) { a.x = home; a.y = s.y; a.play('idle'); dr.play('idle'); return; }
      timer -= dt;
      const touch = (a.w + dr.w) * .42;
      if (st === 'ready') { a.play('idle'); a.face = 1; dr.play('idle'); if (timer <= 0) { st = 'charge'; a.say('!', 600); } }
      else if (st === 'charge') {
        a.play('walk'); a.face = 1; x += 170 * S * dt;
        if (x >= lair - touch) { x = lair - touch; st = 'hug'; timer = 1.2; dr.play('happy'); dr.say('heart', 1100); a.say('!?', 900); }
      } else if (st === 'hug') { a.play('squash'); if (timer <= 0) { st = 'sneeze'; timer = .8; dr.play('sneeze'); } }
      else if (st === 'sneeze') {
        duoShow(puff, true); puff.face = -1;
        puff.x = dr.x - dr.w * .42 - (.8 - timer) * 30 * S; puff.y = dr.y - dr.h * .42;
        if (timer <= 0) { duoShow(puff, false); st = 'flee'; dr.play('idle'); a.say('sweat', 900); hop = .35; }
      } else if (st === 'flee') {
        a.play('scared'); a.face = -1; x -= 210 * S * dt;
        if (x <= home) { x = home; st = 'ready'; timer = rnd(3, 5); a.face = 1; }
      }
      hop = Math.max(0, hop - dt);
      a.x = x; a.y = s.y - Math.sin((hop / .35) * Math.PI) * 18 * S;
    },
    poke(e, c) {
      if (c === dr) { if (st === 'ready' || st === 'hug') { st = 'sneeze'; timer = .8; dr.play('sneeze'); } return; }
      if (st === 'ready') timer = 0;
    }
  };
});

/* 5. PULL: Volt walks about, and every bolt nearby flies up and stacks on his magnet head */
defineBehavior('volt', (a, [el], host) => {
  const S = a.s / 3, n = clamp(+host.getAttribute('bolts') || 3, 1, 6);
  const nuts = Array.from({ length: n }, () => recruit(a, '_nut'));
  nuts.forEach(duoFeet);
  let x = null, dir = 1, pause = 0, shake = 0, cool = 2, ready = false;
  const B = nuts.map(() => ({ st: 'ground', x: 0, y: 0, vx: 0, vy: 0, k: 0, from: null }));
  return {
    crew: nuts,
    tick(dt, t) {
      const r = rectOf(el), y0 = r.t, L = r.l + a.w / 2, R = r.r - a.w / 2;
      if (!ready) { ready = true; x = r.l + r.w * .2; B.forEach((b, i) => { b.x = r.l + r.w * (.45 + i * .5 / n); b.y = y0; }); }
      if (reduced()) { a.x = x; a.y = y0; a.play('idle'); B.forEach((b, i) => { nuts[i].x = b.x; nuts[i].y = y0; nuts[i].play('idle'); }); return; }
      cool -= dt; pause -= dt;
      const stacked = B.filter(b => b.st === 'stack').length;
      /* all of them on his head: he shakes them off */
      if (stacked === n && shake <= 0) { shake = .9; a.say('!?', 800); }
      if (shake > 0) {
        shake -= dt; a.play('scared');
        if (shake <= 0) { cool = 3; B.forEach(b => { if (b.st === 'stack') { b.st = 'thrown'; b.vx = rnd(-1, 1) * 240 * S; b.vy = -rnd(320, 460) * S; } }); }
      } else if (pause > 0) a.play('idle');
      else {
        a.play('walk'); a.face = dir; x += dir * 45 * S * dt;
        if (x > R) { x = R; dir = -1; pause = rnd(.6, 1.6); } else if (x < L) { x = L; dir = 1; pause = rnd(.6, 1.6); }
        if (chance(dt * .15)) pause = rnd(.8, 1.8);
      }
      a.x = x; a.y = y0;
      let slot = 0;
      B.forEach((b, i) => {
        const c = nuts[i];
        if (b.st === 'ground') {
          b.y = y0; c.play('idle'); c.rot = 0;
          if (cool <= 0 && shake <= 0 && Math.abs(b.x - x) < 120 * S) { b.st = 'pulled'; b.k = 0; b.from = { x: b.x, y: b.y }; c.say('!', 400); }
        } else if (b.st === 'pulled') {
          b.k = Math.min(1, b.k + dt * 2.2);
          const top = { x: a.x, y: a.y - a.h + 2 * S - slot * c.h * .55 }, p = duoArc(b.from, top, b.k * b.k, 40 * S);
          b.x = p.x; b.y = p.y; c.play('scared'); c.rot = b.k * 360;
          if (b.k >= 1) { b.st = 'stack'; c.rot = 0; }
        } else if (b.st === 'stack') {
          b.x = a.x + (shake > 0 ? Math.sin(t / 25) * 3 * S : 0); b.y = a.y - a.h + 2 * S - slot * c.h * .55; slot++; c.play('idle');
        } else if (b.st === 'thrown') {
          b.vy += 900 * S * dt; b.x += b.vx * dt; b.y += b.vy * dt; c.rot += b.vx * dt * 3;
          if (b.x < r.l + c.w / 2 || b.x > r.r - c.w / 2) { b.vx *= -.6; b.x = clamp(b.x, r.l + c.w / 2, r.r - c.w / 2); }
          if (b.vy > 0 && b.y >= y0) { b.y = y0; b.st = 'ground'; c.rot = 0; c.play('squash'); }
        }
        if (b.st === 'pulled') slot++;
        c.x = b.x; c.y = b.y;
      });
    },
    poke(e, c) {
      if (!c) { if (B.some(b => b.st === 'stack')) shake = .9; else a.say('?', 600); return; }
      const i = nuts.indexOf(c), b = B[i];
      if (b && b.st === 'ground') { b.st = 'thrown'; b.vx = rnd(-1, 1) * 120 * S; b.vy = -300 * S; }
    }
  };
});

/* 6. RODEO: Tumble rolls by, Spike lassos it and gets dragged off his feet */
defineBehavior('spike', (a, [el], host) => {
  const S = a.s / 3, at = duoAt(host, .2);
  const tw = recruit(a, '_tumble'), rope = duoLine(a, '#b8733c');
  duoFeet(a);
  let st = 'wait', timer = rnd(1, 2), tx = 0, sx = null, k = 0;
  return {
    crew: [tw],
    tick(dt, t) {
      const s = duoSpot(el, at), r = s.r;
      if (sx == null) sx = s.x;
      if (reduced()) { a.x = s.x; a.y = s.y; a.play('idle'); tw.x = s.x + 80 * S; tw.y = s.y; return; }
      timer -= dt;
      const hand = () => ({ x: a.x + a.w * .42 * a.face, y: a.y - a.h * .55 });
      if (st === 'wait') {
        duoShow(tw, false); a.play('idle'); a.rot = 0; sx = lerp(sx, s.x, .1);
        if (timer <= 0) { st = 'roll'; tx = r.l - tw.w; duoShow(tw, true); }
      } else if (st === 'roll' || st === 'throw') {
        tx += 150 * S * dt;
        if (st === 'roll' && tx > sx + 50 * S) { st = 'throw'; k = 0; a.say('!', 500); a.face = 1; }
        if (st === 'throw') { k = Math.min(1, k + dt / .3); const h = hand(); duoDraw(rope, h.x, h.y, lerp(h.x, tw.x, k), lerp(h.y, tw.y - tw.h / 2, k)); if (k >= 1) st = 'drag'; }
        a.play('look');
      } else if (st === 'drag') {
        /* yee-haw: off his pot and across the element */
        tx += 120 * S * dt; sx = Math.max(sx, tx - 110 * S);
        a.play('scared'); a.rot = -14 + Math.sin(t / 60) * 4;
        const h = hand(); duoDraw(rope, h.x, h.y, tw.x, tw.y - tw.h / 2);
        if (tx > r.r - tw.w) { st = 'proud'; timer = 1.4; duoDraw(rope, 0, 0, 0, 0, false); a.rot = 0; a.say('star', 1200); }
      } else if (st === 'proud') {
        a.play('happy'); tx += 160 * S * dt;
        if (timer <= 0) { st = 'home'; }
      } else if (st === 'home') {
        a.play('walk'); a.face = -1; sx -= 60 * S * dt; tx += 160 * S * dt;
        if (sx <= s.x) { sx = s.x; a.face = 1; st = 'wait'; timer = rnd(4, 7); }
      }
      if (st !== 'throw' && st !== 'drag') duoDraw(rope, 0, 0, 0, 0, false);
      a.x = sx; a.y = s.y - (st === 'drag' ? Math.abs(Math.sin(t / 90)) * 6 * S : 0);
      tw.x = tx; tw.y = s.y - Math.abs(Math.sin(tx / (14 * S))) * 10 * S; tw.rot = (tx / (tw.w / 2)) * 57.3; tw.play('idle');
      if (tx > r.r + tw.w) duoShow(tw, false);
    },
    poke(e, c) {
      if (c === tw) { tw.say('!', 400); return; }
      if (st === 'wait') timer = 0; else a.say('note', 700);
    },
    destroy() { rope.remove(); }
  };
});

/* 7. HEX: Morel casts a spell on Ribb, who turns into something and is not amused */
defineBehavior('morel', (a, [el], host) => {
  const S = a.s / 3, at = duoAt(host, .25);
  const fr = recruit(a, '_ribb'), sp = recruit(a, '_sparkle');
  duoFeet(fr); duoShow(sp, false);
  const SPELLS = ['tiny', 'giant', 'upside', 'ghost', 'spin', 'pink'];
  let st = 'wait', timer = rnd(1.5, 3), spell = null, k = 0, hop = 0, fx = null;
  const undo = () => { fr.sx = fr.sy = 1; fr.rot = 0; fr.cv.style.opacity = ''; fr.cv.style.filter = ''; spell = null; };
  return {
    crew: [fr, sp],
    tick(dt) {
      const s = duoSpot(el, at), r = s.r;
      a.x = s.x; a.y = s.y;
      if (fx == null) fx = Math.min(r.r - fr.w, s.x + Math.max(120 * S, r.w * .45));
      fr.face = -1;
      if (reduced()) { a.play('idle'); fr.x = fx; fr.y = s.y; fr.play('idle'); return; }
      timer -= dt; hop = Math.max(0, hop - dt);
      if (st === 'wait') {
        a.play('idle'); fr.play('idle');
        if (chance(dt * .3) && hop <= 0) { hop = .4; fr.play('hop'); }
        if (timer <= 0) { st = 'cast'; k = 0; a.play('hop'); a.say('star', 600); duoShow(sp, true); }
      } else if (st === 'cast') {
        k = Math.min(1, k + dt / .7);
        const p = duoArc({ x: a.x + a.w * .4, y: a.y - a.h * .75 }, { x: fr.x, y: fr.y - fr.h / 2 }, k, 60 * S);
        sp.x = p.x; sp.y = p.y + sp.h / 2;
        if (k >= 1) { duoShow(sp, false); spell = pick(SPELLS); st = 'hexed'; timer = 3.6; fr.say('vein', 1600); a.play('happy'); }
      } else if (st === 'hexed') {
        fr.play('scared');
        if (spell === 'tiny') fr.sx = fr.sy = .5;
        else if (spell === 'giant') fr.sx = fr.sy = 1.7;
        else if (spell === 'upside') fr.rot = 180;
        else if (spell === 'ghost') fr.cv.style.opacity = '.35';
        else if (spell === 'spin') fr.rot += 540 * dt;
        else if (spell === 'pink') fr.cv.style.filter = 'hue-rotate(250deg) saturate(1.4)';
        if (timer <= 0) { undo(); st = 'wait'; timer = rnd(4, 7); fr.say('grr', 900); a.play('idle'); }
      }
      fr.x = fx; fr.y = s.y - Math.sin((hop / .4) * Math.PI) * 14 * S - (spell === 'upside' ? fr.h : 0);
    },
    poke(e, c) {
      if (c === fr) { fr.say('grr', 700); hop = .4; return; }
      if (st === 'wait') timer = 0;
    }
  };
});

/* 8. HOWL: the moon rises over your element, Pup howls at her, she blushes */
defineBehavior('luna', (a, [el], host) => {
  const S = a.s / 3, at = duoAt(host, .75);
  const pup = recruit(a, '_pup');
  duoFeet(pup);
  let rise = 0, st = 'calm', timer = rnd(2, 4);
  return {
    crew: [pup],
    tick(dt, t) {
      const s = duoSpot(el, at), r = s.r;
      rise = reduced() ? 1 : Math.min(1, rise + dt / 2.4);
      const e = 1 - Math.pow(1 - rise, 3);
      a.x = s.x; a.y = s.y - (22 + 48 * e) * S + Math.sin(t / 900) * 5 * S;
      a.node.style.opacity = String(.25 + .75 * e);
      pup.x = Math.max(r.l + pup.w / 2, s.x - Math.max(120 * S, r.w * .4)); pup.y = s.y; pup.face = 1;
      if (reduced()) { a.play('idle'); pup.play('idle'); return; }
      timer -= dt;
      const near = a.near(30 * S);
      if (st === 'calm') {
        a.play(near ? 'happy' : 'idle'); pup.play('look'); pup.rot = 0;
        if (timer <= 0) { st = 'howl'; timer = 1.5; pup.say('note', 1400); }
      } else if (st === 'howl') {
        pup.play('happy'); pup.rot = -16 + Math.sin(t / 70) * 2;
        if (timer <= 0) { st = 'blush'; timer = 2; pup.rot = 0; a.say('heart', 1400); }
      } else if (st === 'blush') {
        a.play('blush'); a.y -= 6 * S; pup.play('hop');
        if (timer <= 0) { st = 'calm'; timer = rnd(5, 8); }
      }
    },
    poke(e, c) {
      if (c === pup) { if (st === 'calm') timer = 0; return; }
      st = 'blush'; timer = 1.6; a.say('heart', 1000);
    }
  };
});

/* 9. POST: Parcel the snail delivers a letter to the mailbox, at snail speed */
defineBehavior('parcel', (a, [el], host) => {
  const S = a.s / 3;
  const box = recruit(a, '_maily'), letter = recruit(a, '_letter');
  duoFeet(a); duoShow(letter, false);
  let st = 'go', x = null, timer = 0, k = 0, rush = 0, from = null;
  return {
    crew: [box, letter],
    tick(dt, t) {
      const r = rectOf(el), y0 = r.t, start = r.l + a.w / 2 + 4 * S;
      box.x = r.r - box.w / 2 - 4 * S; box.y = y0; box.face = -1;
      if (x == null) x = start;
      if (reduced()) { a.x = x; a.y = y0; a.play('idle'); box.play('idle'); return; }
      timer -= dt; rush = Math.max(0, rush - dt);
      const v = (rush > 0 ? 70 : 16) * S, crawl = 1 + Math.sin(t / 160) * .06;
      if (st === 'go') {
        a.play('idle'); a.face = 1; x += v * dt; a.sx = crawl; a.sy = 2 - crawl; box.play('idle');
        if (x >= box.x - (a.w + box.w) * .45) { st = 'drop'; k = 0; from = { x: x - a.w * .28, y: y0 - a.h * .62 }; duoShow(letter, true); a.sx = a.sy = 1; }
      } else if (st === 'drop') {
        a.play('empty'); k = Math.min(1, k + dt / .6);
        const p = duoArc(from, { x: box.x, y: box.y - box.h * .5 }, k, 50 * S);
        letter.x = p.x; letter.y = p.y + letter.h / 2;
        if (k >= 1) { duoShow(letter, false); st = 'chomp'; timer = 1.2; box.play('squash'); }
      } else if (st === 'chomp') {
        a.play('empty');
        if (timer < .7) { box.play('happy'); if (!box._burp) { box._burp = 1; box.say('heart', 1100); a.say('check', 900); } }
        if (timer <= 0) { st = 'back'; box._burp = 0; }
      } else if (st === 'back') {
        a.play('empty'); a.face = -1; x -= v * 1.8 * dt; a.sx = crawl; a.sy = 2 - crawl; box.play('idle');
        if (x <= start) { x = start; st = 'refill'; timer = 1.6; a.face = 1; a.sx = a.sy = 1; a.say('copy', 900); }
      } else if (st === 'refill') { a.play('idle'); if (timer <= 0) st = 'go'; }
      a.x = x; a.y = y0;
    },
    poke(e, c) {
      if (c === box) { box.say('eep', 700); box.play('hop'); return; }
      rush = 2.5; a.say('sweat', 800);
    }
  };
});

/* 10. ECHO: Wink the fox, whose shadow keeps wandering off and has to be fetched */
defineBehavior('wink', (a, [el], host) => {
  const S = a.s / 3, at = duoAt(host, .3);
  const sh = recruit(a, '_shade');
  a.node.style.zIndex = '2'; sh.cv.style.opacity = '.62';
  let st = 'home', timer = rnd(3, 5), x = null, gx = 0, gaze = 0;
  return {
    crew: [sh],
    tick(dt, t) {
      const s = duoSpot(el, at), r = s.r;
      if (x == null) { x = s.x; gx = s.x; }
      if (reduced()) { a.x = x; a.y = s.y; a.play('idle'); sh.x = x - 5 * S; sh.y = s.y; sh.play('idle'); return; }
      timer -= dt;
      if (st === 'home') {
        a.play('idle');
        /* the shadow leans after the cursor, as if it wants to go and see */
        const want = ptr.seen && Math.abs(sh.mx - x) < 160 * S && Math.abs(sh.my - s.y) < 120 * S ? clamp((sh.mx - x) * .25, -24 * S, 24 * S) : 0;
        gaze = lerp(gaze, want, .08);
        gx = x - 5 * S + gaze; sh.play('idle'); sh.face = a.face;
        if (timer <= 0) { st = 'away'; const far = x - r.l > r.r - x ? r.l + sh.w : r.r - sh.w; sh._to = far; sh.cv.style.opacity = '.85'; }
      } else if (st === 'away') {
        a.play('idle'); sh.play('walk'); sh.face = sh._to > gx ? 1 : -1; gx += sh.face * 85 * S * dt;
        if (Math.abs(gx - sh._to) < 4 * S) { st = 'notice'; timer = .9; a.play('look'); a.say('?', 900); a.face = sh._to > x ? 1 : -1; }
      } else if (st === 'notice') { a.play('look'); sh.play('idle'); if (timer <= 0) st = 'chase'; }
      else if (st === 'chase') {
        a.play('walk'); a.face = gx > x ? 1 : -1; x += a.face * 120 * S * dt;
        if (chance(dt * .8)) { sh.face *= -1; gx += sh.face * 14 * S; }
        gx = clamp(gx, r.l + sh.w / 2, r.r - sh.w / 2);
        if (Math.abs(gx - x) < 12 * S) { st = 'caught'; timer = 1; a.play('happy'); a.say('heart', 900); sh.cv.style.opacity = '.62'; }
      } else if (st === 'caught') {
        gx = lerp(gx, x - 5 * S, .3); sh.play('idle');
        if (timer <= 0) st = 'return';
      } else if (st === 'return') {
        a.face = s.x > x ? 1 : -1; a.play('walk'); x += a.face * 60 * S * dt; gx = x - 5 * S * a.face; sh.face = a.face; sh.play('walk');
        if (Math.abs(x - s.x) < 3 * S) { x = s.x; st = 'home'; timer = rnd(6, 9); a.face = 1; }
      }
      a.x = x; a.y = s.y; sh.x = gx; sh.y = s.y;
    },
    poke(e, c) {
      if (c === sh) { if (st === 'away' || st === 'notice') { st = 'caught'; timer = .6; sh.cv.style.opacity = '.62'; } return; }
      a.say('heart', 800);
      if (st === 'home') timer = Math.min(timer, .5);
    }
  };
});
