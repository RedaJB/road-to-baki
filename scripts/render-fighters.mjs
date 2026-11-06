// Génère le portrait PNG de Baki (rendu 3D) dans public/fighters/.
// Prérequis : l'appli tourne (npm run dev) → node scripts/render-fighters.mjs [url]
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CHROME } from './chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3124';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
await page.goto(`${base}/dev-portraits`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction('window.__done === true', { timeout: 120000 });
const shots = await page.evaluate(() => window.__portraits);
mkdirSync('public/fighters', { recursive: true });
for (const [id, url] of Object.entries(shots)) {
  writeFileSync(`public/fighters/${id}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('écrit', id);
}
await browser.close();
