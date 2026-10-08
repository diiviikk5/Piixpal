/* Real words for pals that need them: toasts, tour cards, tooltips, summaries.
 * Cards live in their own shadow root, above the pals and NOT aria-hidden, so screen
 * readers and keyboards can use them. They look like the pixel speech bubbles. */
const UI_INK = '#1b1226', UI_PAPER = '#fffdf5';
const UI_FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif';
const UI_MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
const UI_CSS = `
:host{all:initial}
.card{position:absolute;left:0;top:0;box-sizing:border-box;width:max-content;max-width:min(var(--w,300px),calc(100vw - 24px));
  padding:12px 14px;font:500 14px/1.45 ${UI_FONT};color:${UI_INK};background:${UI_PAPER};text-align:left;
  box-shadow:0 -3px 0 ${UI_INK},0 3px 0 ${UI_INK},-3px 0 0 ${UI_INK},3px 0 0 ${UI_INK},6px 9px 0 rgba(27,18,38,.18);
  pointer-events:auto;transform-origin:var(--tx,50%) 100%;animation:piix-in .22s steps(4) both}
.card.below{transform-origin:var(--tx,50%) 0}
.card.fixed{position:fixed}
.card.tip::after{content:"";position:absolute;left:var(--tx,50%);top:100%;width:6px;height:6px;margin:3px 0 0 -3px;background:${UI_PAPER};
  box-shadow:0 3px 0 ${UI_INK},-3px 0 0 ${UI_INK},3px 0 0 ${UI_INK}}
.card.tip.below::after{top:auto;bottom:100%;margin:0 0 3px -3px;box-shadow:0 -3px 0 ${UI_INK},-3px 0 0 ${UI_INK},3px 0 0 ${UI_INK}}
.card h4{margin:0 0 5px;font:800 11px/1.2 ${UI_MONO};letter-spacing:.07em;text-transform:uppercase;color:#6c6477;display:flex;align-items:center;gap:7px}
.card p{margin:0}
.card ul{margin:2px 0 0;padding-left:18px}
.card li{margin:4px 0}
.card .row{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;align-items:center;margin-top:12px}
.card .row .n{margin-right:auto;font:700 12px/1 ${UI_MONO};color:#6c6477}
.card button,.card a.b{font:700 13px/1 ${UI_FONT};padding:9px 12px;border:0;border-radius:0;background:${UI_INK};color:${UI_PAPER};cursor:pointer;
  text-decoration:none;box-shadow:0 3px 0 rgba(27,18,38,.32);transition:transform .08s}
.card button:active,.card a.b:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(27,18,38,.32)}
.card button.ghost{background:transparent;color:${UI_INK};box-shadow:inset 0 0 0 2px ${UI_INK}}
.card button.x{position:absolute;right:4px;top:4px;width:24px;height:24px;padding:0;background:transparent;color:${UI_INK};box-shadow:none;font:700 17px/1 ${UI_FONT}}
.card button:focus-visible,.card a:focus-visible{outline:3px solid #6b4cff;outline-offset:2px}
.card a{color:inherit}
.card canvas{image-rendering:pixelated;flex:none}
.card .ic{display:flex;gap:10px;align-items:flex-start}
.card.out{animation:piix-out .16s steps(3) both}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@keyframes piix-in{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}
@keyframes piix-out{to{transform:scale(.5);opacity:0}}
@media (prefers-reduced-motion:reduce){.card,.card.out{animation:none}}
`;
let uiHost = null, uiShadow = null, uiLive = null;
const uiRoot = () => {
  if (uiShadow) return uiShadow;
  uiHost = document.createElement('div');
  uiHost.setAttribute('data-piixpal-ui', '');
  uiHost.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:visible;z-index:calc(var(--piix-z,2147482000) + 1);margin:0;padding:0;border:0';
  uiShadow = uiHost.attachShadow({ mode: 'open' });
  const st = document.createElement('style');
  st.textContent = UI_CSS;
  uiLive = document.createElement('div');
  uiLive.className = 'sr';
  uiLive.setAttribute('aria-live', 'polite');
  uiShadow.append(st, uiLive);
  document.body.appendChild(uiHost);
  return uiShadow;
};
/* uiEl('p', { text, cls, attrs, on, style }, ...children) */
const uiEl = (tag, o = {}, ...kids) => {
  const e = document.createElement(tag);
  if (o.cls) e.className = o.cls;
  if (o.text != null) e.textContent = o.text;
  if (o.style) e.style.cssText = o.style;
  if (o.attrs) for (const k in o.attrs) e.setAttribute(k, o.attrs[k]);
  if (o.on) for (const k in o.on) e.addEventListener(k, o.on[k]);
  e.append(...kids.filter(k => k != null && k !== false));
  return e;
};
/* a pixel icon from ICONS as an inline canvas */
const uiIcon = (name, s = 3) => {
  if (!ICONS[name] && !numberIcon(name)) return null;
  const c = bakeIcon(name);
  c.style.width = c.width * s + 'px'; c.style.height = c.height * s + 'px';
  return c;
};
/* a new card: { fixed, tip, cls, width, attrs } */
const uiCard = (o = {}) => {
  const c = uiEl('div', { cls: 'card' + (o.fixed ? ' fixed' : '') + (o.tip ? ' tip' : '') + (o.cls ? ' ' + o.cls : ''), attrs: o.attrs });
  if (o.width) c.style.setProperty('--w', o.width + 'px');
  uiRoot().appendChild(c);
  return c;
};
/* put a card's tail at (x, y): doc coords, or viewport coords (+ origin) for fixed cards.
 * It sits above the point (or below), flips if there's no room, and stays inside `area`. */
const uiPlace = (c, x, y, { below = false, gap = 12, area } = {}) => {
  const fixed = c.classList.contains('fixed');
  const o = uiHost.getBoundingClientRect();
  const ox = fixed ? origin.x : o.left + scrollX, oy = fixed ? origin.y : o.top + scrollY;
  const A = area || (fixed ? { l: origin.x, r: origin.x + docW(), t: origin.y, b: origin.y + innerHeight } : { l: scrollX, r: scrollX + docW(), t: scrollY, b: scrollY + innerHeight });
  const w = c.offsetWidth, h = c.offsetHeight;
  if (!below && y - h - gap < A.t + 4 && y + gap + h < A.b) below = true;
  else if (below && y + gap + h > A.b - 4 && y - h - gap > A.t) below = false;
  const left = clamp(x - w / 2, A.l + 6, Math.max(A.l + 6, A.r - w - 6));
  const top = below ? y + gap : y - h - gap;
  c.classList.toggle('below', below);
  c.style.setProperty('--tx', Math.round(clamp(x - left, 14, w - 14)) + 'px');
  c.style.left = Math.round(left - ox) + 'px';
  c.style.top = Math.round(top - oy) + 'px';
};
const uiClose = c => {
  if (!c || c._closing) return;
  c._closing = true;
  if (reduced()) { c.remove(); return; }
  c.classList.add('out');
  setTimeout(() => c.remove(), 170);
};
/* tell screen readers something happened */
const uiAnnounce = text => {
  uiRoot();
  uiLive.textContent = '';
  setTimeout(() => { uiLive.textContent = text; }, 40);
};
