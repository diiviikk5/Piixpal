/* STICKERS: a sheet of pixel stickers your visitors can peel off and slap anywhere on the
 * page. Drag one off the sheet, drop it on a heading, a photo, the footer; it stays there
 * (in that visitor's browser) the next time they come back. Drag a stuck sticker to move
 * it, double-click to peel it off.   @component stickers
 *
 *   <piix-stickers></piix-stickers>
 *   names="heart,star,bolt,mochi,ufo"   which stickers (built-ins, or any sprite's name)
 *   el.clear()                          peel every sticker off this page */

/* the built-in stickers: little pieces of pixel art (a = fill, b = shade, k = ink) */
const STICKER_ART = {
  heart: { pal: { a: '#ff4d6d', b: '#c92a4b', w: '#ffc4cf' }, rows: ['.kk...kk.', 'kawk.kaak', 'kwaakaaak', 'kaaaaaaak', '.kaaaaak.', '..kaabk..', '...kbk...', '....k....'] },
  star: { pal: { a: '#ffd23f', b: '#d9a52a', w: '#fff3b0' }, rows: ['....k....', '...kak...', '...kwk...', 'kkkkaakkk', 'kwaaaaabk', '.kaaaaak.', '..kaaabk.', '.kaakkabk', '.kbk..kbk', '.kk....kk'] },
  bolt: { pal: { a: '#ffd23f', b: '#d9a52a', w: '#fff3b0' }, rows: ['...kkkk', '..kwaak', '..kaak.', '.kaak..', 'kaaakkk', 'kkkaaak', '..kaak.', '.kaak..', '.kbk...', 'kk.....'] },
  smile: { pal: { a: '#ffd23f', b: '#d9a52a', w: '#fff3b0' }, rows: ['..kkkkk..', '.kwaaaak.', 'kwakaakak', 'kaakaakak', 'kaaaaaaak', 'kakaaakak', 'kaakkkaak', '.kbaaabk.', '..kkkkk..'] },
  crown: { pal: { a: '#ffd23f', b: '#d9a52a', w: '#ff4d6d' }, rows: ['k...k...k', 'kk.kak.kk', 'kakaaakak', 'kaaaaaaak', 'kawaawaak', 'kbbbbbbbk', 'kkkkkkkkk'] },
  wow: { pal: { a: '#fffdf5', b: '#ff4d6d', w: '#e9e2d0' }, rows: ['.kkkkkkkk.', 'kaaaaaaaak', 'kabababbak', 'kabababbak', 'kaabbabbak', 'kaaaaaaaak', '.kkkkkkkk.', '...kk.....', '..kk......'] }
};

