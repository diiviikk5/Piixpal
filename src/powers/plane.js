/* PLANE: a little propeller plane that tows your announcement across the top of the
 * page, banner waving behind it. The banner is a real link: hover it and the plane
 * hangs about so you can click.
 *
 *   <piix-pal pal="plane" text="v2 is out! Read the post →" href="/blog/v2"></piix-pal>
 *
 *   text      what the banner says
 *   href      makes the banner a link
 *   top       px from the top of the screen (or box)        default 90
 *   repeat    seconds between passes; 0 = fly once            default 0
 *   always    fly on every visit (default: once per browser session)
 *
 * Click the plane for a loop-the-loop. el.ctl.fly() sends it round again. */
(() => {
  const W = 22, H = 12;
  const plane = prop => {
    let rows = art.paint(W, H, (x, y) => {
      if (x >= 2 && x <= 4 && y >= 1 && y <= 5 && y >= 5 - (x - 1) * 1.6) return 'r';            /* tail fin */
      if (art.ellipse(x, y, 11, 6, 8.6, 2.4)) return y < 5 ? 'r' : y === 5 ? 'w' : 'R';           /* fuselage */
      if (y >= 7 && y <= 8 && x >= 8 && x <= 14) return 'R';                                      /* wing */
      if (art.ellipse(x, y, 11.5, 3.2, 1.7, 1.5)) return y < 3 ? 'h' : 'h';                         /* pilot */
      return null;
    });
    rows = art.outline(rows);
    rows = art.compose(rows, [11, 3, ['gg']], [10, 9, ['k__k']], [10, 10, ['k__k']]);
    rows = art.compose(rows, prop ? [20, 3, ['p', 'p', 'k', 'p', 'p', 'p']] : [20, 5, ['p', 'k', 'p']]);
    return rows;
  };
  defineSprite('plane', {
    w: W, h: H, scale: 3, does: 'banner',
    palette: { k: '#17121f', r: '#ff4d6d', R: '#c92a4b', w: '#fffdf5', h: '#ffd9b5', g: '#58c8ff', p: '#b9b3c4' },
    frames: { fly: [plane(true), plane(false)] },
    fps: { fly: 16 }
  });
})();

