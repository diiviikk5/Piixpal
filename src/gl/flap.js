/* FLAP: a split-flap board, like a station departures sign.   @component flap
 *
 *   <piix-flap text="NOW BOARDING"></piix-flap>
 *   <piix-flap countdown="2026-12-31T00:00:00"></piix-flap>
 *
 * Every tile riffles through the alphabet, flap by flap, until it lands on its letter, each a
 * beat after the one before, with that clatter of little cards. Change the text and it flips
 * again. With a countdown it shows days, hours, minutes and seconds and keeps ticking.
 * It sizes from the font size you give it; screen readers just get the words.
 *
 *   text      what it says (letters, digits, spaces and : . - / ! ? ' & +)
 *   length    pad it to this many tiles
 *   countdown a date and time to count down to
 *   theme     dark | light | amber                          default: dark */
const FLAP_SET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-/!?'&+";
const FLAP_THEMES = { dark: ['#17121f', '#211a2c', '#f4efe2', '#000'], light: ['#f4efe2', '#e7e0d0', '#17121f', '#b8ae9a'], amber: ['#1a1208', '#24190a', '#ffb43a', '#000'] };
class PiixFlapElement extends HTMLElement {
  static get observedAttributes() { return ['text', 'length', 'countdown', 'theme']; }
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._cur = []; }
  connectedCallback() { this._build(); }
  disconnectedCallback() { clearInterval(this._cd); this._timers && this._timers.forEach(clearTimeout); }
  attributeChangedCallback(n) { if (!this.shadowRoot.firstChild) return; if (n === 'theme') this._build(); else this._run(); }
  _build() {
    const [bg, bg2, fg, line] = FLAP_THEMES[this.getAttribute('theme')] || FLAP_THEMES.dark;
    this.shadowRoot.innerHTML = `<style>
:host{display:inline-block;font-size:clamp(22px,5vw,56px);line-height:1}
.row{display:flex;gap:.12em;flex-wrap:wrap}
.g{display:inline-flex;flex-direction:column;align-items:center;gap:.25em}
.g small{font:400 max(10px,.2em)/1 "Silkscreen",ui-monospace,monospace;letter-spacing:.08em;opacity:.6}
.gs{display:flex;gap:.08em}
.sep{align-self:flex-start;padding:.18em .02em 0;font:400 1em/1 "Silkscreen",ui-monospace,monospace;color:${fg};opacity:.6}
.t{position:relative;width:.78em;height:1.16em;font:400 1em/1.16 "Silkscreen",ui-monospace,monospace;color:${fg};text-align:center;perspective:3em}
.t span{position:absolute;left:0;right:0;height:50%;overflow:hidden;background:${bg};clip-path:polygon(0 3px,3px 3px,3px 0,calc(100% - 3px) 0,calc(100% - 3px) 3px,100% 3px,100% 100%,0 100%)}
.t span i{display:block;font-style:normal;height:200%}
.t .up,.t .fu{top:0}
.t .dn,.t .fd{bottom:0;background:${bg2};clip-path:polygon(0 0,100% 0,100% calc(100% - 3px),calc(100% - 3px) calc(100% - 3px),calc(100% - 3px) 100%,3px 100%,3px calc(100% - 3px),0 calc(100% - 3px))}
.t .dn i,.t .fd i{transform:translateY(-50%)}
.t .fu{transform-origin:50% 100%;z-index:2;backface-visibility:hidden}
.t .fd{transform-origin:50% 0;z-index:2;transform:rotateX(90deg);backface-visibility:hidden}
.t.go .fu{animation:fu var(--s) steps(3) forwards}
.t.go .fd{animation:fd var(--s) steps(3) var(--s) forwards}
@keyframes fu{to{transform:rotateX(-90deg)}}
@keyframes fd{to{transform:rotateX(0)}}
.t::after{content:"";position:absolute;left:0;right:0;top:50%;height:2px;margin-top:-1px;background:${line};z-index:3;opacity:.7}
</style><div class="row" part="board" aria-hidden="true"></div>`;
    this._row = this.shadowRoot.querySelector('.row');
    this._cur = [];
    this._run();
  }
  /* the words to show, as tile groups */
  _target() {
    const cd = this.getAttribute('countdown');
    if (cd) {
      const ms = Math.max(0, new Date(cd).getTime() - Date.now()), s = Math.floor(ms / 1000);
      const p = n => String(n).padStart(2, '0');
      return { groups: [[p(Math.min(99, Math.floor(s / 86400))), 'DAYS'], [p(Math.floor(s / 3600) % 24), 'HRS'], [p(Math.floor(s / 60) % 60), 'MIN'], [p(s % 60), 'SEC']], label: `${Math.floor(s / 86400)} days ${Math.floor(s / 3600) % 24} hours ${Math.floor(s / 60) % 60} minutes left` };
    }
    let t = (this.getAttribute('text') || '').toUpperCase().split('').map(c => FLAP_SET.includes(c) ? c : ' ').join('');
    const n = +this.getAttribute('length') || 0;
    if (n > t.length) t = t.padEnd(n, ' ');
    return { groups: [[t, '']], label: this.getAttribute('text') || '' };
  }
  _run() {
    const { groups, label } = this._target(), cd = this.hasAttribute('countdown');
    this.setAttribute('role', cd ? 'timer' : 'img');
    this.setAttribute('aria-label', label);
    const chars = groups.map(g => g[0]).join('');
    /* rebuild the tiles if the shape changed */
    if (this._shape !== groups.map(g => g[0].length + g[1]).join('|')) {
      this._shape = groups.map(g => g[0].length + g[1]).join('|');
      this._row.innerHTML = groups.map(([s, lab], gi) => `${gi && cd ? '<span class="sep">:</span>' : ''}<span class="g"><span class="gs">${[...s].map(() => '<span class="t"><span class="up"><i> </i></span><span class="dn"><i> </i></span><span class="fu"><i> </i></span><span class="fd"><i> </i></span></span>').join('')}</span>${lab ? `<small>${lab}</small>` : ''}</span>`).join('');
      this._tiles = [...this._row.querySelectorAll('.t')];
      this._cur = this._tiles.map(() => ' ');
    }
    (this._timers || []).forEach(clearTimeout); this._timers = [];
    [...chars].forEach((ch, i) => this._flipTo(i, ch, cd ? 0 : i * 70));
    clearInterval(this._cd);
    if (cd) this._cd = setInterval(() => this._run(), 1000);
  }
  /* step one tile through the set until it reaches ch */
  _flipTo(i, ch, delay) {
    const tile = this._tiles[i];
    if (!tile) return;
    if (reduced()) { this._paint(tile, ch, ch); this._cur[i] = ch; return; }
    const step = () => {
      const cur = this._cur[i];
      if (cur === ch) return;
      /* a countdown flips straight to the next digit; words riffle, but never more than a dozen flaps */
      const ci = FLAP_SET.indexOf(cur), ti = FLAP_SET.indexOf(ch), dist = (ti - ci + FLAP_SET.length) % FLAP_SET.length;
      const next = this.hasAttribute('countdown') ? ch : FLAP_SET[dist > 12 ? (ti - 12 + FLAP_SET.length) % FLAP_SET.length : (ci + 1) % FLAP_SET.length];
      const fast = this.hasAttribute('countdown') ? 90 : 46;
      this._paint(tile, cur, next, fast);
      this._cur[i] = next;
      this._timers.push(setTimeout(step, fast * 2));
    };
    this._timers.push(setTimeout(step, delay));
  }
  /* show one flip from a to b */
  _paint(tile, a, b, ms = 46) {
    const [up, dn, fu, fd] = tile.children;
    up.firstChild.textContent = b; dn.firstChild.textContent = a;
    fu.firstChild.textContent = a; fd.firstChild.textContent = b;
    tile.style.setProperty('--s', ms + 'ms');
    tile.classList.remove('go'); void tile.offsetWidth; tile.classList.add('go');
    clearTimeout(tile._done);
    tile._done = setTimeout(() => { dn.firstChild.textContent = b; fu.firstChild.textContent = b; tile.classList.remove('go'); }, ms * 2);
  }
}
define('piix-flap', PiixFlapElement);
ELEMENTS.flap = 'piix-flap';
