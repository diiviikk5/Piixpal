/* SCOUT: an onboarding tour guide. Scout hops from element to element, stands on each
 * one and holds up its flag while a spotlight and a card explain what it's for.
 *
 *   <button data-tour="Start a new project here">New</button>   mark the stops…
 *   <input data-tour="Search everything" data-tour-step="2">     (ordered by data-tour-step, then the page)
 *   <piix-pal pal="scout"></piix-pal>                             …and click Scout to begin
 *
 *   steps="#new: Start here | #search: Find anything"   or list the stops on the tag
 *   start="auto"     begin by itself, once per visitor
 *   el.ctl.start([{ el, text, title }])   el.ctl.end()
 *   Keyboard: → next, ← back, Esc ends. Events: piix:tour-step { index, total }, piix:tour-end { done } */

/* the explorer from the hat down: pith helmet, brim, face, backpack, shirt and belt */
const scoutShape = by => art.outline(art.paint(17, 17, (x, y) => {
  const yy = y - by;
  if (art.ellipse(x, yy, 7.5, 3.6, 4.7, 2.7) && yy <= 4) return 'h';
  if (yy === 5 && x >= 2 && x <= 13) return 'H';
  if (art.ellipse(x, yy, 7.5, 7.6, 3.7, 2.6)) return 'f';
  if (x >= 2 && x <= 4 && yy >= 9 && yy <= 13) return 'b';
  if (x >= 5 && x <= 10 && yy >= 10 && yy <= 13) return yy === 12 ? 'B' : 'g';
  return null;
}));

/* eyes and rosy cheeks: open, shut, or happy little arches */
const scoutFace = (rows, by, eyes) => {
  const ey = 7 + by;
  if (eyes === 'happy') rows = art.compose(rows, [7, ey, ['_e_', 'e_e']], [10, ey, ['_e_', 'e_e']]);
  else if (eyes === 'shut') rows = art.compose(rows, [8, ey + 1, ['e']], [10, ey + 1, ['e']]);
  else rows = art.compose(rows, [8, ey, ['e', 'e']], [10, ey, ['e', 'e']]);
  return art.compose(rows, [6, ey + 2, ['p']], [11, ey + 2, ['p']]);
};

/* boots: standing still, and the three steps of a walk */
const SCOUT_LEGS = { stand: [[6, 14], [9, 14]], a: [[5, 14], [10, 13]], b: [[7, 14], [8, 14]], c: [[6, 13], [10, 14]] };

/* the flag on its pole: down at the side, or held up high, flapping three ways */
const scoutFlag = (rows, by, flag, arm) => {
  const px = 13, top = arm ? 0 : 6;
  for (let y = top; y <= 13; y++) rows = art.put(rows, px, y + by, ['q']);
  const cloth = [['rrr', 'rrrr', 'rr'], ['rrrr', 'rrr', 'rr'], ['rrr', 'rrr', 'r']][flag];
  rows = art.compose(rows, ...cloth.map((r, i) => [px + 1, top + i + by, [r]]));
  return arm ? art.put(rows, 11, 9 + by, ['gk']) : rows;
};

/* one whole frame */
const scoutFrame = ({ by = 0, legs = 'stand', flag = 0, arm = false, eyes = 'open' }) => {
  let rows = scoutFace(scoutShape(by), by, eyes);
  for (const [lx, ly] of SCOUT_LEGS[legs]) rows = art.put(rows, lx, ly + by, ['kk', 'kk'].slice(0, 16 - ly - by));
  return scoutFlag(rows, by, flag, arm);
};

/* Scout: idles with a flapping flag, walks, points the flag at things, cheers at the end */
defineSprite('scout', {
  w: 17, h: 17, scale: 3, does: 'tour',
  palette: { k: '#17121f', q: '#7d768a', h: '#e8d48a', H: '#b89a48', f: '#ffd9b5', e: '#17121f', p: '#ff9fb5', b: '#a0673a', g: '#6fa35a', B: '#4a3a24', r: '#ff4d6d' },
  frames: {
    idle: [scoutFrame({ flag: 0 }), scoutFrame({ flag: 1 }), scoutFrame({ flag: 2, eyes: 'shut' }), scoutFrame({ flag: 1 })],
    walk: [scoutFrame({ legs: 'a', by: -1, flag: 1 }), scoutFrame({ legs: 'b', flag: 2 }), scoutFrame({ legs: 'c', by: -1, flag: 1 }), scoutFrame({ legs: 'b', flag: 0 })],
    point: [scoutFrame({ arm: true, flag: 0 }), scoutFrame({ arm: true, flag: 1 }), scoutFrame({ arm: true, flag: 2 })],
    happy: [scoutFrame({ arm: true, flag: 1, eyes: 'happy' }), scoutFrame({ arm: true, flag: 2, eyes: 'happy', by: -1 })]
  },
  fps: { idle: 2.5, walk: 10, point: 6, happy: 6 }
});

