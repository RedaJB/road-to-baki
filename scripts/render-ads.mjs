// Encode les pubs TikTok en MP4 (1080×1920, 30 i/s) dans pubs/.
// Prérequis : l'appli tourne en dev + captures à jour (node scripts/capture-screens.mjs)
// Usage : node scripts/render-ads.mjs [url]
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CHROME } from './chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3124';
mkdirSync('pubs', { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 900000, args: ['--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.setDefaultNavigationTimeout(180000);
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
await page.goto(`${base}/dev-ads`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__done === true', { timeout: 180000 });
const names = await page.evaluate(() => window.__ads);
for (const name of names) {
  const t0 = Date.now();
  const { mp4, cover, codec } = await page.evaluate((n) => window.renderAd(n), name);
  writeFileSync(`pubs/${name}.mp4`, Buffer.from(mp4, 'base64'));
  writeFileSync(`pubs/${name}-couverture.jpg`, Buffer.from(cover.split(',')[1], 'base64'));
  console.log(`${name}.mp4 (${codec}, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
await browser.close();
