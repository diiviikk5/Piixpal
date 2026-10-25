/* When each stargazer arrives in the stars film: shared by video/stars2.html (the picture) and
 * video/beat-stars2.mjs (a tick per arrival), so the sound lands exactly on the pictures. */
(function (g) {
  g.STARS_TIME = N => {
    const D = 230, START = .25, END = 3.95, LINE = 1560, LAST = 1500;
    const S = 1920 + (N - 1) * D - LAST;
    /* cubic in-out: an easy start, a rush through the middle, an easy landing */
    const ease = u => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const scroll = t => S * ease(Math.min(1, Math.max(0, (t - START) / (END - START))));
    const x = (k, s) => 1920 + k * D - s;
    const arrived = (k, s) => x(k, s) <= LINE;
    /* the moment avatar k crosses the line (bisection on the eased scroll) */
    const when = k => { let a = START, b = END; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (arrived(k, scroll(m))) b = m; else a = m; } return b; };
    return { D, START, END, S, scroll, x, arrived, when };
  };
  if (typeof module !== 'undefined') module.exports = g.STARS_TIME;
})(typeof window !== 'undefined' ? window : globalThis);