/* where the stops come from: a list from code, the steps="" attribute, or data-tour attributes */
const scoutStops = (list, host, boxEl) => {
  if (list) return list.map(s => ({ el: typeof s.el === 'string' ? document.querySelector(s.el) : s.el, text: s.text || '', title: s.title || '' })).filter(s => s.el);
  const attr = host.getAttribute('steps');
  if (attr) return attr.split('|').map(p => {
    const k = p.indexOf(': ');
    let e = null;
    try { e = document.querySelector(p.slice(0, k).trim()); } catch (_) { /* bad selector */ }
    return { el: e, text: p.slice(k + 2).trim() };
  }).filter(s => s.el && s.text);
  return [...(boxEl || document).querySelectorAll('[data-tour]')]
    .map((e, n) => ({ el: e, text: e.getAttribute('data-tour'), title: e.getAttribute('data-tour-title') || '', o: +e.getAttribute('data-tour-step') || 1e6 + n }))
    .sort((p, q) => p.o - q.o);
};

/* where to stand on a stop: its top (the letters, for text), near its left */
const scoutSpot = (e, a, S) => {
  const sf = TEXTY.test(e.tagName) ? surfaceOf(e) : null, r = rectOf(e);
  return { x: clamp(r.l + Math.min(r.w * .5, 70 * S), r.l + a.w / 2, Math.max(r.l + a.w / 2, r.r - a.w / 2)), y: sf ? sf.t : r.t };
};

/* the dimmed spotlight: a veil over the page (or box) with a hole cut around the stop */
const scoutVeil = (veil, hole, boxEl) => {
  let V, o;
  if (boxEl) { const b = boxEl.getBoundingClientRect(); V = { l: b.left, t: b.top, w: b.width, h: b.height }; o = { x: b.left + scrollX - origin.x, y: b.top + scrollY - origin.y }; }
  else { V = { l: 0, t: 0, w: docW(), h: innerHeight }; o = { x: 0, y: 0 }; }
  veil.style.width = V.w + 'px'; veil.style.height = V.h + 'px';
  veil.style.transform = `translate3d(${Math.round(o.x)}px,${Math.round(o.y)}px,0)`;
  const L = Math.max(0, hole.l - V.l), T = Math.max(0, hole.t - V.t), R = Math.min(V.w, hole.r - V.l), B = Math.min(V.h, hole.b - V.t);
  veil.style.clipPath = `polygon(evenodd,0 0,${V.w}px 0,${V.w}px ${V.h}px,0 ${V.h}px,0 0,${L}px ${T}px,${R}px ${T}px,${R}px ${B}px,${L}px ${B}px,${L}px ${T}px)`;
};

/* the card for one stop: step count, words, Skip / Back / Next */
const scoutCard = (s, i, n, go, end) => {
  const card = uiCard({ tip: true, width: 290, attrs: { role: 'dialog', 'aria-label': `Tour, step ${i + 1} of ${n}` } });
  const next = uiEl('button', { text: i + 1 < n ? 'Next' : 'Done', attrs: { type: 'button' }, on: { click: () => go(1) } });
  card.append(...[
    uiEl('h4', { text: `Step ${i + 1} of ${n}` }),
    s.title ? uiEl('b', { text: s.title, style: 'display:block;margin-bottom:3px' }) : null,
    uiEl('p', { text: s.text }),
    uiEl('div', { cls: 'row' },
      uiEl('button', { cls: 'ghost', text: 'Skip', attrs: { type: 'button' }, style: 'margin-right:auto', on: { click: () => end(false) } }),
      i > 0 ? uiEl('button', { cls: 'ghost', text: 'Back', attrs: { type: 'button' }, on: { click: () => go(-1) } }) : null,
      next)
  ].filter(Boolean));
  card.style.visibility = 'hidden';
  setTimeout(() => { try { next.focus({ preventScroll: true }); } catch (_) { /* old browsers */ } }, 60);
  return card;
};

