/* Piixpal site behaviour. The pals themselves come from piixpal.js. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CDN = 'https://cdn.jsdelivr.net/npm/piixpal@0.4/piixpal.min.js';
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
  $$('[data-copy-tag]').forEach(b => b.addEventListener('click', () => copy(TAG, b)));

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

/* ---------- copy buttons on snippets ---------- */
document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
  const text = b.getAttribute('data-copy');
  try { await navigator.clipboard.writeText(text); } catch (_) { /* clipboard blocked: nothing to do */ }
  const was = b.textContent;
  b.textContent = 'Copied'; b.classList.add('copied');
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.textContent = was; b.classList.remove('copied'); }, 1400);
}));

/* ---------- sandbox: retype the headline, swap the pal, recolour it ---------- */
(() => {
  const title = document.getElementById('sb-title');
  if (!title) return;
  const input = document.getElementById('sb-text');
  const hue = document.getElementById('sb-hue');
  const hueOut = document.getElementById('sb-hue-o');
  const code = document.getElementById('sb-code');
  const seg = document.getElementById('sb-pal');
  const st = { pal: 'bitbug', hue: 0, text: input.value };
  let pal = null;

  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mount = () => {
    if (pal) pal.remove();
    pal = document.createElement('piix-pal');
    pal.setAttribute('pal', st.pal);
    if (st.hue) pal.setAttribute('hue', st.hue);
    if (st.pal === 'boing' || st.pal === 'lurk') pal.setAttribute('edge', 'box');
    title.appendChild(pal);
    render();
  };
  const render = () => {
    const attrs = `pal="${st.pal}"` + (st.hue ? ` hue="${st.hue}"` : '');
    code.innerHTML = `<button class="copy" type="button">Copy</button>` +
      esc(`<h1>\n  ${st.text || ' '}\n  <piix-pal ${attrs}></piix-pal>\n</h1>`);
    code.querySelector('.copy').onclick = async e => {
      try { await navigator.clipboard.writeText(`<piix-pal ${attrs}></piix-pal>`); } catch (_) { /* ignore */ }
      e.target.textContent = 'Copied'; e.target.classList.add('copied');
      setTimeout(() => { e.target.textContent = 'Copy'; e.target.classList.remove('copied'); }, 1300);
    };
  };

  input.addEventListener('input', () => {
    st.text = input.value;
    /* keep the pal: replace only the text node */
    [...title.childNodes].forEach(n => { if (n.nodeType === 3) n.remove(); });
    title.insertBefore(document.createTextNode(st.text || ' '), title.firstChild);
    render();
  });
  seg.addEventListener('click', e => {
    const b = e.target.closest('button[data-pal]');
    if (!b) return;
    seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    st.pal = b.dataset.pal;
    mount();
  });
  hue.addEventListener('input', () => {
    st.hue = +hue.value;
    hueOut.textContent = st.hue + '°';
    if (pal) pal.setAttribute('hue', st.hue);
    render();
  });
  mount();
})();

/* ---------- release extra pals onto the page ---------- */
(() => {
  const spawned = [];
  const clear = document.querySelector('[data-spawn="clear"]');
  const homes = { bitbug: ['#mark', '#lede', '#pals-h', '#how-h', '#api-h', '#install-h'], boing: ['#mark'], toy: ['#mark', '#lede'] };
  const TOYS = ['ball', 'duck', 'dice', 'pebble', 'cube', 'can'];
  document.querySelectorAll('[data-spawn]').forEach(b => b.addEventListener('click', () => {
    const kind = b.dataset.spawn;
    if (kind === 'clear') { spawned.splice(0).forEach(p => p.remove()); clear.hidden = true; return; }
    if (spawned.length >= 24) spawned.shift().remove();
    const p = document.createElement('piix-pal');
    p.setAttribute('pal', kind === 'toy' ? TOYS[(Math.random() * TOYS.length) | 0] : kind);
    p.setAttribute('on', kind === 'bitbug' && Math.random() < .6 ? '#mark' : homes[kind][(Math.random() * homes[kind].length) | 0]);
    if (kind !== 'toy') p.setAttribute('hue', String(((Math.random() * 12) | 0) * 30));
    else p.setAttribute('box', '.hero');
    document.body.appendChild(p);
    spawned.push(p);
    clear.hidden = false;
  }));
})();

