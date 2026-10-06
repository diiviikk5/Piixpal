/* captcha: guards an "I'm not a robot" checkbox. Sweats when the cursor comes near
 * the box, panics and flees when it's ticked, and sneaks back a few seconds later.
 * Put it inside the label/element that holds the checkbox. */
defineBehavior('captcha', (a, [el], host) => {
  const S = a.s / 3;
  const box = el.matches && el.matches('input[type=checkbox]') ? el : el.querySelector('input[type=checkbox]');
  const anchor = box || el;
  let state = 'sit', timer = 0, x = null, off = 0;
  const onChange = () => {
    if (box.checked) { state = 'flee'; timer = 2.6; a.say('!?', 800); }
    else { state = 'sit'; a.say('heart', 700); }
  };
  if (box) box.addEventListener('change', onChange);

  return {
    tick(dt) {
      const r = rectOf(el), b = rectOf(anchor);
      const home = clamp(b.r + a.w * .7, r.l + a.w / 2, r.r - a.w / 2);
      if (x == null) x = home;
      a.y = r.t;
      if (reduced()) { a.x = home; a.play('idle'); return; }
      timer -= dt;
      if (state === 'flee') {
        /* run off the far end and vanish */
        off += 160 * S * dt; a.face = 1; a.play('run');
        a.node.style.opacity = clamp(1 - off / (r.r - home + a.w), 0, 1).toFixed(2);
        if (timer <= 0) { state = 'return'; a.face = -1; }
      } else if (state === 'return') {
        off = Math.max(0, off - 50 * S * dt); a.play('run');
        a.node.style.opacity = clamp(1 - off / (r.r - home + a.w), 0, 1).toFixed(2);
        if (off <= 0) { state = 'sit'; a.face = 1; a.say('...', 1200); a.play('shy'); timer = 1.5; }
      } else {
        a.node.style.opacity = '1';
        const near = ptr.seen && ptrDist(b.l + b.w / 2, b.t + b.h / 2) < 70 * S && !(box && box.checked);
        if (near) { a.play('nervous'); if (chance(dt * 1.5)) a.say('sweat', 500); }
        else if (timer <= 0) a.play('idle');
      }
      a.x = home + off;
    },
    poke() { a.say(pick(['?', '...', '!']), 700); },
    destroy() { if (box) box.removeEventListener('change', onChange); }
  };
});
