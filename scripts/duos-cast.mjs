// The duo cast, hand-drawn. node scripts/duos-cast.mjs --sheet writes .git/tmp/cast.png for review.
// Each entry: name, palette, rows (the key pose). "." is empty.
export const CAST = {
  /* 1. POP: a toaster who launches his best friend */
  popper: { pal: { k: '#2b2433', w: '#e3e8f0', h: '#ffffff', d: '#a9b2c2', e: '#2b2433', c: '#ff9fb2', r: '#ff5d73', s: '#55506a' }, rows: [
    '...kkkkkkkkkkkk...', '..kwwwwwwwwwwwwk..', '.kwwsssswwsssswwk.', '.kwhwwwwwwwwwwwwk.', '.kwhwwwwwwwwwwwwkk', '.kwwwewwwwwwewwwkr', '.kwwwewwwwwwewwwkr',
    '.kwcwwwkkkkwwwcwkk', '.kwwwwwwwwwwwwwdk.', '.kddddddddddddddk.', '..kkkkkkkkkkkkkk..', '...kk........kk...'] },
  butter: { pal: { k: '#4a2c16', t: '#c98a4e', y: '#ffe2a8', b: '#fff7b0', e: '#3a2416', c: '#ff9f8a' }, rows: [
    '..kkkkkk..', '.kttttttk.', 'kttybbyttk', 'ktyyyyyytk', 'ktyeyyeytk', 'ktyeyyeytk', 'ktyckkcytk', 'ktyyyyyytk', '.kttttttk.', '..k....k..'] },
  /* 2. GLOW: a shy candle and the moth who adores her */
  wick: { pal: { k: '#3a2a2a', o: '#ff8a2f', y: '#ffe066', w: '#fff3e0', h: '#ffffff', d: '#e6cdb0', e: '#3a2a2a', c: '#ff9fb2', g: '#e0b040', n: '#a87818' }, rows: [
    '....o....', '...oyo...', '..ooyoo..', '...oyo...', '....k....', '.kkkkkkk.', '.kwhwwwk.', '.kwwwwwk.', '.kwewewk.', '.kwewewk.', '.kcwkwck.', '.kwwwwdk.', '.kwwwwdk.', 'kkkkkkkkk', 'kgggggggk', '.knnnnnk.', '..kkkkk..'] },
  dusty: { pal: { k: '#3b3140', m: '#e8d9bd', p: '#c39a6b', b: '#9c8b7c', f: '#c9bcae', e: '#241c2a', c: '#ffb3a8' }, rows: [
    '...k........k...', '....k......k....', '.kkk.kkkkkk.kkk.', 'kmmmkbffffbkmmmk', 'kmpmkfeffefkmpmk', 'kmmmkfeffefkmmmk', 'kmmmkfcffcfkmmmk', '.kmmkbffffbkmmk.', '..kkkbffffbkkk..', '....kbbffbbk....', '.....kkkkkk.....'] },
  /* 3. BREW: a fussy teapot and a tiny cup */
  earl: { pal: { k: '#22313a', b: '#57c7b6', h: '#c8f5ec', d: '#3a9a8c', e: '#16242b', c: '#ff9fb2', g: '#ffd23f' }, rows: [
    '........gg........', '.......kggk.......', '.....kkkkkkkk.....', '....kbbbbbbbbk..kk', '.kk.kbhbbbbbbk.kbk', 'kbbkkbhebbebbkkbk.', 'kbkkbbbebbebbbbk..', 'kbkkbcbbkkbbcbk...', 'kbbkbbbbbbbbbdk...', '.kkkbbbbbbbbbdk...', '...kbbbbbbbbddk...', '....kkkkkkkkkk....'] },
  sip: { pal: { k: '#4a3a3a', w: '#fff6ea', d: '#e5d3bd', t: '#b8733c', e: '#3a2a2a', c: '#ff9fb2', g: '#ffd23f' }, rows: [
    '.kkkkkkkk...', 'kttttttttk..', 'kwwwwwwwwkk.', 'kwewwewwwkwk', 'kwewwewwwkwk', 'kwckkcwwdkk.', '.kwwwwwwdk..', '..kkkkkkk...', 'kggggggggggk', '.kkkkkkkkkk.'] },
  /* 4. QUEST: a very small knight and a dragon who only wants a hug */
  dent: { pal: { k: '#23202e', s: '#aab3c8', h: '#e8eef8', d: '#77809a', e: '#ffd23f', r: '#ff4d6d', l: '#dfe8f5', g: '#e0b040', b: '#4d6fd8', n: '#2c3f8a' }, rows: [
    '...rr.........', '..rrrr........', '..kkkkkk...k..', '.kshsssdk.klk.', '.kshsssdk.klk.', '.kkkkkkkk.klk.', '.kekkkkek.klk.', '.kkkkkkkk.klk.', '.ksssssdk.klk.', '..kkkkkk.kgggk', '.kbbbbbbkkkgk.', '.kbnbbnbbbkgk.', '.kbbbbbbkk....', '..kdk.kdk.....', '..kkk.kkk.....'] },
  soot: { pal: { k: '#1f2a1c', g: '#7ed957', h: '#c9f7a8', d: '#4ea83a', y: '#ffe08a', e: '#1f2a1c', c: '#ff9f8a', w: '#b98cff', o: '#ff8a2f' }, rows: [
    '...k.....k........', '..kyk...kyk.......', '..kykkkkkyk.......', '.kgggggggggk......', 'kgghgggggggdk.....', 'kggeegggeegdk.....', 'kggeegggeegdk.....',
    'kgcggkkkggcdk.....', '.kgggggggggk......', '.wkyyyyyyykw...kk.', 'wwkyyyyyyykwwkkgk.', '.kgyyyyyyygkkggk..', '.kgggkkkgggdkkk...', '..kdk...kdk.......', '..kkk...kkk.......'] },
  /* 5. PULL: a magnet-headed robot and the bolts that can't resist */
  volt: { pal: { k: '#22212e', r: '#ff4d6d', u: '#4d8dff', s: '#c9d0de', h: '#f4f7fc', d: '#8c95a8', e: '#7dffcf', c: '#ffb3a8', y: '#ffd23f' }, rows: [
    '.kkk......kkk.', 'krrrk....kuuuk', 'krrrk....kuuuk', 'ksssk....ksssk', 'kssskkkkkksssk', 'kssssssssssssk', '.kkkkkkkkkkkk.', '..kshssssssk..', '..kseessseek..', '..kseessseek..', '..kssskksssk..', '..kssssssdsk..', '.kkkkkyykkkkk.', '.ksk.kssk.ksk.', '.kkk.kddk.kkk.', '.....kkkk.....'] },
  nut: { pal: { k: '#2a2a33', s: '#b9c2d1', h: '#eef2f8', d: '#7f8898', e: '#2a2a33', c: '#ffb3a8' }, rows: [
    '.kkkkkk.', 'kshhsssk', 'ksessesk', 'ksessesk', 'kcskksck', 'ksssssdk', '.kkkkkk.', '..kssk..', '..kddk..', '..kssk..', '..kkkk..'] },
  /* 6. RODEO: a cactus cowboy and the tumbleweed he'll never catch */
  spike: { pal: { k: '#1c2a1e', g: '#5cbf63', h: '#a6e8a0', d: '#3c8f48', e: '#1c2a1e', c: '#ff9f8a', t: '#b8733c', n: '#7a4a22', r: '#ff4d6d', y: '#ffd23f' }, rows: [
    '...kkkkkkkk...', '..kttttttttk..', '.kkktttttkkkk.', 'kttttttttttttk', '.kkkkkkkkkkkk.', '...kghgggk....', '.k.kgegegk.k..', 'kgkkgegegkkgk.', 'kgkkgckkcgkgk.', 'kggkggggggggk.', '.kkkgrrrrgkk..', '...kgryrgdk...', '...kggggddk...', '...kggggddk...', '..kkkkkkkkkk..'] },
  tumble: { pal: { k: '#5a3d1e', t: '#d8a868', l: '#f0d0a0', d: '#a87840', e: '#3a2410' }, rows: [
    '..k.kkkk.k..', '.kkktltkkk..', 'kktlkttklkk.', 'ktktetteltk.', 'kltkettekdkk', 'kttlkttkdtk.', '.kkdtlkdtkk.', '..kkkddkkk..', '.k..kkkk..k.'] },
  /* 7. HEX: a mushroom wizard and his long-suffering frog */
  morel: { pal: { k: '#2a1c33', p: '#8f5cf0', h: '#c9a8ff', d: '#5d36b0', y: '#ffe066', w: '#fff3e0', s: '#e5d3bd', e: '#2a1c33', c: '#ff9fb2', t: '#b8733c', o: '#7dffcf' }, rows: [
    '......k.......', '.....kpk......', '....kphpk.....', '...kpyppdk....', '..kpppppydk...', '.kphpppppddk..', 'kpppypppppdddk', 'kkkkkkkkkkkkkk', '..kwwwwwwsk...', '..kwewwewsk.o.', '..kwewwewsk.k.', '..kwckkcwskkt.', '..kwwwwwwsk.t.', '...kwwwwsk..t.', '...kk..kk...t.'] },
  ribb: { pal: { k: '#17301c', g: '#6fcf5a', h: '#b6f0a0', d: '#3f9a3a', w: '#ffffff', e: '#17301c', c: '#ff9f8a', y: '#e8f7b0' }, rows: [
    '.kkk....kkk.', 'kwwwk..kwwwk', 'kwewkkkkwewk', 'kgwwgggggwwk', 'kghggggggggk', 'kgckkkkkkcgk', '.kgyyyyyygk.', 'kkgyyyyyygkk', 'kgkkkkkkkkgk', '.k........k.'] },
  /* 8. HOWL: the moon, and a wolf pup who sings to her */
  luna: { pal: { k: '#3a3550', y: '#fff3c4', h: '#ffffff', d: '#e6d28a', e: '#3a3550', c: '#ffb3c7', n: '#d9c070' }, rows: [
    '....kkkkkk....', '..kkyyyyyykk..', '.kyyhyyyyyyyk.', '.kyhyyyyynyyk.', 'kyyyyyyyyyyydk', 'kyyeyyyyyeyydk', 'kyyeyyyyyeyydk', 'kycyykkkyycydk', 'kyyyyyyyyyyddk', '.kynyyyyyyddk.', '.kyyyyydyddk..', '..kkyyydddkk..', '....kkkkkk....'] },
  pup: { pal: { k: '#22232e', g: '#8b93a8', h: '#c9cfdc', d: '#5c6478', w: '#f4f6fa', e: '#22232e', c: '#ff9fb2', n: '#22232e' }, rows: [
    'kk......kk......', 'kgk....kgk......', 'kghkkkkkgk......', 'kggggggggk......', 'kgegggegggk.....', 'kgegggegggnk....', 'kgcwwwwwwwk..kk.', '.kwwkkwwwk..kggk', '..kkggggkkkkgdk.', '.kgggggggggggk..', '.kgwwgggwwgdk...', '.kgk.kgk.kgk....', '.kkk.kkk.kkk....'] },
  /* 9. POST: a snail who delivers, and a mailbox who is always hungry */
  parcel: { pal: { k: '#33261c', b: '#ffb86b', h: '#ffe0b0', s: '#c9824a', d: '#9b5f30', e: '#33261c', c: '#ff9f8a', l: '#ffffff', r: '#ff4d6d' }, rows: [
    'kkkkkkk...kkkk..', 'kklllkk..ksssdk.', 'klkrklk.kshssddk', 'klllllk.ksshsssk', 'kkkkkkk.kssskssk', '.kbk....kdsssddk', 'kbekkkkkkkdddkk.', 'kbebbbbbbbbkkk..', 'kbcbbbbbbbbbbhk.', '.kkkkkkkkkkkkkk.'] },
  maily: { pal: { k: '#1c2238', u: '#4d7dff', h: '#a8c4ff', d: '#2f52c0', e: '#ffffff', p: '#1c2238', c: '#ff9fb2', r: '#ff4d6d', w: '#fff3e0', g: '#8b93a8' }, rows: [
    '..kkkkkkkk....', '.kuuuuuuuuk.kk', 'kuhuuuuuuuukrk', 'kuhuuuuuuuukrk', 'kueeuuuueeuukk', 'kuepuuuuepuuk.', 'kcuukkkkkkuck.', 'kuukwwwwwwkuk.', 'kuuukkkkkkudk.', 'kuuuuuuuuuddk.', '.kkkkkkkkkkk..', '.....kggk.....', '.....kggk.....', '....kkkkkk....'] },
  /* 10. ECHO: a fox, and a shadow with a mind of its own */
  wink: { pal: { k: '#2b1a14', o: '#ff8a3d', h: '#ffc08a', d: '#c95f1e', w: '#fff3e0', e: '#2b1a14', c: '#ff9fb2', n: '#2b1a14', t: '#ffffff' }, rows: [
    'kk........kk......', 'kok......kok......', 'kowk....kwok......', 'koookkkkoook......', 'kohooooooook...kk.', 'koeoooooeook..kttk', 'koeoooooeook.kotk.', 'kwwwonnowwwkkoodk.', '.kwwwwwwwwkooodk..', '..kkwwwwkkoooodk..', '.koooooooooooddk..', '.kowwoookowwodk...', '.kok.kok.kok.kk...', '.kkk.kkk.kkk......'] }
};

