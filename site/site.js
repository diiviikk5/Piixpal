/* Piixpal site behaviour. The pals themselves come from piixpal.js. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CDN = 'https://cdn.jsdelivr.net/gh/diiviikk5/Piixpal@main/piixpal.js';
  const TAG = `<script src="${CDN}"><\/script>`;

  /* ---------- copy helper with a little label swap ---------- */
  const copy = async (text, btn) => {
    const label = btn.querySelector('[data-label]') || btn;
    const was = label.textContent;
    try { await navigator.clipboard.writeText(text); label.textContent = 'Copied!'; }
    catch (_) {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.append(ta); ta.select();
      label.textContent = document.execCommand('copy') ? 'Copied!' : 'Press Ctrl+C';
      ta.remove();
    }
    btn.classList.add('copied');
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { label.textContent = was; btn.classList.remove('copied'); }, 1600);
  };
  const tagBtn = $('#copy-tag');
  if (tagBtn) tagBtn.addEventListener('click', () => copy(TAG, tagBtn));

  /* ---------- nav gets a border once the page moves ---------- */
  const nav = $('#nav');
  const onScroll = () => nav && nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- reveal on scroll, staggered within each group ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  const groups = new Map();
  $$('.rv').forEach(el => {
    const g = el.closest('section') || document.body;
    const i = groups.get(g) || 0;
    groups.set(g, i + 1);
    el.style.setProperty('--d', Math.min(i * .07, .6) + 's');
    io.observe(el);
  });
})();
