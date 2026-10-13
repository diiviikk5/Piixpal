/* Pixel UI docs: live controls, replay, and the "on this page" highlight. */
(() => {
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* set one attribute on every <tag …> in a snippet of markup, keeping the others in order */
  const setAttr = (code, tag, name, val) => code.replace(new RegExp('<' + tag + '\\b([^>]*)>', 'g'), (m, rest) => {
    const attrs = [];
    rest.replace(/\s([\w-]+)(?:="([^"]*)")?/g, (_, k, v) => { attrs.push([k, v]); });
    const i = attrs.findIndex(([k]) => k === name);
    if (val == null) { if (i >= 0) attrs.splice(i, 1); }
    else if (i >= 0) attrs[i][1] = val; else attrs.push([name, val]);
    return '<' + tag + attrs.map(([k, v]) => v == null ? ' ' + k : ` ${k}="${v}"`).join('') + '>';
  });

  $$('.ui-demo').forEach(demo => {
    const stage = demo.querySelector('.stage-in'), pre = demo.querySelector('pre.codebox');
    let code = demo.dataset.code;
    const show = () => {
      pre.innerHTML = '<button class="copy" type="button">Copy</button>' + esc(code);
      pre.querySelector('.copy').onclick = async e => {
        try { await navigator.clipboard.writeText(code); } catch (_) { /* clipboard blocked */ }
        e.target.textContent = 'Copied'; setTimeout(() => { e.target.textContent = 'Copy'; }, 1200);
      };
    };

    /* replay: rebuild the preview so intro animations run again */
    const replay = demo.querySelector('.replay');
    if (replay) replay.addEventListener('click', () => { stage.innerHTML = stage.innerHTML; });

    const box = demo.querySelector('.ui-controls');
    if (!box) return;
    const tag = box.dataset.target;
    const apply = (name, val, def) => {
      const v = val === '' || String(val) === String(def) ? null : String(val);
      stage.querySelectorAll(tag).forEach(el => { v == null ? el.removeAttribute(name) : el.setAttribute(name, v); });
      code = setAttr(code, tag, name, v);
      show();
    };
    $$('.seg, .swatches', box).forEach(g => g.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      $$('button', g).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      apply(g.dataset.attr, b.dataset.val, g.dataset.def);
    }));
    $$('input[type=range]', box).forEach(r => {
      const o = r.nextElementSibling;
      r.addEventListener('input', () => { o.textContent = r.value; apply(r.dataset.attr, r.value, r.dataset.def); });
    });
  });

  /* "on this page": light up the section you're reading */
  const links = $$('.ui-toc a'), targets = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if (targets.length) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-20% 0px -70% 0px' });
    targets.forEach(t => io.observe(t));
  }
})();
