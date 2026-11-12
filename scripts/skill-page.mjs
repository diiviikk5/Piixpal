// Writes skill/index.html: the piixpal-pal agent skill, how to install and use it.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { navBar } from './docs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const V = createHash('md5').update(readFileSync(join(root, 'piixpal.js'))).digest('hex').slice(0, 8);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const code = (c, label = '') => `<div class="sk-code">${label ? `<span class="sk-l">${label}</span>` : ''}<pre>${esc(c)}</pre><button class="copy" type="button" data-copy="${esc(c)}">Copy</button></div>`;

const ARCH = [['blob', 'Round drop', 'slimes, fruit, planets'], ['critter', 'Ears and stub feet', 'cats, dogs, frogs, crabs'], ['bird', 'Side view, beak', 'birds, ducks, penguins'], ['bot', 'Antenna, square head', 'robots, appliances'], ['ghost', 'Dome, wavy hem', 'ghosts, jellyfish, flames'], ['shroom', 'Cap on a stalk', 'mushrooms, lamps, plants']];
const STEPS = [
  ['Describe it', 'Tell your agent what you want: "a pixel frog mascot for my header", "a robot that sits in my terminal while Claude Code works".'],
  ['It draws one frame', 'The skill starts from an archetype and redraws it into your character: 10 to 18 pixels a side, 4 to 6 colours.'],
  ['The tool animates it', 'Blink, breathe, walk, hop, happy, sleep, look, scared. All built from that one drawing, and checked.'],
  ['You see it, then ship it', 'A terminal preview, a sprite sheet and a live test page. Then a website pal, or a pet for Claude Code and Codex.']
];

