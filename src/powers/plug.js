/* PLUG: an offline indicator with feelings. When the connection drops, a little power
 * plug slides into the corner, unplugged and sad, sparks fizzing off its prongs, with a
 * note saying you're offline. When the connection comes back, a socket pops up, Plug
 * hops in with a zap, says so, and slides away again.
 *
 *   <piix-pal pal="plug"></piix-pal>
 *   always     stay in the corner (happily plugged in) even when online
 *   Events: piix:offline, piix:online */

/* the plug: a rounded body with a face, two brass prongs, and a curly cable */
const plugShape = (face, by = 0) => {
  let rows = art.paint(16, 12, (x, y) => {
    const yy = y - by;
    if (art.rrect(x, yy, 3, 2, 11, 10, 3)) return 'b';
    return null;
  });
  rows = art.outline(art.volume(rows));
  rows = art.compose(rows, [13, 4 + by, ['yyy']], [13, 8 + by, ['yyy']]);
  rows = art.compose(rows, [0, 7 + by, ['qq_']], [0, 8 + by, ['_q']], [1, 9 + by, ['qq']]);
  const F = {
    sad: [[5, 5 + by, ['e_e']].map((v, i) => i ? v : 5), [9, 5 + by, ['e_e']], [6, 8 + by, ['_ee_'.slice(0, 4)]], [6, 9 + by, ['e__e']]],
    happy: [[5, 5 + by, ['_e_', 'e_e']], [9, 5 + by, ['_e_', 'e_e']], [6, 8 + by, ['e__e', '_ee_']]],
    zap: [[5, 5 + by, ['eee']], [9, 5 + by, ['eee']], [7, 8 + by, ['ee', 'ee']]]
  }[face];
  rows = art.compose(rows, ...F);
  if (face === 'sad') rows = art.compose(rows, [12, 2 + by, ['t', 't']]);
  return rows;
};

/* Plug: sad and sparking, zapped, and happily plugged in */
defineSprite('plug', {
  w: 16, h: 12, scale: 3, does: 'offline',
  palette: { k: '#17121f', b: '#f3f0fa', d: '#c9c3d6', B: '#ffffff', y: '#ffd23f', q: '#7d768a', e: '#17121f', t: '#58c8ff' },
  frames: { sad: [plugShape('sad'), plugShape('sad', -1)], zap: [plugShape('zap')], happy: [plugShape('happy'), plugShape('happy', -1)] },
  fps: { sad: 1.5, happy: 4 }
});

/* the wall socket it plugs into (crew only) */
defineSprite('_socket', {
  w: 9, h: 12, scale: 3,
  palette: { k: '#17121f', w: '#fffdf5', W: '#e2dccb', s: '#3a3247' },
  frames: { idle: [['.kkkkkkk.', 'kwwwwwwwk', 'kwwwwwwwk', 'kwssswwwk', 'kwwwwwwwk', 'kwwwwwwwk', 'kwwwwwwwk', 'kwssswwwk', 'kwwwwwwwk', 'kWWWWWWWk', '.kkkkkkk.', '.........']] }
});

/* sparks: little yellow pixels that fizz off the prongs */
const plugSpark = (layer, x, y, S) => {
  const d = document.createElement('div');
  const s = Math.round(2 * S + Math.random() * 2 * S);
  d.style.cssText = `position:absolute;left:0;top:0;width:${s}px;height:${s}px;background:${pick(['#ffd23f', '#ffffff', '#ff9a2f'])};pointer-events:none`;
  layer.appendChild(d);
  return { d, x, y, vx: rnd(-60, 160) * S, vy: -rnd(40, 160) * S, life: rnd(.25, .5) };
};

