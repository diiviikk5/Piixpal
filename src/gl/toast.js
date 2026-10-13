/* TOAST: notifications with a pixel fuse that burns down while they're up.   @component toast
 *
 *   Piixpal.toast('Saved');
 *   Piixpal.toast('Deploy finished', { tone: 'ok', title: 'Production', action: { label: 'Open', onClick } });
 *   Piixpal.toast('Card declined', { tone: 'error' });
 *
 * Toasts slide in from the corner in a few chunky steps. Along the bottom, a thin pixel fuse
 * burns down with a flickering spark at its tip; when it runs out the toast wipes away. Hover
 * (or focus) one and the fuse stops. They stack, newest nearest the corner, and screen readers
 * hear them (errors straight away, the rest politely).
 *
 * Put a <piix-toaster> on the page to choose where and how they appear; one is added for you
 * otherwise.
 *
 *   options   tone: info | ok | warn | error      title      duration (seconds, 0 = stay)
 *             action: { label, onClick }
 *   toaster   position: bottom-right | bottom-left | top-right | top-left | bottom | top
 *             theme: dark | light
 *
 *   returns   { close() } */
const TOAST_TONES = {
  info: ['#58c8ff', '<path d="M3 1h2v1H3zM3 3h2v4H3z"/>'],
  ok: ['#9be15d', '<path d="M6 1h1v2H6zM5 3h1v1H5zM4 4h1v1H4zM1 4h1v1H1zM2 5h1v1H2zM3 6h1v1H3z"/>'],
  warn: ['#ffcc55', '<path d="M3 1h2v4H3zM3 6h2v1H3z"/>'],
  error: ['#ff6b5e', '<path d="M1 1h2v1H1zM5 1h2v1H5zM2 2h1v1H2zM5 2h1v1H5zM3 3h2v2H3zM2 5h1v1H2zM5 5h1v1H5zM1 6h2v1H1zM5 6h2v1H5z"/>']
};
class PiixToasterElement extends HTMLElement {
  static get observedAttributes() { return ['position', 'theme']; }
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  connectedCallback() { this._build(); }
  attributeChangedCallback() { if (this.shadowRoot.firstChild) this._build(); }
  _build() {
    const pos = this.getAttribute('position') || 'bottom-right', top = pos.startsWith('top'), light = this.getAttribute('theme') === 'light';
    const x = pos.endsWith('left') ? 'left:16px' : pos === 'top' || pos === 'bottom' ? 'left:50%;transform:translateX(-50%)' : 'right:16px';
    const keep = this._list ? [...this._list.children] : [];
    this.shadowRoot.innerHTML = `<style>
:host{position:fixed;z-index:2147483000;${top ? 'top' : 'bottom'}:16px;${x};pointer-events:none}
ol{display:flex;flex-direction:${top ? 'column' : 'column-reverse'};gap:10px;margin:0;padding:0;list-style:none;width:min(380px,calc(100vw - 32px));filter:drop-shadow(0 10px 22px rgba(0,0,0,.3))}
li{--tone:#58c8ff;position:relative;display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:start;padding:14px 14px 18px;pointer-events:auto;
  background:${light ? '#fbf8f2' : '#17121f'};color:${light ? '#17121f' : '#f2eef8'};box-shadow:inset 0 0 0 2px ${light ? '#17121f' : '#2c2438'};
  clip-path:${kitCorners(3)};font:400 14.5px/1.45 "Bricolage Grotesque",system-ui,sans-serif;animation:tin .28s steps(4) both}
li.out{animation:tout .3s steps(4) forwards}
@keyframes tin{from{transform:translateX(${pos.endsWith('left') ? '-' : ''}40px);opacity:0}}
@keyframes tout{to{clip-path:inset(0 0 0 100%);opacity:.3}}
.ico{width:22px;height:22px;display:grid;place-items:center;background:var(--tone);color:#17121f;clip-path:${kitCorners(2)}}
.ico svg{width:12px;height:12px;shape-rendering:crispEdges}
b{display:block;font-weight:650;font-size:15px;line-height:1.3}
.msg{opacity:${light ? '.75' : '.8'}}
.act{all:unset;margin-top:8px;display:inline-block;font-weight:650;font-size:13.5px;color:var(--tone);cursor:pointer;border-bottom:2px solid currentColor}
.act:focus-visible,.x:focus-visible{outline:2px dashed var(--tone);outline-offset:3px}
.x{all:unset;width:22px;height:22px;display:grid;place-items:center;font:400 11px/1 ${KIT_FONT};opacity:.5;cursor:pointer}
.x:hover{opacity:1}
.fuse{position:absolute;left:14px;right:14px;bottom:8px;height:3px;background:repeating-linear-gradient(90deg,${light ? '#17121f22' : '#ffffff1f'} 0 3px,transparent 3px 6px)}
.fuse i{position:absolute;inset:0 auto 0 0;width:100%;background:var(--tone);animation:burn var(--d) linear forwards}
.fuse i::after{content:"";position:absolute;right:-3px;top:-3px;width:6px;height:6px;background:#fff6c8;box-shadow:0 0 0 1px #ffb03a;animation:spark .12s steps(2) infinite}
li:hover .fuse i,li:focus-within .fuse i,li:hover .fuse i::after,li:focus-within .fuse i::after{animation-play-state:paused}
@keyframes burn{to{width:0}}
@keyframes spark{50%{transform:translate(1px,-2px) scale(.6);background:#ffb03a}}
@media (prefers-reduced-motion:reduce){li,li.out{animation:none}.fuse i::after{animation:none}}
</style><ol part="list" role="region" aria-label="Notifications"></ol>`;
    this._list = this.shadowRoot.querySelector('ol');
    keep.forEach(k => this._list.appendChild(k));
  }
  /* add one; returns { close } */
  push(message, o = {}) {
    const [tone, glyph] = TOAST_TONES[o.tone] || TOAST_TONES.info, dur = o.duration == null ? 4.5 : +o.duration;
    const li = document.createElement('li');
    li.style.setProperty('--tone', tone); li.style.setProperty('--d', dur + 's');
    li.setAttribute('role', o.tone === 'error' ? 'alert' : 'status');
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    li.innerHTML = `<span class="ico" aria-hidden="true"><svg viewBox="0 0 8 8" fill="currentColor">${glyph}</svg></span>
<div>${o.title ? `<b>${esc(o.title)}</b>` : ''}<div class="msg">${esc(message)}</div>${o.action ? `<button class="act" type="button">${esc(o.action.label)}</button>` : ''}</div>
<button class="x" type="button" aria-label="Dismiss">X</button>${dur > 0 ? '<span class="fuse" aria-hidden="true"><i></i></span>' : ''}`;
    let gone = false;
    const close = () => {
      if (gone) return; gone = true;
      if (reduced()) { li.remove(); return; }
      li.classList.add('out'); setTimeout(() => li.remove(), 320);
    };
    li.querySelector('.x').addEventListener('click', close);
    if (o.action) li.querySelector('.act').addEventListener('click', () => { if (o.action.onClick) o.action.onClick(); close(); });
    const fuse = li.querySelector('.fuse i');
    if (fuse) fuse.addEventListener('animationend', e => { if (e.animationName === 'burn') close(); });
    this._list.appendChild(li);
    /* never more than five at once */
    while (this._list.children.length > 5) this._list.firstElementChild.remove();
    return { close };
  }
}
define('piix-toaster', PiixToasterElement);
Piixpal.toast = (message, o) => {
  let t = document.querySelector('piix-toaster');
  if (!t) { t = document.createElement('piix-toaster'); document.body.appendChild(t); }
  return t.push(message, o);
};
ELEMENTS.toast = 'piix-toaster';
