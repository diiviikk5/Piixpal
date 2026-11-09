// Writes styles/index.html: the Liquid, Holo and Paper families, each in its own world.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { navBar } from './docs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const V = createHash('md5').update(readFileSync(join(root, 'piixpal.js'))).digest('hex').slice(0, 8);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* [id, name, what it does, live demo, code to copy] */
const FAMILIES = [
  ['liquid', 'Liquid', 'Liquid, drawn on the GPU', 'Real materials, drawn on the GPU: liquid chrome, glossy ink, clear water and honey. Edges breathe, beads reach for your cursor, words melt into the next word.', [
    ['liquid-button', 'Liquid button', 'Bring the pointer near and a bead of liquid stretches out toward it. Click and droplets splash out and fall back in.',
      '<div class="sx-row"><piix-liquid-button>Get started</piix-liquid-button><piix-liquid-button look="water">Dive in</piix-liquid-button><piix-liquid-button look="honey" size="sm">Taste</piix-liquid-button></div>',
      '<piix-liquid-button>Get started</piix-liquid-button>\n<piix-liquid-button look="water">Dive in</piix-liquid-button>'],
    ['liquid-text', 'Liquid text', 'Letters made of liquid. With several words, each one flows into the next like two drops merging. The pointer sends a wave through them.',
      '<piix-liquid-text words="Design|Build|Ship" size="92"></piix-liquid-text>',
      '<piix-liquid-text words="Design|Build|Ship"></piix-liquid-text>'],
    ['liquid-card', 'Liquid card', 'A glossy liquid-metal face with slow currents. Drag the pointer through it for a wake; click to drop a ring.',
      '<piix-liquid-card><span class="sx-k">Pro</span><h3>Everything, forever.</h3><p>Stir the surface with your pointer. Click it.</p></piix-liquid-card>',
      '<piix-liquid-card>\n  <h3>Pro plan</h3>\n  <p>Everything, forever.</p>\n</piix-liquid-card>'],
    ['liquid-toggle', 'Liquid toggle', 'The knob is a drop: it stretches across the track with a tail and snaps into a bead. A real switch for forms and keyboards.',
      '<div class="sx-row"><piix-liquid-toggle label="Notifications"></piix-liquid-toggle><piix-liquid-toggle checked label="Dark mode"></piix-liquid-toggle><piix-liquid-toggle checked look="honey" label="Warm"></piix-liquid-toggle></div>',
      '<piix-liquid-toggle name="dark" label="Dark mode"></piix-liquid-toggle>']]],
  ['holo', 'Holo', 'Projected as a hologram', 'Foil that follows the light, scanlines, RGB ghosts and the odd stutter of a projector. Mostly CSS, light as air.', [
    ['holo-card', 'Holo card', 'A rare trading card: tilts in 3D toward the pointer while a rainbow foil and sparkles slide across it at the angle of the light.',
      '<div class="sx-row"><piix-holo-card style="width:min(100%,215px)"><div class="sx-avatar">✦</div><h3>Nova</h3><p class="sx-dim">Legendary · #042</p></piix-holo-card><piix-holo-card hue="320" style="width:min(100%,215px)"><div class="sx-avatar" style="--h:320">◈</div><h3>Ember</h3><p class="sx-dim">Rare · #117</p></piix-holo-card></div>',
      '<piix-holo-card>\n  <img src="nova.png" alt="">\n  <h3>Nova</h3>\n</piix-holo-card>'],
    ['holo-text', 'Holo text', 'Projector light with cyan and magenta ghosts drifting apart, scanlines, and the occasional sideways stutter. Hover to glitch it.',
      '<piix-holo-text size="68">Signal acquired</piix-holo-text>',
      '<piix-holo-text>Signal acquired</piix-holo-text>'],
    ['holo-button', 'Holo button', 'A translucent pane in a foil frame lit where the pointer is; targeting brackets close in on hover; the label glitches when pressed.',
      '<div class="sx-row"><piix-holo-button>Engage</piix-holo-button><piix-holo-button hue="300">Connect</piix-holo-button><piix-holo-button hue="140" size="sm">Scan</piix-holo-button></div>',
      '<piix-holo-button>Engage</piix-holo-button>'],
    ['holo-input', 'Holo input', 'A HUD field: brackets lock on when focused, a scan line sweeps, the label lifts into a readout, and each keystroke blips up out of the field.',
      '<div class="sx-col"><piix-holo-input label="Callsign"></piix-holo-input><piix-holo-input label="Access code" type="password" hue="300"></piix-holo-input></div>',
      '<piix-holo-input label="Callsign" name="callsign"></piix-holo-input>']]],
  ['paper', 'Paper', 'Cut from paper, drawn in pen', 'Layered card stock with real shadows, or a pen line that boils like a hand-drawn cartoon. Warm, tactile, a little imperfect on purpose.', [
    ['paper-text', 'Paper text', 'A pen traces every letter, then the word fills in as stacked sheets of coloured paper and a scribble underlines it.',
      '<piix-paper-text size="84" underline>Hand made</piix-paper-text><piix-paper-text look="sketch" size="58">or just sketched</piix-paper-text>',
      '<piix-paper-text underline>Hand made</piix-paper-text>\n<piix-paper-text look="sketch">or just sketched</piix-paper-text>'],
    ['paper-button', 'Paper button', 'Cut: three sheets with gaps that open on hover and squash when pressed. Sketch: a boiling pen outline with hatching that scribbles in.',
      '<div class="sx-row"><piix-paper-button>Sign up</piix-paper-button><piix-paper-button colors="#c9f2d9,#5fbf8f,#1f4d3a">Plant it</piix-paper-button><piix-paper-button look="sketch">Read more</piix-paper-button></div>',
      '<piix-paper-button>Sign up</piix-paper-button>\n<piix-paper-button look="sketch">Read more</piix-paper-button>'],
    ['paper-card', 'Paper card', 'A cut-paper diorama on top (hills, sea or city) whose layers slide at different depths under the pointer; or a sketched frame with a hatched shadow.',
      '<div class="sx-row sx-cards"><piix-paper-card><h3>Weekend retreat</h3><p>Three days in the hills. Move over the scene.</p></piix-paper-card><piix-paper-card scene="sea" colors="#d8f0ff,#ffe08a,#7cc4e8,#3f8fc2,#1f4d7a"><h3>Coastline</h3><p>Paper waves, layered.</p></piix-paper-card><piix-paper-card look="sketch"><h3>Notes</h3><p>A pen-drawn frame that never sits still.</p></piix-paper-card></div>',
      '<piix-paper-card scene="hills">\n  <h3>Weekend retreat</h3>\n  <p>Three days in the hills.</p>\n</piix-paper-card>'],
    ['paper-sticker', 'Paper sticker', 'A die-cut vinyl sticker stuck on at an angle. Hover and the corner curls back; click and it slaps down.',
      '<div class="sx-row"><piix-paper-sticker>New</piix-paper-sticker><piix-paper-sticker color="#5cffb0" shape="circle" tilt="8">50% off</piix-paper-sticker><piix-paper-sticker color="#ff8ad8" shape="star" tilt="-10">Hot</piix-paper-sticker></div>',
      '<piix-paper-sticker>New</piix-paper-sticker>\n<piix-paper-sticker shape="circle">50% off</piix-paper-sticker>']]]
];