/* offline: show up when the connection drops, plug back in when it returns */
defineBehavior('offline', (a, targets, host) => {
  const S = a.s / 3;
  const boxEl = boxOf(host);
  const area = areaOf(host, a);
  const always = host.hasAttribute('always');
  const socket = recruit(a, '_socket');
  if (!boxEl) pin(socket);
  const sparks = [];
  let state = navigator.onLine === false ? 'out' : always ? 'home' : 'gone', t = 0, x = 0, card = null, sparkT = 0, said = false;
  const note = (title, text) => {
    if (card) uiClose(card);
    card = uiCard({ fixed: !boxEl, tip: true, width: 230, attrs: { role: 'status' } });
    card.append(uiEl('h4', { text: title }), uiEl('p', { text }));
    uiAnnounce(title + '. ' + text);
  };
  const offline = () => {
    if (state === 'out') return;
    state = 'out'; t = 0; said = false;
    host.dispatchEvent(new CustomEvent('piix:offline', { bubbles: true }));
  };
  const online = () => {
    if (state !== 'out') return;
    state = 'plug'; t = 0;
    host.dispatchEvent(new CustomEvent('piix:online', { bubbles: true }));
  };
  addEventListener('offline', offline);
  addEventListener('online', online);

  return {
    crew: [socket],
    boxed: true,
    awake: () => state !== 'gone' || !!card || sparks.length > 0,
    tick(dt) {
      const r = area(), R = reduced();
      t += dt;
      const home = r.l + 30 * S + a.w / 2, y = r.b - 14 * S;
      const off = r.l - a.w;
      if (state === 'gone') { a.node.style.opacity = '0'; socket.node.style.opacity = '0'; }
      else if (state === 'home') {
        a.node.style.opacity = ''; socket.node.style.opacity = '';
        x = home; socket.x = x + a.w * .62; socket.y = y; a.play('happy');
      } else if (state === 'out') {
        /* slide in unplugged, then sit there sparking */
        a.node.style.opacity = ''; socket.node.style.opacity = '0';
        x = R ? home : lerp(t < .05 ? off : x, home, 1 - Math.exp(-6 * dt));
        a.play('sad');
        if (!said && t > .35) { said = true; note('You’re offline', 'Check your connection. Things will pick up where they left off.'); }
        sparkT -= dt;
        if (sparkT <= 0 && !R) { sparkT = rnd(.4, 1.2); for (let i = 0; i < 4; i++) sparks.push(plugSpark(a.node.parentNode, a.x + a.w * .45, a.y - a.h * .45, S)); a.play('zap'); }
      } else if (state === 'plug') {
        /* a socket pops up; Plug hops into it with a zap */
        socket.node.style.opacity = '';
        const sx = home + a.w * .62;
        socket.x = sx; socket.y = y; socket.sy = Math.min(1, t * 4);
        const k = Math.min(1, t / (R ? .01 : .6));
        x = lerp(home, sx - socket.w * .5 - a.w * .35, k);
        a.oy = -Math.sin(Math.PI * k) * 26 * S;
        a.play(k < 1 ? 'zap' : 'happy');
        if (k >= 1 && t < 1.2 && !card._back) { note('Back online', 'All plugged in again.'); card._back = true; a.say('check', 1200); for (let i = 0; i < 8; i++) sparks.push(plugSpark(a.node.parentNode, x + a.w * .4, y - a.h * .4, S)); }
        if (t > 3) { state = always ? 'home' : 'leave'; t = 0; if (card) { uiClose(card); card = null; } }
      } else if (state === 'leave') {
        x -= 220 * S * dt; socket.x -= 220 * S * dt;
        if (x < off) { state = 'gone'; a.node.style.opacity = '0'; socket.node.style.opacity = '0'; }
      }
      a.x = x; a.y = y;
      if (state !== 'plug') a.oy = 0;
      if (card) uiPlace(card, a.x + a.w * .3, a.y - a.h - 4, boxEl ? { area: rectOf(boxEl) } : {});
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt; s.vy += 600 * S * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        const ox = a.pinned ? 0 : 0;
        s.d.style.position = a.pinned ? 'fixed' : 'absolute';
        s.d.style.transform = `translate3d(${Math.round(s.x - origin.x + ox)}px,${Math.round(s.y - origin.y)}px,0)`;
        s.d.style.opacity = Math.max(0, s.life * 3).toFixed(2);
        if (s.life <= 0) { s.d.remove(); sparks.splice(i, 1); }
      }
    },
    /* for demos and tests: pretend the connection changed */
    offline, online,
    poke() { a.say(state === 'out' ? 'sweat' : 'heart', 700); },
    destroy() { removeEventListener('offline', offline); removeEventListener('online', online); if (card) card.remove(); sparks.forEach(s => s.d.remove()); }
  };
});
