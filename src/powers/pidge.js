/* PIDGE: a pigeon that delivers your toast notifications.
 *
 *   Piixpal.toast('Saved!')                                   anywhere, no markup needed
 *   Piixpal.toast('Could not save', { type: 'error' })        ok | error | info
 *   Piixpal.toast('New message', { title: 'Mia', time: 6000 }) time 0 = until dismissed
 *
 * It flies in with an envelope, the note pops open in the corner, and it perches on top
 * of the pile until every note is read, then flies off. Hovering a note pauses it.
 * <piix-pal pal="pidge" box="…"> gives you a pigeon for one area: el.ctl.toast(…) */
(() => {
  const W = 16, H = 12;
  const bird = ({ hx = 0, hy = 0, wing = 'fold', feet = true }) => {
    let rows = art.paint(W, H, (x, y) => {
      if (art.ellipse(x, y, 12 + hx, 3 + hy, 2.3, 2.2)) return 'g';                     /* head */
      if (art.ellipse(x, y, 10.6 + hx * .5, 5.4 + hy * .5, 2.2, 1.9)) return (x + y) % 2 ? 't' : 'v';   /* shiny neck */
      if (wing === 'up' && art.ellipse(x, y, 6.5, 2.6, 3.6, 2.3)) return x < 5 ? 'G' : 'w';
      if (wing === 'down' && art.ellipse(x, y, 6.5, 9.6, 3.4, 1.8)) return x < 5 ? 'G' : 'w';
      if (art.ellipse(x, y, 7, 6.8, 5.4, 3)) {
        if (wing === 'fold' && art.ellipse(x, y, 6.4, 6.4, 3.4, 1.7)) return y === 6 && x > 4 && x < 9 ? 'w' : 'G';
        if (wing === 'mid' && y >= 6 && y <= 7 && x > 1) return 'G';
        return y > 7 ? 'w' : 'g';
      }
      if (x <= 2 && y >= 6 && y <= 8 && y - 6 <= 2 - x * .7) return 'G';                   /* tail */
      return null;
    });
    rows = art.outline(rows);
    rows = art.compose(rows, [12 + hx, 2 + hy, ['o']], [14 + hx, 3 + hy, ['bb']]);
    if (feet) rows = art.compose(rows, [6, 10, ['f__f']], [6, 11, ['f__f']]);
    return rows;
  };
  const PAL = { k: '#17121f', g: '#9aa3b5', G: '#6c7590', w: '#d4d9e4', t: '#33b89a', v: '#8a5fc4', o: '#ff9a2f', b: '#3a3f4f', f: '#ff8fa3' };
  defineSprite('pidge', {
    w: W, h: H, scale: 3, does: 'courier',
    palette: PAL,
    frames: {
      idle: [bird({}), bird({}), bird({ hx: 1 }), bird({})],
      peck: [bird({ hx: 1, hy: 2 }), bird({ hx: 1, hy: 3 })],
      fly: [bird({ wing: 'up', feet: false }), bird({ wing: 'mid', feet: false }), bird({ wing: 'down', feet: false }), bird({ wing: 'mid', feet: false })]
    },
    fps: { idle: 2, peck: 8, fly: 12 }
  });
  /* the envelope it carries (crew only) */
  defineSprite('_note', {
    w: 9, h: 7, scale: 3,
    palette: { k: '#17121f', w: '#fffdf5', W: '#e9e2d0', r: '#ff4d6d' },
    frames: { idle: [['kkkkkkkkk', 'kkwwwwwkk', 'kwkwwwkwk', 'kwwkwkwwk', 'kwwwkwwrk', 'kWWWWWWWk', 'kkkkkkkkk']] }
  });
})();

