/* The light switch, on every page: flips a page dark (or a dark page light) before it paints, on
 * the sites where you flipped it last time, and remembers each time you flip it, whether by the
 * bulb's chain, the popup or Alt+Shift+L. The look itself is lights.css (made from the bulb's own
 * rules); this only sets the class on <html> that turns it on. Runs in the extension's world. */
(() => {
  const api = globalThis.browser || globalThis.chrome;
  const html = document.documentElement, host = location.hostname;
  const CLS = 'piix-invert';
  const flipped = () => html.classList.contains(CLS);
  /* the colour behind everything, so the flip has something to flip (a transparent <html> paints white) */
  const solid = c => c && !/transparent|rgba\([^)]*,\s*0\)/.test(c);
  const paint = () => {
    const h = getComputedStyle(html).backgroundColor, b = document.body && getComputedStyle(document.body).backgroundColor;
    html.style.setProperty('--piix-page', solid(h) ? h : solid(b) ? b : '#fff');
  };
  let saved = null;
  const save = on => {
    if (on === saved) return;
    saved = on;
    api.storage.local.get({ flip: {} }).then(({ flip }) => {
      if (on) flip[host] = 1; else delete flip[host];
      api.storage.local.set({ flip });
    });
  };
  api.storage.local.get({ flip: {} }).then(({ flip }) => {
    saved = !!flip[host];
    if (saved) html.classList.add(CLS);
  });
  if (document.body) paint(); else document.addEventListener('DOMContentLoaded', paint, { once: true });
  /* whoever flips it (the bulb lives in the page's world), we remember it */
  new MutationObserver(() => { if (saved != null) save(flipped()); }).observe(html, { attributes: true, attributeFilter: ['class'] });
  api.runtime.onMessage.addListener((msg, _, reply) => {
    if (msg.type === 'flip') { paint(); html.classList.toggle(CLS); }
    if (msg.type === 'flip' || msg.type === 'flipped') reply({ flipped: flipped() });
  });
})();
