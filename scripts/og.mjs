// Social cards (1200x630) for every page that shares a link: site/og/*.jpg, plus site/og/logo.png.
// Renders scripts/og-card.html in headless Chrome, then JPEG-encodes with ffmpeg.
//   node scripts/og.mjs [--only=u-zipper,default]      CHROME=path FFMPEG=path to override
// Run it when you add pages; scripts/seo.mjs points the meta tags at these files.
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, unlinkSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { UI } from './ui-data.mjs';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'site', 'og');
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(existsSync);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const card = pathToFileURL(join(root, 'scripts', 'og-card.html')).href;

const SPRITES = 'alien astronaut avocado battery boba bolt brain cactus candle cherries cloud coffee cookie crt donut dragon egg elephant flick floppy fluff gloop gpu heart hops inbox inky keycap llama loaf loti mochi modem mumu onigiri planet prompty pudding robo server spud star sushi toast tofu token ufo unicorn whale wizard'.split(' ');
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const pick = key => { const h = hash(key); return [0, 17, 33].map(o => SPRITES[(h + o) % SPRITES.length]).join(','); };
const DARK = new Set(['3D & Shaders', 'Backgrounds', 'ASCII', 'Image effects', 'Hero sections', 'Scenes']);
const regCount = JSON.parse(readFileSync(join(root, 'r', 'registry.json'), 'utf8')).items.length - 1;

const jobs = [
  ['default', 'Free UI components', 'Animated UI, hero templates & pixel art', '300+ free components: shader backgrounds, heroes, ASCII, buttons and characters.', 'lime', 'gloop,robo,ufo'],
  ['templates', 'Hero templates', '74 hero sections that actually move', 'WebGL shaders, GSAP scroll scenes, fire, particles and ASCII. One HTML file each.', 'ink', 'dragon,planet,star'],
  ['stage', 'Stage', 'Make little plays with your pals', 'Puppeteer pixel characters, give them lines, play the scene on your site.', '', 'wizard,llama,mochi'],
  ['c-index', 'Characters', `${regCount} pixel characters for your website`, 'Pals that crawl, perch, nap and bounce on your page, plus 50 sprites.', 'lime', 'gloop,inky,mumu'],
  ['c-pals', 'Pals', 'Pixel characters that live on your page', 'They crawl on headings, perch on buttons and bounce on your footer.', '', 'fluff,loti,mochi'],
  ['c-sprites', 'Sprites', '50 pixel sprites that watch your cursor', 'Inline pixel art with eyes that follow the pointer. Copy one tag.', '', 'alien,boba,whale'],
  ['c-install', 'Install', 'One script tag. Or npm, React, Vue, shadcn.', 'Every way to add Piixpal to a site.', 'ink', 'robo,crt,floppy'],
  ['c-builder', 'Builder', 'Pick pals, copy one line', 'Choose characters and where they live. Ship.', '', 'cactus,cookie,egg'],
  ['c-make', 'Pal Maker', 'Turn any image into a pixel character', 'A doodle, a photo, a logo or an emoji becomes a pal.', 'lime', 'unicorn,spud,toast'],
  ['c-3d', '3D', 'Voxel toys, holo cards and a snow globe', 'Your pals as real 3D models.', 'ink', 'planet,gpu,ufo'],
  ['c-agents', 'Agent pets', 'A pixel pet for Claude Code & Codex', 'It watches your coding agent work and reacts in the terminal.', 'ink', 'prompty,brain,token'],
  ['c-crowd', 'Crowd', 'Hundreds of tiny agents on one canvas', 'Wander, swarm your cursor, or spell a word.', '', 'mumu,bolt,star'],
  ['c-powers', 'Superpowers', 'Pals that do real UI jobs', 'They step out of the page, guard inputs and turn your site into a game.', 'lime', 'wizard,dragon,heart'],
  ['c-readme', 'GitHub README', 'An animated pixel banner for your profile', 'Your words, your pals, one image link.', 'ink', 'inbox,server,modem'],
  ['c-type', 'Pixel type', 'Chunky 3D pixel lettering', 'Extruded pixel blocks that pals can walk on.', '', 'keycap,crt,bolt'],
  ['c-visit', 'Extension', 'A pixel pet on every site you visit', 'Browser extension and bookmarklet.', '', 'flick,ufo,candle'],
  ['c-nomad', 'Nomad', "Nomad's other window", 'The pal who walks off your page.', 'ink', 'hops,loaf,egg'],
  ['u-index', 'UI components', `${UI.length} animated UI components`, 'Shader backgrounds, heroes, image effects, ASCII, buttons, cards, text and forms.', 'lime', 'gloop,crt,planet'],
  ['u-showcase', 'Showcase', 'Whole websites built with Pixel UI', 'Product pages, a riso magazine, a music app, a game launch.', '', 'sushi,coffee,donut'],
  ['u-installation', 'Install', 'Pixel UI in one script tag', 'Single files or npm. Works with any framework.', 'ink', 'robo,floppy,crt'],
  ['u-looks', 'Looks', 'One-line visual styles', 'Restyle every component at once.', '', 'cherries,pudding,boba'],
  ['u-palettes', 'Palettes', 'Ten colour palettes, or your own', 'Every component reads the same palette.', '', 'avocado,cherries,onigiri'],
  ...UI.map(u => [`u-${u.slug}`, `Pixel UI · ${u.section}`, u.name, u.brief, DARK.has(u.section) ? 'ink' : '', pick(u.slug)]),
].filter(j => !only.length || only.includes(j[0]));

async function render([key, k, t, s, c, p], i) {
  const png = join(tmpdir(), `og-${key}.png`), jpg = join(out, `${key}.jpg`);
  const url = `${card}#${new URLSearchParams({ k, t, s, c, p })}`;
  await run(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--user-data-dir=${join(tmpdir(), 'og-chrome-' + (i % 6))}`,
    '--window-size=1200,630', '--virtual-time-budget=4000', `--screenshot=${png}`, url], { timeout: 60000 });
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', png, '-q:v', '6', jpg]);
  unlinkSync(png);
}

let done = 0;
const queue = jobs.map((j, i) => () => render(j, i).then(() => { if (++done % 20 === 0) console.log(`${done}/${jobs.length}`); }));
await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await queue.shift()(); }));
if (!only.length || only.includes('logo')) {
  /* the square logo for search results and schema.org */
  const svg = pathToFileURL(join(root, 'site', 'favicon.svg')).href, png = join(out, 'logo.png');
  await run(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000', `--user-data-dir=${join(tmpdir(), 'og-chrome-0')}`, '--window-size=512,512', `--screenshot=${png}`,
    svg], { timeout: 60000 });
}
console.log(`og: ${done} cards in site/og/`);
