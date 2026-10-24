/* The Pal Maker's smooth modes: Draw (brush, filled shapes, eraser, starter shapes), Image (any
 * picture, background removed) and Emoji. Whatever the body is, it gets the vector rig from
 * src/rig.js: eyes, mouth, arms, legs, wings, a hat, an outline. Drag the face and hat where
 * they belong; the pal is a RIG code that site/maker.js shows live and shares. */
(() => {
  const K = window.Piixpal && Piixpal._k, R = K && K.RIG, S = window.PIIX_MAKER;
  const $ = id => document.getElementById(id);
  if (!R || !S || !$('sm-over')) return;
  const toast = t => S.toast(t);
  const clampN = (v, a, b) => Math.min(b, Math.max(a, v));
  /* the editor's window onto art space: the 256 box plus room for legs, hats and wings */
  const EB = [-56, -84, 368, 424];

  const PALETTE = ['#c6f432', '#efffc0', '#7fa61c', '#ff7aa8', '#4cc9f0', '#ffd23f', '#6b4cff', '#ff8a3d', '#ffffff', '#1b1226'];
  const fresh = () => ({
    name: 'blob', colors: PALETTE.slice(), emoji: '', strokes: [], bounds: [48, 64, 208, 224], image: null,
    eyes: { style: 2, x: 104, y: 126, r: 14, gap: 48 }, mouth: { style: 1, x: 128, y: 158, w: 26 }, cheeks: true,
    legs: 1, legLen: 32, arms: 1, wings: 0, hat: { style: 0, x: 128, y: 70, size: 72, rot: 0 },
    outline: 1, ink: '#1b1226', limb: '#1b1226', pixel: 0, does: 'crawl', size: 96
  });
  let m = fresh(), tool = 'brush', cur = 0, bsize = 10, autoFace = true, anim = false, pose = 'idle', sub = 'draw';
  const undo = [], redo = [];
  const snap = () => ({ ...m, strokes: m.strokes.map(s => ({ ...s, pts: s.pts.slice() })), eyes: { ...m.eyes }, mouth: { ...m.mouth }, hat: { ...m.hat }, colors: m.colors.slice(), bounds: m.bounds.slice(), _g: null, _img: null });
  const remember = () => { undo.push(snap()); if (undo.length > 60) undo.shift(); redo.length = 0; };

  /* ---------- starter shapes: filled strokes in the 256 box ---------- */
  const ring = (cx, cy, rx, ry, n = 28, wob = 0) => { const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, w = 1 + wob * Math.sin(a * 5); p.push(cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w); } return p; };
  const poly = pts => pts.flat();
  const SHAPES = {
    blob: () => ({ colors: ['#c6f432', '#efffc0', '#7fa61c'], strokes: [{ c: 0, fill: true, w: 8, pts: ring(128, 160, 84, 66) }, { c: 1, fill: true, w: 4, pts: ring(98, 132, 26, 14) }] }),
    bean: () => ({ colors: ['#ff7aa8', '#ffd1e3', '#d94f86'], strokes: [{ c: 0, fill: true, w: 60, pts: [128, 92, 128, 196] }, { c: 1, fill: true, w: 4, pts: ring(112, 108, 12, 18) }] }),
    ghost: () => ({ colors: ['#f4f1ff', '#c9c2ff', '#ffffff'], strokes: [{ c: 0, fill: true, w: 6, pts: poly([[56, 222], [56, 130], [70, 76], [128, 52], [186, 76], [200, 130], [200, 222], [178, 204], [156, 224], [128, 204], [100, 224], [78, 204]]) }] }),
    cube: () => ({ colors: ['#4cc9f0', '#bdeeff', '#2a8fb8'], strokes: [{ c: 0, fill: true, w: 40, pts: poly([[72, 92], [184, 92], [184, 200], [72, 200]]) }, { c: 2, fill: true, w: 6, pts: poly([[60, 196], [196, 196], [196, 220], [60, 220]]) }] }),
    star: () => ({ colors: ['#ffd23f', '#fff3b8', '#e0a800'], strokes: [{ c: 0, fill: true, w: 22, pts: Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 40 : 92; return [128 + Math.cos(a) * r, 146 + Math.sin(a) * r]; }).flat() }] }),
    cloud: () => ({ colors: ['#ffffff', '#e8f4ff', '#bcd7f2'], strokes: [[92, 160, 44], [140, 140, 54], [182, 168, 38], [128, 186, 44], [74, 190, 30]].map(([x, y, r]) => ({ c: 0, fill: true, w: 4, pts: ring(x, y, r, r * .9) })) }),
    egg: () => ({ colors: ['#fff6e0', '#ffe2a8', '#e8c27a'], strokes: [{ c: 0, fill: true, w: 6, pts: Array.from({ length: 30 }, (_, i) => { const a = i / 30 * Math.PI * 2, s = Math.sin(a); return [128 + Math.cos(a) * 70 * (s > 0 ? 1 : .86), 150 + s * 82]; }).flat() }, { c: 1, fill: true, w: 4, pts: ring(104, 118, 14, 20) }] }),
    cat: () => ({ colors: ['#ff9f43', '#ffe0bd', '#d9711c'], strokes: [{ c: 0, fill: true, w: 8, pts: poly([[64, 94], [74, 40], [110, 76], [146, 76], [182, 40], [192, 94]]) }, { c: 0, fill: true, w: 8, pts: ring(128, 150, 82, 70) }, { c: 1, fill: true, w: 4, pts: ring(128, 182, 40, 26) }, { c: 2, fill: false, w: 8, pts: [96, 96, 104, 112] }, { c: 2, fill: false, w: 8, pts: [160, 96, 152, 112] }] }),
    shroom: () => ({ colors: ['#ff5d5d', '#fff1d6', '#ffffff'], strokes: [{ c: 1, fill: true, w: 30, pts: poly([[100, 140], [156, 140], [160, 214], [96, 214]]) }, { c: 0, fill: true, w: 10, pts: Array.from({ length: 20 }, (_, i) => { const a = Math.PI + i / 19 * Math.PI; return [128 + Math.cos(a) * 96, 140 + Math.sin(a) * 80]; }).flat() }, ...[[84, 104, 12], [128, 84, 14], [170, 110, 11]].map(([x, y, r]) => ({ c: 2, fill: true, w: 2, pts: ring(x, y, r, r) }))] }),
    slime: () => ({ colors: ['#7ef0c8', '#d6fff0', '#33c49a'], strokes: [{ c: 0, fill: true, w: 8, pts: poly([[48, 216], [56, 150], [84, 100], [128, 82], [172, 100], [200, 150], [208, 216], [180, 210], [168, 226], [148, 214], [120, 222], [96, 212], [72, 222]]) }, { c: 1, fill: true, w: 4, pts: ring(98, 120, 16, 10) }] })
  };
  const useShape = k => {
    remember();
    const t = SHAPES[k]();
    m.strokes = t.strokes; m.colors = t.colors.concat(PALETTE.filter(c => !t.colors.includes(c))).slice(0, 12);
    m.image = null; m.emoji = ''; autoFace = true; cur = 0;
    if (m.eyes.style === 0) m.eyes.style = 2;
    if (m.mouth.style === 0) m.mouth.style = 1;
    S.setCommon({ name: k === 'shroom' ? 'shroomy' : k });
    bodyChanged();
  };

  /* ---------- bounds: rasterise the body alone and find where it is ---------- */
  let boundsJob = 0;
  const measure = () => new Promise(ok => {
    const job = ++boundsJob, img = new Image();
    img.onload = () => {
      if (job !== boundsJob) return ok(false);
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, 256, 256).data;
      let x0 = 256, y0 = 256, x1 = -1, y1 = -1;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (d[(y * 256 + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      m.bounds = x1 < 0 ? [96, 96, 160, 160] : [x0, y0, x1 + 1, y1 + 1];
      ok(true);
    };
    img.onerror = () => ok(false);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(R.bodySheet(m));
  });
  /* put the face, hat and legs where they'd naturally go on this body */
  const autoLayout = () => {
    const [x0, y0, x1, y1] = m.bounds, bw = x1 - x0, bh = y1 - y0, cx = (x0 + x1) / 2;
    const r = clampN(bw * .085, 6, 24), gap = clampN(bw * .3, r * 2.6, 96);
    Object.assign(m.eyes, { r, gap, x: cx - gap / 2, y: y0 + bh * .4 });
    Object.assign(m.mouth, { x: cx, y: m.eyes.y + r * 2, w: clampN(bw * .17, 10, 48) });
    Object.assign(m.hat, { x: cx, y: y0 + Math.min(10, bh * .06), size: clampN(bw * .5, 30, 130) });
    m.legLen = clampN(bh * .28, 14, 60);
  };
  let encT;
  const bodyChanged = async () => {
    await measure();
    if (autoFace) autoLayout();
    changed();
  };
  const changed = () => {
    m._g = null;
    render(); ui();
    clearTimeout(encT);
    encT = setTimeout(async () => {
      const com = S.common();
      m.name = com.name; m.does = com.does;
      try { S.publish(await R.encode(m)); } catch (e) { console.warn(e); }
    }, 180);
  };

  /* ---------- the stage: the real rig, drawn live, with an overlay to draw and drag on ---------- */
  const art = $('sm-art'), over = $('sm-over');
  over.setAttribute('viewBox', EB.join(' '));
  let tick = 0, animT;
  const render = () => {
    m._g = null;
    const { clips } = R.poses(m), list = clips[pose] || clips.idle;
    const p = anim ? list[tick % list.length] : list[0];
    art.innerHTML = R.frameSVG(m, p, { box: EB, w: EB[2], h: EB[3], uid: 'ed' });
    drawOverlay();
  };
  const loop = () => { clearInterval(animT); if (anim) animT = setInterval(() => { tick++; render(); }, 1000 / 7); };

  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
  let temp = null;
  const drawOverlay = () => {
    over.replaceChildren();
    over.append(el('rect', { x: 0, y: 0, width: 256, height: 256, fill: 'none', stroke: 'currentColor', 'stroke-opacity': .18, 'stroke-dasharray': '5 5', rx: 6 }));
    if (temp) over.append(temp);
    if (tool !== 'move') return;
    const H = [];
    if (m.eyes.style) H.push(['eyes', m.eyes.x + (R.EYES[m.eyes.style] === 'cyclops' ? m.eyes.gap / 2 : m.eyes.gap / 2), m.eyes.y, 'eyes']);
    if (m.mouth.style) H.push(['mouth', m.mouth.x, m.mouth.y + 4, 'mouth']);
    if (m.hat.style) H.push(['hat', m.hat.x, m.hat.y - m.hat.size * .3, 'hat']);
    for (const [k, x, y, label] of H) {
      const g = el('g', { 'data-h': k, style: 'cursor:grab' });
      g.append(el('circle', { cx: x, cy: y, r: 13, fill: '#6b4cff', 'fill-opacity': .18, stroke: '#6b4cff', 'stroke-width': 2.5 }));
      const t = el('text', { x, y: y - 18, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#6b4cff', 'font-family': 'sans-serif' });
      t.textContent = label; g.append(t);
      over.append(g);
    }
  };
  const toArt = e => { const p = over.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(over.getScreenCTM().inverse()); return [q.x, q.y]; };
  /* Ramer-Douglas-Peucker: fewer points, same line */
  const simplify = (pts, eps) => {
    const P = []; for (let i = 0; i < pts.length; i += 2) P.push([pts[i], pts[i + 1]]);
    const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
    const st = [[0, P.length - 1]];
    while (st.length) {
      const [a, b] = st.pop();
      let md = 0, mi = -1;
      const [ax, ay] = P[a], [bx, by] = P[b], L = Math.hypot(bx - ax, by - ay) || 1;
      for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (ay - P[i][1]) - (ax - P[i][0]) * (by - ay)) / L; if (d > md) { md = d; mi = i; } }
      if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
    }
    return P.filter((_, i) => keep[i]).flat().map(v => Math.round(clampN(v, 0, 255)));
  };
  let drag = null;
  over.addEventListener('pointerdown', e => {
    e.preventDefault();
    const [x, y] = toArt(e), h = e.target.closest && e.target.closest('[data-h]');
    over.setPointerCapture(e.pointerId);
    if (tool === 'move') {
      if (!h) return;
      remember(); autoFace = false;
      drag = { k: h.dataset.h, x, y, eyes: { ...m.eyes }, mouth: { ...m.mouth }, hat: { ...m.hat } };
      return;
    }
    remember();
    const erase = tool === 'erase' || e.button === 2;
    drag = { draw: true, pts: [x, y], erase, fill: tool === 'shape' && !erase };
    const c = erase ? 'rgba(255,90,120,.5)' : m.colors[cur];
    temp = el('path', { fill: drag.fill ? c : 'none', 'fill-opacity': drag.fill ? .55 : 1, stroke: c, 'stroke-width': drag.fill ? 3 : bsize, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    drawOverlay();
  });
  over.addEventListener('pointermove', e => {
    if (!drag) return;
    const [x, y] = toArt(e);
    if (drag.draw) {
      const n = drag.pts.length;
      if (Math.hypot(x - drag.pts[n - 2], y - drag.pts[n - 1]) < 1.6) return;
      drag.pts.push(x, y);
      temp.setAttribute('d', R.pathOf(drag.pts.map(v => Math.round(v * 10) / 10), drag.fill));
      return;
    }
    const dx = x - drag.x, dy = y - drag.y;
    if (drag.k === 'eyes') { m.eyes.x = drag.eyes.x + dx; m.eyes.y = drag.eyes.y + dy; }
    if (drag.k === 'mouth') { m.mouth.x = drag.mouth.x + dx; m.mouth.y = drag.mouth.y + dy; }
    if (drag.k === 'hat') { m.hat.x = drag.hat.x + dx; m.hat.y = drag.hat.y + dy; }
    m._g = null; render();
  });
  const up = () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.draw) {
      temp = null;
      const pts = simplify(d.pts, d.fill ? 1.2 : .8);
      if (m.strokes.length < 500) m.strokes.push({ c: cur, w: d.fill ? 4 : bsize, fill: d.fill, erase: d.erase, pts });
      bodyChanged();
    } else changed();
  };
  over.addEventListener('pointerup', up); over.addEventListener('pointercancel', up);
  over.addEventListener('contextmenu', e => e.preventDefault());

  /* ---------- images: background off, cropped, kept small but smooth ---------- */
  const fromImage = (src, sw, sh) => {
    const MAX = 512, k = Math.min(1, MAX / Math.max(sw, sh)), W = Math.max(1, Math.round(sw * k)), H = Math.max(1, Math.round(sh * k));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(src, 0, 0, W, H);
    const id = g.getImageData(0, 0, W, H), d = id.data;
    if ($('sm-bg').checked) {
      /* if the corners agree on a colour, flood it away from the edges, feathering the rim */
      const at = (x, y) => (y * W + x) * 4;
      const cs = [at(0, 0), at(W - 1, 0), at(0, H - 1), at(W - 1, H - 1)].filter(i => d[i + 3] > 200);
      if (cs.length >= 3) {
        const bg = [0, 1, 2].map(j => cs.reduce((s, i) => s + d[i + j], 0) / cs.length);
        const dist = i => Math.hypot(d[i] - bg[0], d[i + 1] - bg[1], d[i + 2] - bg[2]);
        if (cs.every(i => dist(i) < 60)) {
          const seen = new Uint8Array(W * H), st = [];
          for (let x = 0; x < W; x++) st.push(x, 0, x, H - 1);
          for (let y = 0; y < H; y++) st.push(0, y, W - 1, y);
          while (st.length) {
            const y = st.pop(), x = st.pop();
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            const p = y * W + x;
            if (seen[p]) continue;
            seen[p] = 1;
            const i = p * 4, dd = dist(i);
            if (dd > 70) continue;
            d[i + 3] = dd < 38 ? 0 : Math.round(d[i + 3] * (dd - 38) / 32);
            if (dd < 38) st.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
          }
        }
      }
    }
    g.putImageData(id, 0, 0);
    /* crop to what's left */
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { toast('That image came out empty. Try it with the background kept.'); return; }
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1, q = Math.min(1, 168 / Math.max(cw, ch));
    const out = document.createElement('canvas'); out.width = Math.max(1, Math.round(cw * q)); out.height = Math.max(1, Math.round(ch * q));
    const og = out.getContext('2d'); og.imageSmoothingQuality = 'high';
    og.drawImage(c, x0, y0, cw, ch, 0, 0, out.width, out.height);
    out.toBlob(async blob => {
      const bytes = new Uint8Array(await blob.arrayBuffer()), type = blob.type === 'image/webp' ? 'webp' : 'png';
      /* fit it in the box, standing on the floor */
      const f = Math.min(220 / out.width, 220 / out.height), bw = out.width * f, bh = out.height * f;
      remember();
      m.image = { bytes, type, box: [128 - bw / 2, 240 - bh, bw, bh] }; m._img = null;
      m.strokes = []; m.emoji = '';
      autoFace = true;
      Object.assign(m, { eyes: { ...m.eyes, style: 4 }, mouth: { ...m.mouth, style: 0 }, cheeks: false, outline: 1, arms: 1, legs: 1 });
      const nm = S.common().name;
      if (!nm || nm === 'blob') S.setCommon({ name: 'buddy' });
      await bodyChanged();
      toast(`It's alive. ${(bytes.length / 1024).toFixed(1)} KB of picture inside the code.`);
    }, 'image/webp', .82);
  };
  const fromFile = file => {
    if (!file || !/^image\//.test(file.type)) return;
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { fromImage(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(url); };
    img.src = url;
  };
  $('sm-file').addEventListener('change', e => { fromFile(e.target.files[0]); e.target.value = ''; });
  const well = $('sm-well');
  well.addEventListener('dragover', e => { e.preventDefault(); well.classList.add('drop'); });
  well.addEventListener('dragleave', () => well.classList.remove('drop'));
  well.addEventListener('drop', e => { e.preventDefault(); well.classList.remove('drop'); if (S.tabName !== 'image') S.tab('image', true); fromFile(e.dataTransfer.files[0]); });
  addEventListener('paste', e => {
    if (S.mode !== 'smooth') return;
    const f = [...((e.clipboardData || {}).files || [])].find(f => /^image\//.test(f.type));
    if (f) { if (S.tabName !== 'image') S.tab('image', true); fromFile(f); }
  });
  $('sm-img-del').addEventListener('click', () => { if (!m.image) return; remember(); m.image = null; bodyChanged(); });

  /* ---------- emoji ---------- */
  const setEmoji = t => {
    t = [...String(t).trim()].slice(0, 4).join('');
    if (!t) return;
    remember();
    m.emoji = t; m.image = null; m.strokes = []; autoFace = true;
    Object.assign(m, { eyes: { ...m.eyes, style: 0 }, mouth: { ...m.mouth, style: 0 }, cheeks: false, outline: 1, arms: 1, legs: 1 });
    const nm = S.common().name;
    if (!nm || nm === 'blob' || nm === 'buddy') S.setCommon({ name: 'mojo' });
    bodyChanged();
  };
  $('sm-emoji').addEventListener('keydown', e => { if (e.key === 'Enter') setEmoji(e.target.value); });
  $('sm-emoji-go').addEventListener('click', () => setEmoji($('sm-emoji').value));
  $('sm-emojis').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { $('sm-emoji').value = b.textContent; setEmoji(b.textContent); } });

  /* ---------- controls ---------- */
  const segs = [];
  const seg = (box, list, get, set) => {
    box.innerHTML = list.map((t, i) => `<button type="button" data-v="${i}">${t}</button>`).join('');
    box.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; remember(); set(+b.dataset.v); changed(); });
    segs.push(() => box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === get())));
  };
  seg($('sm-eyes'), R.EYES, () => m.eyes.style, v => { m.eyes.style = v; });
  seg($('sm-mouth'), R.MOUTHS, () => m.mouth.style, v => { m.mouth.style = v; });
  seg($('sm-arms'), R.ARMS, () => m.arms, v => { m.arms = v; });
  seg($('sm-legs'), R.LEGS, () => m.legs, v => { m.legs = v; });
  seg($('sm-wings'), R.WINGS, () => m.wings, v => { m.wings = v; });
  seg($('sm-hat'), R.HATS, () => m.hat.style, v => { m.hat.style = v; });
  seg($('sm-outline'), R.OUTLINES, () => m.outline, v => { m.outline = v; });
  const POSES = ['idle', 'walk', 'happy', 'wave', 'scared', 'fly', 'dizzy', 'sleep', 'hide'];
  $('sm-pose').innerHTML = POSES.map(p => `<button type="button" data-p="${p}">${p}</button>`).join('');
  $('sm-pose').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; pose = b.dataset.p; anim = true; tick = 0; loop(); ui(); render(); });
  const slide = (id, get, set) => {
    const i = $(id);
    i.addEventListener('pointerdown', remember);
    i.addEventListener('input', () => { set(+i.value); changed(); });
    segs.push(() => { i.value = get(); });
  };
  slide('sm-er', () => m.eyes.r, v => { const c = m.eyes.x + m.eyes.gap / 2; m.eyes.r = v; m.eyes.x = c - m.eyes.gap / 2; });
  slide('sm-eg', () => m.eyes.gap, v => { const c = m.eyes.x + m.eyes.gap / 2; m.eyes.gap = v; m.eyes.x = c - v / 2; });
  slide('sm-mw', () => m.mouth.w, v => { m.mouth.w = v; });
  slide('sm-ll', () => m.legLen, v => { m.legLen = v; });
  slide('sm-hs', () => m.hat.size, v => { m.hat.size = v; });
  slide('sm-hr', () => m.hat.rot, v => { m.hat.rot = v; });
  slide('sm-px', () => m.pixel, v => { m.pixel = v; });
  slide('sm-size', () => m.size, v => { m.size = v; });
  slide('sm-bsize', () => bsize, v => { bsize = v; });
  $('sm-cheeks').addEventListener('change', e => { remember(); m.cheeks = e.target.checked; changed(); });
  $('sm-ink').addEventListener('input', e => { m.ink = e.target.value; changed(); });
  $('sm-limb').addEventListener('input', e => { m.limb = e.target.value; changed(); });
  $('sm-auto').addEventListener('click', () => { remember(); autoFace = true; autoLayout(); changed(); toast('Face, hat and legs put back where they fit.'); });
  $('sm-shapes').innerHTML = Object.keys(SHAPES).map(k => `<button type="button" class="t" data-s="${k}">${k}</button>`).join('');
  $('sm-shapes').addEventListener('click', e => { const b = e.target.closest('button'); if (b) useShape(b.dataset.s); });

  /* tools, colours, undo */
  $('sm-tools').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const t = b.dataset.t;
    if (t === 'undo') { if (undo.length) { redo.push(snap()); m = undo.pop(); changed(); } }
    else if (t === 'redo') { if (redo.length) { undo.push(snap()); m = redo.pop(); changed(); } }
    else if (t === 'clear') { remember(); m.strokes = []; m.image = null; m.emoji = ''; bodyChanged(); }
    else if (t === 'anim') { anim = !anim; loop(); }
    else tool = t;
    ui(); render();
  });
  addEventListener('keydown', e => {
    if (S.mode !== 'smooth' || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    const k = e.key.toLowerCase(), q = s => $('sm-tools').querySelector(s);
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); q(e.shiftKey ? '[data-t=redo]' : '[data-t=undo]').click(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); q('[data-t=redo]').click(); return; }
    const map = { b: 'brush', s: 'shape', e: 'erase', v: 'move' };
    if (map[k] && !e.ctrlKey && !e.metaKey) q(`[data-t=${map[k]}]`).click();
  });
  const pal = $('sm-pal');
  pal.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.add !== undefined) { if (m.colors.length < 16) { remember(); m.colors.push(m.colors[cur] || '#ff8a3d'); cur = m.colors.length - 1; ui(); } return; }
    cur = +b.dataset.i; if (tool === 'erase' || tool === 'move') tool = 'brush'; ui(); render();
  });
  $('sm-col').addEventListener('focus', remember);
  $('sm-col').addEventListener('input', e => { m.colors[cur] = e.target.value; changed(); });

  const ui = () => {
    pal.innerHTML = m.colors.map((c, i) => `<button type="button" data-i="${i}" style="--c:${c}" aria-pressed="${cur === i}" aria-label="Colour ${i + 1}"></button>`).join('')
      + (m.colors.length < 16 ? '<button type="button" class="mk-plus" data-add aria-label="Add a colour">+</button>' : '');
    $('sm-col').value = m.colors[cur] || '#000000';
    $('sm-tools').querySelectorAll('button').forEach(b => {
      const t = b.dataset.t;
      if (t === 'anim') b.setAttribute('aria-pressed', anim);
      else if (!['undo', 'redo', 'clear'].includes(t)) b.setAttribute('aria-pressed', t === tool);
    });
    $('sm-pose').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', anim && b.dataset.p === pose));
    segs.forEach(f => f());
    $('sm-cheeks').checked = m.cheeks; $('sm-ink').value = m.ink; $('sm-limb').value = m.limb;
    $('sm-img-del').hidden = !m.image;
    over.dataset.tool = tool;
  };

  /* a big, crisp still of it, for the PNG download */
  const png = () => new Promise(ok => {
    m._g = null;
    const g = R.geo(m), Z = 1024 / Math.max(g.box[2], g.box[3]), W = Math.round(g.box[2] * Z), H = Math.round(g.box[3] * Z);
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H); ok(c); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(R.frameSVG(m, R.poses(m).clips.idle[0], { w: W, h: H, uid: 'png' }));
  });

  S.register('smooth', {
    activate(which) {
      sub = which || sub;
      /* opening the emoji or image tab with nothing of that kind yet: start with something */
      if (which === 'emoji' && !m.emoji) { $('sm-emoji').value = '🐸'; setEmoji('🐸'); return; }
      if (!m.strokes.length && !m.image && !m.emoji) { useShape('blob'); return; }
      render(); ui(); changed();
    },
    refresh: changed,
    async load(code) {
      m = await R.decode(code); autoFace = false;
      S.setCommon({ name: m.name, does: m.does });
      return m.image ? 'image' : m.emoji ? 'emoji' : 'draw';
    },
    png,
    /* something random and alive */
    surprise() {
      const P = a => a[Math.floor(Math.random() * a.length)];
      useShape(P(Object.keys(SHAPES)));
      Object.assign(m, {
        eyes: { ...m.eyes, style: P([1, 2, 2, 3, 4, 4, 5, 7]) }, mouth: { ...m.mouth, style: P([1, 2, 3, 4, 5, 6]) }, cheeks: Math.random() < .6,
        arms: P([0, 1, 1, 2, 3]), legs: P([0, 1, 1, 2, 3, 4, 5]), wings: Math.random() < .3 ? P([1, 2, 3]) : 0,
        hat: { ...m.hat, style: Math.random() < .6 ? P(R.HATS.map((_, i) => i).slice(1)) : 0, rot: Math.round(Math.random() * 30 - 15) },
        outline: P([1, 1, 2, 3])
      });
      const hue = Math.random() * 360, hsl = l => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = `hsl(${hue},80%,${l}%)`; return c.fillStyle; };
      m.colors[0] = hsl(62); m.colors[1] = hsl(88); m.colors[2] = hsl(40);
      S.setCommon({ name: P(['blip', 'mochi', 'nib', 'puddle', 'zuzu', 'plum', 'bean', 'fig', 'tuft', 'nugget', 'gumdrop', 'bloop']), does: m.wings ? 'follow' : P(['crawl', 'bounce', 'climb', 'creep', 'slide', 'drop']) });
      bodyChanged();
    }
  });
})();
