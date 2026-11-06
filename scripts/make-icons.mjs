// Génère les icônes de l'appli (PWA, iOS, favicon) dans public/icons/.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { CHROME } from './chrome.mjs';

const html = (size, maskable) => `<!doctype html><html><head>
<style>
html,body{margin:0;width:${size}px;height:${size}px;background:#0b0b0c}
.i{width:100%;height:100%;display:grid;place-items:center;position:relative;overflow:hidden;
 background:radial-gradient(circle at 50% 38%, #2a1214 0%, #0b0b0c 68%)}
.k{font-family:'Yu Mincho','YuMincho','MS Mincho','Noto Serif JP',serif;font-weight:900;color:#f2f2f3;font-size:${Math.round(size * (maskable ? 0.42 : 0.56))}px;line-height:1;
 transform:translateY(-${Math.round(size * 0.02)}px)}
.b{position:absolute;left:50%;bottom:${Math.round(size * (maskable ? 0.2 : 0.12))}px;transform:translateX(-50%);width:${Math.round(size * 0.34)}px;height:${Math.max(2, Math.round(size * 0.035))}px;background:#e5484d;border-radius:99px}
</style></head><body><div class="i"><span class="k">道</span><span class="b"></span></div></body></html>`;

mkdirSync('public/icons', { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
const jobs = [
  ['icon-512.png', 512, false],
  ['icon-192.png', 192, false],
  ['maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
  ['favicon-32.png', 32, false],
];
for (const [name, size, maskable] of jobs) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(html(size, maskable), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `public/icons/${name}`, omitBackground: false });
  console.log('icône', name);
}
await browser.close();
