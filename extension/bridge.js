/* Runs on every page, in the extension's own world: tiny. It reads your settings and asks for
 * the pet only where it's on; it follows setting changes live, so the popup works instantly. */
(() => {
  const api = globalThis.browser || globalThis.chrome;
  const DEFAULTS = { on: true, pal: 'bitbug', code: '', off: [] };
  const host = location.hostname;
  let petted = false;
  const apply = s => {
    const want = s.on && !(s.off || []).includes(host);
    if (want) { api.runtime.sendMessage({ type: 'pet' }); petted = true; }
    else if (petted) { api.runtime.sendMessage({ type: 'unpet' }); petted = false; }
  };
  api.storage.sync.get(DEFAULTS).then(apply);
  api.storage.onChanged.addListener((_, area) => { if (area === 'sync') api.storage.sync.get(DEFAULTS).then(apply); });
})();
