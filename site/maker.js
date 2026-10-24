/* The Pal Maker's page: the tabs, the name and what it does, the pal living on the page, and
 * every way to share it. The modes (site/maker-smooth.js, site/maker-pixel.js) build pals and
 * hand over a code; this keeps it in the URL hash, so a refresh or a link brings it back. */
(() => {
  const K = window.Piixpal && Piixpal._k, $ = id => document.getElementById(id);
  if (!K || !K.RIG || !$('mk-tabs')) return;
  const ORIGIN = 'https://piixpal.dvkk.dev';
  const DOES_TEXT = {
    crawl: 'walks along your text, hops the gaps, flips over when poked', bounce: 'hops along, leaps at the cursor; grab it and throw it',
    climb: 'walks all the way round an element', follow: 'naps until you come near, then follows the cursor about',
    perch: 'sits on your buttons, flies off when you come close', hang: 'dangles from an element on a thread',
    creep: 'creeps slowly, leaving a trail, hides when you come near', drop: 'parachutes onto the page when it scrolls into view',
    lounge: 'lies about, dozes, swats at the cursor', slide: 'waddles, then belly-slides along the element',
    toss: 'a toy: grab it and throw it round the page', float: 'floats on a string, like a balloon'
  };

  let common = { name: 'blob', does: 'crawl' }, code = '', liveT, hashT, saveT, saved = {};
  const S = window.PIIX_MAKER = {
    modes: {}, mode: null, tabName: 'draw',
    register(id, mode) { S.modes[id] = mode; },
    common: () => ({ ...common }),
    setCommon(o) { Object.assign(common, o); syncCommon(); },
    toast(t) { const el = $('mk-toast'); el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 2800); },
    publish(c) {
      if (c === code) return;
      code = c;
      share();
      clearTimeout(hashT); hashT = setTimeout(() => history.replaceState(null, '', '#' + code), 300);
      clearTimeout(liveT); liveT = setTimeout(live, 260);
    },
    tab(t, quiet) {
      S.tabName = t;
      S.mode = t === 'pixel' ? 'pixel' : 'smooth';
      $('mk-tabs').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.tab === t));
      document.querySelectorAll('[data-panel]').forEach(p => { p.hidden = !p.dataset.panel.split(' ').includes(t); });
      if (!quiet) S.modes[S.mode].activate(t);
    }
  };

  /* ---------- name and what it does, shared by every mode ---------- */
  const dsel = $('mk-does');
  K.RIG.DOES.forEach(d => dsel.add(new Option(d, d)));
  const syncCommon = () => {
    if (document.activeElement !== $('mk-name')) $('mk-name').value = common.name;
    dsel.value = common.does; $('mk-does-text').textContent = DOES_TEXT[common.does] || '';
  };
  $('mk-name').addEventListener('input', e => { common.name = e.target.value.replace(/[^\w .!?'-]/g, '').slice(0, 16); S.modes[S.mode].refresh(); });
  dsel.addEventListener('change', () => { common.does = dsel.value; syncCommon(); S.modes[S.mode].refresh(); });
  $('mk-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) S.tab(b.dataset.tab); });
  $('mk-surprise').addEventListener('click', () => S.modes[S.mode].surprise());

  /* ---------- the pal, alive ---------- */
  const live = () => {
    const stage = $('mk-stage');
    stage.querySelectorAll('piix-pal').forEach(p => p.remove());
    $('mk-title').firstChild.textContent = common.name || 'my pal';
    const p = document.createElement('piix-pal');
    p.setAttribute('make', code);
    /* perchers sit on buttons; everyone else lives on the heading */
    if (common.does === 'perch') p.setAttribute('on', '#mk-stage .btn');
    (common.does === 'perch' ? stage : $('mk-title')).appendChild(p);
  };

  /* ---------- sharing ---------- */
  /* a short link when the site has somewhere to keep pals (api/save.js); otherwise the code is the link */
  const linkFor = id => ORIGIN + '/p/' + id;
  const share = () => {
    const nm = (common.name || 'my pal').replace(/[<>"&]/g, ''), id = saved[code];
    const ref = id || code;
    const link = id || code.length <= 1800 ? linkFor(ref) : ORIGIN + '/components/make#' + code;
    $('mk-link').value = link;
    $('mk-open').href = id || code.length <= 1800 ? '/p/' + ref : '#' + code;
    $('mk-embed').textContent = `<script src="${ORIGIN}/piixpal.min.js" defer></script>\n\n<h1>Hello <piix-pal make="${ref}"></piix-pal></h1>`;
    $('mk-readme').textContent = `![${nm}](${ORIGIN}/readme?text=${encodeURIComponent(nm).replace(/'/g, '%27')}&pals=${ref})`;
    $('mk-bytes').textContent = id ? `Saved as ${id}. The link, the tag and the README image all use it.` : `${code.length.toLocaleString()} characters, and that’s the whole pal: no account, no upload.`;
    clearTimeout(saveT);
    if (!id) saveT = setTimeout(save, 1400);
  };
  const save = async () => {
    const c = code;
    try {
      const r = await fetch('/api/save', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: c });
      if (!r.ok) return;
      const { id } = await r.json();
      if (id) { saved[c] = id; if (c === code) share(); }
    } catch (_) { /* no store: long codes still work */ }
  };
  document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
    const el = $(b.dataset.copy);
    navigator.clipboard.writeText(el.value || el.textContent).then(() => { const t = b.textContent; b.textContent = 'Copied'; setTimeout(() => b.textContent = t, 1200); });
  }));
  $('mk-png').addEventListener('click', async () => {
    const c = await S.modes[S.mode].png();
    c.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (common.name || 'pal').replace(/\W+/g, '-') + '.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
  });

  /* ---------- start: from the link's code, or a fresh drawing ---------- */
  const start = async () => {
    syncCommon();
    let h = decodeURIComponent(location.hash.slice(1));
    /* a short id from a share page: fetch the code it stands for */
    if (h && h.length < 16) { try { const r = await fetch('/api/pal?id=' + encodeURIComponent(h)); if (r.ok) h = (await r.text()).trim(); } catch (_) { /* keep it */ } }
    if (h.length > 16) {
      try {
        if (K.RIG.smooth(h)) { const t = await S.modes.smooth.load(h); S.tab(t); return; }
        S.modes.pixel.load(h); S.tab('pixel'); return;
      } catch (e) { S.toast('That pal code looks broken, so here’s a fresh one.'); }
    }
    S.tab('draw');
  };
  /* after every mode has registered (they load deferred, after this) */
  addEventListener('DOMContentLoaded', start);
})();