/* courier: flies notes in, perches on the pile, flies off when it's read */
const PIDGE_CSS = `
.toast{transition:top .25s cubic-bezier(.2,.8,.2,1);padding-right:34px}
.toast .ic{align-items:flex-start}
.toast .ic > div{min-width:0;overflow-wrap:anywhere}
.toast b{display:block;margin-bottom:1px}
.toast.ok{--tone:#2fa36b}.toast.error{--tone:#e5484d}.toast.info{--tone:#6b4cff}
.toast::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--tone,#1b1226)}`;
defineBehavior('courier', (a, targets, host) => {
  const S = a.s / 3;
  const boxEl = boxOf(host);
  const area = areaOf(host, a);
  uiStyle('toast', PIDGE_CSS);
  const note = recruit(a, '_note');
  if (!boxEl) pin(note);
  const cards = [], queue = [];
  let state = 'away', t = 0, from = null, to = null, peckT = rnd(2, 5), dropT = 0;
  a.node.style.opacity = '0'; note.node.style.opacity = '0';

  const perch = () => {
    const r = area();
    const top = cards.length ? cards[cards.length - 1] : null;
    if (!top) return { x: r.r - 60 * S, y: r.b - 20 * S };
    return { x: top._x + top.offsetWidth - 38 * S, y: top._y };
  };
  /* stack the notes in the bottom-right corner, newest at the bottom */
  const layout = () => {
    const r = area();
    let y = r.b - 14;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const w = c.offsetWidth, h = c.offsetHeight;
      y -= h;
      c._x = Math.max(r.l + 8, r.r - 14 - w); c._y = y;
      uiAt(c, c._x, c._y);
      y -= 10;
    }
  };
  const close = c => {
    const i = cards.indexOf(c);
    if (i < 0) return;
    cards.splice(i, 1);
    uiClose(c);
    if (!cards.length && !queue.length) fly('out');
  };
  const deliver = m => {
    const c = uiCard({ fixed: !boxEl, cls: 'toast ' + m.type, width: 300, attrs: { role: m.type === 'error' ? 'alert' : 'status' } });
    c.append(
      uiEl('div', { cls: 'ic' }, uiIcon(m.type === 'error' ? 'x' : m.type === 'ok' ? 'check' : '!', 3),
        uiEl('div', {}, m.title ? uiEl('b', { text: m.title }) : null, uiEl('span', { text: m.msg }))),
      uiEl('button', { cls: 'x', text: '×', attrs: { type: 'button', 'aria-label': 'Dismiss' }, on: { click: () => close(c) } })
    );
    c._until = m.time > 0 ? now() + m.time : Infinity;
    c.addEventListener('pointerenter', () => { c._hover = now(); });
    c.addEventListener('pointerleave', () => { if (c._hover && c._until !== Infinity) c._until += now() - c._hover; c._hover = 0; });
    cards.unshift(c);
    layout();
    uiAnnounce((m.title ? m.title + ': ' : '') + m.msg);
  };
  const fly = to2 => {
    if (to2 === 'in') {
      const r = area();
      from = state === 'away' ? { x: r.r + 40 * S, y: r.b - 150 * S } : { x: a.x, y: a.y };
      state = 'in'; t = 0;
      a.node.style.opacity = ''; note.node.style.opacity = '';
    } else { from = { x: a.x, y: a.y }; state = 'out'; t = 0; }
  };
  const toast = (msg, opts = {}) => {
    const m = { msg: String(msg), type: ['ok', 'error', 'info'].includes(opts.type) ? opts.type : 'info', title: opts.title || '', time: opts.time != null ? +opts.time : 4200 };
    if (state === 'perch') { deliver(m); dropT = .3; a.say('note', 500); }
    else { queue.push(m); if (state !== 'in') fly('in'); }
    return m;
  };
  host._pending && host._pending.splice(0).forEach(([m, o]) => toast(m, o));

  return {
    crew: [note],
    boxed: true,
    awake: () => true,
    toast,
    clear() { cards.slice().forEach(close); },
    tick(dt) {
      const R = reduced();
      /* notes time out (not while hovered) */
      for (const c of cards.slice()) if (!c._hover && now() > c._until) close(c);
      if (cards.length) layout();
      t += dt;
      if (state === 'in') {
        to = cards.length ? perch() : (() => { const r = area(); return { x: r.r - 70 * S, y: r.b - 24 * S }; })();
        const k = R ? 1 : Math.min(1, t / .6), e = 1 - Math.pow(1 - k, 3);
        a.x = lerp(from.x, to.x, e); a.y = lerp(from.y, to.y, e) - Math.sin(Math.PI * k) * 40 * S;
        a.face = to.x < from.x ? -1 : 1;
        a.play('fly');
        note.x = a.x; note.y = a.y + note.h + 2 * S; note.node.style.opacity = '';
        if (k >= 1) {
          state = 'perch'; note.node.style.opacity = '0';
          queue.splice(0).forEach(deliver);
          a.sy = .8; a.sx = 1.2;
        }
      } else if (state === 'out') {
        const r = area();
        const k = R ? 1 : Math.min(1, t / .7), e = k * k;
        a.x = lerp(from.x, r.r + 50 * S, e); a.y = lerp(from.y, r.t + 30 * S, e);
        a.face = 1; a.play('fly');
        if (k >= 1) { state = 'away'; a.node.style.opacity = '0'; }
      } else if (state === 'perch') {
        const p = perch();
        a.x = lerp(a.x, p.x, R ? 1 : .3); a.y = lerp(a.y, p.y, R ? 1 : .3);
        a.face = -1;
        dropT -= dt; peckT -= dt;
        if (dropT > 0) a.oy = -Math.sin(Math.PI * dropT / .3) * 8 * S; else a.oy = 0;
        if (peckT < 0) { a.play('peck', { loop: false, reset: true }); peckT = rnd(2.5, 6); }
        else if (a.clip !== 'peck' || a.done) a.play('idle');
      }
      a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
    },
    poke() { if (state === 'perch') { a.say('heart', 700); dropT = .3; } },
    destroy() { cards.slice().forEach(c => c.remove()); cards.length = 0; }
  };
});

/* Piixpal.toast(msg, opts): uses a page-wide pigeon, making one the first time */
Piixpal.toast = (msg, opts) => {
  let el = [...document.querySelectorAll('piix-pal[pal=pidge]')].find(e => !e.hasAttribute('box'));
  if (!el) { el = document.createElement('piix-pal'); el.setAttribute('pal', 'pidge'); document.body.appendChild(el); }
  if (el.ctl && el.ctl.toast) return el.ctl.toast(msg, opts);
  (el._pending = el._pending || []).push([msg, opts]);
};
