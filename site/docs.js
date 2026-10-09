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
    const st = { name: 'gloop', size: 176, hue: 0, look: 'mouse', shy: false, tilt: false, still: false, nap: false, render: '', depth: 2, color: '' };
    const stage = $('#c-stage');
    const render = () => {
      sp.setAttribute('name', st.name);
      sp.setAttribute('size', st.size);
      st.hue ? sp.setAttribute('hue', st.hue) : sp.removeAttribute('hue');
      sp.setAttribute('look', st.look);
      const fig = Piixpal.figures[st.name], voxel = st.render === 'voxel' || (!st.render && fig.render === 'voxel');
      st.render ? sp.setAttribute('render', st.render) : sp.removeAttribute('render');
      voxel ? sp.setAttribute('depth', st.depth) : sp.removeAttribute('depth');
      st.color && fig.recolor ? sp.setAttribute('color', st.color) : sp.removeAttribute('color');
      $('#c-depth').disabled = !voxel;
      $('#c-color').disabled = !fig.recolor;
      ['shy', 'tilt', 'still'].forEach(k => sp.toggleAttribute(k, st[k]));
      st.nap ? sp.setAttribute('sleep-after', '4') : sp.removeAttribute('sleep-after');
      $('#c-name').textContent = st.name;
      $('#c-pick').value = st.name;
      $$('.scard').forEach(c => c.classList.toggle('sel', c.id === 's-' + st.name));
      const attrs = [`name="${st.name}"`];
      attrs.push(`size="${st.size}"`);
      if (st.render) attrs.push(`render="${st.render}"`);
      if (voxel && st.depth !== (fig.depth || 3)) attrs.push(`depth="${st.depth}"`);
      if (st.color && fig.recolor) attrs.push(`color="${st.color}"`);
      if (st.hue) attrs.push(`hue="${st.hue}"`);
      if (st.look !== 'mouse') attrs.push(`look="${st.look}"`);
      ['shy', 'tilt', 'still'].forEach(k => st[k] && attrs.push(k));
      if (st.nap) attrs.push('sleep-after="4"');
      const tag = `<piix-sprite ${attrs.join(' ')}></piix-sprite>`;
      /* the same sprite, for every setup */
      const CDN = 'https://cdn.jsdelivr.net/npm/piixpal@0.4/';
      const Name = st.name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('');
      const jsx = attrs.map(a => a.replace(/^([\w-]+)="(\d+)"$/, '$1={$2}')).filter(a => !a.startsWith('name=')).join(' ');
      const props = attrs.filter(a => !a.startsWith('name=')).join(' ');
      codes = {
        HTML: `<script src="${CDN}piixpal.min.js"></script>\n\n${tag}`,
        'Single file': `<script src="${CDN}dist/c/${st.name}.min.js"></script>\n\n${tag}`,
        React: `// npm install piixpal\nimport { PiixSprite } from "piixpal/react";\n\n<PiixSprite name="${st.name}"${jsx ? ' ' + jsx : ''} />`,
        Vue: `// main.js: app.use(Piixpal) from "piixpal/vue"\n\n${tag}`,
        Svelte: `<script>import Piixpal from "piixpal/svelte";</script>\n<Piixpal />\n\n${tag}`,
        shadcn: `npx shadcn@latest add https://piixpal.dvkk.dev/r/${st.name}.json\n\nimport { ${Name} } from "@/components/piixpal/${st.name}";\n\n<${Name}${props ? ' ' + props : ''} />`
      };
      tabs();
    };
    /* code tabs under the customiser */
    let codes = {}, tab = 'HTML';
    const tabs = () => {
      const bar = $('#c-tabs');
      if (!bar.children.length) Object.keys(codes).forEach(k => {
        const b = document.createElement('button');
        b.type = 'button'; b.role = 'tab'; b.textContent = k;
        b.addEventListener('click', () => { tab = k; tabs(); });
        bar.appendChild(b);
      });
      [...bar.children].forEach(b => b.setAttribute('aria-selected', String(b.textContent === tab)));
      showCode($('#c-code'), codes[tab]);
    };
    const pick = name => { st.name = name; render(); };
    $('#c-pick').addEventListener('change', e => pick(e.target.value));
    $('#c-size').addEventListener('input', e => { st.size = +e.target.value; $('#c-size-o').value = st.size; render(); });
    $('#c-hue').addEventListener('input', e => { st.hue = +e.target.value; $('#c-hue-o').value = st.hue + '°'; render(); });
    seg($('#c-look'), 'look', v => { st.look = v; render(); });
    seg($('#c-render'), 'render', v => { st.render = v; render(); });
    $('#c-depth').addEventListener('input', e => { st.depth = +e.target.value; $('#c-depth-o').value = st.depth; render(); });
    $('#c-color').addEventListener('input', e => { st.color = e.target.value; render(); });
    $('#c-color-x').addEventListener('click', () => { st.color = ''; render(); });
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

