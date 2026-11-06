// Captures haute définition des écrans de l'appli (page de vente + pubs) → public/screens/
// Prérequis : l'appli tourne. Usage : node scripts/capture-screens.mjs [url]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { CHROME } from './chrome.mjs';

const base = process.argv[2] ?? 'http://localhost:3124';
const OUT = 'public/screens';
mkdirSync(OUT, { recursive: true });

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const day = (delta) => {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return iso(d);
};
const today = day(0);
const monday = (() => {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
})();
const weekDay = (i) => {
  const d = new Date(monday);
  d.setDate(d.getDate() + i);
  return iso(d);
};

const ANSWERS = {
  objectifPrincipal: 'prendre_muscle', sexe: 'homme', age: 26, taille: 179, poids: 77, poidsCible: 82, dateObjectif: day(180),
  activite: 'actif', experience: 'intermediaire', trainingLocation: 'salle', frequence: 4, douleurs: [], shonenArchetype: 'baki', resilience: 'guerrier',
};

const log = (date, dayIndex, dayName, sets, volume) => ({ id: `${date}-${dayIndex}`, date, programId: 'baki', dayIndex, dayName, durationSec: 2580, setsDone: sets, totalSets: sets, volume, xp: 0, exercises: [] });

function seed({ tab = 'journal', answers = ANSWERS, onboarding = { step: 10, hasCompleted: true }, douleurs = [] } = {}) {
  const done = [weekDay(0), weekDay(2)].filter((d) => d < today);
  return {
    roadtobaki_onboarding_v3: { ...onboarding, answers },
    roadtobaki_custom_v1: { pseudo: '', styleVersion: 2, intensity: 1, aura: 'off', bgEffect: 'aucun' },
    roadtobaki_training_v1: {
      activeProgramId: 'baki',
      progress: { baki: 6 },
      dayOverride: { baki: 1 },
      logs: done.map((d, i) => log(d, i, i ? 'Jambes du Chasseur' : 'Explosion du Haut', 19, 0)),
      prs: { tractions: { weight: 10, reps: 8, date: day(-2) }, squat_barre: { weight: 100, reps: 5, date: day(-3) } },
    },
    roadtobaki_meals_v1: [
      { id: 'm1', date: today, type: 'petit_dej', label: 'Omelette 3 œufs, avocat', calories: 520, protein: 28, carbs: 14, fat: 38 },
      { id: 'm2', date: today, type: 'dej', label: 'Poulet, riz, brocolis', calories: 690, protein: 52, carbs: 78, fat: 14 },
      { id: 'm3', date: today, type: 'snack', label: 'Skyr, banane, amandes', calories: 340, protein: 24, carbs: 38, fat: 10 },
    ],
    roadtobaki_activity_v1: { waterIntakeByDate: { [today]: 1750 }, stepsByDate: { [today]: 7420 }, trainingDoneDates: done },
    roadtobaki_app_v5: {
      weightHistory: [{ date: day(-30), weight: 75.2 }, { date: day(-14), weight: 76.1 }, { date: today, weight: 77 }],
      fastingMode: '16-8', douleurs, isPremium: true, trainingUnlockedDay: 5, fastingStartedAt: Date.now() - 11.4 * 3600_000, fastingHistory: [],
    },
    roadtobaki_active_tab: tab,
  };
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.setDefaultNavigationTimeout(180000);
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function load(state) {
  await page.goto(`${base}/app`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((st) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(st)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  }, state);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.querySelector('.launchSplashOverlay') && (document.querySelector('.screen') || document.querySelector('.ob')), { timeout: 120000 });
  await wait(2200);
}
async function click(text) {
  const ok = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes(t));
    b?.click();
    return !!b;
  }, text);
  if (!ok) console.warn('bouton introuvable :', text);
}
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('capture', name);
};

await load(seed({ tab: 'graille' }));
await shot('graille');

// Liste d'exercices adaptée (genoux + maison)
await load(seed({ tab: 'programmes', douleurs: ['genoux'], answers: { ...ANSWERS, trainingLocation: 'maison' } }));
const panel = await page.$('.screen .panel.grow');
if (panel) {
  await panel.screenshot({ path: `${OUT}/exos-adaptes.png` });
  console.log('capture exos-adaptes');
}

// Séance guidée
await load(seed({ tab: 'programmes' }));
await click('Lancer la séance');
await wait(4500);
await page.waitForFunction(() => !document.body.innerText.includes('Chargement de la démo'), { timeout: 180000 });
await wait(1500);
await shot('workout');
await click('Série validée');
await wait(2500);
await shot('rest');

// Questionnaire
for (const [name, step] of [['onb-goal', 1], ['onb-body', 2], ['onb-target', 3], ['onb-training', 5]]) {
  await load(seed({ onboarding: { step, hasCompleted: false } }));
  await shot(name);
}

await browser.close();
