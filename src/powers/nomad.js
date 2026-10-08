/* NOMAD: a little traveller who walks between your browser windows. Open your site in two
 * windows side by side and Nomad walks off the edge of one and into the other, right
 * where they meet. Close a window and Nomad moves to another one rather than get lost.
 * On its own it strolls along the bottom of the screen and peeks out at the edges.
 *
 *   <piix-pal pal="nomad"></piix-pal>
 *   el.ctl.invite()   opens a second window next to this one
 * Windows of the same site find each other with a BroadcastChannel. Event: piix:arrive, piix:depart */

/* the traveller: a woolly hat, a big backpack and a walking stick */
const nomadShape = (by, step, look) => {
  let rows = art.paint(15, 17, (x, y) => {
    const yy = y - by;
    if (art.ellipse(x, yy, 8, 2.6, 3.3, 2.1) && yy <= 3) return 'h';
    if (yy === 3 && x >= 4 && x <= 11) return 'H';
    if (art.ellipse(x, yy, 8, 6, 3.2, 2.6)) return 'f';
    if (x >= 2 && x <= 4 && yy >= 7 && yy <= 12) return yy === 9 ? 'B' : 'b';
    if (x >= 1 && x <= 5 && yy === 6) return 'r';
    if (x >= 5 && x <= 10 && yy >= 9 && yy <= 13) return 'c';
    return null;
  });
  rows = art.outline(rows);
  rows = art.compose(rows, [8 + look, 6 + by, ['e']], [10 + look, 6 + by, ['e']], [7, 8 + by, ['p']]);
  for (let y = 4; y <= 15; y++) rows = art.put(rows, 13, y + by, ['s']);
  const L = [[[6, 14], [9, 14]], [[5, 14], [10, 13]], [[7, 14], [8, 14]], [[6, 13], [10, 14]]][step];
  for (const [lx, ly] of L) rows = art.put(rows, lx, ly + by, ['kk', 'kk'].slice(0, 16 - ly - by));
  return rows;
};

/* Nomad: strolls, stops to look out, and waves hello when it arrives */
defineSprite('nomad', {
  w: 15, h: 17, scale: 3, does: 'roam',
  palette: { k: '#17121f', h: '#ff6b4a', H: '#c94a2f', f: '#ffd9b5', e: '#17121f', p: '#ff9fb5', b: '#58c8ff', B: '#2f8fc4', c: '#ffd23f', s: '#a0673a', r: '#7bd63a' },
  frames: {
    walk: [nomadShape(-1, 1, 0), nomadShape(0, 2, 0), nomadShape(-1, 3, 0), nomadShape(0, 2, 0)],
    idle: [nomadShape(0, 0, 0), nomadShape(0, 0, 1), nomadShape(0, 0, 1), nomadShape(0, 0, 0)],
    look: [nomadShape(0, 0, 1)]
  },
  fps: { walk: 7, idle: 1.5 }
});

/* where this window's page sits on the screen (the browser's frame is guessed, evenly) */
const nomadScreen = () => ({ x: screenX + Math.max(0, outerWidth - innerWidth) / 2, y: screenY + Math.max(0, outerHeight - innerHeight), w: innerWidth, h: innerHeight });

/* is there a window just past this edge? the nearest one that lines up wins */
const nomadNeighbour = (me, peers, dir) => {
  let best = null, bd = 1e9;
  for (const p of peers) {
    const r = p.rect;
    if (!r || r.y > me.y + me.h || r.y + r.h < me.y) continue;
    const gap = dir > 0 ? r.x - (me.x + me.w) : me.x - (r.x + r.w);
    if (gap < -80 || gap > 260) continue;
    if (Math.abs(gap) < bd) { best = p; bd = Math.abs(gap); }
  }
  return best;
};

