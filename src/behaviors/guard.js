/* guard: sits on a form field and watches you type. Its eyes follow the caret,
 * it covers its eyes for passwords, cheers for valid input and sweats over invalid.
 * Put it inside an <input>'s wrapper, a <label> or a <form>; it finds the field. */
const caretCtx = document.createElement('canvas').getContext('2d');
defineBehavior('guard', (a, [el], host) => {
  const S = a.s / 3;
  const field = el.matches && el.matches('input,textarea') ? el : el.querySelector('input,textarea') || el;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .85;
  let mood = '', moodT = 0, hop = 0, x = null;

  /* where the caret is, in doc-x */
  const caretX = r => {
    if (!field.value || field.selectionStart == null) return r.l + 14;
    const cs = getComputedStyle(field);
    caretCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const shown = field.type === 'password' ? '•'.repeat(field.selectionStart) : field.value.slice(0, field.selectionStart);
    return r.l + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth) + caretCtx.measureText(shown).width - field.scrollLeft;
  };
  const feel = (m, t, icon) => { mood = m; moodT = t; if (icon) a.say(icon, 900); };
  const onInput = () => { if (chance(.25)) hop = .25; mood = ''; };
  const onBlur = () => {
    if (!field.value || !field.checkValidity) return;
    if (field.checkValidity()) { feel('happy', 1.6, 'check'); hop = .35; }
    else feel('worried', 2.2, 'sweat');
  };
  field.addEventListener('input', onInput);
  field.addEventListener('blur', onBlur);

  return {
    tick(dt) {
      const r = rectOf(field);
      const focused = document.activeElement === field;
      const secret = field.type === 'password';
      const home = r.l + a.w / 2 + (r.w - a.w) * at;
      const want = focused && !secret ? clamp(caretX(r) + a.w * .6, r.l + a.w / 2, r.r - a.w / 2) : home;
      x = x == null ? home : lerp(x, want, 1 - Math.exp(-8 * dt));
      a.x = x; a.y = r.t;
      moodT -= dt; hop = Math.max(0, hop - dt);
      a.oy = -Math.sin(Math.PI * hop / .35) * 10 * S * (hop > 0);
      if (reduced()) { a.play('idle'); return; }
      if (focused && secret) a.play('cover');
      else if (moodT > 0) a.play(mood);
      else if (focused) a.play(caretX(r) < a.x ? 'l' : 'r');
      else if (ptr.seen && ptrDist(a.x, a.y) < 120 * S) a.play(ptr.x < a.x ? 'l' : 'r');
      else a.play('idle');
    },
    poke() { hop = .35; a.say(field.type === 'password' ? '...' : 'heart', 700); },
    destroy() { field.removeEventListener('input', onInput); field.removeEventListener('blur', onBlur); }
  };
});