const section = ([id, name, kicker, lead, items]) => `
  <section class="sx sx-${id}" id="${id}" aria-labelledby="h-${id}">
    <div class="wrap">
      <header class="sx-head"><span class="sx-kick">${kicker}</span><h2 id="h-${id}">${name}</h2><p>${lead}</p></header>
      <div class="sx-grid">${items.map(([cid, cname, desc, demo, code]) => `
        <article class="sx-item" id="${cid}">
          <div class="sx-demo">${demo}</div>
          <div class="sx-meta"><h3>${cname}</h3><p>${desc}</p>
          <pre class="sx-code"><button class="copy" type="button" data-copy="${esc(code)}">Copy</button>${esc(code)}</pre></div>
        </article>`).join('')}
      </div>
    </div>
  </section>`;

const CSS = `
.sx-hero{position:relative;overflow:hidden;padding:clamp(60px,9vw,120px) 0 clamp(40px,6vw,70px);border-bottom:1px solid var(--line,#0001)}
.sx-hero .wrap{display:grid;gap:22px}
.sx-hero h1{margin:0;font:800 clamp(52px,9vw,112px)/.92 var(--f-display,"Bricolage Grotesque");letter-spacing:-.05em}
.sx-hero h1 span{display:inline-block}
.sx-hero h1 .a{background:linear-gradient(180deg,#d9dee6 0,#fff 38%,#3a3f4a 52%,#8d95a3 70%,#e9edf3);-webkit-background-clip:text;background-clip:text;color:transparent}
.sx-hero h1 .b{color:#14b8d4;text-shadow:-2px 0 #ff3cc8aa,2px 0 #3ce6ffaa}
.sx-hero h1 .c{color:#e2477a;text-shadow:3px 3px 0 #ffd23f,6px 6px 0 #5a3d8a}
.sx-hero p{max-width:56ch;margin:0;font-size:19px;line-height:1.55;opacity:.8}
.sx-jump{display:flex;flex-wrap:wrap;gap:12px}
.sx{padding:clamp(60px,8vw,110px) 0;position:relative;isolation:isolate}
.sx-head{max-width:640px;margin-bottom:44px}
.sx-kick{font:400 12px/1 Silkscreen,monospace;letter-spacing:.12em;text-transform:uppercase;opacity:.7}
.sx-head h2{margin:10px 0 12px;font:800 clamp(44px,7vw,84px)/.95 var(--f-display,"Bricolage Grotesque");letter-spacing:-.045em}
.sx-head p{margin:0;font-size:18px;line-height:1.55;opacity:.8}
.sx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,520px),1fr));gap:26px}
.sx-item{display:flex;flex-direction:column;border-radius:20px;overflow:hidden;min-width:0}
.sx-demo{display:grid;place-items:center;gap:18px;min-height:250px;padding:44px 30px}
.sx-meta{padding:22px 24px 24px}
.sx-meta h3{margin:0 0 6px;font:700 22px/1.2 var(--f-display,"Bricolage Grotesque");letter-spacing:-.02em}
.sx-meta p{margin:0 0 14px;font-size:15px;line-height:1.55;opacity:.78}
.sx-row{display:flex;flex-wrap:wrap;gap:22px;align-items:center;justify-content:center}
.sx-col{display:grid;gap:26px;width:min(100%,380px)}
.sx-cards{align-items:stretch}.sx-cards piix-paper-card{width:min(100%,230px)}
.sx-code{position:relative;margin:0;padding:14px 16px;border-radius:12px;font:500 12.5px/1.6 var(--f-mono,"JetBrains Mono",monospace);white-space:pre-wrap;word-break:break-all}
.sx-code .copy{position:absolute;right:8px;top:8px;height:26px;padding:0 10px;border-radius:7px;font:700 12px/1 var(--f-sans,system-ui);cursor:pointer}
/* liquid: a deep violet night */
.sx-liquid{background:radial-gradient(70% 55% at 75% 0%,#262a33 0,transparent 70%),linear-gradient(180deg,#0c0d10,#121418);color:#eef0f4}
.sx-liquid .sx-item{background:rgba(255,255,255,.04);box-shadow:0 0 0 1px rgba(255,255,255,.08) inset}
.sx-liquid .sx-code{background:rgba(0,0,0,.45);color:#d9dde5}.sx-liquid .sx-code .copy{background:linear-gradient(#fff,#b9c0cc);color:#111318;border:0}
.sx-liquid piix-liquid-text,.sx-liquid piix-liquid-card{width:100%}
.sx-k{display:inline-block;padding:4px 10px;border-radius:99px;background:rgba(255,255,255,.18);font:700 12px/1 var(--f-sans,system-ui);letter-spacing:.08em;text-transform:uppercase}
.sx-liquid piix-liquid-card h3{margin:12px 0 6px;font:800 30px/1.05 "Bricolage Grotesque",sans-serif;letter-spacing:-.03em}.sx-liquid piix-liquid-card p{margin:0;opacity:.85}
/* holo: a dark room with a projector grid */
.sx-holo{background:linear-gradient(rgba(63,208,255,.07) 1px,transparent 1px) 0 0/42px 42px,linear-gradient(90deg,rgba(63,208,255,.07) 1px,transparent 1px) 0 0/42px 42px,radial-gradient(70% 60% at 50% 0%,#0d2a44,transparent 70%),#050b14;color:#dff6ff}
.sx-holo .sx-item{background:rgba(10,30,50,.45);box-shadow:0 0 0 1px rgba(63,208,255,.18) inset}
.sx-holo .sx-code{background:rgba(0,0,0,.45);color:#bff0ff}.sx-holo .sx-code .copy{background:transparent;color:#3fd0ff;border:1px solid #3fd0ff}
.sx-holo piix-holo-text{width:100%;text-align:center}
.sx-avatar{display:grid;place-items:center;height:150px;border-radius:12px;font-size:64px;color:hsl(var(--h,250) 100% 85%);background:radial-gradient(circle at 50% 40%,hsl(var(--h,250) 80% 45% / .6),transparent 70%),rgba(0,0,0,.25);text-shadow:0 0 30px hsl(var(--h,250) 100% 60%)}
.sx-holo piix-holo-card h3{margin:14px 0 2px;font:800 24px/1 "Bricolage Grotesque",sans-serif}.sx-dim{margin:0;opacity:.6;font:500 12px/1.4 "JetBrains Mono",monospace;letter-spacing:.06em;text-transform:uppercase}
/* paper: warm craft paper */
.sx-paper{background:#efe5cf url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .08 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");color:#2c2238}
.sx-paper .sx-item{background:#fffaf0;box-shadow:0 1px 1px rgba(0,0,0,.08),0 18px 30px -20px rgba(60,30,40,.35);border-radius:14px 16px 13px 15px}
.sx-paper .sx-code{background:#2c2238;color:#ffe9c7}.sx-paper .sx-code .copy{background:#ffd23f;color:#2c2238;border:0}
.sx-paper piix-paper-text{width:100%;max-width:520px}
.sx-paper piix-paper-card h3{font-size:22px}.sx-paper piix-paper-card p{margin:0;font-size:15px;line-height:1.5}
`;