/* roam: walk the floor of this window; at an edge, hand Nomad to the window over there */
defineBehavior('roam', (a, targets, host) => {
  const S = a.s / 3;
  const boxEl = boxOf(host);
  const area = areaOf(host, a);
  const id = Math.random().toString(36).slice(2, 10);
  const peers = new Map();
  /* has: Nomad belongs to this window now. vis: what we see it doing here */
  let has = false, vis = 'gone', x = 0, dir = 1, t = 0, pause = 0, sent = 0, handoff = null;
  const ch = 'BroadcastChannel' in window ? new BroadcastChannel('piix-nomad') : null;
  const rect = () => (host._screen || nomadScreen)();
  const say = msg => { if (ch) ch.postMessage(Object.assign({ from: id, boxed: !!boxEl }, msg)); };
  const hello = ask => say({ t: 'hi', rect: rect(), has, ask });
  const show = on => { a.node.style.opacity = on ? '' : '0'; };
  const enter = side => {
    const r = area();
    has = true; vis = 'walk'; dir = side === 'left' ? 1 : -1;
    x = side === 'left' ? r.l - a.w / 2 : r.r + a.w / 2;
    show(true); a.say('hi', 1000);
    host.dispatchEvent(new CustomEvent('piix:arrive', { bubbles: true }));
    hello();
  };
  const onMsg = e => {
    const m = e.data;
    if (!m || m.from === id) return;
    if (m.t === 'hi') {
      peers.set(m.from, { id: m.from, rect: m.rect, has: m.has, boxed: m.boxed, seen: now() });
      /* two windows holding Nomad at once (they woke together)? the older id keeps it */
      if (m.has && has && m.from < id) { has = false; vis = 'gone'; show(false); }
      if (!m.ask) hello(1);
    } else if (m.t === 'bye') peers.delete(m.from);
    else if (m.t === 'go' && m.to === id) { enter(m.side); say({ t: 'got', to: m.from }); }
    else if (m.t === 'got' && m.to === id) handoff = null;
  };
  if (ch) ch.addEventListener('message', onMsg);
  /* closing this window? Nomad moves on to another one */
  const bye = () => {
    if (has) { const p = [...peers.values()].sort((q, w) => w.seen - q.seen)[0]; if (p) say({ t: 'go', to: p.id, side: 'left' }); }
    say({ t: 'bye' });
  };
  addEventListener('pagehide', bye);
  show(false);
  hello();

  return {
    boxed: true,
    awake: () => true,
    /* open a second window just to the right of this one */
    invite() {
      const w = Math.round(Math.min(560, screen.availWidth / 2)), h = Math.round(Math.min(440, screen.availHeight * .6));
      const left = Math.round(Math.min(screen.availWidth - w, screenX + outerWidth)), top = Math.round(screenY + Math.max(0, outerHeight - h) / 2);
      window.open(host.getAttribute('window') || location.href, 'piix-nomad-' + id, `popup,width=${w},height=${h},left=${left},top=${top}`);
    },
    /* where things stand, for tests and the curious */
    info: () => ({ id, has, vis, x, dir, peers: [...peers.values()].map(p => ({ id: p.id, has: p.has, x: p.rect && p.rect.x })), handing: !!handoff }),
    tick(dt) {
      const r = area();
      t += dt; sent += dt;
      if (sent > .5) { sent = 0; hello(); }
      for (const [k, p] of peers) if (now() - p.seen > 2500) peers.delete(k);
      /* nobody holds Nomad? after a moment, the oldest window takes it */
      if (!has && !handoff && t > 1 && ![...peers.values()].some(p => p.has) && [...peers.keys()].every(k => k > id)) { enter('left'); x = r.l + a.w; }
      /* handed over but no reply (the other window closed)? it comes back */
      if (handoff && now() - handoff.at > 1200) { handoff = null; enter(dir > 0 ? 'right' : 'left'); }
      if (vis === 'walk') {
        x += dir * 48 * S * dt * (reduced() ? 2 : 1);
        a.face = dir; a.play('walk');
        const edge = dir > 0 ? r.r - a.w / 2 : r.l + a.w / 2;
        if ((dir > 0 && x >= edge) || (dir < 0 && x <= edge)) {
          /* the edge: is there a window over there? (in a box, any other window will do) */
          const list = [...peers.values()];
          const geo = !boxEl && list.every(p => !p.boxed);
          const next = geo ? nomadNeighbour(rect(), list, dir) : list.sort((p, q) => q.seen - p.seen)[0];
          if (next) {
            has = false; handoff = { at: now() }; vis = 'out';
            say({ t: 'go', to: next.id, side: dir > 0 ? 'left' : 'right' });
            hello();
            host.dispatchEvent(new CustomEvent('piix:depart', { bubbles: true }));
          } else { vis = 'peek'; pause = 1.4; x = edge; }
        }
      } else if (vis === 'peek') {
        pause -= dt; a.play('look'); a.face = dir;
        if (pause <= 0) { dir = -dir; vis = 'walk'; if (chance(.5)) a.say('...', 700); }
      } else if (vis === 'out') {
        /* walk out of sight; it's already the other window's turn */
        x += dir * 48 * S * dt; a.face = dir; a.play('walk');
        if ((dir > 0 && x > r.r + a.w / 2) || (dir < 0 && x < r.l - a.w / 2)) { vis = 'gone'; show(false); }
      }
      if (vis === 'gone') return;
      a.x = x; a.y = r.b - 4 * S;
      if (boxEl) a.node.style.opacity = clamp(Math.min(x - r.l, r.r - x) / (a.w * .6), 0, 1).toFixed(2);
    },
    poke() { a.say(peers.size ? 'heart' : '?', 900); },
    destroy() { bye(); removeEventListener('pagehide', bye); if (ch) { ch.removeEventListener('message', onMsg); ch.close(); } }
  };
});