if (process.argv.includes('--sheet')) {
  const fs = await import('node:fs'), zlib = await import('node:zlib');
  const S = 9, CW = 20 * S, CH = 19 * S, COLS = 5, names = Object.keys(CAST), ROWS = Math.ceil(names.length / COLS), W = COLS * CW, H = ROWS * CH, buf = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { const x = i % W, y = Math.floor(i / W), a = (Math.floor(x / CW) + Math.floor(y / CH)) % 2; buf[i * 4] = a ? 243 : 236; buf[i * 4 + 1] = a ? 238 : 229; buf[i * 4 + 2] = a ? 227 : 215; buf[i * 4 + 3] = 255; }
  let bad = 0;
  names.forEach((n, i) => { const { pal, rows } = CAST[n], w = Math.max(...rows.map(r => r.length)), h = rows.length;
    rows.forEach((r, y) => { if (r.length !== w) { console.log(`WIDTH ${n} row ${y}: ${r.length} != ${w}`); bad++; } });
    const ox = (i % COLS) * CW + Math.floor((CW - w * S) / 2), oy = Math.floor(i / COLS) * CH + CH - 8 - h * S;
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '.') return; const c = pal[ch]; if (!c) { console.log(`PALETTE ${n}: "${ch}"`); bad++; return; }
      const R = parseInt(c.slice(1, 3), 16), G = parseInt(c.slice(3, 5), 16), B = parseInt(c.slice(5, 7), 16);
      for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) { const p = ((oy + y * S + dy) * W + ox + x * S + dx) * 4; buf[p] = R; buf[p + 1] = G; buf[p + 2] = B; } })); });
  const T = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc((W * 4 + 1) * H); for (let y = 0; y < H; y++) buf.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
  fs.writeFileSync('.git/tmp/cast.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  console.log(`cast.png ${names.length} characters, ${bad} problems`);
}
