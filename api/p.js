/* /p/<id or code>: a made pal's own page. It lives on its name, poke it, grab it; then copy it
 * onto your site, your README, or remix it in the maker. vercel.json rewrites /p/:ref here. */
const store = require('./_store.js');
const RIG = require('./_rig.js');
const MAKER = require('./_maker.js');
const ORIGIN = 'https://piixpal.dvkk.dev';
const esc = s => String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));

const page = ({ ref, code, name, does, kind }) => {
  const link = `${ORIGIN}/p/${ref}`, title = `${name} · a pal made with Piixpal`;
  const embed = `<script src="${ORIGIN}/piixpal.min.js" defer></script>\n\n<h1>Hello <piix-pal make="${ref}"></piix-pal></h1>`;
  const readme = `![${name}](${ORIGIN}/readme?text=${encodeURIComponent(name).replace(/'/g, '%27')}&pals=${ref})`;
  return `<!doctype html>
<html lang="en">
<head>
<script>(()=>{let t;try{t=localStorage.getItem('piix-theme')}catch(e){}document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'white')})()</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(`Meet ${name}, a ${kind} pal that ${does === 'follow' ? 'follows your cursor about' : 'lives on web pages'}. Made in the Piixpal Pal Maker: turn anything into a pal.`)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="Turn anything into a pal: a doodle, a photo, an emoji. Then put it on your site with one tag.">
<meta property="og:url" content="${esc(link)}">
<meta property="og:image" content="${ORIGIN}/site/launch-poster.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/site/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=JetBrains+Mono:wght@400;600&family=Silkscreen&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/site/site.css">
<style>
body{min-height:100vh;display:grid;grid-template-rows:auto 1fr auto}
.pp-top{display:flex;justify-content:space-between;align-items:center;padding:18px clamp(16px,4vw,40px)}
.pp-top a.logo{font:800 20px/1 var(--f-sans);color:var(--ink);text-decoration:none}
.pp{display:grid;place-items:center;padding:clamp(80px,14vh,160px) 20px 40px;text-align:center}
.pp h1{font:800 clamp(56px,12vw,150px)/.95 var(--f-display, var(--f-sans));letter-spacing:-.04em;margin:0;display:inline-block;max-width:100%;overflow-wrap:anywhere}
.pp .by{margin:18px 0 0;color:var(--muted);font:500 16px/1.4 var(--f-sans)}
.pp .acts{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:26px}
.pp-code{max-width:860px;margin:0 auto;padding:0 20px 60px;display:grid;gap:12px}
.pp-code .row{display:flex;justify-content:space-between;align-items:center;gap:10px}
.pp-code pre{white-space:pre-wrap;word-break:break-all;margin:0;max-height:160px;overflow:auto;padding:16px;border-radius:12px;background:var(--paper);border:2px solid var(--ink);font:500 13px/1.5 var(--f-mono, monospace)}
.pp-foot{text-align:center;padding:20px;color:var(--muted);font:500 13px var(--f-sans)}
</style>
<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>
<script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
<header class="pp-top"><a class="logo" href="/">piixpal</a><a class="btn btn-sm btn-lime" href="/components/make">Make your own pal</a></header>
<main class="pp">
  <div>
    <h1 id="pp-name">${esc(name)}<piix-pal make="${esc(ref)}" scale="4"></piix-pal></h1>
    <p class="by">A pal someone made. Poke it, grab it, throw it, move the cursor near it.</p>
    <div class="acts">
      <a class="btn btn-lime" href="/components/make#${esc(ref)}">Remix it</a>
      <a class="btn" href="/components/make">Make your own</a>
      <button class="btn" type="button" data-copy="${esc(link)}">Copy link</button>
    </div>
  </div>
</main>
<section class="pp-code">
  <div class="row"><b>Put ${esc(name)} on your site</b><button class="btn btn-sm" type="button" data-copy-el="pp-embed">Copy</button></div>
  <pre id="pp-embed">${esc(embed)}</pre>
  <div class="row"><b>Or on your GitHub README</b><button class="btn btn-sm" type="button" data-copy-el="pp-readme">Copy</button></div>
  <pre id="pp-readme">${esc(readme)}</pre>
</section>
<footer class="pp-foot">Made with <a href="/">Piixpal</a>: tiny creatures that live on your website.</footer>
<script src="/piixpal.min.js"></script>
<script>
document.querySelectorAll('[data-copy],[data-copy-el]').forEach(b => b.addEventListener('click', () => {
  const t = b.dataset.copy || document.getElementById(b.dataset.copyEl).textContent;
  navigator.clipboard.writeText(t).then(() => { const o = b.textContent; b.textContent = 'Copied'; setTimeout(() => b.textContent = o, 1200); });
}));
</script>
</body>
</html>`;
};

module.exports = async (req, res) => {
  const ref = String(new URL(req.url, 'http://x').searchParams.get('ref') || '').trim();
  const code = await store.resolve(ref);
  let meta = null;
  if (code) {
    try {
      if (RIG.smooth(code)) { const m = await RIG.decode(code); meta = { name: m.name, does: m.does, kind: m.image ? 'photo' : m.emoji ? 'emoji' : 'hand-drawn' }; }
      else { const m = MAKER.decode(code); meta = { name: m.name, does: m.does, kind: 'pixel' }; }
    } catch (_) { meta = null; }
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!meta) {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.end(`<!doctype html><meta charset="utf-8"><title>No pal here · Piixpal</title><link rel="stylesheet" href="/site/site.css"><body style="display:grid;place-items:center;min-height:100vh;text-align:center;font-family:sans-serif"><div><h1>No pal at this link</h1><p><a class="btn btn-lime" href="/components/make">Make one</a></p></div>`);
  }
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.end(page({ ref, code, ...meta }));
};
