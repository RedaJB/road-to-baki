import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MONTHLY_CENTS, PRICING, YEARLY_CENTS } from './pricing';

describe('prix affichés', () => {
  it('formate les prix et calcule la remise de l’annuel', () => {
    expect(PRICING.monthly.price).toBe('6,99 €');
    expect(PRICING.yearly.price).toBe('24,99 €');
    expect(PRICING.yearly.sub).toBe('soit 2,08 € / mois');
    expect(PRICING.yearly.badge).toBe('−70 %');
  });

  it('correspond aux montants créés dans Stripe par scripts/stripe-setup.mjs', () => {
    const script = readFileSync(new URL('../scripts/stripe-setup.mjs', import.meta.url), 'utf8');
    expect(script).toMatch(new RegExp(`lookup: 'rtb_monthly', amount: ${MONTHLY_CENTS},`));
    expect(script).toMatch(new RegExp(`lookup: 'rtb_yearly', amount: ${YEARLY_CENTS},`));
  });
});