mkdirSync(join(root, 'skill'), { recursive: true });
writeFileSync(join(root, 'skill', 'index.html'), `<!doctype html>
<html lang="en">
<head>
<script>(()=>{const d=document.documentElement;d.classList.add('js');let t;try{t=localStorage.getItem('piix-theme')}catch(e){}d.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'white')})()</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>piixpal-pal: an agent skill that makes animated pixel pals</title>
<meta name="description" content="A free agent skill for Claude Code, Codex and Cursor. Describe a pixel character, get it drawn and animated, then put it on your website or in your terminal.">
<meta name="theme-color" content="#f3eee3">
<link rel="icon" href="../site/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=JetBrains+Mono:wght@400;600&family=Silkscreen&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../site/site.css">
<style>
.sk{padding:clamp(48px,7vw,96px) 0 120px}
.sk h1{margin:12px 0 18px;font:800 clamp(40px,6vw,80px)/.95 var(--f-display,"Bricolage Grotesque");letter-spacing:-.05em}
.sk .kick{font:400 12px/1 var(--f-pix);letter-spacing:.12em;text-transform:uppercase;opacity:.7}
.sk .lead{max-width:60ch;font-size:19px;line-height:1.55;opacity:.82;margin:0 0 28px}
.sk-hero{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:clamp(24px,4vw,56px);align-items:center}
.sk video{width:100%;display:block;border-radius:18px;box-shadow:0 0 0 3px var(--ink,#17121f),10px 10px 0 var(--ink,#17121f)}
.sk h2{margin:90px 0 24px;font:800 clamp(30px,4.4vw,52px)/1 var(--f-display,"Bricolage Grotesque");letter-spacing:-.04em}
.sk-code{position:relative;margin:10px 0}
.sk-code pre{margin:0;padding:16px 92px 16px 18px;border-radius:12px;background:#17121f;color:#f3eee3;font:500 13.5px/1.65 var(--f-mono);white-space:pre-wrap;word-break:break-word}
.sk-code .copy{position:absolute;right:9px;top:9px;height:28px;padding:0 11px;border:0;border-radius:7px;background:#c6f432;color:#17121f;font:700 12px/1 var(--f-sans,system-ui);cursor:pointer}
.sk-l{display:block;font:400 11px/1 var(--f-pix);letter-spacing:.1em;text-transform:uppercase;opacity:.6;margin:0 0 7px}
.sk-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px;counter-reset:s}
.sk-step{padding:22px;border-radius:16px;background:var(--card,#fff);box-shadow:0 0 0 2px var(--ink,#17121f),5px 5px 0 var(--ink,#17121f)}
.sk-step::before{counter-increment:s;content:counter(s);display:grid;place-items:center;width:34px;height:34px;margin-bottom:14px;background:#c6f432;color:#17121f;border-radius:8px;font:400 15px/1 var(--f-pix)}
.sk-step h3{margin:0 0 6px;font-size:19px}.sk-step p{margin:0;font-size:15px;line-height:1.55;opacity:.8}
.sk-arch{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px}
.sk-arch div{padding:16px 18px;border-radius:12px;background:var(--card,#fff);box-shadow:0 0 0 1px color-mix(in srgb,currentColor 18%,transparent)}
.sk-arch b{display:block;font:400 14px/1 var(--f-pix);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}
.sk-arch span{font-size:14px;opacity:.75;line-height:1.45;display:block}
.sk-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:26px}
.sk-two h3{margin:0 0 6px;font-size:22px}.sk-two p{margin:0 0 8px;opacity:.8;line-height:1.55;font-size:15.5px}
.sk .btn-lime{color:#17121f}
.sk-cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:6px}
@media (max-width:900px){.sk-hero{grid-template-columns:minmax(0,1fr)}}
</style>
<!-- Vercel Web Analytics: cookieless page views -->
<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>
<script defer src="/_vercel/insights/script.js"></script>
<!-- Microsoft Clarity: heatmaps and session recordings -->
<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","z45d6i2fi1");</script>
</head>
<body data-page="skill">
<!-- generated by scripts/skill-page.mjs, edit that instead -->
${navBar('skill', '../components/', '../ui/')}
<main class="sk"><div class="wrap">
  <div class="sk-hero">
    <div>
      <span class="kick">Agent skill · free · MIT</span>
      <h1>Describe a pal.<br>Get it animated.</h1>
      <p class="lead">piixpal-pal teaches your coding agent to draw a pixel character from one frame, animate it, and put it to work on your website or in your terminal beside Claude Code or Codex.</p>
      <div class="sk-cta"><a class="btn btn-lime" href="#install">Install the skill</a><a class="btn" href="https://github.com/diiviikk5/Piixpal/tree/main/skills/piixpal-pal" target="_blank" rel="noopener">View on GitHub</a></div>
    </div>
    <video src="../site/pal-skill.mp4" poster="../site/pal-skill-poster.jpg" controls playsinline preload="metadata" aria-label="piixpal-pal in 14 seconds"></video>
  </div>

  <h2 id="install">Install</h2>
  <p class="lead">Claude Code:</p>
  ${code('git clone https://github.com/diiviikk5/Piixpal /tmp/piixpal && cp -r /tmp/piixpal/skills/piixpal-pal ~/.claude/skills/', 'Terminal')}
  <p class="lead">Codex, Cursor and other agents that read <code>SKILL.md</code> folders: copy <code>skills/piixpal-pal</code> into their skills directory. No agent? The tool works by hand (Node 18+, no dependencies).</p>
  ${code('Make me a pixel frog mascot for my site header', 'Then just ask')}

  <h2>How it works</h2>
  <div class="sk-steps">${STEPS.map(([h, p]) => `<div class="sk-step"><h3>${h}</h3><p>${p}</p></div>`).join('')}</div>

  <h2>Six starting shapes</h2>
  <div class="sk-arch">${ARCH.map(([n, a, b]) => `<div><b>${n}</b><span>${a}<br>${b}</span></div>`).join('')}</div>

  <h2>Where a pal can go</h2>
  <div class="sk-two">
    <div><h3>On a website</h3><p>Export a <code>.pal.js</code> file, a sprite sheet and a live test page. Use it like any built-in pal.</p>
      ${code('<script src="https://piixpal.dvkk.dev/piixpal.min.js"></script>\n<script src="tofu.pal.js"></script>\n\n<h1>Hello <piix-pal pal="tofu"></piix-pal></h1>', 'HTML')}</div>
    <div><h3>In Claude Code and Codex</h3><p>Your pal becomes the terminal pet: it paces while the agent thinks, cheers when it's done, and shows in the status line.</p>
      ${code('node scripts/pal.mjs pet tofu.pal.json\nnode scripts/pal.mjs agents', 'Terminal')}</div>
  </div>

  <h2>Or by hand, in 30 seconds</h2>
  ${code('node scripts/pal.mjs new tofu --from critter --color "#ffb054"\nnode scripts/pal.mjs show tofu.pal.json     # every clip, in the terminal\nnode scripts/pal.mjs export tofu.pal.json out', 'Terminal')}
  <p class="lead" style="margin-top:22px">Want to make one without an agent? The <a href="../components/make.html">Pal Maker</a> turns a doodle or an emoji into a pal in the browser.</p>
</div></main>
<script src="../piixpal.js?v=${V}"></script>
<script src="../site/site.js" defer></script>
<script>document.addEventListener('click',e=>{const b=e.target.closest('.copy');if(!b)return;navigator.clipboard.writeText(b.dataset.copy).then(()=>{const t=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=t,1200)})});</script>
</body>
</html>
`);
console.log('skill/index.html');
