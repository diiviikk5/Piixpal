/* Piixpal site behaviour. The pals themselves come from piixpal.js. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CDN = 'https://cdn.jsdelivr.net/gh/diiviikk5/Piixpal@main/piixpal.min.js';
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
  const homes = { bitbug: ['#mark', '#lede', '#pals-h', '#how-h', '#api-h', '#install-h'], boing: ['#mark'] };
  document.querySelectorAll('[data-spawn]').forEach(b => b.addEventListener('click', () => {
    const kind = b.dataset.spawn;
    if (kind === 'clear') { spawned.splice(0).forEach(p => p.remove()); clear.hidden = true; return; }
    if (spawned.length >= 24) spawned.shift().remove();
    const p = document.createElement('piix-pal');
    p.setAttribute('pal', kind);
    p.setAttribute('on', kind === 'bitbug' && Math.random() < .6 ? '#mark' : homes[kind][(Math.random() * homes[kind].length) | 0]);
    p.setAttribute('hue', String(((Math.random() * 12) | 0) * 30));
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