const PLANE_CSS = `
.banner{position:absolute;left:0;top:0;display:flex;align-items:center;height:30px;padding:0 14px 0 18px;white-space:nowrap;
  font:800 13px/1 ${UI_FONT};letter-spacing:.06em;text-transform:uppercase;color:${UI_INK};background:${UI_PAPER};text-decoration:none;
  border:3px solid ${UI_INK};border-left:0;box-sizing:border-box;height:34px;
  clip-path:polygon(0 0,100% 0,100% 100%,0 100%,6px 75%,0 50%,6px 25%);pointer-events:auto}
.banner.fixed{position:fixed}
a.banner:hover{background:#c6f432}
a.banner:focus-visible{outline:3px solid #6b4cff;outline-offset:3px}
.banner span{display:inline-block;white-space:pre}
.rope{position:absolute;left:0;top:0;height:2px;background:${UI_INK};transform-origin:0 50%;pointer-events:none}
.rope.fixed{position:fixed}`;
defineBehavior('banner', (a, targets, host) => {
  const S = a.s / 3;
  const boxEl = boxOf(host);
  const area = areaOf(host, a);
  uiStyle('banner', PLANE_CSS);
  const text = host.getAttribute('text') || 'Hello from Piixpal!';
  const href = host.getAttribute('href');
  const fixed = !boxEl;
  const flag = uiEl(href ? 'a' : 'span', { cls: 'banner' + (fixed ? ' fixed' : ''), attrs: href ? { href } : { role: 'note' } });
  const letters = [...text].map(ch => uiEl('span', { text: ch }));
  flag.append(...letters);
  const rope = uiEl('div', { cls: 'rope' + (fixed ? ' fixed' : ''), attrs: { 'aria-hidden': 'true' } });
  uiRoot().append(rope, flag);
  const key = 'piix-plane:' + text;
  let seen = false;
  try { seen = !host.hasAttribute('always') && !boxEl && sessionStorage.getItem(key) === '1'; } catch (_) { /* private mode */ }
  const repeat = +host.getAttribute('repeat') || 0;
  let x = 0, state = seen ? 'done' : 'wait', t = 0, wait = boxEl ? .4 : 1.2, loop = 0, hover = false, bw = 0, speed = 150 * S;
  flag.addEventListener('pointerenter', () => { hover = true; });
  flag.addEventListener('pointerleave', () => { hover = false; });
  flag.addEventListener('focus', () => { hover = true; });
  flag.addEventListener('blur', () => { hover = false; });
  const show = on => { a.node.style.opacity = on ? '' : '0'; flag.style.visibility = rope.style.visibility = on ? '' : 'hidden'; };
  show(false);
  const fly = () => {
    bw = flag.offsetWidth;
    const r = area();
    x = r.l - 40 * S - bw;
    state = 'fly'; t = 0; show(true);
    try { if (!boxEl) sessionStorage.setItem(key, '1'); } catch (_) { /* private mode */ }
  };

  return {
    boxed: true,
    awake: () => state !== 'done',
    fly,
    tick(dt) {
      const r = area();
      const top = r.t + (host.hasAttribute('top') ? +host.getAttribute('top') : boxEl ? 30 * S : 90);
      t += dt;
      if (state === 'wait') { wait -= dt; if (wait <= 0) fly(); return; }
      if (state === 'gap') { wait -= dt; if (wait <= 0) fly(); return; }
      if (state === 'done') return;
      if (reduced()) {
        /* no flying: park it at the right, banner beside it, for a while */
        a.x = r.r - a.w; a.y = top + a.h / 2; a.rot = 0;
        if (t > 8 && !hover) { state = repeat ? 'gap' : 'done'; wait = repeat; show(false); }
      } else {
        if (!hover) x += speed * dt * (loop > 0 ? 1.5 : 1);
        const bob = Math.sin(t * 2.2) * 5 * S;
        a.x = x + bw + 40 * S + a.w / 2;
        a.y = top + a.h / 2 + bob;
        if (loop > 0) {
          loop = Math.max(0, loop - dt / 1.1);
          const ang = (1 - loop) * Math.PI * 2;
          a.x += Math.sin(ang) * 30 * S; a.y -= (1 - Math.cos(ang)) * 30 * S;
          a.rot = -(1 - loop) * 360;
          if (!loop) a.rot = 0;
        } else a.rot = Math.cos(t * 2.2) * -3;
        if (x > r.r + 20) { state = repeat ? 'gap' : 'done'; wait = repeat; show(false); }
      }
      a.cv.style.transformOrigin = '50% 50%';
      a.play('fly');
      /* banner trails behind the tail; letters ripple */
      const tailX = a.x - a.w / 2 + 3 * S, tailY = a.y - a.h * .45;
      const fx = reduced() ? r.r - a.w * 1.5 - bw - 30 * S : x;
      const fy = (reduced() ? tailY : top + a.h * .2 + Math.sin(t * 2.2 - .6) * 5 * S) - 17;
      uiAt(flag, fx, fy);
      letters.forEach((s, i) => { s.style.transform = reduced() ? '' : `translateY(${(Math.sin(t * 7 - i * .55) * 2.2).toFixed(1)}px)`; });
      const rx = fx + bw, ry = fy + 17, dx = tailX - rx, dy = tailY - ry;
      uiAt(rope, rx, ry);
      rope.style.width = Math.max(0, Math.hypot(dx, dy)) + 'px';
      rope.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    },
    poke() { if (state === 'fly' && !loop) { loop = 1; a.say('!', 500); } },
    destroy() { flag.remove(); rope.remove(); }
  };
});
