// builds site/logo.svg from a pixel grid: lime body, ink outline, white eyes, hard ink shadow
import { writeFileSync } from 'node:fs';
const G = [  '......k......',
  '.....kgk.....',
  '....kgggk....',
  '...kgggggk...',
  '..kgggggggk..',
  '.kgggggggggk.',
  '.kggwwgwwggk.',
  '.kggwkgkwggk.',
  '.kgggggggggk.',
  '.kdddddddddk.',
  '..kdddddddk..',
  '...kkkkkkk...'
];
const C = { k: '#17121f', g: '#c6f432', d: '#a8d81c', w: '#ffffff' };
const s = 16, pad = 24, W = G[0].length * s + pad * 2, H = G.length * s + pad * 2;
let rects = '';
G.forEach((row, y) => [...row].forEach((ch, x) => {
  if (ch === '.') return;
  rects += `<rect x="${pad + x * s}" y="${pad + y * s}" width="${s}" height="${s}" fill="${C[ch]}"/>`;
}));
const shadow = G.flatMap((row, y) => [...row].map((ch, x) => ch === '.' ? '' : `<rect x="${pad + x * s + 8}" y="${pad + y * s + 8}" width="${s}" height="${s}"/>`)).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges">
  <title>Piixpal</title>
  <g fill="#17121f" opacity=".92">${shadow}</g>
  ${rects}
</svg>
`;
writeFileSync('site/logo.svg', svg);
console.log(`wrote site/logo.svg ${W}x${H}`);