/* tour: hop from stop to stop, spotlight each one, explain it on a card */
defineBehavior('tour', (a, [el], host) => {
  const S = a.s / 3;
  const boxEl = boxOf(host);
  let steps = [], i = -1, card = null, from = null, hopT = 1, hole = null, homeAt = null, lastFocus = null;
  const veil = document.createElement('div');
  veil.setAttribute('aria-hidden', 'true');
  veil.style.cssText = `position:${boxEl ? 'absolute' : 'fixed'};left:0;top:0;width:0;height:0;background:rgba(23,18,31,.46);pointer-events:none;opacity:0;transition:opacity .25s`;
  a.node.parentNode.insertBefore(veil, a.node.parentNode.firstChild.nextSibling);
  const home = () => {
    const r = surfaceOf(el) || rectOf(el), at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .5;
    return { x: r.l + (r.r - r.l) * at, y: r.t };
  };
  const show = () => {
    const s = steps[i];
    if (!s) return end(true);
    if (!boxEl) {
      const r = s.el.getBoundingClientRect();
      if (r.top < 80 || r.bottom > innerHeight - 80) s.el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
    }
    from = { x: a.x, y: a.y }; hopT = 0;
    if (card) uiClose(card);
    card = scoutCard(s, i, steps.length, go, end);
    uiAnnounce(`Step ${i + 1} of ${steps.length}. ${s.title ? s.title + '. ' : ''}${s.text}`);
    host.dispatchEvent(new CustomEvent('piix:tour-step', { bubbles: true, detail: { index: i, total: steps.length, target: s.el } }));
  };
  const go = d => { i = Math.max(0, i + d); show(); };
  const start = list => {
    steps = scoutStops(list, host, boxEl);
    if (!steps.length) { a.say('?', 900); return; }
    if (i < 0) lastFocus = document.activeElement;
    i = 0; veil.style.opacity = '1'; show();
  };
  const end = done => {
    if (i < 0) return;
    i = -1; uiClose(card); card = null; veil.style.opacity = '0'; hole = null;
    from = { x: a.x, y: a.y }; hopT = 0;
    if (done) a.say('star', 1400);
    try { localStorage.setItem('piix-tour:' + location.pathname, '1'); } catch (_) { /* private mode */ }
    host.dispatchEvent(new CustomEvent('piix:tour-end', { bubbles: true, detail: { done } }));
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (_) { /* gone */ }
  };
  const kd = e => {
    if (i < 0 || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === 'Escape') { e.preventDefault(); end(false); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); go(-1); }
  };
  addEventListener('keydown', kd);
  let auto = host.getAttribute('start') === 'auto';
  try { if (auto && localStorage.getItem('piix-tour:' + location.pathname)) auto = false; } catch (_) { /* private mode */ }
  let autoT = auto ? 1.2 : -1;

  return {
    awake: () => i >= 0 || hopT < 1,
    start, end, next: () => go(1), back: () => go(-1),
    tick(dt) {
      if (autoT > 0) { autoT -= dt; if (autoT <= 0) start(); }
      const want = i >= 0 && steps[i] ? scoutSpot(steps[i].el, a, S) : home();
      if (!homeAt) { homeAt = want; a.x = want.x; a.y = want.y; }
      if (hopT < 1) {
        hopT = Math.min(1, hopT + dt / (reduced() ? .01 : .55));
        const e = hopT < .5 ? 2 * hopT * hopT : 1 - Math.pow(-2 * hopT + 2, 2) / 2;
        a.x = lerp(from.x, want.x, e);
        a.y = lerp(from.y, want.y, e) - Math.sin(Math.PI * hopT) * Math.max(30 * S, Math.abs(want.x - from.x) * .25);
        a.face = want.x < from.x ? -1 : 1;
        a.play('walk');
        if (hopT >= 1) { a.sy = .8; a.sx = 1.2; }
      } else {
        a.x = want.x; a.y = want.y;
        a.play(i >= 0 ? 'point' : 'idle');
        if (i < 0 && ptr.seen && a.near(30 * S)) a.say('?', 600);
      }
      a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
      if (i >= 0 && steps[i]) {
        const r = steps[i].el.getBoundingClientRect(), pad = 8;
        const tgt = { l: r.left - pad, t: r.top - pad, r: r.right + pad, b: r.bottom + pad };
        hole = hole && !reduced() ? { l: lerp(hole.l, tgt.l, .25), t: lerp(hole.t, tgt.t, .25), r: lerp(hole.r, tgt.r, .25), b: lerp(hole.b, tgt.b, .25) } : tgt;
        scoutVeil(veil, hole, boxEl);
        if (card) {
          /* above Scout if it fits, otherwise under the stop, never off the edge of the box */
          const B = boxEl ? rectOf(boxEl) : { l: scrollX, r: scrollX + docW(), t: scrollY, b: scrollY + innerHeight };
          const above = a.y - a.h - 4 * S, tr = rectOf(steps[i].el);
          if (above - card.offsetHeight - 12 >= B.t) uiPlace(card, a.x, above, { area: B });
          else uiPlace(card, a.x, tr.b + 2, { below: true, area: B });
          card.style.visibility = '';
        }
      }
    },
    poke() { if (i < 0) start(); else go(1); },
    destroy() { removeEventListener('keydown', kd); veil.remove(); if (card) card.remove(); }
  };
});
