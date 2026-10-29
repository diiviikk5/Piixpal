/* Templates gallery: cards with snapshots, a live preview on hover, and copy buttons that
 * hand you a paste-and-go file (assets load from piixpal.dvkk.dev). */
(() => {
  const list = window.TEMPLATES || [];
  const grid = document.getElementById('grid'), filters = document.getElementById('filters');
  const HOST = /(^|\.)localhost$|^127\./.test(location.hostname) ? 'https://piixpal.dvkk.dev' : location.origin;
  let active = 'all', page = '';   /* '' = full hero (index.html), 'bg.html' = background only */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  document.getElementById('mode').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    page = b.dataset.mode;
    document.querySelectorAll('#mode button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    render();
  });

  /* the most used tags (minus the technical ones) make the filters */
  const counts = {};
  list.forEach(t => t.tags.forEach(g => { counts[g] = (counts[g] || 0) + 1; }));
  const tags = ['all', ...Object.keys(counts).filter(g => counts[g] >= 3 && g !== 'image' && g !== 'webgl').sort((a, b) => counts[b] - counts[a]).slice(0, 14)];
  filters.innerHTML = tags.map(t => `<button type="button" aria-pressed="${t === active}" data-tag="${esc(t)}">${esc(t)}${t === 'all' ? ` <span>${list.length}</span>` : ''}</button>`).join('');
  filters.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    active = b.dataset.tag;
    filters.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    render();
  });

  function render() {
    unmount();
    const items = list.filter(t => active === 'all' || t.tags.includes(active));
    if (!items.length) { grid.innerHTML = '<p class="tg-empty">Nothing here yet.</p>'; return; }
    grid.innerHTML = items.map((t, i) => `
      <article class="tg-card" data-slug="${esc(t.slug)}">
        <a class="tg-frame" href="${esc(t.slug)}/${page}" aria-label="Open ${esc(t.name)}" style="background:url(${esc(t.slug)}/${page ? 'thumb_bg.jpg' : 'thumb.jpg'}) center/cover,${esc(t.poster)}"><span class="tg-num">${String(i + 1).padStart(2, '0')}</span></a>
        <div class="tg-meta"><h2>${esc(t.name)}</h2><span>${t.tags.slice(0, 3).map(esc).join(' · ')}</span></div>
        <div class="tg-acts"><button type="button" class="tg-btn primary" data-copy="hero">Copy hero</button><button type="button" class="tg-btn" data-copy="bg">Copy background</button><a class="tg-open" href="${esc(t.slug)}/" target="_blank" rel="noopener">Open ↗</a></div>
      </article>`).join('');
  }

  /* one live preview at a time (browsers cap WebGL contexts): hover or focus plays it */
  const VW = 1280, VH = 800;
  let live = null;
  const fit = (frame, f) => { f.style.transform = `scale(${frame.clientWidth / VW})`; };
  function mount(card) {
    if (live && live.card === card) return;
    unmount();
    const frame = card.querySelector('.tg-frame'), f = document.createElement('iframe');
    f.src = `${card.dataset.slug}/${page}?preview`;
    f.tabIndex = -1; f.setAttribute('aria-hidden', 'true'); f.title = '';
    f.style.width = VW + 'px'; f.style.height = VH + 'px';
    f.onload = () => setTimeout(() => f.classList.add('ready'), 350);
    frame.appendChild(f); fit(frame, f);
    live = { card, f };
  }
  function unmount() { if (live) { live.f.remove(); live = null; } }
  grid.addEventListener('pointerover', e => { const c = e.target.closest('.tg-card'); if (c && e.pointerType !== 'touch') mount(c); });
  grid.addEventListener('pointerleave', unmount);
  grid.addEventListener('focusin', e => { const c = e.target.closest('.tg-card'); if (c) mount(c); });
  /* touch: the first tap plays it, the second opens it */
  grid.addEventListener('click', e => {
    const c = e.target.closest('.tg-card');
    if (!c || e.target.closest('button') || e.target.closest('.tg-open')) return;
    if (matchMedia('(hover: none)').matches && !(live && live.card === c)) { e.preventDefault(); mount(c); }
  });
  addEventListener('resize', () => live && fit(live.card.querySelector('.tg-frame'), live.f));

  /* copy: a file that works on its own, its script loaded from here */
  grid.addEventListener('click', async e => {
    const b = e.target.closest('button[data-copy]'); if (!b) return;
    const slug = b.closest('.tg-card').dataset.slug, src = `${HOST}/templates/${slug}/bg.js`;
    let text;
    if (b.dataset.copy === 'hero') {
      text = await (await fetch(`${slug}/index.html`)).text();
      text = text.replace('<script src="bg.js"></script>', `<script src="${src}"></script>`);
    } else {
      text = `<!-- motion background: put your content inside the section -->
<section style="position:relative;min-height:100vh;isolation:isolate">
  <canvas data-bg style="position:absolute;inset:0;width:100%;height:100%;z-index:-1"></canvas>
</section>
<script src="${src}"></script>
`;
    }
    try { await navigator.clipboard.writeText(text); } catch (_) { return; }
    const was = b.textContent; b.textContent = 'Copied ✓'; b.classList.add('ok');
    setTimeout(() => { b.textContent = was; b.classList.remove('ok'); }, 1400);
  });

  render();
})();
