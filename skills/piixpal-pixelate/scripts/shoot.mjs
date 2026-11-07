#!/usr/bin/env node
// Full-width screenshot of a page, for before/after. Uses Playwright if the project has it,
// else puppeteer, else tells you how to get one.
//   node shoot.mjs <url> <out.png> [width=1440] [height=900]
const [url, out, w = 1440, h = 900] = process.argv.slice(2);
if (!url || !out) { console.error('usage: node shoot.mjs <url> <out.png> [width] [height]'); process.exit(1); }
let done = false;
try {
  const { chromium } = await import('playwright');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
  await p.screenshot({ path: out }); await b.close(); done = true;
} catch (e) { /* try the next */ }
if (!done) {
  try {
    const puppeteer = (await import('puppeteer')).default;
    const b = await puppeteer.launch(); const p = await b.newPage(); await p.setViewport({ width: +w, height: +h });
    await p.goto(url, { waitUntil: 'networkidle2' }); await new Promise(r => setTimeout(r, 2500));
    await p.screenshot({ path: out }); await b.close(); done = true;
  } catch (e) { /* none */ }
}
if (!done) { console.error('Needs playwright or puppeteer: npx playwright install chromium && npm i -D playwright'); process.exit(1); }
console.log('wrote', out);
