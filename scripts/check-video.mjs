// Vérifie qu'une vidéo se lit (durée, résolution) et capture l'image à 7 s.
// Usage : node scripts/check-video.mjs pubs/xxx.mp4 sortie.png
import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { CHROME } from './chrome.mjs';

const [file, out] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 60000 });
const page = await browser.newPage();
await page.setViewport({ width: 540, height: 960 });
await page.goto(pathToFileURL(resolve(file)).href);
const info = await page.evaluate(
  () =>
    new Promise((res) => {
      const v = document.querySelector('video');
      if (!v) return res({ error: 'pas de lecteur' });
      const go = () => {
        v.pause();
        v.currentTime = 7;
        v.onseeked = () => res({ duree: v.duration, largeur: v.videoWidth, hauteur: v.videoHeight });
      };
      if (v.readyState >= 1) go();
      else v.onloadedmetadata = go;
      v.onerror = () => res({ error: v.error && v.error.code });
    }),
);
console.log(JSON.stringify(info));
await new Promise((r) => setTimeout(r, 400));
if (out) await page.screenshot({ path: out });
await browser.close();
