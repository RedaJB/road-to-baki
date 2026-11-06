/**
 * Offres affichées dans l'appli. Doivent correspondre aux prix créés dans Stripe
 * (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY, voir scripts/stripe-setup.mjs).
 * Les textes (prix, prix mensuel de l'annuel, remise) sont calculés à partir des montants en centimes.
 */
export const MONTHLY_CENTS = 699;
export const YEARLY_CENTS = 2499;

const eur = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;
const yearlyDiscount = Math.round((1 - YEARLY_CENTS / (MONTHLY_CENTS * 12)) * 100);

export const PRICING = {
  trialDays: 7,
  monthly: { label: 'Mensuel', price: eur(MONTHLY_CENTS), per: '/ mois', sub: 'Sans engagement' },
  yearly: { label: 'Annuel', price: eur(YEARLY_CENTS), per: '/ an', sub: `soit ${eur(Math.round(YEARLY_CENTS / 12))} / mois`, badge: `−${yearlyDiscount} %` },
} as const;

/** Séances terminées pendant lesquelles les démos 3D sont offertes, avant de passer en Pro */
export const FREE_3D_SESSIONS = 3;

export const PRO_FEATURES = [
  'Ton programme sur mesure, qui progresse chaque semaine',
  'Séances guidées avec démo 3D de chaque exercice',
  'Photo du repas : calories et macros en 4 secondes',
  'Nutrition, eau et jeûne suivis au jour le jour',
];
