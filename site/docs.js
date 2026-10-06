/* Component docs: customisers and sidebar highlighting. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* a code block with a copy button that copies `copyText` */
  const showCode = (pre, text, copyText = text) => {
    pre.innerHTML = '<button class="copy" type="button">Copy</button>' + esc(text);
    pre.querySelector('.copy').onclick = async e => {
      try { await navigator.clipboard.writeText(copyText); } catch (_) { /* clipboard blocked */ }
      e.target.textContent = 'Copied'; e.target.classList.add('copied');
      setTimeout(() => { e.target.textContent = 'Copy'; e.target.classList.remove('copied'); }, 1300);
    };
  };
  const seg = (box, attr, on) => box && box.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('button', box).forEach(x => x.setAttribute('aria-pressed', x === b));
    on(b.dataset[attr]);
  });

  /* ---------- sprite customiser ---------- */
  const sp = $('#c-sprite');
  if (sp) {
    const st = { name: 'mochi', size: 140, hue: 0, look: 'mouse', shy: false, tilt: false, still: false, nap: false };
    const stage = $('#c-stage');
    const render = () => {
      sp.setAttribute('name', st.name);
      sp.setAttribute('size', st.size);
      st.hue ? sp.setAttribute('hue', st.hue) : sp.removeAttribute('hue');
      sp.setAttribute('look', st.look);
      ['shy', 'tilt', 'still'].forEach(k => sp.toggleAttribute(k, st[k]));
      st.nap ? sp.setAttribute('sleep-after', '4') : sp.removeAttribute('sleep-after');
      $('#c-name').textContent = st.name;
      $('#c-pick').value = st.name;
      $$('.scard').forEach(c => c.classList.toggle('sel', c.id === 's-' + st.name));
      const attrs = [`name="${st.name}"`];
      if (st.size !== 70) attrs.push(`size="${st.size}"`);
      if (st.hue) attrs.push(`hue="${st.hue}"`);
      if (st.look !== 'mouse') attrs.push(`look="${st.look}"`);
      ['shy', 'tilt', 'still'].forEach(k => st[k] && attrs.push(k));
      if (st.nap) attrs.push('sleep-after="4"');
      const tag = `<piix-sprite ${attrs.join(' ')}></piix-sprite>`;
      showCode($('#c-code'), tag);
    };
    const pick = name => { st.name = name; render(); };
    $('#c-pick').addEventListener('change', e => pick(e.target.value));
    $('#c-size').addEventListener('input', e => { st.size = +e.target.value; $('#c-size-o').value = st.size; render(); });
    $('#c-hue').addEventListener('input', e => { st.hue = +e.target.value; $('#c-hue-o').value = st.hue + '°'; render(); });
    seg($('#c-look'), 'look', v => { st.look = v; render(); });
    ['shy', 'tilt', 'still', 'nap'].forEach(k => $('#c-' + k).addEventListener('change', e => { st[k] = e.target.checked; render(); }));
    seg($('.c-bgs'), 'bg', v => { stage.dataset.bg = v; });
    $$('[data-pick]').forEach(b => b.addEventListener('click', () => {
      pick(b.dataset.pick);
      $('#customise').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }));
    /* deep link: sprites.html#s-toast preselects toast */
    const m = location.hash.match(/^#s-([\w-]+)/);
    if (m && Piixpal.figures[m[1]]) st.name = m[1];
    render();
  }

  /* ---------- type customiser ---------- */
  const ty = $('#t-demo');
  if (ty) {
    const st = { text: 'hello', cell: 12, depth: 1, gap: .1, shade: '#c6f432', shape: 'square', font: '' };
    const render = () => {
      ty.setAttribute('text', st.text || ' ');
      ty.setAttribute('cell', st.cell);
      ty.setAttribute('depth', st.depth);
      ty.setAttribute('gap', st.gap);
      st.shade ? ty.setAttribute('shade', st.shade) : ty.removeAttribute('shade');
      ty.setAttribute('shape', st.shape);
      st.font ? ty.setAttribute('font', st.font) : ty.removeAttribute('font');
      const a = [`text="${st.text}"`, `cell="${st.cell}"`];
      if (st.shape !== 'square') a.push(`shape="${st.shape}"`);
      if (st.font) a.push(`font="${st.font.replace(/"/g, "'")}"`);
      if (st.depth !== 1) a.push(`depth="${st.depth}"`);
      if (st.gap !== .1) a.push(`gap="${st.gap}"`);
      if (st.shade) a.push(`shade="${st.shade}"`);
      a.push('fit');
      showCode($('#t-code'), `<piix-type ${a.join(' ')}></piix-type>`);
    };
    $('#t-text').addEventListener('input', e => { st.text = e.target.value; render(); });
    $('#t-cell').addEventListener('input', e => { st.cell = +e.target.value; $('#t-cell-o').value = st.cell; render(); });
    $('#t-depth').addEventListener('input', e => { st.depth = +e.target.value; $('#t-depth-o').value = st.depth; render(); });
    $('#t-gap').addEventListener('input', e => { st.gap = +e.target.value; $('#t-gap-o').value = st.gap; render(); });
    seg($('#t-shade'), 'v', v => { st.shade = v; render(); });
    seg($('#t-shape'), 'v', v => { st.shape = v; render(); });
    $('#t-font').addEventListener('change', e => { st.font = e.target.value; render(); });
    $('#t-replay').addEventListener('click', () => ty.replay && ty.replay());
    render();
  }

  /* ---------- sidebar: highlight the in-page section you're reading ---------- */
  const here = location.pathname.split('/').pop() || 'index.html';
  const links = $$('.side a').filter(a => a.getAttribute('href').startsWith(here + '#'));
  const targets = links.map(a => document.getElementById(a.getAttribute('href').split('#')[1])).filter(Boolean);
  if (targets.length) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('on', a.getAttribute('href').endsWith('#' + e.target.id)));
    }), { rootMargin: '-40% 0px -55% 0px' });
    targets.forEach(t => io.observe(t));
  }
})();
