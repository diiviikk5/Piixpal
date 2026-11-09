/* PAPER CARD: a card with a paper-cut scene, or a hand-sketched frame.   @component paper-card  @needs paper-button
 *
 *   <piix-paper-card>
 *     <h3>Weekend retreat</h3>
 *     <p>Three days in the hills.</p>
 *   </piix-paper-card>
 *   <piix-paper-card look="sketch"> ... </piix-paper-card>
 *
 * cut: the top of the card is a diorama of cut-paper layers (sky, sun, three ranges of hills),
 *   each sheet casting a real shadow on the one behind; move the pointer and the layers slide at
 *   different depths. The body is textured card stock lifted off the page.
 * sketch: a pen-drawn frame that boils, a cross-hatched shadow, and a doodled corner tape.
 *
 *   look      cut | sketch                               default: cut
 *   scene     hills | sea | city (cut)                   default: hills
 *   colors    sky, sun, then three layers far to near    default: a warm dusk
 *   ink       line colour (sketch)                       default: #1d1a2b */
const PAPER_SCENES = {
  hills: (w, r) => [0, 1, 2].map(i => { const y = 70 + i * 26, a = 18 - i * 3; let d = `M0 ${y}`; for (let x = 0; x <= w + 40; x += 40) d += ` Q${x + 20} ${y - a - r() * a} ${x + 40} ${y + (r() - .5) * 10}`; return d + ` L${w + 40} 200 L0 200Z`; }),
  sea: (w, r) => [0, 1, 2].map(i => { const y = 92 + i * 24; let d = `M0 ${y}`; for (let x = 0; x <= w + 40; x += 30) d += ` q7.5 -${7 - i} 15 0 t15 0`; return d + ` L${w + 40} 200 L0 200Z`; }),
  city: (w, r) => [0, 1, 2].map(i => { let d = `M0 200`, x = 0; while (x < w + 40) { const bw = 18 + r() * 34, bh = 40 + r() * (70 - i * 18) - i * 6; d += ` L${x} ${150 - bh} L${x + bw} ${150 - bh}`; x += bw + 2 + r() * 6; } return d + ` L${x} 200Z`; }).map((d, i) => d.replace(/ L([\d.]+) ([\d.]+)/g, (m, x, y) => ` L${x} ${+y + i * 22}`))
};
class PiixPaperCardElement extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) { if (this._draw && !this._stop) this._stop = paperBoil(this, this._draw, 6); return; }
    const sketch = this.getAttribute('look') === 'sketch', ink = this.getAttribute('ink') || '#1d1a2b';
    const cols = (this.getAttribute('colors') || '#ffd9b8,#ff9a62,#e9897e,#b4587a,#4b3268').split(',').map(s => s.trim());
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
:host{display:block;--px:0;--py:0}
${sketch ? `
.c{position:relative;padding:30px 30px 28px;color:${ink};font-family:${PAPER_FONT}}
svg.fr{position:absolute;inset:-8px;width:calc(100% + 16px);height:calc(100% + 16px);overflow:visible;pointer-events:none}
.o{fill:#fffdf6;stroke:${ink};stroke-width:2.4;stroke-linejoin:round;stroke-linecap:round}
.h{fill:none;stroke:${ink};stroke-width:1.3;opacity:.5}
.tp{position:absolute;left:50%;top:-14px;width:96px;height:28px;margin-left:-48px;background:rgba(255,224,120,.75);transform:rotate(-3deg);box-shadow:0 1px 2px rgba(0,0,0,.15)}
.in{position:relative;font-size:1.12em}
::slotted(h3){font-family:${PAPER_FONT};font-weight:400;font-size:1.7em;margin:0 0 .3em}` : `
.c{position:relative;border-radius:16px 18px 15px 17px;background:#fffaf0 ${PAPER_GRAIN};color:#2c2238;box-shadow:0 1px 1px rgba(0,0,0,.12),0 6px 0 -1px #efe4cf,0 7px 2px -1px rgba(0,0,0,.18),0 22px 38px -18px rgba(60,30,40,.45);overflow:hidden;transition:transform .3s}
:host(:hover) .c{transform:translateY(-3px) rotate(-.3deg)}
.sc{position:relative;height:170px;background:${cols[0]} ${PAPER_GRAIN};overflow:hidden}
.sc svg{position:absolute;left:-20px;top:0;width:calc(100% + 40px);height:100%}
.sun{transform:translate(calc(var(--px) * -6px),calc(var(--py) * -4px));transition:transform .4s cubic-bezier(.2,.9,.3,1)}
.ly{transition:transform .4s cubic-bezier(.2,.9,.3,1)}
.ly1{transform:translate(calc(var(--px) * -8px),calc(var(--py) * -3px))}.ly2{transform:translate(calc(var(--px) * -14px),calc(var(--py) * -5px))}.ly3{transform:translate(calc(var(--px) * -22px),calc(var(--py) * -8px))}
.in{position:relative;padding:22px 26px 26px}
::slotted(h3){margin:0 0 .35em}`}
</style><div class="c" part="card">${sketch ? '<svg class="fr" aria-hidden="true"><path class="h"/><path class="o"/></svg><i class="tp"></i>' : `<div class="sc" aria-hidden="true"><svg preserveAspectRatio="none"></svg></div>`}<div class="in"><slot></slot></div></div>`;
    const c = this.shadowRoot.querySelector('.c');
    if (sketch) {
      const draw = k => {
        const w = c.offsetWidth, h = c.offsetHeight; if (!w) return;
        const sd = (this._seed || (this._seed = 1 + (Math.random() * 1e6 | 0))) + (k % 3) * 97;
        this.shadowRoot.querySelector('.o').setAttribute('d', paperRough(w, h, sd, 2.6));
        /* the shadow: hatching in an L down the right and along the bottom */
        const r = paperRand(sd + 5); let d = '';
        for (let y = 14; y < h + 10; y += 7) d += `M${w + 2 + (r() - .5) * 2} ${y}l10 -9`;
        for (let x = 14; x < w + 12; x += 7) d += `M${x} ${h + 11 + (r() - .5) * 2}l9 -10`;
        this.shadowRoot.querySelector('.h').setAttribute('d', d);
        this.shadowRoot.querySelectorAll('path').forEach(p => p.setAttribute('transform', 'translate(8 8)'));
      };
      requestAnimationFrame(() => draw(0)); new ResizeObserver(() => draw(0)).observe(c);
      this._draw = draw; this._stop = paperBoil(this, draw, 6);
    } else {
      const svg = this.shadowRoot.querySelector('.sc svg'), r = paperRand(7 + (this.getAttribute('scene') || 'hills').length * 13), W = 480;
      svg.setAttribute('viewBox', `0 0 ${W} 170`);
      const layers = (PAPER_SCENES[this.getAttribute('scene')] || PAPER_SCENES.hills)(W, r);
      const id = 'ps' + (Math.random() * 1e6 | 0);
      svg.innerHTML = `<defs><filter id="${id}" x="-5%" y="-30%" width="110%" height="160%"><feDropShadow dx="0" dy="-2" stdDeviation="3" flood-color="#2a1530" flood-opacity=".35"/></filter></defs>
<circle class="sun" cx="${W * .7}" cy="62" r="30" fill="${cols[1]}" filter="url(#${id})"/>
${layers.map((d, i) => `<path class="ly ly${i + 1}" d="${d}" fill="${cols[2 + i] || cols[cols.length - 1]}" filter="url(#${id})"/>`).join('')}`;
      c.addEventListener('pointermove', e => { if (reduced()) return; const b = c.getBoundingClientRect(); this.style.setProperty('--px', ((e.clientX - b.left) / b.width - .5).toFixed(3)); this.style.setProperty('--py', ((e.clientY - b.top) / b.height - .5).toFixed(3)); });
      c.addEventListener('pointerleave', () => { this.style.setProperty('--px', 0); this.style.setProperty('--py', 0); });
    }
  }
  disconnectedCallback() { if (this._stop) this._stop(); this._stop = null; }
}
define('piix-paper-card', PiixPaperCardElement);
ELEMENTS['paper-card'] = 'piix-paper-card';
