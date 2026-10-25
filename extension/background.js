/* Piixpal extension: puts pals into pages. Everything runs in the page's own world (custom
 * elements don't exist in an extension's isolated world), and only when it's wanted: the pet's
 * core and one pal on sites where the pet is on, the whole library when you open the panel. */
const api = globalThis.browser || globalThis.chrome;
const DEFAULTS = { on: true, pal: 'bitbug', code: '', off: [] };
const settings = async () => ({ ...DEFAULTS, ...(await api.storage.sync.get(DEFAULTS)) });

const inject = (tabId, files) => api.scripting.executeScript({ target: { tabId }, files, world: 'MAIN' });
const run = (tabId, func, args = []) => api.scripting.executeScript({ target: { tabId }, func, args, world: 'MAIN' });
/* what a page needs: the core and one pal's file for a library pet, everything for made pals and the panel */
const filesFor = s => (s.code ? ['lib/piixpal.min.js', 'visit.js'] : ['lib/core.min.js', `lib/c/${s.pal}.min.js`, 'visit.js']);

const petTab = async tabId => {
  const s = await settings();
  await inject(tabId, filesFor(s));
  await run(tabId, cfg => window.PiixVisit && window.PiixVisit.pet(cfg), [{ pal: s.pal, code: s.code }]);
};
const unpetTab = tabId => run(tabId, () => window.PiixVisit && window.PiixVisit.unpet());
const panelTab = async tabId => {
  await inject(tabId, ['lib/piixpal.min.js', 'visit.js']);
  await run(tabId, () => window.PiixVisit && window.PiixVisit.toggle());
};

api.runtime.onMessage.addListener((msg, sender, reply) => {
  const tabId = msg.tabId || (sender.tab && sender.tab.id);
  if (!tabId) return;
  const job = msg.type === 'pet' ? petTab(tabId) : msg.type === 'unpet' ? unpetTab(tabId) : msg.type === 'panel' ? panelTab(tabId) : null;
  if (!job) return;
  /* some pages (the stores, browser pages, PDF viewers) can't take scripts: say so instead of failing loudly */
  job.then(() => reply({ ok: true }), e => reply({ ok: false, error: String(e && e.message || e) }));
  return true;
});

api.commands.onCommand.addListener(async cmd => {
  if (cmd !== 'toggle-panel') return;
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) panelTab(tab.id).catch(() => {});
});

api.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    await api.storage.sync.set(await settings());
    api.tabs.create({ url: 'https://piixpal.dvkk.dev/components/visit#installed' });
  }
});