/* ---------- crowd customiser ---------- */
(() => {
  const cr = document.getElementById('cr-demo');
  if (!cr) return;
  const code = document.getElementById('cr-code');
  const st = { mode: 'crowd', count: 90, text: 'HELLO' };
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const render = () => {
    cr.setAttribute('mode', st.mode); cr.setAttribute('count', st.count); cr.setAttribute('text', st.text || 'HI');
    document.getElementById('cr-text').disabled = st.mode !== 'form';
    const tag = `<piix-crowd mode="${st.mode}" count="${st.count}"${st.mode === 'form' ? ` text="${st.text}"` : ''}></piix-crowd>`;
    code.innerHTML = '<button class="copy" type="button">Copy</button>' + esc(tag);
    code.querySelector('.copy').onclick = async e => {
      try { await navigator.clipboard.writeText(tag); } catch (_) { /* clipboard blocked */ }
      e.target.textContent = 'Copied'; setTimeout(() => { e.target.textContent = 'Copy'; }, 1200);
    };
  };
  document.getElementById('cr-mode').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    e.currentTarget.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    st.mode = b.dataset.v;
    if (st.mode === 'form' && st.count < 150) { st.count = 180; document.getElementById('cr-count').value = 180; document.getElementById('cr-count-o').value = 180; }
    render();
  });
  document.getElementById('cr-count').addEventListener('input', e => { st.count = +e.target.value; document.getElementById('cr-count-o').value = st.count; render(); });
  document.getElementById('cr-text').addEventListener('input', e => { st.text = e.target.value.toUpperCase(); render(); });
  render();
})();

/* ---------- tabs: [data-tabs] > .tab-bar buttons + .tab-pane ---------- */
document.querySelectorAll('[data-tabs]').forEach(box => {
  const btns = [...box.querySelectorAll(':scope > .tab-bar > button')], panes = [...box.querySelectorAll(':scope > .tab-pane')];
  btns.forEach((b, i) => b.addEventListener('click', () => {
    btns.forEach((x, j) => x.setAttribute('aria-selected', i === j));
    panes.forEach((p, j) => { p.hidden = i !== j; });
  }));
});

