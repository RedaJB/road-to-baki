// Chemin du navigateur Chromium utilisé pour les captures et le rendu des pubs.
import { existsSync } from 'node:fs';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

export const CHROME = CANDIDATES.find((p) => existsSync(p));
if (!CHROME) throw new Error('Chrome/Edge introuvable : définis CHROME_PATH');
