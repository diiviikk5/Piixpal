#!/usr/bin/env node
// Five pixel-skin variables from one brand colour.
//   node palette.mjs <brand-hex> [background-hex]
//   node palette.mjs 2563eb
const [brandArg, bgArg = 'ffffff'] = process.argv.slice(2);
if (!brandArg) { console.error('usage: node palette.mjs <brand-hex> [background-hex]'); process.exit(1); }
const parse = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const brand = parse(brandArg), bg = parse(bgArg), dark = lum(bg) < .2;
/* ink: the brand pushed almost to black keeps a tint of the brand in every outline */
const ink = mix(brand, [8, 6, 12], .86);
const accentInk = contrast(brand, [255, 255, 255]) >= contrast(brand, ink) ? [255, 255, 255] : ink;
const paper = dark ? mix(bg, [255, 255, 255], .06) : bg;
const soft = mix(brand, paper, .86);
const out = { '--px-ink': hex(dark ? mix(bg, [0, 0, 0], .6) : ink), '--px-paper': hex(paper), '--px-accent': hex(brand), '--px-accent-ink': hex(accentInk), '--px-soft': hex(soft) };
console.log(':root {\n' + Object.entries(out).map(([k, v]) => `  ${k}: ${v};`).join('\n') + '\n}');
const c = contrast(brand, accentInk);
console.error(`text on accent contrast: ${c.toFixed(2)}:1 ${c >= 4.5 ? 'ok' : '(under 4.5:1: use the accent for shapes, not text)'}`);