mkdirSync(join(root, 'styles'), { recursive: true });
writeFileSync(join(root, 'styles', 'index.html'), `<!doctype html>
<html lang="en">
<head>
<script>(()=>{const d=document.documentElement;d.classList.add('js');let t;try{t=localStorage.getItem('piix-theme')}catch(e){}d.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'white')})()</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Styles · Liquid, Holo and Paper components · Piixpal</title>
<meta name="description" content="Buttons, cards, text effects and inputs in three new styles: WebGL liquid that morphs, holographic foil, and cut paper or pen sketch. Free web components, one tag each.">
<meta name="theme-color" content="#0c0d10">
<link rel="icon" href="../site/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=JetBrains+Mono:wght@400;500;600&family=Patrick+Hand&family=Silkscreen&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../site/site.css">
<style>${CSS}</style>
<!-- Vercel Web Analytics: cookieless page views -->
<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>
<script defer src="/_vercel/insights/script.js"></script>
<!-- Microsoft Clarity: heatmaps and session recordings -->
<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","z45d6i2fi1");</script>
</head>
<body data-page="styles">
<!-- generated by scripts/styles-docs.mjs, edit that instead -->
${navBar('styles', '../components/', '../ui/')}
<main id="top">
  <section class="sx-hero">
    <div class="wrap">
      <span class="sx-kick">New · three styles, twelve components</span>
      <h1><span class="a">Liquid.</span> <span class="b">Holo.</span> <span class="c">Paper.</span></h1>
      <p>The everyday parts of a website (buttons, cards, headlines, inputs, toggles, badges) in three styles you won't find in a normal UI kit. Each is one tag, works with keyboards and forms, and calms down for people who prefer less motion.</p>
      <div class="sx-jump">${FAMILIES.map(f => `<a class="btn" href="#${f[0]}">${f[1]}</a>`).join('')}</div>
    </div>
  </section>${FAMILIES.map(section).join('')}
</main>
<script src="../piixpal.js?v=${V}"></script>
<script src="../site/site.js" defer></script>
<script>document.addEventListener('click',e=>{const b=e.target.closest('.copy');if(!b)return;navigator.clipboard.writeText(b.dataset.copy).then(()=>{const t=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=t,1200)})});</script>
</body>
</html>
`);
console.log('styles/index.html');