/* ---------- scatter twinkling sparkles across the hero ---------- */
(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const box = document.createElement('div');
  box.className = 'sparks'; box.setAttribute('aria-hidden', 'true');
  const colors = ['var(--ink)', 'var(--lime-2)', 'var(--coral)', 'var(--violet)', 'var(--sky)'];
  for (let i = 0; i < 16; i++) {
    const s = document.createElement('i');
    const size = [4, 5, 6][i % 3];
    s.style.cssText = `left:${(Math.random() * 96 + 2).toFixed(1)}%;top:${(Math.random() * 90 + 4).toFixed(1)}%;--s:${size}px;--c:${colors[i % colors.length]};--t:${(2.6 + Math.random() * 3).toFixed(2)}s;--d:${(-Math.random() * 5).toFixed(2)}s`;
    box.appendChild(s);
  }
  hero.prepend(box);
})();

/* ---------- theme switcher: white / paper / dark, remembered ---------- */
(() => {
  const d = document.documentElement;
  const sync = () => document.querySelectorAll('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', b.dataset.themeSet === d.dataset.theme));
  document.querySelectorAll('[data-theme-set]').forEach(b => b.addEventListener('click', () => {
    d.classList.add('theming');
    d.dataset.theme = b.dataset.themeSet;
    try { localStorage.setItem('piix-theme', b.dataset.themeSet); } catch (_) { /* private mode */ }
    sync();
    /* pixel lettering paints with the current text colour: repaint it */
    const repaint = () => document.querySelectorAll('piix-type').forEach(t => t._render && t._render());
    repaint(); setTimeout(repaint, 380);
    setTimeout(() => d.classList.remove('theming'), 400);
  }));
  sync();
})();

/* ---------- big sprites: flip between voxel, pixel and dots ---------- */
(() => {
  const box = document.querySelector('.bs-modes');
  if (!box) return;
  box.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    document.querySelectorAll('#bigstage piix-sprite').forEach(s => s.setAttribute('render', b.dataset.r));
  });
})();

/* ---------- home crowd: switch modes ---------- */
(() => {
  const box = document.querySelector('.crowd-modes'), crowd = document.getElementById('home-crowd');
  if (!box || !crowd) return;
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    crowd.setAttribute('mode', b.dataset.m);
    crowd.setAttribute('count', b.dataset.m === 'form' ? 240 : b.dataset.m === 'swarm' ? 160 : 110);
  });
})();

/* ?at=section-id jumps straight to a section (handy for screenshots and links) */
(() => {
  const at = new URLSearchParams(location.search).get('at');
  if (!at) return;
  addEventListener('load', () => { const el = document.getElementById(at); if (el) { document.documentElement.style.scrollBehavior = 'auto'; el.scrollIntoView(); } });
})();

/* ---------- sponsor: a short form before checkout ----------
   The Sponsor buttons open it (plain one-off Support links still go straight to checkout). The answers ride along to Dodo checkout
   (email pre-filled, the rest as metadata_* on the payment), so every order arrives
   with the brand it belongs to. Nothing is stored here except a draft in this browser. */
(() => {
  const PRODUCT = 'pdt_0Nqn3w3rmEdaceOHhh7xT', PRICE = '$49.99';
  const HOME = 'https://piixpal.dvkk.dev/?sponsor=thanks';
  const KEY = 'piix-sponsor-draft';
  const FIELDS = ['product', 'link', 'desc', 'email'];
  const CAT = ['.k.......k.', '.kk.....kk.', '.kkkkkkkkk.', 'kkkkkkkkkkk', 'kkLkkkkkLkk', 'kkkkkpkkkkk', 'kkkkkkkkkkk', '.kkkkkkkkk.', '..kk...kk..'];
  const pix = (rows, cols) => `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${rows.map((r, y) => [...r].map((c, x) => cols[c] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${cols[c]}"/>` : '').join('')).join('')}</svg>`;
  const catSvg = pix(CAT, { k: 'currentColor', L: 'var(--lime)', p: '#ff5c8a' });
  const HEART = '<svg viewBox="0 0 8 7" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 0h2v1h2V0h2v1h1v2H7v1H6v1H5v1H3V5H2V4H1V3H0V1h1z"/></svg>';
  const params = new URLSearchParams(location.search);
  let dlg;
  const draft = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; } };
  const host = s => String(s || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  const build = () => {
    dlg = document.createElement('dialog');
    dlg.className = 'spf';
    dlg.setAttribute('aria-labelledby', 'spf-h');
    dlg.innerHTML = `<form novalidate>
  <button class="spf-x" type="button" aria-label="Close">×</button>
  <div class="spf-top"><span class="spf-cat">${catSvg}</span><div>
    <h2 id="spf-h">Become a Sponsor <span>${PRICE}</span></h2>
    <p>Tell us about your brand, then pay on the next page. You'll be featured in the Sponsor section soon.</p></div></div>
  <div class="spf-grid">
    <label class="spf-f"><span>Product</span><input name="product" maxlength="40" autocomplete="organization"></label>
    <label class="spf-f"><span>Link <i>where it points</i></span><input name="link" maxlength="120" inputmode="url" autocomplete="url"></label>
    <label class="spf-f spf-wide"><span>Description <i class="spf-n">0 / 200</i></span><textarea name="desc" maxlength="200" rows="3"></textarea></label>
    <label class="spf-f spf-wide"><span>Email <i>where we reach you</i></span><input name="email" type="email" maxlength="120" autocomplete="email"></label>
  </div>
  <div class="spf-prev" aria-hidden="true"><small>How you'll appear</small><div class="spf-card"><b class="spf-p"></b><span class="spf-d"></span><em class="spf-l"></em></div></div>
  <p class="spf-err" role="alert"></p>
  <div class="spf-go"><button class="btn btn-heart" type="submit">${HEART}Continue to payment</button><small>Secure checkout by Dodo Payments</small></div>
