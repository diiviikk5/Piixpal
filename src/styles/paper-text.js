/* PAPER TEXT: a headline that draws itself in pen, then becomes cut paper.   @component paper-text  @needs paper-button
 *
 *   <piix-paper-text>Hand made</piix-paper-text>
 *   <piix-paper-text look="sketch" underline>Hello there</piix-paper-text>
 *
 * When it scrolls into view the outline of every letter is traced by a pen, then the letters fill
 * in as stacked sheets of coloured paper, each sheet a step behind the last, and a scribbled line
 * underlines it. The pen line keeps a gentle boil, like a hand-drawn cartoon.
 *
 *   look       cut | sketch (no paper, only the pen)     default: cut
 *   colors     top sheet, then the sheets below          default: #ffd23f,#ff8a5c,#e2477a,#5a3d8a
 *   ink        pen colour                                default: #1d1a2b
 *   size       font size in px                           default: fits, up to 96
 *   underline  draw a scribbled underline
 *   font       CSS font family                           default: Bricolage Grotesque (cut), a hand font (sketch) */
class PiixPaperTextElement extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const text = this.textContent.trim(), sketch = this.getAttribute('look') === 'sketch', ink = this.getAttribute('ink') || '#1d1a2b';
    const cols = (this.getAttribute('colors') || '#ffd23f,#ff8a5c,#e2477a,#5a3d8a').split(',').map(s => s.trim());
    const fs = +this.getAttribute('size') || 96, font = this.getAttribute('font') || (sketch ? PAPER_FONT : '"Bricolage Grotesque",system-ui,sans-serif');
    const safe = text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const fid = 'pb' + (Math.random() * 1e6 | 0);
    this.setAttribute('role', 'heading'); this.setAttribute('aria-label', text);
    const sheets = sketch ? '' : cols.slice(1).map((c, i) => `<text class="sh" x="${8 + (i + 1) * 4}" y="${fs * .92 + (i + 1) * 4}" fill="${c}" style="transition-delay:${.9 + i * .12}s">${safe}</text>`).reverse().join('');
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
:host{display:block;width:100%;max-width:${Math.round(fs * Math.max(4, text.length * .62))}px;line-height:0}
svg{display:block;width:100%;height:auto;overflow:visible}
text{font:${sketch ? 400 : 800} ${fs}px ${font};letter-spacing:${sketch ? '.01em' : '-.02em'}}
.pen{fill:none;stroke:${ink};stroke-width:${sketch ? 2.4 : 2};stroke-linejoin:round;stroke-linecap:round;stroke-dasharray:var(--L,2000);stroke-dashoffset:var(--L,2000);transition:stroke-dashoffset 1.3s cubic-bezier(.5,0,.3,1)}
.top{fill:${sketch ? 'transparent' : cols[0]};opacity:0;transition:opacity .4s .95s}
.sh{opacity:0;transform:translate(-6px,-6px);transition:opacity .25s,transform .35s cubic-bezier(.3,1.6,.5,1)}
.ul{fill:none;stroke:${cols[2] || ink};stroke-width:5;stroke-linecap:round;stroke-dasharray:var(--U,2000);stroke-dashoffset:var(--U,2000);transition:stroke-dashoffset .7s 1.3s ease-out}
.on .pen{stroke-dashoffset:0}.on .top{opacity:1}.on .sh{opacity:1;transform:none}.on .ul{stroke-dashoffset:0}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style><svg aria-hidden="true"><defs><filter id="${fid}"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="1"/><feDisplacementMap in="SourceGraphic" scale="${sketch ? 3.5 : 2.2}"/></filter></defs>
<g>${sheets}<text class="top" x="8" y="${fs * .92}">${safe}</text></g><g filter="url(#${fid})"><text class="pen" x="8" y="${fs * .92}">${safe}</text>${this.hasAttribute('underline') ? '<path class="ul"/>' : ''}</g></svg>`;
    const svg = this.shadowRoot.querySelector('svg'), pen = this.shadowRoot.querySelector('.pen'), turb = this.shadowRoot.querySelector('feTurbulence');
    const fit = () => {
      let bb; try { bb = pen.getBBox(); } catch (_) { return; }
      if (!bb.width) return;
      const extra = sketch ? 0 : (cols.length - 1) * 4;
      const h = bb.height + extra + (this.hasAttribute('underline') ? fs * .3 : 0) + 16;
      svg.setAttribute('viewBox', `0 ${bb.y - 6} ${bb.width + extra + 20} ${h}`);
      /* a pen line long enough for every letter */
      pen.style.setProperty('--L', Math.ceil((bb.width + bb.height) * text.length * 2.2));
      const ul = this.shadowRoot.querySelector('.ul');
      if (ul) { const y = bb.y + bb.height + fs * .12, r = paperRand(text.length * 31 + 7); let d = `M${8 + r() * 6} ${y}`; for (let x = 8; x < bb.width + 8; x += bb.width / 4) d += ` Q${x + bb.width / 8} ${y + (r() - .5) * 14} ${x + bb.width / 4} ${y + (r() - .5) * 6}`; d += ` M${bb.width * .15} ${y + 12} Q${bb.width * .5} ${y + 2} ${bb.width * .9} ${y + 10}`; ul.setAttribute('d', d); ul.style.setProperty('--U', Math.ceil(ul.getTotalLength() + 2)); }
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { fit(); requestAnimationFrame(fit); });
    /* draw when it comes into view; and never stay blank, whatever the observer does */
    const go = () => { if (svg.classList.contains('on')) return; fit(); requestAnimationFrame(() => svg.classList.add('on')); };
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, { threshold: 0 });
    io.observe(this);
    setTimeout(go, 2500);
    if (reduced()) svg.classList.add('on');
    this._stop = paperBoil(this, k => turb.setAttribute('seed', 1 + k % 3), 6);
  }
  disconnectedCallback() { if (this._stop) this._stop(); }
}
define('piix-paper-text', PiixPaperTextElement);
ELEMENTS['paper-text'] = 'piix-paper-text';
