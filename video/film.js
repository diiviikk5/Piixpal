/* Piixpal launch film: every frame is a pure function of time T (seconds), drawn on one canvas.
 * The pals are the real ones from the library; big 3D sprites are live <piix-sprite> elements. */
const W = 1920, H = 1080, DUR = 38;
const cv = document.getElementById('c'), g = cv.getContext('2d');
const C = {
  ink: '#17121f', ink2: '#2b2436', deep: '#100c16', paper: '#f3eee3', card: '#fbf8f1', muted: '#6c6477', soft: '#cdc6da',
  line: '#d8cfbd', lime: '#c6f432', lime2: '#a8d81c', coral: '#ff6b4a', violet: '#6b4cff', sky: '#58c8ff', sun: '#ffd23f', mint: '#25b89a', white: '#ffffff'
};
const SANS = '"Bricolage Grotesque"', PIX = 'Silkscreen', MONO = '"JetBrains Mono"';

/* ---------- time ---------- */
const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const prog = (T, a, b) => cl((T - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const E = {
  outExpo: k => k >= 1 ? 1 : 1 - Math.pow(2, -10 * k),
  outCubic: k => 1 - Math.pow(1 - k, 3),
  inCubic: k => k * k * k,
  inOut: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
  outBack: k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  outElastic: k => k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - .75) * (2 * Math.PI / 3)) + 1
};

/* ---------- colour ---------- */
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => { const A = rgb(a), B = rgb(b); return 'rgb(' + A.map((v, i) => Math.round(lerp(v, B[i], cl(k)))).join(',') + ')'; };