</form>`;
    document.body.append(dlg);
    const f = dlg.querySelector('form'), el = n => f.elements[n];
    const paint = () => {
      const v = n => el(n).value.trim();
      dlg.querySelector('.spf-prev').hidden = !FIELDS.slice(0, 3).some(n => v(n));
      dlg.querySelector('.spf-p').textContent = v('product');
      dlg.querySelector('.spf-d').textContent = v('desc');
      dlg.querySelector('.spf-l').textContent = host(v('link')) ? host(v('link')) + ' ↗' : '';
      dlg.querySelector('.spf-n').textContent = el('desc').value.length + ' / 200';
    };
    const d = draft();
    FIELDS.forEach(n => { if (d[n]) el(n).value = d[n]; });
    paint();
    f.addEventListener('input', e => {
      e.target.removeAttribute('aria-invalid');
      paint();
      try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(new FormData(f)))); } catch (_) { /* private mode */ }
    });
    dlg.querySelector('.spf-x').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const v = Object.fromEntries(FIELDS.map(n => [n, el(n).value.trim()]));
      const bad = [];
      if (!v.product) bad.push(['product', 'Add your product name.']);
      if (!/^[^\s/]+\.[^\s.]{2,}(\/\S*)?$/.test(v.link.replace(/^https?:\/\//i, ''))) bad.push(['link', 'Add a link, like example.com.']);
      if (!v.desc) bad.push(['desc', 'Add a short description.']);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) bad.push(['email', 'Add an email we can reach you at.']);
      f.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
      const err = dlg.querySelector('.spf-err');
      if (bad.length) {
        bad.forEach(([n]) => el(n).setAttribute('aria-invalid', 'true'));
        err.textContent = bad[0][1];
        el(bad[0][0]).focus();
        return;
      }
      err.textContent = '';
      const q = new URLSearchParams({
        quantity: 1, email: v.email,
        metadata_product: v.product,
        metadata_link: /^https?:/i.test(v.link) ? v.link : 'https://' + v.link,
        metadata_description: v.desc,
        redirect_url: HOME
      });
      f.querySelector('[type=submit]').classList.add('busy');
      location.href = `https://checkout.dodopayments.com/buy/${PRODUCT}?${q}`;
    });
  };
  const open = () => {
    if (!dlg) build();
    dlg.querySelector('.spf-err').textContent = '';
    dlg.querySelector('[type=submit]').classList.remove('busy');
    dlg.showModal();
    const f = dlg.querySelector('form');
    (FIELDS.map(n => f.elements[n]).find(x => !x.value) || f.elements.product).focus();
  };
  document.addEventListener('click', e => {
    const a = e.target.closest(`.nav-sponsor,[data-sponsor],a[href*="${PRODUCT}"]`);
    if (!a || (a.matches(`a[href*="${PRODUCT}"]:not(.nav-sponsor,[data-sponsor])`) && !/sponsor/i.test(a.textContent + (a.title || ''))) || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0 || typeof HTMLDialogElement !== 'function') return;
    e.preventDefault();
    open();
  });
  if (params.get('sponsor') === 'open') addEventListener('load', open);
  /* back from checkout */
  if (params.get('sponsor') === 'thanks' && /^(succeeded|active)$/.test(params.get('status') || 'succeeded')) {
    try { localStorage.removeItem(KEY); } catch (_) { /* fine */ }
    const t = document.createElement('div');
    t.className = 'spf-toast'; t.setAttribute('role', 'status');
    t.innerHTML = `<span class="spf-cat">${catSvg}</span><div><b>Thank you, sponsor!</b><span>You'll be in the Sponsor section soon. We'll email you if we need anything.</span></div>`;
    document.body.append(t);
    setTimeout(() => t.classList.add('out'), 7000);
    setTimeout(() => t.remove(), 7600);
  }
})();
