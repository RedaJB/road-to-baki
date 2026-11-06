// Crée le produit « Road to Baki Pro » et ses 2 prix dans Stripe, puis écrit leurs identifiants dans .env.local.
// Prérequis : STRIPE_SECRET_KEY=sk_test_… dans .env.local. Usage : node scripts/stripe-setup.mjs
// Relançable sans risque : un prix existant est réutilisé s'il a le même montant (lookup_key).
// Si le montant change, un nouveau prix est créé et récupère le lookup_key ; les abonnés déjà en place gardent leur ancien prix.
// Les montants doivent rester identiques à MONTHLY_CENTS / YEARLY_CENTS dans lib/pricing.ts (vérifié par lib/pricing.test.ts).
import Stripe from 'stripe';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ENV = '.env.local';
const env = existsSync(ENV) ? readFileSync(ENV, 'utf8') : '';
const key = env.match(/^STRIPE_SECRET_KEY=(.+)$/m)?.[1]?.trim();
if (!key) {
  console.error('Ajoute STRIPE_SECRET_KEY=sk_test_… dans .env.local puis relance.');
  process.exit(1);
}
const s = new Stripe(key);
const mode = key.startsWith('sk_live') ? 'PRODUCTION' : 'TEST';

const PRICES = [
  { lookup: 'rtb_monthly', amount: 699, interval: 'month', env: 'STRIPE_PRICE_MONTHLY', label: '6,99 €/mois' },
  { lookup: 'rtb_yearly', amount: 2499, interval: 'year', env: 'STRIPE_PRICE_YEARLY', label: '24,99 €/an' },
];

const existing = await s.prices.list({ lookup_keys: PRICES.map((p) => p.lookup), active: true, limit: 10 });
let productId = existing.data[0] ? (typeof existing.data[0].product === 'string' ? existing.data[0].product : existing.data[0].product.id) : null;
if (!productId) {
  const product = await s.products.create({ name: 'Road to Baki Pro', description: 'Les 8 voies, démos 3D, macros et phases du jeûne.' });
  productId = product.id;
}

let out = env;
const setVar = (name, value) => {
  out = new RegExp(`^${name}=.*$`, 'm').test(out) ? out.replace(new RegExp(`^${name}=.*$`, 'm'), `${name}=${value}`) : `${out.trimEnd()}\n${name}=${value}\n`;
};

for (const p of PRICES) {
  let price = existing.data.find((x) => x.lookup_key === p.lookup && x.unit_amount === p.amount && x.recurring?.interval === p.interval);
  if (!price) {
    price = await s.prices.create({
      product: productId,
      currency: 'eur',
      unit_amount: p.amount,
      recurring: { interval: p.interval },
      lookup_key: p.lookup,
      transfer_lookup_key: true,
    });
  }
  setVar(p.env, price.id);
  console.log(`${p.label} → ${price.id}`);
}
if (!/^STRIPE_TRIAL_DAYS=/m.test(out)) setVar('STRIPE_TRIAL_DAYS', '7');
writeFileSync(ENV, out);
console.log(`OK (mode ${mode}) : identifiants écrits dans ${ENV}. Relance le serveur pour les prendre en compte.`);
