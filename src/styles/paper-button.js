/* PAPER BUTTON: a button cut from layers of paper, or sketched in pen.   @component paper-button
 *
 *   <piix-paper-button>Sign up</piix-paper-button>
 *   <piix-paper-button look="sketch">Read more</piix-paper-button>
 *
 * cut: three sheets of coloured card stacked with real gaps between them; hover lifts the top
 *   sheet and the shadows open up, press squashes them flat. Paper grain on every sheet.
 * sketch: a hand-drawn outline that "boils" like a cartoon (redrawn a few times a second),
 *   hatching that scribbles in when you hover, and a wobbly shadow.
 *
 *   look      cut | sketch                                default: cut
 *   colors    three sheets, top first (cut)              default: #ffd8a8,#ff8a5c,#5a3d8a
 *   ink       line colour (sketch)                       default: #1d1a2b
 *   size      sm | md | lg                               default: md
 *   type, href, disabled */

/* the paper toolkit: a grain texture, a seeded random, and a rough hand-drawn rectangle */
const PAPER_GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .09 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")`;
const paperRand = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
/* a rectangle as a pen would draw it: corners overshoot, edges bow, two passes that don't quite agree */
const paperRough = (w, h, seed, j = 2.2, passes = 2) => {
  const r = paperRand(seed), J = () => (r() - .5) * 2 * j;
  let d = '';
  for (let p = 0; p < passes; p++) {
    const pts = [[J() - 2, J()], [w + J(), J()], [w + J(), h + J()], [J(), h + J()], [J() + 3, J() - 1]];
    d += `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2 + J() * 1.4, my = (y0 + y1) / 2 + J() * 1.4;
      d += `Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
  }
  return d;
};
/* hatching: parallel strokes at 45°, each a little wobbly, clipped by the caller */
const paperHatch = (w, h, seed, gap = 7) => {
  const r = paperRand(seed); let d = '';
  for (let x = -h; x < w; x += gap) d += `M${(x + (r() - .5) * 2).toFixed(1)} ${(h + 2).toFixed(1)}L${(x + h + (r() - .5) * 3).toFixed(1)} ${(-2 + (r() - .5) * 2).toFixed(1)}`;
  return d;
};
/* redraw something a few times a second while the page is visible: the "line boil" of hand-drawn animation */
const paperBoil = (el, fn, fps = 7) => {
  let last = 0, k = 0;
  const tick = (dt, t) => { if (reduced() || !el.isConnected) return; if (t - last > 1000 / fps) { last = t; fn(++k); } };
  sub(tick); return () => unsub(tick);
};
const PAPER_FONT = '"Patrick Hand","Comic Neue","Segoe Print","Bradley Hand",cursive';

