/* Shared pick-up-and-throw handling. Calls move(x, y, vx, vy) while held (foot point,
 * doc coords) and end({ moved, vx, vy }) on release. A press without movement is a click. */
const drag = (actor, e, { move, end }) => {
  const cv = actor.cv;
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* old browsers */ }
  const sx = e.clientX, sy = e.clientY;
  const px0 = sx + scrollX, py0 = sy + scrollY;
  const gx = actor.x - px0, gy = actor.y - py0;
  let moved = false, vx = 0, vy = 0, lx = px0, ly = py0, lt = now();
  const mv = ev => {
    const x = ev.clientX + scrollX, y = ev.clientY + scrollY, t = now(), d = Math.max(8, t - lt);
    vx = lerp(vx, (x - lx) / d * 1000, .5); vy = lerp(vy, (y - ly) / d * 1000, .5);
    lx = x; ly = y; lt = t;
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) {
      moved = true; actor.held = true; actor.node.classList.add('held');
    }
    if (moved && move) move(x + gx, y + gy, vx, vy);
  };
  const up = () => {
    cv.removeEventListener('pointermove', mv);
    cv.removeEventListener('pointerup', up);
    cv.removeEventListener('pointercancel', up);
    actor.held = false; actor.node.classList.remove('held');
    if (now() - lt > 90) vx = vy = 0; /* held still before letting go: just drop it */
    if (end) end({ moved, vx: clamp(vx, -2600, 2600), vy: clamp(vy, -2600, 2600) });
  };
  cv.addEventListener('pointermove', mv);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
};