/* ---------- builder ---------- */
(() => {
  const list = document.getElementById('b-list');
  if (!list || !window.PIIX_BUILDER) return;
  const site = document.getElementById('b-site'), code = document.getElementById('b-code');
  const WHERE = { pal: 'h1', toy: 'h1', group: 'footer', sprite: 'h1' };
  const BEST = { bounce: 'footer', sweep: 'footer', pop: 'footer', perch: '.btn', peek: '.card', climb: '.card', hang: 'nav', mind: 'p', lounge: 'p', school: '.card', glow: '.card', wire: 'nav', beeline: '.card' };
  const OPTS = ['h1', 'p', 'nav', '.btn', '.card', 'footer'];
  const picked = new Map([['bitbug', 'h1'], ['pip', '.btn'], ['boing', 'footer']]);
  let mode = 'one';
  const group = { pal: 'Pals', toy: 'Toy box', group: 'Groups', sprite: 'Sprites' };
  let html = '';
  for (const k of Object.keys(group)) {
    html += '<h4>' + group[k] + '</h4>';
    for (const c of window.PIIX_BUILDER.filter(c => c.kind === k)) {
      const def = BEST[c.does] || WHERE[k];
      html += '<label class="b-item"><input type="checkbox" value="' + c.id + '"' + (picked.has(c.id) ? ' checked' : '') + '> <span>' + c.id + '</span>' +
        '<select data-for="' + c.id + '">' + OPTS.map(o => '<option' + (o === (picked.get(c.id) || def) ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></label>';
    }
  }
  list.innerHTML = html;
  const map = sel => site.querySelector(sel === '.btn' ? '.b-btn' : '[data-where="' + sel + '"]');
  const render = () => {
    site.querySelectorAll('piix-pal,piix-sprite').forEach(e => e.remove());
    picked.forEach((where, id) => {
      const c = window.PIIX_BUILDER.find(x => x.id === id);
      if (c.kind === 'sprite') { const t = map(where); if (t) Piixpal.add(id, t, { size: c.big ? 96 : 56, type: 'sprite' }); }
      else if (where === '.btn') Piixpal.add(id, '#b-site .b-btn');
      else { const t = map(where); if (t) Piixpal.add(id, t); }
    });
    const items = [...picked].map(([id, w]) => id + '@' + w).join(', ');
    const base = 'https://cdn.jsdelivr.net/npm/piixpal@0.4/';
    const out = !picked.size ? '<!-- tick a pal on the left -->'
      : mode === 'all' ? '<script src="' + base + 'piixpal.min.js"\n  data-pals="' + items + '"></script>'
      : [...picked.keys()].map((id, i) => '<script src="' + base + 'dist/c/' + id + '.min.js"' + (i === 0 ? '\n  data-pals="' + items + '"' : '') + '></script>').join('\n');
    code.textContent = out;
    const b = document.createElement('button'); b.className = 'copy'; b.type = 'button'; b.textContent = 'Copy';
    b.onclick = async () => { try { await navigator.clipboard.writeText(out); } catch (_) {} b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy'; }, 1200); };
    code.prepend(b);
  };
  list.addEventListener('change', e => {
    const t = e.target;
    if (t.type === 'checkbox') { if (t.checked) picked.set(t.value, list.querySelector('select[data-for="' + t.value + '"]').value); else picked.delete(t.value); }
    if (t.tagName === 'SELECT' && picked.has(t.dataset.for)) picked.set(t.dataset.for, t.value);
    render();
  });
  document.getElementById('b-mode').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    e.currentTarget.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    mode = b.dataset.v; render();
  });
  render();
})();

/* ---------- demo buttons that call a pal's API: data-call="#selector:method" data-args='["a",1]' ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-call]');
  if (!b) return;
  const [sel, method] = b.dataset.call.split(':');
  const el = document.querySelector(sel);
  const t = el && (el.ctl || el);
  let args = [];
  try { args = b.dataset.args ? JSON.parse(b.dataset.args) : []; } catch (_) { /* bad JSON */ }
  if (t && typeof t[method] === 'function') t[method](...args);
});

/* ---------- sidebar: filter by name; open the group you're in ---------- */
(() => {
  const side = document.querySelector('.side');
  if (!side) return;
  const find = side.querySelector('.side-find'), none = side.querySelector('.side-none');
  const groups = [...side.querySelectorAll('.sg')];
  const was = groups.map(g => g.open);
  find && find.addEventListener('input', () => {
    const q = find.value.trim().toLowerCase();
    let any = false;
    groups.forEach((g, i) => {
      let hit = false;
      g.querySelectorAll(':scope > a').forEach(a => { const ok = !q || a.textContent.toLowerCase().includes(q); a.hidden = !ok; hit = hit || ok; });
      g.querySelectorAll(':scope > h5').forEach(h => { let n = h.nextElementSibling, vis = false; while (n && n.tagName === 'A') { vis = vis || !n.hidden; n = n.nextElementSibling; } h.hidden = !vis; });
      g.hidden = q && !hit;
      g.open = q ? hit : was[i];
      any = any || hit;
    });
    if (none) none.hidden = !q || any;
  });
  /* the current item stays in view in the sidebar */
  const cur = () => { const a = side.querySelector('a.on'); if (a && side.scrollHeight > side.clientHeight) { const r = a.getBoundingClientRect(), s = side.getBoundingClientRect(); if (r.top < s.top + 40 || r.bottom > s.bottom - 40) side.scrollTop += r.top - s.top - s.height / 2; } };
  new MutationObserver(cur).observe(side, { subtree: true, attributes: true, attributeFilter: ['class'] });
})();

/* ---------- on phones the sidebar sits above the page: start it folded ---------- */
if (matchMedia('(max-width: 900px)').matches) document.querySelectorAll('.side .sg').forEach(g => { g.open = false; });

/* ---------- on phones the whole sidebar folds into one "Browse" button ---------- */
(() => {
  const side = document.querySelector('.side');
  if (!side || !matchMedia('(max-width: 900px)').matches) return;
  const d = document.createElement('details');
  d.className = 'side-fold';
  const s = document.createElement('summary');
  s.textContent = 'Browse all components';
  d.appendChild(s);
  while (side.firstChild) d.appendChild(side.firstChild);
  side.appendChild(d);
})();