class PiixPaperButtonElement extends HTMLElement {
  static get formAssociated() { return true; }
  constructor() { super(); this._int = this.attachInternals ? this.attachInternals() : null; }
  connectedCallback() {
    if (this.shadowRoot) { if (this._draw && !this._stop) this._stop = paperBoil(this, this._draw, 6); return; }
    const sketch = this.getAttribute('look') === 'sketch', href = this.getAttribute('href');
    const [c0, c1, c2] = (this.getAttribute('colors') || '#ffd8a8,#ff8a5c,#5a3d8a').split(',').map(s => s.trim());
    const ink = this.getAttribute('ink') || '#1d1a2b';
    const [pad, fs] = { sm: ['11px 20px', 14], lg: ['20px 36px', 19] }[this.getAttribute('size')] || ['15px 28px', 16];
    const tag = href ? `a href="${href.replace(/"/g, '&quot;')}"` : `button type="button"${this.hasAttribute('disabled') ? ' disabled' : ''}`;
    const close = href ? 'a' : 'button';
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
:host{display:inline-block;vertical-align:middle;-webkit-tap-highlight-color:transparent}
:host([disabled]){opacity:.45;pointer-events:none;filter:grayscale(.8)}
.b{all:unset;position:relative;display:inline-block;cursor:pointer;box-sizing:border-box}
.b:focus-visible{outline:2px dashed ${sketch ? ink : c2};outline-offset:8px;border-radius:6px}
${sketch ? `
.l{position:relative;display:block;padding:${pad};font:400 ${fs + 3}px/1 ${PAPER_FONT};color:${ink};letter-spacing:.02em;transition:transform .15s}
svg{position:absolute;inset:-6px;width:calc(100% + 12px);height:calc(100% + 12px);overflow:visible;pointer-events:none}
.o{fill:none;stroke:${ink};stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.s{fill:none;stroke:${ink};stroke-width:2;opacity:.85}
.h{fill:none;stroke:${ink};stroke-width:1.4;opacity:.55;stroke-dasharray:600;stroke-dashoffset:600;transition:stroke-dashoffset .5s ease}
.b:hover .h{stroke-dashoffset:0}
.b:hover .l{transform:translate(-1px,-2px) rotate(-1deg)}
.b:active .l{transform:translate(3px,3px)}` : `
.sh{position:absolute;inset:0;border-radius:10px 12px 9px 11px;background:${c2} ${PAPER_GRAIN};transform:translate(7px,8px) rotate(1.2deg);transition:transform .18s cubic-bezier(.3,1.5,.5,1);box-shadow:0 1px 2px rgba(0,0,0,.25)}
.m{position:absolute;inset:0;border-radius:11px 9px 12px 10px;background:${c1} ${PAPER_GRAIN};transform:translate(3.5px,4px) rotate(-.8deg);transition:transform .18s cubic-bezier(.3,1.5,.5,1);box-shadow:0 1px 3px rgba(0,0,0,.28)}
.l{position:relative;display:block;padding:${pad};border-radius:10px 11px 10px 12px;background:${c0} ${PAPER_GRAIN};font:800 ${fs}px/1 "Bricolage Grotesque",system-ui,sans-serif;letter-spacing:.01em;color:${c2};
  box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 2px 4px rgba(0,0,0,.25);transition:transform .18s cubic-bezier(.3,1.5,.5,1)}
.b:hover .l{transform:translate(-2px,-3px) rotate(-.6deg)}.b:hover .m{transform:translate(3px,3px) rotate(-1.2deg)}.b:hover .sh{transform:translate(9px,11px) rotate(1.8deg)}
.b:active .l{transform:translate(4px,5px)}.b:active .m{transform:translate(5px,6px)}.b:active .sh{transform:translate(6px,7px)}`}
</style><${tag} class="b" part="button">${sketch ? '<svg aria-hidden="true"><path class="s"/><path class="h"/><path class="o"/></svg>' : '<i class="sh"></i><i class="m"></i>'}<span class="l"><slot></slot></span></${close}>`;
    const b = this.shadowRoot.querySelector('.b');
    if (sketch) {
      const draw = k => {
        const w = b.offsetWidth + 12, h = b.offsetHeight + 12; if (!w) return;
        const sd = (this._seed || (this._seed = 1 + (Math.random() * 1e6 | 0))) + (k % 3) * 101;
        const box = paperRough(w - 12, h - 12, sd);
        this.shadowRoot.querySelector('.o').setAttribute('d', box);
        this.shadowRoot.querySelector('.s').setAttribute('d', paperRough(w - 12, h - 12, sd + 7, 2.6, 1));
        this.shadowRoot.querySelector('.h').setAttribute('d', paperHatch(w - 14, h - 14, sd + 3));
        this.shadowRoot.querySelectorAll('path').forEach(p => p.setAttribute('transform', p.classList.contains('s') ? 'translate(11 11)' : 'translate(6 6)'));
      };
      requestAnimationFrame(() => draw(0));
      new ResizeObserver(() => draw(0)).observe(b);
      this._draw = draw; this._stop = paperBoil(this, draw, 6);
    }
    b.addEventListener('click', () => {
      const form = this._int && this._int.form, t = this.getAttribute('type');
      if (form && t === 'submit') form.requestSubmit ? form.requestSubmit() : form.submit();
      if (form && t === 'reset') form.reset();
    });
  }
  disconnectedCallback() { if (this._stop) this._stop(); this._stop = null; }
}
define('piix-paper-button', PiixPaperButtonElement);
ELEMENTS['paper-button'] = 'piix-paper-button';
