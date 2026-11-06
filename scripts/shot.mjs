// Capture d'écran d'une page via Chrome sans interface.
// Usage : node scripts/shot.mjs <url> <sortie.png> [largeur] [hauteur] [scale]
import puppeteer from 'puppeteer-core';
import { CHROME } from './chrome.mjs';

const [url, out, w = '1400', h = '900', scale = '1'] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=d3d11', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: +scale });
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction('window.__done === true || document.readyState === "complete"', { timeout: 120000 });
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('ok', out);
