/* The Pal Maker's pixel mode: a pixel grid editor, plus pixelating any image, emoji or library
 * pal. The pal is a MAKER code (src/maker.js); site/maker.js shows it live and shares it. */
(() => {
  const K = window.Piixpal && Piixpal._k, M = K && K.MAKER, S = window.PIIX_MAKER;
  const $ = id => document.getElementById(id);
  if (!M || !S || !$('mk-cv')) return;
  const toast = t => S.toast(t);

  /* ---------- state ---------- */
  let m = M.blank();
  let tool = 'pen', cur = 1, mirror = false;
  const undo = [], redo = [];
  const snap = () => JSON.stringify({ ...m, px: [...m.px] });
  const load = s => { const o = JSON.parse(s); o.px = Uint8Array.from(o.px); m = o; };
  const remember = () => { undo.push(snap()); if (undo.length > 80) undo.shift(); redo.length = 0; };

  /* ---------- the editor canvas ---------- */
  const cv = $('mk-cv'), g = cv.getContext('2d');
  let cell = 20;
  const ink = { k: () => m.ink, w: () => '#ffffff', m: () => '#ff5d73', c: () => '#ff9ab8' };
  const draw = () => {
    /* as big as fits beside its controls and inside the window */
    const ed = cv.closest('.mk-ed'), beside = getComputedStyle(ed).gridTemplateColumns.split(' ').length > 1 ? 220 : 0;
    const box = Math.min(ed.clientWidth - beside || 420, Math.max(280, innerHeight - 400), 560);
    cell = Math.max(8, Math.floor((box - 4) / Math.max(m.w, m.h)));
    const W = m.w * cell, H = m.h * cell, dpr = devicePixelRatio || 1;
    if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* a checkerboard for empty */
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      g.fillStyle = (x + y) % 2 ? '#ece7dc' : '#f6f2ea';
      g.fillRect(x * cell, y * cell, cell, cell);
    }
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const c = m.px[y * m.w + x];
      if (c) { g.fillStyle = m.colors[c - 1]; g.fillRect(x * cell, y * cell, cell, cell); }
    }
    /* the face, as it will be drawn (it isn't part of the drawing: it moves and blinks) */
    const face = M.frame({ ...m, outline: false, legs: 0, wings: 0 });
    g.globalAlpha = .92;
    face.forEach((row, y) => [...row].forEach((ch, x) => {
      if (!ink[ch]) return;
      g.fillStyle = ink[ch](); g.fillRect(x * cell, y * cell, cell, cell);
    }));
    g.globalAlpha = 1;
    /* a faint grid, and the centre line when mirroring */
    g.strokeStyle = 'rgba(23,18,31,.07)'; g.lineWidth = 1; g.beginPath();
    for (let x = 1; x < m.w; x++) { g.moveTo(x * cell + .5, 0); g.lineTo(x * cell + .5, H); }
    for (let y = 1; y < m.h; y++) { g.moveTo(0, y * cell + .5); g.lineTo(W, y * cell + .5); }
    g.stroke();
    if (mirror) { g.strokeStyle = 'rgba(107,76,255,.6)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke(); g.setLineDash([]); }
  };

  const at = e => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / cell), Math.floor((e.clientY - r.top) / cell)]; };
  const inside = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
  const set = (x, y, c) => {
    if (!inside(x, y)) return;
    m.px[y * m.w + x] = c;
    if (mirror) m.px[y * m.w + (m.w - 1 - x)] = c;
  };
  const fill = (x, y, c) => {
    const from = m.px[y * m.w + x];
    if (from === c) return;
    const st = [[x, y]];
    while (st.length) {
      const [px, py] = st.pop();
      if (!inside(px, py) || m.px[py * m.w + px] !== from) continue;
      m.px[py * m.w + px] = c;
      st.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
  };
  let down = false, last = null;
  /* a line between pointer samples, so fast strokes don't leave gaps */
  const stroke = (x0, y0, x1, y1, c) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c);
  };
  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    const [x, y] = at(e);
    if (!inside(x, y)) return;
    remember();
    if (tool === 'pick') { const c = m.px[y * m.w + x]; if (c) { cur = c; tool = 'pen'; } ui(); return; }
    if (tool === 'fill') { fill(x, y, cur); changed(); return; }
    if (tool === 'eyes') { if (!m.eyes.style) m.eyes.style = 3; m.eyes.x = x; m.eyes.y = y; changed(); return; }
    if (tool === 'mouth') { if (!m.mouth.style) m.mouth.style = 2; m.mouth.x = x; m.mouth.y = y; changed(); return; }
    down = true; last = [x, y];
    cv.setPointerCapture(e.pointerId);
    set(x, y, tool === 'erase' || e.button === 2 ? 0 : cur);
    draw();
  });
  cv.addEventListener('pointermove', e => {
    if (!down) return;
    const [x, y] = at(e);
    stroke(last[0], last[1], x, y, tool === 'erase' || (e.buttons & 2) ? 0 : cur);
    last = [x, y]; draw();
  });
  const up = () => { if (down) { down = false; changed(); } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', e => e.preventDefault());

  /* ---------- resizing keeps the drawing standing on the floor, centred ---------- */
  const resize = (w, h) => {
    const px = new Uint8Array(w * h), dx = Math.floor((w - m.w) / 2), dy = h - m.h;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h) px[ny * w + nx] = m.px[y * m.w + x];
    }
    m.eyes.x += dx; m.eyes.y += dy; m.mouth.x += dx; m.mouth.y += dy;
    m.w = w; m.h = h; m.px = px;
  };

  /* ---------- turn anything into a pal: images, photos, logos, emoji ---------- */
  const quantize = (pixels, k) => {
    /* k-means on the opaque pixels, started from spread-out picks */
    const pts = pixels.filter(p => p);
    if (!pts.length) return { centers: [], map: pixels.map(() => 0) };
    const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    const centers = [pts[0].slice()];
    while (centers.length < k) {
      let best = null, bd = -1;
      for (const p of pts) { const d = Math.min(...centers.map(c => d2(p, c))); if (d > bd) { bd = d; best = p; } }
      if (bd < 120) break;
      centers.push(best.slice());
    }
    for (let it = 0; it < 8; it++) {
      const sum = centers.map(() => [0, 0, 0, 0]);
      for (const p of pts) { let bi = 0, bd = Infinity; centers.forEach((c, i) => { const d = d2(p, c); if (d < bd) { bd = d; bi = i; } }); const s = sum[bi]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; }
      sum.forEach((s, i) => { if (s[3]) centers[i] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
    }
    const map = pixels.map(p => { if (!p) return 0; let bi = 0, bd = Infinity; centers.forEach((c, i) => { const d = d2(p, c); if (d < bd) { bd = d; bi = i; } }); return bi + 1; });
    return { centers, map };
  };
  const toHex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  /* draw the source big, average it down to the grid, drop the background, pick a palette */
  const pixelate = (src, sw, sh, { colors = +$('mk-ncol').value || 8, emoji = false } = {}) => {
    remember();
    const w = m.w, h = m.h, S = 8, c = document.createElement('canvas');
    c.width = w * S; c.height = h * S;
    const cg = c.getContext('2d', { willReadFrequently: true });
    const fit = Math.min(c.width / sw, c.height / sh), dw = sw * fit, dh = sh * fit;
    cg.imageSmoothingQuality = 'high';
    cg.drawImage(src, (c.width - dw) / 2, c.height - dh, dw, dh);
    const d = cg.getImageData(0, 0, c.width, c.height).data;
    const px = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, gg = 0, b = 0, a = 0;
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        const o = ((y * S + j) * c.width + x * S + i) * 4, al = d[o + 3] / 255;
        r += d[o] * al; gg += d[o + 1] * al; b += d[o + 2] * al; a += al;
      }
      px.push(a / (S * S) > .5 ? [r / a, gg / a, b / a] : null);
    }
    /* a photo or a logo on a plain background: if the corners agree, that colour is the background */
    const corners = [px[0], px[w - 1], px[(h - 1) * w], px[h * w - 1]].filter(Boolean);
    if (corners.length === 4) {
      const bg = corners.reduce((s, p) => s.map((v, i) => v + p[i] / 4), [0, 0, 0]);
      const close = p => p && Math.hypot(p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]) < 48;
      if (corners.every(close)) {
        /* flood in from the edges, so the same colour inside the subject stays */
        const seen = new Uint8Array(w * h), st = [];
        for (let x = 0; x < w; x++) st.push([x, 0], [x, h - 1]);
        for (let y = 0; y < h; y++) st.push([0, y], [w - 1, y]);
        while (st.length) {
          const [x, y] = st.pop(), i = y * w + x;
          if (x < 0 || y < 0 || x >= w || y >= h || seen[i] || !close(px[i])) continue;
          seen[i] = 1; px[i] = null;
          st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
      }
    }
    const { centers, map } = quantize(px, Math.max(2, Math.min(15, colors)));
    if (!centers.length) return false;
    m.colors = centers.map(toHex);
    m.px = Uint8Array.from(map);
    /* it brings its own face */
    m.eyes.style = 0; m.mouth.style = 0; m.cheeks = false;
    if (emoji) m.outline = true;
    cur = 1;
    changed();
    return true;
  };
  const fromFile = file => {
    if (!file || !/^image\//.test(file.type)) return;
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { pixelate(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(url); toast('Pixelated. Now give it a face, or keep its own.'); };
    img.src = url;
  };
  $('mk-file').addEventListener('change', e => fromFile(e.target.files[0]));
  cv.parentElement.addEventListener('dragover', e => { e.preventDefault(); cv.parentElement.classList.add('drop'); });
  cv.parentElement.addEventListener('dragleave', () => cv.parentElement.classList.remove('drop'));
  cv.parentElement.addEventListener('drop', e => { e.preventDefault(); cv.parentElement.classList.remove('drop'); fromFile(e.dataTransfer.files[0]); });
  addEventListener('paste', e => { if (S.mode !== 'pixel') return; const f = [...(e.clipboardData || {}).files || []].find(f => /^image\//.test(f.type)); if (f) fromFile(f); });
  const fromEmoji = () => {
    const t = $('mk-emoji').value.trim();
    if (!t) return;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const cg = c.getContext('2d');
    cg.font = '220px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    cg.textAlign = 'center'; cg.textBaseline = 'middle';
    cg.fillText([...t].slice(0, 2).join(''), 128, 140);
    /* crop to what was drawn, so it fills the grid */
    const d = cg.getImageData(0, 0, 256, 256).data;
    let l = 256, r = 0, tp = 256, b = 0;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (d[(y * 256 + x) * 4 + 3] > 20) { l = Math.min(l, x); r = Math.max(r, x); tp = Math.min(tp, y); b = Math.max(b, y); }
    if (r <= l) return;
    const crop = document.createElement('canvas'); crop.width = r - l + 1; crop.height = b - tp + 1;
    crop.getContext('2d').drawImage(c, l, tp, crop.width, crop.height, 0, 0, crop.width, crop.height);
    if (pixelate(crop, crop.width, crop.height, { emoji: true })) {
      const nm = S.common().name;
      if (!nm || nm === 'blob' || nm === 'pal') S.setCommon({ name: 'mojo' });
      toast('Emoji in. Pick some legs and it’s alive.');
    }
  };
  $('mk-emoji-go').addEventListener('click', fromEmoji);
  $('mk-emoji').addEventListener('keydown', e => { if (e.key === 'Enter') fromEmoji(); });

  /* remix one of the library's pals: its standing frame becomes your drawing */
  const remix = name => {
    const sp = K.SPRITES[name];
    if (!sp) return;
    const clip = sp.frames.idle ? 'idle' : sp.frames.walk ? 'walk' : Object.keys(sp.frames)[0];
    const rows = sp.frames[clip][0].map(r => String(r));
    remember();
    const keys = [...new Set(rows.join('').replace(/\./g, ''))].filter(k => sp.palette[k]).slice(0, 15);
    const w = Math.min(32, Math.max(4, sp.w)), h = Math.min(32, Math.max(4, sp.h)), pad = h - rows.length;
    m.w = w; m.h = h; m.px = new Uint8Array(w * h);
    m.colors = keys.map(k => sp.palette[k].slice(0, 7));
    rows.forEach((r, y) => [...r].slice(0, w).forEach((ch, x) => { const i = keys.indexOf(ch); if (i >= 0 && y + pad >= 0 && y + pad < h) m.px[(y + pad) * w + x] = i + 1; }));
    m.eyes.style = 0; m.mouth.style = 0; m.cheeks = false; m.outline = false;
    S.setCommon({ name: name + ' remix' });
    cur = 1; changed();
    toast('Remixing ' + name + '. Recolour it, add wings, make it yours.');
  };
  const rsel = $('mk-remix');
  Object.keys(K.SPRITES).filter(n => n[0] !== '_' && !n.startsWith('mk-')).sort().forEach(n => rsel.add(new Option(n, n)));
  rsel.addEventListener('change', () => { remix(rsel.value); rsel.value = ''; });

  /* something random and alive, to start from */
  const surprise = () => {
    remember();
    const R = (a, b) => a + Math.random() * (b - a), P = a => a[Math.floor(Math.random() * a.length)];
    const w = P([12, 14, 16]), h = P([10, 12, 14]), px = new Uint8Array(w * h);
    const hue = R(0, 360), hsl = (l, s = 80) => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = `hsl(${hue},${s}%,${l}%)`; return c.fillStyle; };
    const rx = R(w * .32, w * .48), ry = R(h * .32, h * .46), cx = w / 2, cy = h - ry - .2;
    const ear = Math.random() < .5;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry;
      let on = dx * dx + dy * dy <= 1;
      if (ear && !on && y >= cy - ry - 2 && y < cy - ry + 1 && (Math.abs(x + .5 - (cx - rx * .55)) < 1 || Math.abs(x + .5 - (cx + rx * .55)) < 1)) on = true;
      if (on) px[y * w + x] = y < cy - ry * .3 && x < cx ? 2 : (dy > .45 || dx > .6) ? 3 : 1;
    }
    const style = P([1, 3, 3, 4, 5, 6]), ew = style === 4 ? 3 : style === 3 || style === 5 || style === 6 ? 2 : 1, eh = style === 4 ? 3 : style === 6 || style === 1 ? 1 : 2;
    const ex = Math.round(cx), ey = Math.round(cy - ry * .25), gap = ew + P([1, 2, 2, 3]);
    /* the mouth sits centred under the eyes */
    const mouth = P([0, 1, 2, 2, 3, 4, 5]), mw = [0, 1, 3, 5, 2, 3][mouth];
    const mx = Math.round(Math.min(w - ew * 2 - 2, ex - 1) + (gap + ew) / 2 - mw / 2);
    Object.assign(m, {
      w, h, px, colors: [hsl(R(55, 68)), hsl(R(80, 90)), hsl(R(35, 45))], ink: '#1b1226',
      outline: true, cheeks: Math.random() < .6,
      eyes: { style, x: Math.min(w - ew * 2 - 2, ex - 1), y: ey, gap },
      mouth: { style: mouth, x: mx, y: Math.min(h - 2, ey + eh + 1) }, scale: 4,
      legs: P([0, 1, 1, 2, 3, 4]), wings: Math.random() < .3 ? P([1, 2]) : 0,
      does: P(['crawl', 'bounce', 'climb', 'creep', 'slide', 'drop', 'follow', 'hang']),
      name: P(['blip', 'mochi', 'nib', 'puddle', 'zuzu', 'plum', 'bean', 'fig', 'tuft', 'nugget', 'pip-pop', 'gumdrop'])
    });
    if (m.wings && Math.random() < .6) m.does = 'follow';
    S.setCommon({ name: m.name, does: m.does });
    cur = 1; changed();
  };

  /* ---------- the controls ---------- */
  const segs = [];
  const seg = (box, list, get, setv) => {
    box.innerHTML = list.map((t, i) => `<button type="button" data-v="${i}">${t}</button>`).join('');
    box.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; remember(); setv(+b.dataset.v); changed(); });
    segs.push(() => box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === get())));
  };
  seg($('mk-eyes'), M.EYES, () => m.eyes.style, v => { m.eyes.style = v; });
  seg($('mk-mouth'), M.MOUTHS, () => m.mouth.style, v => { m.mouth.style = v; });
  seg($('mk-legs'), M.LEGS, () => m.legs, v => { m.legs = v; });
  seg($('mk-wings'), M.WINGS, () => m.wings, v => { m.wings = v; });
  $('mk-gap').addEventListener('input', e => { m.eyes.gap = +e.target.value; changed(); });
  $('mk-scale').addEventListener('input', e => { m.scale = +e.target.value; changed(); });
  $('mk-outline').addEventListener('change', e => { remember(); m.outline = e.target.checked; changed(); });
  $('mk-cheeks').addEventListener('change', e => { remember(); m.cheeks = e.target.checked; changed(); });
  $('mk-ink').addEventListener('input', e => { m.ink = e.target.value; changed(); });
  $('mk-size').addEventListener('change', e => { remember(); const s = +e.target.value; resize(s, s); changed(); });

  /* tools */
  $('mk-tools').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const t = b.dataset.t;
    if (t === 'mirror') mirror = !mirror;
    else if (t === 'undo') { if (undo.length) { redo.push(snap()); load(undo.pop()); changed(false, true); } }
    else if (t === 'redo') { if (redo.length) { undo.push(snap()); load(redo.pop()); changed(false, true); } }
    else if (t === 'clear') { remember(); m.px = new Uint8Array(m.w * m.h); changed(); }
    else tool = t;
    ui();
  });
  addEventListener('keydown', e => {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); $('mk-tools').querySelector(e.shiftKey ? '[data-t=redo]' : '[data-t=undo]').click(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); $('mk-tools').querySelector('[data-t=redo]').click(); return; }
    const map = { b: 'pen', p: 'pen', e: 'erase', g: 'fill', i: 'pick', m: 'mirror' };
    if (map[k] && !e.ctrlKey && !e.metaKey) $('mk-tools').querySelector(`[data-t=${map[k]}]`).click();
  });

  /* palette: click to paint with it, the picker beside it changes it */
  const pal = $('mk-pal');
  pal.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.add !== undefined) { if (m.colors.length < 15) { remember(); m.colors.push(m.colors[cur - 1] || '#ff9f1c'); cur = m.colors.length; changed(); } return; }
    if (b.dataset.del !== undefined) {
      if (m.colors.length < 2) return;
      remember();
      const k = cur;
      m.colors.splice(k - 1, 1);
      m.px = m.px.map(c => c === k ? 0 : c > k ? c - 1 : c);
      cur = Math.max(1, Math.min(cur, m.colors.length)); changed(); return;
    }
    cur = +b.dataset.i; if (tool === 'erase' || tool === 'pick') tool = 'pen'; ui();
  });
  $('mk-col').addEventListener('input', e => { m.colors[cur - 1] = e.target.value; changed(); });
  $('mk-col').addEventListener('focus', remember);

  const ui = () => {
    pal.innerHTML = m.colors.map((c, i) => `<button type="button" data-i="${i + 1}" style="--c:${c}" aria-pressed="${cur === i + 1}" aria-label="Colour ${i + 1}"></button>`).join('')
      + (m.colors.length < 15 ? '<button type="button" class="mk-plus" data-add aria-label="Add a colour">+</button>' : '')
      + (m.colors.length > 1 ? '<button type="button" class="mk-plus" data-del aria-label="Remove this colour">−</button>' : '');
    $('mk-col').value = m.colors[cur - 1] || '#000000';
    $('mk-tools').querySelectorAll('button').forEach(b => {
      const t = b.dataset.t;
      if (t === 'mirror') b.setAttribute('aria-pressed', mirror);
      else if (!['undo', 'redo', 'clear'].includes(t)) b.setAttribute('aria-pressed', t === tool);
    });
    segs.forEach(f => f());
    $('mk-gap').value = m.eyes.gap; $('mk-scale').value = m.scale;
    $('mk-outline').checked = m.outline; $('mk-cheeks').checked = m.cheeks; $('mk-ink').value = m.ink;
    $('mk-size').value = [12, 16, 20, 24, 32].includes(m.w) && m.w === m.h ? m.w : '';
    cv.dataset.tool = tool;
    draw();
  };

  /* ---------- hand the code to the page ---------- */
  const changed = () => {
    const com = S.common();
    m.name = com.name; m.does = com.does;
    ui();
    S.publish(M.encode(m));
  };
  addEventListener('resize', () => { if (S.mode === 'pixel') draw(); });
  S.register('pixel', {
    activate() { changed(); },
    refresh: changed,
    surprise,
    load(code) { m = M.decode(code); S.setCommon({ name: m.name, does: m.does }); },
    /* its standing frame, big, for the PNG download */
    png() {
      const sp = M.sprite(m), rows = sp.frames.idle[0], Z = 12, c = document.createElement('canvas');
      c.width = sp.w * Z; c.height = sp.h * Z;
      const cg = c.getContext('2d'), pad = sp.h - rows.length;
      rows.forEach((r, y) => [...r].forEach((ch, x) => { if (sp.palette[ch]) { cg.fillStyle = sp.palette[ch]; cg.fillRect(x * Z, (y + pad) * Z, Z, Z); } }));
      return c;
    }
  });
})();
