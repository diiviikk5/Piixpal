/* choir: a row of singers on an element who sway and sing in perfect time.
 * They look at the cursor when it's near. Click one for a solo; click it again and
 * everyone joins back in.
 *   count="4"   number of singers   bpm="96"   tempo */
defineBehavior('choir', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 4, 1, 10);
  const bpm = +host.getAttribute('bpm') || 96;
  const singers = [a, ...Array.from({ length: n - 1 }, (_, i) => recruit(a, 'choir', { hue: (i + 1) * 70 }))];
  /* a little score: which singers open their mouths on which beat */
  const score = Array.from({ length: 16 }, () => singers.map(() => chance(.65)));
  let solo = -1, lastBeat = -1;

  return {
    crew: singers.slice(1),
    tick(dt, t) {
      const r = rectOf(el);
      const beatLen = 60000 / bpm, beat = Math.floor(t / beatLen), phase = (t % beatLen) / beatLen;
      const near = ptr.seen && ptr.x > r.l - 80 && ptr.x < r.r + 80 && Math.abs(ptr.y - r.t) < 120 * S;
      singers.forEach((s, i) => {
        s.x = r.l + r.w * ((i + .5) / n); s.y = r.t;
        if (reduced()) { s.play('hush'); return; }
        s.rot = Math.sin((beat + phase) * Math.PI) * 6;
        s.oy = -Math.abs(Math.sin(phase * Math.PI)) * 3 * S;
        const singing = solo >= 0 ? i === solo : score[beat % 16][i];
        if (near && !singing) { s.play('look'); s.face = ptr.x < s.x ? -1 : 1; }
        else { s.face = 1; s.play(singing ? 'sing' : 'hush'); }
        if (beat !== lastBeat && singing && chance(solo >= 0 ? .6 : .12)) s.say('note', beatLen * .9);
      });
      lastBeat = beat;
    },
    poke(e, who) {
      const i = Math.max(0, singers.indexOf(who || a));
      solo = solo === i ? -1 : i;
      singers.forEach(s => s.hush());
    }
  };
});
