// "Pals on any website" (components/visit.html): the browser extension, the bookmarklet, and a
// try-it-here button. scripts/docs.mjs wraps it in the docs layout.
export const visitBody = (bookmarklet, esc) => `<header class="doc-head">
  <div class="crumbs"><a href="./">Components</a><span>/</span><span>Pals anywhere</span></div>
  <h1>Pals on any website</h1>
  <p>Google, X, Wikipedia, your friend's portfolio: one click and pals move in. Throw a party, make it snow on the headlines, let a dragon loose, turn the lights out. Or keep a little pixel pet that lives with you on every site. Only you can see them; nothing on the site changes.</p>
  <div class="pills"><a class="btn btn-lime" href="#extension">Get the extension</a> <a class="btn" href="#bookmarklet">Or use the bookmarklet</a> <button type="button" class="btn" id="try-here">Try it on this page</button></div>
</header>
<style>
.vz-installed{display:none;margin:0 0 28px;padding:16px 18px;border:2px solid var(--ink);border-radius:14px;background:var(--lime);color:#17121f;font:600 16px/1.4 var(--f-sans)}
:target.vz-installed,.vz-installed.on{display:block}
.vz-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin:18px 0}
.vz-card{border:2px solid var(--ink);border-radius:14px;background:var(--paper);padding:16px;display:grid;gap:6px;align-content:start}
.vz-card b{font:800 16px/1.2 var(--f-sans)}
.vz-card span{color:var(--ink-2);font-size:15px}
.vz-card i{font-style:normal;font-size:24px}
.vz-steps{margin:10px 0 0;padding-left:22px;display:grid;gap:8px;font-size:16px}
.vz-steps code{font-size:14px}
.vz-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;margin-top:12px}
.vz-two > div{border:2px solid var(--ink);border-radius:14px;padding:18px;background:var(--paper)}
.vz-two h3{margin:0 0 4px;font:800 18px/1.2 var(--f-sans)}
.bookmarklet{cursor:grab}
</style>
<div class="vz-installed" id="installed">It's in! Your pet is already on this page; it'll be on every site you visit now. Click the Piixpal icon in your toolbar to pick a different pet, or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> on any page for the party panel.</div>

<section class="doc-sec" aria-labelledby="v1"><h2 id="v1">What it does</h2>
  <div class="vz-grid">
    <div class="vz-card"><i>★</i><b>Party</b><span>A beetle on the headline, moss on a paragraph, a bird on the buttons, a jelly on the footer, bees.</span></div>
    <div class="vz-card"><i>❄</i><b>Snow day</b><span>Snow that settles on the real shapes of the letters, and a penguin to enjoy it.</span></div>
    <div class="vz-card"><i>🐉</i><b>Dragon</b><span>A three-hundred-pixel dragon swims round your cursor and breathes fire where you click.</span></div>
    <div class="vz-card"><i>🔦</i><b>Lights out</b><span>The page goes dark, your cursor is a lantern, and shy creatures hide in the shadows of the layout.</span></div>
    <div class="vz-card"><i>♥</i><b>Stickers, trails, surprises</b><span>Peel stickers onto anything, leave a pixel trail, or get four random pals.</span></div>
    <div class="vz-card"><i>✎</i><b>Your own pal</b><span>Paste a link from the <a href="make.html">Pal Maker</a> and the pal you drew turns up on any site.</span></div>
  </div>
</section>

<section class="doc-sec" id="extension" aria-labelledby="v2"><h2 id="v2">The browser extension: a pet that lives with you</h2>
  <p>Pick a pet and it's there on every site you visit, finding the best heading to live on. The toolbar button switches pets (or uses one you made), turns it off for a site, and opens the party panel; so does <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>. It works on sites that block the bookmarklet, it loads only what your pet needs (about 40&nbsp;KB), and it sends nothing anywhere.</p>
  <p><b>And a light switch for the whole web.</b> A little bulb hangs on a chain at the top right of every page. Pull it and the page goes dark, even a site with no dark mode of its own; pull it on a dark site and you get light mode. Photos, video and pals keep their true colours, each site remembers which way you left it (no flash of white when you come back), and <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd> flips it without the bulb. Don't want the bulb hanging there? Switch it off in the toolbar popup; the shortcut still works.</p>
  <p><a class="btn btn-lime" href="../site/piixpal-extension.zip" download>Download the extension (.zip)</a> <a class="btn" href="https://github.com/diiviikk5/Piixpal/tree/main/extension" target="_blank" rel="noopener">Source on GitHub</a></p>
  <div class="vz-two">
    <div><h3>Chrome, Edge, Brave, Arc, Opera</h3>
      <ol class="vz-steps"><li>Unzip the download somewhere you'll keep it.</li><li>Open <code>chrome://extensions</code> (or <code>edge://extensions</code>) and switch on <b>Developer mode</b>.</li><li>Click <b>Load unpacked</b> and pick the unzipped folder.</li><li>Pin Piixpal to your toolbar. Done: your pet is out.</li></ol></div>
    <div><h3>Firefox</h3>
      <ol class="vz-steps"><li>Open <code>about:debugging#/runtime/this-firefox</code>.</li><li>Click <b>Load Temporary Add-on</b> and pick <code>manifest.json</code> inside the unzipped folder.</li><li>Firefox forgets temporary add-ons on restart; a signed version is on its way.</li></ol></div>
  </div>
</section>

<section class="doc-sec" id="bookmarklet" aria-labelledby="v3"><h2 id="v3">The bookmarklet: nothing to install</h2>
  <p>Drag this button to your bookmarks bar. On any site, click it and the panel opens. Some sites (GitHub, X and other strict ones) block outside scripts; the extension works there.</p>
  <p><a class="btn btn-lime bookmarklet" href="${esc(bookmarklet)}" onclick="event.preventDefault();alert('Drag me to your bookmarks bar, then click me on any website.')">Piixpal visit</a></p>
</section>

<section class="doc-sec" aria-labelledby="v4"><h2 id="v4">Share what happened</h2>
  <p>A dragon on the front page of the news, snow on a Wikipedia article, a beetle on your boss's LinkedIn: take a screenshot (the <b>–</b> button hides the panel, the pals stay) and post it. People always ask how.</p>
</section>
<script>
(() => {
  if (location.hash === '#installed') document.getElementById('installed').classList.add('on');
  const go = () => window.PiixVisit && PiixVisit.open();
  document.getElementById('try-here').addEventListener('click', () => {
    if (window.PiixVisit) return go();
    const s = document.createElement('script'); s.src = '../extension/visit.js'; s.onload = go; document.head.appendChild(s);
  });
})();
</script>`;
