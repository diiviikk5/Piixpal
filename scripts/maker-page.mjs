// The Pal Maker page (components/make.html): markup and styles. scripts/docs.mjs wraps it in
// the docs layout; site/maker.js, maker-smooth.js and maker-pixel.js make it work.
export const makerBody = `<header class="doc-head">
  <div class="crumbs"><a href="./">Components</a><span>/</span><span>Pal Maker</span></div>
  <h1>Pal Maker</h1>
  <p>Turn anything into a pal. Doodle one, drop in a photo, a logo or an emoji, or go full pixel art. Give it eyes, arms, legs, wings and a hat, pick what it does, and it comes alive right here. Then share the link, put it on your site with one tag, or on your GitHub README.</p>
</header>
<style>
.mk-top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:14px}
.mk-tabs{display:flex;gap:6px;padding:5px;border:2px solid var(--ink);border-radius:13px;background:var(--paper)}
.mk-tabs button{font:700 14px/1 var(--f-sans);padding:10px 15px;border-radius:9px;border:0;background:none;color:var(--ink);cursor:pointer}
.mk-tabs button[aria-pressed=true]{background:var(--ink);color:var(--paper)}
.mk{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,320px);gap:20px;align-items:start}
@media (max-width:1020px){.mk{grid-template-columns:1fr}}
.mk-card{border:2px solid var(--ink);border-radius:14px;background:var(--paper);padding:16px;display:grid;gap:14px;align-content:start}
.mk [hidden]{display:none!important}
.mk-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.mk-bar .sep{width:1px;align-self:stretch;background:currentColor;opacity:.15;margin:0 4px}
.mk button.t{font:600 13px/1 var(--f-sans);padding:8px 10px;border-radius:9px;border:2px solid var(--ink);background:var(--bg);color:var(--ink);cursor:pointer}
.mk button.t[aria-pressed=true]{background:var(--ink);color:var(--paper)}
.mk button.t kbd{font:500 10px/1 var(--f-mono, monospace);opacity:.5;margin-left:4px}
.mk-well{display:grid;place-items:center;padding:10px;border-radius:12px;background:var(--bg);border:2px dashed transparent;transition:border-color .2s}
.mk-well.drop{border-color:var(--ink)}
#mk-cv{touch-action:none;cursor:crosshair;border-radius:4px;box-shadow:0 0 0 2px var(--ink)}
#mk-cv[data-tool=fill]{cursor:cell}#mk-cv[data-tool=pick]{cursor:copy}#mk-cv[data-tool=eyes],#mk-cv[data-tool=mouth]{cursor:pointer}
.sm-stage{position:relative;width:min(100%,460px);aspect-ratio:368/424;border-radius:10px;background-color:#fbf8f1;background-image:radial-gradient(#17121f1a 1px,transparent 1.2px);background-size:16px 16px;box-shadow:0 0 0 2px var(--ink);color:#17121f;overflow:hidden}
#sm-art,#sm-over{position:absolute;inset:0;width:100%;height:100%}
#sm-art svg{width:100%;height:100%;display:block}
#sm-over{touch-action:none;cursor:crosshair}
#sm-over[data-tool=move]{cursor:default}
.mk-pal{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.mk-pal button{width:30px;height:30px;border-radius:8px;border:2px solid var(--ink);background:var(--c);cursor:pointer;padding:0}
.mk-pal button[aria-pressed=true]{outline:3px solid var(--ink);outline-offset:2px}
.mk-pal .mk-plus{background:var(--bg);color:var(--ink);font:700 16px/1 var(--f-sans)}
.mk input[type=color]{width:42px;height:32px;border:2px solid var(--ink);border-radius:8px;padding:0;background:none;cursor:pointer}
.mk-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.mk-row label,.mk-opt{font:700 13px/1.2 var(--f-sans)}
.mk-opt{display:grid;gap:7px}
.mk-opt small,.mk small{font-weight:500;color:var(--muted)}
.mk input[type=text],.mk select{font:500 14px/1 var(--f-sans);padding:9px 11px;border-radius:9px;border:2px solid var(--ink);background:var(--bg);color:var(--ink)}
.mk input[type=text]{width:100%;box-sizing:border-box}
.mk input[type=range]{width:100%;accent-color:var(--ink)}
.mk .seg button{padding:7px 9px;font-size:12.5px}
.mk-two{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px}
.mk-two label,.mk-two span{font:600 12px/1.2 var(--f-sans);display:grid;gap:4px}
.mk-any{display:grid;gap:10px;padding:14px;border-radius:12px;background:var(--bg)}
.mk-any b{font:800 14px/1.2 var(--f-sans)}
.mk-any .mk-row input[type=text]{width:130px}
.mk-file{position:relative;overflow:hidden}
.mk-file input{position:absolute;inset:0;opacity:0;cursor:pointer}
.sm-emojis{display:flex;flex-wrap:wrap;gap:4px}
.sm-emojis button{font-size:22px;line-height:1;padding:6px;border-radius:9px;border:2px solid transparent;background:var(--paper);cursor:pointer}
.sm-emojis button:hover{border-color:var(--ink)}
.mk-live{margin-top:26px;border:2px solid var(--ink);border-radius:16px;padding:130px 24px 40px;background:var(--paper);position:relative;overflow:hidden;min-height:320px}
.mk-live .tag{position:absolute;top:14px;left:16px;font:600 12px/1 var(--f-sans);color:var(--muted)}
#mk-title{font:800 clamp(40px,7vw,76px)/1 var(--f-display, var(--f-sans));letter-spacing:-.03em;margin:0 0 16px;display:inline-block}
.mk-live p{max-width:46ch;margin:0 0 18px;color:var(--muted)}
.mk-share{display:grid;gap:14px;margin-top:22px}
.mk-share .c-code{white-space:pre-wrap;word-break:break-all;margin:0;max-height:180px;overflow:auto}
.mk-share .mk-row{justify-content:space-between}
.mk-link{display:flex;gap:8px}
.mk-link input{flex:1}
#mk-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);opacity:0;pointer-events:none;background:var(--ink);color:var(--paper);font:600 14px/1.3 var(--f-sans);padding:11px 16px;border-radius:10px;transition:opacity .25s,transform .25s;z-index:50}
#mk-toast.on{opacity:1;transform:translate(-50%,0)}
</style>
<div class="mk-top">
  <div class="mk-tabs" id="mk-tabs" role="group" aria-label="How to make it">
    <button type="button" data-tab="draw">Draw</button><button type="button" data-tab="image">Image</button><button type="button" data-tab="emoji">Emoji</button><button type="button" data-tab="pixel">Pixel</button>
  </div>
  <button type="button" class="btn btn-sm btn-lime" id="mk-surprise">Surprise me</button>
</div>
<div class="mk">
  <div class="mk-card" data-panel="draw image emoji">
    <div class="mk-bar" id="sm-tools">
      <button type="button" class="t" data-t="brush">Brush<kbd>B</kbd></button>
      <button type="button" class="t" data-t="shape">Fill shape<kbd>S</kbd></button>
      <button type="button" class="t" data-t="erase">Eraser<kbd>E</kbd></button>
      <button type="button" class="t" data-t="move">Move face &amp; hat<kbd>V</kbd></button>
      <span class="sep"></span>
      <button type="button" class="t" data-t="undo" aria-label="Undo">↶</button>
      <button type="button" class="t" data-t="redo" aria-label="Redo">↷</button>
      <button type="button" class="t" data-t="clear">Clear</button>
      <button type="button" class="t" data-t="anim">Animate</button>
    </div>
    <div class="mk-well" id="sm-well"><div class="sm-stage"><div id="sm-art"></div><svg id="sm-over" aria-label="Drawing area: draw your pal inside the dashed box"></svg></div></div>
    <div class="mk-row"><div class="mk-pal" id="sm-pal"></div><input type="color" id="sm-col" aria-label="Change this colour"></div>
    <label class="mk-row" style="font:600 13px var(--f-sans)">Brush size <input type="range" id="sm-bsize" min="2" max="48" style="width:180px"></label>
    <div class="mk-opt" data-panel="draw">Start from a shape <div class="mk-bar" id="sm-shapes"></div><small>Then draw on it, recolour it, or rub bits out. Fill shape draws a closed outline and fills it.</small></div>
    <div class="mk-any" data-panel="image">
      <b>Any picture becomes a pal</b>
      <div class="mk-row"><span class="btn btn-sm btn-lime mk-file">Upload an image<input type="file" id="sm-file" accept="image/*"></span><small>or drop / paste one: a photo, your logo, your cat</small></div>
      <div class="mk-row"><label><input type="checkbox" id="sm-bg" checked> Remove a plain background</label><button type="button" class="btn btn-sm" id="sm-img-del" hidden>Remove the image</button></div>
    </div>
    <div class="mk-any" data-panel="emoji">
      <b>Any emoji becomes a pal</b>
      <div class="mk-row"><input type="text" id="sm-emoji" placeholder="🐸" aria-label="An emoji"><button type="button" class="btn btn-sm" id="sm-emoji-go">Make it a pal</button></div>
      <div class="sm-emojis" id="sm-emojis">${[...'🐸🍄👾🐙🦄🍩🌵👻🐱🥑🍕💀🤖🐝🌈🐧🦊🍓🧃🪴🐢🦖🍙🧁'].map(e => `<button type="button">${e}</button>`).join('')}</div>
    </div>
    <div class="mk-opt">Try a mood <div class="seg" id="sm-pose"></div></div>
  </div>
  <div class="mk-card" data-panel="draw image emoji pixel">
    <label class="mk-opt">Name <input type="text" id="mk-name" maxlength="16" spellcheck="false"></label>
    <label class="mk-opt">What it does <select id="mk-does"></select><small id="mk-does-text"></small></label>
    <div class="mk-opt" data-panel="draw image emoji">Eyes <div class="seg" id="sm-eyes"></div><div class="mk-two"><label>size <input type="range" id="sm-er" min="4" max="34"></label><label>apart <input type="range" id="sm-eg" min="8" max="140"></label></div></div>
    <div class="mk-opt" data-panel="draw image emoji">Mouth <div class="seg" id="sm-mouth"></div><div class="mk-two"><label>size <input type="range" id="sm-mw" min="8" max="70"></label></div></div>
    <div class="mk-opt" data-panel="draw image emoji">Arms <div class="seg" id="sm-arms"></div></div>
    <div class="mk-opt" data-panel="draw image emoji">Legs <div class="seg" id="sm-legs"></div><div class="mk-two"><label>length <input type="range" id="sm-ll" min="8" max="80"></label></div></div>
    <div class="mk-opt" data-panel="draw image emoji">Wings <div class="seg" id="sm-wings"></div></div>
    <div class="mk-opt" data-panel="draw image emoji">Hat <div class="seg" id="sm-hat"></div><div class="mk-two"><label>size <input type="range" id="sm-hs" min="20" max="160"></label><label>tilt <input type="range" id="sm-hr" min="-40" max="40"></label></div></div>
    <div class="mk-opt" data-panel="draw image emoji">Outline <div class="seg" id="sm-outline"></div></div>
    <div class="mk-row" data-panel="draw image emoji"><label><input type="checkbox" id="sm-cheeks"> Cheeks</label><label>Ink <input type="color" id="sm-ink"></label><label>Limbs <input type="color" id="sm-limb"></label></div>
    <div class="mk-two" data-panel="draw image emoji"><label>Pixel look <input type="range" id="sm-px" min="0" max="8"></label><label>Size on the page <input type="range" id="sm-size" min="40" max="200" step="4"></label></div>
    <button type="button" class="btn btn-sm" id="sm-auto" data-panel="draw image emoji">Fit the face to the body again</button>
    <div class="mk-opt" data-panel="pixel">Eyes <div class="seg" id="mk-eyes"></div><label class="mk-row" style="font-weight:500">gap <input type="range" id="mk-gap" min="1" max="8"></label></div>
    <div class="mk-opt" data-panel="pixel">Mouth <div class="seg" id="mk-mouth"></div></div>
    <div class="mk-opt" data-panel="pixel">Legs <div class="seg" id="mk-legs"></div></div>
    <div class="mk-opt" data-panel="pixel">Wings <div class="seg" id="mk-wings"></div></div>
    <div class="mk-row" data-panel="pixel"><label><input type="checkbox" id="mk-outline"> Outline</label><label><input type="checkbox" id="mk-cheeks"> Cheeks</label><label>Ink <input type="color" id="mk-ink"></label></div>
    <label class="mk-opt" data-panel="pixel">Grid <select id="mk-size"><option value="">custom</option>${[12, 16, 20, 24, 32].map(s => `<option value="${s}">${s} × ${s}</option>`).join('')}</select></label>
    <label class="mk-opt" data-panel="pixel">Size on the page <input type="range" id="mk-scale" min="2" max="6"></label>
  </div>
  <div class="mk-card" data-panel="pixel" style="grid-row:1">
    <div class="mk-bar" id="mk-tools">
      <button type="button" class="t" data-t="pen">Pencil<kbd>B</kbd></button>
      <button type="button" class="t" data-t="erase">Eraser<kbd>E</kbd></button>
      <button type="button" class="t" data-t="fill">Fill<kbd>G</kbd></button>
      <button type="button" class="t" data-t="pick">Pick<kbd>I</kbd></button>
      <span class="sep"></span>
      <button type="button" class="t" data-t="eyes">Place eyes</button>
      <button type="button" class="t" data-t="mouth">Place mouth</button>
      <span class="sep"></span>
      <button type="button" class="t" data-t="mirror">Mirror<kbd>M</kbd></button>
      <button type="button" class="t" data-t="undo" aria-label="Undo">↶</button>
      <button type="button" class="t" data-t="redo" aria-label="Redo">↷</button>
      <button type="button" class="t" data-t="clear">Clear</button>
    </div>
    <div class="mk-well"><canvas id="mk-cv" aria-label="Pixel editor: draw your pal facing right"></canvas></div>
    <div class="mk-row"><div class="mk-pal" id="mk-pal"></div><input type="color" id="mk-col" aria-label="Change this colour"></div>
    <small>Draw it facing right; it turns round by itself. Right-click erases. Eyes and mouth aren't painted: place them, and they blink and change with its mood.</small>
    <div class="mk-any">
      <b>Pixelate anything</b>
      <div class="mk-row"><span class="btn btn-sm btn-lime mk-file">Upload an image<input type="file" id="mk-file" accept="image/*"></span><small>or drop / paste one</small></div>
      <div class="mk-row"><input type="text" id="mk-emoji" placeholder="🐸 🍄 👾" aria-label="An emoji"><button type="button" class="btn btn-sm" id="mk-emoji-go">Emoji to pixels</button><select id="mk-remix" aria-label="Remix a pal"><option value="">Remix a library pal…</option></select></div>
      <label class="mk-row">Colours <input type="range" id="mk-ncol" min="2" max="15" value="8" style="width:140px"></label>
    </div>
  </div>
</div>
<section class="mk-live" id="mk-stage">
  <span class="tag">Live: this is the real component. Poke it, grab it, chase it.</span>
  <h2 id="mk-title">my pal</h2>
  <p>This is where it lives on your site. Move the cursor about and see what it makes of you.</p>
  <span class="btn btn-lime">A button</span> <span class="btn">Another</span>
</section>
<section class="mk-share">
  <h2>Share it</h2>
  <div class="mk-link"><input type="text" id="mk-link" readonly aria-label="Share link"><button type="button" class="btn btn-sm btn-lime" data-copy="mk-link">Copy link</button><a class="btn btn-sm" id="mk-open" target="_blank" rel="noopener">Open</a></div>
  <small id="mk-bytes"></small>
  <div class="mk-row"><b>Put it on your site</b><button type="button" class="btn btn-sm" data-copy="mk-embed">Copy</button></div>
  <pre class="c-code" id="mk-embed"></pre>
  <div class="mk-row"><b>Put it on your GitHub README</b><button type="button" class="btn btn-sm" data-copy="mk-readme">Copy</button></div>
  <pre class="c-code" id="mk-readme"></pre>
  <div class="mk-row"><b>Or just the picture</b><button type="button" class="btn btn-sm" id="mk-png">Download PNG</button></div>
</section>
<div id="mk-toast" role="status"></div>`;
